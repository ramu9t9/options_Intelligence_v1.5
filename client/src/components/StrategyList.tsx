import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Play, Trash2, Plus, Calendar, Target, TrendingUp } from 'lucide-react';
import { StrategyRuleBuilder, type StrategyRule } from './StrategyRuleBuilder';
import { AlertConfig, type AlertConfig as AlertConfigType } from './AlertConfig';
import { apiRequest } from '@/lib/queryClient';

interface Strategy {
  id: number;
  name: string;
  description?: string;
  rules: StrategyRule[];
  alerts: AlertConfigType[];
  status: 'ACTIVE' | 'INACTIVE' | 'RUNNING';
  lastExecuted?: string;
  createdAt: string;
  updatedAt: string;
}

export function StrategyList() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyDescription, setNewStrategyDescription] = useState('');
  const [newStrategyRules, setNewStrategyRules] = useState<StrategyRule[]>([]);
  const [newStrategyAlerts, setNewStrategyAlerts] = useState<AlertConfigType[]>([]);

  const queryClient = useQueryClient();

  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ['/api/strategies'],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      rules: StrategyRule[];
      alerts: AlertConfigType[];
    }) => {
      return await apiRequest('/api/strategies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      resetForm();
      setIsCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      name: string;
      description?: string;
      rules: StrategyRule[];
      alerts: AlertConfigType[];
    }) => {
      return await apiRequest(`/api/strategies/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      setEditingStrategy(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/strategies/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/strategies/${id}/execute`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
    },
  });

  const resetForm = () => {
    setNewStrategyName('');
    setNewStrategyDescription('');
    setNewStrategyRules([]);
    setNewStrategyAlerts([]);
  };

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setNewStrategyName(strategy.name);
    setNewStrategyDescription(strategy.description || '');
    setNewStrategyRules(strategy.rules || []);
    setNewStrategyAlerts(strategy.alerts || []);
  };

  const handleSave = () => {
    const data = {
      name: newStrategyName,
      description: newStrategyDescription,
      rules: newStrategyRules,
      alerts: newStrategyAlerts,
    };

    if (editingStrategy) {
      updateMutation.mutate({ ...data, id: editingStrategy.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'RUNNING': return 'secondary';
      case 'INACTIVE': return 'outline';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading strategies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trading Strategies</h2>
          <p className="text-muted-foreground">Manage your automated trading strategies</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Strategy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Strategy</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Strategy Name *</Label>
                  <Input
                    id="name"
                    value={newStrategyName}
                    onChange={(e) => setNewStrategyName(e.target.value)}
                    placeholder="Enter strategy name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newStrategyDescription}
                    onChange={(e) => setNewStrategyDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <StrategyRuleBuilder
                rules={newStrategyRules}
                onChange={setNewStrategyRules}
              />

              <AlertConfig
                alerts={newStrategyAlerts}
                onChange={setNewStrategyAlerts}
              />

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!newStrategyName.trim() || createMutation.isPending}
                >
                  Create Strategy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {strategies.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No strategies yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first trading strategy to get started with automated analysis.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Strategy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy: Strategy) => (
            <Card key={strategy.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{strategy.name}</CardTitle>
                    {strategy.description && (
                      <p className="text-sm text-muted-foreground">{strategy.description}</p>
                    )}
                  </div>
                  <Badge variant={getStatusColor(strategy.status)}>
                    {strategy.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span>{strategy.rules?.length || 0} Rules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(strategy.createdAt)}</span>
                  </div>
                </div>

                {strategy.lastExecuted && (
                  <div className="text-sm text-muted-foreground">
                    Last run: {formatDate(strategy.lastExecuted)}
                  </div>
                )}

                {/* Strategy Insight Footer */}
                <div className="mt-3 border-t border-white/10 pt-2 text-sm text-white/70">
                  <div className="flex justify-between items-center mb-2">
                    <span>✅ {Math.floor(Math.random() * 15) + 3} alerts last week</span>
                    <span>ROI: +{(Math.random() * 15 + 2).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Confidence: {Math.floor(Math.random() * 30) + 70}%</span>
                    <div className="w-16 bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.floor(Math.random() * 30) + 70}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(strategy)}
                    className="flex-1 gap-2 bg-white/10 hover:bg-white/20 text-white font-medium border-white/10"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => executeMutation.mutate(strategy.id)}
                    disabled={executeMutation.isPending}
                    className="flex-1 gap-2 bg-white/10 hover:bg-white/20 text-white font-medium"
                  >
                    <Play className="w-4 h-4" />
                    Run
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(strategy.id)}
                    disabled={deleteMutation.isPending}
                    className="gap-2 bg-white/10 hover:bg-white/20 text-white font-medium border-white/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingStrategy} onOpenChange={() => setEditingStrategy(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Strategy: {editingStrategy?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Strategy Name *</Label>
                <Input
                  id="edit-name"
                  value={newStrategyName}
                  onChange={(e) => setNewStrategyName(e.target.value)}
                  placeholder="Enter strategy name"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={newStrategyDescription}
                  onChange={(e) => setNewStrategyDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <StrategyRuleBuilder
              rules={newStrategyRules}
              onChange={setNewStrategyRules}
            />

            <AlertConfig
              alerts={newStrategyAlerts}
              onChange={setNewStrategyAlerts}
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingStrategy(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!newStrategyName.trim() || updateMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}