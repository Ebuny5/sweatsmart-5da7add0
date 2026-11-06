# iOS Setup Instructions

To ensure your native iOS app has the correct permissions and functionality, update your `ios/App/App/Info.plist` with the following keys:

## 1. Location Permissions
Used for local climate and heat risk alerts.

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Used for local climate/heat risk alerts.</string>
```

## 2. Microphone Permissions
Used for voice logging functionality.

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Used for voice logging.</string>
```

## 3. General Native Sync
After making any code changes in Lovable and pulling them to your local machine, always run:

```bash
npm run build
npx cap sync
```

Then, you can open the project in Xcode:

```bash
npx cap open ios
```
