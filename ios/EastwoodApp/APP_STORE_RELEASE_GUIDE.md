# Eastwood iOS App Store Release Guide

## 1. One-time setup in Apple Developer

1. Create App ID: `com.eastwood.app` (or your final bundle id).
2. Enable required capabilities only (avoid unnecessary ones at first release).
3. For push notifications, enable `Push Notifications` capability for this App ID.
4. Create the app record in App Store Connect.

## 2. Local project setup

1. Generate project:
```bash
cd ios/EastwoodApp
xcodegen generate
open EastwoodApp.xcodeproj
```
2. In Xcode `Signing & Capabilities`:
- Select your Team
- Set unique Bundle Identifier
- Confirm automatic signing works

## 3. Pre-submit checks

1. `AppConfig.swift` must point to your production HTTPS domain.
2. Upload a real 1024x1024 icon into `Assets.xcassets/AppIcon.appiconset`.
3. Validate core flows on real device:
- open app / load home
- login
- browse/search
- image upload from photo library
- submit inquiry
4. Confirm website does not require unsupported browser APIs in WKWebView.
5. If testing push, make sure APNs auth key/certificate is configured in your notification provider.

## 4. Archive and upload

1. In Xcode choose `Any iOS Device (arm64)`.
2. `Product -> Archive`.
3. In Organizer click `Distribute App -> App Store Connect -> Upload`.
4. Wait for processing in App Store Connect (usually 5-30 mins).

## 5. App Store Connect metadata

1. Privacy labels must match actual data behavior (from your web backend).
2. Add review notes:
- test account (if login required)
- where to find key features
- that content is hosted by your official service
3. Upload screenshots for required device sizes.

## 6. First submission strategy

1. Submit to TestFlight internal testers first.
2. Fix crashes/review feedback quickly.
3. Then submit for App Review.

## High-risk review pitfalls for web-wrapper apps

1. App feels like just a browser tab with no app value.
2. Broken mobile layout or slow loading.
3. Login blocked for reviewer and no demo credentials provided.
4. Missing or incorrect privacy disclosure.

## Recommended near-term native enhancements

1. Native saved favorites cache.
2. Native Face ID/Touch ID session lock.
3. Partial native screens for core browsing to improve review confidence.
