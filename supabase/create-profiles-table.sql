-- ============================================
-- Profiles 表结构 - 用户资料管理（最终版）
-- ============================================

-- 0. 清理可能存在的旧函数和策略（避免冲突）
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP FUNCTION IF EXISTS public.generate_unique_user_id(text) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_id(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.set_profiles_updated_at() CASCADE;

-- 1. 创建 profiles 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  user_id text UNIQUE NOT NULL, -- 用户自定义ID，全局唯一
  email text, -- 邮箱地址
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')), -- 角色
  avatar_url text, -- 头像 URL
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. 创建 RLS 策略（修复无限递归问题）
-- 用户可以查看自己的资料
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 用户可以更新自己的资料
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- 管理员可以查看所有用户资料（使用 SECURITY DEFINER 函数避免递归）
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

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- 4. 创建更新时间触发器
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profiles_updated_at();

-- 5. 创建自动生成 user_id 的函数
CREATE OR REPLACE FUNCTION public.generate_unique_user_id(p_first_name text, p_last_name text)
RETURNS text AS $$
DECLARE
  base_id text;
  new_user_id text;
  counter integer := 0;
  max_attempts integer := 100;
BEGIN
  -- 优先使用 last_name（姓氏），如果为空则使用 first_name（名字）
  base_id := COALESCE(NULLIF(p_last_name, ''), NULLIF(p_first_name, ''));
  
  -- 清理文本：只保留字母、数字和下划线，转为小写
  base_id := lower(regexp_replace(base_id, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- 如果清理后为空或长度小于2，使用默认值
  IF base_id = '' OR length(base_id) < 2 THEN
    base_id := 'user';
  END IF;
  
  -- 限制基础ID长度（最多10个字符）
  IF length(base_id) > 10 THEN
    base_id := substring(base_id from 1 for 10);
  END IF;
  
  -- 尝试生成唯一的 user_id
  LOOP
    -- 生成 3 位随机数字
    new_user_id := base_id || lpad(floor(random() * 1000)::text, 3, '0');
    
    -- 检查是否已存在
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new_user_id) THEN
      RETURN new_user_id;
    END IF;
    
    counter := counter + 1;
    IF counter >= max_attempts THEN
      RAISE EXCEPTION '无法生成唯一的 user_id，请重试';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建自动为新用户生成 user_id 的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id text;
  provided_user_id text;
BEGIN
  -- 检查是否提供了自定义 user_id
  provided_user_id := NEW.raw_user_meta_data->>'user_id';
  
  IF provided_user_id IS NOT NULL AND provided_user_id != '' THEN
    -- 使用用户提供的 user_id（需要验证唯一性）
    IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = provided_user_id) THEN
      -- 如果 user_id 已存在，自动生成一个新的
      new_user_id := public.generate_unique_user_id(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      );
    ELSE
      -- 验证 user_id 格式（3-20位字母数字）
      IF provided_user_id ~ '^[a-zA-Z0-9]{3,20}$' THEN
        new_user_id := lower(provided_user_id);
      ELSE
        -- 格式不正确，自动生成
        new_user_id := public.generate_unique_user_id(
          COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'last_name', '')
        );
      END IF;
    END IF;
  ELSE
    -- 未提供 user_id，自动生成
    new_user_id := public.generate_unique_user_id(
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
  END IF;
  
  -- 插入 profiles 记录
  INSERT INTO public.profiles (id, first_name, last_name, user_id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    new_user_id,
    NEW.email,
    'user'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
