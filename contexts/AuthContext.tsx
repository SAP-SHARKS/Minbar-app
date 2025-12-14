import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  loginMessage: string;
  setLoginMessage: (message: string) => void;
  requireAuth: (message: string, callback: () => void) => void;
  pendingAction: (() => void) | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  
  // Pending Action State (for executing actions after login)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // If user just signed in and there's a pending action, execute it
        if (session?.user && pendingAction) {
          pendingAction();
          setPendingAction(null); // Clear after execution
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [pendingAction]);

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) console.error('Error signing in:', error);
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    setUser(null);
    setSession(null);
  };

  // Gate function - shows login modal if not authenticated
  const requireAuth = (message: string, callback: () => void) => {
    if (user) {
      // User is logged in, execute immediately
      callback();
    } else {
      // Show login modal and save the action for later
      setLoginMessage(message);
      setPendingAction(() => callback);
      setShowLoginModal(true);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      signInWithMagicLink, 
      signOut,
      showLoginModal,
      setShowLoginModal,
      loginMessage,
      setLoginMessage,
      requireAuth,
      pendingAction
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};