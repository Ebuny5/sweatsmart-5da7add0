import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, isAuthenticated }) => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const authenticated = isAuthenticated ?? !!user;

  if (loading && isAuthenticated !== false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="relative flex items-center justify-center">
          {/* Pulsing ambient glow back-layer */}
          <div className="absolute w-20 h-20 bg-purple-400/30 rounded-full blur-xl animate-pulse" />
          {/* Animated glowing logo */}
          <img
            src="/sweatsmart-logo.png"
            alt="HidroAlly Loading"
            className="w-16 h-16 relative z-10 animate-bounce duration-1000 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]"
          />
        </div>
        <p className="mt-4 text-sm font-semibold text-purple-600 tracking-wide animate-pulse">Loading HidroAlly...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-[100vw] overflow-x-hidden flex-col">
        <Header isAuthenticated={authenticated} />
        <div className="flex flex-1 w-full max-w-[100vw] overflow-x-hidden safe-area-left safe-area-right">
          {authenticated && !isMobile && <Sidebar />}
          <main className={`flex-1 w-full max-w-[100vw] overflow-x-hidden ${isMobile ? "px-0 py-0 pb-20" : "container py-6"}`}>
            {children}
          </main>
        </div>
        {authenticated && isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
