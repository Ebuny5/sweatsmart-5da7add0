import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AppLayout from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { supabase } from "@/integrations/supabase/client";
import { Chrome, Mail } from "lucide-react";
import Captcha from "@/components/ui/captcha";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithGoogle, isLoading: googleLoading } = useGoogleAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (!error && data?.user?.identities?.length === 0) {
        toast({
          title: "Account already exists",
          description: "An account with this email already exists. Please login instead.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        navigate("/verify-email", { state: { email } });
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <AppLayout isAuthenticated={false}>
      <div className="flex justify-center items-center min-h-[calc(100vh-100px)] bg-[#E9E4FA] p-4">
        <Card className="w-full max-w-md bg-white border-0 shadow-lg relative pb-6">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Sign up to start tracking and managing your symptoms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
              <div className="space-y-3">
                <Button
                  className="w-full bg-black text-white hover:bg-black/90 py-5 rounded-lg flex justify-center items-center font-semibold"
                  onClick={signInWithGoogle}
                  disabled={googleLoading}
                >
                  <Chrome className="mr-2 h-5 w-5" />
                  {googleLoading ? "Connecting..." : "Continue with Google"}
                </Button>

                <Button
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 py-5 rounded-lg flex justify-center items-center font-semibold"
                  onClick={(e) => { e.preventDefault(); document.getElementById("name")?.focus(); }}
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Continue with email
                </Button>
              </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordStrengthIndicator password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Captcha onVerify={setCaptchaVerified} />

              <Button 
                type="submit" 
                className="w-full bg-[#D6CEFA] text-violet-800 hover:brightness-105 font-bold py-5 rounded-lg text-base"
                disabled={isLoading || !captchaVerified}
              >
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 mt-auto">
            <div className="text-center text-sm w-full">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Login
              </Link>
            </div>
            <div className="text-center text-xs text-muted-foreground pt-4 border-t w-full">
              BY SIGNING UP, YOU AGREE TO OUR{" "}
              <Link to="/terms" className="underline hover:text-primary transition-colors">
                TERMS OF SERVICE
              </Link>{" "}
              AND{" "}
              <Link to="/privacy" className="underline hover:text-primary transition-colors">
                PRIVACY POLICY
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Register;
