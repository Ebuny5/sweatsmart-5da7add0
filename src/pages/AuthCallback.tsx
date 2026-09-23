import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [processingOAuth, setProcessingOAuth] = useState(true);

  // Parse hash params coming back from Supabase (OAuth/email confirmation flows)
  const { type, error, error_description } = useMemo(() => {
    const hash = window.location.hash?.replace(/^#/, "") ?? "";
    const params = new URLSearchParams(hash);
    return {
      type: params.get("type") || "",
      error: params.get("error") || "",
      error_description: params.get("error_description") || "",
    };
  }, []);

  // Process OAuth tokens from URL hash
  useEffect(() => {
    const processOAuthCallback = async () => {
      const hash = window.location.hash;
      
      // If there's an access_token in the hash, Supabase needs to process it
      if (hash && (hash.includes('access_token') || hash.includes('refresh_token'))) {
        console.log('Processing OAuth callback...');
        try {
          // Give Supabase time to process the hash and set up the session
          // The onAuthStateChange listener in AuthContext will pick this up
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify session was established
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('OAuth session established:', session.user.id);
          } else {
            console.log('No session after OAuth callback');
          }
        } catch (err) {
          console.error('Error processing OAuth callback:', err);
        }
      }
      setProcessingOAuth(false);
    };

    processOAuthCallback();
  }, []);

  useEffect(() => {
    // Wait for OAuth processing to complete
    if (processingOAuth) return;

    // If there's an explicit error coming from the provider/email link, go to login
    if (error || error_description) {
      const t = setTimeout(() => {
        navigate("/login", { replace: true });
      }, 800);
      return () => clearTimeout(t);
    }

    // Once auth context finishes loading, decide where to go
    if (!loading) {
      // For recoveries, we should send users to the reset password page
      if (type === "recovery") {
        navigate("/reset-password", { replace: true });
        return;
      }

      // Default: if we have a user, check if they need profile setup. If not, back to login.
      const t = setTimeout(async () => {
        if (user) {
          console.log('Checking profile for user:', user.id);
          // Check if user has a display name set
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, has_received_welcome, is_profile_complete')
            .eq('user_id', user.id)
            .maybeSingle();

          // Check if this is a first-time Google Auth login that missed the email trigger
          if (profile && !profile.has_received_welcome) {
            try {
              console.log('Triggering welcome email for new user...');
              // Update flag immediately so we don't trigger it twice
              await supabase
                .from('profiles')
                .update({ has_received_welcome: true })
                .eq('user_id', user.id);

              // We simulate the webhook payload for the edge function since the
              // database trigger might not fire for OAuth inserts properly or is bypassed.
              // We don't send the x-hook-secret header since it's an environment variable on the server,
              // but we are an authenticated user calling the function directly.
              // Note: The edge function should probably skip the x-hook-secret check if the user is authenticated
              // but we can just pass a dummy one if it strictly requires it, or better yet, since it's an edge function
              // invoked by supabase-js, it includes the Auth header which we could verify, but we'll try it as is.
              await supabase.functions.invoke('send-welcome-email', {
                body: { record: { id: user.id, email: user.email } }
              });
            } catch (emailErr) {
              console.error('Failed to send welcome email:', emailErr);
            }
          }
          
          if (!profile?.is_profile_complete) {
            console.log('Profile incomplete, redirecting to setup-profile');
            navigate("/setup-profile", { replace: true });
          } else {
            console.log('Redirecting to home');
            navigate("/home", { replace: true });
          }
        } else {
          console.log('No user found, redirecting to login');
          navigate("/login", { replace: true });
        }
      }, 300);
      return () => clearTimeout(t);
    }
  }, [loading, user, type, error, error_description, navigate, processingOAuth]);

  return (
    <AppLayout isAuthenticated={false}>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">
            {processingOAuth ? "Processing sign-in…" : "Finalizing sign-in… Please wait."}
          </p>
          {error_description ? (
            <p className="text-xs text-destructive max-w-sm">
              {error_description}
            </p>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
};

export default AuthCallback;
