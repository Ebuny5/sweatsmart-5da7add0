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
        <div className="relative">
          {/* Spinning gradient ring */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 animate-spin" 
               style={{ padding: "3px" }}>
            <div className="w-full h-full rounded-full bg-white" />
          </div>
          {/* Centre S logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-violet-600 font-black text-lg">S</span>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-purple-400">Loading SweatSmart…</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col">
        <Header isAuthenticated={authenticated} />
        <div className="flex flex-1 safe-area-left safe-area-right">
          {authenticated && !isMobile && <Sidebar />}
          <main className={`flex-1 ${isMobile ? "px-0 py-0 pb-20" : "container py-6"}`}>
            {children}
          </main>
        </div>
        {authenticated && isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
