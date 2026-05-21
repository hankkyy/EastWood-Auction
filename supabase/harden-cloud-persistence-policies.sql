-- ============================================
-- 强化云端持久化与关键字段保护
-- 目标：
-- 1. 普通用户不能把自己提权为 admin
-- 2. 普通用户不能修改自己的 user_id / email / role
-- 3. 普通用户只能写入和维护自己的回流案例，不能伪装成官方藏品或商品
-- ============================================

BEGIN;

-- 1. 公共管理员判断函数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 锁定 profiles 高风险字段
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- service role / backend trusted writes 不做限制
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 管理员允许修改
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 普通用户只能改自己的资料
  IF OLD.id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only update your own profile.';
  END IF;

  -- 锁定敏感字段
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.email := OLD.email;
  NEW.role := OLD.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 3. 明确 profiles 的更新策略，保留“只能更新自己”
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. 统一 artworks 的安全策略
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.artworks;
DROP POLICY IF EXISTS "Admin insert access" ON public.artworks;
DROP POLICY IF EXISTS "Admin update access" ON public.artworks;
DROP POLICY IF EXISTS "Admin delete access" ON public.artworks;
DROP POLICY IF EXISTS "User insert own cases" ON public.artworks;
DROP POLICY IF EXISTS "User update own content" ON public.artworks;
DROP POLICY IF EXISTS "User delete own content" ON public.artworks;

CREATE POLICY "Public read access"
ON public.artworks
FOR SELECT
USING (true);

CREATE POLICY "Admin insert access"
ON public.artworks
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admin update access"
ON public.artworks
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete access"
ON public.artworks
FOR DELETE
USING (public.is_admin());

CREATE POLICY "User insert own cases"
ON public.artworks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND uploaded_by = auth.uid()
  AND case_record IS NOT NULL
  AND listing_type = 'product'
  AND coalesce(is_official, false) = false
  AND collection_id IS NULL
  AND coalesce(is_for_sale, false) = false
  AND price IS NULL
);

CREATE POLICY "User update own content"
ON public.artworks
FOR UPDATE
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "User delete own content"
ON public.artworks
FOR DELETE
USING (uploaded_by = auth.uid());

-- 5. 普通用户写 artworks 时锁定高风险字段
CREATE OR REPLACE FUNCTION public.enforce_user_case_constraints()
RETURNS TRIGGER AS $$
BEGIN
  -- service role / backend trusted writes 不做限制
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 管理员不受限制
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 普通用户只能代表自己写入
  NEW.uploaded_by := auth.uid();
  NEW.is_official := false;
  NEW.listing_type := 'product';
  NEW.collection_id := NULL;
  NEW.is_for_sale := false;
  NEW.price := NULL;
  NEW.currency := NULL;

  IF NEW.case_record IS NULL THEN
    RAISE EXCEPTION 'Non-admin users can only save return cases.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.uploaded_by := OLD.uploaded_by;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_user_case_constraints_trigger ON public.artworks;
CREATE TRIGGER enforce_user_case_constraints_trigger
BEFORE INSERT OR UPDATE ON public.artworks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_case_constraints();

COMMIT;
