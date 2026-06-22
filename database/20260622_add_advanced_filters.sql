-- Eastwood: Add advanced filter columns to external_rules
-- Migration: 20260622_add_advanced_filters.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_rules
ADD COLUMN IF NOT EXISTS returns_accepted_only boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS item_location_countries text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS min_feedback_score    integer,
ADD COLUMN IF NOT EXISTS exclude_sellers        text[] DEFAULT '{}';

COMMENT ON COLUMN external_rules.returns_accepted_only  IS 'Only show items that accept returns';
COMMENT ON COLUMN external_rules.item_location_countries IS 'Filter by item location country codes: US, CN, JP etc.';
COMMENT ON COLUMN external_rules.min_feedback_score     IS 'Minimum seller feedback score (e.g. 100)';
COMMENT ON COLUMN external_rules.exclude_sellers        IS 'Seller usernames to exclude from results';

-- Rollback:
-- ALTER TABLE external_rules
--   DROP COLUMN IF EXISTS returns_accepted_only,
--   DROP COLUMN IF EXISTS item_location_countries,
--   DROP COLUMN IF EXISTS min_feedback_score,
--   DROP COLUMN IF EXISTS exclude_sellers;
