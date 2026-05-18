-- 为 artworks 表添加 uploaded_by 字段
-- 在 Supabase SQL Editor 中执行此脚本

-- 检查并添加 uploaded_by 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN uploaded_by uuid REFERENCES public.profiles(id);
        RAISE NOTICE 'Successfully added uploaded_by column to artworks table';
    ELSE
        RAISE NOTICE 'uploaded_by column already exists';
    END IF;
END $$;

-- 验证字段已添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'artworks' AND column_name = 'uploaded_by';
