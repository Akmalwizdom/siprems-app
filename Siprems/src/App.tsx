import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import TransactionsPage from './components/TransactionsPage';
import PredictionPage from './components/PredictionPage';
import InsightsPage from './components/InsightsPage';
import SettingsPage from './components/SettingsPage';
import ProductsPage from './components/ProductsPage';
import CalendarPage from './components/CalendarPage';
import { MainLayout } from './components/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { apiClient } from './utils/api';

interface User {
  user_id: number;
  email: string;
  full_name: string;
}

function App() {
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('access_token');

    if (storedUser && accessToken) {
      try {
        JSON.parse(storedUser) as User;
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        apiClient.clearTokens();
      }
    }
  }, []);

  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/prediction" element={<PredictionPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
