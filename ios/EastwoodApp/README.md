# Eastwood iOS (SwiftUI)

This folder contains the SwiftUI native iOS app for Eastwood Auction.  
The app is no longer a simple web shell: core user and admin flows are implemented as native SwiftUI modules and use the same cloud backend (Supabase + existing APIs) for persistence.

## 1) Backend / Production URL

Edit `EastwoodApp/AppConfig.swift`:

```swift
static let apiBaseURLString = "https://eastwoodauction.vercel.app"
static let webAppURLString = "https://eastwoodauction.vercel.app/"
static let allowedHostSuffixes = ["eastwoodauction.vercel.app"]
```

The repository is already configured with this domain.

## 2) Generate Xcode project

This setup uses XcodeGen:

```bash
brew install xcodegen
cd ios/EastwoodApp
xcodegen generate
```

Then open:

```bash
open EastwoodApp.xcodeproj
```

## 3) Native coverage snapshot

- Native tabs: Home / Collections / Shop / Cases / Image Search / More / Profile
- Native details and search flows
- Native inquiry form and inbox messaging
- Native favorites synced to cloud
- Native admin: artworks / inquiries / users
- Shared design system: theme, buttons, motion, skeleton loading

## 4) App Store readiness checklist

- Set real bundle id and signing team in Xcode
- Verify app icon and launch assets
- Add privacy labels in App Store Connect (data collected/tracking)
- Provide review account if app content requires login
- Finalize permission copy for camera/photo library usage
- Run regression on target iOS versions and multiple iPhone sizes

Detailed release steps: see `APP_STORE_RELEASE_GUIDE.md`.

## 5) Push notification payload format

When sending APNs payloads from your backend, include a deep link URL in `url`:

```json
{
  "aps": {
    "alert": {
      "title": "Eastwood",
      "body": "You have a new inquiry update."
    },
    "sound": "default"
  },
  "url": "https://eastwoodauction.vercel.app/inbox"
}
```

## 6) Device token auto-sync (Supabase)

The app now auto-syncs APNs device token to your backend API after user login in WebView.

Backend endpoint:
- `POST /api/mobile/device-token`

Database migration to run:
- `supabase/create-device-push-tokens-table.sql`

Optional production security:
- set `MOBILE_APP_API_SECRET` on your web deployment
- set `mobileApiSecret` in `EastwoodApp/AppConfig.swift` to the same value

## Notes

- Data source of truth remains cloud-first (Supabase and existing APIs).
- Ongoing work should focus on parity details (admin edge cases, fallback UX, and full multi-version regression).
