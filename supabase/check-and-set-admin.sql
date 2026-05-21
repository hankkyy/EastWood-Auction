-- ============================================
-- 检查并设置管理员权限
-- ============================================

-- 1. 查看所有用户的角色
SELECT 
  id,
  email,
  first_name,
  last_name,
  user_id,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 2. 将指定邮箱的用户设置为管理员（请替换为你的邮箱）
-- UPDATE public.profiles 
-- SET role = 'admin'
-- WHERE email = 'your-email@example.com';

-- 3. 验证更新结果
-- SELECT email, role FROM public.profiles WHERE email = 'your-email@example.com';
