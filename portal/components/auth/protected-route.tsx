'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallbackPath?: string;
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  fallbackPath = '/login',
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasRole, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(fallbackPath);
    }
  }, [isAuthenticated, isLoading, router, fallbackPath]);

  // Show loading state
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass-card p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Check permissions
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      unauthorizedComponent || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass-card p-8 text-center max-w-md">
            <div className="text-red-400 text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-6">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    );
  }

  // Check roles
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      unauthorizedComponent || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass-card p-8 text-center max-w-md">
            <div className="text-red-400 text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-6">
              You need the {requiredRole} role to access this page.
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// Higher-order component for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for checking permissions in components
export function usePermission(permission: string) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

// Hook for checking roles in components
export function useRole(role: string) {
  const { hasRole } = useAuth();
  return hasRole(role);
}