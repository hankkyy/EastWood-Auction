# Eastwood iOS Regression Checklist

Target date: 2026-05-31  
Scope: iPhone, iOS 16 / 17 / 18 baseline

## 1. Auth & Session
- [ ] Cold launch with saved login restores session correctly.
- [ ] Expired token on any cloud action triggers sign-out and session-expired alert.
- [ ] Non-admin account never sees admin modules.
- [ ] Admin account sees admin modules and can open each page.

## 2. Catalog & Detail
- [ ] Home loads cloud artworks and pull-to-refresh updates.
- [ ] Collections/Shop/Cases filters work with query + category + period.
- [ ] Shop price range + for-sale toggles produce expected subsets.
- [ ] Detail page loads image/gallery/price/case metadata without crash.

## 3. Image Search
- [ ] Upload image -> search -> result list shows.
- [ ] Threshold and match count changes affect result set.
- [ ] No-match state shows guidance.
- [ ] Network failure shows retry and does not freeze UI.
- [ ] Insight card (brightness/contrast/sharpness) appears after image selection.

## 4. Favorites / Inquiry / Inbox
- [ ] Favorite add/remove is cloud-persistent after relaunch.
- [ ] Personal user can submit inquiry.
- [ ] Admin user is blocked from inquiry submission page.
- [ ] Inbox status transitions (pending/processed/archived) remain consistent.
- [ ] Archived inquiry cannot continue sending messages (server-enforced behavior verified).

## 5. Admin Flows
- [ ] Admin Artworks create/edit/delete works for product/collection/case records.
- [ ] Admin batch import validates malformed rows and blocks invalid import.
- [ ] Admin Inquiries single + batch status operations work.
- [ ] Admin Users list loads, role toggle works, delete flow works with confirmation.

## 6. Failure / Edge Cases
- [ ] Empty catalog state renders cleanly.
- [ ] Empty inbox state renders cleanly.
- [ ] Offline / flaky network shows errors without white/black dead screen.
- [ ] Pull-to-refresh remains responsive after failures.

