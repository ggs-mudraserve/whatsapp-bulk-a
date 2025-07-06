import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Paperclip, Send, Tag, MoreVertical, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatInterface() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(1); // Default to first conversation
  const [messageText, setMessageText] = useState("");
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

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversationId) return;

    sendMessageMutation.mutate({
      content: messageText,
      direction: "outgoing",
    });
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
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Tag className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
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
