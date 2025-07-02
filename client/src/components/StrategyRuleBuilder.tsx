import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

export interface StrategyRule {
  id: string;
  field: string;
  operator: string;
  value: number;
}

interface StrategyRuleBuilderProps {
  rules: StrategyRule[];
  onChange: (rules: StrategyRule[]) => void;
}

const FIELDS = [
  { value: 'OI', label: 'Open Interest' },
  { value: 'PCR', label: 'Put-Call Ratio' },
  { value: 'IV', label: 'Implied Volatility' },
  { value: 'Price', label: 'Price' },
  { value: 'Volume', label: 'Volume' },
  { value: 'Delta', label: 'Delta' },
  { value: 'Gamma', label: 'Gamma' },
  { value: 'Theta', label: 'Theta' }
];

const OPERATORS = [
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
  { value: '>=', label: 'Greater than or equal' },
  { value: '<=', label: 'Less than or equal' },
  { value: '==', label: 'Equal to' },
  { value: '!=', label: 'Not equal to' }
];

export function StrategyRuleBuilder({ rules, onChange }: StrategyRuleBuilderProps) {
  console.log('StrategyRuleBuilder render - rules:', rules, 'rules.length:', rules.length);
  
  const addRule = () => {
    const newRule: StrategyRule = {
      id: Date.now().toString(),
      field: 'OI',
      operator: '>',
      value: 0
    };
    console.log('Adding new rule:', newRule);
    const newRules = [...rules, newRule];
    console.log('New rules array:', newRules);
    onChange(newRules);
  };

  const updateRule = (id: string, field: keyof StrategyRule, value: any) => {
    const updatedRules = rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    );
    console.log('updateRule calling onChange with:', updatedRules);
    onChange(updatedRules);
  };

  const removeRule = (id: string) => {
    const filteredRules = rules.filter(rule => rule.id !== id);
    onChange(filteredRules);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Strategy Rules
          <Button onClick={addRule} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Condition
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No rules defined. Click "Add Condition" to create your first rule.
          </div>
        ) : (
          rules.map((rule, index) => (
            <div key={rule.id} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
              {index > 0 && (
                <div className="text-sm font-medium text-muted-foreground">AND</div>
              )}
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  value={rule.field}
                  onValueChange={(value) => updateRule(rule.id, 'field', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELDS.map(field => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={rule.operator}
                  onValueChange={(value) => updateRule(rule.id, 'operator', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(operator => (
                      <SelectItem key={operator.value} value={operator.value}>
                        {operator.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, 'value', parseFloat(e.target.value) || 0)}
                  placeholder="Value"
                  className="w-full"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeRule(rule.id)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}

        {rules.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Rule Preview:</h4>
            <code className="text-sm">
              {rules.map((rule, index) => (
                <span key={rule.id}>
                  {index > 0 && ' AND '}
                  {rule.field} {rule.operator} {rule.value}
                </span>
              ))}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}