import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Sparkles
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
    keywordTriggers: []
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
      return await apiRequest('/api/chatbot/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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
      return await apiRequest('/api/chatbot/generate-response', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: (data) => {
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
      return await apiRequest('/api/chatbot/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: (data) => {
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
        keywordTriggers: settingsData.keywordTriggers || []
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

              {/* Advanced Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responseDelay">Response Delay (seconds)</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="maxLength">Max Response Length</Label>
                  <Input
                    id="maxLength"
                    type="number"
                    min="50"
                    max="500"
                    value={settings.maxResponseLength}
                    onChange={(e) =>
                      setSettings(prev => ({ ...prev, maxResponseLength: parseInt(e.target.value) || 200 }))
                    }
                  />
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