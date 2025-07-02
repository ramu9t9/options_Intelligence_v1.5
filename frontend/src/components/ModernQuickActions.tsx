import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Database,
  Zap,
  AlertTriangle
} from 'lucide-react';

interface MarketTypeSelectionProps {
  onMarketTypeChange: (type: 'equity' | 'commodity') => void;
  selectedType: 'equity' | 'commodity';
}

function MarketTypeSelection({ onMarketTypeChange, selectedType }: MarketTypeSelectionProps) {
  return (
    <Card className="card-modern">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          Market Type Selection
        </CardTitle>
        <p className="text-sm text-muted-foreground">Choose your market category for analysis</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
            <Database className="h-3 w-3 mr-1" />
            Mock Data
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            className="btn-modern text-xs px-3 py-1"
          >
            Switch to Live
          </Button>
        </div>

        <div className="space-y-3">
          <div 
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all glass-effect ${
              selectedType === 'equity' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-slate-600/50 hover:border-slate-500/50'
            }`}
            onClick={() => onMarketTypeChange('equity')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Equity Indices</h3>
                <p className="text-xs text-slate-400">Nifty, Bank Nifty & Index Options</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-400">09:15 AM - 03:30 PM IST</span>
                </div>
              </div>
            </div>
          </div>

          <div 
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all glass-effect ${
              selectedType === 'commodity' 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-slate-600/50 hover:border-slate-500/50'
            }`}
            onClick={() => onMarketTypeChange('commodity')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Activity className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Commodity Futures</h3>
                <p className="text-xs text-slate-400">Gold, Silver, Crude Oil & Natural Gas</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs text-yellow-400">09:00 AM - 11:30 PM IST</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface HistoricalReplayControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: string) => void;
}

function HistoricalReplayControls({ isPlaying, onPlayPause, onRestart, onSpeedChange }: HistoricalReplayControlsProps) {
  return (
    <Card className="card-modern">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-orange-400">Historical Replay Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPlayPause}
            className="btn-modern px-3"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRestart}
            className="btn-modern px-3"
          >
            <RotateCcw className="h-3 w-3" />
            Restart
          </Button>
          
          <select 
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
            onChange={(e) => onSpeedChange(e.target.value)}
          >
            <option value="1x">1x</option>
            <option value="2x">2x</option>
            <option value="5x">5x</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

interface InstrumentSelectorProps {
  selectedInstruments: string[];
  availableInstruments: Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    isActive: boolean;
  }>;
  onInstrumentToggle: (symbol: string) => void;
}

function InstrumentSelector({ selectedInstruments, availableInstruments, onInstrumentToggle }: InstrumentSelectorProps) {
  return (
    <Card className="card-modern">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Equity Instruments
          </CardTitle>
          <div className="text-right">
            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
              Historical Data Mode Active
            </Badge>
            <div className="text-xs text-slate-400 mt-1">
              {selectedInstruments.length} Selected • {availableInstruments.length} Available
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-400">Choose an instrument for analysis</p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-orange-400">Historical Data Mode Active</span>
          </div>
          <p className="text-xs text-orange-300 mt-1">Using mock data for testing and analysis</p>
          <Badge variant="outline" className="mt-2 bg-slate-800 text-slate-300 border-slate-600">
            MOCK
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableInstruments.map((instrument) => (
            <div
              key={instrument.symbol}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all glass-effect ${
                selectedInstruments.includes(instrument.symbol)
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600/50 hover:border-slate-500/50'
              }`}
              onClick={() => onInstrumentToggle(instrument.symbol)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">{instrument.symbol}</h3>
                  <p className="text-xs text-slate-400">{instrument.name}</p>
                </div>
                {selectedInstruments.includes(instrument.symbol) && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <div className="text-lg font-bold text-white">
                  ₹{instrument.price.toLocaleString()}
                </div>
                <div className={`text-xs flex items-center gap-1 ${
                  instrument.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  {instrument.change >= 0 ? '+' : ''}{instrument.change.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">Selected for analysis:</p>
          <Badge variant="outline" className="mt-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
            {selectedInstruments[0] || 'None'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ModernQuickActions() {
  const [selectedMarketType, setSelectedMarketType] = useState<'equity' | 'commodity'>('equity');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState(['NIFTY']);

  const availableInstruments = [
    { symbol: 'NIFTY', name: 'NIFTY 50', price: 19523.45, change: 0.68, isActive: true },
    { symbol: 'BANKNIFTY', name: 'BANK NIFTY', price: 45287.30, change: -0.42, isActive: true },
    { symbol: 'FINNIFTY', name: 'FIN NIFTY', price: 18234.75, change: 1.25, isActive: true },
  ];

  const handleInstrumentToggle = (symbol: string) => {
    setSelectedInstruments([symbol]); // Single selection for now
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: string) => {
    console.log('Speed changed to:', speed);
  };

  return (
    <div className="space-y-6">
      <MarketTypeSelection
        selectedType={selectedMarketType}
        onMarketTypeChange={setSelectedMarketType}
      />
      
      <HistoricalReplayControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onRestart={handleRestart}
        onSpeedChange={handleSpeedChange}
      />

      {selectedMarketType === 'equity' && (
        <InstrumentSelector
          selectedInstruments={selectedInstruments}
          availableInstruments={availableInstruments}
          onInstrumentToggle={handleInstrumentToggle}
        />
      )}

      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="btn-modern w-full">
            Create Alert
          </Button>
          <Button className="btn-modern w-full">
            AI Insights
          </Button>
          <Button className="btn-modern w-full">
            Export Data
          </Button>
          <Button className="btn-modern w-full">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}