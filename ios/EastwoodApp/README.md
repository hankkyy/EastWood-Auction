# Eastwood iOS (SwiftUI)

This folder contains a SwiftUI iOS shell app that wraps the existing Eastwood web app with WKWebView, so the app behavior remains aligned with the website while reusing cloud persistence from the existing backend (Supabase and current APIs).

## 1) Production URL

Edit `EastwoodApp/AppConfig.swift`:

```swift
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

## 3) App Store readiness checklist

- Set real bundle id and signing team in Xcode
- Replace app icon set in `Assets.xcassets/AppIcon.appiconset`
- Ensure production domain uses HTTPS and stable TLS
- Verify website mobile UX for iPhone viewport
- Add privacy labels in App Store Connect (data collected/tracking)
- Provide review account if some pages require login
- Fill `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` text with final product wording

Detailed release steps: see `APP_STORE_RELEASE_GUIDE.md`.

## 4) Push notification payload format

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

## 5) Device token auto-sync (Supabase)

The app now auto-syncs APNs device token to your backend API after user login in WebView.

Backend endpoint:
- `POST /api/mobile/device-token`

Database migration to run:
- `supabase/create-device-push-tokens-table.sql`

Optional production security:
- set `MOBILE_APP_API_SECRET` on your web deployment
- set `mobileApiSecret` in `EastwoodApp/AppConfig.swift` to the same value

## Notes

- This approach preserves one source of truth for data and business logic.
- For long-term native evolution (performance, offline, APNs, Apple Pay, biometric login), we can progressively replace specific web pages with native SwiftUI screens while keeping the same backend.
