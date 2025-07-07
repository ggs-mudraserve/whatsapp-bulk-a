import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, MessageCircle, Phone, Clock, Send, CheckCheck, Check, MoreVertical, Paperclip, Smile, Bot, Trash2, MessageSquarePlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format, isToday, isYesterday } from 'date-fns';
import ConnectionWarning from './connection-warning';

interface Conversation {
  id: number;
  contactId: number;
  contactName: string;
  contactPhone: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: string;
}

interface Message {
  id: number;
  conversationId: number;
  content: string;
  direction: 'incoming' | 'outgoing';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  messageType: 'text' | 'image' | 'document';
  timestamp: string;
}

export default function AdvancedInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string>('all');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch WhatsApp numbers for dropdown with real-time sync
  const { data: whatsappSessions = [] } = useQuery({
    queryKey: ['/api/whatsapp/active-sessions'],
    refetchInterval: 2000, // Update every 2 seconds for real-time sync
    refetchIntervalInBackground: true,
  });

  // Debug log to see sessions data
  useEffect(() => {
    if (whatsappSessions?.sessions) {
      console.log('WhatsApp Sessions:', whatsappSessions.sessions);
    }
  }, [whatsappSessions]);

  // Real-time data fetching
  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['/api/conversations'],
    refetchInterval: 2000, // Update every 2 seconds
    refetchIntervalInBackground: true,
  });

  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      return await apiRequest('GET', `/api/messages?conversationId=${selectedConversationId}`);
    },
    enabled: !!selectedConversationId,
    refetchInterval: 1000, // Update messages every 1 second when conversation is open
    refetchIntervalInBackground: true,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string }) => {
      if (!selectedConversationId) throw new Error('No conversation selected');
      
      return await apiRequest('POST', `/api/conversations/${selectedConversationId}/messages`, {
        content: messageData.content,
        direction: 'outgoing',
        messageType: 'text',
      });
    },
    onSuccess: () => {
      setMessageText('');
      // Immediate refresh with slight delay to ensure server processing
      setTimeout(() => {
        refetchMessages();
        refetchConversations();
      }, 100);
      
      toast({
        title: 'Message sent',
        description: 'Your message has been delivered.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send',
        description: 'Message could not be sent. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // New chat mutation
  const newChatMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      // First create/get contact
      const contactResponse = await apiRequest('POST', '/api/contacts', {
        name: phoneNumber,
        phone: phoneNumber.replace(/[^\d]/g, ''),
        tags: [],
        status: 'active'
      });
      
      // Then create conversation
      return await apiRequest('POST', '/api/conversations', {
        contactId: contactResponse.id
      });
    },
    onSuccess: (newConversation) => {
      setSelectedConversationId(newConversation.id);
      setShowNewChat(false);
      setNewChatPhone('');
      refetchConversations();
      toast({
        title: 'New chat created',
        description: 'You can now start messaging.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create chat',
        description: 'Could not create new conversation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations based on search and selected number
  const filteredConversations = conversations.filter((conv: Conversation) => {
    // Filter by search term
    const matchesSearch = conv.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contactPhone?.includes(searchTerm);

    // Filter by selected WhatsApp number (if not "all")
    if (selectedNumber === 'all') {
      return matchesSearch;
    } else {
      // Here you would filter based on which WhatsApp number the conversation belongs to
      // For now, we'll show all conversations as the backend doesn't yet track which number received each message
      return matchesSearch;
    }
  });

  const selectedConversation = conversations.find((conv: Conversation) => conv.id === selectedConversationId);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({ content: messageText });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="h-full">
      <ConnectionWarning />
      <div className="flex h-full gap-6">
        {/* Conversations Sidebar */}
      <Card className="w-96 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {conversations.length} chats
            </Badge>
          </div>
          
          {/* Number Selection */}
          <div className="mb-3">
            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select WhatsApp Number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Numbers</SelectItem>
                {whatsappSessions?.sessions?.map((session) => {
                  if (session.status === 'connected' && session.phoneNumber) {
                    return (
                      <SelectItem key={session.id} value={session.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {session.phoneNumber}
                        </div>
                      </SelectItem>
                    );
                  }
                  return null;
                })}
              </SelectContent>
            </Select>
          </div>

          {/* New Chat Section */}
          <div className="mb-3">
            {showNewChat ? (
              <div className="space-y-2">
                <Input
                  placeholder="Enter phone number (e.g., +1234567890)"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => newChatMutation.mutate(newChatPhone)}
                    disabled={!newChatPhone.trim() || newChatMutation.isPending}
                    className="flex-1"
                  >
                    {newChatMutation.isPending ? 'Creating...' : 'Start Chat'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setShowNewChat(false);
                      setNewChatPhone('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setShowNewChat(true)}
              >
                New Chat
              </Button>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex items-start space-x-3 p-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="font-medium mb-2">No conversations</h3>
              <p className="text-sm">Start a new conversation to see it here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conversation: Conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 cursor-pointer transition-colors relative",
                    selectedConversationId === conversation.id && "bg-blue-50 border-r-4 border-r-blue-500"
                  )}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className={cn(
                          "text-white font-semibold",
                          getAvatarColor(conversation.contactName)
                        )}>
                          {getInitials(conversation.contactName)}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.status === 'active' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate text-sm">
                          {conversation.contactName || conversation.contactPhone}
                        </h3>
                        {conversation.lastMessageAt && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatMessageTime(conversation.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 truncate mb-1">
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {conversation.contactPhone}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-blue-500 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center p-0">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-20 h-20 mx-auto mb-6 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700">Welcome to your inbox</h3>
              <p className="text-gray-500 max-w-sm">
                Select a conversation from the sidebar to start messaging, or create a new conversation using the "New Chat" button.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={cn(
                      "text-white font-semibold",
                      getAvatarColor(selectedConversation.contactName)
                    )}>
                      {getInitials(selectedConversation.contactName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedConversation.contactName || selectedConversation.contactPhone}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {selectedConversation.contactPhone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIPanel(!showAIPanel)}
                    className={cn(
                      "transition-colors",
                      showAIPanel ? "bg-blue-50 text-blue-700 border-blue-300" : ""
                    )}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    AI Agent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (confirm('Delete this conversation? This action cannot be undone.')) {
                        try {
                          await apiRequest(`/api/conversations/${selectedConversationId}`, {
                            method: 'DELETE'
                          });
                          await queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
                          setSelectedConversationId(null);
                          toast({
                            title: "Conversation Deleted",
                            description: "The conversation has been permanently deleted."
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to delete conversation",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn(
                      "animate-pulse flex",
                      i % 2 === 0 ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "p-3 rounded-lg max-w-xs",
                        i % 2 === 0 ? "bg-gray-200" : "bg-gray-100"
                      )}>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-3 bg-gray-300 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="font-medium mb-2">No messages yet</h4>
                  <p className="text-sm">Start the conversation by sending your first message below.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message: Message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.direction === 'outgoing' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl relative",
                        message.direction === 'outgoing'
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      )}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div className={cn(
                          "flex items-center justify-end space-x-1 mt-2",
                          message.direction === 'outgoing' ? "text-blue-100" : "text-gray-500"
                        )}>
                          <span className="text-xs">
                            {format(new Date(message.timestamp), 'HH:mm')}
                          </span>
                          {getStatusIcon(message.status, message.direction)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* AI Panel */}
            {showAIPanel && (
              <div className="border-t bg-blue-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">AI Agent Response</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAIPanel(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    ×
                  </Button>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-blue-700">
                    AI agent will automatically generate responses based on the conversation context.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const lastMessage = messages[messages.length - 1];
                          if (!lastMessage) {
                            toast({
                              title: "No messages",
                              description: "No messages found to generate response for",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          const response = await apiRequest('/api/ai/test-response', {
                            method: 'POST',
                            body: {
                              message: lastMessage.content,
                              provider: 'openai',
                              model: 'gpt-4o',
                              temperature: 0.7,
                              maxTokens: 500
                            }
                          });
                          
                          setMessageText(response.message);
                          toast({
                            title: "AI Response Generated",
                            description: "AI response has been added to the message input"
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to generate AI response",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Generate AI Response
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.location.href = '/ai-agents';
                      }}
                    >
                      Manage Agents
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-end space-x-2">
                <Button variant="ghost" size="icon" className="mb-1">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendMessageMutation.isPending}
                    className="pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2">
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  size="icon"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {sendMessageMutation.isPending && (
                <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                  <span>Sending...</span>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
      </div>
    </div>
  );
}