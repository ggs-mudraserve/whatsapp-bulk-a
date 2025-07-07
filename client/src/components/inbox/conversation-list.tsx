import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversation } from "@/contexts/conversation-context";

export default function ConversationList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedConversation, setSelectedConversation } = useConversation();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["/api/conversations"],
    retry: false,
  });

  const filteredConversations = conversations?.filter((conversation: any) =>
    conversation.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.contactPhone.includes(searchTerm)
  ) || [];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Conversations</CardTitle>
          <Button variant="ghost" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
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
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conversation: any) => (
              <div
                key={conversation.id}
                className={cn(
                  "p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors",
                  selectedConversation?.id === conversation.id && "bg-blue-50"
                )}
                onClick={() => setSelectedConversation(conversation)}
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
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {conversation.contactName}
                      </p>
                      <span className="text-xs text-gray-500">
                        {conversation.lastMessageAt 
                          ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          : 'No messages'
                        }
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{conversation.contactPhone}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
              <p className="text-sm">Start a conversation to see it here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
