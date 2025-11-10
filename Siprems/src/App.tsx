import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import TransactionsPage from './components/TransactionsPage';
import PredictionPage from './components/PredictionPage';
import InsightsPage from './components/InsightsPage';
import SettingsPage from './components/SettingsPage';
import ProductsPage from './components/ProductsPage';
import CalendarPage from './components/CalendarPage';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

type Page = 'login' | 'dashboard' | 'transactions' | 'prediction' | 'insights' | 'settings' | 'products' | 'calendar';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const handleLogin = (name: string) => {
    setUsername(name);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setCurrentPage('login');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar 
            username={username} 
            onLogout={handleLogout}
            darkMode={darkMode}
            onDarkModeToggle={() => setDarkMode(!darkMode)}
          />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {currentPage === 'dashboard' && <Dashboard key="dashboard" />}
              {currentPage === 'transactions' && <TransactionsPage key="transactions" />}
              {currentPage === 'prediction' && <PredictionPage key="prediction" />}
              {currentPage === 'insights' && <InsightsPage key="insights" />}
              {currentPage === 'products' && <ProductsPage key="products" />}
              {currentPage === 'calendar' && <CalendarPage key="calendar" />}
              {currentPage === 'settings' && <SettingsPage key="settings" />}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
