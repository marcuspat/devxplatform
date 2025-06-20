'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';
import { PasswordResetForm } from './password-reset-form';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'reset';
  onSuccess?: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

export function AuthModal({ 
  isOpen, 
  onClose, 
  initialMode = 'login',
  onSuccess 
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  const handleClose = () => {
    setMode('login'); // Reset to login when closing
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-transparent text-left align-middle shadow-xl transition-all">
                <div className="relative">
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>

                  {mode === 'login' && (
                    <LoginForm
                      onSuccess={handleSuccess}
                      onRegisterClick={() => setMode('register')}
                      onForgotPasswordClick={() => setMode('reset')}
                    />
                  )}

                  {mode === 'register' && (
                    <RegisterForm
                      onSuccess={handleSuccess}
                      onLoginClick={() => setMode('login')}
                    />
                  )}

                  {mode === 'reset' && (
                    <PasswordResetForm
                      onBackClick={() => setMode('login')}
                    />
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}