/**
 * 基本的 HTML 消毒函数 — 移除危险标签和属性。
 * 用于消毒 eBay 商品描述中可能包含的恶意内容。
 */

// 完全移除的危险标签
const STRIP_TAGS = new Set([
  "script", "iframe", "object", "embed", "form", "input",
  "link", "meta", "base", "applet", "frame", "frameset",
]);

// 移除的事件处理属性和危险属性
const STRIP_ATTRS = /on\w+\s*=|href\s*=\s*"javascript:/gi;

// 移除注释
const STRIP_COMMENTS = /<!--[\s\S]*?-->/g;

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  let sanitized = html;

  // 1. 移除 HTML 注释（可能包含条件注释攻击）
  sanitized = sanitized.replace(STRIP_COMMENTS, "");

  // 2. 移除危险标签及其内容
  for (const tag of Array.from(STRIP_TAGS)) {
    sanitized = sanitized.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"),
      ""
    );
    // 自闭合形式
    sanitized = sanitized.replace(
      new RegExp(`<${tag}\\b[^>]*\\/>`, "gi"),
      ""
    );
  }

  // 3. 移除事件处理器和 javascript: URL
  sanitized = sanitized.replace(STRIP_ATTRS, "");

  return sanitized;
}
