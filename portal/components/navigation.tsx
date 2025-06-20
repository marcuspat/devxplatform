'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, Transition } from '@headlessui/react';
import {
  HomeIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  BeakerIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useAuth } from './auth/auth-provider';
import { AuthModal } from './auth/auth-modal';
import toast from 'react-hot-toast';

const navItems = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Services', href: '/services', icon: CubeIcon },
  { name: 'Templates', href: '/templates', icon: BeakerIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Docs', href: '/docs', icon: DocumentTextIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Navigation() {
  const pathname = usePathname();
  const { isAuthenticated, user, hasRole, logout, logoutAll } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll();
      toast.success('Logged out from all devices');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <>
      <nav className="glass-card border-b border-dark-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="font-semibold text-lg">DevX Platform</span>
            </Link>

            {/* Nav Items - Only show if authenticated */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        'relative px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'text-primary-400'
                          : 'text-dark-muted hover:text-dark-text'
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute inset-0 bg-primary-500/10 rounded-lg -z-10"
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* Notifications */}
                  <button className="text-dark-muted hover:text-dark-text relative">
                    <BellIcon className="w-5 h-5" />
                    {/* Notification badge */}
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
                  </button>

                  {/* User Menu */}
                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center space-x-2 text-dark-muted hover:text-dark-text">
                      <div className="flex items-center space-x-2">
                        {user?.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                            <UserCircleIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <span className="hidden sm:block text-sm font-medium">
                          {user?.full_name || user?.username}
                        </span>
                      </div>
                    </Menu.Button>

                    <Transition
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right glass-card border border-dark-border rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="p-2">
                          {/* User Info */}
                          <div className="px-3 py-2 border-b border-dark-border mb-2">
                            <p className="text-sm font-medium text-white">
                              {user?.full_name || user?.username}
                            </p>
                            <p className="text-xs text-gray-400">{user?.email}</p>
                            <div className="flex items-center mt-1 space-x-2">
                              {hasRole('admin') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">
                                  <ShieldCheckIcon className="w-3 h-3 mr-1" />
                                  Admin
                                </span>
                              )}
                              {user?.email_verified && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Menu Items */}
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/profile"
                                className={clsx(
                                  'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                                  active ? 'bg-dark-card text-white' : 'text-gray-300'
                                )}
                              >
                                <UserCircleIcon className="w-4 h-4 mr-3" />
                                Profile Settings
                              </Link>
                            )}
                          </Menu.Item>

                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/sessions"
                                className={clsx(
                                  'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                                  active ? 'bg-dark-card text-white' : 'text-gray-300'
                                )}
                              >
                                <ClockIcon className="w-4 h-4 mr-3" />
                                Active Sessions
                              </Link>
                            )}
                          </Menu.Item>

                          {hasRole('admin') && (
                            <Menu.Item>
                              {({ active }) => (
                                <Link
                                  href="/admin"
                                  className={clsx(
                                    'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                                    active ? 'bg-dark-card text-white' : 'text-gray-300'
                                  )}
                                >
                                  <ShieldCheckIcon className="w-4 h-4 mr-3" />
                                  Admin Panel
                                </Link>
                              )}
                            </Menu.Item>
                          )}

                          <div className="border-t border-dark-border my-2"></div>

                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={handleLogout}
                                className={clsx(
                                  'flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors',
                                  active ? 'bg-dark-card text-white' : 'text-gray-300'
                                )}
                              >
                                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                                Sign Out
                              </button>
                            )}
                          </Menu.Item>

                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={handleLogoutAll}
                                className={clsx(
                                  'flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors text-red-400',
                                  active ? 'bg-red-900/20' : ''
                                )}
                              >
                                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                                Sign Out All Devices
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </>
              ) : (
                <>
                  {/* Login/Register buttons for unauthenticated users */}
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          toast.success('Welcome to DevX Platform!');
        }}
      />
    </>
  );
}