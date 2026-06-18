-- Eastwood: eBay Market Watch — rule engine + listings
-- Migration: 20260618_add_ebay_market_watch.sql
-- Run: Supabase SQL Editor

-- 1. External rules table (admin-configured search rules)
CREATE TABLE IF NOT EXISTS external_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,                      -- e.g. "清代花瓶监控"
  source        text NOT NULL DEFAULT 'ebay',       -- future: 'catawiki', 'etsy'
  keywords      text[] NOT NULL DEFAULT '{}',       -- ['qing dynasty vase', '清代花瓶']
  category_ids  text[] DEFAULT '{}',                -- eBay category IDs
  price_min     numeric,                            -- e.g. 100
  price_max     numeric,                            -- e.g. 5000
  currency      text DEFAULT 'USD',
  conditions    text[] DEFAULT '{}',                -- ['USED', 'NEW']
  listing_types text[] DEFAULT '{AUCTION,FIXED_PRICE}',
  enabled       boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. External listings table (matched results)
CREATE TABLE IF NOT EXISTS external_listings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id          uuid REFERENCES external_rules(id) ON DELETE SET NULL,
  source           text NOT NULL DEFAULT 'ebay',
  external_id      text NOT NULL,                   -- eBay item ID
  title            text,
  price            numeric,
  currency         text DEFAULT 'USD',
  images           jsonb DEFAULT '[]',              -- [{url: "...", width: 800, height: 600}]
  listing_url      text,
  seller           text,
  seller_rating    numeric,
  condition        text,
  location         text,
  matched_keywords text[] DEFAULT '{}',             -- which keywords in the rule matched
  discovered_at    timestamptz NOT NULL DEFAULT now(),
  ends_at          timestamptz,                     -- auction end time
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)                      -- dedup by source + external ID
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_external_rules_enabled ON external_rules (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_external_listings_source ON external_listings (source);
CREATE INDEX IF NOT EXISTS idx_external_listings_rule ON external_listings (rule_id);
CREATE INDEX IF NOT EXISTS idx_external_listings_discovered ON external_listings (discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_listings_price ON external_listings (price) WHERE price IS NOT NULL;

-- 4. RLS — public can read listings, authenticated can read rules, admin can manage
ALTER TABLE external_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_listings ENABLE ROW LEVEL SECURITY;

-- Public read listings
DROP POLICY IF EXISTS "Public can view external listings" ON external_listings;
CREATE POLICY "Public can view external listings"
  ON external_listings FOR SELECT
  USING (true);

-- Authenticated read rules
DROP POLICY IF EXISTS "Authenticated can view rules" ON external_rules;
CREATE POLICY "Authenticated can view rules"
  ON external_rules FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin manage rules
DROP POLICY IF EXISTS "Admin can insert rules" ON external_rules;
CREATE POLICY "Admin can insert rules"
  ON external_rules FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can update rules" ON external_rules;
CREATE POLICY "Admin can update rules"
  ON external_rules FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can delete rules" ON external_rules;
CREATE POLICY "Admin can delete rules"
  ON external_rules FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Rollback:
-- DROP TABLE IF EXISTS external_listings;
-- DROP TABLE IF EXISTS external_rules;
