'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  UserCircleIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  ShieldCheckIcon,
  KeyIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from './auth-provider';
import { useAuthStore, type User } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface ProfileUpdateData {
  full_name: string;
  avatar_url: string;
}

interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export function UserProfile() {
  const { user, roles, permissions } = useAuth();
  const { updateProfile, changePassword, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileUpdateData>({
    defaultValues: {
      full_name: user?.full_name || '',
      avatar_url: user?.avatar_url || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch,
  } = useForm<PasswordChangeData>();

  const newPassword = watch('new_password');

  if (!user) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-gray-400">No user data available</p>
      </div>
    );
  }

  const handleProfileUpdate = async (data: ProfileUpdateData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async (data: PasswordChangeData) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await changePassword(data.current_password, data.new_password);
      setIsChangingPassword(false);
      resetPassword();
      toast.success('Password changed successfully. Please log in again.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    resetProfile({
      full_name: user.full_name || '',
      avatar_url: user.avatar_url || '',
    });
  };

  const cancelPasswordChange = () => {
    setIsChangingPassword(false);
    resetPassword();
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Profile Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white bg-dark-card hover:bg-gray-700 rounded-lg transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleProfileSubmit(handleProfileUpdate)} className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-20 w-20 rounded-full bg-gray-700 flex items-center justify-center">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{user.username}</p>
                <p className="text-gray-400">{user.email}</p>
              </div>
            </div>

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                className="w-full px-4 py-3 rounded-lg bg-dark-card border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your full name"
                {...registerProfile('full_name', {
                  maxLength: {
                    value: 255,
                    message: 'Full name must be less than 255 characters',
                  },
                })}
              />
              {profileErrors.full_name && (
                <p className="mt-2 text-sm text-red-400">{profileErrors.full_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-300 mb-2">
                Avatar URL
              </label>
              <input
                id="avatar_url"
                type="url"
                className="w-full px-4 py-3 rounded-lg bg-dark-card border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
                {...registerProfile('avatar_url')}
              />
              {profileErrors.avatar_url && (
                <p className="mt-2 text-sm text-red-400">{profileErrors.avatar_url.message}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Save Changes
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-20 w-20 rounded-full bg-gray-700 flex items-center justify-center">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{user.full_name || user.username}</h3>
                <p className="text-gray-400">@{user.username}</p>
                <p className="text-gray-400">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-dark-card p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-400 mr-2" />
                  <span className="text-sm font-medium text-gray-300">Account Status</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${user.is_active ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    <span className="text-sm text-gray-400">
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${user.email_verified ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                    <span className="text-sm text-gray-400">
                      {user.email_verified ? 'Email Verified' : 'Email Not Verified'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-dark-card p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <ClockIcon className="h-5 w-5 text-green-400 mr-2" />
                  <span className="text-sm font-medium text-gray-300">Last Activity</span>
                </div>
                <p className="text-sm text-gray-400">
                  {user.last_login_at 
                    ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Roles and Permissions */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-4">Roles & Permissions</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Roles</h4>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-900 text-primary-300"
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Permissions</h4>
            <div className="flex flex-wrap gap-2">
              {permissions.slice(0, 10).map((permission) => (
                <span
                  key={permission}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300"
                >
                  {permission}
                </span>
              ))}
              {permissions.length > 10 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                  +{permissions.length - 10} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Security</h3>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white bg-dark-card hover:bg-gray-700 rounded-lg transition-colors"
            >
              <KeyIcon className="h-4 w-4 mr-2" />
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword ? (
          <form onSubmit={handlePasswordSubmit(handlePasswordChange)} className="space-y-4">
            <div>
              <label htmlFor="current_password" className="block text-sm font-medium text-gray-300 mb-2">
                Current Password
              </label>
              <input
                id="current_password"
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-dark-card border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                {...registerPassword('current_password', {
                  required: 'Current password is required',
                })}
              />
              {passwordErrors.current_password && (
                <p className="mt-2 text-sm text-red-400">{passwordErrors.current_password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <input
                id="new_password"
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-dark-card border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                {...registerPassword('new_password', {
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                    message: 'Password must contain uppercase, lowercase, number, and special character',
                  },
                })}
              />
              {passwordErrors.new_password && (
                <p className="mt-2 text-sm text-red-400">{passwordErrors.new_password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirm_password"
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-dark-card border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                {...registerPassword('confirm_password', {
                  required: 'Please confirm your password',
                  validate: (value) => value === newPassword || 'Passwords do not match',
                })}
              />
              {passwordErrors.confirm_password && (
                <p className="mt-2 text-sm text-red-400">{passwordErrors.confirm_password.message}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Change Password
              </button>
              <button
                type="button"
                onClick={cancelPasswordChange}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-dark-card p-4 rounded-lg">
              <p className="text-sm text-gray-400">
                Password last changed {user.updated_at 
                  ? formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })
                  : 'unknown'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}