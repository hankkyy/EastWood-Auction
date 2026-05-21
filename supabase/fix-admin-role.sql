-- ============================================
-- 完整诊断和修复管理员权限
-- ============================================

-- 1. 检查 profiles 表结构（确认有 email 字段）
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. 查看所有用户的角色状态
SELECT 
  p.id,
  au.email,
  p.first_name,
  p.last_name,
  p.user_id,
  p.role,
  CASE 
    WHEN p.role = 'admin' THEN '✅ 管理员'
    WHEN p.role = 'user' THEN '⚠️ 普通用户'
    ELSE '❌ 未知角色'
  END as role_status,
  p.created_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- 3. 查找你的用户记录
SELECT 
  p.id,
  au.email,
  p.role
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'hank.zihao@gmail.com';

-- 4. 设置管理员权限（通过关联查询）
UPDATE public.profiles 
SET role = 'admin',
    updated_at = now()
WHERE id IN (
  SELECT p.id 
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  WHERE au.email = 'hank.zihao@gmail.com'
);

-- 5. 验证更新结果
SELECT 
  p.id,
  au.email,
  p.first_name,
  p.last_name,
  p.user_id,
  p.role,
  p.updated_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'hank.zihao@gmail.com';

-- 6. 如果上面方法失败，尝试直接通过 ID 更新
-- 先找到你的用户 ID，然后执行：
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'your-uuid-here';
