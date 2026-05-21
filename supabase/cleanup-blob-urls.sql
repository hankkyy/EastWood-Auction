-- ============================================
-- 清理无效的 Blob URL 数据
-- ============================================
-- 
-- 说明：此脚本用于删除包含临时 Blob URL 的艺术品记录
-- 这些记录是在修复 Base64 转换之前上传的，图片无法正确显示
--
-- 执行前请确认：
-- 1. 已备份重要数据（如果需要）
-- 2. 前端代码已修复为使用 Base64 格式
-- 3. 后端 API 可以正确处理 Base64 图片上传
--
-- 执行步骤：
-- 1. 访问 https://app.supabase.com/project/rsleemziyoiyluvycixf/sql
-- 2. 复制此脚本内容到 SQL Editor
-- 3. 点击 "Run" 执行
-- ============================================

-- 第一步：查看即将删除的记录（预览）
SELECT 
  id,
  title,
  listing_type,
  image,
  created_at
FROM artworks 
WHERE image LIKE 'blob:%'
ORDER BY created_at DESC;

-- 第二步：确认无误后，执行删除操作
-- ⚠️ 警告：此操作不可逆！
DELETE FROM artworks 
WHERE image LIKE 'blob:%';

-- 第三步：验证清理结果
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN image LIKE 'blob:%' THEN 1 END) as invalid_records,
  COUNT(CASE WHEN image LIKE 'https://%supabase.co/storage%' THEN 1 END) as valid_storage_records,
  COUNT(CASE WHEN image NOT LIKE 'blob:%' AND image NOT LIKE 'https://%supabase.co/storage%' THEN 1 END) as other_records
FROM artworks;

-- 预期结果：
-- - invalid_records: 0 （所有 blob: URL 已删除）
-- - valid_storage_records: >= 0 （Supabase Storage URL 的数量）
-- - other_records: 可能是空字符串或其他格式