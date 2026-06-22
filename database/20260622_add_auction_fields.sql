-- Eastwood: Add auction detail fields + item description
-- Migration: 20260622_add_auction_fields.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_listings
ADD COLUMN IF NOT EXISTS current_bid numeric,
ADD COLUMN IF NOT EXISTS bid_count integer,
ADD COLUMN IF NOT EXISTS reserve_price_met boolean,
ADD COLUMN IF NOT EXISTS short_description text;

COMMENT ON COLUMN external_listings.current_bid IS 'Current bid price (auction items only)';
COMMENT ON COLUMN external_listings.bid_count IS 'Number of bids placed (auction items only)';
COMMENT ON COLUMN external_listings.reserve_price_met IS 'Whether reserve price has been met';
COMMENT ON COLUMN external_listings.short_description IS 'Item short description from eBay item endpoint';

-- Rollback:
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS current_bid;
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS bid_count;
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS reserve_price_met;
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS short_description;
