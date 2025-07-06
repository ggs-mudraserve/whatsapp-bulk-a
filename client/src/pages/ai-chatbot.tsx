import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AgentManager from "@/components/ai/agent-manager";
import { 
  Bot, 
  Brain, 
  MessageSquare, 
  Settings, 
  Lightbulb,
  Zap,
  Clock,
  Target,
  TestTube,
  Sparkles,
  Users
} from "lucide-react";

interface ChatbotSettings {
  enabled: boolean;
  businessName?: string;
  customInstructions?: string;
  autoReplyEnabled: boolean;
  sentimentAnalysisEnabled: boolean;
  responseDelay: number;
  maxResponseLength: number;
  keywordTriggers: string[];
  // API Configuration
  aiProvider: string;
  aiModel: string;
  customApiKey?: string;
  temperature: number;
  maxTokens: number;
}

export default function AIChatbot() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState<ChatbotSettings>({
    enabled: false,
    businessName: '',
    customInstructions: '',
    autoReplyEnabled: true,
    sentimentAnalysisEnabled: true,
    responseDelay: 5,
    maxResponseLength: 200,
    keywordTriggers: [],
    aiProvider: 'openai',
    aiModel: 'gpt-4o',
    customApiKey: '',
    temperature: 0.7,
    maxTokens: 150
  });

  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [sentiment, setSentiment] = useState<any>(null);

  // Fetch chatbot settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/chatbot/settings'],
  });

  // Update settings mutation
  const settingsMutation = useMutation({
    mutationFn: async (data: ChatbotSettings) => {
      const response = await apiRequest('POST', '/api/chatbot/settings', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your AI chatbot settings have been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save chatbot settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Test response mutation
  const testMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chatbot/generate-response', { message });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setTestResponse(data.message);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate test response.",
        variant: "destructive"
      });
    }
  });

  // Sentiment analysis mutation
  const sentimentMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chatbot/analyze-sentiment', { message });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setSentiment(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to analyze sentiment.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (settingsData) {
      setSettings({
        enabled: settingsData.enabled || false,
        businessName: settingsData.businessName || '',
        customInstructions: settingsData.customInstructions || '',
        autoReplyEnabled: settingsData.autoReplyEnabled ?? true,
        sentimentAnalysisEnabled: settingsData.sentimentAnalysisEnabled ?? true,
        responseDelay: settingsData.responseDelay || 5,
        maxResponseLength: settingsData.maxResponseLength || 200,
        keywordTriggers: settingsData.keywordTriggers || [],
        aiProvider: settingsData.aiProvider || 'openai',
        aiModel: settingsData.aiModel || 'gpt-4o',
        customApiKey: settingsData.customApiKey || '',
        temperature: settingsData.temperature || 0.7,
        maxTokens: settingsData.maxTokens || 150
      });
    }
  }, [settingsData]);

  const handleSave = () => {
    settingsMutation.mutate(settings);
  };

  const handleTest = () => {
    if (!testMessage.trim()) return;
    testMutation.mutate(testMessage);
    if (settings.sentimentAnalysisEnabled) {
      sentimentMutation.mutate(testMessage);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Advanced AI Features
  const generateTemplateVariations = useMutation({
    mutationFn: async () => {
      const baseTemplate = "Hi {{name}}, thanks for contacting us! How can we help you today?";
      return await apiRequest(`/api/ai/template-variations`, {
        method: "POST",
        body: JSON.stringify({
          template: baseTemplate,
          provider: settings.aiProvider,
          model: settings.aiModel,
          apiKey: settings.customApiKey,
          count: 3
        })
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Template Variations Generated!",
        description: `Generated ${data.variations?.length || 0} template variations`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Template Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const testSentimentAnalysis = useMutation({
    mutationFn: async () => {
      const testMessage = "I am very disappointed with your service. This is unacceptable!";
      return await apiRequest(`/api/ai/sentiment-analysis`, {
        method: "POST",
        body: JSON.stringify({
          message: testMessage,
          provider: settings.aiProvider,
          model: settings.aiModel,
          apiKey: settings.customApiKey
        })
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Sentiment Analysis Complete!",
        description: `Sentiment: ${data.sentiment} (${Math.round(data.confidence * 100)}% confidence)`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sentiment Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const testAIResponse = () => {
    setTestMessage("Hello, I need help with my order");
    handleTest();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading AI chatbot settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Chatbot</h1>
          <p className="text-gray-600">Configure intelligent auto-replies with GPT-4</p>
        </div>
      </div>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Bot Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure your AI chatbot to automatically respond to WhatsApp messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable AI Chatbot</Label>
              <p className="text-sm text-gray-500">
                Automatically respond to incoming messages using GPT-4
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          {settings.enabled && (
            <>
              <Separator />
              
              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Your Business Name"
                  value={settings.businessName}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, businessName: e.target.value }))
                  }
                />
              </div>

              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Custom Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Describe how your bot should behave, what products/services you offer, and any specific guidelines..."
                  className="min-h-[120px]"
                  value={settings.customInstructions}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, customInstructions: e.target.value }))
                  }
                />
                <p className="text-sm text-gray-500">
                  Be specific about your business, tone, and how to handle different types of inquiries.
                </p>
              </div>

              {/* AI Provider Configuration */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">AI Provider Configuration</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aiProvider">AI Provider</Label>
                    <Select
                      value={settings.aiProvider}
                      onValueChange={(value) =>
                        setSettings(prev => ({ ...prev, aiProvider: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="cohere">Cohere</SelectItem>
                        <SelectItem value="mistral">Mistral AI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiModel">AI Model</Label>
                    <Select
                      value={settings.aiModel}
                      onValueChange={(value) =>
                        setSettings(prev => ({ ...prev, aiModel: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.aiProvider === 'openai' && (
                          <>
                            <SelectItem value="gpt-4o">GPT-4o (Latest)</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            <SelectItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</SelectItem>
                          </>
                        )}
                        {settings.aiProvider === 'anthropic' && (
                          <>
                            <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                            <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                            <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                          </>
                        )}
                        {settings.aiProvider === 'gemini' && (
                          <>
                            <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                            <SelectItem value="gemini-pro-vision">Gemini Pro Vision</SelectItem>
                            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                            <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro</SelectItem>
                          </>
                        )}
                        {settings.aiProvider === 'cohere' && (
                          <>
                            <SelectItem value="command-r-plus">Command R+</SelectItem>
                            <SelectItem value="command-r">Command R</SelectItem>
                            <SelectItem value="command">Command</SelectItem>
                            <SelectItem value="command-nightly">Command Nightly</SelectItem>
                          </>
                        )}
                        {settings.aiProvider === 'mistral' && (
                          <>
                            <SelectItem value="mistral-large-latest">Mistral Large</SelectItem>
                            <SelectItem value="mistral-medium-latest">Mistral Medium</SelectItem>
                            <SelectItem value="mistral-small-latest">Mistral Small</SelectItem>
                            <SelectItem value="open-mixtral-8x7b">Mixtral 8x7B</SelectItem>
                            <SelectItem value="open-mistral-7b">Mistral 7B</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customApiKey">Custom API Key (Optional)</Label>
                  <Input
                    id="customApiKey"
                    type="password"
                    placeholder="Enter your own API key to use your quota"
                    value={settings.customApiKey}
                    onChange={(e) =>
                      setSettings(prev => ({ ...prev, customApiKey: e.target.value }))
                    }
                  />
                  <p className="text-sm text-gray-500">
                    Leave empty to use system API key. Provide your own for unlimited usage.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature ({settings.temperature})</Label>
                    <Input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Higher = more creative</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      min="50"
                      max="2000"
                      value={settings.maxTokens}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 150 }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responseDelay">Response Delay (sec)</Label>
                    <Input
                      id="responseDelay"
                      type="number"
                      min="1"
                      max="60"
                      value={settings.responseDelay}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, responseDelay: parseInt(e.target.value) || 5 }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Auto-Reply</Label>
                    <p className="text-sm text-gray-500">
                      Automatically send responses to incoming messages
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoReplyEnabled}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, autoReplyEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Sentiment Analysis</Label>
                    <p className="text-sm text-gray-500">
                      Analyze customer message sentiment for better responses
                    </p>
                  </div>
                  <Switch
                    checked={settings.sentimentAnalysisEnabled}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, sentimentAnalysisEnabled: checked }))
                    }
                  />
                </div>

                {/* Advanced AI Tools */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium">AI Tools & Testing</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testAIResponse()}
                      disabled={testMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <TestTube className="w-4 h-4" />
                      {testMutation.isPending ? "Testing..." : "Test AI Response"}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateTemplateVariations.mutate()}
                      disabled={generateTemplateVariations.isPending}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {generateTemplateVariations.isPending ? "Generating..." : "Template Generator"}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testSentimentAnalysis.mutate()}
                      disabled={testSentimentAnalysis.isPending}
                      className="flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      {testSentimentAnalysis.isPending ? "Analyzing..." : "Sentiment Analysis"}
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      💡 <strong>Pro AI Features:</strong> Advanced tools for template generation, sentiment analysis, 
                      message categorization, and automated customer service optimization.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave}
              disabled={settingsMutation.isPending}
              className="min-w-32"
            >
              {settingsMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Bot */}
      {settings.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="w-5 h-5" />
              <span>Test Your Bot</span>
            </CardTitle>
            <CardDescription>
              Send a test message to see how your bot responds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testMessage">Test Message</Label>
              <div className="flex space-x-2">
                <Input
                  id="testMessage"
                  placeholder="Hi, what are your business hours?"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
                <Button 
                  onClick={handleTest}
                  disabled={testMutation.isPending || !testMessage.trim()}
                >
                  {testMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {testResponse && (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-gray-700">Bot Response:</Label>
                  <p className="mt-1 text-gray-900">{testResponse}</p>
                </div>

                {sentiment && (
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">Sentiment:</Label>
                    <Badge className={getSentimentColor(sentiment.sentiment)}>
                      {sentiment.sentiment} ({Math.round(sentiment.confidence * 100)}%)
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Brain className="w-8 h-8 mx-auto mb-3 text-blue-500" />
            <h3 className="font-semibold mb-2">GPT-4 Powered</h3>
            <p className="text-sm text-gray-600">
              Latest AI technology for intelligent, context-aware responses
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <Clock className="w-8 h-8 mx-auto mb-3 text-green-500" />
            <h3 className="font-semibold mb-2">24/7 Availability</h3>
            <p className="text-sm text-gray-600">
              Never miss a customer inquiry with round-the-clock automation
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <Target className="w-8 h-8 mx-auto mb-3 text-purple-500" />
            <h3 className="font-semibold mb-2">Smart Filtering</h3>
            <p className="text-sm text-gray-600">
              Automatically identifies spam and inappropriate messages
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}