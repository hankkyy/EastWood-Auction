-- ============================================
-- 删除 display_name 字段
-- 执行此脚本前请确保已执行 create-profiles-table.sql
-- ============================================

-- 1. 删除 display_name 字段（如果存在）
ALTER TABLE public.profiles DROP COLUMN IF EXISTS display_name;

-- 2. 验证表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
