# Eastwood iOS Native Feature Parity Checklist

Status legend:
- [x] Completed in native iOS
- [~] Partially complete / needs deeper parity
- [ ] Not yet implemented natively

## Core Catalog
- [x] Home feed from cloud `/api/artworks`
- [x] Collections module (native)
- [x] Shop module (native)
- [x] Cases module (native)
- [x] Text search (native)
- [~] Full sort/filter parity with web across all category combinations (now includes category/period/price/sale filters in native sections)

## Artwork Detail
- [x] Native detail page
- [x] Price and listing metadata
- [x] Case record display
- [~] Full web-equivalent metadata richness (all optional fields and formatting)

## Auth & Profile
- [x] Supabase email/password sign-in (native)
- [x] Role check via `/api/mobile/me`
- [x] Admin gating for privileged modules
- [x] Session persistence hardening (Keychain token restore + local role/email persistence)

## Favorites (Cloud Persistence)
- [x] Cloud favorites table
- [x] Add/remove favorites via API
- [x] Native saved list

## Inquiries & Inbox
- [x] Submit inquiry (native)
- [x] Inbox list + conversation view
- [x] Mark read flow
- [x] Admin status actions (process/archive/restore)
- [x] Batch status actions in Admin Inquiries
- [~] Full web-equivalent message/read semantics verification under edge cases

## Admin Artworks
- [x] List/search/filter artworks
- [x] Create/edit/delete artwork
- [x] Cover + gallery uploads through cloud upload API
- [x] Batch delete
- [x] Batch import (line-based)
- [~] Full parity with web import tooling and advanced admin workflows

## Image Search
- [x] Native image picker
- [x] Upload query image to cloud
- [x] Match API integration
- [x] Threshold and result-count controls
- [x] Result tap to native detail
- [~] Full web-level explanation/admin analysis UX parity

## Content Modules
- [x] Native More hub
- [x] Native Exhibitions / Visit / Support / Donation modules
- [x] Quick actions linking into core native flows
- [~] Full copy/structure parity with final web content blocks

## Platform / Device
- [x] iPhone-only target
- [x] iOS 16+ compatibility build baseline
- [~] Full multi-version QA matrix (iOS 16/17/18 on multiple iPhone sizes)

## Remaining Priority Work
1. Complete edge-case parity tests (auth roles, failures, retries, empty data).
2. Close advanced admin workflow gaps vs web.
3. Finalize copy/layout parity for More content modules.
