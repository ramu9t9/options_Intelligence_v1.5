import React, { useState } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  CreditCard, 
  Bell, 
  ChevronDown,
  UserCircle,
  Activity,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {getInitials(user.firstName, user.lastName)}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {/* User Info Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg font-medium">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                  {user.emailVerified && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to profile
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <UserCircle className="w-4 h-4" />
              <span>Profile Settings</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to subscription
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Subscription</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to notifications
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to security
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Security</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to activity
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Activity Log</span>
            </button>

            {(hasRole('ADMIN') || hasRole('SUPER_ADMIN')) && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to admin
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Account Status */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Last login:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-gray-500 dark:text-gray-400">Member since:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}