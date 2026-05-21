-- ============================================
-- 诊断脚本 - 检查用户角色和国际化配置
-- ============================================

-- 1. 检查所有用户的角色
SELECT 
  id,
  email,
  first_name,
  last_name,
  user_id,
  role,
  CASE 
    WHEN role = 'admin' THEN '✅ 管理员'
    WHEN role = 'user' THEN '⚠️ 普通用户'
    ELSE '❌ 未知角色'
  END as role_status
FROM public.profiles
ORDER BY created_at DESC;

-- 2. 检查是否有用户的 role 字段为空或无效
SELECT COUNT(*) as invalid_role_count
FROM public.profiles
WHERE role NOT IN ('admin', 'user') OR role IS NULL;

-- 3. 如果需要将所有用户设置为普通用户（除了特定邮箱）
-- UPDATE public.profiles 
-- SET role = 'user'
-- WHERE email != 'admin@example.com';

-- 4. 设置特定用户为管理员
-- UPDATE public.profiles 
-- SET role = 'admin'
-- WHERE email = 'your-admin-email@example.com';
