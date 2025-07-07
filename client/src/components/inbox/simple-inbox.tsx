import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, MessageCircle, Phone, User } from "lucide-react";
import type { Conversation, Message } from "@shared/schema";

export default function SimpleInbox() {
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError } = useQuery({
    queryKey: ['/api/conversations'],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages', selectedConversationId],
    enabled: !!selectedConversationId,
    refetchInterval: 1000, // Refresh every second
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      return apiRequest(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        body: { content, type: 'outgoing' }
      });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

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

  // Filter conversations based on search
  const filteredConversations = Array.isArray(conversations) ? conversations.filter((conv: Conversation) =>
    conv.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contactPhone?.includes(searchQuery)
  ) : [];

  const selectedConversation = filteredConversations.find((conv: Conversation) => conv.id === selectedConversationId);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show loading state
  if (conversationsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold mb-2 text-gray-700">Unable to load conversations</h3>
          <p className="text-gray-500 mb-4">Please check your connection and try again</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/conversations'] })}>
            Retry
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
            <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {filteredConversations.length} chats
            </Badge>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversationId === conversation.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
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
                            {formatTime(conversation.lastMessageAt)}
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
                  </div>
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
                  {Array.isArray(messages) && messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-xs text-gray-400">Start the conversation by sending a message</p>
                    </div>
                  ) : (
                    Array.isArray(messages) && messages.map((message: Message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.type === 'outgoing'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'outgoing' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-end space-x-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendMessageMutation.isPending}
                  />
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
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}