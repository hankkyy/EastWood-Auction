-- Eastwood: Add 3D model support (LiDAR scanning)
-- Migration: 20260617_add_three_d_model.sql
-- Run: Supabase SQL Editor

-- ⚠️  Supabase Free plan: global upload limit is 50 MB (hard cap).
--    Upgrade to Pro ($25/mo) to raise it to 5 GB.
--    3D scanned antiques typically produce 15-80 MB USDZ files.
--    On Free tier, we auto-reduce Photogrammetry quality to stay under 50 MB.
--    Upgrading is recommended for production use.

-- 1. Add three_d_model JSONB column to artworks table
ALTER TABLE artworks
ADD COLUMN IF NOT EXISTS three_d_model jsonb;

-- 2. Create dedicated storage bucket for 3D models
--    Supabase Dashboard: Storage > New Bucket
--      Name: "3d-models"
--      Public bucket: ✅ ON
--      Allowed MIME types: model/vnd.usdz+zip, model/gltf-binary, image/jpeg, image/png, image/webp
--      File size limit: 52428800 (50 MB — Free plan max)

-- Option A: Via SQL (requires storage extension + admin)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   '3d-models',
--   '3d-models',
--   true,
--   52428800,
--   ARRAY['model/vnd.usdz+zip', 'model/gltf-binary', 'image/png', 'image/jpeg', 'image/webp']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Option B: Manually via Supabase Dashboard (recommended):
--    Storage > New Bucket > Name: "3d-models"
--    ☑ Public bucket
--    File size limit: 200 MB

-- 3. Storage policies for the 3d-models bucket (idempotent — safe to re-run)

DROP POLICY IF EXISTS "Public can view 3D models" ON storage.objects;
CREATE POLICY "Public can view 3D models"
ON storage.objects FOR SELECT
USING (bucket_id = '3d-models');

DROP POLICY IF EXISTS "Authenticated users can upload 3D models" ON storage.objects;
CREATE POLICY "Authenticated users can upload 3D models"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = '3d-models' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own 3D models" ON storage.objects;
CREATE POLICY "Users can update own 3D models"
ON storage.objects FOR UPDATE
USING (bucket_id = '3d-models' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own 3D models" ON storage.objects;
CREATE POLICY "Users can delete own 3D models"
ON storage.objects FOR DELETE
USING (bucket_id = '3d-models' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Add index for faster lookups of items with 3D models
CREATE INDEX IF NOT EXISTS idx_artworks_has_3d_model
ON artworks ((three_d_model IS NOT NULL))
WHERE three_d_model IS NOT NULL;

-- Rollback (if needed):
-- DROP INDEX IF EXISTS idx_artworks_has_3d_model;
-- ALTER TABLE artworks DROP COLUMN IF EXISTS three_d_model;
