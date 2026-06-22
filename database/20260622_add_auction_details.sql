-- Eastwood: Add auction detail + item enrichment columns to external_listings
-- Migration: 20260622_add_auction_details.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_listings
ADD COLUMN IF NOT EXISTS bid_count         integer,
ADD COLUMN IF NOT EXISTS current_bid       numeric,
ADD COLUMN IF NOT EXISTS reserve_price_met boolean,
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS description       text,
ADD COLUMN IF NOT EXISTS extra_images      jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS item_specifics    jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS feedback_pct      text,
ADD COLUMN IF NOT EXISTS estimated_sold    integer;

COMMENT ON COLUMN external_listings.bid_count         IS 'Number of bids (auction only)';
COMMENT ON COLUMN external_listings.current_bid       IS 'Current high bid amount (auction only)';
COMMENT ON COLUMN external_listings.reserve_price_met IS 'Whether reserve price has been met';
COMMENT ON COLUMN external_listings.short_description IS 'Plain-text summary from eBay item endpoint';
COMMENT ON COLUMN external_listings.description       IS 'Full HTML description from eBay item endpoint';
COMMENT ON COLUMN external_listings.extra_images      IS 'Additional images beyond the main one';
COMMENT ON COLUMN external_listings.item_specifics    IS 'Localized aspects: age, material, origin, etc.';
COMMENT ON COLUMN external_listings.feedback_pct      IS 'Seller feedback percentage (e.g. 99.7%)';
COMMENT ON COLUMN external_listings.estimated_sold    IS 'Estimated sold quantity from eBay';

-- Rollback:
-- ALTER TABLE external_listings
--   DROP COLUMN IF EXISTS bid_count,
--   DROP COLUMN IF EXISTS current_bid,
--   DROP COLUMN IF EXISTS reserve_price_met,
--   DROP COLUMN IF EXISTS short_description,
--   DROP COLUMN IF EXISTS description,
--   DROP COLUMN IF EXISTS extra_images,
--   DROP COLUMN IF EXISTS item_specifics,
--   DROP COLUMN IF EXISTS feedback_pct,
--   DROP COLUMN IF EXISTS estimated_sold;
