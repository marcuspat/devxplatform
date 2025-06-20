'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth';

interface AuthContextValue {
  // Re-export store methods for convenience
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ReturnType<typeof useAuthStore>['user'];
  roles: ReturnType<typeof useAuthStore>['roles'];
  permissions: ReturnType<typeof useAuthStore>['permissions'];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authStore = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app start
    const initAuth = async () => {
      if (authStore.tokens && !authStore.user) {
        try {
          await authStore.getCurrentUser();
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          authStore.clearAuth();
        }
      }
    };

    initAuth();
  }, [authStore]);

  const contextValue: AuthContextValue = {
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    user: authStore.user,
    roles: authStore.roles,
    permissions: authStore.permissions,
    hasPermission: authStore.hasPermission,
    hasRole: authStore.hasRole,
    logout: authStore.logout,
    logoutAll: authStore.logoutAll,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}