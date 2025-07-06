import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Smartphone, CheckCircle, AlertTriangle, RefreshCw, Wifi, Trash2 } from "lucide-react";

type ConnectionStatus = 'idle' | 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'error';

export default function ImprovedQRSetup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number>(0);

  const connectToWebSocket = (sessionId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WhatsApp WebSocket connected');
      setConnectionStatus('connecting');
      
      // Start WhatsApp session
      ws.send(JSON.stringify({
        type: 'start_session',
        sessionId,
        userId: (user as any)?.id || 'unknown'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WhatsApp WebSocket disconnected');
      if (connectionStatus !== 'connected') {
        setConnectionStatus('disconnected');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection Error",
        description: "Failed to connect to WhatsApp service. Please try again.",
        variant: "destructive",
      });
    };
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'qr_code':
        setQrCodeUrl(data.qrCode);
        setConnectionStatus('qr_ready');
        toast({
          title: "QR Code Ready",
          description: "Scan with your WhatsApp mobile app to connect",
        });
        break;
      
      case 'connected':
        setConnectedPhone(data.phoneNumber);
        setConnectionStatus('connected');
        setQrCodeUrl('');
        
        // Refresh the WhatsApp numbers list
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-numbers"] });
        
        toast({
          title: "WhatsApp Connected Successfully!",
          description: `${data.phoneNumber} has been added to your active numbers`,
        });
        break;
      
      case 'disconnected':
        setConnectionStatus('disconnected');
        setQrCodeUrl('');
        setConnectedPhone('');
        
        const isRateLimit = data.statusCode === 401;
        const canRetry = data.canRetry;
        
        toast({
          title: isRateLimit ? "Rate Limited by WhatsApp" : "Connection Failed",
          description: data.message || "Connection failed. Please try again.",
          variant: "destructive",
        });
        
        // If rate limited, prevent attempts for longer period
        if (isRateLimit) {
          setLastConnectionAttempt(Date.now() + (15 * 60 * 1000)); // Block for 15 minutes
        }
        break;
      
      case 'error':
        setConnectionStatus('error');
        toast({
          title: "Error",
          description: data.message || "An error occurred during connection",
          variant: "destructive",
        });
        break;
    }
  };

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/whatsapp/start-session", {});
      return response;
    },
    onSuccess: (data: any) => {
      setSessionId(data.sessionId);
      setLastConnectionAttempt(Date.now());
      connectToWebSocket(data.sessionId);
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
      toast({
        title: "Error",
        description: "Failed to start WhatsApp session",
        variant: "destructive",
      });
    },
  });

  const handleGenerateQR = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt;
    const minWaitTime = 60000; // 1 minute

    if (timeSinceLastAttempt < minWaitTime) {
      const remainingTime = Math.ceil((minWaitTime - timeSinceLastAttempt) / 1000);
      toast({
        title: "Please Wait",
        description: `Wait ${remainingTime} seconds before trying again to avoid rate limiting`,
        variant: "destructive",
      });
      return;
    }

    startSessionMutation.mutate();
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': case 'qr_ready': return 'bg-blue-500';
      case 'disconnected': case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'idle': return 'Ready to Connect';
      case 'connecting': return 'Connecting...';
      case 'qr_ready': return 'QR Code Ready';
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/whatsapp/clear-cache", {});
    },
    onSuccess: () => {
      toast({
        title: "Cache Cleared",
        description: "WhatsApp connection data has been reset. You can now try connecting again.",
      });
      resetConnection();
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

  const resetConnection = () => {
    setConnectionStatus('idle');
    setQrCodeUrl('');
    setConnectedPhone('');
    setSessionId('');
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Connect WhatsApp Number
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus)}`}></div>
          <span className="text-sm text-muted-foreground">{getStatusText(connectionStatus)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus === 'idle' && (
          <div className="text-center space-y-4">
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
              <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Click to generate QR code for WhatsApp connection
              </p>
              <Button 
                onClick={handleGenerateQR}
                disabled={startSessionMutation.isPending}
                className="w-full"
              >
                {startSessionMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 mr-2" />
                    Generate WhatsApp QR Code
                  </>
                )}
              </Button>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> WhatsApp limits connection attempts. 
                Wait at least 1 minute between attempts to avoid being blocked.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {connectionStatus === 'connecting' && (
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Connecting to WhatsApp servers...</p>
            <p className="text-xs text-gray-500">This may take a few moments</p>
          </div>
        )}

        {connectionStatus === 'qr_ready' && qrCodeUrl && (
          <div className="text-center space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-lg inline-block">
              <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-64 h-64" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center justify-center gap-2">
                <Smartphone className="w-4 h-4" />
                Scan with WhatsApp Mobile App
              </p>
              <p className="text-xs text-gray-500">
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> QR code expires in 20 seconds. If connection fails, 
                wait 1 minute before generating a new code to avoid rate limiting.
              </p>
            </div>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <div>
              <h3 className="font-semibold text-green-800">Connected Successfully!</h3>
              <p className="text-sm text-gray-600">
                {connectedPhone} is now active and ready for messaging
              </p>
            </div>
            <Button onClick={resetConnection} variant="outline" className="w-full">
              Connect Another Number
            </Button>
          </div>
        )}

        {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
            <div>
              <h3 className="font-semibold text-red-800">Connection Failed</h3>
              <p className="text-sm text-gray-600">
                WhatsApp connection was blocked. This is a security measure by WhatsApp.
              </p>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
              <h4 className="font-semibold text-red-800 text-sm mb-2">Why this happens:</h4>
              <ul className="text-xs text-red-700 space-y-1">
                <li>• Too many connection attempts in a short time</li>
                <li>• Multiple WhatsApp Web sessions active</li>
                <li>• WhatsApp detected suspicious activity</li>
                <li>• Network or VPN issues</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-semibold text-blue-800 text-sm mb-2">How to fix:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Wait 15-30 minutes before trying again</li>
                <li>• Close other WhatsApp Web tabs/sessions</li>
                <li>• Try using different internet connection</li>
                <li>• Use Facebook Business API instead (more reliable)</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={resetConnection} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => clearCacheMutation.mutate()} 
                variant="outline"
                disabled={clearCacheMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}