import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Bot, Key, Settings, Brain, Zap, Eye, EyeOff, TestTube, Sparkles, MessageSquare, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

interface AIProvider {
  id: string;
  name: string;
  icon: string;
  models: string[];
  requiresApiKey: boolean;
  description: string;
  color: string;
}

interface CustomAgent {
  id: string;
  name: string;
  role: string;
  prompt: string;
  aiProvider: string;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  icon: string;
  color: string;
  isActive: boolean;
  customApiKey?: string;
  advancedSettings: {
    systemPrompt: string;
    maxMemory: number;
    responseDelay: number;
    autoLearn: boolean;
    contextWindow: number;
    creativityMode: 'conservative' | 'balanced' | 'creative';
  };
}

interface APIKey {
  provider: string;
  key: string;
  isValid: boolean;
  lastTested: Date | null;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    requiresApiKey: true,
    description: 'Most advanced language model with excellent reasoning',
    color: 'bg-green-500'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '🧠',
    models: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022'],
    requiresApiKey: true,
    description: 'Constitutional AI with strong safety and helpful responses',
    color: 'bg-orange-500'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '💎',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'],
    requiresApiKey: true,
    description: 'Multimodal AI with excellent reasoning and coding',
    color: 'bg-blue-500'
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    icon: '⚡',
    models: ['grok-2-vision-1212', 'grok-2-1212', 'grok-vision-beta', 'grok-beta'],
    requiresApiKey: true,
    description: 'Real-time AI with access to current information',
    color: 'bg-purple-500'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🔍',
    models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-huge-128k-online'],
    requiresApiKey: true,
    description: 'AI with real-time web search and citations',
    color: 'bg-indigo-500'
  }
];

export default function AdvancedAIAgents() {
  const { toast } = useToast();
  const { triggerSync } = useRealtimeSync();

  // State management
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);

  // Load data on component mount
  useEffect(() => {
    const savedAgents = localStorage.getItem('whatsapp-custom-agents');
    const savedApiKeys = localStorage.getItem('whatsapp-api-keys');
    
    if (savedAgents) {
      setCustomAgents(JSON.parse(savedAgents));
    }
    
    if (savedApiKeys) {
      setApiKeys(JSON.parse(savedApiKeys));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('whatsapp-custom-agents', JSON.stringify(customAgents));
  }, [customAgents]);

  useEffect(() => {
    localStorage.setItem('whatsapp-api-keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  const createNewAgent = () => {
    const newAgent: CustomAgent = {
      id: `custom-${Date.now()}`,
      name: '',
      role: '',
      prompt: '',
      aiProvider: 'openai',
      aiModel: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 150,
      icon: '🤖',
      color: 'bg-blue-500',
      isActive: true,
      advancedSettings: {
        systemPrompt: '',
        maxMemory: 10,
        responseDelay: 0,
        autoLearn: false,
        contextWindow: 4000,
        creativityMode: 'balanced'
      }
    };
    setEditingAgent(newAgent);
    setIsCreating(true);
  };

  const handleEditAgent = (agent: CustomAgent) => {
    setEditingAgent({ ...agent });
    setIsCreating(false);
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;
    
    // Validation
    if (!editingAgent.name.trim() || !editingAgent.role.trim() || !editingAgent.prompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in name, role, and prompt.",
        variant: "destructive",
      });
      return;
    }

    // Check if API key is required and available
    const provider = AI_PROVIDERS.find(p => p.id === editingAgent.aiProvider);
    if (provider?.requiresApiKey && !editingAgent.customApiKey) {
      const globalApiKey = apiKeys.find(k => k.provider === editingAgent.aiProvider);
      if (!globalApiKey || !globalApiKey.isValid) {
        toast({
          title: "API Key Required",
          description: `Please add a valid ${provider.name} API key first.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (isCreating) {
      const updatedAgents = [...customAgents, editingAgent];
      setCustomAgents(updatedAgents);
      toast({
        title: "Agent Created",
        description: `${editingAgent.name} has been created and synced across all pages.`,
      });
    } else {
      const updatedAgents = customAgents.map(agent => 
        agent.id === editingAgent.id ? editingAgent : agent
      );
      setCustomAgents(updatedAgents);
      toast({
        title: "Agent Updated",
        description: `${editingAgent.name} has been updated and synced.`,
      });
    }

    // Trigger real-time sync
    await triggerSync();
    
    setEditingAgent(null);
    setIsCreating(false);
  };

  const handleDeleteAgent = async (agentId: string) => {
    setCustomAgents(prev => prev.filter(agent => agent.id !== agentId));
    await triggerSync();
    toast({
      title: "Agent Deleted",
      description: "Custom agent has been removed and synced across all pages.",
    });
  };

  const handleAddApiKey = async () => {
    if (!selectedProvider || !tempApiKey.trim()) {
      toast({
        title: "Missing Information", 
        description: "Please select a provider and enter an API key.",
        variant: "destructive",
      });
      return;
    }

    setTestingApiKey(true);
    
    try {
      // Test the API key with a simple request
      const isValid = await testApiKey(selectedProvider, tempApiKey);
      
      const newApiKey: APIKey = {
        provider: selectedProvider,
        key: tempApiKey,
        isValid,
        lastTested: new Date()
      };

      // Update or add API key
      const updatedKeys = apiKeys.filter(k => k.provider !== selectedProvider);
      updatedKeys.push(newApiKey);
      setApiKeys(updatedKeys);

      if (isValid) {
        toast({
          title: "API Key Added Successfully",
          description: "Your API key has been verified and saved.",
        });
      } else {
        toast({
          title: "API Key Validation Failed",
          description: "The API key could not be verified. Please check that you copied the complete key from OpenAI.",
          variant: "destructive",
        });
      }

      setTempApiKey('');
      setSelectedProvider('');
      setShowApiKeyDialog(false);
    } catch (error) {
      toast({
        title: "Error Testing API Key",
        description: "Could not verify the API key. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setTestingApiKey(false);
    }
  };

  const testApiKey = async (provider: string, apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey })
      });
      
      const result = await response.json();
      return result.valid || false;
    } catch (error) {
      console.error('API key test error:', error);
      return false;
    }
  };

  const getProviderStatus = (providerId: string) => {
    const apiKey = apiKeys.find(k => k.provider === providerId);
    if (!apiKey) return { status: 'missing', color: 'bg-gray-500', text: 'No API Key' };
    if (apiKey.isValid) return { status: 'valid', color: 'bg-green-500', text: 'Active' };
    return { status: 'invalid', color: 'bg-red-500', text: 'Invalid Key' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            Advanced AI Agents
          </h1>
          <p className="text-gray-600 mt-2">
            Create intelligent AI agents with custom personalities and advanced settings
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowApiKeyDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            Manage API Keys
          </Button>
          <Button onClick={createNewAgent} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* API Providers Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            AI Providers Status
          </CardTitle>
          <CardDescription>
            Configure API keys for different AI providers to unlock their capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AI_PROVIDERS.map((provider) => {
              const status = getProviderStatus(provider.id);
              return (
                <div key={provider.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{provider.icon}</span>
                      <span className="font-medium">{provider.name}</span>
                    </div>
                    <Badge className={`${status.color} text-white`}>
                      {status.text}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{provider.description}</p>
                  <div className="text-xs text-gray-500">
                    Models: {provider.models.slice(0, 2).join(', ')}
                    {provider.models.length > 2 && ` +${provider.models.length - 2} more`}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Your Custom AI Agents ({customAgents.length})
          </CardTitle>
          <CardDescription>
            Manage your intelligent AI agents with custom personalities and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customAgents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Agents Created</h3>
              <p className="text-gray-600 mb-6">
                Create your first AI agent to start automating WhatsApp conversations
              </p>
              <Button onClick={createNewAgent} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Agent
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customAgents.map((agent) => {
                const provider = AI_PROVIDERS.find(p => p.id === agent.aiProvider);
                const providerStatus = getProviderStatus(agent.aiProvider);
                
                return (
                  <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 ${agent.color} rounded-lg flex items-center justify-center text-white`}>
                            <span className="text-lg">{agent.icon}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{agent.name}</h3>
                            <p className="text-sm text-gray-600">{agent.role}</p>
                          </div>
                        </div>
                        <Switch
                          checked={agent.isActive}
                          onCheckedChange={(checked) => {
                            const updatedAgents = customAgents.map(a => 
                              a.id === agent.id ? { ...a, isActive: checked } : a
                            );
                            setCustomAgents(updatedAgents);
                          }}
                        />
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {agent.prompt}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {provider?.icon} {provider?.name}
                        </Badge>
                        <Badge className={`${providerStatus.color} text-white text-xs`}>
                          {providerStatus.text}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAgent(agent)}
                          className="flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAgent(agent.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Key Management Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Add API Key
            </DialogTitle>
            <DialogDescription>
              Add your API keys to enable different AI providers
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="provider">AI Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI provider" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <span>{provider.icon}</span>
                        <span>{provider.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <Alert>
              <Key className="w-4 h-4" />
              <AlertDescription>
                <strong>Required:</strong> Add your OpenAI API key to enable AI auto-replies. 
                <br />
                API keys are stored securely and used only for your agents. Copy the complete key from OpenAI (starts with 'sk-proj-' and is 100+ characters long).
                <br />
                <strong>Note:</strong> Without a valid API key, the AI chatbot cannot respond to WhatsApp messages.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowApiKeyDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddApiKey}
                disabled={testingApiKey}
                className="flex-1"
              >
                {testingApiKey ? (
                  <>
                    <TestTube className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Key
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Creation/Edit Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {isCreating ? 'Create New AI Agent' : 'Edit AI Agent'}
            </DialogTitle>
            <DialogDescription>
              Configure your AI agent's personality, capabilities, and advanced settings
            </DialogDescription>
          </DialogHeader>
          
          {editingAgent && (
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="ai">AI Configuration</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      value={editingAgent.name}
                      onChange={(e) => setEditingAgent({...editingAgent, name: e.target.value})}
                      placeholder="Customer Support Bot"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={editingAgent.role}
                      onChange={(e) => setEditingAgent({...editingAgent, role: e.target.value})}
                      placeholder="Customer Service Specialist"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="prompt">Main Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={editingAgent.prompt}
                    onChange={(e) => setEditingAgent({...editingAgent, prompt: e.target.value})}
                    placeholder="You are a helpful customer service agent..."
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <Input
                      id="icon"
                      value={editingAgent.icon}
                      onChange={(e) => setEditingAgent({...editingAgent, icon: e.target.value})}
                      placeholder="🤖"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Select
                      value={editingAgent.color}
                      onValueChange={(value) => setEditingAgent({...editingAgent, color: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bg-blue-500">Blue</SelectItem>
                        <SelectItem value="bg-green-500">Green</SelectItem>
                        <SelectItem value="bg-purple-500">Purple</SelectItem>
                        <SelectItem value="bg-red-500">Red</SelectItem>
                        <SelectItem value="bg-orange-500">Orange</SelectItem>
                        <SelectItem value="bg-indigo-500">Indigo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="ai" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select
                      value={editingAgent.aiProvider}
                      onValueChange={(value) => {
                        const provider = AI_PROVIDERS.find(p => p.id === value);
                        setEditingAgent({
                          ...editingAgent, 
                          aiProvider: value,
                          aiModel: provider?.models[0] || ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.map((provider) => {
                          const status = getProviderStatus(provider.id);
                          return (
                            <SelectItem key={provider.id} value={provider.id}>
                              <div className="flex items-center gap-2">
                                <span>{provider.icon}</span>
                                <span>{provider.name}</span>
                                <Badge className={`${status.color} text-white text-xs ml-2`}>
                                  {status.text}
                                </Badge>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Select
                      value={editingAgent.aiModel}
                      onValueChange={(value) => setEditingAgent({...editingAgent, aiModel: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.find(p => p.id === editingAgent.aiProvider)?.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="temperature">
                    Temperature: {editingAgent.temperature}
                  </Label>
                  <Slider
                    id="temperature"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[editingAgent.temperature]}
                    onValueChange={([value]) => setEditingAgent({...editingAgent, temperature: value})}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Lower values make responses more focused, higher values more creative
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="maxTokens">Max Tokens: {editingAgent.maxTokens}</Label>
                  <Slider
                    id="maxTokens"
                    min={50}
                    max={500}
                    step={10}
                    value={[editingAgent.maxTokens]}
                    onValueChange={([value]) => setEditingAgent({...editingAgent, maxTokens: value})}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Maximum response length (higher uses more credits)
                  </p>
                </div>

                <div>
                  <Label htmlFor="customApiKey">Custom API Key (Optional)</Label>
                  <Input
                    id="customApiKey"
                    type="password"
                    value={editingAgent.customApiKey || ''}
                    onChange={(e) => setEditingAgent({...editingAgent, customApiKey: e.target.value})}
                    placeholder="Use specific API key for this agent"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Leave empty to use global API key for this provider
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4">
                <div>
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    value={editingAgent.advancedSettings.systemPrompt}
                    onChange={(e) => setEditingAgent({
                      ...editingAgent,
                      advancedSettings: {
                        ...editingAgent.advancedSettings,
                        systemPrompt: e.target.value
                      }
                    })}
                    placeholder="Additional system instructions..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxMemory">
                      Conversation Memory: {editingAgent.advancedSettings.maxMemory} messages
                    </Label>
                    <Slider
                      id="maxMemory"
                      min={1}
                      max={50}
                      value={[editingAgent.advancedSettings.maxMemory]}
                      onValueChange={([value]) => setEditingAgent({
                        ...editingAgent,
                        advancedSettings: {
                          ...editingAgent.advancedSettings,
                          maxMemory: value
                        }
                      })}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="responseDelay">
                      Response Delay: {editingAgent.advancedSettings.responseDelay}s
                    </Label>
                    <Slider
                      id="responseDelay"
                      min={0}
                      max={10}
                      value={[editingAgent.advancedSettings.responseDelay]}
                      onValueChange={([value]) => setEditingAgent({
                        ...editingAgent,
                        advancedSettings: {
                          ...editingAgent.advancedSettings,
                          responseDelay: value
                        }
                      })}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="creativityMode">Creativity Mode</Label>
                  <Select
                    value={editingAgent.advancedSettings.creativityMode}
                    onValueChange={(value: 'conservative' | 'balanced' | 'creative') => setEditingAgent({
                      ...editingAgent,
                      advancedSettings: {
                        ...editingAgent.advancedSettings,
                        creativityMode: value
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative - Stick to facts</SelectItem>
                      <SelectItem value="balanced">Balanced - Mix of facts and creativity</SelectItem>
                      <SelectItem value="creative">Creative - More imaginative responses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoLearn"
                    checked={editingAgent.advancedSettings.autoLearn}
                    onCheckedChange={(checked) => setEditingAgent({
                      ...editingAgent,
                      advancedSettings: {
                        ...editingAgent.advancedSettings,
                        autoLearn: checked
                      }
                    })}
                  />
                  <Label htmlFor="autoLearn">Auto-learn from conversations</Label>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setEditingAgent(null)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAgent} className="flex-1">
              {isCreating ? 'Create Agent' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}