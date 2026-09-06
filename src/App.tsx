import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EpisodesProvider } from "@/contexts/EpisodesContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import NotificationListener from "@/components/notifications/NotificationListener";
import Index from "./pages/Index";
import NewIndex from "./pages/NewIndex";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import LogEpisode from "./pages/LogEpisode";
import History from "./pages/History";
import EpisodeDetail from "./pages/EpisodeDetail";
import Profile from "./pages/Profile";
import Insights from "./pages/Insights";
import Community from "./pages/Community";
import Settings from "./pages/Settings";
import Achievements from "./pages/Achievements";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import PalmScanner from "./pages/PalmScanner";
import Home from "./pages/Home";
import Contact from "./pages/Contact";
import Feedback from "./pages/Feedback";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Cookies from "./pages/Cookies";
import Legal from "./pages/Legal";
import Survey from "./pages/Survey";
import ClimateMonitor from "./pages/ClimateMonitor";
import ClimateHistory from "./pages/ClimateHistory";
import HidroAlly from "./pages/HidroAlly";
import KnowledgeBaseAdmin from "./pages/KnowledgeBaseAdmin";
import SpecialistRadar from "./pages/SpecialistRadar";
import SetupProfile from "./pages/SetupProfile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount < 2) return true;
        return false;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

import MandatoryOnboarding from "./pages/MandatoryOnboarding";
import { useProfile } from "@/hooks/useProfile";

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading HidroAlly...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Enforce mandatory onboarding
  if (profile && !profile.is_profile_complete && location.pathname !== '/mandatory-onboarding' && location.pathname !== '/setup-profile') {
    return <Navigate to="/mandatory-onboarding" replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

// Public Route component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/home" replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

const AppRoutes = () => {
  const location = useLocation();
  return (
  <AnimatePresence mode="wait">
  <Routes location={location} key={location.pathname}>
    <Route path="/" element={<Index />} />
    <Route path="/old-blue" element={<PublicRoute><NewIndex /></PublicRoute>} />
    <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
    <Route path="/forgot-password" element={
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    } />
    <Route path="/reset-password" element={
      <ResetPassword />
    } />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/onboarding" element={
      <ProtectedRoute>
        <Onboarding />
      </ProtectedRoute>
    } />
    <Route path="/setup-profile" element={
      <ProtectedRoute>
        <SetupProfile />
      </ProtectedRoute>
    } />
    <Route path="/mandatory-onboarding" element={
      <ProtectedRoute>
        <MandatoryOnboarding />
      </ProtectedRoute>
    } />
    <Route path="/home" element={
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    } />
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } />
    <Route path="/log-episode" element={
      <ProtectedRoute>
        <LogEpisode />
      </ProtectedRoute>
    } />
    <Route path="/history" element={
      <ProtectedRoute>
        <History />
      </ProtectedRoute>
    } />
    <Route path="/episode/:id" element={
      <ProtectedRoute>
        <EpisodeDetail />
      </ProtectedRoute>
    } />
    <Route path="/profile" element={
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    } />
    <Route path="/insights" element={
      <ProtectedRoute>
        <Insights />
      </ProtectedRoute>
    } />
    <Route path="/community" element={
      <ProtectedRoute>
        <Community />
      </ProtectedRoute>
    } />
    <Route path="/settings" element={
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    } />
    <Route path="/achievements" element={
      <ProtectedRoute>
        <Achievements />
      </ProtectedRoute>
    } />
    <Route path="/palm-scanner" element={
      <ProtectedRoute>
        <PalmScanner />
      </ProtectedRoute>
    } />
    <Route path="/climate" element={
      <ProtectedRoute>
        <ClimateMonitor />
      </ProtectedRoute>
    } />
    <Route path="/climate/history" element={
      <ProtectedRoute>
        <ClimateHistory />
      </ProtectedRoute>
    } />
    <Route path="/climate/settings" element={<Navigate to="/settings" replace />} />
    <Route path="/hidro-ally" element={
      <ProtectedRoute>
        <HidroAlly />
      </ProtectedRoute>
    } />
    <Route path="/knowledge-admin" element={
      <ProtectedRoute>
        <KnowledgeBaseAdmin />
      </ProtectedRoute>
    } />
    <Route path="/specialist-radar" element={
      <ProtectedRoute>
        <SpecialistRadar />
      </ProtectedRoute>
    } />
    <Route path="/contact" element={<Contact />} />
    <Route path="/feedback" element={<Feedback />} />
    <Route path="/faqs" element={<FAQ />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/about" element={<About />} />
    <Route path="/cookies" element={<Cookies />} />
    <Route path="/legal" element={<Legal />} />
    <Route path="/survey" element={<Survey />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
  </AnimatePresence>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EpisodesProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <NotificationListener />
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </EpisodesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
