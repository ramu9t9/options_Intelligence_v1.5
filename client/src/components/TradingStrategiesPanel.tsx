import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, Brain, Zap, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface TradingStrategy {
  id: string;
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'SCALPING';
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
  description: string;
  signals: string[];
  entry: {
    strike: number;
    type: 'CALL' | 'PUT';
    action: 'BUY' | 'SELL';
  }[];
  exit: {
    target: number;
    stopLoss: number;
    timeDecay: string;
  };
  chatGptInsights: string[];
  oiAnalysis: {
    callOI: number;
    putOI: number;
    pcr: number;
    maxPain: number;
  };
}

export default function TradingStrategiesPanel() {
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  
  const { data: strategies, isLoading } = useQuery({
    queryKey: ['/api/strategies', selectedSymbol],
    refetchInterval: 30000, // Update every 30 seconds
  });

  const strategyTypes = {
    BULLISH: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    BEARISH: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    NEUTRAL: { icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    SCALPING: { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
  };

  const riskColors = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-red-500'
  };

  if (isLoading) {
    return (
      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            ChatGPT Trading Strategies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            ChatGPT Trading Strategies
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
              AI Powered
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Advanced intraday strategies based on OI analysis, support/resistance levels, and ChatGPT knowledge integration
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <TabsList className="glass-effect">
              <TabsTrigger value="NIFTY">NIFTY</TabsTrigger>
              <TabsTrigger value="BANKNIFTY">BANK NIFTY</TabsTrigger>
              <TabsTrigger value="FINNIFTY">FIN NIFTY</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedSymbol} className="mt-6">
              <div className="grid gap-4">
                {strategies?.strategies?.map((strategy: TradingStrategy) => {
                  const StrategyIcon = strategyTypes[strategy.type]?.icon || Target;
                  return (
                    <Card key={strategy.id} className="glass-effect border-l-4 border-l-purple-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${strategyTypes[strategy.type]?.bg}`}>
                              <StrategyIcon className={`h-4 w-4 ${strategyTypes[strategy.type]?.color}`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{strategy.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{strategy.timeframe}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={strategyTypes[strategy.type]?.color}>
                              {strategy.type}
                            </Badge>
                            <div className="text-right">
                              <div className="text-sm font-medium">{strategy.confidence}%</div>
                              <Progress 
                                value={strategy.confidence} 
                                className="w-16 h-2" 
                              />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <p className="text-sm">{strategy.description}</p>
                        
                        {/* ChatGPT Insights */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-400" />
                            ChatGPT Analysis
                          </h4>
                          <div className="bg-purple-500/10 rounded-lg p-3 space-y-1">
                            {strategy.chatGptInsights?.map((insight, idx) => (
                              <p key={idx} className="text-sm text-purple-200">• {insight}</p>
                            ))}
                          </div>
                        </div>

                        {/* OI Analysis */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-800/30 rounded-lg">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-400">{strategy.oiAnalysis?.callOI}</div>
                            <div className="text-xs text-muted-foreground">Call OI</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-400">{strategy.oiAnalysis?.putOI}</div>
                            <div className="text-xs text-muted-foreground">Put OI</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-400">{strategy.oiAnalysis?.pcr}</div>
                            <div className="text-xs text-muted-foreground">PCR</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-400">{strategy.oiAnalysis?.maxPain}</div>
                            <div className="text-xs text-muted-foreground">Max Pain</div>
                          </div>
                        </div>

                        {/* Entry Strategy */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Entry Strategy</h4>
                          <div className="flex flex-wrap gap-2">
                            {strategy.entry?.map((entry, idx) => (
                              <Badge key={idx} variant="outline" className="bg-blue-500/10">
                                {entry.action} {entry.strike} {entry.type}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Risk Management */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            <span className="text-sm">Risk Level:</span>
                            <div className={`w-3 h-3 rounded-full ${riskColors[strategy.riskLevel]}`}></div>
                            <span className="text-sm font-medium">{strategy.riskLevel}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Target: {strategy.exit?.target} | SL: {strategy.exit?.stopLoss}
                          </div>
                        </div>

                        <Button className="btn-modern w-full">
                          Execute Strategy
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {(!strategies?.strategies || strategies.strategies.length === 0) && (
                  <Card className="glass-effect">
                    <CardContent className="text-center py-8">
                      <Brain className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                      <p className="text-muted-foreground">No active strategies found for {selectedSymbol}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        ChatGPT-based strategies will appear here when market conditions align
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}