
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const finishLoading = () => {
      if (mounted) setLoading(false);
    };

    const authSafetyTimer = window.setTimeout(() => {
      console.warn('Auth initialization timed out; showing login/app shell instead of blocking.');
      finishLoading();
    }, 6000);

    // Clear any old project storage keys on initialization
    const clearOldProjectData = () => {
      const oldProjectKeys = [
        'sb-legjisflxarazydqnztr-auth-token',
        'supabase.auth.token'
      ];
      
      oldProjectKeys.forEach(key => {
        try {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log('Cleared old project storage:', key);
          }
        } catch (error) {
          console.warn('Unable to clear legacy auth storage:', error);
        }
      });
    };
    
    clearOldProjectData();

    // CRITICAL: Set up auth state listener FIRST before getting session
    // This ensures OAuth callback tokens in URL hash are processed correctly
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);
        
        // For OAuth callbacks (SIGNED_IN with session), ensure we update state
        if (event === 'SIGNED_IN' && session) {
          console.log('OAuth/Login detected, setting session');
          setSession(session);
          setUser(session.user);
          finishLoading();
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
          finishLoading();
          return;
        }
        
        if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Token refreshed');
          setSession(session);
          setUser(session.user);
          return;
        }
        
        // For INITIAL_SESSION, let getInitialSession handle it
        if (event === 'INITIAL_SESSION') {
          setSession(session);
          setUser(session?.user ?? null);
          finishLoading();
        }
      }
    );

    const getInitialSession = async () => {
      try {
        // Check if there's a hash fragment (OAuth callback)
        const hasOAuthHash = window.location.hash.includes('access_token') || 
                            window.location.hash.includes('refresh_token');
        
        if (hasOAuthHash) {
          console.log('OAuth hash detected, waiting for auth state change...');
          window.setTimeout(async () => {
            if (!mounted) return;
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!mounted) return;
              setSession(session);
              setUser(session?.user ?? null);
            } catch (error) {
              console.error('OAuth fallback session check failed:', error);
            } finally {
              finishLoading();
            }
          }, 1500);
          return;
        }
        
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Session restore timed out')), 5000);
        });

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

        if (!mounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          setSession(null);
          setUser(null);
          finishLoading();
        } else if (session) {
          console.log('Initial session found:', session.user.id);
          setSession(session);
          setUser(session.user);
          finishLoading();
        } else {
          console.log('No initial session');
          finishLoading();
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (!mounted) return;
        setSession(null);
        setUser(null);
        finishLoading();
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      window.clearTimeout(authSafetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear all auth-related storage
      localStorage.removeItem('sb-ujbcolxawpzfjkjviwqw-auth-token');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
