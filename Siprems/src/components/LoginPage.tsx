import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { ShoppingCart, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { apiClient } from '../utils/api';
import { loginSchema, type LoginFormData } from '../utils/schemas';
import { showToast } from '../utils/toast';

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

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('email', { type: 'manual', message: 'Full name is required' });
          setIsLoading(false);
          return;
        }

        try {
          const response = await apiClient.post<RegisterResponse>('/auth/register', {
            email: data.email,
            password: data.password,
            full_name: fullName,
          });

          showToast.success('Registration successful! Please sign in.');
          setIsRegister(false);
          setFullName('');
          reset();
        } catch (regErr) {
          const errorMessage = regErr instanceof Error ? regErr.message : 'Registration failed';
          showToast.error(errorMessage);
        }
      } else {
        try {
          const response = await apiClient.post<LoginResponse>('/auth/login', {
            email: data.email,
            password: data.password,
          });

          apiClient.setTokens({
            access_token: response.access_token,
            refresh_token: response.refresh_token,
          });

          localStorage.setItem(
            'user',
            JSON.stringify({
              user_id: response.user_id,
              email: response.email,
              full_name: response.full_name,
            })
          );

          showToast.success('Login successful!');
          navigate('/');
        } catch (loginErr) {
          const errorMessage = loginErr instanceof Error ? loginErr.message : 'Login failed';
          showToast.error(errorMessage);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsRegister(!isRegister);
    setFullName('');
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center"
      >
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    className="rounded-xl"
                  />
                  {!fullName.trim() && isRegister && (
                    <p className="text-sm text-red-600">Full name is required</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  disabled={isLoading}
                  className="rounded-xl"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                  className="rounded-xl"
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleAuthMode}
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
