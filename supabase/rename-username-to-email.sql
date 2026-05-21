-- ============================================
-- 修复 profiles 表：将 username 重命名为 email
-- ============================================

-- 1. 检查当前表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. 将 username 字段重命名为 email
ALTER TABLE public.profiles RENAME COLUMN username TO email;

-- 3. 从 auth.users 同步邮箱数据（如果 email 为空）
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
