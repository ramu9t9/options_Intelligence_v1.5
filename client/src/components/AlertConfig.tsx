import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Webhook, Smartphone, Trash2, Plus } from 'lucide-react';

export interface AlertConfig {
  id: string;
  type: string;
  targetValue: number;
  channels: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  enabled: boolean;
}

interface AlertConfigProps {
  alerts: AlertConfig[];
  onChange: (alerts: AlertConfig[]) => void;
}

const ALERT_TYPES = [
  { value: 'price', label: 'Price Movement' },
  { value: 'oi', label: 'Open Interest Change' },
  { value: 'pcr', label: 'Put-Call Ratio' },
  { value: 'volume', label: 'Volume Spike' },
  { value: 'pattern', label: 'Pattern Detection' },
  { value: 'iv', label: 'Implied Volatility' }
];

const ALERT_CHANNELS = [
  { value: 'in-app', label: 'In-App', icon: Bell },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'webhook', label: 'Webhook', icon: Webhook },
  { value: 'push', label: 'Push Notification', icon: Smartphone }
];

const PRIORITIES = [
  { value: 'HIGH', label: 'High Priority', color: 'destructive' },
  { value: 'MEDIUM', label: 'Medium Priority', color: 'default' },
  { value: 'LOW', label: 'Low Priority', color: 'secondary' }
] as const;

export function AlertConfig({ alerts, onChange }: AlertConfigProps) {
  const addAlert = () => {
    const newAlert: AlertConfig = {
      id: Date.now().toString(),
      type: 'price',
      targetValue: 0,
      channels: ['in-app'],
      priority: 'MEDIUM',
      enabled: true
    };
    onChange([...alerts, newAlert]);
  };

  const updateAlert = (id: string, field: keyof AlertConfig, value: any) => {
    const updatedAlerts = alerts.map(alert => 
      alert.id === id ? { ...alert, [field]: value } : alert
    );
    onChange(updatedAlerts);
  };

  const removeAlert = (id: string) => {
    const filteredAlerts = alerts.filter(alert => alert.id !== id);
    onChange(filteredAlerts);
  };

  const toggleChannel = (alertId: string, channel: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    const currentChannels = alert.channels;
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];

    updateAlert(alertId, 'channels', newChannels);
  };

  const getPriorityColor = (priority: string) => {
    const priorityConfig = PRIORITIES.find(p => p.value === priority);
    return priorityConfig?.color || 'default';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Alert Configuration
          <Button onClick={addAlert} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Alert
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No alerts configured. Click "Add Alert" to create your first alert.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="border rounded-lg p-4 space-y-4 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={alert.enabled}
                    onCheckedChange={(checked) => updateAlert(alert.id, 'enabled', checked)}
                  />
                  <Label className="font-medium">Alert #{alert.id.slice(-4)}</Label>
                  <Badge variant={getPriorityColor(alert.priority)}>
                    {alert.priority}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeAlert(alert.id)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Alert Type</Label>
                  <Select
                    value={alert.type}
                    onValueChange={(value) => updateAlert(alert.id, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Target Value</Label>
                  <Input
                    type="number"
                    value={alert.targetValue}
                    onChange={(e) => updateAlert(alert.id, 'targetValue', parseFloat(e.target.value) || 0)}
                    placeholder="Enter threshold"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select
                    value={alert.priority}
                    onValueChange={(value) => updateAlert(alert.id, 'priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Notification Channels</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ALERT_CHANNELS.map(channel => {
                    const Icon = channel.icon;
                    const isSelected = alert.channels.includes(channel.value);
                    
                    return (
                      <div
                        key={channel.value}
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleChannel(alert.id, channel.value)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}} // Handled by div click
                        />
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{channel.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {alerts.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Alert Summary:</h4>
            <div className="space-y-1 text-sm">
              <div>Total Alerts: {alerts.length}</div>
              <div>Active Alerts: {alerts.filter(a => a.enabled).length}</div>
              <div>High Priority: {alerts.filter(a => a.priority === 'HIGH').length}</div>
              <div>Channels Used: {Array.from(new Set(alerts.flatMap(a => a.channels))).join(', ')}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}