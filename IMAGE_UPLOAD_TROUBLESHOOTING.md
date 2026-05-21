# 🔍 图片上传问题完整诊断指南

## 📋 问题现象
- ✅ 前端显示"未命名图片"（数据保存成功）
- ❌ Supabase Storage 中没有图片文件
- ❌ 页面只显示图片图标（placeholder）

---

## 🛠️ 诊断步骤

### 第一步：检查浏览器控制台日志

1. **打开开发者工具**
   - Mac: `Cmd + Option + I`
   - Windows/Linux: `Ctrl + Shift + I`

2. **切换到 Console 标签**

3. **上传图片并观察日志**

**期望看到的日志：**
```javascript
[Collections] Starting save process...
[Collections] Admin images count: 2
[Collections] First image preview: data:image/jpeg;base64,/9j/4AAQSkZJRg...
[Collections] Is first image a Data URL? true  ← 必须是 true！
[Collections] Calling saveImportedArtwork...
```

**如果看到 `false`，说明图片格式错误！**

---

### 第二步：检查 Network 请求

1. **切换到 Network 标签**
2. **勾选 "Preserve log"**（保留日志）
3. **上传图片**
4. **找到 `POST /api/artworks` 请求**
5. **点击该请求，查看：**
   - **Request Payload**: 确认 `image` 和 `galleryImages` 是 Base64 格式
   - **Response**: 查看返回的数据

**期望的 Request Payload：**
```json
{
  "artwork": {
    "id": "imported-1234567890",
    "title": "青花瓷瓶",
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "galleryImages": ["data:image/jpeg;base64,/9j/4AAQ...", "..."]
  }
}
```

**期望的 Response：**
```json
{
  "artwork": {
    "id": "...",
    "image": "https://rsleemziyoiyluvycixf.supabase.co/storage/v1/object/public/artwork-images/collection/imported-xxx/timestamp-0.jpg",
    "galleryImages": ["https://...", "..."]
  }
}
```

---

### 第三步：检查服务器终端日志

在运行 `npm run dev` 的终端窗口中，应该看到：

```bash
[API] persistGalleryImages - Processing artwork: { id: '...', title: '...', ... }
[API] Processing image 0: { isDataUrl: true, preview: 'data:image/...' }
[API] Parsed image 0: { bufferSize: 123456, mimeType: 'image/jpeg', extension: 'jpg' }
[API] Uploading image 0 to: collection/imported-xxx/timestamp-0.jpg
[API] Successfully uploaded image 0
[API] Public URL for image 0: https://rsleemziyoiyluvycixf.supabase.co/storage/...
```

**如果看到错误信息，请记录完整的错误内容！**

---

## 🔧 常见问题和解决方案

### 问题 1：图片不是 Base64 格式

**症状：**
```javascript
[Collections] Is first image a Data URL? false
[Collections] First image preview: blob:http://localhost:3000/abc123...
```

**原因：** 
- 浏览器缓存了旧代码
- 修改没有生效

**解决方案：**
1. **硬刷新浏览器**：`Cmd + Shift + R` (Mac) 或 `Ctrl + Shift + R` (Windows)
2. **清除缓存**：
   - 打开开发者工具 → Application 标签
   - 左侧选择 "Storage" → 点击 "Clear site data"
3. **重启开发服务器**：
   ```bash
   # 停止当前服务器 (Ctrl+C)
   npm run dev
   ```

---

### 问题 2：Supabase Storage Bucket 不存在

**症状：**
```javascript
[API] Failed to upload image 0: { message: 'Bucket not found', ... }
```

**解决方案：**

1. **访问 Supabase Dashboard**
   ```
   https://app.supabase.com/project/rsleemziyoiyluvycixf/storage
   ```

2. **检查 bucket 是否存在**
   - 左侧菜单 → Storage
   - 查看是否有 `artwork-images` bucket

3. **如果不存在，创建 bucket**
   - 点击 "New bucket"
   - 名称：`artwork-images`
   - ✅ 勾选 "Public bucket"
   - 点击 "Create bucket"

4. **验证配置**
   - 环境变量文件 `.env.local` 中应该有：
     ```
     SUPABASE_STORAGE_BUCKET=artwork-images
     ```

---

### 问题 3：Storage 权限不足

**症状：**
```javascript
[API] Failed to upload image 0: { message: 'new row violates row-level security policy', ... }
```

**解决方案：**

1. **访问 Supabase SQL Editor**
   ```
   https://app.supabase.com/project/rsleemziyoiyluvycixf/sql
   ```

2. **执行以下 SQL 脚本**：

```sql
-- 允许任何人上传文件到 artwork-images bucket
CREATE POLICY "Allow public uploads to artwork-images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'artwork-images');

-- 允许任何人读取文件
CREATE POLICY "Allow public reads from artwork-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'artwork-images');

-- 允许管理员删除文件
CREATE POLICY "Allow admin deletes from artwork-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artwork-images' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
```

3. **点击 "Run" 执行**

4. **验证策略是否创建成功**
   - 回到 Storage 页面
   - 点击 `artwork-images` bucket
   - 查看 "Policies" 标签
   - 应该看到刚才创建的 3 个策略

---

### 问题 4：图片太大导致上传失败

**症状：**
```javascript
[API] Failed to upload image 0: { message: 'Payload too large', ... }
```

**解决方案：**

1. **检查 API 配置**
   
   当前配置在 `/src/pages/api/artworks/index.ts`：
   ```typescript
   export const config = {
     api: {
       bodyParser: {
         sizeLimit: "30mb",  // 最大 30MB
       },
     },
   };
   ```

2. **压缩图片**
   - 使用在线工具压缩图片
   - 或者在前端添加压缩功能

3. **限制上传数量**
   - 建议每次上传不超过 5 张图片
   - 单张图片不超过 5MB

---

### 问题 5：网络连接问题

**症状：**
```javascript
[API] Failed to upload image 0: { message: 'Network error', ... }
```

**解决方案：**

1. **检查网络连接**
   ```bash
   ping rsleemziyoiyluvycixf.supabase.co
   ```

2. **检查 Supabase 状态**
   ```
   https://status.supabase.com
   ```

3. **重试上传**

---

## 📊 完整的上传流程

```
用户操作                    前端处理                  后端处理                  Supabase
   │                          │                         │                         │
   ├─ 选择图片 ──────────────►│                         │                         │
   │                          ├─ FileReader             │                         │
   │                          ├─ readAsDataURL()        │                         │
   │                          ├─ 生成 Base64            │                         │
   │                          │                         │                         │
   ├─ 填写表单 ──────────────►│                         │                         │
   │                          ├─ 构建 Artwork 对象      │                         │
   │                          │                         │                         │
   ├─ 点击保存 ──────────────►│                         │                         │
   │                          ├─ POST /api/artworks     │                         │
   │                          │   (Base64 图片)         │                         │
   │                          │                         ├─ 解析 Base64            │
   │                          │                         ├─ 提取 buffer            │
   │                          │                         ├─ 生成文件路径           │
   │                          │                         │   collection/xxx/       │
   │                          │                         ├─ 上传到 Storage         ├─► 保存图片
   │                          │                         │                         │
   │                          │                         ├─ 获取公共 URL           ◄─┘
   │                          │                         ├─ 保存到数据库           ├─► 保存元数据
   │                          │                         │   (Supabase URL)        │
   │                          │                         │                         │
   │                          ◄─ 返回成功响应           │                         │
   │                             (包含 Supabase URL)    │                         │
   │                          │                         │                         │
   ├─ 刷新页面 ──────────────►│                         │                         │
   │                          ├─ GET /api/artworks      │                         │
   │                          │                         ├─ 从数据库读取           ◄─┘
   │                          │                         │   (Supabase URL)        │
   │                          ◄─ 返回艺术品列表         │                         │
   │                             (包含图片 URL)          │                         │
   │                          │                         │                         │
   └─ 显示图片 ──────────────►│                         │                         │
                              ├─ <img src="https://     │                         │
                              │      supabase.co/..."   │                         │
                              └─ 正常显示！✅            │                         │
```

---

## ✅ 验证清单

完成以下步骤后，逐一打勾确认：

- [ ] **前端日志**显示 `Is first image a Data URL? true`
- [ ] **Network 请求**的 Request Payload 包含 Base64 图片
- [ ] **服务器日志**显示 `Successfully uploaded image 0`
- [ ] **Response** 中的 `image` 字段是 Supabase URL（以 `https://` 开头）
- [ ] **Supabase Dashboard** → Storage → `artwork-images` bucket 中有新文件
- [ ] **刷新页面后**图片仍然正常显示
- [ ] **无痕模式**访问也能看到图片

---

## 🎯 快速测试

运行以下命令进行快速测试：

```bash
# 1. 检查环境变量
cat .env.local | grep SUPABASE

# 2. 检查开发服务器是否运行
curl http://localhost:3000/api/artworks | jq '.artworks | length'

# 3. 检查 Supabase 连接
curl -X GET "https://rsleemziyoiyluvycixf.supabase.co/rest/v1/artworks?select=count" \
  -H "apikey: sb_publishable_SBa5JdzQawsw2U7khRciKw_Tr76CuXT" \
  -H "Authorization: Bearer sb_publishable_SBa5JdzQawsw2U7khRciKw_Tr76CuXT"
```

---

## 📞 需要帮助？

如果以上步骤都无法解决问题，请提供以下信息：

1. **浏览器控制台完整日志**（截图或复制文本）
2. **Network 请求的 Request Payload 和 Response**（截图）
3. **服务器终端的完整日志**（截图）
4. **Supabase Storage bucket 截图**
5. **具体的错误信息**

这样我可以更准确地帮您定位问题！