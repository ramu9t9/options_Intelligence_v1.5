import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X, Check, AlertTriangle, TrendingUp, Volume2, Activity } from 'lucide-react';
import { MarketAlert, MarketDataService } from '../services/MarketDataService';
import { formatDistanceToNow } from 'date-fns';

export function AlertCenter() {
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const marketService = MarketDataService.getInstance();
    
    const unsubscribe = marketService.subscribeToAlerts((alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification for high/critical alerts
      if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
        if (Notification.permission === 'granted') {
          new Notification(alert.title, {
            body: alert.message,
            icon: '/favicon.ico'
          });
        }
      }
    });

    // Load existing alerts
    setAlerts(marketService.getAlertHistory());

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return unsubscribe;
  }, []);

  const getAlertIcon = (type: MarketAlert['type']) => {
    switch (type) {
      case 'PATTERN_DETECTED':
        return <AlertTriangle className="w-4 h-4" />;
      case 'PRICE_MOVEMENT':
        return <TrendingUp className="w-4 h-4" />;
      case 'VOLUME_SPIKE':
        return <Volume2 className="w-4 h-4" />;
      case 'OI_CHANGE':
        return <Activity className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: MarketAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-l-red-600 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
      case 'HIGH':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200';
      case 'MEDIUM':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
      case 'LOW':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    const marketService = MarketDataService.getInstance();
    marketService.acknowledgeAlert(alertId);
    
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const clearAllAlerts = () => {
    const marketService = MarketDataService.getInstance();
    marketService.clearAlerts();
    setAlerts([]);
    setUnreadCount(0);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0); // Mark as read when opening
    }
  };

  return (
    <div className="relative">
      {/* Alert Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        aria-label="Alerts"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-orange-500" />
        ) : (
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Alert Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Market Alerts
              </h3>
              <div className="flex items-center space-x-2">
                {alerts.length > 0 && (
                  <button
                    onClick={clearAllAlerts}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No alerts yet</p>
                <p className="text-xs mt-1">You'll be notified of important market events</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border-l-4 p-3 rounded-r-lg ${getSeverityColor(alert.severity)} ${
                      alert.acknowledged ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white bg-opacity-50">
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-xs mt-1 opacity-90">{alert.message}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="text-xs opacity-70 hover:opacity-100 p-1"
                          title="Acknowledge"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}