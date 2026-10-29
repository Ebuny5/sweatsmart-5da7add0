-- Ensure has_received_welcome column exists on public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_received_welcome BOOLEAN DEFAULT FALSE;

-- Update trigger function to send payload format supporting both 'email' and 'record'
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  -- Check if email_confirmed_at is being updated from NULL to a timestamp
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) OR (TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL) THEN

    BEGIN
      SELECT secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
      SELECT secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    EXCEPTION WHEN OTHERS THEN
      project_url := NULL;
      service_key := NULL;
    END;

    IF project_url IS NOT NULL AND service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := project_url || '/functions/v1/send-welcome-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'email', NEW.email,
          'record', row_to_json(NEW)
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retroactively trigger welcome emails for all confirmed users who haven't received welcome emails
CREATE OR REPLACE FUNCTION public.retroactive_send_welcome_emails()
RETURNS text AS $$
DECLARE
  project_url text;
  service_key text;
  user_record RECORD;
  sent_count integer := 0;
BEGIN
  BEGIN
    SELECT secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  EXCEPTION WHEN OTHERS THEN
    project_url := NULL;
    service_key := NULL;
  END;

  IF project_url IS NULL OR service_key IS NULL THEN
    RETURN 'Vault secrets project_url or service_role_key missing';
  END IF;

  FOR user_record IN
    SELECT u.id, u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.user_id
    WHERE u.email_confirmed_at IS NOT NULL
      AND (p.has_received_welcome IS NOT TRUE OR p.has_received_welcome IS NULL)
  LOOP
    PERFORM net.http_post(
      url := project_url || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'email', user_record.email,
        'record', jsonb_build_object('id', user_record.id, 'email', user_record.email)
      )
    );

    UPDATE public.profiles
    SET has_received_welcome = TRUE
    WHERE user_id = user_record.id;

    sent_count := sent_count + 1;
  END LOOP;

  RETURN 'Triggered welcome emails for ' || sent_count || ' users';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
