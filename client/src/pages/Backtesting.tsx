import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Play, TrendingUp, TrendingDown, BarChart3, Clock, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { NavigationHeader } from '@/components/NavigationHeader';

interface Strategy {
  id: number;
  name: string;
  description: string;
  rules: any;
}

interface BacktestRequest {
  strategyId: number;
  symbol: string;
  startDate: string;
  endDate: string;
  timeframe: '1MIN' | '5MIN' | '15MIN' | '1HOUR' | '1DAY';
  backtestName?: string;
}

interface BacktestResult {
  id: number;
  strategyId: number;
  backtestName: string;
  symbol: string;
  startDate: string;
  endDate: string;
  timeframe: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalEvaluations: number;
  matchesFound: number;
  successfulMatches: number;
  successRate: string;
  totalROI: string;
  avgMovePostMatch: string;
  maxDrawdown: string;
  sharpeRatio: string;
  executionTime: number;
  createdAt: string;
  completedAt?: string;
  matchDetails: any[];
  performanceChart: Array<{
    timestamp: string;
    cumulativeReturn: number;
    drawdown: number;
  }>;
}

export default function Backtesting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [backtestForm, setBacktestForm] = useState<BacktestRequest>({
    strategyId: 0,
    symbol: 'NIFTY',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    timeframe: '15MIN',
    backtestName: ''
  });

  // Fetch user strategies
  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ['/api/strategies'],
    select: (data: any) => data as Strategy[]
  });

  // Fetch backtest results
  const { data: backtests, isLoading: backtestsLoading } = useQuery({
    queryKey: ['/api/backtests'],
    select: (data: any) => data as BacktestResult[]
  });

  // Run backtest mutation
  const runBacktest = useMutation({
    mutationFn: async (request: BacktestRequest) => {
      return await apiRequest('/api/backtests', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },
    onSuccess: () => {
      toast({
        title: "Backtest Started",
        description: "Your strategy backtest is now running. Results will appear below.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backtests'] });
      setBacktestForm(prev => ({ ...prev, backtestName: '' }));
    },
    onError: (error: any) => {
      toast({
        title: "Backtest Failed",
        description: error.message || "Failed to start backtest",
        variant: "destructive",
      });
    }
  });

  // Delete backtest mutation
  const deleteBacktest = useMutation({
    mutationFn: async (backtestId: number) => {
      return await apiRequest(`/api/backtests/${backtestId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({
        title: "Backtest Deleted",
        description: "Backtest has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backtests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete backtest",
        variant: "destructive",
      });
    }
  });

  const handleRunBacktest = () => {
    if (!backtestForm.strategyId) {
      toast({
        title: "Strategy Required",
        description: "Please select a strategy to backtest",
        variant: "destructive",
      });
      return;
    }

    runBacktest.mutate(backtestForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Badge variant="outline" className="text-blue-600">Running</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="text-green-600">Completed</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatMetric = (value: string, suffix: string = '') => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `${num.toFixed(2)}${suffix}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <NavigationHeader 
        title="Strategy Backtesting" 
        subtitle="Test your trading strategies against historical market data"
      />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        <Tabs defaultValue="new-backtest" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new-backtest">New Backtest</TabsTrigger>
            <TabsTrigger value="results">Results & History</TabsTrigger>
          </TabsList>

          {/* New Backtest Tab */}
          <TabsContent value="new-backtest">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-600" />
                  Create New Backtest
                </CardTitle>
                <CardDescription>
                  Configure and run a backtest for your trading strategy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Strategy Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy</Label>
                    <Select
                      value={backtestForm.strategyId > 0 ? backtestForm.strategyId.toString() : ""}
                      onValueChange={(value) => setBacktestForm(prev => ({ 
                        ...prev, 
                        strategyId: parseInt(value),
                        backtestName: strategies?.find(s => s.id === parseInt(value))?.name || ''
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {strategiesLoading ? (
                          <SelectItem value="loading" disabled>Loading strategies...</SelectItem>
                        ) : strategies && strategies.length > 0 ? (
                          strategies.map((strategy) => (
                            <SelectItem key={strategy.id} value={strategy.id.toString()}>
                              {strategy.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No strategies found. Create one first.</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Symbol Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select
                      value={backtestForm.symbol}
                      onValueChange={(value) => setBacktestForm(prev => ({ ...prev, symbol: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIFTY">NIFTY</SelectItem>
                        <SelectItem value="BANKNIFTY">BANKNIFTY</SelectItem>
                        <SelectItem value="FINNIFTY">FINNIFTY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={backtestForm.startDate}
                      onChange={(e) => setBacktestForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={backtestForm.endDate}
                      onChange={(e) => setBacktestForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>

                  {/* Timeframe */}
                  <div className="space-y-2">
                    <Label htmlFor="timeframe">Timeframe</Label>
                    <Select
                      value={backtestForm.timeframe}
                      onValueChange={(value) => setBacktestForm(prev => ({ 
                        ...prev, 
                        timeframe: value as BacktestRequest['timeframe']
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1MIN">1 Minute</SelectItem>
                        <SelectItem value="5MIN">5 Minutes</SelectItem>
                        <SelectItem value="15MIN">15 Minutes</SelectItem>
                        <SelectItem value="1HOUR">1 Hour</SelectItem>
                        <SelectItem value="1DAY">1 Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Backtest Name */}
                  <div className="space-y-2">
                    <Label htmlFor="backtestName">Backtest Name (Optional)</Label>
                    <Input
                      id="backtestName"
                      placeholder="Custom backtest name"
                      value={backtestForm.backtestName}
                      onChange={(e) => setBacktestForm(prev => ({ ...prev, backtestName: e.target.value }))}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleRunBacktest}
                  disabled={
                    runBacktest.isPending || 
                    backtestForm.strategyId <= 0 || 
                    !backtestForm.symbol || 
                    !backtestForm.startDate || 
                    !backtestForm.endDate
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {runBacktest.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Running Backtest...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Run Backtest
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <div className="space-y-6">
              
              {/* Results Grid */}
              <div className="grid gap-6">
                {backtestsLoading ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">Loading backtest results...</div>
                    </CardContent>
                  </Card>
                ) : backtests && backtests.length > 0 ? (
                  backtests.map((backtest) => (
                    <Card key={backtest.id} className="w-full">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <BarChart3 className="h-5 w-5 text-blue-600" />
                              {backtest.backtestName || `Backtest #${backtest.id}`}
                            </CardTitle>
                            <CardDescription>
                              {backtest.symbol} • {backtest.timeframe} • 
                              {new Date(backtest.startDate).toLocaleDateString()} to {new Date(backtest.endDate).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(backtest.status)}
                            {backtest.status === 'COMPLETED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteBacktest.mutate(backtest.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {backtest.status === 'RUNNING' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-blue-600">
                              <Clock className="h-4 w-4 animate-spin" />
                              <span>Backtest in progress...</span>
                            </div>
                            <Progress value={65} className="w-full" />
                          </div>
                        ) : backtest.status === 'COMPLETED' ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {formatMetric(backtest.successRate, '%')}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {formatMetric(backtest.totalROI, '%')}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Total ROI</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">
                                {formatMetric(backtest.maxDrawdown, '%')}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">
                                {formatMetric(backtest.sharpeRatio)}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Backtest failed</span>
                          </div>
                        )}

                        {backtest.status === 'COMPLETED' && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Matches Found:</span>
                                <span className="ml-2 font-semibold">{backtest.matchesFound}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Total Evaluations:</span>
                                <span className="ml-2 font-semibold">{backtest.totalEvaluations}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Execution Time:</span>
                                <span className="ml-2 font-semibold">{backtest.executionTime}ms</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center text-gray-600 dark:text-gray-400">
                        No backtest results yet. Create your first backtest above.
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}