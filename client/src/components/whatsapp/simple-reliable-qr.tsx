import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Wifi, Check, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface WhatsAppSession {
  id: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  qrCode?: string;
  phoneNumber?: string;
}

export default function SimpleReliableQR() {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">Loading authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login requirement
  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Login Required
            </CardTitle>
            <CardDescription>
              You need to be logged in to connect your WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please log in to your account to access WhatsApp connection features.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={() => window.location.href = '/api/login'} className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Login to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startConnection = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your WhatsApp",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Create WebSocket connection to simple service
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log("Connecting to:", wsUrl);
      
      const newSocket = new WebSocket(wsUrl);

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error("WebSocket connection timeout");
        newSocket.close();
        setIsConnecting(false);
        toast({
          title: "Connection Timeout",
          description: "Failed to establish connection within 10 seconds",
          variant: "destructive"
        });
      }, 10000);

      newSocket.onopen = () => {
        console.log("WebSocket connected successfully");
        clearTimeout(connectionTimeout);
        
        // Send connection request
        const sessionId = `session_${Date.now()}`;
        console.log("Sending connect message with sessionId:", sessionId, "userId:", user?.id);
        
        newSocket.send(JSON.stringify({
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

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);
          
          if (data.type === 'connecting') {
            setSession(prev => prev ? {
              ...prev,
              status: 'connecting'
            } : null);
            
          } else if (data.type === 'qr_ready') {
            setSession({
              id: data.sessionId,
              status: 'qr_ready',
              qrCode: data.qrCode
            });
            toast({
              title: "QR Code Ready",
              description: "Scan the QR code with your WhatsApp"
            });
            
          } else if (data.type === 'connected') {
            setSession(prev => prev ? {
              ...prev,
              status: 'connected',
              phoneNumber: data.phoneNumber
            } : null);
            toast({
              title: "Successfully Connected!",
              description: `WhatsApp connected: ${data.phoneNumber}`
            });
            
          } else if (data.type === 'disconnected') {
            setSession(prev => prev ? {
              ...prev,
              status: 'disconnected',
              qrCode: undefined
            } : null);
            
            toast({
              title: "Connection Lost",
              description: data.message,
              variant: "destructive"
            });
            
          } else if (data.type === 'error') {
            setSession(prev => prev ? {
              ...prev,
              status: 'disconnected',
              qrCode: undefined
            } : null);
            
            toast({
              title: "Connection Error",
              description: data.message,
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      newSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnecting(false);
        clearTimeout(connectionTimeout);
        toast({
          title: "Connection Error",
          description: "Failed to connect to WhatsApp service",
          variant: "destructive"
        });
      };

      newSocket.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        setIsConnecting(false);
        clearTimeout(connectionTimeout);
        
        if (event.code === 1006) {
          toast({
            title: "Network Issue",
            description: "WebSocket connection failed. Please try again.",
            variant: "destructive"
          });
        } else if (event.code !== 1000) {
          toast({
            title: "Connection Lost",
            description: `Connection closed (${event.code})`,
            variant: "destructive"
          });
        }
      };

      setSocket(newSocket);

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

  const disconnectSession = () => {
    if (socket && session) {
      socket.send(JSON.stringify({
        type: 'disconnect',
        sessionId: session.id
      }));
      socket.close();
    }
    setSession(null);
    setSocket(null);
    setIsConnecting(false);
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
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <Check className="w-3 h-3" />
          Connected
        </Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Disconnected
        </Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                WhatsApp QR Connection
              </CardTitle>
              <CardDescription>
                Connect your WhatsApp number by scanning QR code
              </CardDescription>
            </div>
            {session && getStatusBadge(session.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {session?.status === 'connecting' && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Establishing connection to WhatsApp...
              </AlertDescription>
            </Alert>
          )}

          {session?.status === 'qr_ready' && session.qrCode && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <img 
                  src={session.qrCode} 
                  alt="WhatsApp QR Code" 
                  className="border rounded-lg shadow-lg"
                  style={{ width: '256px', height: '256px' }}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Scan this QR code with your WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                </p>
              </div>
            </div>
          )}

          {session?.status === 'connected' && session.phoneNumber && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                <strong>Successfully Connected!</strong> WhatsApp number: {session.phoneNumber}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            {!session || session.status === 'disconnected' ? (
              <Button 
                onClick={startConnection} 
                disabled={isConnecting}
                className="flex items-center gap-2"
              >
                <Wifi className="w-4 h-4" />
                Connect WhatsApp
              </Button>
            ) : (
              <Button 
                onClick={disconnectSession} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Disconnect
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click "Connect WhatsApp" to generate QR code</li>
              <li>Open WhatsApp on your phone</li>
              <li>Go to Settings → Linked Devices → Link a Device</li>
              <li>Scan the QR code displayed here</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}