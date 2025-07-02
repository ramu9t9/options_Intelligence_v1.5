import React from 'react';
import { AlertTriangle, Info, User, Shield, Key } from 'lucide-react';

export function LoginInfo() {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div>
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Available Login Credentials
          </h3>
          
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-1">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-gray-900 dark:text-white">Regular User</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600 dark:text-gray-400">Email:</div>
                <div className="font-mono text-gray-800 dark:text-gray-200">test@example.com</div>
                <div className="text-gray-600 dark:text-gray-400">Password:</div>
                <div className="font-mono text-gray-800 dark:text-gray-200">password123</div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded p-3 border border-purple-100 dark:border-purple-800">
              <div className="flex items-center space-x-2 mb-1">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-gray-900 dark:text-white">Admin User</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600 dark:text-gray-400">Email:</div>
                <div className="font-mono text-gray-800 dark:text-gray-200">admin@optionsintelligence.com</div>
                <div className="text-gray-600 dark:text-gray-400">Password:</div>
                <div className="font-mono text-gray-800 dark:text-gray-200">Admin123!@#</div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded p-3 border border-red-100 dark:border-red-800">
              <div className="flex items-center space-x-2 mb-1">
                <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-gray-900 dark:text-white">Super Admin</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600 dark:text-gray-400">Email:</div>
                <div className="font-mono text-gray-800 dark:text-gray-200">superadmin@optionsintelligence.com</div>
                <div className="text-gray-600 dark:text-gray-400">Password:</div>
                <div className="font-mono text-gray-800 dark:text-gray-200">SuperAdmin123!@#</div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              The centralized Angel One data feed is already configured with your credentials and available to all users.
            </p>
          </div>
          
          <div className="mt-3 flex items-start space-x-2">
            <Key className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="text-sm text-green-700 dark:text-green-300">
              <p className="font-medium">Angel One API Credentials (Already Configured)</p>
              <p>API Key: P9ErUZG0</p>
              <p>Client ID: R117172</p>
              <p>Secret Key: 7fcb7f2a-fd0a-4d12-a010-16d37fbdbd6e</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}