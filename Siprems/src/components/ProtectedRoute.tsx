import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { apiClient } from '../utils/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!apiClient.isAuthenticated()) {
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      try {
        // Try to validate current session by making a test API call
        await apiClient.get('/auth/profile');
        setIsAuthenticated(true);
      } catch (error) {
        // Token might be expired, user will be redirected by api.ts
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
