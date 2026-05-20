-- ============================================
-- 数据迁移脚本 - 从旧结构迁移到新结构
-- 仅在已有 profiles 表且包含 username 字段时执行
-- ============================================

-- 1. 检查当前是否有 username 字段
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('username', 'email');

-- 2. 如果存在 username 字段，重命名为 email
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN username TO email;
    RAISE NOTICE '已将 username 字段重命名为 email';
  ELSE
    RAISE NOTICE 'username 字段不存在，跳过重命名';
  END IF;
END $$;

-- 3. 添加其他新字段（如果不存在）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id text;

-- 4. 从现有数据迁移姓名信息（如果有 display_name 字段）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    UPDATE public.profiles 
    SET 
      first_name = COALESCE(SPLIT_PART(display_name, ' ', 1), ''),
      last_name = COALESCE(NULLIF(SPLIT_PART(display_name, ' ', 2), ''), SPLIT_PART(display_name, ' ', 1))
    WHERE display_name IS NOT NULL AND display_name != '';
    
    RAISE NOTICE '已从 display_name 迁移姓名数据';
  ELSE
    RAISE NOTICE 'display_name 字段不存在，跳过姓名迁移';
  END IF;
END $$;

-- 5. 为现有用户生成 user_id
UPDATE public.profiles 
SET user_id = public.generate_unique_user_id(last_name)
WHERE user_id IS NULL OR user_id = '';

-- 6. 确保 user_id 不为空
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;

-- 7. 从 auth.users 同步邮箱数据（如果 email 为空）
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
AND p.email IS NULL;

-- 8. 验证最终表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
