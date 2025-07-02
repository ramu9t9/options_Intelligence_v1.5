/**
 * AI Strategy Service - Phase 6 Implementation
 * LLM-powered trading strategy recommendations using OpenRouter
 */

import { EventEmitter } from 'events';

// OpenRouter configuration - provides access to multiple AI models
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'anthropic/claude-3.5-sonnet'; // High-quality model for trading analysis

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️ OPENROUTER_API_KEY not found. AI Strategy Service will operate in fallback mode.');
}

export interface StrategyRequest {
  symbol: string;
  expiry: string;
  userId: string;
  snapshotTime: string;
  marketContext?: MarketContext;
  userPreferences?: UserPreferences;
}

export interface MarketContext {
  currentPrice: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  oiTrend: 'RISING' | 'FALLING' | 'STABLE';
  pcrTrend: 'RISING' | 'FALLING' | 'STABLE';
  volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  supportLevels: number[];
  resistanceLevels: number[];
  patterns: string[];
}

export interface UserPreferences {
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  preferredStrategies: string[];
  capitalSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  tradingStyle: 'INTRADAY' | 'SWING' | 'POSITIONAL';
}

export interface StrategyRecommendation {
  id: string;
  strategyName: string;
  actionType: 'BUY_CE' | 'SELL_CE' | 'BUY_PE' | 'SELL_PE' | 'IRON_CONDOR' | 'STRADDLE' | 'STRANGLE';
  strikes: number[];
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedReturn: string;
  maxRisk: string;
  timeframe: string;
  confidence: number; // 0-100
  marketView: string;
  executionSteps: string[];
  riskManagement: string[];
  exitCriteria: string[];
  createdAt: Date;
}

export interface StrategyAnalysis {
  recommendations: StrategyRecommendation[];
  marketSummary: string;
  riskAssessment: string;
  alternativeViews: string[];
  disclaimers: string[];
}

export class AIStrategyService extends EventEmitter {
  private isInitialized = false;
  private requestCount = 0;
  private lastRequestTime: Date | null = null;

  async initialize(): Promise<void> {
    try {
      // Test OpenAI connection
      await this.testConnection();
      this.isInitialized = true;
      console.log('🤖 AI Strategy Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Strategy Service:', error);
      console.log('⚠️ AI Strategy Service will operate in fallback mode with mock responses');
      // Don't throw error - allow service to continue in fallback mode
      this.isInitialized = false;
    }
  }

  private async testConnection(): Promise<void> {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not available');
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://options-intelligence-platform.replit.app',
        'X-Title': 'Options Intelligence Platform'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: "Test connection" }],
        max_tokens: 10
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid OpenRouter response');
    }
  }

  async generateStrategyRecommendations(request: StrategyRequest): Promise<StrategyAnalysis> {
    if (!this.isInitialized) {
      console.log('🔄 Generating fallback strategy recommendations...');
      return this.generateFallbackRecommendations(request);
    }

    this.requestCount++;
    this.lastRequestTime = new Date();

    try {
      const prompt = this.buildPrompt(request);
      
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://options-intelligence-platform.replit.app',
          'X-Title': 'Options Intelligence Platform'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `You are an expert options trading strategist. Analyze market data and provide detailed trading recommendations in JSON format. 
              Always consider risk management and provide clear reasoning for each strategy.
              
              Response format should be valid JSON with this structure:
              {
                "recommendations": [array of strategy objects],
                "marketSummary": "string",
                "riskAssessment": "string", 
                "alternativeViews": ["array of strings"],
                "disclaimers": ["array of strings"]
              }`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from OpenRouter');
      }

      const parsedResponse = JSON.parse(aiResponse);
      const analysis = this.formatResponse(parsedResponse, request);
      
      this.emit('strategyGenerated', {
        userId: request.userId,
        symbol: request.symbol,
        recommendationCount: analysis.recommendations.length
      });

      return analysis;

    } catch (error) {
      console.error('❌ Error generating strategy recommendations:', error);
      throw new Error('Failed to generate AI strategy recommendations');
    }
  }

  private buildPrompt(request: StrategyRequest): string {
    const { symbol, expiry, marketContext, userPreferences } = request;
    
    return `
Analyze the following market data and provide 3 specific options trading strategy recommendations for ${symbol}:

MARKET DATA:
- Symbol: ${symbol}
- Expiry: ${expiry}
- Current Price: ${marketContext?.currentPrice || 'N/A'}
- Market Trend: ${marketContext?.trend || 'NEUTRAL'}
- OI Trend: ${marketContext?.oiTrend || 'STABLE'}
- PCR Trend: ${marketContext?.pcrTrend || 'STABLE'}
- Volatility: ${marketContext?.volatility || 'MEDIUM'}
- Support Levels: ${marketContext?.supportLevels?.join(', ') || 'N/A'}
- Resistance Levels: ${marketContext?.resistanceLevels?.join(', ') || 'N/A'}
- Detected Patterns: ${marketContext?.patterns?.join(', ') || 'None'}

USER PROFILE:
- Risk Tolerance: ${userPreferences?.riskTolerance || 'MEDIUM'}
- Experience Level: ${userPreferences?.experienceLevel || 'INTERMEDIATE'}
- Trading Style: ${userPreferences?.tradingStyle || 'INTRADAY'}
- Capital Size: ${userPreferences?.capitalSize || 'MEDIUM'}
- Preferred Strategies: ${userPreferences?.preferredStrategies?.join(', ') || 'All'}

For each strategy recommendation, provide:
1. Strategy name and action type
2. Specific strike prices to trade
3. Clear reasoning based on market analysis
4. Risk level and expected returns
5. Step-by-step execution plan
6. Risk management rules
7. Exit criteria

Focus on actionable, specific recommendations with clear risk-reward profiles.
Consider the user's risk tolerance and experience level.
Provide alternative market views if applicable.
`;
  }

  private formatResponse(parsedResponse: any, request: StrategyRequest): StrategyAnalysis {
    const recommendations: StrategyRecommendation[] = (parsedResponse.recommendations || []).map((rec: any, index: number) => ({
      id: `${request.userId}_${Date.now()}_${index}`,
      strategyName: rec.strategyName || 'Unnamed Strategy',
      actionType: rec.actionType || 'BUY_CE',
      strikes: rec.strikes || [],
      reasoning: rec.reasoning || 'No reasoning provided',
      riskLevel: rec.riskLevel || 'MEDIUM',
      expectedReturn: rec.expectedReturn || 'Variable',
      maxRisk: rec.maxRisk || 'Limited',
      timeframe: rec.timeframe || request.expiry,
      confidence: Math.min(100, Math.max(0, rec.confidence || 75)),
      marketView: rec.marketView || 'Neutral',
      executionSteps: rec.executionSteps || ['Execute as per market conditions'],
      riskManagement: rec.riskManagement || ['Monitor positions closely'],
      exitCriteria: rec.exitCriteria || ['Exit at target or stop loss'],
      createdAt: new Date()
    }));

    return {
      recommendations,
      marketSummary: parsedResponse.marketSummary || 'Market analysis completed',
      riskAssessment: parsedResponse.riskAssessment || 'Standard market risks apply',
      alternativeViews: parsedResponse.alternativeViews || [],
      disclaimers: parsedResponse.disclaimers || [
        'Trading involves substantial risk and may not be suitable for all investors',
        'Past performance does not guarantee future results',
        'This is AI-generated analysis and should not be considered as financial advice'
      ]
    };
  }

  async getUserPersonalizedContext(userId: string): Promise<UserPreferences> {
    // Mock implementation - would connect to user preferences database
    return {
      riskTolerance: 'MEDIUM',
      preferredStrategies: ['Iron Condor', 'Straddle'],
      capitalSize: 'MEDIUM',
      experienceLevel: 'INTERMEDIATE',
      tradingStyle: 'INTRADAY'
    };
  }

  async getMarketContext(symbol: string): Promise<MarketContext> {
    // Mock implementation - would connect to real market data
    const basePrice = symbol === 'NIFTY' ? 24500 : symbol === 'BANKNIFTY' ? 52000 : 24000;
    
    return {
      currentPrice: basePrice + Math.random() * 200 - 100,
      trend: ['BULLISH', 'BEARISH', 'NEUTRAL'][Math.floor(Math.random() * 3)] as any,
      oiTrend: ['RISING', 'FALLING', 'STABLE'][Math.floor(Math.random() * 3)] as any,
      pcrTrend: ['RISING', 'FALLING', 'STABLE'][Math.floor(Math.random() * 3)] as any,
      volatility: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)] as any,
      supportLevels: [basePrice - 100, basePrice - 200],
      resistanceLevels: [basePrice + 100, basePrice + 200],
      patterns: ['Call Buildup', 'Put Writing']
    };
  }

  getServiceStats() {
    return {
      isInitialized: this.isInitialized,
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      status: this.isInitialized ? 'OPERATIONAL' : 'FALLBACK_MODE'
    };
  }

  private generateFallbackRecommendations(request: StrategyRequest): StrategyAnalysis {
    console.log('🔄 Generating mock strategy recommendations due to OpenAI unavailability');
    
    const mockRecommendation: StrategyRecommendation = {
      id: `mock-${Date.now()}`,
      strategyName: 'Iron Condor',
      actionType: 'IRON_CONDOR',
      strikes: [24400, 24500, 24600, 24700],
      reasoning: `Based on current market analysis for ${request.symbol}, an Iron Condor strategy is recommended due to neutral market outlook and moderate volatility levels. This strategy profits from time decay while limiting risk exposure.`,
      riskLevel: 'MEDIUM',
      expectedReturn: '8-12%',
      maxRisk: '₹15,000',
      timeframe: '7-14 days',
      confidence: 78,
      marketView: 'NEUTRAL with slight bullish bias',
      executionSteps: [
        `Sell ${request.symbol} 24500 CE`,
        `Buy ${request.symbol} 24600 CE`,
        `Sell ${request.symbol} 24500 PE`,
        `Buy ${request.symbol} 24400 PE`
      ],
      riskManagement: [
        'Close position if loss exceeds 50% of premium collected',
        'Monitor time decay daily',
        'Exit 1-2 days before expiry'
      ],
      exitCriteria: [
        'Profit target: 50% of premium collected',
        'Time decay: 2 days before expiry',
        'Stop loss: 50% of premium collected'
      ],
      createdAt: new Date()
    };

    return {
      recommendations: [mockRecommendation],
      marketSummary: `${request.symbol} is showing neutral to slightly bullish sentiment with moderate volatility. Current market conditions favor range-bound strategies.`,
      riskAssessment: 'MEDIUM - Limited risk due to defined profit/loss structure, but requires monitoring for breakout scenarios.',
      alternativeViews: [
        'Consider bullish strategies if resistance breaks',
        'Bear put spreads viable if support fails',
        'Straddle appropriate for high volatility events'
      ],
      disclaimers: [
        'This is a mock recommendation generated due to AI service unavailability',
        'Please consult with financial advisors before making trading decisions',
        'Past performance does not guarantee future results',
        'Options trading involves substantial risk of loss'
      ]
    };
  }

  stop(): void {
    this.isInitialized = false;
    this.removeAllListeners();
    console.log('🤖 AI Strategy Service stopped');
  }
}

export const aiStrategyService = new AIStrategyService();