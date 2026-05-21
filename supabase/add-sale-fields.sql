-- 为 artworks 表添加销售相关字段
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 添加 uploaded_by 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN uploaded_by uuid REFERENCES public.profiles(id);
        RAISE NOTICE 'Added uploaded_by column';
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
        RAISE NOTICE 'Added is_for_sale column';
    END IF;
END $$;

-- 3. 添加 price 字段（售价）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM info-- 为 artworks 表添加销售相关字段
-- 在 Supabase SQL Editor 中执行此?'-- 在 Supabase SQL Editor 中执行此脚wo
-- 1. 添加 uploaded_by 字段（如果不 RADO $$ 
BEGIN
    IF NOT EXISTS (
        SF;
END $$;

-- 4. 验证     ?已添加
SELE        WHERE table_name = 'artworks' AND columabl    ) THEN
        ALTER TABLE public.artworks ADD COLUMN uplable_name = 'artwork        RAISE NOTICE 'Added uploaded_by column';
    END IF;
END $$;

-- 2. 添加 is_for_sale-     END IF;
END $$;

-- 2. 添加 is_for_sale ?uEND $$;

-!';
