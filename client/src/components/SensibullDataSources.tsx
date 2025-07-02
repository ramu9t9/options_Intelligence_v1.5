import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { sensibullDataService } from '../services/SensibullDataService';

interface DataSource {
  id: number;
  name: string;
  priority: number;
  isActive: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime?: string;
  currentUsage: number;
  usagePercentage: string;
  lastSuccessfulFetch?: string;
  lastFailedFetch?: string;
}

interface SensibullDataSourcesProps {
  className?: string;
}

export const SensibullDataSources: React.FC<SensibullDataSourcesProps> = ({ 
  className = '' 
}) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchDataSources = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sources = await sensibullDataService.getDataSourceHealth();
      setDataSources(sources);
    } catch (err: any) {
      console.error('❌ Error fetching data sources:', err);
      setError(err.message || 'Failed to fetch data sources');
    } finally {
      setLoading(false);
    }
  };

  const updateSourceStatus = async (sourceName: string, isActive: boolean) => {
    setUpdating(sourceName);
    
    try {
      const success = await sensibullDataService.updateDataSourceStatus(sourceName, isActive);
      
      if (success) {
        // Update local state
        setDataSources(prev => prev.map(source => 
          source.name === sourceName 
            ? { ...source, isActive }
            : source
        ));
      } else {
        throw new Error('Failed to update source status');
      }
    } catch (err: any) {
      console.error('❌ Error updating source status:', err);
      setError(err.message || 'Failed to update source status');
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchDataSources();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDataSources, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSourceIcon = (source: DataSource) => {
    if (!source.isActive) {
      return <XCircle className="w-5 h-5 text-gray-400" />;
    }
    
    const successRate = source.totalRequests > 0 
      ? (source.successfulRequests / source.totalRequests) * 100 
      : 100;
    
    if (successRate >= 95) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (successRate >= 80) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getSourceStatusColor = (source: DataSource) => {
    if (!source.isActive) return 'bg-gray-100 text-gray-600';
    
    const successRate = source.totalRequests > 0 
      ? (source.successfulRequests / source.totalRequests) * 100 
      : 100;
    
    if (successRate >= 95) return 'bg-green-100 text-green-800';
    if (successRate >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPriorityBadgeColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 5: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSourceName = (name: string) => {
    const nameMap: { [key: string]: string } = {
      'angel-one': 'Angel One',
      'dhan': 'Dhan',
      'nse': 'NSE',
      'yahoo': 'Yahoo Finance',
      'mock': 'Mock Data'
    };
    return nameMap[name] || name;
  };

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-2">❌ Error loading data sources</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <Button onClick={fetchDataSources} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Data Sources Health
          </CardTitle>
          <Button 
            onClick={fetchDataSources} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          Fallback order: Angel One → Dhan → NSE → Yahoo → Mock
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading && dataSources.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading data sources...</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {dataSources
              .sort((a, b) => a.priority - b.priority)
              .map((source) => {
                const successRate = source.totalRequests > 0 
                  ? ((source.successfulRequests / source.totalRequests) * 100).toFixed(1)
                  : '100.0';
                
                return (
                  <div key={source.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getSourceIcon(source)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {formatSourceName(source.name)}
                            </span>
                            <Badge 
                              variant="outline"
                              className={`text-xs ${getPriorityBadgeColor(source.priority)}`}
                            >
                              Priority {source.priority}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={`text-xs ${getSourceStatusColor(source)}`}
                            >
                              {successRate}% Success
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1 space-x-4">
                            <span>Requests: {source.totalRequests.toLocaleString()}</span>
                            <span>Usage: {source.usagePercentage}%</span>
                            {source.avgResponseTime && (
                              <span>Avg Response: {parseFloat(source.avgResponseTime).toFixed(0)}ms</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {source.lastSuccessfulFetch && (
                          <div className="text-xs text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(source.lastSuccessfulFetch).toLocaleTimeString()}
                          </div>
                        )}
                        
                        <Switch
                          checked={source.isActive}
                          onCheckedChange={(checked) => updateSourceStatus(source.name, checked)}
                          disabled={updating === source.name}
                        />
                        
                        {updating === source.name && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar for usage */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Rate Limit Usage</span>
                        <span>{source.currentUsage}/{source.name === 'mock' ? 1000 : source.name === 'angel-one' ? 200 : source.name === 'dhan' ? 150 : source.name === 'nse' ? 100 : 50} requests/min</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            parseFloat(source.usagePercentage) > 90 
                              ? 'bg-red-500'
                              : parseFloat(source.usagePercentage) > 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(parseFloat(source.usagePercentage), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SensibullDataSources;