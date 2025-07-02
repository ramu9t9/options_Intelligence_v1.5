import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StrategyRuleBuilder, type StrategyRule } from '@/components/StrategyRuleBuilder';
import { AlertConfig, type AlertConfig as AlertConfigType } from '@/components/AlertConfig';
import { StrategyList } from '@/components/StrategyList';
import { EvaluateStrategy } from '@/components/EvaluateStrategy';
import { Settings, Play, List, Bell, Save, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function StrategyBuilder() {
  const [rules, setRules] = useState<StrategyRule[]>([]);
  const [alerts, setAlerts] = useState<AlertConfigType[]>([]);
  const [activeTab, setActiveTab] = useState('builder');
  const { toast } = useToast();

  console.log('StrategyBuilder render - rules:', rules, 'rules.length:', rules.length);
  
  const handleRulesChange = (newRules: StrategyRule[]) => {
    console.log('handleRulesChange called with:', newRules);
    setRules(newRules);
    console.log('setRules called, new rules should be:', newRules);
  };

  const handleSaveDraft = () => {
    if (rules.length === 0) {
      toast({
        title: "No Rules Defined",
        description: "Add at least one rule before saving a draft.",
        variant: "destructive"
      });
      return;
    }

    // Save to localStorage as draft
    const draft = {
      rules,
      alerts,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('strategy-draft', JSON.stringify(draft));
    
    toast({
      title: "Draft Saved",
      description: "Your strategy draft has been saved. You can continue working on it later.",
    });
  };

  const handleNextToTest = () => {
    console.log('Next button clicked, rules:', rules);
    if (rules.length === 0) {
      toast({
        title: "No Rules to Test",
        description: "Add at least one rule before testing the strategy.",
        variant: "destructive"
      });
      return;
    }
    console.log('Switching to test tab');
    setActiveTab('test');
    toast({
      title: "Navigated to Test",
      description: "You can now test your strategy rules.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Strategy Builder</h1>
        <p className="text-gray-400">Create, test, and manage your trading strategies</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="strategies" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            My Strategies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <StrategyRuleBuilder rules={rules} onChange={handleRulesChange} />
            </CardContent>
          </Card>
          
          {/* Action Buttons for Builder Tab */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="gap-2"
                  disabled={rules.length === 0}
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </Button>
                <Button
                  onClick={handleNextToTest}
                  className="gap-2"
                  disabled={rules.length === 0}
                >
                  <ArrowRight className="w-4 h-4" />
                  Next: Test Strategy
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertConfig alerts={alerts} onChange={setAlerts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <EvaluateStrategy rules={rules} />
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <StrategyList />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}