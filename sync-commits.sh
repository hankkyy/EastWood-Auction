#!/bin/bash
# Eastwood Commit → Bitable Sync Script
# Generates JSON payloads for all commits to be written to Lark Bitable
# Usage: bash sync-commits.sh
#
# Configuration: reads from environment variables
#   LARK_BITABLE_TOKEN   - App token (required)
#   LARK_BITABLE_TABLE_ID - Table ID (required)
# Set them in .env.local and source before running

APP_TOKEN="${LARK_BITABLE_TOKEN:-}"
TABLE_ID="${LARK_BITABLE_TABLE_ID:-}"

if [ -z "$APP_TOKEN" ] || [ -z "$TABLE_ID" ]; then
  echo "Error: LARK_BITABLE_TOKEN and LARK_BITABLE_TABLE_ID must be set."
  echo "  set -a && source .env.local && set +a"
  exit 1
fi

OUTPUT="commit-payloads.jsonl"
export APP_TOKEN TABLE_ID OUTPUT

python3 << 'PYEOF'
import subprocess, json, os, re

app_token = os.environ["APP_TOKEN"]
table_id = os.environ["TABLE_ID"]
output = os.environ["OUTPUT"]

result = subprocess.run(
    ["git", "log", "--format=%H%x09%s%x09%at", "--reverse"],
    capture_output=True, text=True
)
lines = [l for l in result.stdout.strip().split("\n") if l.strip()]

def classify(msg: str):
    task_type, priority = "优化", "低 - P2"
    if msg.startswith("fix:"):
        task_type = "BUG"
        if re.search(r'crash|白屏|build.fail|编译|XSS|auth|security|audit|secret|泄露|plaintext|数据丢失|支付|500|崩溃', msg, re.IGNORECASE):
            priority = "高 - P0"
        elif re.search(r'z-index|emoji|wrapping|badge.*light|empty-state', msg, re.IGNORECASE):
            priority = "低 - P2"
        else:
            priority = "中 - P1"
    elif msg.startswith("feat:"):
        task_type, priority = "需求", "中 - P1"
    return task_type, priority

payloads = []
for line in lines:
    parts = line.split("\t", 2)
    if len(parts) < 3:
        continue
    hash_val, msg, ts_str = parts
    try:
        ts_ms = int(ts_str.strip()) * 1000
    except ValueError:
        continue

    task_type, priority = classify(msg)
    name = re.sub(r'^[a-z]+:\s*', '', msg).strip('[]')

    payloads.append({
        "path": {"app_token": app_token, "table_id": table_id},
        "data": {"fields": {
            "问题名称": name,
            "问题描述": name,
            "任务类型": task_type,
            "当前状态": "验收通过",
            "优先级": priority,
            "提交时间": ts_ms
        }}
    })

with open(output, "w", encoding="utf-8") as f:
    json.dump(payloads, f, ensure_ascii=False, indent=2)

print(f"Done! Output: {output}")
print(f"Count: {len(payloads)} commits")
PYEOF
