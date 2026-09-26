CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- Function to trigger welcome email
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  -- Check if email_confirmed_at is being updated from NULL to a timestamp
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN

    -- In a production environment, webhooks should be configured via the Supabase Dashboard.
    -- If using pg_net in SQL, we must retrieve secrets securely from Supabase Vault
    -- to prevent hardcoding them in version control.

    -- Attempt to get URL and Key from vault (assuming they are stored as 'project_url' and 'service_role_key')
    -- If they don't exist in the vault, the request will fail gracefully without exposing secrets.
    BEGIN
      SELECT secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
      SELECT secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    EXCEPTION WHEN OTHERS THEN
      -- Vault extension might not be enabled, fallback to null
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
          'record', row_to_json(NEW)
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();
