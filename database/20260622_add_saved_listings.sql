-- Eastwood: Saved listings (user bookmarks for external market listings)
-- Migration: 20260622_add_saved_listings.sql
-- Run: Supabase SQL Editor

CREATE TABLE IF NOT EXISTS saved_listings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES external_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_listings_user ON saved_listings (user_id, created_at DESC);

-- RLS: users can CRUD their own saved listings
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own saved listings" ON saved_listings;
CREATE POLICY "Users can manage their own saved listings"
  ON saved_listings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Rollback:
-- DROP TABLE IF EXISTS saved_listings;
