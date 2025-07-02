import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Plus, Play, Save, Trash2, Eye, Target, Zap, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface StrategyCondition {
  field: string;
  operator: string;
  value: number | string;
  instrument?: string;
}

interface StrategyRules {
  conditions: StrategyCondition[];
  logic: 'AND' | 'OR';
}

interface Strategy {
  id: number;
  name: string;
  description: string;
  rulesJson: StrategyRules;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionResult {
  matches: Array<{
    instrument: string;
    strike?: number;
    callOI?: number;
    putOI?: number;
    confidence: number;
    [key: string]: any;
  }>;
  executionTime: number;
  timestamp: string;
}

const FIELD_OPTIONS = [
  { value: 'callOI', label: 'Call Open Interest', description: 'Total call option open interest' },
  { value: 'putOI', label: 'Put Open Interest', description: 'Total put option open interest' },
  { value: 'callOIChange', label: 'Call OI Change', description: 'Change in call open interest' },
  { value: 'putOIChange', label: 'Put OI Change', description: 'Change in put open interest' },
  { value: 'callLTP', label: 'Call LTP', description: 'Call option last traded price' },
  { value: 'putLTP', label: 'Put LTP', description: 'Put option last traded price' },
  { value: 'callVolume', label: 'Call Volume', description: 'Call option trading volume' },
  { value: 'putVolume', label: 'Put Volume', description: 'Put option trading volume' },
  { value: 'pcr', label: 'Put-Call Ratio', description: 'Put to call ratio' },
  { value: 'spotPrice', label: 'Spot Price', description: 'Current underlying price' }
];

const OPERATOR_OPTIONS = [
  { value: 'greater_than', label: '>', description: 'Greater than' },
  { value: 'less_than', label: '<', description: 'Less than' },
  { value: 'greater_than_equal', label: '≥', description: 'Greater than or equal' },
  { value: 'less_than_equal', label: '≤', description: 'Less than or equal' },
  { value: 'equal', label: '=', description: 'Equal to' },
  { value: 'not_equal', label: '≠', description: 'Not equal to' }
];

const INSTRUMENT_OPTIONS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];

export default function StrategyBuilder() {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: { conditions: [], logic: 'AND' as 'AND' | 'OR' }
  });
  const [executionResults, setExecutionResults] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch strategies
  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ['/api/strategies'],
    retry: false
  });

  // Create strategy mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('/api/strategies', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      setIsCreating(false);
      setFormData({ name: '', description: '', rules: { conditions: [], logic: 'AND' } });
      toast({ title: 'Success', description: 'Strategy created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to create strategy', variant: 'destructive' });
    }
  });

  // Update strategy mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/strategies/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      toast({ title: 'Success', description: 'Strategy updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to update strategy', variant: 'destructive' });
    }
  });

  // Delete strategy mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/strategies/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      setSelectedStrategy(null);
      toast({ title: 'Success', description: 'Strategy deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to delete strategy', variant: 'destructive' });
    }
  });

  // Execute strategy mutation
  const executeMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/strategies/${id}/execute`, 'POST'),
    onSuccess: (data) => {
      setExecutionResults(data);
      setIsExecuting(false);
      toast({ title: 'Success', description: `Strategy executed - ${data.matches.length} matches found` });
    },
    onError: (error) => {
      setIsExecuting(false);
      toast({ title: 'Error', description: 'Failed to execute strategy', variant: 'destructive' });
    }
  });

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: [
          ...prev.rules.conditions,
          { field: 'callOI', operator: 'greater_than', value: 0, instrument: 'NIFTY' }
        ]
      }
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: prev.rules.conditions.filter((_, i) => i !== index)
      }
    }));
  };

  const updateCondition = (index: number, field: keyof StrategyCondition, value: any) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: prev.rules.conditions.map((condition, i) => 
          i === index ? { ...condition, [field]: value } : condition
        )
      }
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Strategy name is required', variant: 'destructive' });
      return;
    }

    if (formData.rules.conditions.length === 0) {
      toast({ title: 'Error', description: 'At least one condition is required', variant: 'destructive' });
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      rulesJson: formData.rules
    };

    if (selectedStrategy) {
      updateMutation.mutate({ id: selectedStrategy.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const executeStrategy = (strategy: Strategy) => {
    setIsExecuting(true);
    executeMutation.mutate(strategy.id);
  };

  const loadStrategy = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setFormData({
      name: strategy.name,
      description: strategy.description,
      rules: strategy.rulesJson
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setSelectedStrategy(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', rules: { conditions: [], logic: 'AND' } });
    setExecutionResults(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Strategy Builder</h1>
              <p className="text-slate-300">Create and test custom trading strategies with real-time market data</p>
            </div>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Strategy
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Strategy List */}
          <Card className="lg:col-span-1 bg-slate-900/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-400" />
                Your Strategies
              </CardTitle>
              <CardDescription className="text-slate-300">
                {strategies.length} strategies created
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {strategies.map((strategy: Strategy) => (
                <div 
                  key={strategy.id}
                  className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => loadStrategy(strategy)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{strategy.name}</h3>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          executeStrategy(strategy);
                        }}
                        disabled={isExecuting}
                        className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(strategy.id);
                        }}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{strategy.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {strategy.rulesJson.conditions.length} conditions
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(strategy.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              
              {strategies.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No strategies created yet</p>
                  <p className="text-sm">Click "New Strategy" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategy Builder Form */}
          <div className="lg:col-span-2 space-y-6">
            {isCreating ? (
              <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-purple-400" />
                    {selectedStrategy ? 'Edit Strategy' : 'Create New Strategy'}
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Design your custom trading strategy with visual rule builder
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">Strategy Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., High OI Call Strategy"
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logic" className="text-white">Logic Type</Label>
                      <Select 
                        value={formData.rules.logic} 
                        onValueChange={(value: 'AND' | 'OR') => 
                          setFormData(prev => ({ ...prev, rules: { ...prev.rules, logic: value } }))
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND (All conditions must match)</SelectItem>
                          <SelectItem value="OR">OR (Any condition can match)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-white">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your strategy..."
                      className="bg-slate-800 border-slate-600 text-white"
                      rows={3}
                    />
                  </div>

                  {/* Conditions Builder */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-white text-lg">Strategy Conditions</Label>
                      <Button 
                        onClick={addCondition}
                        variant="outline"
                        size="sm"
                        className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Condition
                      </Button>
                    </div>

                    {formData.rules.conditions.map((condition, index) => (
                      <Card key={index} className="bg-slate-800/50 border-slate-600">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-blue-400">
                              Condition {index + 1}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCondition(index)}
                              className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="space-y-2">
                              <Label className="text-white text-sm">Instrument</Label>
                              <Select 
                                value={condition.instrument || 'NIFTY'} 
                                onValueChange={(value) => updateCondition(index, 'instrument', value)}
                              >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {INSTRUMENT_OPTIONS.map(instrument => (
                                    <SelectItem key={instrument} value={instrument}>
                                      {instrument}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white text-sm">Field</Label>
                              <Select 
                                value={condition.field} 
                                onValueChange={(value) => updateCondition(index, 'field', value)}
                              >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_OPTIONS.map(field => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white text-sm">Operator</Label>
                              <Select 
                                value={condition.operator} 
                                onValueChange={(value) => updateCondition(index, 'operator', value)}
                              >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OPERATOR_OPTIONS.map(op => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label} {op.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white text-sm">Value</Label>
                              <Input
                                type="number"
                                value={condition.value}
                                onChange={(e) => updateCondition(index, 'value', parseFloat(e.target.value) || 0)}
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="mt-3 p-3 bg-slate-700/50 rounded text-sm text-slate-300">
                            <strong>Rule:</strong> {condition.instrument || 'NIFTY'} {
                              FIELD_OPTIONS.find(f => f.value === condition.field)?.label || condition.field
                            } {
                              OPERATOR_OPTIONS.find(o => o.value === condition.operator)?.label || condition.operator
                            } {condition.value}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {formData.rules.conditions.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-600 rounded-lg">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                        <p className="text-slate-400">No conditions added yet</p>
                        <p className="text-sm text-slate-500">Click "Add Condition" to create your first rule</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={resetForm}
                      className="border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {selectedStrategy ? 'Update' : 'Create'} Strategy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Welcome Screen */
              <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <Target className="w-24 h-24 mx-auto mb-6 text-blue-400 opacity-50" />
                  <h2 className="text-2xl font-bold text-white mb-4">Welcome to Strategy Builder</h2>
                  <p className="text-slate-300 mb-8 max-w-md mx-auto">
                    Create powerful custom trading strategies using our visual rule builder. 
                    Test your strategies against live market data and optimize your trading approach.
                  </p>
                  <Button 
                    onClick={() => setIsCreating(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Strategy
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Execution Results */}
            {executionResults && (
              <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-green-400" />
                    Execution Results
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Strategy executed in {executionResults.executionTime}ms - {executionResults.matches.length} matches found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {executionResults.matches.length > 0 ? (
                    <div className="grid gap-4">
                      {executionResults.matches.map((match, index) => (
                        <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-white">{match.instrument}</span>
                            <Badge 
                              variant="outline" 
                              className={`${
                                match.confidence > 0.8 ? 'border-green-500 text-green-400' :
                                match.confidence > 0.6 ? 'border-yellow-500 text-yellow-400' :
                                'border-red-500 text-red-400'
                              }`}
                            >
                              {Math.round(match.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {Object.entries(match).filter(([key]) => key !== 'confidence' && key !== 'instrument').map(([key, value]) => (
                              <div key={key} className="text-slate-300">
                                <span className="text-slate-500">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No matches found for this strategy</p>
                      <p className="text-sm">Try adjusting your conditions and run again</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}