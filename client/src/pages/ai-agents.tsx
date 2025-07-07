import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRealtimeSync, useAIAgentState } from "@/hooks/useRealtimeSync";
import SyncIndicator from "@/components/realtime/sync-indicator";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bot, 
  Brain, 
  Users, 
  Briefcase, 
  Lightbulb, 
  Wrench,
  Plus,
  Settings,
  Play,
  Edit,
  Trash2,
  MessageSquare,
  Sparkles
} from "lucide-react";
import ChatTestInterface from "@/components/ai-agents/chat-test-interface";

// Available AI providers and their models
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    requiresApiKey: true
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    requiresApiKey: true
  },
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    requiresApiKey: true
  },
  cohere: {
    name: 'Cohere',
    models: ['command-r-plus', 'command-r', 'command'],
    requiresApiKey: true
  },
  mistral: {
    name: 'Mistral AI',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
    requiresApiKey: true
  }
};

interface Agent {
  id: string;
  name: string;
  role: string;
  prompt: string;
  aiProvider: string;
  aiModel: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  icon?: any;
  color?: string;
  isDefault?: boolean;
}

export default function AIAgents() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedTab, setSelectedTab] = useState("agents");
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Real-time sync and AI agent state management
  const { triggerSync } = useRealtimeSync();
  const { state: aiAgentState } = useAIAgentState();
  
  // Get custom agents from localStorage
  const [customAgents, setCustomAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('whatsapp-custom-agents');
    return saved ? JSON.parse(saved) : [];
  });

  // Get chatbot settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/chatbot/settings"],
    retry: false,
  });

  // Save custom agents to localStorage
  useEffect(() => {
    localStorage.setItem('whatsapp-custom-agents', JSON.stringify(customAgents));
  }, [customAgents]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Update chatbot settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      return await apiRequest('/api/chatbot/settings', {
        method: 'POST',
        body: JSON.stringify(newSettings)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/settings'] });
      toast({
        title: "Settings Updated",
        description: "AI chatbot settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Test AI response mutation
  const testResponseMutation = useMutation({
    mutationFn: async ({ message, agentId }: { message: string; agentId: string }) => {
      const agent = allAgents.find(a => a.id === agentId);
      if (!agent) throw new Error("Agent not found");
      
      const response = await fetch('/api/ai/test-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          provider: agent.aiProvider || 'openai',
          model: agent.aiModel || 'gpt-4o',
          apiKey: agent.apiKey,
          temperature: agent.temperature || 0.7,
          maxTokens: agent.maxTokens || 500
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: (response) => {
      toast({
        title: "AI Response Test",
        description: `Response: ${response.message}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test AI response",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const allAgents = [...customAgents];

  const handleCreateAgent = () => {
    setEditingAgent({
      id: `custom-${Date.now()}`,
      name: '',
      role: '',
      prompt: '',
      aiProvider: 'openai',
      aiModel: 'gpt-4o',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 500,
      color: 'bg-gray-500',
      isDefault: false
    });
    setIsCreating(true);
  };

  const handleSaveAgent = () => {
    if (!editingAgent) return;
    
    if (!editingAgent.name.trim() || !editingAgent.role.trim() || !editingAgent.prompt.trim() || !editingAgent.aiProvider || !editingAgent.aiModel) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including AI provider and model.",
        variant: "destructive",
      });
      return;
    }

    if (isCreating) {
      setCustomAgents(prev => [...prev, editingAgent]);
      toast({
        title: "Agent Created",
        description: `${editingAgent.name} has been created successfully.`,
      });
    } else {
      setCustomAgents(prev => prev.map(agent => 
        agent.id === editingAgent.id ? editingAgent : agent
      ));
      toast({
        title: "Agent Updated",
        description: `${editingAgent.name} has been updated successfully.`,
      });
    }
    
    setEditingAgent(null);
    setIsCreating(false);
  };

  const handleDeleteAgent = (agentId: string) => {
    setCustomAgents(prev => prev.filter(agent => agent.id !== agentId));
    toast({
      title: "Agent Deleted",
      description: "Custom agent has been removed.",
    });
  };

  const testAgent = async (agentId: string) => {
    try {
      const message = "Hello, I need help with my business.";
      await testResponseMutation.mutateAsync({ message, agentId });
      // Trigger real-time sync to update inbox and other components
      await triggerSync();
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  const [testMessage, setTestMessage] = useState("Hello, I need help with my business.");
  const [selectedTestAgent, setSelectedTestAgent] = useState<string>("");
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
              <p className="text-gray-600">Manage and configure your AI chatbot agents</p>
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="agents">AI Agents</TabsTrigger>
              <TabsTrigger value="settings">Global Settings</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>

            <TabsContent value="agents" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Available Agents</h2>
                <Button onClick={handleCreateAgent}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom Agent
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allAgents.map((agent) => {
                  const IconComponent = agent.icon || Bot;
                  return (
                    <Card key={agent.id} className="relative">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${agent.color}`}>
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold">{agent.name}</div>
                            <div className="text-sm text-gray-500 font-normal">{agent.role}</div>
                          </div>
                        </CardTitle>
                        {agent.isDefault && (
                          <Badge variant="secondary" className="absolute top-2 right-2">Default</Badge>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600 line-clamp-3">{agent.prompt}</p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => testAgent(agent.id)}
                            disabled={testResponseMutation.isPending}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Test
                          </Button>
                          {!agent.isDefault && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingAgent(agent);
                                  setIsCreating(false);
                                }}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteAgent(agent.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Agent Editor Modal */}
              {editingAgent && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{isCreating ? 'Create New Agent' : 'Edit Agent'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="agent-name">Agent Name *</Label>
                        <Input
                          id="agent-name"
                          value={editingAgent.name}
                          onChange={(e) => setEditingAgent(prev => prev ? {...prev, name: e.target.value} : null)}
                          placeholder="Enter agent name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="agent-role">Role *</Label>
                        <Input
                          id="agent-role"
                          value={editingAgent.role}
                          onChange={(e) => setEditingAgent(prev => prev ? {...prev, role: e.target.value} : null)}
                          placeholder="Enter agent role"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="agent-prompt">Agent Prompt *</Label>
                      <Textarea
                        id="agent-prompt"
                        value={editingAgent.prompt}
                        onChange={(e) => setEditingAgent(prev => prev ? {...prev, prompt: e.target.value} : null)}
                        placeholder="Enter detailed prompt for this agent..."
                        rows={6}
                      />
                    </div>
                    
                    {/* AI Configuration Section */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>AI Provider *</Label>
                        <Select 
                          value={editingAgent.aiProvider} 
                          onValueChange={(value) => {
                            setEditingAgent(prev => prev ? {
                              ...prev, 
                              aiProvider: value,
                              aiModel: AI_PROVIDERS[value as keyof typeof AI_PROVIDERS]?.models[0] || 'gpt-4o'
                            } : null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                              <SelectItem key={key} value={key}>{provider.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>AI Model *</Label>
                        <Select 
                          value={editingAgent.aiModel} 
                          onValueChange={(value) => setEditingAgent(prev => prev ? {...prev, aiModel: value} : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {editingAgent.aiProvider && AI_PROVIDERS[editingAgent.aiProvider as keyof typeof AI_PROVIDERS]?.models.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>API Key (Optional)</Label>
                      <Input
                        type="password"
                        value={editingAgent.apiKey || ''}
                        onChange={(e) => setEditingAgent(prev => prev ? {...prev, apiKey: e.target.value} : null)}
                        placeholder="Enter your custom API key (optional)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Temperature: {editingAgent.temperature || 0.7}</Label>
                        <Slider
                          value={[editingAgent.temperature || 0.7]}
                          onValueChange={([value]) => setEditingAgent(prev => prev ? {...prev, temperature: value} : null)}
                          max={1}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label>Max Tokens: {editingAgent.maxTokens || 500}</Label>
                        <Slider
                          value={[editingAgent.maxTokens || 500]}
                          onValueChange={([value]) => setEditingAgent(prev => prev ? {...prev, maxTokens: value} : null)}
                          max={2000}
                          min={100}
                          step={50}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Color Theme</Label>
                      <Select 
                        value={editingAgent.color} 
                        onValueChange={(value) => setEditingAgent(prev => prev ? {...prev, color: value} : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bg-blue-500">Blue</SelectItem>
                          <SelectItem value="bg-green-500">Green</SelectItem>
                          <SelectItem value="bg-purple-500">Purple</SelectItem>
                          <SelectItem value="bg-orange-500">Orange</SelectItem>
                          <SelectItem value="bg-red-500">Red</SelectItem>
                          <SelectItem value="bg-pink-500">Pink</SelectItem>
                          <SelectItem value="bg-indigo-500">Indigo</SelectItem>
                          <SelectItem value="bg-gray-500">Gray</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveAgent}>
                        {isCreating ? 'Create Agent' : 'Save Changes'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingAgent(null);
                          setIsCreating(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Global AI Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settingsLoading ? (
                    <div className="text-center py-4 text-gray-500">Loading settings...</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label>AI Provider</Label>
                            <Select value={settings?.aiProvider || 'openai'}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="openai">OpenAI</SelectItem>
                                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                                <SelectItem value="gemini">Google Gemini</SelectItem>
                                <SelectItem value="cohere">Cohere</SelectItem>
                                <SelectItem value="mistral">Mistral AI</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>AI Model</Label>
                            <Select value={settings?.aiModel || 'gpt-4o'}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                <SelectItem value="gpt-4">GPT-4</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Custom API Key (Optional)</Label>
                            <Input
                              type="password"
                              placeholder="Enter your API key"
                              value={settings?.customApiKey || ''}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label>Temperature: {settings?.temperature || 0.7}</Label>
                            <Slider
                              value={[settings?.temperature || 0.7]}
                              max={1}
                              min={0}
                              step={0.1}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <Label>Max Tokens: {settings?.maxTokens || 500}</Label>
                            <Slider
                              value={[settings?.maxTokens || 500]}
                              max={2000}
                              min={100}
                              step={50}
                              className="w-full"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="auto-reply"
                              checked={settings?.autoReplyEnabled || false}
                            />
                            <Label htmlFor="auto-reply">Enable Auto-Reply</Label>
                          </div>
                        </div>
                      </div>

                      <Button 
                        onClick={() => updateSettingsMutation.mutate(settings)}
                        disabled={updateSettingsMutation.isPending}
                      >
                        Save Global Settings
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Test AI Agents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Test your AI agents with custom messages to see how they respond. This helps you optimize their prompts and behavior.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="testMessage">Test Message</Label>
                        <textarea
                          id="testMessage"
                          className="w-full mt-1 p-3 border rounded-lg resize-none"
                          rows={3}
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          placeholder="Enter your test message..."
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="selectedAgent">Select Agent to Test</Label>
                        <select
                          id="selectedAgent"
                          className="w-full mt-1 p-3 border rounded-lg"
                          value={selectedTestAgent}
                          onChange={(e) => setSelectedTestAgent(e.target.value)}
                        >
                          <option value="">Choose an agent...</option>
                          {allAgents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} - {agent.role}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          if (selectedTestAgent && testMessage.trim()) {
                            testResponseMutation.mutate({ 
                              message: testMessage, 
                              agentId: selectedTestAgent 
                            });
                          }
                        }}
                        disabled={!selectedTestAgent || !testMessage.trim() || testResponseMutation.isPending}
                        className="w-full"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {testResponseMutation.isPending ? "Testing..." : "Test Agent"}
                      </Button>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Response Testing</h4>
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">
                          💡 Test how your AI agents respond to different messages. All test conversations automatically sync with your inbox for easy review.
                        </p>
                      </div>
                      
                      {/* Real-time AI Agent Status */}
                      {aiAgentState.isActive && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <p className="text-sm text-green-700 font-medium">
                              AI Agent Active: {allAgents.find(a => a.id === aiAgentState.selectedAgent)?.name || 'Unknown'}
                            </p>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            Currently handling conversation #{aiAgentState.conversationId}
                          </p>
                        </div>
                      )}
                      <div className="grid gap-2">
                        {allAgents.map((agent) => {
                          const IconComponent = agent.icon || Bot;
                          return (
                            <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${agent.color}`}>
                                  <IconComponent className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium">{agent.name}</div>
                                  <div className="text-sm text-gray-500">{agent.role}</div>
                                  <div className="text-xs text-gray-400">{agent.aiProvider} • {agent.aiModel}</div>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setTestingAgent(agent)}
                                className="hover:bg-blue-50 hover:border-blue-300"
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Test Responses
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Chat Test Interface */}
      {testingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl mx-4">
            <ChatTestInterface
              agent={testingAgent}
              onClose={() => setTestingAgent(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}