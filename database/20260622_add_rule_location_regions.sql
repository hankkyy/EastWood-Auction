-- Eastwood: Add item_location_regions to external_rules for state-level filtering
-- Migration: 20260622_add_rule_location_regions.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_rules
ADD COLUMN IF NOT EXISTS item_location_regions text[] DEFAULT '{}';

COMMENT ON COLUMN external_rules.item_location_regions IS 'eBay item location state/region codes, e.g. {CA, NY, TX}';

-- Rollback:
-- ALTER TABLE external_rules DROP COLUMN IF EXISTS item_location_regions;
