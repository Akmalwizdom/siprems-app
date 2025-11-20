import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { apiClient } from '../utils/api';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface User {
  user_id: number;
  email: string;
  full_name: string;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser) as User;
        setUser(userData);
        setUsername(userData.full_name);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    apiClient.clearTokens();
    setUser(null);
    setUsername('');
    navigate('/login');
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            username={username}
            onLogout={handleLogout}
            darkMode={darkMode}
            onDarkModeToggle={() => setDarkMode(!darkMode)}
          />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">{children}</AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
