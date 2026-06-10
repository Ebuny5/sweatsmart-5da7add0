# Android Notification Setup (TWA)

To fix the "No permissions requested" issue on Android, you must complete the following steps:

## 1. Update Asset Links
The file `public/.well-known/assetlinks.json` contains a placeholder: `"REPLACE_WITH_YOUR_SHA256_FINGERPRINT"`.

You need to replace this with your actual **App Bundle Signature** from the Google Play Console:
1. Go to **Google Play Console**.
2. Select your app (`com.giftovate.sweatsmart`).
3. Go to **Setup** -> **App integrity**.
4. Go to the **App signing** tab.
5. Copy the **SHA-256 certificate fingerprint**.
6. Paste it into `public/.well-known/assetlinks.json`.

## 2. Re-generate Android App with PWA Builder
When you generate your APK/AAB on [pwabuilder.com](https://www.pwabuilder.com):
1. Enter your URL.
2. Click **Package for Store** -> **Android**.
3. Click **Options**.
4. Ensure **Notification Delegation** is enabled.
5. Ensure the **Package ID** matches `com.giftovate.sweatsmart`.
6. Ensure the **SHA-256 fingerprint** matches the one from Google Play Console.

## Why this is necessary
Android's Trusted Web Activity (TWA) requires a "Digital Asset Link" to verify that the website and the Android app are owned by the same person. Without this verification, Android will not allow the website to trigger native permission prompts or display notifications on the app's behalf.
