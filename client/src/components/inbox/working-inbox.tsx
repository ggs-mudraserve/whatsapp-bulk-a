import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, MessageCircle, Phone, Clock, Send, CheckCheck, Check, MoreVertical, Paperclip, Smile, Bot, Trash2, MessageSquarePlus, Ban, Shield, AlertCircle, FileText, Power, PowerOff, UserMinus, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
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

export default function WorkingInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedNumber, setSelectedNumber] = useState<string>('all');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [aiAgentActive, setAiAgentActive] = useState(false);
  const [selectedAiAgent, setSelectedAiAgent] = useState('');
  const [showAiAgentDialog, setShowAiAgentDialog] = useState(false);
  const [previousConversationCount, setPreviousConversationCount] = useState(0);
  const [previousMessageCounts, setPreviousMessageCounts] = useState<{ [key: number]: number }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Debug conversation selection
  useEffect(() => {
    console.log('Selected Conversation ID:', selectedConversationId);
  }, [selectedConversationId]);

  // Available AI Agents
  const aiAgents = [
    { id: 'sales', name: 'Sales Expert', icon: '💼' },
    { id: 'support', name: 'Customer Support', icon: '🎧' },
    { id: 'marketing', name: 'Marketing Guru', icon: '📈' },
    { id: 'tech', name: 'Tech Advisor', icon: '🔧' },
    { id: 'business', name: 'Business Consultant', icon: '📊' }
  ];

  // Fetch conversations with error handling
  const { 
    data: conversations = [], 
    isLoading: conversationsLoading, 
    error: conversationsError,
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['/api/conversations'],
    refetchInterval: 2000,
    onError: (error: any) => {
      console.error('Error fetching conversations:', error);
    }
  });

  // Fetch WhatsApp sessions
  const { data: whatsappSessions } = useQuery({
    queryKey: ['/api/whatsapp/active-sessions'],
    refetchInterval: 3000,
    onError: (error: any) => {
      console.error('Error fetching WhatsApp sessions:', error);
    }
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/templates'],
    onError: (error: any) => {
      console.error('Error fetching templates:', error);
    }
  });

  // Fetch messages for selected conversation
  const { 
    data: messages = [], 
    isLoading: messagesLoading,
    refetch: refetchMessages,
    error: messagesError 
  } = useQuery({
    queryKey: ['/api/conversations', selectedConversationId, 'messages'],
    enabled: !!selectedConversationId,
    refetchInterval: selectedConversationId ? 2000 : false,
    retry: 1,
    onError: (error: any) => {
      console.error('Messages fetch error:', error);
      console.log('Conversation ID when error occurred:', selectedConversationId);
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string }) => {
      if (!selectedConversationId) throw new Error('No conversation selected');
      
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageData.content,
          direction: 'outgoing',
          status: 'sent',
          messageType: 'text'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setMessageText('');
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully',
      });
      // Refresh messages and conversations
      refetchMessages();
      refetchConversations();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  });

  // Calculate total unread messages
  const totalUnread = Array.isArray(conversations) 
    ? conversations.reduce((sum: number, conv: Conversation) => sum + (conv.unreadCount || 0), 0) 
    : 0;

  // Filter conversations based on search and selected number
  const filteredConversations = Array.isArray(conversations) ? conversations.filter((conv: Conversation) => {
    const matchesSearch = !searchTerm || 
      conv.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contactPhone?.includes(searchTerm);

    if (selectedNumber === 'all') {
      return matchesSearch;
    } else {
      // Filter by specific WhatsApp number
      const selectedSession = whatsappSessions?.sessions?.find((s: WhatsAppSession) => s.id === selectedNumber);
      if (selectedSession) {
        return matchesSearch && conv.whatsappNumberId === selectedSession.whatsappNumberId;
      }
      return matchesSearch;
    }
  }) : [];

  const selectedConversation = filteredConversations.find((conv: Conversation) => conv.id === selectedConversationId);

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

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      return response.json();
    },
    onSuccess: () => {
      setSelectedConversationId(null);
      setShowDeleteDialog(false);
      refetchConversations();
      toast({
        title: 'Chat deleted',
        description: 'The conversation has been deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete chat',
        description: error.message || 'Please try again',
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
      if (!response.ok) {
        throw new Error(`Failed to ${action} contact`);
      }
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
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  });

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Utility functions
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  // Show loading state
  if (conversationsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
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
          <p className="text-gray-500 mb-4">Please check your connection and try again</p>
          <Button onClick={() => refetchConversations()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-6">
      {/* Conversations Sidebar */}
      <Card className="w-96 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
              {totalUnread > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {filteredConversations.length} chats
              </Badge>
            </div>
          </div>
          
          {/* Number Selection */}
          <div className="mb-3">
            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select WhatsApp Number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Numbers</SelectItem>
                {whatsappSessions?.sessions?.filter((session: WhatsAppSession) => session.status === 'connected').map((session: WhatsAppSession) => (
                  <SelectItem key={session.id} value={session.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{session.phoneNumber}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No conversations found</p>
                <p className="text-xs text-gray-400 mt-1">Connect a WhatsApp number to start chatting</p>
              </div>
            ) : (
              filteredConversations.map((conversation: Conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors",
                    selectedConversationId === conversation.id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={`${getAvatarColor(conversation.contactName || '')} text-white text-sm font-medium`}>
                        {getInitials(conversation.contactName || conversation.contactPhone || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.contactName || conversation.contactPhone}
                        </p>
                        {conversation.lastMessageAt && (
                          <p className="text-xs text-gray-500">
                            {formatMessageTime(conversation.lastMessageAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.lastMessage || 'No messages yet'}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`${getAvatarColor(selectedConversation.contactName || '')} text-white text-sm font-medium`}>
                      {getInitials(selectedConversation.contactName || selectedConversation.contactPhone || '')}
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
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messagesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading messages...</p>
                    </div>
                  ) : Array.isArray(messages) && messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-xs text-gray-400">Start the conversation by sending a message</p>
                      <p className="text-xs text-red-400 mt-2">Conversation ID: {selectedConversationId}</p>
                      <p className="text-xs text-blue-400">Messages Array: {JSON.stringify(messages)}</p>
                    </div>
                  ) : (
                    Array.isArray(messages) && messages.length > 0 && messages.map((message: Message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.direction === 'outgoing' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                            message.direction === 'outgoing'
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-900"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={cn(
                            "flex items-center justify-end space-x-1 mt-1",
                            message.direction === 'outgoing' ? "text-blue-100" : "text-gray-500"
                          )}>
                            <span className="text-xs">
                              {formatMessageTime(message.timestamp)}
                            </span>
                            {message.direction === 'outgoing' && (
                              <div className="text-xs">
                                {message.status === 'read' && <CheckCheck className="w-3 h-3" />}
                                {message.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                                {message.status === 'sent' && <Check className="w-3 h-3" />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-gray-50">
              {selectedConversation.status === 'blocked' ? (
                <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Ban className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700 font-medium">This contact is blocked. Unblock to send messages.</span>
                </div>
              ) : (
                <>
                  <div className="flex items-end space-x-2">
                    {/* Attachment Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="mb-1"
                      onClick={() => {
                        toast({
                          title: "Feature Coming Soon",
                          description: "File attachment functionality will be available soon",
                        });
                      }}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    
                    {/* Template Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="mb-1"
                      onClick={() => setShowTemplateDialog(true)}
                    >
                      <FileText className="w-4 h-4" />
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
                  {sendMessageMutation.isPending && (
                    <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                      <span>Sending...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </Card>

      {/* Template Selection Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Template</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowTemplateDialog(false)}
              >
                ×
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No templates available</p>
              ) : (
                templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setMessageText(template.content);
                      setShowTemplateDialog(false);
                      toast({
                        title: "Template Applied",
                        description: `Template "${template.name}" has been added to your message`,
                      });
                    }}
                  >
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <p className="text-xs text-gray-600 mt-1 truncate">{template.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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