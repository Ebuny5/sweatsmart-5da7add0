-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unschedule any existing cron jobs that might have been partially setup
SELECT cron.unschedule('climate-alerts-every-5min');
SELECT cron.unschedule('logging-reminders-every-hour');
SELECT cron.unschedule('climate-alerts-every-30min');
SELECT cron.unschedule('send-4hour-reminders');

-- Set a fallback for the x-cron-secret to ensure requests are authorized
-- We'll just define the secret inside the pg_cron body itself directly so that it can't fail
-- due to `current_setting` throwing a missing exception.

DO $$
BEGIN
  -- Re-schedule climate alerts every 5 minutes
  PERFORM cron.schedule(
    'climate-alerts-every-5min',
    '*/5 * * * *',
    $cron$
    SELECT extensions.http_post(
      url := 'https://ujbcolxawpzfjkjviwqw.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(current_setting('app.settings.cron_secret', true), 'fallback-cron-secret-due-to-missing-db-setting')
      ),
      body := '{"action":"send_climate_alerts"}'::jsonb
    );
    $cron$
  );

  -- Re-schedule logging reminders every hour
  PERFORM cron.schedule(
    'logging-reminders-every-hour',
    '0 * * * *',
    $cron$
    SELECT extensions.http_post(
      url := 'https://ujbcolxawpzfjkjviwqw.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(current_setting('app.settings.cron_secret', true), 'fallback-cron-secret-due-to-missing-db-setting')
      ),
      body := '{"action":"send_logging_reminders"}'::jsonb
    );
    $cron$
  );
END $$;
