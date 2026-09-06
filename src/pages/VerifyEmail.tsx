import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const [isResending, setIsResending] = useState(false);
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

  const handleResend = async () => {
    if (!email) return;

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
        <Card className="w-full max-w-md bg-[#E9E4FA] text-center border-none shadow-none">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl font-bold">You're almost there, Warrior 💧</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Please verify your email to activate your account before logging in.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-4">
            <div className="text-sm text-muted-foreground">
              Can't find it? Check your spam or promotions folder, or{" "}
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-primary hover:underline font-medium disabled:opacity-50"
              >
                {isResending ? "resending..." : "resend the link"}
              </button>.
            </div>
            <div className="pt-4">
              <Link to="/login" className="text-primary text-sm hover:underline font-medium">
                Return to Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
};

export default VerifyEmail;
