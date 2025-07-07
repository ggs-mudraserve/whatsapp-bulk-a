import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Smartphone, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ActiveSession {
  sessionId: string;
  phoneNumber: string;
  connected: boolean;
  createdAt: string;
  connectedAt?: string;
}

interface ActiveSessionsResponse {
  success: boolean;
  sessions: ActiveSession[];
  total: number;
}

export default function ConnectedNumbers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading, refetch } = useQuery<ActiveSessionsResponse>({
    queryKey: ['/api/whatsapp/active-sessions'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const disconnectMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest(`/api/whatsapp/session/${sessionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'WhatsApp number disconnected successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp-numbers'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to disconnect WhatsApp number',
        variant: 'destructive',
      });
    },
  });

  const formatPhoneNumber = (phoneNumber: string) => {
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    return `+${phoneNumber}`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Connected WhatsApp Numbers
          </CardTitle>
          <CardDescription>
            Manage your active WhatsApp connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeSessions = sessions?.sessions || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Connected WhatsApp Numbers
          </CardTitle>
          <CardDescription>
            {activeSessions.length > 0 
              ? `You have ${activeSessions.length} active WhatsApp connection${activeSessions.length > 1 ? 's' : ''}`
              : 'No active WhatsApp connections'
            }
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No WhatsApp Numbers Connected</p>
            <p className="text-sm">
              Generate a QR code above to connect your first WhatsApp number
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div 
                key={session.sessionId} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <Smartphone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {formatPhoneNumber(session.phoneNumber)}
                      </span>
                      <Badge 
                        variant={session.connected ? "default" : "secondary"}
                        className={session.connected ? "bg-green-100 text-green-800 border-green-300" : ""}
                      >
                        {session.connected ? 'Connected' : 'Connecting...'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {formatTime(session.createdAt)}
                      {session.connectedAt && (
                        <span className="ml-2">
                          • Connected: {formatTime(session.connectedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={disconnectMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect WhatsApp Number</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to disconnect {formatPhoneNumber(session.phoneNumber)}? 
                        This will end the WhatsApp session and you'll need to scan a QR code again to reconnect.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disconnectMutation.mutate(session.sessionId)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}