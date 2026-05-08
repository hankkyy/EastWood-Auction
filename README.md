# Eastwood Auction

Eastwood Auction is a Next.js web application for presenting antique and auction items online. The site is being adapted from a museum-style template into an antique auction experience where customers can browse curated objects, view auction previews, submit inquiries, and use image search to find visually similar items from the catalog.

## Current Focus

- Antique and auction item presentation
- English and Chinese built-in localization
- Dark visual theme for a gallery and auction-house feel
- Customer image search for matching uploaded reference photos against catalog items
- Admin-only workflow for importing item photos into the local image-search knowledge base
- Foundation for future ordering, inquiry, or checkout features

## Available Pages

- Home
- Browse
- Auctions
- Antiques / Catalog
- Image Search
- Services
- Consignment

Some routes still use their original template paths internally, such as `/visit`, `/collections`, and `/donation`, but the visible site copy has been updated for the Eastwood Auction antique business direction.

## Image Search

The image search feature is designed like a lightweight “photo search” experience:

- Customers upload a reference image of an antique or object they are interested in.
- The browser analyzes visual signals locally.
- The app compares the upload against seeded examples and admin-imported item photos.
- Results are ranked by visual similarity.

Admin import is protected by a local demo login. The current implementation stores demo admin accounts and imported items in browser storage, so it is suitable for prototyping but should be replaced with a real backend before production use.

Default demo admin account:

```text
Username: admin
Password: admin123
```

## Localization

The site supports two built-in languages:

- English
- 中文

The language picker uses a small flag icon plus the language label. Translation is handled inside the app instead of relying on Google Translate, which makes the visible UI more consistent.

## Tech Stack

- Next.js 13
- TypeScript
- Mantine 6
- Embla Carousel
- Tabler Icons
- Framer Motion
- ESLint

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The app will usually run at:

```text
http://localhost:3000
```

For the local development setup used during recent work, the app was run on port `3002`:

```bash
npm run dev -- -p 3002
```

## Quality Checks

Run TypeScript checks:

```bash
npx tsc --noEmit
```

Run lint:

```bash
npm run lint
```

## Project Notes

This project is actively being customized for an antique auction business. The next structural improvements should likely include:

- Renaming legacy routes to business-aligned paths such as `/catalog`, `/auctions`, and `/consign`
- Replacing browser-storage admin/demo data with a real database and authentication layer
- Adding item detail pages with price, availability, provenance, condition, and inquiry actions
- Adding order, cart, or checkout support when the sales workflow is ready

## License

MIT
