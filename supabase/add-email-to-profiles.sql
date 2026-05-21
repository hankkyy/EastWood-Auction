-- ============================================
-- 为 profiles 表添加 email 字段
-- ============================================

-- 1. 检查当前表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. 添加 email 字段（如果不存在）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 3. 从 auth.users 同步邮箱数据到 profiles
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
AND p.email IS NULL;

-- 4. 验证更新结果
SELECT 
  id,
  first_name,
  last_name,
  user_id,
  email,
  role
FROM public.profiles
ORDER BY created_at DESC;

-- 5. 设置指定用户为管理员
UPDATE public.profiles 
SET role = 'admin',
    updated_at = now()
WHERE email = 'hank.zihao@gmail.com';

-- 6. 最终验证
SELECT 
  id,
  email,
  first_name,
  last_name,
  user_id,
  role
FROM public.profiles
WHERE email = 'hank.zihao@gmail.com';
