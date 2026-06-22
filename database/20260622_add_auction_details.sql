-- Eastwood: Add auction detail columns to external_listings
-- Migration: 20260622_add_auction_details.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_listings
ADD COLUMN IF NOT EXISTS bid_count         integer,
ADD COLUMN IF NOT EXISTS current_bid       numeric,
ADD COLUMN IF NOT EXISTS reserve_price_met boolean,
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS extra_images      jsonb DEFAULT '[]';

COMMENT ON COLUMN external_listings.bid_count          IS 'Number of bids (auction items only)';
COMMENT ON COLUMN external_listings.current_bid        IS 'Current high bid amount (auction items only)';
COMMENT ON COLUMN external_listings.reserve_price_met  IS 'Whether reserve price has been met';
COMMENT ON COLUMN external_listings.short_description  IS 'Short item description from eBay item detail';
COMMENT ON COLUMN external_listings.extra_images       IS 'Additional images from eBay item detail';

-- Rollback:
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS bid_count;
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS current_bid;
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS reserve_price_met;
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS short_description;
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS extra_images;
