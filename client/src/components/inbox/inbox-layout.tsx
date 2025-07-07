import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Phone, Clock, Send, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Conversation {
  id: number;
  contactName: string;
  contactPhone: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface Message {
  id: number;
  content: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  status: string;
}

export default function InboxLayout() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const { toast } = useToast();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/conversations'],
    refetchInterval: 5000,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages', selectedConversationId],
    enabled: !!selectedConversationId,
    refetchInterval: 3000,
  });

  const selectedConversation = conversations.find((conv: Conversation) => conv.id === selectedConversationId);

  const filteredConversations = conversations.filter((conv: Conversation) =>
    conv.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contactPhone?.includes(searchTerm)
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      await apiRequest('POST', `/api/conversations/${selectedConversationId}/messages`, {
        content: messageText,
        direction: 'outgoing',
        messageType: 'text'
      });
      
      // Refresh messages
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      setMessageText('');
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex h-full gap-4">
      {/* Conversations List */}
      <Card className="w-1/3 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <Badge variant="secondary">{conversations.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-start space-x-3 p-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation: Conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "p-4 hover:bg-gray-50 cursor-pointer border-b transition-colors",
                  selectedConversationId === conversation.id && "bg-blue-50 border-l-4 border-l-blue-500"
                )}
                onClick={() => setSelectedConversationId(conversation.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                    getAvatarColor(conversation.contactName)
                  )}>
                    {getInitials(conversation.contactName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.contactName || conversation.contactPhone}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-blue-500 text-white text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400">{conversation.contactPhone}</p>
                      {conversation.lastMessageAt && (
                        <div className="flex items-center text-xs text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(conversation.lastMessageAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Chat Interface */}
      <Card className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                  getAvatarColor(selectedConversation.contactName)
                )}>
                  {getInitials(selectedConversation.contactName)}
                </div>
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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className={cn(
                        "p-3 rounded-lg max-w-xs",
                        i % 2 === 0 ? "bg-gray-200 ml-auto" : "bg-gray-200"
                      )}>
                        <div className="h-4 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation by sending a message</p>
                </div>
              ) : (
                messages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.direction === 'outgoing' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                      message.direction === 'outgoing'
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    )}>
                      <p className="text-sm">{message.content}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        message.direction === 'outgoing' ? "text-blue-100" : "text-gray-500"
                      )}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}