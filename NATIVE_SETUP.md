# HidroAlly — Android Native Setup

After running `npx cap add android` and `npx cap sync`, you **must** add these permissions
to `android/app/src/main/AndroidManifest.xml` for background notifications to work.

## AndroidManifest.xml — Required Permissions

Add these lines **inside the `<manifest>` tag**, before `<application>`:

```xml
<!-- Notifications (required on Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

<!-- Exact alarms — required for 6-hour reminders to fire when app is closed -->
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>

<!-- Wake device for reminders -->
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

<!-- Location (for climate alerts) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>

<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET"/>
```

## Important Notes

### Android 13+ (API 33+)
`SCHEDULE_EXACT_ALARM` requires the user to grant special permission from **Settings → Apps → HidroAlly → Alarms & reminders**.
The app will show a prompt guiding users to enable this.

### Android 12 (API 31–32)
`SCHEDULE_EXACT_ALARM` is automatically granted for apps targeting SDK 31.

### Battery Optimization
For notifications to reliably fire when the app is closed:
1. Open **Settings → Battery → Battery Optimization**
2. Find **HidroAlly** and set it to **"Don't optimize"**

The app requests this automatically on first launch, but users can also do it manually.

## Build Commands

```bash
# One-time setup
npm install
npm run build
npx cap add android      # creates android/ folder
npx cap sync             # copies web assets + plugins into native project

# Every time you pull new code from GitHub:
npm run build && npx cap sync

# Open in Android Studio to build/run:
npx cap open android
```

## iOS Setup

Add to `ios/App/App/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>HidroAlly uses your location to detect climate conditions that may trigger sweating episodes.</string>
<key>NSUserNotificationUsageDescription</key>
<string>HidroAlly sends reminders to log your episodes every 6 hours and alerts you to high sweat-risk conditions.</string>
```
