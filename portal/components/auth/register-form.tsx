'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore, type RegisterData } from '@/lib/auth';
import toast from 'react-hot-toast';

interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
  agreeToTerms: boolean;
}

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>();

  const password = watch('password');

  // Password validation rules
  const passwordRules = [
    { test: (pwd: string) => pwd?.length >= 8, label: 'At least 8 characters' },
    { test: (pwd: string) => /[a-z]/.test(pwd), label: 'One lowercase letter' },
    { test: (pwd: string) => /[A-Z]/.test(pwd), label: 'One uppercase letter' },
    { test: (pwd: string) => /\d/.test(pwd), label: 'One number' },
    { test: (pwd: string) => /[@$!%*?&]/.test(pwd), label: 'One special character' },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }

    if (!data.agreeToTerms) {
      setError('agreeToTerms', { message: 'You must agree to the terms and conditions' });
      return;
    }

    try {
      const { confirmPassword, agreeToTerms, ...registerData } = data;
      await registerUser(registerData);
      toast.success('Account created successfully! Welcome to DevX Platform.');
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      
      if (errorMessage.toLowerCase().includes('email')) {
        setError('email', { message: 'This email is already registered' });
      } else if (errorMessage.toLowerCase().includes('username')) {
        setError('username', { message: 'This username is already taken' });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400">Join the DevX Platform community</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name (Optional)
            </label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              className={`
                w-full px-4 py-3 rounded-lg bg-dark-card border text-white placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                ${errors.full_name ? 'border-red-500' : 'border-gray-600'}
              `}
              placeholder="Enter your full name"
              {...register('full_name', {
                maxLength: {
                  value: 255,
                  message: 'Full name must be less than 255 characters',
                },
              })}
            />
            {errors.full_name && (
              <p className="mt-2 text-sm text-red-400">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className={`
                w-full px-4 py-3 rounded-lg bg-dark-card border text-white placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                ${errors.username ? 'border-red-500' : 'border-gray-600'}
              `}
              placeholder="Choose a username"
              {...register('username', {
                required: 'Username is required',
                minLength: {
                  value: 3,
                  message: 'Username must be at least 3 characters',
                },
                maxLength: {
                  value: 30,
                  message: 'Username must be less than 30 characters',
                },
                pattern: {
                  value: /^[a-zA-Z0-9_-]+$/,
                  message: 'Username can only contain letters, numbers, underscores, and hyphens',
                },
              })}
            />
            {errors.username && (
              <p className="mt-2 text-sm text-red-400">{errors.username.message}</p>
            )}
          </div>

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
                autoComplete="new-password"
                className={`
                  w-full px-4 py-3 rounded-lg bg-dark-card border text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12
                  ${errors.password ? 'border-red-500' : 'border-gray-600'}
                `}
                placeholder="Create a password"
                {...register('password', {
                  required: 'Password is required',
                  validate: (value) => {
                    const allRulesPassed = passwordRules.every(rule => rule.test(value));
                    return allRulesPassed || 'Password must meet all requirements';
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
            
            {/* Password requirements */}
            {password && (
              <div className="mt-3 space-y-2">
                {passwordRules.map((rule, index) => {
                  const isValid = rule.test(password);
                  return (
                    <div key={index} className="flex items-center text-sm">
                      {isValid ? (
                        <CheckIcon className="h-4 w-4 text-green-400 mr-2" />
                      ) : (
                        <XMarkIcon className="h-4 w-4 text-red-400 mr-2" />
                      )}
                      <span className={isValid ? 'text-green-400' : 'text-red-400'}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {errors.password && (
              <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`
                  w-full px-4 py-3 rounded-lg bg-dark-card border text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12
                  ${errors.confirmPassword ? 'border-red-500' : 'border-gray-600'}
                `}
                placeholder="Confirm your password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === password || 'Passwords do not match',
                })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex items-start">
            <input
              id="agreeToTerms"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-600 bg-dark-card rounded mt-1"
              {...register('agreeToTerms', {
                required: 'You must agree to the terms and conditions',
              })}
            />
            <label htmlFor="agreeToTerms" className="ml-3 block text-sm text-gray-300">
              I agree to the{' '}
              <a href="/terms" className="text-primary-400 hover:text-primary-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary-400 hover:text-primary-300">
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-400">{errors.agreeToTerms.message}</p>
          )}

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
                Creating account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {onLoginClick && (
          <div className="mt-8 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <button
                onClick={onLoginClick}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}