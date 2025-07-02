import { useState } from 'react';
import { Search, Filter, Download, User, Clock, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  ip: string;
  status: 'success' | 'warning' | 'error';
  details: string;
}

export function UserActivityLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Mock activity data
  const mockLogs: ActivityLog[] = [
    {
      id: '1',
      user: 'admin@platform.com',
      action: 'User Login',
      timestamp: '2025-01-01 12:23:45',
      ip: '192.168.1.100',
      status: 'success',
      details: 'Successful authentication'
    },
    {
      id: '2',
      user: 'trader@example.com',
      action: 'Strategy Execution',
      timestamp: '2025-01-01 12:22:15',
      ip: '192.168.1.101',
      status: 'success',
      details: 'Iron Condor strategy executed on NIFTY'
    },
    {
      id: '3',
      user: 'analyst@firm.com',
      action: 'Pattern Detection',
      timestamp: '2025-01-01 12:20:30',
      ip: '192.168.1.102',
      status: 'warning',
      details: 'Gamma squeeze pattern detected with low confidence'
    },
    {
      id: '4',
      user: 'user@trading.com',
      action: 'API Access',
      timestamp: '2025-01-01 12:18:45',
      ip: '192.168.1.103',
      status: 'error',
      details: 'Rate limit exceeded'
    },
    {
      id: '5',
      user: 'pro@trader.com',
      action: 'Data Export',
      timestamp: '2025-01-01 12:15:20',
      ip: '192.168.1.104',
      status: 'success',
      details: 'CSV export of option chain data'
    }
  ];

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || log.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600/70 text-white text-xs">Success</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-600/70 text-white text-xs">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-600/70 text-white text-xs">Error</Badge>;
      default:
        return <Badge className="bg-gray-600/70 text-white text-xs">Unknown</Badge>;
    }
  };

  const exportLogs = () => {
    const csv = [
      'Timestamp,User,Action,Status,IP,Details',
      ...filteredLogs.map(log => 
        `${log.timestamp},${log.user},${log.action},${log.status},${log.ip},"${log.details}"`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 overflow-x-auto">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">User Activity Logs</h2>
        </div>
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black/30 border-white/10 text-white placeholder:text-white/50 w-64"
            />
          </div>
          
          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-black/30 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          
          {/* Export */}
          <Button
            onClick={exportLogs}
            className="bg-white/10 hover:bg-white/20 text-white border-white/10"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-white/90">
          <thead className="bg-white/10">
            <tr>
              <th className="p-3 text-left font-medium">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Timestamp</span>
                </div>
              </th>
              <th className="p-3 text-left font-medium">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>User</span>
                </div>
              </th>
              <th className="p-3 text-left font-medium">Action</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">IP Address</th>
              <th className="p-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, index) => (
              <tr 
                key={log.id} 
                className={index % 2 === 0 ? "bg-black/10" : "bg-white/5"}
              >
                <td className="p-3 font-mono text-xs">{log.timestamp}</td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-600/30 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-purple-400" />
                    </div>
                    <span className="text-sm">{log.user}</span>
                  </div>
                </td>
                <td className="p-3 font-medium">{log.action}</td>
                <td className="p-3">{getStatusBadge(log.status)}</td>
                <td className="p-3 font-mono text-xs">{log.ip}</td>
                <td className="p-3 text-white/70 max-w-xs truncate">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-white/60">
        <span>Showing {filteredLogs.length} of {mockLogs.length} entries</span>
        <span>Real-time activity monitoring</span>
      </div>
    </div>
  );
}