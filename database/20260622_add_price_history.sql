-- Eastwood: Price history tracking for external listings
-- Migration: 20260622_add_price_history.sql
-- Run: Supabase SQL Editor

CREATE TABLE IF NOT EXISTS listing_price_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES external_listings(id) ON DELETE CASCADE,
  price       numeric,
  current_bid numeric,
  currency    text DEFAULT 'USD',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing
  ON listing_price_history (listing_id, recorded_at DESC);

-- Prevent duplicate records for same listing at same timestamp
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_unique
  ON listing_price_history (listing_id, recorded_at);

-- RLS: public read (price history is informative), only service can insert
ALTER TABLE listing_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view price history" ON listing_price_history;
CREATE POLICY "Public can view price history"
  ON listing_price_history FOR SELECT
  USING (true);

-- Rollback:
-- DROP TABLE IF EXISTS listing_price_history;
