import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Plug, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BrokerCredentials {
  brokerType: 'angel-one' | 'dhan';
  clientId: string;
  apiKey: string;
  apiSecret: string;
  pin: string;
  totpKey: string;
}

interface BrokerStatus {
  isConnected: boolean;
  brokerType: string | null;
  lastConnected: Date | null;
}

export default function BrokerSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [credentials, setCredentials] = useState<BrokerCredentials>({
    brokerType: 'angel-one',
    clientId: '',
    apiKey: '',
    apiSecret: '',
    pin: '',
    totpKey: ''
  });

  const [showSecrets, setShowSecrets] = useState({
    apiSecret: false,
    pin: false,
    totpKey: false
  });

  const [isConnecting, setIsConnecting] = useState(false);

  // Query broker status
  const { data: brokerStatus } = useQuery<{ success: boolean; status: BrokerStatus }>({
    queryKey: ['/api/user/broker-status'],
    refetchInterval: 5000
  });

  // Save credentials mutation
  const saveCredentialsMutation = useMutation({
    mutationFn: async (creds: BrokerCredentials) => {
      return await apiRequest('/api/user/broker-credentials', {
        method: 'POST',
        body: JSON.stringify(creds),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Credentials Saved",
        description: "Your broker credentials have been saved securely.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/broker-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save credentials. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Connect to broker mutation
  const connectMutation = useMutation({
    mutationFn: async (brokerType: string) => {
      return await apiRequest('/api/user/broker-connect', {
        method: 'POST',
        body: JSON.stringify({ brokerType }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Connected Successfully",
        description: "You are now connected to your broker. Real market data is now active.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/broker-status'] });
      setIsConnecting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to broker. Please check your credentials.",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/user/broker-disconnect', {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "You have been disconnected from your broker.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/broker-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect from broker.",
        variant: "destructive"
      });
    }
  });

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!credentials.clientId || !credentials.apiKey || !credentials.apiSecret || !credentials.pin || !credentials.totpKey) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    saveCredentialsMutation.mutate(credentials);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    connectMutation.mutate(credentials.brokerType);
  };

  const handleDisconnect = async () => {
    disconnectMutation.mutate();
  };

  const toggleSecretVisibility = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const isConnected = brokerStatus?.status?.isConnected || false;
  const connectedBroker = brokerStatus?.status?.brokerType;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Broker Connection Setup
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your own broker account to access authentic live market data and bypass cloud IP restrictions.
        </p>
      </div>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Connected to {connectedBroker?.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Live market data is active
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-orange-700 dark:text-orange-400">
                      Not Connected
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Using simulated data due to cloud IP restrictions
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {isConnected ? (
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            ) : (
              <Button 
                onClick={handleConnect}
                disabled={isConnecting || connectMutation.isPending || !credentials.clientId}
              >
                {isConnecting || connectMutation.isPending ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Why do I need to provide my own credentials?</strong><br />
          Angel One API blocks cloud server IPs for security. By using your personal API credentials, 
          you'll bypass this restriction and get authentic live market data instead of simulated data.
          Your credentials are encrypted and stored securely.
        </AlertDescription>
      </Alert>

      {/* Credentials Form */}
      <Card>
        <CardHeader>
          <CardTitle>Broker Credentials</CardTitle>
          <CardDescription>
            Enter your broker API credentials. All information is encrypted before storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCredentials} className="space-y-6">
            {/* Broker Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="brokerType">Broker Type</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={credentials.brokerType === 'angel-one' ? 'default' : 'outline'}
                  onClick={() => setCredentials(prev => ({ ...prev, brokerType: 'angel-one' }))}
                  className="flex-1"
                >
                  Angel One (Primary)
                </Button>
                <Button
                  type="button"
                  variant={credentials.brokerType === 'dhan' ? 'default' : 'outline'}
                  onClick={() => setCredentials(prev => ({ ...prev, brokerType: 'dhan' }))}
                  className="flex-1"
                >
                  Dhan (Fallback)
                </Button>
              </div>
            </div>

            <Separator />

            {/* Client ID */}
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="Enter your client ID"
                value={credentials.clientId}
                onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                required
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="text"
                placeholder="Enter your API key"
                value={credentials.apiKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                required
              />
            </div>

            {/* API Secret */}
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <div className="relative">
                <Input
                  id="apiSecret"
                  type={showSecrets.apiSecret ? "text" : "password"}
                  placeholder="Enter your API secret"
                  value={credentials.apiSecret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('apiSecret')}
                >
                  {showSecrets.apiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* PIN */}
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showSecrets.pin ? "text" : "password"}
                  placeholder="Enter your PIN"
                  value={credentials.pin}
                  onChange={(e) => setCredentials(prev => ({ ...prev, pin: e.target.value }))}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('pin')}
                >
                  {showSecrets.pin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* TOTP Key */}
            <div className="space-y-2">
              <Label htmlFor="totpKey">TOTP Secret Key</Label>
              <div className="relative">
                <Input
                  id="totpKey"
                  type={showSecrets.totpKey ? "text" : "password"}
                  placeholder="Enter your TOTP secret key"
                  value={credentials.totpKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, totpKey: e.target.value }))}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('totpKey')}
                >
                  {showSecrets.totpKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This is the secret key for generating TOTP codes, not the 6-digit code itself.
              </p>
            </div>

            <Separator />

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={saveCredentialsMutation.isPending}
            >
              {saveCredentialsMutation.isPending ? "Saving..." : "Save Credentials"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Get Your Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">For Angel One:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Log in to Angel One web platform</li>
              <li>Go to Profile → API Management</li>
              <li>Create a new API key if you don't have one</li>
              <li>Copy your Client ID, API Key, and API Secret</li>
              <li>Set up TOTP (Time-based OTP) and save the secret key</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">For Dhan:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Log in to Dhan web platform</li>
              <li>Go to Settings → API Management</li>
              <li>Generate API credentials</li>
              <li>Copy your Client ID and Access Token</li>
            </ol>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}