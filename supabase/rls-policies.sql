-- ============================================
-- 行级安全策略 (RLS) - 保护数据访问权限
-- ============================================

-- 1. 启用 RLS
alter table public.artworks enable row level security;

-- 2. 公开读取策略 - 任何人都可以浏览艺术品
create policy "Public read access"
on public.artworks
for select
using (true);

-- 3. 管理员写入策略 - 只有管理员可以创建、更新、删除
create policy "Admin insert access"
on public.artworks
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

create policy "Admin update access"
on public.artworks
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

create policy "Admin delete access"
on public.artworks
for delete
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 4. 普通用户上传策略 - 允许上传回流案例
create policy "User insert own cases"
on public.artworks
for insert
with check (
  -- 用户已登录
  auth.uid() is not null
  -- 且只能上传 caseRecord 不为空的内容（回流案例）
  and (new.case_record is not null)
);

-- 5. 用户可以更新自己的内容
create policy "User update own content"
on public.artworks
for update
using (
  -- 上传者是自己
  uploaded_by = auth.uid()::text
  -- 或者是管理员
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 6. 用户可以删除自己的内容
create policy "User delete own content"
on public.artworks
for delete
using (
  -- 上传者是自己
  uploaded_by = auth.uid()::text
  -- 或者是管理员
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- ============================================
-- Storage Bucket 安全策略
-- ============================================

-- 7. 公开读取图片
create policy "Public read images"
on storage.objects
for select
using (bucket_id = 'artwork-images');

-- 8. 管理员上传图片
create policy "Admin upload images"
on storage.objects
for insert
with check (
  bucket_id = 'artwork-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 9. 用户上传案例图片
create policy "User upload case images"
on storage.objects
for insert
with check (
  bucket_id = 'artwork-images'
  and auth.uid() is not null
);

-- 10. 管理员删除图片
create policy "Admin delete images"
on storage.objects
for delete
using (
  bucket_id = 'artwork-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 11. 用户删除自己的图片
create policy "User delete own images"
on storage.objects
for delete
using (
  bucket_id = 'artwork-images'
  and owner = auth.uid()
);
