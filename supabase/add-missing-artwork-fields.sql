-- 为 artworks 表添加缺失的字段
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 添加 uploaded_by 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN uploaded_by uuid REFERENCES public.profiles(id);
        RAISE NOTICE '✓ Added uploaded_by column';
    ELSE
        RAISE NOTICE '⊘ uploaded_by column already exists';
    END IF;
END $$;

-- 2. 添加 is_for_sale 字段（是否可售）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'is_for_sale'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN is_for_sale boolean DEFAULT false;
        RAISE NOTICE '✓ Added is_for_sale column';
    ELSE
        RAISE NOTICE '⊘ is_for_sale column already exists';
    END IF;
END $$;

-- 3. 添加 price 字段（售价）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'price'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN price numeric(10, 2);
        RAISE NOTICE '✓ Added price column';
    ELSE
        RAISE NOTICE '⊘ price column already exists';
    END IF;
END $$;

-- 4. 添加 currency 字段（货币单位）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN currency text CHECK (currency IN ('USD', 'CNY')) DEFAULT 'CNY';
        RAISE NOTICE '✓ Added currency column';
    ELSE
        RAISE NOTICE '⊘ currency column already exists';
    END IF;
END $$;

-- 5. 添加 collection_id 字段（藏品编号）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'collection_id'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN collection_id text UNIQUE;
        RAISE NOTICE '✓ Added collection_id column';
    ELSE
        RAISE NOTICE '⊘ collection_id column already exists';
    END IF;
END $$;

-- 验证所有字段已添加
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'artworks' 
    AND column_name IN ('uploaded_by', 'is_for_sale', 'price', 'currency', 'collection_id')
ORDER BY column_name;
