# 拍照识图增量接入说明

这套实现只做功能叠加，不改原有藏品、商品、回流案例的展示和业务流。

## 1. 数据库增量执行

在 Supabase SQL Editor 执行：

`supabase/add-image-embeddings.sql`

它会完成：

- 开启 `pgvector`
- 在 `public.artworks` 上新增 `image_embedding vector(512)`
- 创建余弦检索索引
- 新增 `match_artworks_by_image(...)` RPC

## 2. 部署 Edge Function

新增函数目录：

- `supabase/functions/artwork-visual-search/index.ts`
- `supabase/functions/artwork-visual-search/deno.json`

部署示例：

```bash
supabase functions deploy artwork-visual-search
```

函数固定使用模型：

- `Xenova/clip-vit-base-patch32`

函数能力：

- `action: "index-artwork"`: 为指定藏品图片生成 512 维向量并写回 `artworks.image_embedding`
- `action: "match-image"`: 为用户上传图片生成向量，并调用数据库 RPC 返回 Top 5 相似藏品

## 3. 回填现有全部藏品向量

新增脚本：

- `scripts/syncArtworkEmbeddings.ts`

执行方式：

```bash
npx tsx scripts/syncArtworkEmbeddings.ts
```

强制全量重建：

```bash
npx tsx scripts/syncArtworkEmbeddings.ts --force
```

脚本会：

- 从 `.env.local` / `.env` 读取 Supabase 环境变量
- 找出未生成向量的藏品
- 调用 `artwork-visual-search` 云函数批量写回向量

## 4. 前端接入点

新增页面能力：

- `src/components/ImageSearch/ArtworkVisualSearchModal.tsx`
- `src/pages/search.tsx`

当前接入方式：

- 在现有搜索页新增 `拍照识图` 按钮
- 支持手机拍照和本地相册选图
- 先预览，再上传，再识图
- 结果以内嵌弹窗展示，不影响原有关键词搜索

## 5. 用户上传图片的云端归档

新增上传接口：

- `src/pages/api/image-search/upload.ts`

新增匹配接口：

- `src/pages/api/image-search/match.ts`

用户识图图片会上传到现有 Storage bucket 的独立目录：

- `visual-search-queries/YYYY/MM/DD/...`

不会和藏品原图目录混存。

## 6. 新增藏品的自动向量化

已补充到现有 Artwork API：

- `src/pages/api/artworks/index.ts`
- `src/pages/api/artworks/[id].ts`

行为：

- 新建藏品后自动调用云函数生成向量
- 编辑藏品主图后自动强制重建向量

这样后续上新会自动入库，无需手工回填。

## 7. 运行时环境变量

现有项目需要继续保留：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Edge Function 侧也需要同名 Supabase secrets。

## 8. 业务参数

当前实现已按约定固化：

- 向量维度：`512`
- 模型：`Xenova/clip-vit-base-patch32`
- 默认阈值：`0.2`
- 单次最多返回：`5`
- 相似度区间：`0 ~ 1`

## 9. 建议验证顺序

1. 执行 SQL
2. 部署 Edge Function
3. 运行一次批量回填脚本
4. 打开 `/search`
5. 选择一张图片做识图
6. 新增或编辑一件藏品，确认自动生成向量
