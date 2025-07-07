import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Paperclip, Send, Tag, MoreVertical, MessageCircle, Bot, Sparkles, User, RefreshCw, CheckCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversation } from "@/contexts/conversation-context";
import { format, isToday, isYesterday } from 'date-fns';

interface AIAgent {
  id: string;
  name: string;
  description: string;
  personality: string;
  provider: string;
  model: string;
  color: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

const defaultAgents: AIAgent[] = [
  {
    id: 'sales-expert',
    name: 'Sales Expert',
    description: 'Professional sales assistant focused on conversions',
    personality: 'Professional sales expert who understands customer needs and drives conversions with persuasive communication.',
    provider: 'openai',
    model: 'gpt-4o',
    color: 'bg-green-500'
  },
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Helpful support agent for queries and issues',
    personality: 'Friendly and patient customer support representative who provides clear solutions and maintains customer satisfaction.',
    provider: 'openai',
    model: 'gpt-4o',
    color: 'bg-blue-500'
  },
  {
    id: 'marketing-guru',
    name: 'Marketing Guru',
    description: 'Creative marketing specialist with engaging content',
    personality: 'Creative marketing specialist who creates engaging content, understands trends, and builds brand awareness.',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    color: 'bg-purple-500'
  },
  {
    id: 'tech-advisor',
    name: 'Tech Advisor',
    description: 'Technical expert for product specifications',
    personality: 'Technical expert who explains complex concepts simply and provides accurate product information.',
    provider: 'openai',
    model: 'gpt-4o',
    color: 'bg-orange-500'
  },
  {
    id: 'business-consultant',
    name: 'Business Consultant',
    description: 'Strategic business advisor for B2B conversations',
    personality: 'Strategic business consultant who understands enterprise needs and provides valuable business insights.',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    color: 'bg-indigo-500'
  }
];

export default function ChatInterface() {
  const { selectedConversation } = useConversation();
  
  const [messageText, setMessageText] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [allAgents, setAllAgents] = useState<AIAgent[]>([]);
  const [showTestPopup, setShowTestPopup] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load custom agents from localStorage on mount
  useEffect(() => {
    const loadAgents = () => {
      const customAgents = localStorage.getItem('customAgents');
      if (customAgents) {
        try {
          const parsed = JSON.parse(customAgents);
          setAllAgents(parsed); // Only show custom agents, not defaults
          if (parsed.length > 0 && !selectedAgent) {
            setSelectedAgent(parsed[0].id); // Set first custom agent as default
          }
        } catch (error) {
          console.error('Error loading custom agents:', error);
          setAllAgents([]); // Empty array if parsing fails
        }
      } else {
        setAllAgents([]); // Empty array if no custom agents
      }
    };

    loadAgents();
    
    // Listen for storage changes to sync in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'customAgents') {
        loadAgents();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Test response mutation for real AI testing
  const testResponseMutation = useMutation({
    mutationFn: async ({ message, agent }: { message: string; agent: AIAgent }) => {
      return await apiRequest(`/api/ai/test-response`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          provider: agent.provider,
          model: agent.model,
          apiKey: agent.apiKey || '',
          temperature: agent.temperature || 0.7,
          maxTokens: agent.maxTokens || 500,
          customInstructions: agent.personality
        })
      });
    },
    onSuccess: (data) => {
      setTestResponse(data.message);
      setIsTestingAgent(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Test Failed",
        description: "Failed to get AI response. Check your API key configuration.",
        variant: "destructive",
      });
      setIsTestingAgent(false);
    },
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const response = await fetch(`/api/messages?conversationId=${selectedConversation.id}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedConversation?.id,
    retry: false,
  });

  const { data: chatbotSettings } = useQuery({
    queryKey: ["/api/chatbot/settings"],
    retry: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; direction: string }) => {
      return await apiRequest('/api/messages', {
        method: 'POST',
        body: {
          content: data.content,
          conversationId: selectedConversation?.id,
          direction: data.direction,
        },
      });
    },
    onSuccess: () => {
      // Refresh messages and conversations
      queryClient.invalidateQueries({ 
        queryKey: ["/api/messages", selectedConversation?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations"] 
      });
      setMessageText("");
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      
      // Force refresh messages after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ["/api/messages", selectedConversation?.id] 
        });
      }, 500);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  // AI response mutation
  const aiResponseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/ai/chat-response', data);
    },
    onSuccess: (response: any) => {
      if (response.message) {
        // Send AI response as a message
        sendMessageMutation.mutate({
          content: response.message,
          direction: 'incoming',
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "AI response failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation?.id) return;

    const userMessage = messageText;
    const currentAgent = allAgents.find(a => a.id === selectedAgent);

    // Send user message first
    sendMessageMutation.mutate({
      content: userMessage,
      direction: "outgoing",
    });

    // Generate AI response if enabled
    if (aiEnabled && currentAgent) {
      setTimeout(() => {
        aiResponseMutation.mutate({
          message: userMessage,
          agentId: selectedAgent,
          conversationId: selectedConversation.id,
          config: {
            provider: currentAgent.provider,
            model: currentAgent.model,
            temperature: currentAgent.temperature || 0.7,
            maxTokens: currentAgent.maxTokens || 200,
          },
          context: {
            personality: currentAgent.personality,
            businessName: chatbotSettings?.businessName || 'Our Business',
          }
        });
      }, 1000); // Small delay to show AI is thinking
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Select a conversation</p>
          <p className="text-sm">Choose a conversation from the list to start messaging</p>
        </div>
      </Card>
    );
  }

  // Debug logging
  console.log('ChatInterface - selectedConversation:', selectedConversation);
  console.log('ChatInterface - messages:', messages);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  const getStatusIcon = (status: string, direction: string) => {
    if (direction !== 'outgoing') return null;
    
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
          <p>Choose a conversation from the list to start messaging</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
      {/* Chat Header */}
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
              getAvatarColor(selectedConversation.contactName)
            )}>
              {getInitials(selectedConversation.contactName)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {selectedConversation.contactName}
              </p>
              <p className="text-xs text-gray-500">
                {selectedConversation.contactPhone}
              </p>
            </div>
          </div>
          
          {/* AI Chatbot Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={aiEnabled}
                onCheckedChange={setAiEnabled}
                id="ai-toggle"
              />
              <Label htmlFor="ai-toggle" className="text-sm font-medium">
                AI Agent
              </Label>
            </div>
            
            {aiEnabled && (
              allAgents.length > 0 ? (
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${agent.color}`} />
                          <span className="text-sm">{agent.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-xs text-gray-500 px-2">
                  No AI agents created. Go to AI Agents to create one.
                </div>
              )
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTestPopup(true)}
              className="text-xs px-2"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Test Response
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "AI Agent Sync",
                  description: "This conversation is automatically synced with your AI Agents. Test responses from the AI Agents page appear here."
                });
              }}
              className="text-xs px-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Sync
            </Button>
            
            <Button variant="ghost" size="icon">
              <Tag className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Active Agent Display */}
        {aiEnabled && selectedAgent && allAgents.find(a => a.id === selectedAgent) && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${allAgents.find(a => a.id === selectedAgent)?.color}`} />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-sm">{allAgents.find(a => a.id === selectedAgent)?.name} Active</span>
                  <Badge variant="secondary" className="text-xs">
                    {allAgents.find(a => a.id === selectedAgent)?.provider}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">{allAgents.find(a => a.id === selectedAgent)?.description}</p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className={cn(
                  "flex",
                  i % 2 === 0 ? "justify-start" : "justify-end"
                )}>
                  <div className={cn(
                    "max-w-xs lg:max-w-md px-4 py-2 rounded-xl",
                    i % 2 === 0 ? "bg-gray-200" : "bg-blue-200"
                  )}>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : messages?.length > 0 ? (
          messages.map((message: any) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.direction === "incoming" ? "justify-start" : "justify-end"
              )}
            >
              <div className={cn(
                "max-w-xs lg:max-w-md px-4 py-2 rounded-xl",
                message.direction === "incoming" 
                  ? "bg-gray-100 text-gray-800" 
                  : "bg-blue-500 text-white"
              )}>
                <p className="text-sm">{message.content}</p>
                <p className={cn(
                  "text-xs mt-1",
                  message.direction === "incoming" ? "text-gray-500" : "text-blue-100"
                )}>
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation by sending a message</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
    
    {/* Test Response Dialog */}
    <Dialog open={showTestPopup} onOpenChange={setShowTestPopup}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Test AI Agent Response</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Agent Selection */}
          <div>
            <Label className="text-sm font-medium">Select Agent to Test</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${agent.color}`} />
                      <span className="text-sm">{agent.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({agent.provider} • {agent.model})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Test Message Input */}
          <div>
            <Label className="text-sm font-medium">Test Message</Label>
            <Textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Type a message to test the AI agent's response..."
              className="mt-1 min-h-[100px]"
            />
          </div>
          
          {/* Test Button */}
          <Button
            onClick={() => {
              const agent = allAgents.find(a => a.id === selectedAgent);
              if (agent && testMessage.trim()) {
                setIsTestingAgent(true);
                setTestResponse("");
                testResponseMutation.mutate({ message: testMessage, agent });
              } else {
                toast({
                  title: "Invalid Input",
                  description: "Please select an agent and enter a test message.",
                  variant: "destructive",
                });
              }
            }}
            disabled={isTestingAgent || !testMessage.trim()}
            className="w-full"
          >
            {isTestingAgent ? (
              <>
                <Bot className="w-4 h-4 mr-2 animate-spin" />
                Getting Response...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Test Agent Response
              </>
            )}
          </Button>
          
          {/* AI Response */}
          {testResponse && (
            <div className="mt-4">
              <Label className="text-sm font-medium">AI Response</Label>
              <div className="mt-1 p-3 bg-gray-50 border rounded-lg">
                <p className="text-sm">{testResponse}</p>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                💡 This conversation is automatically synced to your inbox for easy reference.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
