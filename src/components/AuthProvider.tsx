import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);

        if (_event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password'); // Navigate to reset page when recovery starts
        } else if (_event === 'SIGNED_IN') {
          navigate('/user-dashboard'); // Redirect to user-dashboard on sign-in
        } else if (_event === 'SIGNED_OUT') {
          navigate('/login'); // Redirect to login on sign-out
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
      // If there's an initial session, navigate to dashboard
      if (session) {
        // Do not override the reset password route if the user is on it
        if (window.location.pathname !== '/reset-password') {
          navigate('/user-dashboard');
        }
      } else {
        // If no initial session, ensure we are on the login page
        navigate('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]); // Add navigate to dependency array

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};