import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Smartphone, 
  Moon, 
  Sun, 
  Monitor,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Profile Settings
  const [profile, setProfile] = useState({
    firstName: 'Trading',
    lastName: 'User',
    email: 'demo@options.com',
    phone: '+91 9876543210',
    tradingExperience: 'intermediate',
    riskTolerance: 'moderate'
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    smsAlerts: false,
    priceAlerts: true,
    patternAlerts: true,
    systemUpdates: true,
    marketOpenClose: true
  });

  // Trading Settings
  const [trading, setTrading] = useState({
    defaultSymbol: 'NIFTY',
    refreshInterval: '5',
    maxPositions: '10',
    stopLoss: '2',
    targetProfit: '5',
    autoRefresh: true,
    showGreeks: true,
    darkMode: 'dark'
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Profile Updated",
        description: "Your profile settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTrading = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Trading Settings Updated",
        description: "Your trading preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update trading settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Settings
            </h1>
            <p className="text-slate-300 mt-1">
              Customize your Options Intelligence Platform experience
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-green-400 border-green-400">
              <CheckCircle className="w-3 h-3 mr-1" />
              VIP Account
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 backdrop-blur-sm">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="trading" className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Trading</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                      <Input
                        id="firstName"
                        value={profile.firstName}
                        onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profile.lastName}
                        onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Profile
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Trading Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Trading Experience</Label>
                    <Select value={profile.tradingExperience} onValueChange={(value) => setProfile({...profile, tradingExperience: value})}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                        <SelectItem value="advanced">Advanced (5+ years)</SelectItem>
                        <SelectItem value="professional">Professional Trader</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Risk Tolerance</Label>
                    <Select value={profile.riskTolerance} onValueChange={(value) => setProfile({...profile, riskTolerance: value})}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="mt-6">
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Alert Channels</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Email Alerts</Label>
                        <Switch
                          checked={notifications.emailAlerts}
                          onCheckedChange={(checked) => setNotifications({...notifications, emailAlerts: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Push Notifications</Label>
                        <Switch
                          checked={notifications.pushNotifications}
                          onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">SMS Alerts</Label>
                        <Switch
                          checked={notifications.smsAlerts}
                          onCheckedChange={(checked) => setNotifications({...notifications, smsAlerts: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Alert Types</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Price Alerts</Label>
                        <Switch
                          checked={notifications.priceAlerts}
                          onCheckedChange={(checked) => setNotifications({...notifications, priceAlerts: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Pattern Alerts</Label>
                        <Switch
                          checked={notifications.patternAlerts}
                          onCheckedChange={(checked) => setNotifications({...notifications, patternAlerts: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">System Updates</Label>
                        <Switch
                          checked={notifications.systemUpdates}
                          onCheckedChange={(checked) => setNotifications({...notifications, systemUpdates: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Market Open/Close</Label>
                        <Switch
                          checked={notifications.marketOpenClose}
                          onCheckedChange={(checked) => setNotifications({...notifications, marketOpenClose: checked})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-600" />

                <Button 
                  onClick={handleSaveNotifications} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Settings */}
          <TabsContent value="trading" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>Trading Defaults</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Default Symbol</Label>
                    <Select value={trading.defaultSymbol} onValueChange={(value) => setTrading({...trading, defaultSymbol: value})}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIFTY">NIFTY</SelectItem>
                        <SelectItem value="BANKNIFTY">BANKNIFTY</SelectItem>
                        <SelectItem value="FINNIFTY">FINNIFTY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="refreshInterval" className="text-slate-300">Refresh Interval (seconds)</Label>
                    <Input
                      id="refreshInterval"
                      value={trading.refreshInterval}
                      onChange={(e) => setTrading({...trading, refreshInterval: e.target.value})}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPositions" className="text-slate-300">Max Positions</Label>
                    <Input
                      id="maxPositions"
                      value={trading.maxPositions}
                      onChange={(e) => setTrading({...trading, maxPositions: e.target.value})}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Risk Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stopLoss" className="text-slate-300">Default Stop Loss (%)</Label>
                    <Input
                      id="stopLoss"
                      value={trading.stopLoss}
                      onChange={(e) => setTrading({...trading, stopLoss: e.target.value})}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetProfit" className="text-slate-300">Default Target Profit (%)</Label>
                    <Input
                      id="targetProfit"
                      value={trading.targetProfit}
                      onChange={(e) => setTrading({...trading, targetProfit: e.target.value})}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Auto Refresh</Label>
                      <Switch
                        checked={trading.autoRefresh}
                        onCheckedChange={(checked) => setTrading({...trading, autoRefresh: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Show Greeks</Label>
                      <Switch
                        checked={trading.showGreeks}
                        onCheckedChange={(checked) => setTrading({...trading, showGreeks: checked})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <Button 
                  onClick={handleSaveTrading} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Trading Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Account Security</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-700">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300">Two-Factor Authentication</span>
                      </div>
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        Enabled
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">Password Strength</span>
                      </div>
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        Strong
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">Login Sessions</span>
                      </div>
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        2 Active
                      </Badge>
                    </div>
                  </div>

                  <Separator className="bg-slate-600" />

                  <div className="space-y-2">
                    <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                      Manage Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Data & Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300">Data Export</span>
                      <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                        Download
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300">Trading History</span>
                      <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                        Export
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-700">
                      <span className="text-slate-300">Delete Account</span>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}