import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  agent?: Agent;
}

interface ChatTestInterfaceProps {
  agent: Agent;
  onClose: () => void;
}

export default function ChatTestInterface({ agent, onClose }: ChatTestInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: '1',
      text: `Hello! I'm ${agent.name}. ${agent.role}. How can I help you?`,
      sender: 'agent',
      timestamp: new Date(),
      agent
    }]);
  }, [agent]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Send to AI agent
      const response = await fetch('/api/ai/test-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputText,
          provider: agent.aiProvider || 'openai',
          model: agent.aiModel || 'gpt-4o',
          apiKey: agent.apiKey,
          temperature: agent.temperature || 0.7,
          maxTokens: agent.maxTokens || 500,
          customInstructions: agent.prompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        sender: 'agent',
        timestamp: new Date(),
        agent
      };

      setMessages(prev => [...prev, agentMessage]);

      // Also sync to inbox if needed
      await syncToInbox(userMessage, agentMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI agent",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncToInbox = async (userMessage: Message, agentMessage: Message) => {
    try {
      // Create or get conversation for AI testing
      const response = await fetch('/api/conversations/ai-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agent.id,
          agentName: agent.name
        })
      });

      if (response.ok) {
        const conversation = await response.json();
        
        // Send both messages to conversation
        await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            content: userMessage.text,
            direction: 'inbound',
            messageType: 'text'
          })
        });

        await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            content: agentMessage.text,
            direction: 'outbound',
            messageType: 'text'
          })
        });
      }
    } catch (error) {
      console.error('Error syncing to inbox:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const IconComponent = agent.icon || Bot;

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${agent.color}`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold">{agent.name}</div>
            <div className="text-sm text-gray-500 font-normal">{agent.role}</div>
          </div>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {agent.aiProvider} • {agent.aiModel}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start gap-2 max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    message.sender === 'user'
                      ? 'bg-blue-100'
                      : agent.color || 'bg-gray-100'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-blue-600" />
                  ) : (
                    <IconComponent className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <div className={`p-2 rounded-full ${agent.color || 'bg-gray-100'}`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!inputText.trim() || isLoading}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}