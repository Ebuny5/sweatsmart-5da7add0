
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AppLayout from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase, PASSWORD_RESET_REDIRECT_TO } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Shield, CheckCircle, Info } from "lucide-react";
import Captcha from "@/components/ui/captcha";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      toast({
        title: "Verification required",
        description: "Please complete the captcha verification.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: PASSWORD_RESET_REDIRECT_TO,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Reset email sent",
          description: "Check your email for password reset instructions.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AppLayout isAuthenticated={false}>
        <div className="flex justify-center items-center min-h-screen bg-[#E9E4FA]">
          <Card className="w-full max-w-md bg-[#E9E4FA]">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Password reset email sent</CardTitle>
              <CardDescription>
                We've sent password reset instructions to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Next steps:</strong> Look for an email from SweatSmart with a "Reset Password" button or link. 
                  Click it to safely reset your password.
                </AlertDescription>
              </Alert>

              <Alert className="border-yellow-200 bg-yellow-50">
                <Shield className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Can't find the email?</strong> Check your spam or junk folder. 
                  Some email providers automatically filter automated emails.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Look for an email from SweatSmart
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Click the "Reset Password" button in the email
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Enter your new password when prompted
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button asChild className="w-full">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout isAuthenticated={false}>
      <div className="flex justify-center items-center min-h-screen bg-[#E9E4FA]">
        <Card className="w-full max-w-md bg-[#E9E4FA]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a secure reset link
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  We'll send you a secure email with instructions to reset your password. 
                  The link will be safe and valid for 24 hours.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Captcha onVerify={setCaptchaVerified} />
              
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !captchaVerified}
              >
                {isLoading ? "Sending..." : "Send reset email"}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ForgotPassword;
