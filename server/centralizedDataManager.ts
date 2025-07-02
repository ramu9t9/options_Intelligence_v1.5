import { angelOneProvider } from './angelOneProvider';
import { dhanProvider } from './dhanProvider';
import { brokerConfigService } from './brokerConfigService';

export interface DataProviderStatus {
  name: string;
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
  lastUpdate: Date;
  errorMessage?: string;
  isPrimary: boolean;
  credentials?: any;
}

export interface CentralizedDataStatus {
  primaryProvider: DataProviderStatus;
  fallbackProviders: DataProviderStatus[];
  activeProvider: string;
  totalSymbolsTracked: number;
  lastDataUpdate: Date;
  systemStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
}

class CentralizedDataManager {
  private static instance: CentralizedDataManager;
  private providers: Map<string, any> = new Map();
  private activeProvider: string = '';
  private connectionStatus: Map<string, DataProviderStatus> = new Map();
  private isInitialized = false;

  private constructor() {
    this.setupProviders();
  }

  static getInstance(): CentralizedDataManager {
    if (!CentralizedDataManager.instance) {
      CentralizedDataManager.instance = new CentralizedDataManager();
    }
    return CentralizedDataManager.instance;
  }

  private setupProviders() {
    // Register Angel One as primary
    this.providers.set('angel-one', angelOneProvider);
    this.connectionStatus.set('angel-one', {
      name: 'Angel One',
      status: 'DISCONNECTED',
      lastUpdate: new Date(),
      isPrimary: true
    });

    // Register Dhan as fallback
    this.providers.set('dhan', dhanProvider);
    this.connectionStatus.set('dhan', {
      name: 'Dhan',
      status: 'DISCONNECTED',
      lastUpdate: new Date(),
      isPrimary: false
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Initializing Centralized Data Manager...');
    
    try {
      // Initialize Angel One as primary
      await this.initializeAngelOne();
      
      // Initialize Dhan as fallback
      await this.initializeDhan();
      
      this.isInitialized = true;
      console.log('✅ Centralized Data Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Centralized Data Manager:', error);
    }
  }

  private async initializeAngelOne(): Promise<void> {
    try {
      console.log('🔄 Initializing Angel One provider...');

      // Get credentials from new broker config service
      const credentials = await brokerConfigService.getDecryptedBrokerConfig('angel-one');
      
      if (!credentials) {
        console.log('⚠️ No Angel One credentials found in broker configs');
        this.updateProviderStatus('angel-one', 'DISCONNECTED', 'No credentials configured');
        return;
      }

      console.log('✅ Angel One credentials found - testing connection...');
      this.updateProviderStatus('angel-one', 'CONNECTING', 'Testing saved credentials');

      // Transform credentials to expected format for Angel One provider
      const angelOneCredentials = {
        clientId: credentials.clientId,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        pin: credentials.pin,
        totpKey: credentials.totpKey
      };

      // Test the connection with saved credentials
      const testResult = await this.testAngelOneConnection(angelOneCredentials);
      
      if (testResult.success) {
        console.log('✅ Angel One auto-connection successful');
        this.updateProviderStatus('angel-one', 'CONNECTED');
        this.activeProvider = 'angel-one';
        
        // Store credentials in the provider for actual API calls
        this.connectionStatus.get('angel-one')!.credentials = angelOneCredentials;
        
        console.log('✅ Angel One provider activated as primary');
      } else {
        console.log('❌ Angel One auto-connection failed:', testResult.message);
        this.updateProviderStatus('angel-one', 'ERROR', testResult.message);
      }
    } catch (error) {
      console.error('❌ Angel One initialization error:', error);
      this.updateProviderStatus('angel-one', 'ERROR', (error as Error).message);
    }
  }

  private async testAngelOneConnection(credentials: any): Promise<{ success: boolean; message: string; profile?: any }> {
    try {
      const angelOneProvider = this.providers.get('angel-one');
      if (!angelOneProvider) {
        return { success: false, message: 'Angel One provider not found' };
      }

      // Test authentication with the provider
      const result = await angelOneProvider.testConnection(credentials);
      return result;
    } catch (error) {
      return { success: false, message: `Connection test failed: ${error.message}` };
    }
  }

  private async initializeDhan(): Promise<void> {
    try {
      console.log('🔄 Initializing Dhan provider...');

      // Get credentials from new broker config service
      const credentials = await brokerConfigService.getDecryptedBrokerConfig('dhan');
      
      if (!credentials) {
        console.log('⚠️ No Dhan credentials found in broker configs');
        this.updateProviderStatus('dhan', 'DISCONNECTED', 'No credentials configured');
        return;
      }

      // Transform credentials to expected format for Dhan provider
      const dhanCredentials = {
        clientId: credentials.clientId,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        pin: credentials.pin,
        totpKey: credentials.totpKey
      };

      // Mark as connected since credentials exist
      console.log('✅ Dhan credentials found - marking as available');
      this.updateProviderStatus('dhan', 'CONNECTED');
      
      // Store credentials for fallback usage
      this.connectionStatus.get('dhan')!.credentials = dhanCredentials;
      
      // Set as active if Angel One isn't active
      if (this.activeProvider === '') {
        this.activeProvider = 'dhan';
        console.log('✅ Dhan provider set as active (fallback)');
      } else {
        console.log('✅ Dhan provider ready as fallback');
      }
    } catch (error) {
      console.error('❌ Dhan initialization error:', error);
      this.updateProviderStatus('dhan', 'ERROR', error.message);
    }
  }

  private async testAngelOneConnection(credentials: any): Promise<boolean> {
    try {
      if (!credentials.clientId || !credentials.apiKey || !credentials.apiSecret) {
        console.log('❌ Angel One: Missing required credentials');
        return false;
      }

      // Test actual API connection with login call
      const testResponse = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '42:7e:b7:c0-57:a5-3c:cb:a1:de:f7:a4:07:da:8d:33',
          'X-PrivateKey': credentials.apiKey
        },
        body: JSON.stringify({
          clientcode: credentials.clientId,
          password: credentials.pin || '',
          totp: credentials.totp || ''
        })
      });

      const result = await testResponse.json();
      
      if (result.status === true && result.data?.jwtToken) {
        console.log('✅ Angel One authentication successful');
        return true;
      } else {
        console.log('❌ Angel One authentication failed:', result.message || 'Invalid credentials');
        return false;
      }
    } catch (error) {
      console.error('❌ Angel One connection test failed:', error);
      return false;
    }
  }

  private async testDhanConnection(credentials: any): Promise<boolean> {
    try {
      if (!credentials.clientId || !credentials.accessToken) {
        console.log('❌ Dhan: Missing required credentials (clientId and accessToken)');
        return false;
      }

      // Test actual API connection with profile call
      const testResponse = await fetch('https://api.dhan.co/v2/profile', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Client-Id': credentials.clientId
        }
      });

      if (testResponse.ok) {
        const result = await testResponse.json();
        if (result.clientId) {
          console.log('✅ Dhan authentication successful');
          return true;
        }
      }
      
      console.log('❌ Dhan authentication failed: Invalid credentials or API error');
      return false;
    } catch (error) {
      console.error('❌ Dhan connection test failed:', error);
      return false;
    }
  }

  private updateProviderStatus(
    providerId: string, 
    status: DataProviderStatus['status'], 
    errorMessage?: string
  ): void {
    const current = this.connectionStatus.get(providerId);
    if (current) {
      current.status = status;
      current.lastUpdate = new Date();
      if (errorMessage) {
        current.errorMessage = errorMessage;
      } else {
        delete current.errorMessage;
      }
      this.connectionStatus.set(providerId, current);
    }
  }

  getSystemStatus(): CentralizedDataStatus {
    const angelOneStatus = this.connectionStatus.get('angel-one')!;
    const dhanStatus = this.connectionStatus.get('dhan')!;
    
    let systemStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' = 'DOWN';
    
    if (angelOneStatus.status === 'CONNECTED') {
      systemStatus = 'OPERATIONAL';
    } else if (dhanStatus.status === 'CONNECTED') {
      systemStatus = 'DEGRADED';
    }

    return {
      primaryProvider: angelOneStatus,
      fallbackProviders: [dhanStatus],
      activeProvider: this.activeProvider,
      totalSymbolsTracked: 3, // NIFTY, BANKNIFTY, FINNIFTY
      lastDataUpdate: new Date(),
      systemStatus
    };
  }

  getActiveProvider(): string {
    return this.activeProvider;
  }

  async switchToFallback(): Promise<void> {
    if (this.activeProvider === 'angel-one') {
      this.activeProvider = 'dhan';
      console.log('🔄 Switched to Dhan fallback provider');
    }
  }

  async getMarketData(symbol: string): Promise<any> {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`No active provider available`);
    }

    try {
      return await provider.getMarketData(symbol);
    } catch (error) {
      console.error(`❌ Failed to fetch data from ${this.activeProvider}:`, error);
      
      // Try fallback if primary fails
      if (this.activeProvider === 'angel-one') {
        console.log('🔄 Trying fallback provider...');
        await this.switchToFallback();
        const fallbackProvider = this.providers.get(this.activeProvider);
        if (fallbackProvider) {
          return await fallbackProvider.getMarketData(symbol);
        }
      }
      
      throw error;
    }
  }

  async setPrimaryProvider(providerId: string): Promise<boolean> {
    try {
      console.log(`🔄 Setting ${providerId} as primary provider...`);
      
      // Validate provider exists
      if (!this.providers.has(providerId)) {
        console.error(`❌ Provider ${providerId} not found`);
        return false;
      }

      // Update all providers to non-primary first
      for (const [id, status] of this.connectionStatus.entries()) {
        status.isPrimary = false;
        this.connectionStatus.set(id, status);
      }

      // Set new primary provider
      const providerStatus = this.connectionStatus.get(providerId);
      if (providerStatus) {
        providerStatus.isPrimary = true;
        this.connectionStatus.set(providerId, providerStatus);
      }

      // Update active provider if the new primary is connected
      if (providerStatus?.status === 'CONNECTED') {
        this.activeProvider = providerId;
        console.log(`✅ Successfully set ${providerId} as primary and active provider`);
      } else {
        console.log(`✅ Set ${providerId} as primary provider (will activate when connected)`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to set primary provider:`, error);
      return false;
    }
  }
}

export const centralizedDataManager = CentralizedDataManager.getInstance();