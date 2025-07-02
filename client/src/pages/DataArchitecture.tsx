import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Server, Clock, BarChart3, Activity, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

interface DataSource {
  name: string;
  isActive: boolean;
  lastSuccessfulFetch: string | null;
  successRate: number;
  avgResponseTime: number;
  priority: number;
}

interface HistoricalData {
  symbol: string;
  tradingDate: string;
  openPrice: string;
  closePrice: string;
  volume: number;
  dataSource: string;
  timeframe: string;
}

export default function DataArchitecture() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [currentSource, setCurrentSource] = useState<string>('');
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [yesterdayOI, setYesterdayOI] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDataSourceStatus();
    fetchSampleHistoricalData();
    fetchYesterdayOI();
  }, []);

  const fetchDataSourceStatus = async () => {
    try {
      const response = await fetch('/api/admin/data-sources');
      const result = await response.json();
      if (result.success) {
        setDataSources(result.sources);
        setCurrentSource(result.currentSource);
      }
    } catch (error) {
      console.error('Error fetching data sources:', error);
    }
  };

  const fetchSampleHistoricalData = async () => {
    try {
      const response = await fetch('/api/admin/historical-data/NIFTY?timeframe=1DAY');
      const result = await response.json();
      if (result.success) {
        setHistoricalData(result.data.slice(0, 5)); // Show last 5 days
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const fetchYesterdayOI = async () => {
    try {
      const response = await fetch('/api/admin/yesterday-oi/NIFTY');
      const result = await response.json();
      if (result.success) {
        setYesterdayOI(result.data.slice(0, 10)); // Show first 10 strikes
      }
    } catch (error) {
      console.error('Error fetching yesterday OI:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchDataSource = async (sourceName: string) => {
    try {
      const response = await fetch('/api/admin/switch-data-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceName })
      });
      
      if (response.ok) {
        setCurrentSource(sourceName);
        await fetchDataSourceStatus();
      }
    } catch (error) {
      console.error('Error switching data source:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Data Architecture Overview</h1>
          <p className="text-gray-600">Comprehensive data management strategy for historical and real-time market data</p>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Current Status:</strong> The platform currently uses {currentSource === 'mock' ? 'mock data' : 'live Angel One API data'} 
          {currentSource === 'mock' && ' due to authentication issues. Configure Angel One credentials to enable live data.'}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Architecture Overview</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Tables</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7</div>
                <p className="text-xs text-muted-foreground">Historical & Real-time Tables</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dataSources.length}</div>
                <p className="text-xs text-muted-foreground">Configured Providers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collection Frequency</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5s</div>
                <p className="text-xs text-muted-foreground">Real-time Updates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Historical Retention</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">∞</div>
                <p className="text-xs text-muted-foreground">Unlimited Storage</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Data Flow Architecture
              </CardTitle>
              <CardDescription>
                How market data flows from sources to storage and real-time broadcasting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                      <Server className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">Data Sources</span>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">Processing</span>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                      <Database className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium">Storage</span>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium">Broadcasting</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Historical Data Storage:</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• <code>historical_market_data</code> - OHLC data with multiple timeframes</li>
                      <li>• <code>historical_option_chain</code> - Daily OI changes and snapshots</li>
                      <li>• <code>data_source_metrics</code> - Provider reliability tracking</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Real-time Processing:</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• <code>realtime_data_snapshots</code> - Current market state</li>
                      <li>• <code>option_data</code> - Live option chain updates</li>
                      <li>• WebSocket broadcasting every 5 seconds</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Data Sources</CardTitle>
              <CardDescription>
                Current: <Badge variant="outline">{currentSource}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataSources.map((source) => (
                  <div key={source.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {source.isActive ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                        )}
                        <span className="font-medium capitalize">{source.name}</span>
                      </div>
                      <Badge variant={source.isActive ? "default" : "secondary"}>
                        Priority {source.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        Success Rate: <span className="font-medium">{source.successRate.toFixed(1)}%</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Avg Response: <span className="font-medium">{source.avgResponseTime}ms</span>
                      </div>
                      {!source.isActive && (
                        <Button 
                          size="sm" 
                          onClick={() => switchDataSource(source.name)}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Historical Data (NIFTY)</CardTitle>
                <CardDescription>Last 5 days of market data from database</CardDescription>
              </CardHeader>
              <CardContent>
                {historicalData.length > 0 ? (
                  <div className="space-y-3">
                    {historicalData.map((data, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{new Date(data.tradingDate).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-600">Source: {data.dataSource}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{parseFloat(data.closePrice).toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Vol: {data.volume.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No historical data available. Data collection starts when live connections are established.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Yesterday's Open Interest</CardTitle>
                <CardDescription>Sample OI data for comparison with today's values</CardDescription>
              </CardHeader>
              <CardContent>
                {yesterdayOI.length > 0 ? (
                  <div className="space-y-2">
                    {yesterdayOI.map((oi, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 border-b">
                        <span>{oi.strikePrice} {oi.optionType}</span>
                        <span className="font-medium">{oi.openInterest.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No historical OI data available. Enable live data connection to start collection.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historical Data Management Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Cloud Deployment Strategy:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>End-of-Day Collection:</strong> Daily snapshots stored at 3:45 PM market close</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Intraday Snapshots:</strong> 15-minute intervals during market hours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Weekend Processing:</strong> Data validation and backfill operations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Multi-Provider Redundancy:</strong> Automatic failover ensures data continuity</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Data Accuracy & Consistency:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Source Validation:</strong> Cross-reference data from multiple providers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Audit Trail:</strong> Complete data lineage tracking per record</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Quality Metrics:</strong> Success rates and response times monitored</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Anomaly Detection:</strong> Automated alerts for data inconsistencies</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Data Processing</CardTitle>
              <CardDescription>Live market data collection and broadcasting architecture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">5s</div>
                  <div className="text-sm text-gray-600">Market Data Collection</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Activity className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">15min</div>
                  <div className="text-sm text-gray-600">Historical Snapshots</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">1x/Day</div>
                  <div className="text-sm text-gray-600">End-of-Day Archive</div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Real-time OI Tracking Logic:</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">1</div>
                    <div>
                      <div className="font-medium">Live Data Collection</div>
                      <div className="text-sm text-gray-600">Fetch current option chain every 5 seconds during market hours</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">2</div>
                    <div>
                      <div className="font-medium">Change Calculation</div>
                      <div className="text-sm text-gray-600">Compare current OI with previous snapshot to calculate OI changes</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">3</div>
                    <div>
                      <div className="font-medium">Historical Comparison</div>
                      <div className="text-sm text-gray-600">Calculate day-over-day changes using yesterday's end-of-day OI data</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">4</div>
                    <div>
                      <div className="font-medium">Pattern Detection</div>
                      <div className="text-sm text-gray-600">Analyze OI changes for buildup patterns and unusual activity</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">5</div>
                    <div>
                      <div className="font-medium">WebSocket Broadcasting</div>
                      <div className="text-sm text-gray-600">Distribute updates to all connected clients in real-time</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}