# 📊 数据存储机制详解

## 🎯 核心概念：统一存储，字段区分

### ✅ **单一数据表**

回流案例和藏品展示**都存储在同一个 `artworks` 表中**，通过以下关键字段区分：

| 字段 | 类型 | 说明 |
|------|------|------|
| **[listingType](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/data/artworks.ts#L11-L11)** | `"collection"` 或 `"product"` | **主要区分字段** |
| **[caseRecord](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/data/artworks.ts#L58-L58)** | `ArtworkCaseRecord \| null` | 回流案例特有 |
| **[collectionId](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/data/artworks.ts#L63-L63)** | `string \| null` | 藏品展示特有 |

---

## 📋 数据结构对比

### 1️⃣ 藏品展示 (Collections)

```json
{
  "id": "imported-1234567890",
  "title": "青花瓷瓶",
  "titleZh": "青花瓷瓶",
  "category": "porcelain",
  "period": "明代",
  
  // ← 关键区分字段
  "listingType": "collection",  // ← 标识为藏品
  "collectionId": "COL-MPC5FH94-AACN",  // ← 藏品编号（唯一）
  "caseRecord": null,  // ← 没有案例信息
  
  // 图片信息
  "image": "https://rsleemziyoiyluvycixf.supabase.co/storage/v1/object/public/artwork-images/collection/imported-1234567890/timestamp-0.jpg",
  "galleryImages": [
    "https://.../timestamp-0.jpg",
    "https://.../timestamp-1.jpg",
    "https://.../timestamp-2.jpg"
  ],
  
  // 销售信息
  "isForSale": true,
  "price": 1000,
  "currency": "CNY",
  
  // 其他信息
  "description": "精美的青花瓷瓶...",
  "featureVector": [0, 0, 0, 0, 0, 0, 0, 0],
  "uploadedBy": "af8185f4-a44e-4766-a5ed-8f245ae692e0",
  "createdAt": "2026-05-19T10:00:00.000Z",
  "updatedAt": "2026-05-19T10:00:00.000Z"
}
```

---

### 2️⃣ 回流案例 (Cases)

```json
{
  "id": "imported-0987654321",
  "title": "未命名案例",
  "titleZh": null,
  "category": "misc",
  "period": "",
  
  // ← 关键区分字段
  "listingType": "product",  // ← 标识为回流案例
  "collectionId": null,  // ← 没有藏品编号
  "caseRecord": {  // ← 包含完整的案例信息
    "caseId": "",
    "salePrice": "5000",
    "saleTime": "2024-01-01",
    "salePlatform": "eBay",
    "clientRegion": "北美",
    "logisticsCost": "200",
    "purchaseChannel": "拍卖行",
    "purchaseCost": "3000",
    "riskAdvice": "注意物流风险"
  },
  
  // 图片信息
  "image": "https://rsleemziyoiyluvycixf.supabase.co/storage/v1/object/public/artwork-images/product/imported-0987654321/timestamp-0.jpg",
  "galleryImages": [
    "https://.../timestamp-0.jpg",
    "https://.../timestamp-1.jpg"
  ],
  
  // 销售信息（回流案例通常不直接销售）
  "isForSale": false,
  "price": null,
  "currency": "CNY",
  
  // 其他信息
  "description": "",
  "featureVector": [0, 0, 0, 0, 0, 0, 0, 0],
  "uploadedBy": "af8185f4-a44e-4766-a5ed-8f245ae692e0",
  "createdAt": "2026-05-19T10:00:00.000Z",
  "updatedAt": "2026-05-19T10:00:00.000Z"
}
```

---

## 🔍 前端如何分别获取数据

### 藏品展示页面 (`/collections`)

**文件：** [`/src/section/Collections/Collections.tsx`](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/section/Collections/Collections.tsx)

```typescript
const cards = useMemo<CollectionCard[]>(() => {
  return knowledgeBaseItems
    .filter((item) => !item.caseRecord)  // ← 过滤条件：没有 caseRecord
    .map((item) => ({
      key: item.id,
      image: item.image,
      title: locale === "zh" && item.titleZh ? item.titleZh : item.title,
      category: mapArtworkCategory(item),
      href: `/collections/${item.id}`,
    }));
}, [knowledgeBaseItems, locale]);
```

**过滤逻辑：**
- ✅ 显示所有 `caseRecord === null` 的记录
- ✅ 这些记录的 `listingType` 通常是 `"collection"`

---

### 回流案例页面 (`/cases` 或 `/support`)

**文件：** [`/src/section/Support/Cases.tsx`](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/section/Support/Cases.tsx)

```typescript
const cases = useMemo(() => {
  return items.filter((item) => {
    if (!item.caseRecord) return false;  // ← 过滤条件：必须有 caseRecord
    
    // 管理员可以看到所有内容
    if (isAdmin) return true;
    
    // 普通用户只能看到自己上传的内容或平台案例
    if (user && (item.uploadedBy === user.id || !item.uploadedBy)) return true;
    
    // 未登录用户只能看到平台案例
    return !item.uploadedBy;
  });
}, [items, user, isAdmin]);
```

**过滤逻辑：**
- ✅ 显示所有 `caseRecord !== null` 的记录
- ✅ 这些记录的 `listingType` 通常是 `"product"`
- ✅ 根据用户角色进一步过滤（权限控制）

---

## 📤 上传时如何指定类型

### 藏品上传

**文件：** [`/src/section/Collections/CollectionsManagement.tsx`](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/section/Collections/CollectionsManagement.tsx)

```typescript
const newArtwork: Artwork = {
  id: `imported-${Date.now()}`,
  title: adminItemName.trim(),
  category: adminCategory,
  period: "",
  image: adminImages[adminCoverIndex],
  galleryImages: adminImages,
  description: adminItemDetails || "",
  
  // ← 关键：设置为 collection
  listingType: "collection",
  
  uploadedBy: userId,
  featureVector: [0, 0, 0, 0, 0, 0, 0, 0],
  collectionId: collectionId,  // ← 生成藏品编号
  isForSale: adminIsForSale,
  price: adminIsForSale && adminPrice !== "" ? Number(adminPrice) : undefined,
  currency: adminIsForSale ? adminCurrency : undefined,
};

await saveImportedArtwork(newArtwork);
```

---

### 回流案例上传

**文件：** [`/src/section/Support/CasesManagement.tsx`](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/section/Support/CasesManagement.tsx)

```typescript
const newArtwork: Artwork = {
  id: `imported-${Date.now()}`,
  title: adminItemName.trim(),
  category: adminCategory,
  period: "",
  image: adminImages[adminCoverIndex],
  galleryImages: adminImages,
  description: adminItemDetails || "",
  
  // ← 关键：设置为 product
  listingType: "product",
  
  uploadedBy: userId,
  featureVector: [0, 0, 0, 0, 0, 0, 0, 0],
  collectionId: null,  // ← 没有藏品编号
  
  // ← 关键：包含案例信息
  caseRecord: {
    caseId: adminCaseId,
    salePrice: adminSalePrice,
    saleTime: adminSaleTime,
    salePlatform: adminSalePlatform,
    clientRegion: adminClientRegion,
    logisticsCost: adminLogisticsCost,
    purchaseChannel: adminPurchaseChannel,
    purchaseCost: adminPurchaseCost,
    riskAdvice: adminRiskAdvice,
  },
  
  isForSale: false,
  price: undefined,
  currency: undefined,
};

await saveImportedArtwork(newArtwork);
```

---

## 🗄️ Supabase Storage 文件路径

图片文件在 Supabase Storage 中也按类型分开存储：

### 藏品图片路径
```
artwork-images/
└── collection/
    └── imported-1234567890/
        ├── timestamp-0.jpg
        ├── timestamp-1.jpg
        └── timestamp-2.jpg
```

### 回流案例图片路径
```
artwork-images/
└── product/
    └── imported-0987654321/
        ├── timestamp-0.jpg
        └── timestamp-1.jpg
```

**代码实现：**
```typescript
// /src/pages/api/artworks/index.ts
const objectPath = `${artwork.listingType}/${artwork.id}/${Date.now()}-${index}.${extension}`;
// 例如：collection/imported-1234567890/1779186962172-0.jpg
// 或：product/imported-0987654321/1779186962172-0.jpg
```

---

## 🔎 查询示例

### 查询所有藏品
```sql
SELECT id, title, listing_type, collection_id
FROM artworks
WHERE listing_type = 'collection'
   OR case_record IS NULL;
```

### 查询所有回流案例
```sql
SELECT id, title, listing_type, case_record
FROM artworks
WHERE listing_type = 'product'
   AND case_record IS NOT NULL;
```

### 统计数量
```sql
SELECT 
  listing_type,
  COUNT(*) as count,
  COUNT(CASE WHEN case_record IS NOT NULL THEN 1 END) as with_case_record,
  COUNT(CASE WHEN collection_id IS NOT NULL THEN 1 END) as with_collection_id
FROM artworks
GROUP BY listing_type;
```

---

## 📊 总结

| 方面 | 藏品展示 | 回流案例 |
|------|---------|---------|
| **数据表** | `artworks` | `artworks`（同一张表） |
| **listingType** | `"collection"` | `"product"` |
| **caseRecord** | `null` | `{ ... }`（完整对象） |
| **collectionId** | 有值（如 "COL-XXX"） | `null` |
| **Storage 路径** | `collection/{id}/...` | `product/{id}/...` |
| **前端过滤** | `!item.caseRecord` | `item.caseRecord !== null` |
| **页面路由** | `/collections` | `/cases` 或 `/support` |

---

## 💡 优势

1. **✅ 统一管理**：所有艺术品在一个表中，便于维护和查询
2. **✅ 灵活扩展**：可以轻松添加新的类型（如 `"auction"`、`"exhibition"` 等）
3. **✅ 共享功能**：图片搜索、特征向量等功能可以复用
4. **✅ 简化架构**：不需要维护多张表，降低复杂度

---

## 🎯 现在回答您的问题

**问：现在上传就会保存吗？**

**答：** 
- ✅ **是的**，上传后会立即保存到 Supabase
- ✅ 图片文件上传到 Supabase Storage
- ✅ 元数据保存到 Supabase Database (`artworks` 表)

**问：Supabase 我看就一个 artwork，那回流案例和藏品展示怎么分别存储的呢？**

**答：**
- ✅ **确实只有一个 `artworks` 表**
- ✅ 通过 `listingType` 字段区分：`"collection"` vs `"product"`
- ✅ 通过 `caseRecord` 字段区分：`null` vs `{ ... }`
- ✅ 通过 `collectionId` 字段区分：有值 vs `null`
- ✅ 前端根据这些字段过滤显示不同的内容

这种设计非常合理，既保持了数据的统一管理，又实现了功能的清晰分离！🚀