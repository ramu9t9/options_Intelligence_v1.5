import React from 'react';

export default function TestBrokerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">Broker Admin Dashboard Test</h1>
      <p>This is a test page to verify routing is working.</p>
      <button 
        onClick={() => window.location.href = '/'}
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
      >
        Back to Dashboard
      </button>
    </div>
  );
}