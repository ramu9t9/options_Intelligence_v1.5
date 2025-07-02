import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  AlertCircle,
  Target,
  Zap
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  strategy?: {
    name: string;
    type: string;
    legs: string[];
    riskLevel: 'Low' | 'Medium' | 'High';
    confidence: number;
  };
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI trading assistant. I can help you analyze market conditions and suggest option strategies. What would you like to explore today?',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response with strategy suggestion
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Based on current market conditions, I recommend an Iron Condor strategy for NIFTY. This neutral strategy benefits from low volatility and time decay.',
        timestamp: new Date(),
        strategy: {
          name: 'Iron Condor',
          type: 'Neutral',
          legs: [
            'Buy 24600 Put',
            'Sell 24650 Put', 
            'Sell 24750 Call',
            'Buy 24800 Call'
          ],
          riskLevel: 'Medium',
          confidence: 78
        }
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Strategy Assistant
          </h1>
          <p className="text-gray-300">
            Get personalized trading strategies and market insights powered by AI
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg">
          {/* Messages */}
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-3xl ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-purple-500' 
                      : 'bg-blue-500'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 ${
                    message.type === 'user' ? 'bg-purple-500/20' : ''
                  }`}>
                    <p className="text-white mb-2">{message.content}</p>
                    
                    {/* Strategy Card */}
                    {message.strategy && (
                      <div className="mt-3 bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-white">
                            {message.strategy.name}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-white/10 text-white px-2 py-1 rounded-full">
                              {message.strategy.type}
                            </Badge>
                            <Badge className={`px-2 py-1 rounded-full ${
                              message.strategy.riskLevel === 'Low' 
                                ? 'bg-green-500/20 text-green-300'
                                : message.strategy.riskLevel === 'Medium'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}>
                              {message.strategy.riskLevel} Risk
                            </Badge>
                          </div>
                        </div>

                        {/* Strategy Legs */}
                        <div className="mb-3">
                          <p className="text-sm text-gray-300 mb-2">Strategy Legs:</p>
                          <ul className="space-y-1">
                            {message.strategy.legs.map((leg, index) => (
                              <li key={index} className="text-gray-300 font-mono text-sm">
                                • {leg}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Confidence Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm text-gray-300 mb-1">
                            <span>Confidence</span>
                            <span>{message.strategy.confidence}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${message.strategy.confidence}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <Button 
                            size="sm"
                            className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-md"
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Analyze
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-md"
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Backtest
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Message */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-white/70 text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about market conditions, strategies, or get recommendations..."
                className="bg-transparent border-white/10 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-md"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage('What are the best strategies for high volatility?')}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <Zap className="w-3 h-3 mr-1" />
              High Volatility
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage('Suggest a conservative income strategy')}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <Target className="w-3 h-3 mr-1" />
              Income Strategy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage('Analyze current market sentiment')}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Market Analysis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}