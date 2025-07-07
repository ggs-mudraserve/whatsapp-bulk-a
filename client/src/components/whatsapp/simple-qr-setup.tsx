import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Wifi, Check, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface WhatsAppSession {
  id: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  qrCode?: string;
  phoneNumber?: string;
}

export default function SimpleQRSetup() {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const startConnection = async () => {
    setIsConnecting(true);
    
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected");
        // Send connection request
        const sessionId = `session_${Date.now()}`;
        socket.send(JSON.stringify({
          type: 'connect',
          sessionId,
          userId: user?.id || 'anonymous'
        }));
        
        // Set initial session state
        setSession({
          id: sessionId,
          status: 'connecting'
        });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);
          
          if (data.type === 'qr_ready') {
            setSession({
              id: data.sessionId,
              status: 'qr_ready',
              qrCode: data.qrCode
            });
            toast({
              title: "QR Code Ready",
              description: "Scan the QR code with your WhatsApp to connect"
            });
          } else if (data.type === 'connected') {
            setSession(prev => prev ? {
              ...prev,
              status: 'connected',
              phoneNumber: data.phoneNumber
            } : null);
            toast({
              title: "Connected Successfully",
              description: `WhatsApp connected: ${data.phoneNumber}`
            });
          } else if (data.type === 'disconnected') {
            setSession(prev => prev ? {
              ...prev,
              status: 'disconnected',
              qrCode: undefined
            } : null);
            
            const isRetryable = data.canRetry;
            toast({
              title: "Connection Lost",
              description: data.message + (isRetryable ? " Click Connect to try again." : ""),
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to WhatsApp service",
          variant: "destructive"
        });
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnecting(false);
      };

    } catch (error) {
      console.error("Error starting connection:", error);
      toast({
        title: "Error",
        description: "Failed to start WhatsApp connection",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connecting':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Connecting
        </Badge>;
      case 'qr_ready':
        return <Badge variant="default" className="flex items-center gap-1">
          <Smartphone className="w-3 h-3" />
          Scan QR Code
        </Badge>;
      case 'connected':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500">
          <Check className="w-3 h-3" />
          Connected
        </Badge>;
      case 'disconnected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Disconnected
        </Badge>;
      default:
        return <Badge variant="outline">Ready</Badge>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Connect WhatsApp via QR Code
          </CardTitle>
          <CardDescription>
            Connect your WhatsApp account by scanning a QR code with your phone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status:</span>
            {session ? getStatusBadge(session.status) : <Badge variant="outline">Not Connected</Badge>}
          </div>

          {/* QR Code Display */}
          {session?.status === 'qr_ready' && session.qrCode && (
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg border inline-block">
                <img 
                  src={session.qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 mx-auto"
                />
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Steps to connect:</p>
                <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap "Link a Device"</li>
                  <li>Scan this QR code</li>
                </ol>
              </div>
            </div>
          )}

          {/* Connected State */}
          {session?.status === 'connected' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-600">Successfully Connected!</h3>
                {session.phoneNumber && (
                  <p className="text-sm text-gray-600">
                    Connected number: {session.phoneNumber}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Connect Button */}
          {!session && (
            <div className="text-center">
              <Button 
                onClick={startConnection}
                disabled={isConnecting}
                className="px-8"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Connect WhatsApp
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Refresh Button for QR */}
          {session?.status === 'qr_ready' && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={startConnection}
                disabled={isConnecting}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh QR Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}