# 数据库迁移指南 - 添加 artworks 表缺失字段

## 问题描述
在导入艺术品时遇到错误：
```
Unable to save artwork: Could not find the 'uploaded_by' column of 'artworks' in the schema cache
```

这是因为数据库中的 `artworks` 表缺少以下字段：
- `uploaded_by` - 上传者用户ID
- `is_for_sale` - 是否可售
- `price` - 售价
- `currency` - 货币单位
- `collection_id` - 藏品编号

## 解决方案

### 步骤 1：执行数据库迁移脚本

1. 登录到你的 Supabase 项目控制台
2. 进入 **SQL Editor** 页面
3. 点击 **New query**
4. 复制并粘贴以下内容到 SQL 编辑器中：

```sql
-- 为 artworks 表添加缺失的字段
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 添加 uploaded_by 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN uploaded_by uuid REFERENCES public.profiles(id);
        RAISE NOTICE '✓ Added uploaded_by column';
    ELSE
        RAISE NOTICE '⊘ uploaded_by column already exists';
    END IF;
END $$;

-- 2. 添加 is_for_sale 字段（是否可售）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'is_for_sale'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN is_for_sale boolean DEFAULT false;
        RAISE NOTICE '✓ Added is_for_sale column';
    ELSE
        RAISE NOTICE '⊘ is_for_sale column already exists';
    END IF;
END $$;

-- 3. 添加 price 字段（售价）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'price'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN price numeric(10, 2);
        RAISE NOTICE '✓ Added price column';
    ELSE
        RAISE NOTICE '⊘ price column already exists';
    END IF;
END $$;

-- 4. 添加 currency 字段（货币单位）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN currency text CHECK (currency IN ('USD', 'CNY')) DEFAULT 'CNY';
        RAISE NOTICE '✓ Added currency column';
    ELSE
        RAISE NOTICE '⊘ currency column already exists';
    END IF;
END $$;

-- 5. 添加 collection_id 字段（藏品编号）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artworks' AND column_name = 'collection_id'
    ) THEN
        ALTER TABLE public.artworks ADD COLUMN collection_id text UNIQUE;
        RAISE NOTICE '✓ Added collection_id column';
    ELSE
        RAISE NOTICE '⊘ collection_id column already exists';
    END IF;
END $$;

-- 验证所有字段已添加
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'artworks' 
    AND column_name IN ('uploaded_by', 'is_for_sale', 'price', 'currency', 'collection_id')
ORDER BY column_name;
```

5. 点击 **Run** 按钮执行脚本
6. 确认输出显示所有字段已成功添加（应该看到 ✓ 标记）

### 步骤 2：验证字段已添加

执行以下查询来验证字段是否存在：

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'artworks'
ORDER BY ordinal_position;
```

你应该能看到以下字段：
- `uploaded_by` (uuid)
- `is_for_sale` (boolean)
- `price` (numeric)
- `currency` (text)
- `collection_id` (text)

### 步骤 3：刷新 Schema Cache

在 Supabase 控制台中：
1. 进入 **Table Editor** → **artworks** 表
2. 点击右上角的 **Refresh** 按钮
3. 或者重新加载页面以确保 schema cache 更新

### 步骤 4：测试导入功能

现在你可以尝试再次导入艺术品，应该不会再出现 "Could not find the 'uploaded_by' column" 错误。

## 代码更新说明

我已经更新了以下 TypeScript 类型定义以匹配新的数据库结构：

1. **`src/data/artworks.ts`** - 更新了 `Artwork` 类型，添加了新字段
2. **`src/features/image-search/artworkCloud.ts`** - 更新了 `ArtworkRow` 类型和转换函数

这些更改确保了前端代码与数据库 schema 保持一致。

## 常见问题

### Q: 如果执行脚本时报错怎么办？
A: 确保你有足够的权限修改表结构。如果是团队项目，请联系数据库管理员。

### Q: 字段已经存在怎么办？
A: 脚本使用了条件检查（IF NOT EXISTS），如果字段已存在会跳过并显示提示消息，这是正常的。

### Q: 为什么需要刷新 schema cache？
A: Supabase 使用缓存来提高性能。添加新字段后，需要刷新缓存才能让 API 识别这些新字段。

## 相关文件

- 迁移脚本：`supabase/add-missing-artwork-fields.sql`
- 类型定义：`src/data/artworks.ts`
- 数据转换：`src/features/image-search/artworkCloud.ts`
- API 路由：`src/pages/api/artworks/index.ts`
