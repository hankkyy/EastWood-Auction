-- ============================================
-- 检查 profiles 表结构
-- ============================================

-- 1. 查看 profiles 表的所有字段
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. 查看所有用户信息（不依赖 email 字段）
SELECT 
  id,
  first_name,
  last_name,
  user_id,
  role,
  created_at,
  updated_at
FROM public.profiles
ORDER BY created_at DESC;

-- 3. 如果确实需要按邮箱查找，需要从 auth.users 表关联查询
SELECT 
  p.id,
  au.email,
  p.first_name,
  p.last_name,
  p.user_id,
  p.role,
  p.created_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'hank.zihao@gmail.com';

-- 4. 更新指定用户为管理员（通过 user_id 或 id）
-- 方法1: 如果你知道你的 user_id
-- UPDATE public.profiles 
-- SET role = 'admin',
--     updated_at = now()
-- WHERE user_id = 'your_user_id';

-- 方法2: 通过关联 auth.users 表
UPDATE public.profiles 
SET role = 'admin',
    updated_at = now()
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'hank.zihao@gmail.com'
);

-- 5. 验证更新结果
SELECT 
  p.id,
  au.email,
  p.first_name,
  p.last_name,
  p.user_id,
  p.role
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'hank.zihao@gmail.com';
