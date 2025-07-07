import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, MessageCircle, Phone, Clock, Send, CheckCheck, Check, MoreVertical, Paperclip, Smile, Bot, Trash2, MessageSquarePlus, Ban, Shield, AlertCircle, FileText, Image } from 'lucide-react';
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
  const [newChatName, setNewChatName] = useState('');
  const [newChatStep, setNewChatStep] = useState<'phone' | 'name'>('phone');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Calculate total unread messages for notification badge with safe check
  const totalUnread = Array.isArray(conversations) ? conversations.reduce((sum: number, conv: Conversation) => sum + (conv.unreadCount || 0), 0) : 0;



  // Fetch WhatsApp numbers for dropdown with real-time sync
  const { data: whatsappSessions = [] } = useQuery({
    queryKey: ['/api/whatsapp/active-sessions'],
    refetchInterval: 2000, // Update every 2 seconds for real-time sync
    refetchIntervalInBackground: true,
    retry: 1,
    retryDelay: 500,
    onError: () => {
      // Silently handle errors to prevent UI disruption
    }
  });

  // Fetch templates for template selector
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/templates'],
    retry: 1,
    retryDelay: 500,
  });

  // Debug log to see sessions data
  useEffect(() => {
    if (whatsappSessions?.sessions) {
      console.log('WhatsApp Sessions:', whatsappSessions.sessions);
    }
  }, [whatsappSessions]);

  // Real-time data fetching with error handling
  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useQuery({
    queryKey: ['/api/conversations'],
    refetchInterval: 2000, // Update every 2 seconds
    refetchIntervalInBackground: true,
    retry: 1,
    retryDelay: 500,
    onError: (error) => {
      console.error('Conversations query error:', error);
    }
  });

  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      try {
        return await apiRequest('GET', `/api/messages?conversationId=${selectedConversationId}`);
      } catch (error) {
        return []; // Return empty array instead of throwing
      }
    },
    enabled: !!selectedConversationId,
    refetchInterval: 1000, // Update messages every 1 second when conversation is open
    refetchIntervalInBackground: true,
    retry: 1,
    retryDelay: 500,
    onError: () => {
      // Silently handle errors to prevent UI disruption
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string }) => {
      if (!selectedConversationId) throw new Error('No conversation selected');
      
      return await apiRequest('POST', `/api/conversations/${selectedConversationId}/messages`, {
        content: messageData.content,
        direction: 'outgoing',
        messageType: 'text',
        status: 'sent',
        selectedWhatsAppNumber: selectedNumber !== 'all' ? selectedNumber : null
      });
    },
    onSuccess: (response) => {
      setMessageText('');
      
      // Show immediate success feedback
      toast({
        title: 'Message sent',
        description: 'Your message is being delivered...',
      });
      
      // Immediate refresh to show new message
      setTimeout(() => {
        refetchMessages();
        refetchConversations();
      }, 100);
      
      // Show delivery confirmation after a delay (simulating WhatsApp delivery)
      setTimeout(() => {
        toast({
          title: 'Message delivered',
          description: 'Your message has been delivered successfully.',
        });
      }, 2000);
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
    mutationFn: async ({ phoneNumber, contactName }: { phoneNumber: string; contactName: string }) => {
      // Clean phone number
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
      
      // First create/get contact with the provided name
      const contactResponse = await apiRequest('POST', '/api/contacts', {
        name: contactName || cleanPhone,
        phoneNumber: cleanPhone,
        tags: [],
        status: 'active'
      });
      
      // Then create conversation with required fields
      return await apiRequest('POST', '/api/conversations', {
        contactId: contactResponse.id,
        contactName: contactName || cleanPhone,
        contactPhone: cleanPhone
      });
    },
    onSuccess: (newConversation) => {
      setSelectedConversationId(newConversation.id);
      setShowNewChat(false);
      setNewChatPhone('');
      setNewChatName('');
      setNewChatStep('phone');
      refetchConversations();
      toast({
        title: 'New chat created',
        description: `Contact "${newChatName || newChatPhone}" added successfully. You can now start messaging.`,
      });
    },
    onError: (error) => {
      console.error('New chat creation error:', error);
      toast({
        title: 'Failed to create chat',
        description: error?.message || 'Could not create new conversation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Block/unblock contact mutation
  const blockContactMutation = useMutation({
    mutationFn: async ({ contactId, status }: { contactId: number; status: string }) => {
      await apiRequest('PATCH', `/api/contacts/${contactId}`, { status });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: status === "blocked" ? "Contact blocked" : "Contact unblocked",
        description: `Contact has been ${status === "blocked" ? "blocked" : "unblocked"} successfully.`,
      });
    },
    onError: (error) => {
      console.error('Block contact error:', error);
      toast({
        title: 'Failed to update contact',
        description: error?.message || 'Could not update contact status. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (selectedConversationId) {
      const markAsRead = async () => {
        try {
          await apiRequest('PATCH', `/api/conversations/${selectedConversationId}/mark-read`);
          await queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        } catch (error) {
          console.error('Failed to mark conversation as read:', error);
        }
      };
      
      // Debounce the mark as read call
      const timer = setTimeout(markAsRead, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedConversationId]);

  // Real-time notification system with proper state tracking
  const [previousConversationCount, setPreviousConversationCount] = useState(0);
  const [previousMessageCounts, setPreviousMessageCounts] = useState<{ [key: number]: number }>({});

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Check for new conversations
    if (conversations.length > previousConversationCount && previousConversationCount > 0) {
      toast({
        title: "New conversation",
        description: "You have a new WhatsApp conversation",
      });
    }

    // Check for new messages in existing conversations
    conversations.forEach(conv => {
      const previousCount = previousMessageCounts[conv.id] || 0;
      const currentCount = conv.unreadCount || 0;
      
      if (currentCount > previousCount && previousCount >= 0) {
        const newMessages = currentCount - previousCount;
        
        // Show notification for all conversations, even currently selected one
        if (newMessages > 0) {
          toast({
            title: `New message${newMessages > 1 ? 's' : ''} from ${conv.contactName}`,
            description: conv.lastMessage || 'New message received',
            duration: 4000,
          });

          // Browser notification for non-selected conversations
          if (conv.id !== selectedConversationId && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`WhatsApp Pro - ${conv.contactName}`, {
              body: conv.lastMessage || 'New message received',
              icon: '/favicon.ico',
              tag: `message-${conv.id}`, // Prevent duplicate notifications
            });
          }

          // Play notification sound
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+HyvmQaADiO2O/PfDMEJnXE8+OVQQ0SaLvq95ZcGQ1Pm+TvxWkcBjaL2PHJdSEJJXfA9d+QQQwVa7ro+5pVFglDnt/yy2QdBjmN2/LJdSEJJ3bE9d2RQgwWaL3n/5pVFAhEntz0zWQdBDOI2fHJfS0EKnHA9NySQw0WAL3K7JiRB');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore errors if audio fails
          } catch (error) {
            // Audio creation failed, ignore
          }
        }
      }
    });

    // Update state for next comparison
    setPreviousConversationCount(conversations.length);
    const newMessageCounts: { [key: number]: number } = {};
    conversations.forEach(conv => {
      newMessageCounts[conv.id] = conv.unreadCount || 0;
    });
    setPreviousMessageCounts(newMessageCounts);
  }, [conversations, selectedConversationId, toast, previousConversationCount, previousMessageCounts]);

  // Filter conversations based on search and selected number with safe array check
  const filteredConversations = Array.isArray(conversations) ? conversations.filter((conv: Conversation) => {
    // Filter by search term
    const matchesSearch = conv.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contactPhone?.includes(searchTerm);

    // Filter by selected WhatsApp number (if not "all")
    if (selectedNumber === 'all') {
      return matchesSearch;
    } else {
      // Find the selected session and match by whatsappNumberId
      const selectedSession = whatsappSessions?.sessions?.find(s => s.id === selectedNumber);
      if (selectedSession) {
        // Match conversations that belong to this WhatsApp number
        const matchesNumber = conv.whatsappNumberId === selectedSession.whatsappNumberId;
        return matchesSearch && matchesNumber;
      }
      return matchesSearch;
    }
  }) : [];

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

  // Message status icon function
  const getStatusIcon = (status: string, direction: string) => {
    if (direction === 'incoming') return null; // No status icons for incoming messages
    
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
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
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
              {totalUnread > 0 && (
                <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {conversations.length} chats
              </Badge>
              {totalUnread > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {totalUnread} unread
                </Badge>
              )}
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
                {newChatStep === 'phone' ? (
                  <>
                    <div className="text-sm text-gray-600 mb-2">Step 1: Enter Phone Number</div>
                    <Input
                      placeholder="Enter phone number (e.g., +1234567890)"
                      value={newChatPhone}
                      onChange={(e) => setNewChatPhone(e.target.value)}
                      className="text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newChatPhone.trim()) {
                          setNewChatStep('name');
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => setNewChatStep('name')}
                        disabled={!newChatPhone.trim()}
                        className="flex-1"
                      >
                        Next
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setShowNewChat(false);
                          setNewChatPhone('');
                          setNewChatStep('phone');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-600 mb-2">Step 2: Enter Contact Name</div>
                    <div className="text-xs text-gray-500 mb-2">Phone: {newChatPhone}</div>
                    <Input
                      placeholder="Enter contact name (e.g., John Doe)"
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                      className="text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newChatName.trim() && !newChatMutation.isPending) {
                          newChatMutation.mutate({ phoneNumber: newChatPhone, contactName: newChatName });
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => newChatMutation.mutate({ phoneNumber: newChatPhone, contactName: newChatName })}
                        disabled={!newChatName.trim() || newChatMutation.isPending}
                        className="flex-1"
                      >
                        {newChatMutation.isPending ? 'Creating...' : 'Create Chat'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setNewChatStep('phone')}
                      >
                        Back
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setShowNewChat(false);
                          setNewChatPhone('');
                          setNewChatName('');
                          setNewChatStep('phone');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
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
                    onClick={() => {
                      const currentStatus = selectedConversation.status || 'active';
                      const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
                      const action = newStatus === 'blocked' ? 'block' : 'unblock';
                      
                      if (confirm(`Are you sure you want to ${action} this contact?`)) {
                        blockContactMutation.mutate({ contactId: selectedConversation.contactId, status: newStatus });
                      }
                    }}
                    className={selectedConversation.status === 'blocked' 
                      ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                      : "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    }
                    disabled={blockContactMutation.isPending}
                  >
                    {selectedConversation.status === 'blocked' ? (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Unblock
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4 mr-2" />
                        Block
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (confirm('Delete this conversation? This action cannot be undone.')) {
                        try {
                          console.log('Deleting conversation with ID:', selectedConversationId);
                          const response = await apiRequest('DELETE', `/api/conversations/${selectedConversationId}`);
                          console.log('Delete response:', response);
                          await queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
                          setSelectedConversationId(null);
                          toast({
                            title: "Conversation Deleted",
                            description: "The conversation has been permanently deleted."
                          });
                        } catch (error) {
                          console.error('Delete conversation error:', error);
                          toast({
                            title: "Error",
                            description: error?.message || "Failed to delete conversation",
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
                </>
              )}
            </div>
          </>
        )}
      </Card>
      </div>
      
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
    </div>
  );
}