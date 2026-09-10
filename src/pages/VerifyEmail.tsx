import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MailCheck } from "lucide-react";

const VerifyEmail = () => {
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const email = location.state?.email || new URLSearchParams(location.search).get("email");

  useEffect(() => {
    // If someone visits this page directly without an email in state, redirect to login
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) return;
    if (cooldown > 0) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        toast({
          title: "Failed to resend",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setCooldown(60);
        toast({
          title: "Link sent!",
          description: "A new verification link has been sent to your email.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

  return (
    <AppLayout isAuthenticated={false}>
      <div className="flex justify-center items-center min-h-screen bg-[#E9E4FA]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full text-center">
          <div className="mx-auto w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-4">
            <MailCheck className="w-6 h-6" />
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Check your inbox, Warrior!</h1>
          </div>
          <div className="space-y-4 mt-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              We've sent an activation link to <strong className="text-gray-900 dark:text-gray-100">{email}</strong>.
              Tap the link to verify your account and start personalizing your insights.
            </p>
            <div>
              <Link to="/register" className="text-xs text-violet-500 hover:text-violet-600 hover:underline">
                Wrong email address? Change address
              </Link>
            </div>
          </div>
          <div className="flex flex-col space-y-4 pt-6 mt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="text-sm text-muted-foreground">
              Can't find it? Check your spam or promotions folder, or{" "}
              <button
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                className="text-primary hover:underline font-medium disabled:opacity-50"
              >
                {isResending ? "resending..." : cooldown > 0 ? `resend available in ${cooldown}s` : "resend the link"}
              </button>.
            </div>
            <div className="pt-4">
              <Link to="/login" className="text-primary text-sm hover:underline font-medium">
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default VerifyEmail;
