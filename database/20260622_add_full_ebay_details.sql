-- Eastwood: Store ALL missing eBay item detail fields
-- Migration: 20260622_add_full_ebay_details.sql
-- Run: Supabase SQL Editor

ALTER TABLE external_listings
ADD COLUMN IF NOT EXISTS category_id       text,
ADD COLUMN IF NOT EXISTS item_creation_date timestamptz,
ADD COLUMN IF NOT EXISTS listing_duration  text,
ADD COLUMN IF NOT EXISTS quantity          integer,
ADD COLUMN IF NOT EXISTS return_terms      jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shipping_options  jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS marketing_price   jsonb DEFAULT '{}';

COMMENT ON COLUMN external_listings.category_id       IS 'eBay leaf category ID (e.g. 37978)';
COMMENT ON COLUMN external_listings.item_creation_date IS 'When the eBay listing was created';
COMMENT ON COLUMN external_listings.listing_duration   IS 'eBay listing duration (e.g. P10D, P30D)';
COMMENT ON COLUMN external_listings.quantity           IS 'Seller-set available quantity';
COMMENT ON COLUMN external_listings.return_terms       IS 'Return policy: {returnsAccepted, refundMethod, returnPeriod, ...}';
COMMENT ON COLUMN external_listings.shipping_options   IS 'Shipping options: [{shippingCost, shippingCostType, ...}]';
COMMENT ON COLUMN external_listings.marketing_price    IS 'Original price + discount: {originalPrice, discountAmount, ...}';

-- Rollback:
-- ALTER TABLE external_listings
--   DROP COLUMN IF EXISTS category_id,
--   DROP COLUMN IF EXISTS item_creation_date,
--   DROP COLUMN IF EXISTS listing_duration,
--   DROP COLUMN IF EXISTS quantity,
--   DROP COLUMN IF EXISTS return_terms,
--   DROP COLUMN IF EXISTS shipping_options,
--   DROP COLUMN IF EXISTS marketing_price;
