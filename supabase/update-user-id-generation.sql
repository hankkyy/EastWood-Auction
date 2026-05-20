-- ============================================
-- 更新 user_id 生成函数以支持中文名字
-- ============================================

-- 1. 删除旧函数（CASCADE 会级联删除依赖的触发器）
DROP FUNCTION IF EXISTS public.generate_unique_user_id(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. 创建新的 generate_unique_user_id 函数（支持中英文）
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

-- 3. 重新创建 handle_new_user 触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, user_id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    public.generate_unique_user_id(
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    ),
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 重新创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 5. 测试示例
SELECT public.generate_unique_user_id('三', '张') AS test_chinese;
SELECT public.generate_unique_user_id('John', 'Smith') AS test_english;
SELECT public.generate_unique_user_id('', '') AS test_empty;
