import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Wifi, Check, AlertCircle, RefreshCw, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface WhatsAppSession {
  id: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  qrCode?: string;
  phoneNumber?: string;
}

export default function WorkingQRScanner() {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

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
    setConnectionAttempts(prev => prev + 1);
    
    try {
      // Close existing socket if any
      if (socket) {
        socket.close();
        setSocket(null);
      }

      // Create WebSocket connection to working service
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws-working`;
      console.log("Connecting to working WhatsApp service:", wsUrl);
      
      const newSocket = new WebSocket(wsUrl);

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error("WebSocket connection timeout");
        newSocket.close();
        setIsConnecting(false);
        toast({
          title: "Connection Timeout",
          description: "Failed to establish connection within 15 seconds. Please try again.",
          variant: "destructive"
        });
      }, 15000);

      newSocket.onopen = () => {
        console.log("Working WebSocket connected successfully");
        clearTimeout(connectionTimeout);
        
        // Send connection request
        const sessionId = `working_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("Sending connect message with sessionId:", sessionId, "userId:", user?.id);
        
        try {
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
        } catch (sendError) {
          console.error("Error sending connect message:", sendError);
          setIsConnecting(false);
          clearTimeout(connectionTimeout);
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received working message:", data);
          
          if (data.type === 'connecting') {
            setSession(prev => prev ? {
              ...prev,
              status: 'connecting'
            } : { id: data.sessionId, status: 'connecting' });
            
          } else if (data.type === 'qr_ready') {
            setSession({
              id: data.sessionId,
              status: 'qr_ready',
              qrCode: data.qrCode
            });
            setIsConnecting(false);
            toast({
              title: "QR Code Generated",
              description: "Scan the QR code with your WhatsApp mobile app"
            });
            
          } else if (data.type === 'connected') {
            setSession(prev => prev ? {
              ...prev,
              status: 'connected',
              phoneNumber: data.phoneNumber
            } : { id: data.sessionId, status: 'connected', phoneNumber: data.phoneNumber });
            setIsConnecting(false);
            toast({
              title: "Successfully Connected!",
              description: `WhatsApp connected: ${data.phoneNumber}`
            });
            
          } else if (data.type === 'disconnected') {
            setSession(prev => prev ? {
              ...prev,
              status: 'disconnected',
              qrCode: undefined
            } : { id: data.sessionId, status: 'disconnected' });
            setIsConnecting(false);
            
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
            } : { id: data.sessionId, status: 'disconnected' });
            setIsConnecting(false);
            
            toast({
              title: "WhatsApp Error",
              description: data.message,
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error parsing working WebSocket message:", error);
          setIsConnecting(false);
        }
      };

      newSocket.onerror = (error) => {
        console.error("Working WebSocket error:", error);
        setIsConnecting(false);
        clearTimeout(connectionTimeout);
        toast({
          title: "Connection Error",
          description: "Failed to connect to WhatsApp service. Check your internet connection.",
          variant: "destructive"
        });
      };

      newSocket.onclose = (event) => {
        console.log("Working WebSocket disconnected", event.code, event.reason);
        setIsConnecting(false);
        clearTimeout(connectionTimeout);
        
        if (event.code !== 1000 && event.code !== 1001) { // Not normal closure
          toast({
            title: "Connection Lost",
            description: `WebSocket connection closed (${event.code}). You can try connecting again.`,
            variant: "destructive"
          });
        }
      };

      setSocket(newSocket);

    } catch (error) {
      console.error("Error starting working connection:", error);
      toast({
        title: "Error",
        description: "Failed to start WhatsApp connection. Please try again.",
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
    setConnectionAttempts(0);
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
          <QrCode className="w-3 h-3" />
          Ready to Scan
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
                <Smartphone className="w-5 h-5 text-green-600" />
                WhatsApp QR Scanner
              </CardTitle>
              <CardDescription>
                Connect your WhatsApp number by scanning QR code - Built from scratch for reliability
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
                Establishing connection to WhatsApp servers... This may take a moment.
              </AlertDescription>
            </Alert>
          )}

          {session?.status === 'qr_ready' && session.qrCode && (
            <div className="text-center space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img 
                  src={session.qrCode} 
                  alt="WhatsApp QR Code" 
                  className="border rounded-lg shadow-sm"
                  style={{ width: '256px', height: '256px' }}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600">✓ QR Code Generated Successfully!</p>
                <p className="text-sm">Scan this QR code with your WhatsApp mobile app</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Steps:</strong></p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to Settings → Linked Devices</li>
                    <li>Tap "Link a Device"</li>
                    <li>Scan this QR code</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {session?.status === 'connected' && session.phoneNumber && (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Successfully Connected!</strong> WhatsApp number: {session.phoneNumber}
                <br />
                Your WhatsApp is now ready for marketing campaigns.
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
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                {isConnecting ? 'Connecting...' : 'Connect WhatsApp'}
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
            
            {connectionAttempts > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                Attempts: {connectionAttempts}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <p><strong>New Working System:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Built from scratch for maximum reliability</li>
              <li>Proper WebSocket connection handling</li>
              <li>Stable Baileys WhatsApp integration</li>
              <li>Clear error messages and status updates</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}