import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, MessageCircle, Phone, Send, CheckCheck, Check, MoreVertical, Paperclip, Smile, Bot, Trash2, Power, PowerOff, UserMinus, UserPlus, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { format, isToday, isYesterday } from 'date-fns';

interface Conversation {
  id: number;
  contactId: number;
  contactName: string;
  contactPhone: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: string;
  whatsappNumberId?: number;
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

interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  status: string;
  whatsappNumberId: number;
}

export default function CleanInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedNumber, setSelectedNumber] = useState<string>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [aiAgentActive, setAiAgentActive] = useState(false);
  const [selectedAiAgent, setSelectedAiAgent] = useState('');
  const [showAiAgentDialog, setShowAiAgentDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Available AI Agents
  const aiAgents = [
    { id: 'sales', name: 'Sales Expert', icon: '💼' },
    { id: 'support', name: 'Customer Support', icon: '🎧' },
    { id: 'marketing', name: 'Marketing Guru', icon: '📈' },
    { id: 'tech', name: 'Tech Advisor', icon: '🔧' },
    { id: 'business', name: 'Business Consultant', icon: '📊' }
  ];

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useQuery({
    queryKey: ['/api/conversations'],
    refetchInterval: 5000,
  });

  // Fetch WhatsApp sessions
  const { data: whatsappSessions } = useQuery({
    queryKey: ['/api/whatsapp/active-sessions'],
    refetchInterval: 5000,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const response = await fetch(`/api/messages?conversationId=${selectedConversationId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedConversationId,
    refetchInterval: 2000,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setMessageText('');
      refetchMessages();
      refetchConversations();
      toast({ title: 'Message sent successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete conversation');
      return response.json();
    },
    onSuccess: () => {
      setSelectedConversationId(null);
      setShowDeleteDialog(false);
      refetchConversations();
      toast({ title: 'Chat deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete chat',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Block/Unblock contact mutation
  const toggleBlockMutation = useMutation({
    mutationFn: async ({ contactId, action }: { contactId: number, action: 'block' | 'unblock' }) => {
      const response = await fetch(`/api/contacts/${contactId}/${action}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`Failed to ${action} contact`);
      return response.json();
    },
    onSuccess: (data, variables) => {
      refetchConversations();
      toast({
        title: variables.action === 'block' ? 'Contact blocked' : 'Contact unblocked',
        description: `Contact has been ${variables.action}ed successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate({ content: messageText });
  };

  const handleDeleteConversation = () => {
    if (selectedConversationId) {
      deleteConversationMutation.mutate(selectedConversationId);
    }
  };

  const handleToggleBlock = (contactId: number, currentStatus: string) => {
    const action = currentStatus === 'blocked' ? 'unblock' : 'block';
    toggleBlockMutation.mutate({ contactId, action });
  };

  const handleAiAgentToggle = () => {
    if (!aiAgentActive) {
      setShowAiAgentDialog(true);
    } else {
      setAiAgentActive(false);
      setSelectedAiAgent('');
    }
  };

  const handleSelectAiAgent = (agentId: string) => {
    setSelectedAiAgent(agentId);
    setAiAgentActive(true);
    setShowAiAgentDialog(false);
    toast({
      title: 'AI Agent activated',
      description: `${aiAgents.find(a => a.id === agentId)?.name} is now handling this conversation`,
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM');
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  // Filter conversations
  const filteredConversations = Array.isArray(conversations) ? conversations.filter((conv: Conversation) => {
    const matchesSearch = conv.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.contactPhone?.includes(searchTerm);
    const matchesNumber = selectedNumber === 'all' || 
                         (whatsappSessions?.sessions?.find((s: WhatsAppSession) => s.id === selectedNumber)?.whatsappNumberId === conv.whatsappNumberId);
    return matchesSearch && matchesNumber;
  }) : [];

  const selectedConversation = filteredConversations.find((conv: Conversation) => conv.id === selectedConversationId);

  // Show loading state
  if (conversationsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b border-blue-500 mx-auto mb-4"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (conversationsError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-semibold mb-2 text-gray-700">Unable to load conversations</h3>
          <p className="text-gray-500 mb-4">Error: {conversationsError?.message}</p>
          <Button onClick={() => refetchConversations()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-6">
      {/* Conversations Sidebar */}
      <Card className="w-96 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Conversations</CardTitle>
            <Badge variant="secondary">{filteredConversations.length}</Badge>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* WhatsApp Number Filter */}
          <Select value={selectedNumber} onValueChange={setSelectedNumber}>
            <SelectTrigger>
              <SelectValue placeholder="Select WhatsApp Number" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Numbers</SelectItem>
              {whatsappSessions?.sessions?.filter((session: WhatsAppSession) => session.status === 'connected').map((session: WhatsAppSession) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.phoneNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No conversations found</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conversation: Conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors",
                      selectedConversationId === conversation.id 
                        ? "bg-blue-50 border border-blue-200" 
                        : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                          {(conversation.contactName || conversation.contactPhone).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">
                            {conversation.contactName || conversation.contactPhone}
                          </p>
                          {conversation.lastMessageAt && (
                            <span className="text-xs text-gray-500">
                              {formatTime(conversation.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.lastMessage || 'No messages yet'}
                          </p>
                          <div className="flex items-center space-x-1">
                            {conversation.status === 'blocked' && (
                              <Badge variant="destructive" className="text-xs">Blocked</Badge>
                            )}
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-blue-500 text-white text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                      {(selectedConversation.contactName || selectedConversation.contactPhone).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedConversation.contactName || selectedConversation.contactPhone}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Phone className="w-3 h-3" />
                      <span>{selectedConversation.contactPhone}</span>
                      {selectedConversation.status === 'blocked' && (
                        <Badge variant="destructive" className="text-xs">Blocked</Badge>
                      )}
                      {aiAgentActive && selectedAiAgent && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          {aiAgents.find(a => a.id === selectedAiAgent)?.icon} AI Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* AI Agent Toggle */}
                  <Button 
                    variant={aiAgentActive ? "default" : "ghost"} 
                    size="sm"
                    onClick={handleAiAgentToggle}
                    className={aiAgentActive ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                  >
                    {aiAgentActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                  </Button>
                  
                  {/* Block/Unblock Button */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleToggleBlock(selectedConversation.contactId, selectedConversation.status)}
                    disabled={toggleBlockMutation.isPending}
                  >
                    {selectedConversation.status === 'blocked' ? 
                      <UserPlus className="w-4 h-4 text-green-600" /> : 
                      <UserMinus className="w-4 h-4 text-red-600" />
                    }
                  </Button>
                  
                  {/* Delete Chat Button */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleteConversationMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                  
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {messagesLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {Array.isArray(messages) && messages.length > 0 ? messages.map((message: Message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.direction === 'outgoing' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-xs lg:max-w-md px-3 py-2 rounded-lg",
                            message.direction === 'outgoing'
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-900"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-1 space-x-2">
                            <span className="text-xs opacity-70">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.direction === 'outgoing' && getMessageStatusIcon(message.status)}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">No messages yet</p>
                        <p className="text-sm text-gray-400 mt-2">Start the conversation!</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="border-t p-4">
              {selectedConversation.status === 'blocked' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm text-center">
                    Cannot send messages to blocked contacts
                  </p>
                </div>
              ) : (
                <div className="flex items-end space-x-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendMessageMutation.isPending}
                      className="pr-10"
                    />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2">
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>
                  {aiAgentActive && selectedAiAgent ? (
                    <Button 
                      variant="outline"
                      size="icon"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                      disabled
                    >
                      <Bot className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      size="icon"
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
              {sendMessageMutation.isPending && (
                <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                  <span>Sending...</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </Card>

      {/* AI Agent Selection Dialog */}
      {showAiAgentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select AI Agent</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAiAgentDialog(false)}
              >
                ×
              </Button>
            </div>
            <div className="space-y-2">
              {aiAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex items-center space-x-3"
                  onClick={() => handleSelectAiAgent(agent.id)}
                >
                  <span className="text-2xl">{agent.icon}</span>
                  <div>
                    <h4 className="font-medium text-sm">{agent.name}</h4>
                    <p className="text-xs text-gray-600">AI-powered assistant</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Delete Chat</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this conversation? All messages will be permanently removed.
            </p>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConversation}
                disabled={deleteConversationMutation.isPending}
                className="flex-1"
              >
                {deleteConversationMutation.isPending ? 'Deleting...' : 'Delete Chat'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}