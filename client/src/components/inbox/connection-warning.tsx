import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function ConnectionWarning() {
  const { data: activeSessions } = useQuery({
    queryKey: ['/api/whatsapp/active-sessions'],
    refetchInterval: 5000,
  });

  const hasActiveConnections = activeSessions?.sessions?.length > 0;

  if (hasActiveConnections) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-orange-800">
          <p className="font-medium">No WhatsApp connections active</p>
          <p className="text-sm mt-1">Messages will be saved but not delivered. Connect a WhatsApp number to send messages.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
          onClick={() => window.location.href = '/whatsapp-setup'}
        >
          <Settings className="w-4 h-4 mr-2" />
          Connect WhatsApp
        </Button>
      </AlertDescription>
    </Alert>
  );
}