
-- 1. Tighten anonymous push_subscriptions SELECT to require matching endpoint header (parity with UPDATE/DELETE)
DROP POLICY IF EXISTS "Allow anonymous subscriptions by endpoint" ON public.push_subscriptions;
CREATE POLICY "Allow anonymous subscriptions by endpoint"
  ON public.push_subscriptions
  FOR SELECT
  USING (
    user_id IS NULL
    AND endpoint = current_setting('request.header.x-subscription-endpoint', true)
  );

-- 2. specialist_reviews: hide reviewer user_id from anonymous public; allow authenticated to read
DROP POLICY IF EXISTS "Warriors read all reviews" ON public.specialist_reviews;
CREATE POLICY "Authenticated users read reviews"
  ON public.specialist_reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. notification_log: allow users to read their own log entries
CREATE POLICY "Users can view own notification log"
  ON public.notification_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Lock down SECURITY DEFINER functions: set search_path and revoke EXECUTE from anon/authenticated where not needed.
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.keep_alive() SET search_path = public;
ALTER FUNCTION public.increment_notification_count(uuid, text) SET search_path = public;
ALTER FUNCTION public.search_knowledge_base(vector, integer, text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.keep_alive() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_notification_count(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.search_knowledge_base(vector, integer, text) FROM anon, authenticated, public;
