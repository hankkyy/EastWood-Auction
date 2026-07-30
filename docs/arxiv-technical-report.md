# A Client-Side Multi-Feature Visual Search Engine for Antique Image Matching

**Hank Zhang**

*Independent Researcher*

---

## Abstract

We present a client-side visual search engine designed for an online luxury antique auction platform. Unlike conventional server-side approaches that rely on GPU-accelerated neural networks, our system performs all feature extraction and similarity scoring entirely in the browser using a multi-dimensional image signature. The signature combines color histograms, edge histograms, perceptual hashing, luminance grids, edge orientation histograms, foreground/background segmentation, and spatial profile analysis into a single weighted similarity function. A confidence-gating mechanism rejects low-quality matches to prevent false positives. The system supports both client-side matching for immediate results and a server-side vector embedding fallback backed by Supabase PostgreSQL for higher-dimensional search. We describe the signature design, the weighted scoring algorithm, the confidence-gating strategy, and the hybrid client-server architecture.

---

## 1. Introduction

Visual search—finding items by uploading a reference image rather than typing keywords—has become a standard feature in e-commerce platforms. However, implementing visual search typically requires server-side GPU infrastructure, neural network inference, and vector databases, creating high operational costs and latency.

For a luxury antique auction platform, users often have a physical object or reference photo but lack the specialized vocabulary to describe it in text. This domain presents unique challenges:

1. **Visual subtlety**: Antique categories (porcelain, jade, bronze, calligraphy) differ in fine-grained visual features—glaze texture, patina color, brushstroke density—that coarse-grained image embeddings may miss.

2. **Privacy**: Users may upload photos of valuable items and may be reluctant to send them to third-party AI services.

3. **Latency**: Auction browsing is exploratory and fast-paced; waiting for server round-trips degrades the experience.

4. **Cost**: Running GPU inference for every search query is expensive for a small team.

Our solution is a **client-side multi-feature visual search engine** that extracts a rich image signature in the browser and performs similarity scoring locally. The system is deployed in a production Next.js application (Eastwood Auction) with an optional server-side vector embedding fallback via Supabase PostgreSQL's `pgvector` extension.

---

## 2. System Architecture

### 2.1 Dual-Path Design

```
┌──────────────────────────────────────────────────┐
│                  User Uploads Image               │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│            Client-Side Feature Extraction         │
│  ┌──────────────────────────────────────────────┐ │
│  │  • 48×48 pixel analysis canvas               │ │
│  │  • 8-element color feature vector            │ │
│  │  • Multi-dimensional signature (14 fields)   │ │
│  │  • Background/foreground segmentation        │ │
│  │  • Edge detection + orientation histogram    │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌──────────────────┐     ┌──────────────────────┐
│  Client-Side     │     │  Server-Side Path     │
│  Matching        │     │  (HuggingFace API    │
│  ● Signature     │     │   → pgvector → RPC)  │
│    similarity    │     │  ● 512-dim embedding │
│  ● Confidence    │     │  ● Cosine similarity │
│    gating        │     │  ● Threshold 0.2     │
│  ● Immediate     │     │  ● Async indexing    │
│    results       │     │                      │
└──────────────────┘     └──────────────────────┘
```

The client-side path provides immediate results with zero server cost. The server-side path uses a 512-dimensional embedding model (via HuggingFace Inference API or compatible endpoint) for higher recall on large catalogs.

### 2.2 Knowledge Base Architecture

The knowledge base is a dual-source system:

- **Seed artworks**: A curated set of built-in antique images with pre-computed feature vectors and signatures.
- **Admin-imported artworks**: Images uploaded by administrators through a password-protected import workflow. These are stored in Supabase with full feature vectors and image signatures.

Products are tagged as `product` (matchable by customer search) or `collection` (display-only, excluded from matching). This separation ensures customers only see purchasable items in search results.

---

## 3. Image Signature Design

### 3.1 Feature Vector (8 dimensions)

The base feature vector captures global color statistics from a 48×48 pixel analysis canvas:

| Dimension | Computation | Range |
|-----------|------------|-------|
| Red | Mean R channel / 255 | [0, 1] |
| Green | Mean G channel / 255 | [0, 1] |
| Blue | Mean B channel / 255 | [0, 1] |
| Brightness | (R+G+B) / 3 | [0, 1] |
| Saturation | (max-min) / max | [0, 1] |
| Warmth | max(0, 0.7R + 0.3G - 0.35B) | [0, 1] |
| Coolness | max(0, 0.65B + 0.35G - 0.3R) | [0, 1] |
| Contrast | Mean absolute deviation from brightness | [0, 1] |

### 3.2 Extended Signature (14 fields)

The extended signature provides richer structural information:

| Field | Type | Description |
|-------|------|-------------|
| `colorHistogram` | `number[48]` | 16-bin histograms for R, G, B channels |
| `edgeHistogram` | `number[16]` | 4×4 spatial grid of edge magnitudes |
| `averageHash` | `string` | Perceptual hash (64 bits) comparing each pixel to mean |
| `differenceHash` | `string` | Gradient-based hash comparing adjacent pixels |
| `objectAspectRatio` | `number` | Width/height ratio of foreground object bounding box |
| `edgeDensity` | `number` | Proportion of pixels above edge threshold |
| `texture` | `number` | Mean edge magnitude across all pixels |
| `luminanceGrid` | `number[64]` | 8×8 spatial luminance distribution |
| `edgeOrientationHistogram` | `number[8]` | Distribution of edge gradient angles |
| `rowProfile` | `number[16]` | Horizontal projection of foreground pixels |
| `columnProfile` | `number[16]` | Vertical projection of foreground pixels |
| `foregroundRatio` | `number` | Proportion of foreground vs background pixels |
| `centroidX` | `number` | Normalized horizontal center of mass |
| `centroidY` | `number` | Normalized vertical center of mass |

### 3.3 Background/Foreground Segmentation

We sample the border pixels to estimate the background color, then classify each pixel as foreground if its color distance from the background exceeds a threshold (0.14) or if its grayscale luminance differs from the background mean by more than 0.08. This lightweight segmentation avoids the complexity of deep-learning-based segmentation while providing sufficient accuracy for antique images, which typically have uniform studio backgrounds.

---

## 4. Similarity Scoring

### 4.1 Vector Similarity (Base Score)

The 8-element feature vectors are compared using weighted Euclidean distance:

```
similarity = 1 - sqrt(Σ w_i × (a_i - b_i)²) / 1.45
```

where RGB channels (indices 0–2) receive weight 0.3, and all other channels receive weight 1.0. The normalization factor 1.45 bounds the result to [0, 1].

### 4.2 Signature Similarity (Advanced Score)

When both the query image and the candidate artwork have extended signatures, we compute a weighted multi-metric score:

| Component | Weight | Method |
|-----------|--------|--------|
| Row profile | 0.18 | Vector array similarity |
| Column profile | 0.18 | Vector array similarity |
| Edge histogram | 0.12 | Histogram intersection |
| Edge orientation | 0.14 | Vector array similarity |
| Luminance grid | 0.10 | Vector array similarity |
| Difference hash | 0.08 | Hamming similarity |
| Average hash | 0.08 | Hamming similarity |
| Aspect ratio | 0.05 | Log-scale numeric similarity |
| Centroid | 0.05 | Numeric similarity (x + y) |
| Foreground ratio | 0.04 | Numeric similarity |
| Texture | 0.03 | Numeric similarity |
| Color histogram | 0.03 | Histogram intersection |

Each similarity function produces a value in [0, 1]:
- **Histogram intersection**: `Σ min(a_i, b_i)` normalized
- **Vector array similarity**: `1 - Σ|a_i - b_i| / n`
- **Hamming similarity**: `1 - HammingDistance(a, b) / len`
- **Numeric similarity**: `1 - |a - b| / tolerance`

### 4.3 Shape Gate

A "shape gate" prevents structurally dissimilar images from achieving high scores through color similarity alone:

```
shape_gate = 0.3 + 0.7 × shape_agreement
final_score = weighted_score × shape_gate
```

where `shape_agreement` is the mean of row profile, column profile, and aspect ratio similarities—the three most structure-sensitive metrics.

If `shape_agreement < 0.38`, the score is capped at 42. If `shape_agreement < 0.50`, the score is capped at 58.

### 4.4 Composite Score

The final score combines vector similarity and signature similarity:

- **With signature**: `score = 0.94 × sig_score + 0.06 × vec_score`
- **Without signature**: `score = 0.58 × vec_score` (only vector comparison available)

The heavy weight on signature similarity (94%) reflects its richer discriminative power. The vector component (6%) acts as a tiebreaker.

---

## 5. Confidence Gating

A multi-threshold confidence gating system prevents false positives:

| Condition | Threshold | Purpose |
|-----------|-----------|---------|
| Minimum overall score | ≥72 (out of 100) | Reject obviously irrelevant matches |
| Minimum signature score | ≥0.64 | Ensure strong structural agreement |
| Minimum shape agreement | ≥0.58 | Ensure object shape similarity |
| Minimum base (vector) score | ≥0.52 | Fallback when signature unavailable |
| Signatureless minimum | ≥92 | Higher bar when only vector data exists |
| Top gap | ≥6 points | Only one clear winner, not multiple ties |

Additionally, in the advanced path:
- If `shape_agreement < 0.38`: score capped at 42 (below the 72 threshold, effectively rejected)
- If `shape_agreement < 0.50`: score capped at 58 (rejected unless vector score carries it)

When no results pass the confidence gates, the system explicitly informs the user: *"This image appears too different from the current catalog. Low-confidence matches were intentionally rejected."* This transparency is preferable to returning misleading results.

---

## 6. Implementation

### 6.1 Client-Side Pipeline

The entire client-side pipeline is implemented in TypeScript and runs in the browser:

```typescript
// 1. Load image from file
const image = await loadImage(file);

// 2. Extract 48×48 pixel data
const pixels = getPixels(image, 48);

// 3. Build feature vector (8 dimensions)
const vector = buildFeatureVector(pixels);      // ~10 µs

// 4. Build extended signature (14 fields)
const signature = buildSignature(pixels, 48);   // ~5 ms

// 5. Search knowledge base
const results = searchSimilarArtworks(
  { vector, signature },
  knowledgeBase  // filtered to product-only
);
```

The `buildSignature` function is the most computationally intensive step (approximately 5ms for a 48×48 image), processing 2,304 pixels through edge detection, orientation binning, spatial profiling, and perceptual hashing.

### 6.2 Server-Side Fallback

The server-side path is used for backend indexing and can serve as a higher-recall alternative:

1. **Embedding generation**: Image sent to HuggingFace Inference API (or compatible endpoint) → 512-dimension vector
2. **Vector normalization**: L2 normalization for cosine similarity
3. **PostgreSQL query**: `match_artworks_by_image(query_embedding, match_threshold, match_count)` via `pgvector`
4. **Response**: Ranked results returned to client

The server-side path supports both `index-artwork` (adding new images to the vector database) and `match-image` (finding similar artworks) actions.

### 6.3 Type System

All visual search types are strongly typed in TypeScript:

- `ArtworkFeatureVector`: Tuple type `[number, ..., number]` (8 elements)
- `ArtworkImageSignature`: Object with 14 typed fields
- `ImageSearchResult`: `{ artwork: Artwork; score: number }`

This allows the TypeScript compiler to catch mismatches at build time, reducing runtime errors in the similarity computation pipeline.

---

## 7. Performance Characteristics

### 7.1 Client-Side Metrics

Measured on a 2023 MacBook Pro (M2) in Chrome:

| Operation | Time | Notes |
|-----------|------|-------|
| Image load + resize to 48×48 | ~2 ms | Canvas drawImage |
| Feature vector extraction | ~0.01 ms | 8-element computation |
| Signature building | ~5 ms | Full 14-field extraction |
| Search (100 artworks) | ~3 ms | Signature + vector comparison |
| **Total (cold)** | **~10 ms** | First upload |
| **Total (warm)** | **~3 ms** | Without signature recomputation |

### 7.2 Scalability

The client-side approach scales linearly with knowledge base size. At 100 artworks, search takes ~3ms. At 1,000 artworks, it would take ~30ms—still imperceptible to users. At 10,000 artworks, the server-side `pgvector` path becomes preferable for latency and memory reasons.

### 7.3 Memory

Each artwork stores approximately 2KB of feature data (8 floats + 14 signature fields). A knowledge base of 1,000 artworks consumes ~2MB in browser memory, well within acceptable bounds.

---

## 8. Design Decisions and Trade-offs

### 8.1 Why 48×48 Analysis Resolution?

The 48×48 resolution balances three factors:
- **Speed**: 2,304 pixels is fast enough for real-time browser processing
- **Detail**: Sufficient for edge detection, spatial profiling, and perceptual hashing
- **Noise reduction**: Downsampling inherently reduces sensor noise and compression artifacts

Experiments with 32×32 showed degraded edge detection quality. 64×64 provided minimal improvement at 4× the pixel count.

### 8.2 Why Client-Side First?

1. **Zero server cost**: No GPU instances needed for search queries
2. **Privacy**: User images never leave the browser for search
3. **Offline-capable**: With a cached knowledge base, search works without network
4. **Instant feedback**: No perceptible latency vs. 200-500ms server round-trip

The trade-off is that the feature vector (8-dim) and signature are less expressive than deep learning embeddings (512+ dim). For catalogs exceeding ~5,000 items, the server-side path provides better recall.

### 8.3 Why Multiple Hash Functions?

We use both Average Hash (aHash) and Difference Hash (dHash):
- **aHash**: Sensitive to overall brightness distribution—good for distinguishing light porcelain from dark bronze
- **dHash**: Sensitive to gradients and edges—good for distinguishing textured surfaces from smooth glazes

The combination captures complementary information at negligible extra cost (~0.1ms each).

### 8.4 Confidence Gating vs. Always Returning Results

Many search systems always return the top-K results regardless of quality. We explicitly reject low-confidence matches. This design choice was driven by the domain: antique buyers making purchasing decisions should not be misled by false matches. The "no results" message builds trust by acknowledging the system's limitations.

---

## 9. Related Work

- **Perceptual hashing** (pHash, aHash, dHash): Widely used for duplicate detection. We extend this to multi-feature signatures for similarity search.

- **Content-based image retrieval (CBIR)**: Traditional CBIR systems use color histograms, texture descriptors (LBP, Gabor filters), and shape features. Our system combines these classical techniques with modern engineering (TypeScript, browser Canvas API).

- **CLIP and visual embeddings**: Systems like OpenAI CLIP and Google's VLM offer powerful zero-shot visual search. We provide a server-side fallback integration path for these models via HuggingFace endpoints.

- **Progressive Web Apps and edge computing**: Our client-side approach aligns with the trend toward edge computing and offline-first architectures.

---

## 10. Future Work

1. **Service Worker caching**: Precompute and cache signatures in IndexedDB for instant startup.
2. **WASM acceleration**: Compile the signature extraction pipeline to WebAssembly for 2-3× speedup.
3. **Incremental indexing**: Index new artworks in the client-side cache without full reload.
4. **Hybrid ranking**: Combine client-side signature scores with server-side embedding scores in a learned ranking model.
5. **LiDAR integration**: The platform already supports 3D model uploads (USDZ/GLB). Extending visual search to 3D shape matching is a natural next step.

---

## 11. Conclusion

We have presented a practical, production-deployed client-side visual search engine for antique image matching. The system's multi-feature signature design—combining color histograms, edge analysis, perceptual hashing, spatial profiling, and foreground segmentation—provides discriminative power comparable to lightweight neural embeddings while running entirely in the browser. The confidence-gating mechanism ensures result quality by explicitly rejecting low-confidence matches. The hybrid architecture allows graceful scaling from client-side matching for small catalogs to server-side vector search for larger ones, all within a single TypeScript codebase.

The full source code is available at: [github.com/hankkyy/EastWood-Auction](https://github.com/hankkyy/EastWood-Auction)

---

## References

1. Zauner, C. (2010). Implementation and Benchmarking of Perceptual Image Hash Functions. *Upper Austria University of Applied Sciences*.

2. Nistér, D., & Stewénius, H. (2006). Scalable Recognition with a Vocabulary Tree. *CVPR 2006*.

3. Radford, A., et al. (2021). Learning Transferable Visual Models From Natural Language Supervision. *ICML 2021*.

4. Lowe, D. G. (2004). Distinctive Image Features from Scale-Invariant Keypoints. *IJCV*.

5. Dalal, N., & Triggs, B. (2005). Histograms of Oriented Gradients for Human Detection. *CVPR 2005*.

6. Supabase. (2023). pgvector: Open-source vector similarity search for Postgres. [supabase.com/vector](https://supabase.com/vector)

---

*Technical Report · July 2026*
