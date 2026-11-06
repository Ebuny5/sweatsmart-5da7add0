# HidroAlly — Closed-App Notifications & App Updates

This document covers the native (Capacitor) notification path and the in-app
update prompt. The web app's existing Web Push path is untouched.

## Why notifications only arrived while the app was open

The app shipped two separate notification paths:

| Path | Works | Closed-app delivery |
| --- | --- | --- |
| Web Push (`WebPushService` + `public/sw.js`, VAPID) | Web/PWA only | Yes, on the web |
| Capacitor `LocalNotifications` | Android/iOS | Only if a notification was already scheduled while the app was open |

Inside the Capacitor shell there is no `PushManager` and no service-worker `push`
event, so **no Web Push subscription is ever created** — the `send-push-notification`
edge function had no endpoint for the phone. In addition, the native build called
`PushNotifications.register()` but never listened for the returned FCM/APNs device
token, so the token was discarded and never reached the database.

Reminders that fired "in the app" came from the client-side timer / local
notification scheduler, which is why they stopped when the app was closed.

## What the code now does

1. **`src/services/NativePushService.ts`** (new)
   - Requests the OS permission, calls `PushNotifications.register()`, listens for
     the `registration` token and stores it in `public.push_subscriptions` as a
     native row (`kind = 'android' | 'ios'`, `device_token = <token>`,
     `endpoint = 'native:<platform>:<token>'`).
   - Re-syncs the row (signed-in user, cached location, app version, last seen) on
     login, on foreground, and every 30 minutes.
   - Shows foreground pushes as a local notification (Android does not display FCM
     notifications while the app is in the foreground) and routes taps to the SPA.
   - Deletes the device row on sign-out so the next account on the phone does not
     inherit the previous user's reminders.

2. **Native rows use the same table as Web Push**, so the existing cron logic —
   quiet hours, 8-hour reminder spacing, daily caps, climate cooldowns, custom
   thresholds, `notification_log` — applies to phones with no duplicated rules.

3. **`supabase/functions/send-push-notification/index.ts`** now dispatches per row:
   `deliverPush()` sends Web Push for `p256dh`/`auth` rows and **FCM HTTP v1** for
   rows with `device_token`. Dead/rotated tokens (`UNREGISTERED` /
   `INVALID_ARGUMENT`) are deleted automatically.
   A new `send_broadcast` action (service-role or `x-cron-secret` only) pushes a
   message to every device — used for "new version available" announcements.

4. **Update prompt** — `src/services/AppUpdateService.ts` +
   `src/components/AppUpdatePrompt.tsx` compare the installed build version with
   `https://www.hidroally.space/app-version.json` and show an "Update available" /
   "Update required" card that opens the store listing.

## 1. Firebase setup (required once)

1. Create a Firebase project (or reuse one) and add an **Android app** with package
   name `guru.sweatsmart.twa` (must match `capacitor.config.ts`).
2. Download `google-services.json` and place it at `android/app/google-services.json`.
3. In `android/build.gradle` add the plugin classpath:

   ```gradle
   classpath 'com.google.gms:google-services:4.4.2'
   ```

   and in `android/app/build.gradle` apply it at the bottom of the file:

   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

4. `npx cap sync android`, then build/upload a new AAB to the closed testing track.
5. iOS (only if you ship iOS): add the iOS app in Firebase, upload your **APNs
   authentication key** in Firebase → Project settings → Cloud Messaging, and enable
   the *Push Notifications* capability + *Background Modes → Remote notifications*
   in Xcode.

> The Android notification channels (`reminder`, `climate`) are already created by
> `NativeNotificationBridge.ensureNativeChannels()`; FCM targets those channel ids.

## 2. Backend setup (required once)

Apply the migration:

```bash
npx supabase db push          # or paste the SQL in the dashboard SQL editor
```

It is `supabase/migrations/20261106090000_native_push_delivery.sql` (adds
`kind/platform/device_token/app_version/last_seen_at`, makes `p256dh`/`auth`
nullable, adds native rebind/delete policies).

Create a service account for FCM and store it as a function secret:

1. Firebase console → Project settings → **Service accounts** → *Generate new private key*.
2. Save the JSON **as a Supabase secret** (never commit it):

   ```bash
   npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
   ```

   `FIREBASE_SERVICE_ACCOUNT_JSON` is accepted as an alias.

3. Deploy the function:

   ```bash
   npx supabase functions deploy send-push-notification
   ```

Without the secret the function still serves Web Push normally; native rows return
`fcm_not_configured` and are skipped.

## 3. Verify on a device

1. Install the new build, sign in, accept the notification permission.
2. Confirm the device row exists:

   ```sql
   select kind, platform, endpoint, user_id, is_active, app_version, last_seen_at
   from push_subscriptions
   where device_token is not null;
   ```

3. Send a push to that device (signed-in user token, `send_to_user`):

   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/send-push-notification" \
     -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action":"send_to_user","userId":"<user-uuid>","notification":{"title":"Closed-app test","body":"If you see this with the app closed, native push works.","url":"/home"}}'
   ```

4. **Force-stop the app** (swipe it away / Settings → Force stop) and repeat step 3.
   The notification must arrive with the app closed.
5. The reminders climate cron already runs every hour / 5 minutes and now covers
   native rows — no extra cron is required.

## 4. Announcing a new version

Two independent mechanisms, both needed:

- **In-app prompt**: after you publish a new AAB, update
  `public/app-version.json` (deployed with the website):

  ```json
  {
    "latestVersion": "1.0.1",
    "minSupportedVersion": "1.0.0",
    "storeUrl": "https://play.google.com/store/apps/details?id=guru.sweatsmart.twa",
    "notes": "Faster climate alerts and notification fixes.",
    "publishedAt": "2026-11-20"
  }
  ```

  `minSupportedVersion` makes the prompt non-dismissible (use sparingly).

- **Push announcement** to every device (web + native):

  ```bash
  curl -X POST "$SUPABASE_URL/functions/v1/send-push-notification" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"action":"send_broadcast","notification":{"title":"HidroAlly 1.0.1 is out","body":"Open the app and tap Update to get the notification fixes.","url":"/"}}'
  ```

  Add `"platform":"android"` to target phones only.

### Honest limitation

A closed app cannot be forced to self-update, and Play Store update notifications
are controlled by Google/Play, not the app. The practical flow is: Play auto-update
(if the user enabled it), the broadcast push above telling users an update exists,
and the in-app prompt with a direct store link when they open the app.

## 5. Important: the native app loads bundled assets

`capacitor.config.ts` does not set `server.url`, so the shell loads `dist/` from the
APK. **This code only reaches testers in a new native build** (`npm run build &&
npx cap sync android` → new AAB → closed testing). Updating the website alone does
not update the installed app.

## Files touched

- `src/services/NativePushService.ts` (new)
- `src/services/AppUpdateService.ts` (new)
- `src/components/AppUpdatePrompt.tsx` (new)
- `src/components/notifications/NotificationListener.tsx` (wires the two services in)
- `src/contexts/AuthContext.tsx` (clears the device binding on sign-out)
- `src/App.tsx` (renders the update prompt)
- `src/integrations/supabase/types.ts` (new push_subscriptions columns)
- `supabase/functions/send-push-notification/index.ts` (FCM transport + broadcast)
- `supabase/migrations/20261106090000_native_push_delivery.sql` (new)
- `public/app-version.json` (new)
