-- Eastwood: Add buying_options column to external_listings
-- Migration: 20260622_add_buying_options.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_listings
ADD COLUMN IF NOT EXISTS buying_options text[] DEFAULT '{}';

COMMENT ON COLUMN external_listings.buying_options IS 'eBay buying options: AUCTION, FIXED_PRICE, BEST_OFFER';

-- Rollback:
-- ALTER TABLE external_listings DROP COLUMN IF EXISTS buying_options;
