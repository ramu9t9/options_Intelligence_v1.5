import { useState } from 'react';
import { Download, Calendar, FileText, Database, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function ExportData() {
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState('2025-01-31');
  const [isExporting, setIsExporting] = useState(false);

  const exportOptions = [
    {
      id: 'option-chain',
      name: 'Option Chain Data',
      description: 'Historical option chain snapshots with OI, volume, and pricing',
      icon: Database,
      size: '~2.5MB',
      format: ['CSV', 'JSON', 'Excel']
    },
    {
      id: 'user-activity',
      name: 'User Activity Logs',
      description: 'Complete user activity tracking and audit trails',
      icon: FileText,
      size: '~1.2MB',
      format: ['CSV', 'JSON']
    },
    {
      id: 'system-metrics',
      name: 'System Performance',
      description: 'CPU, memory, API calls, and system health metrics',
      icon: Settings,
      size: '~500KB',
      format: ['CSV', 'JSON']
    },
    {
      id: 'pattern-analysis',
      name: 'Pattern Detection Results',
      description: 'All detected patterns with confidence scores and alerts',
      icon: Database,
      size: '~3.1MB',
      format: ['CSV', 'JSON', 'Excel']
    }
  ];

  const handleExport = async (dataType: string) => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock CSV data based on type
    let csvData = '';
    let filename = '';
    
    switch (dataType) {
      case 'option-chain':
        csvData = [
          'Timestamp,Symbol,Strike,CallOI,PutOI,CallVolume,PutVolume,CallLTP,PutLTP',
          `${new Date().toISOString()},NIFTY,24600,125000,98000,45000,32000,145.50,89.75`,
          `${new Date().toISOString()},NIFTY,24650,89000,145000,38000,56000,98.25,125.80`
        ].join('\n');
        filename = `option-chain-${dateFrom}-to-${dateTo}.${selectedFormat}`;
        break;
        
      case 'user-activity':
        csvData = [
          'Timestamp,User,Action,Status,IP,Details',
          `${new Date().toISOString()},admin@platform.com,Login,Success,192.168.1.100,Authentication successful`,
          `${new Date().toISOString()},trader@example.com,Strategy Execution,Success,192.168.1.101,Iron Condor executed`
        ].join('\n');
        filename = `user-activity-${dateFrom}-to-${dateTo}.${selectedFormat}`;
        break;
        
      case 'system-metrics':
        csvData = [
          'Timestamp,CPU_Usage,Memory_Usage,API_Calls,Response_Time,Error_Rate',
          `${new Date().toISOString()},45.2,68.7,1247,145,0.5`,
          `${new Date().toISOString()},42.8,71.3,1189,152,0.3`
        ].join('\n');
        filename = `system-metrics-${dateFrom}-to-${dateTo}.${selectedFormat}`;
        break;
        
      case 'pattern-analysis':
        csvData = [
          'Timestamp,Pattern,Symbol,Confidence,Action,Details',
          `${new Date().toISOString()},Gamma Squeeze,NIFTY,85.2,Alert Generated,High call buildup detected`,
          `${new Date().toISOString()},Max Pain,BANKNIFTY,78.9,Alert Generated,Price moving towards max pain level`
        ].join('\n');
        filename = `pattern-analysis-${dateFrom}-to-${dateTo}.${selectedFormat}`;
        break;
    }
    
    // Create and download file
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setIsExporting(false);
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Data Export Center</h2>
        </div>
        <Badge className="bg-blue-600/70 text-white text-xs">
          Admin Only
        </Badge>
      </div>

      {/* Export Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            From Date
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-black/30 border-white/10 text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            To Date
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-black/30 border-white/10 text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Format
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full bg-black/30 border border-white/10 text-white rounded-md px-3 py-2"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="xlsx">Excel</option>
          </select>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-white/90 mb-4">Available Data Sets</h3>
        
        {exportOptions.map((option) => (
          <div 
            key={option.id}
            className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <option.icon className="h-5 w-5 text-blue-400" />
                </div>
                
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">{option.name}</h4>
                  <p className="text-white/60 text-sm mb-2">{option.description}</p>
                  
                  <div className="flex items-center space-x-4 text-xs">
                    <span className="text-white/50">Est. Size: {option.size}</span>
                    <div className="flex space-x-1">
                      {option.format.map((fmt) => (
                        <Badge 
                          key={fmt}
                          className="bg-gray-600/50 text-white text-xs px-2 py-1"
                        >
                          {fmt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => handleExport(option.id)}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Export Summary */}
      <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
        <h4 className="text-white font-medium mb-2">Export Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-white/60">Date Range:</span>
            <div className="text-white font-mono">{dateFrom} to {dateTo}</div>
          </div>
          <div>
            <span className="text-white/60">Format:</span>
            <div className="text-white font-medium">{selectedFormat.toUpperCase()}</div>
          </div>
          <div>
            <span className="text-white/60">Compression:</span>
            <div className="text-white">Enabled (ZIP)</div>
          </div>
        </div>
      </div>
    </div>
  );
}