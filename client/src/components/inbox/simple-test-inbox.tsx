import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, MessageCircle, Send } from 'lucide-react';

export default function SimpleTestInbox() {
  console.log('SimpleTestInbox rendering...');

  // Test basic query
  const { data: conversations = [], isLoading, error } = useQuery({
    queryKey: ['/api/conversations'],
    retry: 1,
  });

  console.log('SimpleTestInbox state:', { 
    conversationsLength: conversations?.length, 
    isLoading, 
    error: error?.message 
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b border-blue-500 mx-auto mb-4"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Conversations</h3>
          <p className="text-gray-600 mb-4">Error: {error.message}</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">WhatsApp Inbox</h2>
        <p className="text-gray-600">Manage your conversations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations List */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Conversations ({conversations.length})
          </h3>
          
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No conversations yet</p>
              <p className="text-sm text-gray-400 mt-2">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv: any) => (
                <div 
                  key={conv.id} 
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{conv.contactName || conv.contactPhone}</h4>
                      <p className="text-sm text-gray-500">{conv.contactPhone}</p>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Chat Area */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Chat
          </h3>
          
          <div className="text-center py-8">
            <Send className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Select a conversation to start chatting</p>
          </div>
        </Card>
      </div>
    </div>
  );
}