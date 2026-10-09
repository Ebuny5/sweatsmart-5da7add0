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

Note: Both `https://hidroally.space` and `https://www.hidroally.space` are now configured to serve `assetlinks.json` directly without redirects, ensuring compatibility with Google Play's Android App Links verifier.

For the current setup, regenerate the Android package with:
- Launch URL: `https://www.hidroally.space/`
- Host name / web link: `www.hidroally.space` (or `hidroally.space`)
- Package ID: `guru.sweatsmart.twa`
- SHA-256 fingerprint matching Play Console → App integrity → App signing key certificate

## 3. Resolving "Item Not Found" in Closed Testing

If testers encounter "Item not found" when trying to install or update the app on Google Play:

1. **Verify Tester Eligibility**:
   - Go to **Google Play Console** -> **Testing** -> **Closed testing**.
   - Select your active track and open the **Testers** tab.
   - Confirm that the tester's Google account email address is included in the email list.

2. **Send the Web Opt-in URL**:
   - On the same **Testers** tab in Play Console, scroll down to **How testers join your test**.
   - Copy the **Web Opt-in Link** (e.g., `https://play.google.com/apps/testing/guru.sweatsmart.twa`).
   - Send this link to your testers.

3. **Opt-in Procedure**:
   - Testers **must** open the Web Opt-in link in a browser, sign in with their registered Google account, and click **"Become a Tester"** or **"Accept Invitation"**.
   - After opting in, they can click the **"download it on Google Play"** link on that page. Opening Google Play Store without opting in first will result in the "Item not found" error screen.

## 4. Removing Legacy Domain (`sweatsmart.guru`) & Re-verifying Deep Links

To clean up failed domain checks in Google Play Console:

1. **Remove `sweatsmart.guru`**:
   - Open **Google Play Console** -> **Grow** / **Deep links**.
   - Under the **Domains** section, locate `sweatsmart.guru`.
   - Click the options menu or arrow next to `sweatsmart.guru` and select **Delete / Remove domain**.
   - Save changes.

2. **Re-check `hidroally.space` & `www.hidroally.space`**:
   - Both `https://hidroally.space/.well-known/assetlinks.json` and `https://www.hidroally.space/.well-known/assetlinks.json` are served directly with JSON content headers and no redirects.
   - In **Google Play Console** -> **Deep links** -> **Domains**, click **Re-check domain checks** for `hidroally.space`.
