-- ============================================
-- 修复 RLS 策略无限递归问题
-- ============================================

-- 1. 删除导致递归的旧策略（如果存在）
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2. 删除可能存在的旧 is_admin 函数
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 3. 创建 SECURITY DEFINER 函数来检查管理员权限
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建新的管理员策略（使用函数避免递归）
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- 5. 验证策略
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. 测试查询（应该不再报错）
SELECT count(*) FROM public.profiles;
