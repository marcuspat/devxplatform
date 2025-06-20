'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore, type LoginCredentials } from '@/lib/auth';
import toast from 'react-hot-toast';

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
  onForgotPasswordClick?: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick, onForgotPasswordClick }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginCredentials>();

  const onSubmit = async (data: LoginCredentials) => {
    try {
      await login(data);
      toast.success('Welcome back!');
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('password')) {
        setError('email', { message: 'Invalid email or password' });
        setError('password', { message: 'Invalid email or password' });
      } else if (errorMessage.toLowerCase().includes('locked')) {
        toast.error('Your account is temporarily locked. Please try again later.');
      } else if (errorMessage.toLowerCase().includes('deactivated')) {
        toast.error('Your account has been deactivated. Please contact support.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to your DevX Platform account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`
                w-full px-4 py-3 rounded-lg bg-dark-card border text-white placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                ${errors.email ? 'border-red-500' : 'border-gray-600'}
              `}
              placeholder="Enter your email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address',
                },
              })}
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`
                  w-full px-4 py-3 rounded-lg bg-dark-card border text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12
                  ${errors.password ? 'border-red-500' : 'border-gray-600'}
                `}
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-600 bg-dark-card rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                Remember me
              </label>
            </div>

            {onForgotPasswordClick && (
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full flex justify-center py-3 px-4 border border-transparent rounded-lg
              text-sm font-medium text-white transition-all duration-200
              ${
                isLoading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              }
            `}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {onRegisterClick && (
          <div className="mt-8 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={onRegisterClick}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}