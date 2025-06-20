import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthUser {
  user: User;
  roles: Role[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  roles: Role[];
  permissions: string[];
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  
  // Internal methods
  setAuth: (authData: AuthUser, tokens: AuthTokens) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      roles: [],
      permissions: [],
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (authData: AuthUser, tokens: AuthTokens) => {
        set({
          user: authData.user,
          roles: authData.roles,
          permissions: authData.permissions,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Set default authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
      },

      clearAuth: () => {
        set({
          user: null,
          roles: [],
          permissions: [],
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Remove authorization header
        delete apiClient.defaults.headers.common['Authorization'];
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      hasPermission: (permission: string) => {
        const { permissions } = get();
        return permissions.includes(permission);
      },

      hasRole: (role: string) => {
        const { roles } = get();
        return roles.some(r => r.name === role);
      },

      login: async (credentials: LoginCredentials) => {
        const { setAuth, setLoading } = get();
        setLoading(true);

        try {
          const response = await apiClient.post('/auth/login', credentials);
          const { user, tokens } = response.data;
          
          // Get full user data with roles and permissions
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
          const userResponse = await apiClient.get('/auth/me');
          
          setAuth(userResponse.data, tokens);
        } catch (error: any) {
          setLoading(false);
          throw new Error(error.response?.data?.error || 'Login failed');
        }
      },

      register: async (data: RegisterData) => {
        const { setAuth, setLoading } = get();
        setLoading(true);

        try {
          const response = await apiClient.post('/auth/register', data);
          const { user, tokens } = response.data;
          
          // Get full user data with roles and permissions
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
          const userResponse = await apiClient.get('/auth/me');
          
          setAuth(userResponse.data, tokens);
        } catch (error: any) {
          setLoading(false);
          throw new Error(error.response?.data?.error || 'Registration failed');
        }
      },

      logout: async () => {
        const { tokens, clearAuth } = get();
        
        try {
          if (tokens) {
            await apiClient.post('/auth/logout', {
              refresh_token: tokens.refresh_token,
            });
          }
        } catch (error) {
          // Ignore logout errors, just clear local state
          console.warn('Logout request failed:', error);
        } finally {
          clearAuth();
        }
      },

      logoutAll: async () => {
        const { clearAuth } = get();
        
        try {
          await apiClient.post('/auth/logout-all');
        } catch (error) {
          // Ignore logout errors, just clear local state
          console.warn('Logout all request failed:', error);
        } finally {
          clearAuth();
        }
      },

      refreshToken: async () => {
        const { tokens, setAuth, clearAuth } = get();
        
        if (!tokens?.refresh_token) {
          clearAuth();
          throw new Error('No refresh token available');
        }

        try {
          const response = await apiClient.post('/auth/refresh', {
            refresh_token: tokens.refresh_token,
          });
          
          const newTokens = response.data.tokens;
          
          // Get updated user data
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newTokens.access_token}`;
          const userResponse = await apiClient.get('/auth/me');
          
          setAuth(userResponse.data, newTokens);
        } catch (error: any) {
          clearAuth();
          throw new Error('Token refresh failed');
        }
      },

      getCurrentUser: async () => {
        const { tokens, setAuth, clearAuth, setLoading } = get();
        
        if (!tokens?.access_token) {
          clearAuth();
          return;
        }

        setLoading(true);
        
        try {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
          const response = await apiClient.get('/auth/me');
          setAuth(response.data, tokens);
        } catch (error: any) {
          if (error.response?.status === 401) {
            // Try to refresh token
            try {
              await get().refreshToken();
            } catch (refreshError) {
              clearAuth();
            }
          } else {
            clearAuth();
          }
        } finally {
          setLoading(false);
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        const { user, setAuth, tokens } = get();
        
        if (!user || !tokens) {
          throw new Error('Not authenticated');
        }

        try {
          const response = await apiClient.put('/users/profile', updates);
          const updatedUser = response.data.user;
          
          setAuth(
            { user: updatedUser, roles: get().roles, permissions: get().permissions },
            tokens
          );
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Profile update failed');
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        try {
          await apiClient.put('/users/password', {
            current_password: currentPassword,
            new_password: newPassword,
          });
          
          // Password change logs out all sessions
          get().clearAuth();
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Password change failed');
        }
      },

      resetPassword: async (email: string) => {
        try {
          await apiClient.post('/auth/password-reset', { email });
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Password reset request failed');
        }
      },

      confirmPasswordReset: async (token: string, password: string) => {
        try {
          await apiClient.post('/auth/password-reset/confirm', {
            token,
            password,
          });
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Password reset failed');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        roles: state.roles,
        permissions: state.permissions,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Setup axios interceptors
apiClient.interceptors.request.use((config) => {
  const tokens = useAuthStore.getState().tokens;
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await useAuthStore.getState().refreshToken();
        const newTokens = useAuthStore.getState().tokens;
        
        if (newTokens) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export { apiClient };