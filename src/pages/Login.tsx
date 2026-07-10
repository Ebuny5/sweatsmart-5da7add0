
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

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithGoogle, isLoading: googleLoading } = useGoogleAuth();

  const checkProfileDisplayName = async (userId: string): Promise<string | null> => {
    const profileRequest = supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const timeout = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), 3500);
    });

    try {
      const result = await Promise.race([profileRequest, timeout]);
      if (!result || result.error) return null;
      return result.data?.display_name ?? null;
    } catch {
      return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const displayName = await checkProfileDisplayName(data.user.id);

        if (!displayName) {
          navigate("/setup-profile");
        } else {
          toast({
            title: "Login successful",
            description: "Welcome back to SweatSmart!",
          });
          navigate("/home");
        }
      }
    } catch (error) {
      toast({
        title: "Login failed",
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
            <CardTitle className="text-2xl font-bold">Login</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
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
                  onClick={(e) => { e.preventDefault(); document.getElementById("email")?.focus(); }}
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

            <form onSubmit={handleLogin} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Captcha onVerify={setCaptchaVerified} />
              
              <Button 
                type="submit" 
                className="w-full bg-[#D6CEFA] text-violet-800 hover:brightness-105 font-bold py-5 rounded-lg text-base"
                disabled={isLoading || !captchaVerified}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 mt-auto">
            <div className="text-center text-sm w-full">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Sign up
              </Link>
            </div>
            <div className="text-center text-xs text-muted-foreground pt-4 border-t w-full">
              BY LOGGING IN, YOU AGREE TO OUR{" "}
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

export default Login;
