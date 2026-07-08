# iOS TestFlight Setup Checklist

Complete these in [Apple Developer](https://developer.apple.com/account) before the first production EAS build.

## App IDs

### Main app: `com.afghandev.ebadat`

Enable capabilities:
- App Groups → `group.com.afghandev.ebadat`
- Push Notifications
- Time Sensitive Notifications

### Widget extension: `com.afghandev.ebadat.EbadatPrayerWidget`

Register this App ID if it does not exist. Enable:
- App Groups → `group.com.afghandev.ebadat` (same group as main app)

## App Store Connect

Create app record:
- **Name:** عبادت
- **Bundle ID:** com.afghandev.ebadat
- **SKU:** ebadat-ios-001
- **Primary language:** Persian (fa)

After creation, note the numeric **Apple ID** (App Store Connect ID) for `eas.json` submit config.

## EAS credentials

```bash
npx eas-cli login
npx eas-cli credentials --platform ios
```

Ensure provisioning profiles cover both targets:
- com.afghandev.ebadat
- com.afghandev.ebadat.EbadatPrayerWidget

## Build and submit

```bash
npm run build:ios:production
npm run submit:ios
```

## After upload (App Store Connect)

For each TestFlight build:
1. Export compliance → No (uses standard encryption only)
2. App Privacy → Location (app functionality), no tracking
3. Age rating questionnaire
