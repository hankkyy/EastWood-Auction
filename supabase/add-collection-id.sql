-- 为 artworks 表添加藏品编号字段
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 添加 collection_id 列（唯一索引）
ALTER TABLE public.artworks 
ADD COLUMN IF NOT EXISTS collection_id TEXT UNIQUE;

-- 2. 为现有数据生成默认的藏品编号（可选）
-- UPDATE public.artworks 
-- SET collection_id = 'COL-' || EXTRACT(EPOCH FROM created_at)::TEXT || '-' || SUBSTRING(MD5(id::TEXT) FROM 1 FOR 8)
-- WHERE collection_id IS NULL;

-- 3. 添加注释
COMMENT ON COLUMN public.artworks.collection_id IS '藏品编号（唯一标识），格式：COL-XXXXX-XXXX';
