import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthContext: Starting initialization...');
    initializeAuth();
    
    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((session) => {
      console.log('🔐 AuthContext: Auth state changed', session ? 'LOGGED IN' : 'LOGGED OUT');
      if (session) {
        const currentUser = authService.getCurrentUser();
        console.log('🔐 AuthContext: Current user:', currentUser);
        setUser(currentUser);
      } else {
        console.log('🔐 AuthContext: No session, setting user to null');
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const initializeAuth = async () => {
    console.log('🔐 AuthContext: initializeAuth called');
    try {
      const isInitialized = await authService.initialize();
      console.log('🔐 AuthContext: initialize returned:', isInitialized);
      if (isInitialized) {
        const currentUser = authService.getCurrentUser();
        console.log('🔐 AuthContext: Got current user:', currentUser);
        setUser(currentUser);
      } else {
        console.log('🔐 AuthContext: Not initialized, no user');
      }
    } catch (error) {
      console.error('🔐 AuthContext: Error during initialization:', error);
    } finally {
      setIsLoading(false);
      console.log('🔐 AuthContext: Loading complete');
    }
  };

  const login = async () => {
    console.log('🔐 AuthContext: login called');
    const currentUser = authService.getCurrentUser();
    console.log('🔐 AuthContext: Setting user after login:', currentUser);
    setUser(currentUser);
  };

  const logout = async () => {
    console.log('🔐 AuthContext: logout called');
    try {
      await authService.logout();
      console.log('🔐 AuthContext: Logout successful');
      setUser(null);
    } catch (error) {
      console.error('🔐 AuthContext: Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      if (authService.isAuthenticated()) {
        // Refresh the session and reload user profile
        await authService.initialize();
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      // Refresh user error (suppressed)
      // If refresh fails, logout the user
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}