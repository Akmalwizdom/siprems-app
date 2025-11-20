import { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { apiClient } from '../utils/api';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

interface LoginResponse {
  user_id: number;
  email: string;
  full_name: string;
  access_token: string;
  refresh_token: string;
}

interface RegisterResponse {
  message: string;
  user: {
    user_id: number;
    email: string;
    full_name: string;
  };
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        // Register
        const response = await apiClient.post<RegisterResponse>('/auth/register', {
          email,
          password,
          full_name: name
        });
        setError('Registration successful! Please sign in.');
        setIsRegister(false);
        setEmail('');
        setPassword('');
        setName('');
      } else {
        // Login
        const response = await apiClient.post<LoginResponse>('/auth/login', {
          email,
          password
        });

        // Save tokens and user info
        apiClient.setTokens({
          access_token: response.access_token,
          refresh_token: response.refresh_token
        });
        localStorage.setItem('user', JSON.stringify({
          user_id: response.user_id,
          email: response.email,
          full_name: response.full_name
        }));

        onLogin(response.full_name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center"
      >
        {/* Left Side - Illustration/Branding */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden md:flex flex-col items-center justify-center space-y-6 p-8"
        >
          <div className="bg-blue-500 rounded-full p-8">
            <ShoppingCart className="w-20 h-20 text-white" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-blue-900">Seasonal Inventory Prediction</h1>
            <p className="text-gray-600">AI-powered stock management for small businesses</p>
          </div>
          <div className="flex items-center space-x-4 text-blue-600">
            <TrendingUp className="w-8 h-8" />
            <span>Smart predictions, Better decisions</span>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <Card className="p-8 rounded-2xl shadow-xl bg-white">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="mb-8">
              <h2 className="text-gray-900 mb-2">
                {isRegister ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-gray-600">
                {isRegister
                  ? 'Sign up to start managing your inventory'
                  : 'Sign in to continue to your dashboard'}
              </p>
            </div>

            {error && (
              <div className={`mb-4 p-3 rounded-lg ${error.includes('successful') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                disabled={isLoading}
                className="text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {isRegister
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
