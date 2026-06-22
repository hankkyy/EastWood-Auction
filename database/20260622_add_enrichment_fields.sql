-- Eastwood: Add missing enrichment fields for ALL listings (not just auctions)
-- Migration: 20260622_add_enrichment_fields.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_listings
ADD COLUMN IF NOT EXISTS condition_description  text,
ADD COLUMN IF NOT EXISTS feedback_rating_star   text,
ADD COLUMN IF NOT EXISTS estimated_available_qty integer;

COMMENT ON COLUMN external_listings.condition_description  IS 'Detailed condition text from seller (eBay conditionDescription)';
COMMENT ON COLUMN external_listings.feedback_rating_star   IS 'eBay seller star rating';
COMMENT ON COLUMN external_listings.estimated_available_qty IS 'Available quantity (fixed-price items)';

-- Rollback:
-- ALTER TABLE external_listings
--   DROP COLUMN IF EXISTS condition_description,
--   DROP COLUMN IF EXISTS feedback_rating_star,
--   DROP COLUMN IF EXISTS estimated_available_qty;
