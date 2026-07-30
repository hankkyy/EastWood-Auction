# Eastwood Auction

A luxury antique auction platform — browse Chinese porcelain, jade, paintings, bronze, and scholar objects online. Bilingual (EN/ZH), with a client-side visual search engine for finding antiques by photo.

**[Live Demo](https://eastwood-auction.vercel.app)** · **[Technical Report](docs/arxiv-technical-report.md)** · **[Blog Post (中文)](docs/technical-blog-post.md)**

<p align="center">
  <img src="public/eastwood-logo.png" alt="Eastwood Auction" width="280">
</p>

---

## Architecture

```
┌───────────────────────────────────────────────┐
│                  Next.js 13                    │
│              (Pages Router)                    │
│                                               │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Pages  │ │ Sections │ │  Components   │  │
│  │  (SSR)  │ │ (Static) │ │  (Client)     │  │
│  └─────────┘ └──────────┘ └───────────────┘  │
│                      │                         │
│  ┌───────────────────┴──────────────────────┐ │
│  │          Visual Search Engine             │ │
│  │  ┌─────────────┐  ┌───────────────────┐  │ │
│  │  │ Client-Side │  │  Server-Side      │  │ │
│  │  │ • Signature │  │  • HuggingFace    │  │ │
│  │  │ • Matching  │  │  • pgvector RPC   │  │ │
│  │  │ • <10ms     │  │  • 512-dim embed  │  │ │
│  │  └─────────────┘  └───────────────────┘  │ │
│  └──────────────────────────────────────────┘ │
│                      │                         │
│  ┌───────────────────┴──────────────────────┐ │
│  │          API Routes (REST)                │ │
│  │  artworks · favorites · inquiries         │ │
│  │  image-search · proxy-image · translate   │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────┬────────────────────────┘
                       │
┌──────────────────────┴────────────────────────┐
│                 Supabase                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Auth   │ │PostgreSQL│ │   Storage    │  │
│  │ (Email)  │ │(+pgvector)│ │  (images)    │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
└────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 13.2 (Pages Router) |
| **Language** | TypeScript 5.0 |
| **UI Library** | Mantine v6 + Emotion |
| **Animation** | Framer Motion + Embla Carousel |
| **Backend** | Supabase (Auth, PostgreSQL, Storage, pgvector) |
| **Deployment** | Vercel |
| **iOS App** | SwiftUI (native) |
| **CI/CD** | GitHub Actions |

## Key Features

### Visual Search Engine

The centerpiece of Eastwood Auction — find antiques by uploading a photo instead of typing keywords.

- **Multi-feature image signature** (14 fields): color histogram, edge histogram, perceptual hashes (aHash + dHash), luminance grid, edge orientation, spatial profiles, foreground segmentation
- **Weighted similarity scoring**: 12-component weighted ensemble with shape gate to prevent color-only false matches
- **Confidence gating**: 6-threshold rejection system — explicitly says "no match" rather than returning misleading results
- **Hybrid architecture**: client-side matching (<10ms) for instant results; server-side pgvector fallback for large catalogs
- **Zero server cost for search**: all feature extraction and scoring runs in the browser

Read the full technical report: [docs/arxiv-technical-report.md](docs/arxiv-technical-report.md)

### Bilingual Design

Custom `useI18n` hook with 700+ translation keys in English and 中文. Language preference persisted to localStorage. No external translation API dependency.

### Luxury Brand Design System

Mantine's `violet` color scale remapped to gold/bronze tones (`#c4a255`). Dark/light mode with auction-house aesthetic inspired by Sotheby's and Christie's. Custom type scale with Playfair Display for headings.

See [CLAUDE.md](CLAUDE.md) for the full design system specification.

### Admin Workflow

- **Artwork import**: Upload images with metadata (title, category, period, description, price)
- **Knowledge base management**: Edit, delete, re-categorize artworks
- **Inquiry inbox**: Reply to customer inquiries, manage conversation threads
- **Market Watch**: eBay listing integration with sync rules and price history
- **3D Models**: LiDAR-scanned models (USDZ/GLB) with embedded viewer

### iOS App

Native SwiftUI app at `ios/EastwoodApp` with role-aware admin screens, cloud-persisted favorites, and push notifications. Shares the same Supabase backend as the web app.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, discovery, events |
| `/collections` | Antique catalog browser |
| `/collections/[id]` | Artwork detail with gallery |
| `/shop` | Purchasable items |
| `/shop/[id]` | Item detail with inquiry CTA |
| `/exhibitions` | Auction previews |
| `/image-search` | Visual search engine |
| `/market-watch` | eBay market data |
| `/inquiries` | Submit consignment/inquiry |
| `/inbox` | Message thread viewer |
| `/support` | Return case archive |
| `/donation` | Consignment page |
| `/search` | Full-text search |
| `/admin` | Admin dashboard |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in your Supabase URL and keys

# Run dev server
npm run dev

# Open browser
open http://localhost:3000
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VISUAL_SEARCH_EMBEDDING_API_URL=    # Optional: HuggingFace endpoint for server-side search
VISUAL_SEARCH_EMBEDDING_API_KEY=    # Optional: API key for embedding service
```

## Project Structure

```
src/
├── pages/              # Next.js pages + API routes
│   └── api/            # REST endpoints (artworks, favorites, inquiries, image-search, etc.)
├── components/         # Reusable UI (TopNav, BottomNav, AuthModal, ImageSearch, etc.)
├── section/            # Page sections (Home, Collections, Support, etc.)
├── features/
│   └── image-search/   # Visual search engine (client + server)
├── hooks/              # Custom hooks (useAuth)
├── i18n/               # Translation system (EN + ZH, 700+ keys)
├── lib/                # Utilities (Supabase client, eBay API, image proxy)
├── theme/              # Mantine theme override (gold/bronze palette)
├── data/               # Seed data and types
└── styles/             # Global CSS
```

## Documentation

- **[Technical Report](docs/arxiv-technical-report.md)** — Full paper on the visual search engine design
- **[Blog Post (中文)](docs/technical-blog-post.md)** — Engineering deep-dive in Chinese
- **[Design System](CLAUDE.md)** — Color tokens, component patterns, mobile hierarchy
- **[Database Schema](supabase/schema.sql)** — PostgreSQL schema with pgvector
- **[iOS App](ios/EastwoodApp/)** — SwiftUI native app source

## License

MIT
