-- Eastwood: Add item detail columns for enriched market watch cards + detail page
-- Migration: 20260622_add_item_details.sql
-- Run: Supabase SQL Editor
-- Depends on: 20260618 (external_listings table), 20260622 (buying_options column)

ALTER TABLE external_listings
ADD COLUMN IF NOT EXISTS bid_count         integer,
ADD COLUMN IF NOT EXISTS current_bid       numeric,
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS description       text,
ADD COLUMN IF NOT EXISTS additional_images jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS item_specifics    jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS feedback_pct      text,
ADD COLUMN IF NOT EXISTS estimated_sold    integer;

COMMENT ON COLUMN external_listings.bid_count   IS 'Number of bids on auction items';
COMMENT ON COLUMN external_listings.current_bid IS 'Current bid price (USD) for auction items';
COMMENT ON COLUMN external_listings.short_description IS 'Plain-text summary from eBay item endpoint';
COMMENT ON COLUMN external_listings.description IS 'Full HTML description from eBay item endpoint';
COMMENT ON COLUMN external_listings.additional_images IS 'Array of {url, width, height} from eBay item endpoint';
COMMENT ON COLUMN external_listings.item_specifics IS 'Array of {name, value} localized aspects (age, material, etc.)';
COMMENT ON COLUMN external_listings.feedback_pct IS 'Seller feedback percentage string (e.g. 99.7%)';
COMMENT ON COLUMN external_listings.estimated_sold IS 'Estimated sold quantity from eBay';

-- Rollback:
-- ALTER TABLE external_listings
--   DROP COLUMN IF EXISTS bid_count,
--   DROP COLUMN IF EXISTS current_bid,
--   DROP COLUMN IF EXISTS short_description,
--   DROP COLUMN IF EXISTS description,
--   DROP COLUMN IF EXISTS additional_images,
--   DROP COLUMN IF EXISTS item_specifics,
--   DROP COLUMN IF EXISTS feedback_pct,
--   DROP COLUMN IF EXISTS estimated_sold;
