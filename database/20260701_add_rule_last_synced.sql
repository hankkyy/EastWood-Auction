-- Eastwood: Add last_synced_at to external_rules
-- Migration: 20260701_add_rule_last_synced.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_rules
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

COMMENT ON COLUMN external_rules.last_synced_at IS 'Last time this rule was synced via sync or cron-sync';

-- Rollback:
-- ALTER TABLE external_rules DROP COLUMN IF EXISTS last_synced_at;
