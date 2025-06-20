'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/lib/auth';
import toast from 'react-hot-toast';

interface PasswordResetFormProps {
  onBackClick?: () => void;
}

interface ResetRequestData {
  email: string;
}

export function PasswordResetForm({ onBackClick }: PasswordResetFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ResetRequestData>();

  const onSubmit = async (data: ResetRequestData) => {
    try {
      await resetPassword(data.email);
      setIsSubmitted(true);
      toast.success('Password reset instructions sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset instructions');
    }
  };

  if (isSubmitted) {
    const email = getValues('email');
    
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="glass-card p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-6">
            <CheckIcon className="h-6 w-6 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Check Your Email</h2>
          
          <p className="text-gray-400 mb-6">
            We've sent password reset instructions to{' '}
            <span className="text-white font-medium">{email}</span>
          </p>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Didn't receive an email? Check your spam folder or try again with a different email address.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setIsSubmitted(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-dark-card border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
              
              {onBackClick && (
                <button
                  onClick={onBackClick}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Back to Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card p-8">
        <div className="flex items-center mb-6">
          {onBackClick && (
            <button
              onClick={onBackClick}
              className="mr-4 p-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">Reset Password</h2>
            <p className="text-gray-400 mt-1">Enter your email to receive reset instructions</p>
          </div>
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
              placeholder="Enter your email address"
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
                Sending instructions...
              </div>
            ) : (
              'Send Reset Instructions'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Remember your password?{' '}
            {onBackClick && (
              <button
                onClick={onBackClick}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Back to login
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}