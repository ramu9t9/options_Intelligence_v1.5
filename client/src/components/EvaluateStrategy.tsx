import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, CheckCircle, XCircle, AlertTriangle, Target, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { StrategyRule } from './StrategyRuleBuilder';

interface EvaluationResult {
  success: boolean;
  match: boolean;
  symbol: string;
  executionTime: number;
  triggeredStrikes: {
    strike: number;
    expiry: string;
    reason: string;
    optionType: 'CE' | 'PE';
    confidence: number;
  }[];
  marketData: {
    price: number;
    oi: number;
    pcr: number;
    iv: number;
    volume: number;
  };
  matchedConditions: string[];
  message?: string;
}

interface EvaluateStrategyProps {
  strategyId?: number;
  rules: StrategyRule[];
  strategyName?: string;
}

export function EvaluateStrategy({ strategyId, rules, strategyName }: EvaluateStrategyProps) {
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      if (strategyId) {
        // Evaluate existing strategy
        return await apiRequest(`/api/strategies/${strategyId}/execute`, {
          method: 'POST',
        });
      } else {
        // Evaluate ad-hoc rules
        return await apiRequest('/api/test/evaluate-strategy', {
          method: 'POST',
          body: JSON.stringify({ rules }),
        });
      }
    },
    onSuccess: (data) => {
      setEvaluationResult(data);
    },
    onError: (error) => {
      console.error('Strategy evaluation failed:', error);
      setEvaluationResult({
        success: false,
        match: false,
        symbol: 'UNKNOWN',
        executionTime: 0,
        triggeredStrikes: [],
        marketData: { price: 0, oi: 0, pcr: 0, iv: 0, volume: 0 },
        matchedConditions: [],
        message: 'Strategy evaluation failed. Please try again.'
      });
    },
  });

  const handleEvaluate = () => {
    console.log('handleEvaluate called, rules:', rules);
    setEvaluationResult(null);
    evaluateMutation.mutate();
  };

  const getResultIcon = () => {
    if (!evaluationResult) return null;
    
    if (evaluationResult.success && evaluationResult.match) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    } else if (evaluationResult.success && !evaluationResult.match) {
      return <XCircle className="w-6 h-6 text-gray-500" />;
    } else {
      return <AlertTriangle className="w-6 h-6 text-red-500" />;
    }
  };

  const getResultColor = () => {
    if (!evaluationResult) return 'default';
    
    if (evaluationResult.success && evaluationResult.match) {
      return 'default';
    } else if (evaluationResult.success && !evaluationResult.match) {
      return 'secondary';
    } else {
      return 'destructive';
    }
  };

  const getResultText = () => {
    if (!evaluationResult) return '';
    
    if (evaluationResult.success && evaluationResult.match) {
      return 'Strategy Matched';
    } else if (evaluationResult.success && !evaluationResult.match) {
      return 'No Match';
    } else {
      return 'Evaluation Failed';
    }
  };

  console.log('EvaluateStrategy render - rules.length:', rules.length, 'rules:', rules);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Strategy Tester
          <Button
            onClick={handleEvaluate}
            disabled={evaluateMutation.isPending || rules.length === 0}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            {evaluateMutation.isPending ? 'Testing...' : 'Test Strategy'}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {rules.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Add at least one rule to test the strategy.
            </AlertDescription>
          </Alert>
        )}

        {evaluateMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Evaluating strategy against live market data...</p>
            </div>
          </div>
        )}

        {evaluationResult && (
          <div className="space-y-4">
            {/* Result Summary */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getResultIcon()}
                <div>
                  <Badge variant={getResultColor()}>
                    {getResultText()}
                  </Badge>
                  {evaluationResult.message && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {evaluationResult.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {evaluationResult.executionTime}ms
              </div>
            </div>

            {/* Market Data Summary */}
            {evaluationResult.success && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Market Data Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Symbol</div>
                      <div className="font-medium">{evaluationResult.symbol}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Price</div>
                      <div className="font-medium">₹{evaluationResult.marketData.price.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">PCR</div>
                      <div className="font-medium">{evaluationResult.marketData.pcr.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">OI</div>
                      <div className="font-medium">{(evaluationResult.marketData.oi / 100000).toFixed(1)}L</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Volume</div>
                      <div className="font-medium">{(evaluationResult.marketData.volume / 1000).toFixed(0)}K</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Matched Conditions */}
            {evaluationResult.matchedConditions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Matched Conditions ({evaluationResult.matchedConditions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {evaluationResult.matchedConditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <code className="bg-muted px-2 py-1 rounded">{condition}</code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Triggered Strikes */}
            {evaluationResult.triggeredStrikes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Triggered Options ({evaluationResult.triggeredStrikes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {evaluationResult.triggeredStrikes.map((strike, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={strike.optionType === 'CE' ? 'default' : 'secondary'}>
                            {strike.strike} {strike.optionType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{strike.expiry}</span>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium">{strike.reason}</div>
                          <div className="text-xs text-muted-foreground">
                            Confidence: {(strike.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}