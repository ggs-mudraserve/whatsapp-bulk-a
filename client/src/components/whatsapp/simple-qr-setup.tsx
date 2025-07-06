import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Smartphone, CheckCircle, AlertTriangle, RefreshCw, Trash2, Wifi } from "lucide-react";

type ConnectionStatus = 'idle' | 'connecting' | 'qr_ready' | 'connected' | 'error' | 'rate_limited';

export default function SimpleQRSetup() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitEndTime, setRateLimitEndTime] = useState<Date | null>(null);
  const [timeUntilRetry, setTimeUntilRetry] = useState<string>('');

  const { toast } = useToast();
  const { user } = useAuth();

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/whatsapp/clear-cache", {});
    },
    onSuccess: () => {
      toast({
        title: "Cache Cleared",
        description: "Connection data reset. Try connecting again.",
      });
      resetConnection();
      setRetryCount(0);
      setIsRateLimited(false);
      setRateLimitEndTime(null);
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
        description: "Failed to clear cache",
        variant: "destructive",
      });
    },
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/whatsapp/start-session", {});
      return response;
    },
    onSuccess: (data: any) => {
      setSessionId(data.sessionId);
      connectWebSocket(data.sessionId);
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
      
      setConnectionStatus('error');
      setErrorMessage('Failed to start WhatsApp session');
      toast({
        title: "Connection Failed",
        description: "Failed to start WhatsApp session",
        variant: "destructive",
      });
    },
  });

  // Rate limit timer
  useEffect(() => {
    if (isRateLimited && rateLimitEndTime) {
      const timer = setInterval(() => {
        const now = new Date();
        const timeLeft = rateLimitEndTime.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
          setIsRateLimited(false);
          setRateLimitEndTime(null);
          setTimeUntilRetry('');
        } else {
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          setTimeUntilRetry(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isRateLimited, rateLimitEndTime]);

  const connectWebSocket = useCallback((sessionId: string) => {
    try {
      // Close existing socket
      if (socket) {
        socket.close();
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connecting');
        // Send session ID to start QR process
        newSocket.send(JSON.stringify({
          type: 'start_whatsapp',
          sessionId: sessionId,
          userId: (user as any)?.id
        }));
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setErrorMessage('WebSocket connection failed');
      };

      newSocket.onclose = () => {
        console.log('WebSocket disconnected');
        if (connectionStatus === 'connecting' || connectionStatus === 'qr_ready') {
          setConnectionStatus('error');
          setErrorMessage('Connection lost');
        }
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionStatus('error');
      setErrorMessage('Failed to create WebSocket connection');
    }
  }, [socket, connectionStatus, user]);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'qr':
        setQrCodeUrl(data.qr);
        setConnectionStatus('qr_ready');
        setErrorMessage('');
        break;
        
      case 'connected':
        setConnectionStatus('connected');
        setConnectedPhone(data.phoneNumber || 'Connected');
        setQrCodeUrl('');
        setErrorMessage('');
        setRetryCount(0);
        setIsRateLimited(false);
        setRateLimitEndTime(null);
        
        // Refresh the numbers list
        queryClient.invalidateQueries({ queryKey: ['/api/whatsapp-numbers'] });
        
        toast({
          title: "Connected!",
          description: `WhatsApp connected successfully`,
        });
        break;
        
      case 'error':
        handleConnectionError(data);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const handleConnectionError = (data: any) => {
    const errorCode = data.error?.code || data.code;
    const errorMessage = data.error?.message || data.message || 'Connection failed';
    
    console.error('WhatsApp connection error:', errorCode, errorMessage);
    
    setConnectionStatus('error');
    setQrCodeUrl('');
    
    // Handle rate limiting
    if (errorCode === 401 || errorCode === 403 || errorMessage.includes('rate') || errorMessage.includes('limit')) {
      setIsRateLimited(true);
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + 15); // 15 minute cooldown
      setRateLimitEndTime(endTime);
      
      setErrorMessage('WhatsApp has temporarily blocked new connections. Please wait 15 minutes before trying again.');
      setRetryCount(prev => prev + 1);
      
      toast({
        title: "Rate Limited",
        description: "Too many connection attempts. Wait 15 minutes before trying again.",
        variant: "destructive",
      });
    } else if (errorCode === 408 || errorMessage.includes('timeout')) {
      setErrorMessage('Connection timed out. Please try again.');
    } else {
      setErrorMessage(errorMessage);
    }
  };

  const resetConnection = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setConnectionStatus('idle');
    setQrCodeUrl('');
    setConnectedPhone('');
    setErrorMessage('');
    setSessionId('');
  };

  const startConnection = () => {
    if (isRateLimited) {
      toast({
        title: "Rate Limited",
        description: `Please wait ${timeUntilRetry} before trying again.`,
        variant: "destructive",
      });
      return;
    }
    
    resetConnection();
    startSessionMutation.mutate();
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />;
      case 'qr_ready':
        return <QrCode className="w-5 h-5 text-blue-600" />;
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
      case 'rate_limited':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Smartphone className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Initializing WhatsApp connection...';
      case 'qr_ready':
        return 'QR Code ready - Scan with your phone';
      case 'connected':
        return `Connected: ${connectedPhone}`;
      case 'error':
        return isRateLimited ? 'Rate limited - Please wait' : 'Connection failed';
      default:
        return 'Ready to connect';
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-blue-600" />
          WhatsApp QR Connection
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Scan QR code with your WhatsApp to connect
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium">{getStatusText()}</p>
            {isRateLimited && timeUntilRetry && (
              <p className="text-xs text-red-600">Time remaining: {timeUntilRetry}</p>
            )}
          </div>
        </div>

        {/* QR Code Display */}
        {connectionStatus === 'qr_ready' && qrCodeUrl && (
          <div className="text-center space-y-3">
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
              <img 
                src={qrCodeUrl} 
                alt="WhatsApp QR Code" 
                className="w-48 h-48 mx-auto"
                onError={() => {
                  setConnectionStatus('error');
                  setErrorMessage('Failed to load QR code');
                }}
              />
            </div>
            <p className="text-sm text-gray-600">
              Open WhatsApp on your phone and scan this QR code
            </p>
          </div>
        )}

        {/* Error Display */}
        {connectionStatus === 'error' && errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Error:</strong> {errorMessage}
              
              {isRateLimited && (
                <div className="mt-2 text-sm">
                  <p><strong>What to do:</strong></p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>Wait {timeUntilRetry} before trying again</li>
                    <li>Use "Clear Cache" to reset connection data</li>
                    <li>Ensure your phone has good internet connection</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="space-y-2">
          {connectionStatus === 'idle' || connectionStatus === 'error' ? (
            <Button 
              onClick={startConnection}
              disabled={startSessionMutation.isPending || isRateLimited}
              className="w-full"
            >
              {startSessionMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Connecting...
                </>
              ) : isRateLimited ? (
                <>Wait {timeUntilRetry}</>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>
          ) : connectionStatus === 'connected' ? (
            <Button onClick={resetConnection} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button onClick={resetConnection} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          
          {/* Clear Cache Button */}
          {(connectionStatus === 'error' || retryCount > 0) && (
            <Button 
              onClick={() => clearCacheMutation.mutate()} 
              variant="outline"
              disabled={clearCacheMutation.isPending}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {clearCacheMutation.isPending ? 'Clearing...' : 'Clear Cache & Reset'}
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-800 text-sm mb-1">How to connect:</h4>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Click "Generate QR Code" button</li>
            <li>Open WhatsApp on your phone</li>
            <li>Tap menu (⋮) → Linked devices</li>
            <li>Tap "Link a device" and scan the QR code</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}