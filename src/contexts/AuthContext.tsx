import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAsPatient: (email: string, password: string) => Promise<void>;
  signInAsHospital: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, name: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async (): Promise<void> => {
    try {
      setLoading(true);
      const currentUser = await api.getMyProfile();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      // Clear any invalid session data
      localStorage.removeItem('supabase-auth-token');
      // Clear Supabase session if it exists
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase.auth.signOut();
      } catch (supabaseError) {
        console.error('Failed to clear Supabase session:', supabaseError);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      await api.signIn(email, password);
      const user = await api.getMyProfile();
      setUser(user);
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInAsPatient = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const user = await api.signInAsPatient(email, password);
      setUser(user);
    } catch (error) {
      console.error('Patient sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInAsHospital = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const user = await api.signInAsHospital(email, password);
      setUser(user);
    } catch (error) {
      console.error('Hospital sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    role: UserRole, 
    name: string
  ): Promise<{ needsEmailConfirmation: boolean }> => {
    try {
      setLoading(true);
      const result = await api.signUp(email, password, role, name);
      
      if (!result.confirmEmail) {
        // User is automatically signed in
        const user = await api.getMyProfile();
        setUser(user);
      }
      
      return { needsEmailConfirmation: result.confirmEmail };
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await api.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    await checkAuthState();
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signInAsPatient,
    signInAsHospital,
    signUp,
    signOut,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
