
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // For mobile apps, if user is authenticated but lands on 404, redirect to dashboard
    if (user && location.pathname !== '/') {
      console.log("Authenticated user on 404, redirecting to dashboard");
      navigate("/home", { replace: true });
    }
  }, [location.pathname, user, navigate]);

  const handleGoHome = () => {
    if (user) {
      navigate("/home");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button onClick={handleGoHome} className="w-full">
            {user ? "Return to Home" : "Return to Home"}
          </Button>
          
          {user && (
            <Button 
              variant="outline" 
              onClick={() => navigate("/log-episode")}
              className="w-full"
            >
              Log New Episode
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span>HidroAlly</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
