import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, Smartphone, CheckCircle, X } from "lucide-react";

export default function RealQRSetup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'qr_ready' | 'connected'>('disconnected');
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [connectedPhone, setConnectedPhone] = useState("");
  const [connectedName, setConnectedName] = useState("");

  const connectWebSocket = (sessionId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/whatsapp`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WhatsApp WebSocket connected');
      setConnectionStatus('connecting');
      
      // Start WhatsApp session
      ws.send(JSON.stringify({
        type: 'start_session',
        sessionId,
        userId: (user as any)?.id || 'unknown' // Use actual user ID
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
      setConnectionStatus('disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to WhatsApp service.",
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
          description: data.message || "Scan with your WhatsApp mobile app",
        });
        break;
      
      case 'connected':
        setConnectedPhone(data.phoneNumber);
        setConnectedName(data.name || 'Unknown');
        setConnectionStatus('connected');
        setQrCodeUrl('');
        
        // Refresh the WhatsApp numbers list to show the new number
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
        setConnectedName('');
        toast({
          title: "WhatsApp Disconnected",
          description: data.message || "Connection was rejected by WhatsApp servers. This happens due to rate limits or multiple connection attempts.",
          variant: "destructive",
        });
        break;
      
      case 'error':
        toast({
          title: "Error",
          description: data.message || "An error occurred",
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
      connectWebSocket(data.sessionId);
      toast({
        title: "Session Starting",
        description: "Connecting to WhatsApp Web...",
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
        description: "Failed to start WhatsApp session.",
        variant: "destructive",
      });
    },
  });

  const disconnectSession = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'disconnect',
        sessionId
      }));
      wsRef.current.close();
    }
    setConnectionStatus('disconnected');
    setQrCodeUrl('');
    setConnectedPhone('');
    setConnectedName('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'qr_ready':
        return <QrCode className="w-6 h-6 text-orange-500" />;
      case 'connected':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      default:
        return <Smartphone className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to WhatsApp Web...';
      case 'qr_ready':
        return 'QR Code ready - Scan with your phone';
      case 'connected':
        return `Connected: ${connectedPhone}`;
      default:
        return 'Ready to connect';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Connect WhatsApp Number
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            {connectionStatus === 'connecting' ? (
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-blue-500 mb-2 animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Initializing WhatsApp session...</p>
              </div>
            ) : connectionStatus === 'qr_ready' && qrCodeUrl ? (
              <div className="text-center">
                <img 
                  src={qrCodeUrl} 
                  alt="WhatsApp QR Code" 
                  className="w-40 h-40 mx-auto mb-2 rounded"
                />
                <p className="text-sm text-gray-600">Scan with WhatsApp</p>
              </div>
            ) : connectionStatus === 'connected' ? (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-2 mx-auto" />
                <p className="text-sm font-medium text-gray-800">{connectedName}</p>
                <p className="text-xs text-gray-500">{connectedPhone}</p>
                <p className="text-xs text-green-600 mt-2">Connected & Ready</p>
              </div>
            ) : (
              <div className="text-center">
                <Smartphone className="w-12 h-12 text-gray-400 mb-2 mx-auto" />
                <p className="text-sm text-gray-500">Click to generate QR code</p>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-4">{getStatusText()}</p>
          
          {connectionStatus === 'disconnected' ? (
            <Button 
              onClick={() => startSessionMutation.mutate()} 
              disabled={startSessionMutation.isPending}
              className="w-full"
            >
              <QrCode className="w-4 h-4 mr-2" />
              {startSessionMutation.isPending ? "Starting..." : "Generate WhatsApp QR Code"}
            </Button>
          ) : connectionStatus === 'qr_ready' ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </p>
              <Button variant="outline" onClick={disconnectSession} size="sm">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          ) : connectionStatus === 'connected' ? (
            <Button variant="outline" onClick={disconnectSession}>
              <X className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}