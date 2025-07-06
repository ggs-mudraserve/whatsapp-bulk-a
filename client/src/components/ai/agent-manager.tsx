import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  Bot, 
  Plus, 
  Edit, 
  Trash2, 
  Sparkles, 
  Users, 
  MessageSquare,
  Brain,
  Settings
} from "lucide-react";

interface AIAgent {
  id: string;
  name: string;
  description: string;
  personality: string;
  provider: string;
  model: string;
  color: string;
  temperature: number;
  maxTokens: number;
  customApiKey?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

const providerOptions = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-pro', 'gemini-1.5-flash'] },
  { value: 'cohere', label: 'Cohere', models: ['command-r-plus', 'command-r'] },
  { value: 'mistral', label: 'Mistral AI', models: ['mistral-large-latest', 'mistral-medium-latest'] }
];

const colorOptions = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-yellow-500', 'bg-gray-500'
];

export default function AgentManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: '',
    provider: 'openai',
    model: 'gpt-4o',
    color: 'bg-blue-500',
    temperature: 0.7,
    maxTokens: 200,
    customApiKey: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get custom agents (mock for now since we don't have backend endpoint yet)
  const { data: agents = [] } = useQuery({
    queryKey: ['/api/ai/agents'],
    queryFn: () => {
      // Return stored agents from localStorage for now
      const stored = localStorage.getItem('custom_ai_agents');
      return stored ? JSON.parse(stored) : [];
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      personality: '',
      provider: 'openai',
      model: 'gpt-4o',
      color: 'bg-blue-500',
      temperature: 0.7,
      maxTokens: 200,
      customApiKey: ''
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.description || !formData.personality) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newAgent: AIAgent = {
      ...formData,
      id: `custom_${Date.now()}`,
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString()
    };

    // Store in localStorage for now
    const stored = localStorage.getItem('custom_ai_agents');
    const existingAgents = stored ? JSON.parse(stored) : [];
    const updatedAgents = [...existingAgents, newAgent];
    localStorage.setItem('custom_ai_agents', JSON.stringify(updatedAgents));

    queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
    setIsCreateOpen(false);
    resetForm();
    toast({
      title: "Agent Created",
      description: "Your AI agent has been created successfully",
    });
  };

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description,
      personality: agent.personality,
      provider: agent.provider,
      model: agent.model,
      color: agent.color,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      customApiKey: agent.customApiKey || ''
    });
  };

  const handleUpdate = () => {
    if (!editingAgent) return;

    const stored = localStorage.getItem('custom_ai_agents');
    const existingAgents = stored ? JSON.parse(stored) : [];
    const updatedAgents = existingAgents.map((agent: AIAgent) => 
      agent.id === editingAgent.id ? { ...agent, ...formData } : agent
    );
    localStorage.setItem('custom_ai_agents', JSON.stringify(updatedAgents));

    queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
    setEditingAgent(null);
    resetForm();
    toast({
      title: "Agent Updated",
      description: "Your AI agent has been updated successfully",
    });
  };

  const handleDelete = (agent: AIAgent) => {
    if (confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
      const stored = localStorage.getItem('custom_ai_agents');
      const existingAgents = stored ? JSON.parse(stored) : [];
      const updatedAgents = existingAgents.filter((a: AIAgent) => a.id !== agent.id);
      localStorage.setItem('custom_ai_agents', JSON.stringify(updatedAgents));

      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
      toast({
        title: "Agent Deleted",
        description: "AI agent has been deleted successfully",
      });
    }
  };

  const getProviderModels = (provider: string) => {
    return providerOptions.find(p => p.value === provider)?.models || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Users className="w-6 h-6" />
            <span>AI Agent Manager</span>
          </h2>
          <p className="text-gray-600">Create and manage custom AI agents for your inbox</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New AI Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Sales Expert"
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Select 
                    value={formData.color} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded-full ${color}`} />
                            <span>{color.replace('bg-', '').replace('-500', '')}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the agent's role"
                />
              </div>

              <div>
                <Label htmlFor="personality">Personality & Instructions *</Label>
                <Textarea
                  id="personality"
                  value={formData.personality}
                  onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                  placeholder="Define the agent's personality, expertise, and how it should respond..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select 
                    value={formData.provider} 
                    onValueChange={(value) => {
                      const models = getProviderModels(value);
                      setFormData(prev => ({ 
                        ...prev, 
                        provider: value,
                        model: models[0] || 'gpt-4o'
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providerOptions.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select 
                    value={formData.model} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getProviderModels(formData.provider).map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="temperature">Temperature: {formData.temperature}</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    min={50}
                    max={1000}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customApiKey">Custom API Key (Optional)</Label>
                <Input
                  id="customApiKey"
                  type="password"
                  value={formData.customApiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, customApiKey: e.target.value }))}
                  placeholder="Enter custom API key for this agent"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  Create Agent
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Default Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <span>Default Agents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Sales Expert', description: 'Conversion focused professional', provider: 'OpenAI', color: 'bg-green-500' },
              { name: 'Customer Support', description: 'Helpful problem solver', provider: 'OpenAI', color: 'bg-blue-500' },
              { name: 'Marketing Guru', description: 'Creative content specialist', provider: 'Anthropic', color: 'bg-purple-500' },
              { name: 'Tech Advisor', description: 'Technical expertise', provider: 'OpenAI', color: 'bg-orange-500' },
              { name: 'Business Consultant', description: 'Strategic business advice', provider: 'Anthropic', color: 'bg-indigo-500' }
            ].map((agent, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-4 h-4 rounded-full ${agent.color}`} />
                  <h3 className="font-semibold">{agent.name}</h3>
                  <Badge variant="secondary" className="text-xs">{agent.provider}</Badge>
                </div>
                <p className="text-sm text-gray-600">{agent.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Custom Agents ({agents.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No custom agents created yet</p>
              <p className="text-sm">Create your first AI agent to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent: AIAgent) => (
                <div key={agent.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${agent.color}`} />
                      <h3 className="font-semibold">{agent.name}</h3>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(agent)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(agent)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="secondary">{agent.provider}</Badge>
                    <span className="text-gray-500">{agent.usageCount} uses</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Agent Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit AI Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Agent Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sales Expert"
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Select 
                  value={formData.color} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full ${color}`} />
                          <span>{color.replace('bg-', '').replace('-500', '')}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the agent's role"
              />
            </div>

            <div>
              <Label htmlFor="edit-personality">Personality & Instructions *</Label>
              <Textarea
                id="edit-personality"
                value={formData.personality}
                onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                placeholder="Define the agent's personality, expertise, and how it should respond..."
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingAgent(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Agent
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}