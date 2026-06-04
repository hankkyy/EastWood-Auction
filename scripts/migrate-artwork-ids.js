#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(envPath);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const normalizeLegacyCode = (value, expectedPrefix) => {
  if (!value || typeof value !== "string") return value;
  const trimmed = value.trim();
  const match = trimmed.match(/^([a-z]+)-(\d{6}|\d{8})-([a-z0-9]{4})$/i);
  if (!match) return trimmed.toUpperCase();
  const [, prefix, rawDate, suffix] = match;
  if (prefix.toUpperCase() !== expectedPrefix) return trimmed.toUpperCase();
  const date = rawDate.length === 8
    ? `${rawDate.slice(0, 4)}${rawDate.slice(6, 8)}`
    : rawDate;
  return `${expectedPrefix}-${date}-${suffix.toUpperCase()}`;
};

const apply = process.argv.includes("--apply");

const run = async () => {
  const { data, error } = await supabase
    .from("artworks")
    .select("id, collection_id, case_record");

  if (error) throw error;

  const updates = [];

  for (const row of data || []) {
    const normalizedCollectionId = normalizeLegacyCode(row.collection_id, "COL");
    const normalizedCaseId = normalizeLegacyCode(row.case_record?.caseId, "CASE");

    const nextCollectionId = normalizedCollectionId || row.collection_id || null;
    const nextCaseRecord = row.case_record
      ? { ...row.case_record, caseId: normalizedCaseId || row.case_record.caseId || "" }
      : row.case_record;

    const collectionChanged = (row.collection_id || null) !== (nextCollectionId || null);
    const caseChanged = JSON.stringify(row.case_record || null) !== JSON.stringify(nextCaseRecord || null);

    if (collectionChanged || caseChanged) {
      updates.push({
        id: row.id,
        before: {
          collection_id: row.collection_id,
          case_id: row.case_record?.caseId || null,
        },
        after: {
          collection_id: nextCollectionId,
          case_id: nextCaseRecord?.caseId || null,
        },
        payload: {
          collection_id: nextCollectionId,
          case_record: nextCaseRecord,
        },
      });
    }
  }

  console.log(`Found ${updates.length} artwork rows to normalize.`);
  for (const item of updates.slice(0, 20)) {
    console.log(`${item.id}:`, item.before, "->", item.after);
  }
  if (updates.length > 20) {
    console.log(`...and ${updates.length - 20} more`);
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to update Supabase.");
    return;
  }

  for (const item of updates) {
    const { error: updateError } = await supabase
      .from("artworks")
      .update(item.payload)
      .eq("id", item.id);

    if (updateError) throw updateError;
  }

  console.log(`Updated ${updates.length} artwork rows.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
