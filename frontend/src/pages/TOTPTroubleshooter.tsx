import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Clock, CheckCircle, AlertCircle, Smartphone, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TOTPTroubleshooter() {
  const [totpSecret, setTotpSecret] = useState('');
  const [manualTotp, setManualTotp] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testTOTPSecret = async () => {
    if (!totpSecret.trim()) {
      toast({
        title: "Error",
        description: "Please enter your TOTP secret key",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/test-totp-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpSecret: totpSecret.trim() })
      });

      const result = await response.json();
      setTestResults(result);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "TOTP secret is working correctly",
          variant: "default"
        });
      } else {
        toast({
          title: "TOTP Test Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test TOTP secret",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testManualTOTP = async () => {
    if (!manualTotp.trim() || manualTotp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a 6-digit TOTP code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/test-manual-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: manualTotp.trim() })
      });

      const result = await response.json();
      setTestResults(result);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Manual TOTP authentication successful",
          variant: "default"
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test manual TOTP",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTOTPSecret = async () => {
    if (!totpSecret.trim()) {
      toast({
        title: "Error",
        description: "Please enter your TOTP secret key",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/save-totp-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpSecret: totpSecret.trim() })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "TOTP secret saved successfully",
          variant: "default"
        });
      } else {
        toast({
          title: "Save Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save TOTP secret",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">TOTP Authentication Setup</h1>
          <p className="text-gray-600">Configure Two-Factor Authentication for live data access</p>
        </div>
      </div>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Current Status:</strong> Angel One connection test successful, but automated data feed requires TOTP configuration.
          Your user profile data is authentic, we just need to enable automated TOTP generation.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="secret" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="secret">TOTP Secret Setup</TabsTrigger>
          <TabsTrigger value="manual">Manual Testing</TabsTrigger>
          <TabsTrigger value="guide">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="secret" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                TOTP Secret Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totpSecret">TOTP Secret Key (from Angel One app setup)</Label>
                <Input
                  id="totpSecret"
                  type="password"
                  placeholder="Enter your TOTP secret key"
                  value={totpSecret}
                  onChange={(e) => setTotpSecret(e.target.value)}
                  className="font-mono"
                />
                <p className="text-sm text-gray-600">
                  This is the secret key shown when you first set up 2FA in Angel One mobile app
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={testTOTPSecret} 
                  disabled={loading || !totpSecret.trim()}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Test TOTP Secret
                </Button>
                <Button 
                  onClick={saveTOTPSecret} 
                  disabled={loading || !totpSecret.trim()}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Save Secret
                </Button>
              </div>

              {testResults && (
                <Alert className={testResults.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  <div className="flex items-center gap-2">
                    {testResults.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">
                      {testResults.success ? "TOTP Test Successful" : "TOTP Test Failed"}
                    </span>
                  </div>
                  <AlertDescription className="mt-2">
                    {testResults.message}
                    {testResults.generatedCode && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <strong>Generated Code:</strong> {testResults.generatedCode}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Manual TOTP Testing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualTotp">Current TOTP Code (from your authenticator app)</Label>
                <Input
                  id="manualTotp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={manualTotp}
                  onChange={(e) => setManualTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono text-center text-lg"
                  maxLength={6}
                />
                <p className="text-sm text-gray-600">
                  Enter the current 6-digit code from your Angel One authenticator app
                </p>
              </div>

              <Button 
                onClick={testManualTOTP} 
                disabled={loading || manualTotp.length !== 6}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Test Manual Code
              </Button>

              {testResults && (
                <Alert className={testResults.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  <div className="flex items-center gap-2">
                    {testResults.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">
                      {testResults.success ? "Authentication Successful" : "Authentication Failed"}
                    </span>
                  </div>
                  <AlertDescription className="mt-2">
                    {testResults.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How to Find Your TOTP Secret</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">1</Badge>
                  <div>
                    <p className="font-medium">Open Angel One Mobile App</p>
                    <p className="text-sm text-gray-600">Log into your Angel One trading account</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">2</Badge>
                  <div>
                    <p className="font-medium">Go to Profile Settings</p>
                    <p className="text-sm text-gray-600">Navigate to Security settings or 2FA configuration</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">3</Badge>
                  <div>
                    <p className="font-medium">View/Reset 2FA Setup</p>
                    <p className="text-sm text-gray-600">Look for "Reset 2FA" or "View Secret Key" option</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">4</Badge>
                  <div>
                    <p className="font-medium">Copy the Secret Key</p>
                    <p className="text-sm text-gray-600">Copy the long alphanumeric string (usually 32 characters)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">5</Badge>
                  <div>
                    <p className="font-medium">Paste and Test</p>
                    <p className="text-sm text-gray-600">Use the secret in the "TOTP Secret Setup" tab above</p>
                  </div>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Alternative:</strong> If you can't find the secret key, you can use manual TOTP codes for testing.
                  However, for automated live data collection, the secret key is required.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benefits of Live Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">With Live Angel One Data:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Real market prices and option chains</li>
                    <li>• Actual Open Interest changes</li>
                    <li>• Live volume and trading data</li>
                    <li>• Accurate pattern detection</li>
                    <li>• Historical data collection</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-600">Current Mock Data Limitations:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Simulated prices and movements</li>
                    <li>• Artificial OI patterns</li>
                    <li>• No real market correlation</li>
                    <li>• Limited pattern accuracy</li>
                    <li>• No historical data building</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}