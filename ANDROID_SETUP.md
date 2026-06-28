# Android Notification Setup (TWA)

To fix the "No permissions requested" issue on Android, you must complete the following steps:

## 1. Update Asset Links
The file `public/.well-known/assetlinks.json` contains a placeholder: `"REPLACE_WITH_YOUR_SHA256_FINGERPRINT"`.

You need to replace this with your actual **App Bundle Signature** from the Google Play Console:
1. Go to **Google Play Console**.
2. Select your app (`guru.sweatsmart.twa`).
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
5. Ensure the **Package ID** matches `guru.sweatsmart.twa`.
6. Ensure the **SHA-256 fingerprint** matches the one from Google Play Console.

## Why this is necessary
Android's Trusted Web Activity (TWA) requires a "Digital Asset Link" to verify that the website and the Android app are owned by the same person. Without this verification, Android will not allow the website to trigger native permission prompts or display notifications on the app's behalf.

Note: Your Play Console deep link must use `https://www.sweatsmart.guru`, not `https://sweatsmart.guru`, unless you disable the apex-to-www redirect in your domain host. Google Play's Android App Links verifier rejects redirects, and `https://sweatsmart.guru/.well-known/assetlinks.json` currently redirects to `https://www.sweatsmart.guru/.well-known/assetlinks.json`.

For the current setup, regenerate the Android package with:
- Launch URL: `https://www.sweatsmart.guru/`
- Host name / web link: `www.sweatsmart.guru`
- Package ID: `guru.sweatsmart.twa`
- SHA-256 fingerprint matching Play Console → App integrity → App signing key certificate
