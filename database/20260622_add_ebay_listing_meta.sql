-- Eastwood: Add eBay category path and watch count
-- Migration: 20260622_add_ebay_listing_meta.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_listings
ADD COLUMN IF NOT EXISTS category_path text,
ADD COLUMN IF NOT EXISTS watch_count    integer;

COMMENT ON COLUMN external_listings.category_path IS 'eBay category hierarchy, e.g. Antiques > Asian Antiques > Chinese > Vases';
COMMENT ON COLUMN external_listings.watch_count    IS 'Number of eBay users watching this item';

-- Rollback:
-- ALTER TABLE external_listings
--   DROP COLUMN IF EXISTS category_path,
--   DROP COLUMN IF EXISTS watch_count;
