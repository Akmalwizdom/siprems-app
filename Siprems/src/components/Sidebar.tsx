import { motion } from 'motion/react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Bot,
  Settings,
  BarChart3,
  Package,
  CalendarDays,
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'transactions', label: 'Transactions', icon: ShoppingCart, path: '/transactions' },
  { id: 'prediction', label: 'Prediction', icon: TrendingUp, path: '/prediction' },
  { id: 'insights', label: 'Insights', icon: Bot, path: '/insights' },
  { id: 'products', label: 'Products', icon: Package, path: '/products' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/calendar' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500 rounded-xl p-2">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-gray-900 dark:text-white">StockPredict</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI Inventory System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '');

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors relative block ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-blue-100'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span className={`relative z-10 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Need help?</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Visit our support center</p>
        </div>
      </div>
    </div>
  );
}
