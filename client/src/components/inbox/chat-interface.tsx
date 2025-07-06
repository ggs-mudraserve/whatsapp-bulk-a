import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Paperclip, Send, Tag, MoreVertical, MessageCircle, Bot, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAgent {
  id: string;
  name: string;
  description: string;
  personality: string;
  provider: string;
  model: string;
  color: string;
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
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(1); // Default to first conversation
  const [messageText, setMessageText] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>(defaultAgents[0].id);
  const { toast } = useToast();

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
    retry: false,
  });

  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations"],
    retry: false,
  });

  const selectedConversation = conversations?.find((c: any) => c.id === selectedConversationId);

  const { data: chatbotSettings } = useQuery({
    queryKey: ["/api/chatbot/settings"],
    retry: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; direction: string }) => {
      await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", selectedConversationId, "messages"] 
      });
      setMessageText("");
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
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
          direction: 'outgoing',
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
    if (!messageText.trim() || !selectedConversationId) return;

    const userMessage = messageText;
    const currentAgent = defaultAgents.find(a => a.id === selectedAgent);

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
          conversationId: selectedConversationId,
          config: {
            provider: currentAgent.provider,
            model: currentAgent.model,
            temperature: 0.7,
            maxTokens: 200,
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
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
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${agent.color}`} />
                        <span className="text-sm">{agent.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button variant="ghost" size="icon">
              <Tag className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Active Agent Display */}
        {aiEnabled && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${defaultAgents.find(a => a.id === selectedAgent)?.color}`} />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-sm">{defaultAgents.find(a => a.id === selectedAgent)?.name} Active</span>
                  <Badge variant="secondary" className="text-xs">
                    {defaultAgents.find(a => a.id === selectedAgent)?.provider}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">{defaultAgents.find(a => a.id === selectedAgent)?.description}</p>
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
  );
}
