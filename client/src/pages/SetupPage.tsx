import React, { useState } from 'react';
import { ServiceProviderSetup } from '../components/ServiceProviderSetup';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export function SetupPage() {
  const [isCompleted, setIsCompleted] = useState(false);

  const handleComplete = () => {
    setIsCompleted(true);
    // Redirect to main dashboard after a delay
    setTimeout(() => {
      window.location.hash = '';
    }, 3000);
  };

  const handleBackToDashboard = () => {
    window.location.hash = '';
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Setup Complete!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your data provider has been configured successfully. You'll be redirected to the dashboard shortly.
          </p>
          <button
            onClick={handleBackToDashboard}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Options Intelligence Platform Setup
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The centralized Angel One data feed is already configured with your credentials and available to all users.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Angel One API Credentials (Already Configured)
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-blue-700 dark:text-blue-300">API Key:</div>
                  <div className="font-mono text-blue-800 dark:text-blue-200">P9ErUZG0</div>
                  <div className="text-blue-700 dark:text-blue-300">Client ID:</div>
                  <div className="font-mono text-blue-800 dark:text-blue-200">R117172</div>
                  <div className="text-blue-700 dark:text-blue-300">Secret Key:</div>
                  <div className="font-mono text-blue-800 dark:text-blue-200">7fcb7f2a-fd0a-4d12-a010-16d37fbdbd6e</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleBackToDashboard}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            
            <button
              onClick={() => window.location.hash = ''}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>Continue to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}