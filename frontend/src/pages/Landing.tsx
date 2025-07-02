import React from 'react';
import { TrendingUp, BarChart3, Shield, Zap, Users, Award } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Options Intelligence</span>
                  <span className="block text-blue-400 xl:inline"> Platform</span>
                </h1>
                <p className="mt-3 text-base text-blue-100 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Advanced real-time options trading intelligence with pattern detection, 
                  multi-channel alerts, and institutional-grade analytics.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <button
                      onClick={() => window.location.href = '/auth'}
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                    >
                      Get Started
                    </button>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <a
                      href="#features"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10"
                    >
                      Learn More
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-blue-600 to-indigo-600 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <BarChart3 className="w-32 h-32 text-white opacity-20" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Professional Trading Intelligence
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Everything you need for advanced options trading analysis and decision making.
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Real-Time Pattern Detection</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Advanced algorithms detect 8+ option patterns including Gamma Squeeze, Max Pain, and Call/Put buildups with confidence scoring.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Zap className="w-6 h-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Multi-Channel Alerts</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Get notified via Email, SMS, Push notifications, Webhooks, or In-App alerts when your patterns trigger.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Shield className="w-6 h-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Enterprise Security</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Bank-grade security with rate limiting, input validation, and role-based access control.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Users className="w-6 h-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Subscription Tiers</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  From Free to Institutional plans ($0-$499/month) with features tailored to your trading needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Pricing</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Choose Your Plan
            </p>
          </div>

          <div className="mt-10 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-4">
            {/* Free Plan */}
            <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
              <div className="p-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">Free</h2>
                <p className="mt-4 text-sm text-gray-500">Perfect for getting started</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">$0</span>
                  <span className="text-base font-medium text-gray-500">/month</span>
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex text-sm text-gray-700">
                    <span>2 Instruments</span>
                  </li>
                  <li className="flex text-sm text-gray-700">
                    <span>5 Alerts</span>
                  </li>
                  <li className="flex text-sm text-gray-700">
                    <span>Basic Patterns</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
              <div className="p-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">Pro</h2>
                <p className="mt-4 text-sm text-gray-500">For serious traders</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">$49</span>
                  <span className="text-base font-medium text-gray-500">/month</span>
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex text-sm text-gray-700">
                    <span>10 Instruments</span>
                  </li>
                  <li className="flex text-sm text-gray-700">
                    <span>50 Alerts</span>
                  </li>
                  <li className="flex text-sm text-gray-700">
                    <span>Real-time Data</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* VIP Plan */}
            <div className="border border-blue-200 rounded-lg shadow-sm divide-y divide-gray-200 border-2">
              <div className="p-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">VIP</h2>
                <p className="mt-4 text-sm text-gray-500">Most popular</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">$149</span>
                  <span className="text-base font-medium text-gray-500">/month</span>
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex text-sm text-gray-700">
                    <span>25 Instruments</span>
                  </li>
                  <li className="flex text-sm text-gray-700">
                    <span>200 Alerts</span>
                  </li>
                  <li className="flex text-sm text-gray-700">
                    <span>All Patterns</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Institutional Plan */}
            <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
              <div className="p-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">Institutional</h2>
                <p className="mt-4 text-sm text-gray-500">For organizations</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">$499</span>
                  <span className="text-base font-medium text-gray-500">/month</span>
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex text-sm text-gray-700">
                    <span>Unlimited</span>
                  </li>
                  <li className="flex text-sm text-gray-700">
                    <span>Unlimited Alerts</span>
                  </li>
                  <li className="flex text-sm text-gray-700">
                    <span>API Access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-blue-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white">
              Ready to start trading smarter?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Join thousands of traders using our platform for better decisions.
            </p>
            <div className="mt-8">
              <a
                href="/auth"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}