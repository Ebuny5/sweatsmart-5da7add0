-- Native (Capacitor Android/iOS) push delivery.
--
-- Native devices are stored in push_subscriptions alongside web push endpoints so
-- the existing reminder/climate cron logic (quiet hours, cooldowns, daily limits,
-- thresholds, per-device notification_log) applies to them without duplicating it.
--
-- Web rows keep using endpoint + p256dh + auth.
-- Native rows use endpoint = 'native:<platform>:<fcm-token>' and device_token.

-- Web-only columns must be optional for native rows.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth DROP NOT NULL;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS device_token text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_token
  ON public.push_subscriptions (device_token)
  WHERE device_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_kind
  ON public.push_subscriptions (kind);

-- A device token can legitimately be re-bound to a different account on the same
-- phone (sign out -> sign in as someone else). The token itself is the credential:
-- only the device holding it can present it, and it is never exposed to the web
-- client. Existing web rows (device_token IS NULL) keep their stricter policies.
DROP POLICY IF EXISTS "Authenticated devices can rebind native rows" ON public.push_subscriptions;
CREATE POLICY "Authenticated devices can rebind native rows"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() IS NOT NULL AND device_token IS NOT NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Authenticated devices can delete native rows" ON public.push_subscriptions;
CREATE POLICY "Authenticated devices can delete native rows"
  ON public.push_subscriptions FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND device_token IS NOT NULL
    AND (user_id = auth.uid() OR user_id IS NULL)
  );
