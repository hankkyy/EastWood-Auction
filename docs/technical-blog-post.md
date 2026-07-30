# 如何在浏览器里实现一个古董拍卖平台的「以图搜图」引擎

## 前言

我独立开发了一个叫 Eastwood Auction 的古董拍卖平台。用户浏览瓷器、玉器、书画、铜器等古董时，常常手里有张参考照片，但不知道这件东西叫什么、属于哪个类别、哪个年代。

关键词搜索在这种情况下基本失效——一个普通买家不会写「清乾隆青花缠枝莲纹赏瓶」，他只会掏出一张照片。

所以我需要以图搜图。但问题是：

- 我一个人开发，没有 GPU 服务器
- 用户上传的可能是价值几十万的古董照片，隐私敏感
- 拍卖浏览是快速探索型的，等不起服务器返回的几百毫秒延迟

最终我的方案是：**把整个视觉搜索引擎塞进浏览器里跑**。

这篇文章会详细拆解这个系统的设计，包括特征签名、相似度算法、置信度门控和混合架构。

---

## 整体架构

```
用户上传图片
    │
    ▼
┌─────────────────────────────┐
│  浏览器端特征提取            │
│  • 48×48 像素分析画布        │
│  • 8维颜色特征向量           │
│  • 14维扩展签名（纹理/边缘/空间分布）│
└──────────────┬──────────────┘
               │
    ┌──────────┴──────────┐
    │                      │
    ▼                      ▼
┌──────────────┐   ┌──────────────────┐
│ 客户端匹配     │   │ 服务端匹配（可选） │
│ • 签名相似度   │   │ • HuggingFace API │
│ • 置信度门控   │   │ • pgvector 向量搜索│
│ • 即时返回     │   │ • 512维embedding  │
└──────────────┘   └──────────────────┘
```

**默认走客户端路径**：零服务器成本、零延迟、保护隐私。服务端路径作为知识库规模增大后的 fallback。

---

## 核心一：图像签名设计

### 第一层：8维颜色特征向量

```typescript
type ArtworkFeatureVector = [
  red: number,        // 平均红色通道强度
  green: number,      // 平均绿色通道强度
  blue: number,       // 平均蓝色通道强度
  brightness: number, // 整体亮度
  saturation: number, // 色彩饱和度
  warmth: number,     // 暖色调倾向（红+金）
  coolness: number,   // 冷色调倾向（蓝+绿）
  contrast: number    // 明暗对比度
];
```

这个 8 维向量是「粗筛」。比如一件青花瓷（蓝白色调）和一件铜器（暖棕色调），仅靠这个向量就能拉开距离。

但光有颜色不够——两件都是青花瓷的时候，颜色几乎一样，需要更深层的特征来区分。

### 第二层：14维扩展签名

```typescript
type ArtworkImageSignature = {
  colorHistogram: number[];           // 48-bin RGB 颜色直方图
  edgeHistogram: number[];            // 16-bin 边缘强度空间分布
  averageHash: string;               // 感知哈希（aHash）
  differenceHash: string;            // 梯度哈希（dHash）
  objectAspectRatio: number;         // 前景物体宽高比
  edgeDensity: number;               // 边缘像素占比
  texture: number;                   // 纹理复杂度
  luminanceGrid: number[];           // 8×8 亮度空间分布
  edgeOrientationHistogram: number[];// 8-bin 边缘方向分布
  rowProfile: number[];              // 前景像素水平投影
  columnProfile: number[];           // 前景像素垂直投影
  foregroundRatio: number;           // 前景占比
  centroidX: number;                 // 前景重心 X
  centroidY: number;                 // 前景重心 Y
};
```

关键设计思路：

1. **哈希用两种而非一种**：aHash（均值哈希）对亮度分布敏感，适合区分「白瓷」和「青铜」；dHash（梯度哈希）对边缘敏感，适合区分「素面」和「雕花」。两者互补，计算成本几乎为零。

2. **rowProfile/columnProfile 捕获物体轮廓**：把前景像素投影到水平和垂直轴上，得到一个 16 维的「形状签名」。这让系统能区分「细长的花瓶」和「扁平的盘子」，即使颜色完全一样。

3. **前景分割不用深度学习**：采样边框像素作为背景色估计，然后对每个像素计算与背景的颜色距离。对于古董拍卖这种通常有纯色摄影背景的场景，效果足够好。

### 为什么是 48×48？

| 分辨率 | 像素数 | 边缘检测质量 | 处理时间 |
|--------|--------|------------|---------|
| 32×32 | 1,024 | 边缘模糊 | ~2ms |
| **48×48** | **2,304** | **足够清晰** | **~5ms** |
| 64×64 | 4,096 | 略好 | ~18ms |

48×48 是一个 sweet spot：2,304 像素的数据量足够做边缘检测和空间分布分析，而处理时间仅约 5ms。

---

## 核心二：加权相似度打分

### 向量相似度（8维）

```typescript
const vectorSimilarity = (left: number[], right: number[]): number => {
  let distance = 0;
  for (let i = 0; i < left.length; i++) {
    const diff = left[i] - right[i];
    const weight = i <= 2 ? 0.3 : 1.0; // RGB 通道降权
    distance += diff * diff * weight;
  }
  return Math.max(0, Math.min(1, 1 - Math.sqrt(distance) / 1.45));
};
```

RGB 通道的权重是 0.3，因为颜色信息已经在下层签名中更精细地表达了，不应在向量层重复主导。

### 签名相似度（14维，加权组合）

| 特征 | 权重 | 相似度方法 | 捕获什么 |
|------|------|-----------|---------|
| rowProfile | 18% | 向量数组相似度 | 物体水平轮廓 |
| columnProfile | 18% | 向量数组相似度 | 物体垂直轮廓 |
| edgeOrientation | 14% | 向量数组相似度 | 纹理方向 |
| edgeHistogram | 12% | 直方图交集 | 边缘空间分布 |
| luminanceGrid | 10% | 向量数组相似度 | 明暗分布 |
| differenceHash | 8% | 汉明相似度 | 梯度结构 |
| averageHash | 8% | 汉明相似度 | 亮度结构 |
| aspectRatio | 5% | 数值相似度（对数空间） | 物体比例 |
| centroid | 5% | 数值相似度 | 物体位置 |
| foregroundRatio | 4% | 数值相似度 | 物体大小 |
| texture | 3% | 数值相似度 | 纹理复杂度 |
| colorHistogram | 3% | 直方图交集 | 颜色分布 |

**为什么 rowProfile 和 columnProfile 权重最高（各 18%）？** 因为对于古董来说，**器形**是最关键的分类特征——一个梅瓶和一个笔筒，颜色和纹理可能相似，但轮廓完全不同。

### 形状门控（Shape Gate）

这是整个系统最重要的防误判机制：

```typescript
// 计算「形状一致性」—— row + column + aspectRatio 三者的平均相似度
const shapeCore = [rowSim, colSim, aspectRatioSim];
const shapeAgreement = mean(shapeCore);

// 形状门控因子的下限是 0.3
const shapeGate = 0.3 + shapeAgreement * 0.7;

// 最终分数 = 加权分 × 形状门控
const finalScore = weightedScore * shapeGate;

// 硬性约束
if (shapeAgreement < 0.38) score = Math.min(score, 42); // 形状差异太大
if (shapeAgreement < 0.50) score = Math.min(score, 58); // 形状不够像
```

这意味着：**即使颜色完全一样，如果形状不匹配，分数也会被大幅压低**。防止系统把「红色花瓶」错误匹配到「红色盘子」。

### 最终分数合成

```typescript
// 同时有签名和向量的情况：
finalScore = 0.94 × signatureScore + 0.06 × vectorScore;

// 只有向量的情况（旧数据）：
finalScore = 0.58 × vectorScore; // 降低权重，因为没有签名的匹配可信度更低
```

---

## 核心三：置信度门控——主动说「不知道」

大多数搜索系统无论匹不匹配都会返回 Top-K 结果。我们选择了不同的策略：

```typescript
const MIN_SCORE = 72;                // 最低总分
const MIN_SIGNATURE_SCORE = 0.64;    // 最低签名分
const MIN_SHAPE_AGREEMENT = 0.58;    // 最低形状一致性
const MIN_BASE_SCORE = 0.52;         // 最低向量分
const MIN_SIGNATURELESS_SCORE = 92;  // 无签名时的更高门槛
const MIN_TOP_GAP = 6;               // 第一名和第二名的最小分差
```

六道门槛全部通过，才能返回结果。如果全都不通过，系统不会硬塞一个不相关的古董给你，而是明确告知：

> *"这张图片与当前知识库中的藏品差异较大，系统已主动拒绝低置信度结果，避免把不相关照片硬匹配成藏品。"*

这在古董交易场景中尤其重要——买家可能基于匹配结果做出购买决策，误导性的匹配比没有匹配更糟糕。

---

## 核心四：混合架构——客户端 + 服务端

### 客户端路径（默认）

- **提取**：Canvas API 获取像素 → 构建特征向量和签名
- **匹配**：与知识库中的每个 artwork 逐一比对
- **延迟**：<10ms（含图片加载和特征提取）
- **成本**：零
- **隐私**：图片不出浏览器

### 服务端路径（fallback，后端索引）

```typescript
// 1. 图片 → HuggingFace Embedding API → 512维向量
const embedding = await fetchEmbedding(imageUrl);

// 2. L2 归一化
const normalized = embedding.map(v => v / Math.sqrt(sumSquares));

// 3. pgvector 相似度搜索
const { data } = await supabase.rpc("match_artworks_by_image", {
  query_embedding: toVectorLiteral(normalized),
  match_threshold: 0.2,
  match_count: 5,
});
```

服务端路径用于：
- 给新导入的艺术品生成 embedding 并存入 pgvector
- 知识库规模超过数千件时的检索
- 未来可能的跨模态搜索（文字+图片）

---

## 工程实践亮点

### 1. 类型安全

所有特征向量和签名都是 TypeScript 强类型：

```typescript
type ArtworkFeatureVector = [
  red: number, green: number, blue: number,
  brightness: number, saturation: number,
  warmth: number, coolness: number, contrast: number
];
```

编译器会检查 8 元素长度和顺序，不可能传错维度。

### 2. Blob URL 内存管理

上传的图片会创建 Blob URL，搜索完成后要手动释放：

```typescript
if (previewUrl && isObjectUrl(previewUrl)) {
  URL.revokeObjectURL(previewUrl);
}
```

避免内存泄漏——这在长时间浏览拍卖目录时尤其重要。

### 3. 渐进式图片编码

上传到知识库的图片会自动压缩到合适大小：

```typescript
// 尝试不同质量等级，找到 ≤1.6MB 的最佳编码
const candidates = [0.82, 0.72, 0.6, 0.5];
for (const quality of candidates) {
  const encoded = canvas.toDataURL("image/jpeg", quality);
  if (encoded.length <= 1_600_000) return encoded;
}
```

### 4. CDN 代理

由于中国大陆可能无法直接访问 Unsplash 等图源，所有外部图片经过 `/api/proxy-image` 代理。

---

## 性能数据

在 M2 MacBook Pro 上实测（Chrome）：

| 操作 | 耗时 | 说明 |
|------|------|------|
| 图片加载 + 缩放 | ~2ms | Canvas drawImage |
| 特征向量提取 | ~0.01ms | 8 个浮点数 |
| 签名构建 | ~5ms | 全 14 字段 |
| 搜索（100 件） | ~3ms | 签名 + 向量比对 |
| **总计（首次）** | **~10ms** | |
| **总计（预热）** | **~3ms** | |

对于 1000 件艺术品，预计搜索时间约 30ms——仍然远低于人类感知阈值（100ms）。

内存占用：每件艺术品约 2KB 特征数据，1000 件约 2MB。

---

## 未来方向

1. **WASM 加速**：把签名提取编译成 WebAssembly，预计 2-3× 加速
2. **Service Worker 缓存**：签名存到 IndexedDB，打开页面瞬间可用
3. **混合排序**：客户端签名分 + 服务端 embedding 分做 learned ranking
4. **3D 搜索**：平台已支持 LiDAR 3D 模型（USDZ/GLB），扩展到 3D 形状匹配

---

## 总结

这个项目证明了：**不需要 GPU 服务器、不需要深度学习框架，在浏览器里也能做出实用级别的以图搜图功能**。

关键点：
- **多维特征签名** > 单一特征（14 个维度，加权组合）
- **形状门控** 防止颜色误导（最重要的一道防线）
- **置信度门控** 主动拒绝不可靠结果（比返回错误结果好）
- **客户端优先** 降低成本和延迟，服务端做 fallback

如果你也在做类似的项目（电商、二手交易、收藏品平台），希望这篇文章能给你一些参考。

代码开源在 [github.com/hankkyy/EastWood-Auction](https://github.com/hankkyy/EastWood-Auction)。

---

*2026年7月 · Hank Zhang*
