import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Wifi, Check, AlertCircle, RefreshCw, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface RobustWhatsAppSession {
  id: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'blocked';
  qrCode?: string;
  phoneNumber?: string;
  attempt?: number;
  maxAttempts?: number;
}

interface CooldownInfo {
  active: boolean;
  remainingMinutes: number;
}

export default function RobustQRSetup() {
  const [session, setSession] = useState<RobustWhatsAppSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cooldown, setCooldown] = useState<CooldownInfo>({ active: false, remainingMinutes: 0 });
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Check cooldown status on component mount
    checkCooldownStatus();
  }, [user]);

  const checkCooldownStatus = async () => {
    if (!user?.id) {
      console.log("No user found, skipping cooldown check");
      return;
    }
    
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws-robust`;
      const tempSocket = new WebSocket(wsUrl);

      tempSocket.onopen = () => {
        tempSocket.send(JSON.stringify({
          type: 'check_cooldown',
          userId: user.id
        }));
      };

      tempSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'cooldown_active') {
            setCooldown({ active: true, remainingMinutes: data.remainingMinutes });
          } else if (data.type === 'cooldown_clear') {
            setCooldown({ active: false, remainingMinutes: 0 });
          }
          tempSocket.close();
        } catch (error) {
          console.error("Error parsing cooldown response:", error);
          tempSocket.close();
        }
      };

      tempSocket.onerror = (error) => {
        console.error("Cooldown check WebSocket error:", error);
        tempSocket.close();
      };
    } catch (error) {
      console.error("Error checking cooldown:", error);
    }
  };

  const startRobustConnection = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your WhatsApp",
        variant: "destructive"
      });
      return;
    }

    if (cooldown.active) {
      toast({
        title: "Connection Blocked",
        description: `Please wait ${cooldown.remainingMinutes} minutes before trying again`,
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Try enhanced connection first, fallback to simple if needed
      let wsUrl: string;
      let newSocket: WebSocket;
      
      try {
        // Try robust connection first
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws-robust`;
        console.log("Attempting enhanced connection to:", wsUrl);
        newSocket = new WebSocket(wsUrl);
      } catch (robustError) {
        console.log("Enhanced connection failed, trying simple connection...");
        // Fallback to simple connection
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log("Attempting simple connection to:", wsUrl);
        newSocket = new WebSocket(wsUrl);
      }

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error("WebSocket connection timeout");
        newSocket.close();
        setIsConnecting(false);
        toast({
          title: "Connection Timeout",
          description: "Failed to establish WebSocket connection within 10 seconds",
          variant: "destructive"
        });
      }, 10000);

      newSocket.onopen = () => {
        console.log("Robust WebSocket connected successfully");
        clearTimeout(connectionTimeout);
        
        // Send connection request
        const sessionId = `robust_session_${Date.now()}`;
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
          console.log("Received robust message:", data);
          
          if (data.type === 'connecting') {
            setSession(prev => prev ? {
              ...prev,
              status: 'connecting',
              attempt: data.attempt,
              maxAttempts: data.maxAttempts
            } : null);
            
          } else if (data.type === 'qr_ready') {
            setSession({
              id: data.sessionId,
              status: 'qr_ready',
              qrCode: data.qrCode,
              attempt: data.attempt
            });
            toast({
              title: "QR Code Ready",
              description: "Scan the QR code quickly with your WhatsApp"
            });
            
          } else if (data.type === 'connected') {
            setSession(prev => prev ? {
              ...prev,
              status: 'connected',
              phoneNumber: data.phoneNumber
            } : null);
            setCooldown({ active: false, remainingMinutes: 0 });
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
              description: data.message + (data.canRetry ? " You can try again." : ""),
              variant: "destructive"
            });
            
          } else if (data.type === 'blocked') {
            setSession(prev => prev ? {
              ...prev,
              status: 'blocked',
              qrCode: undefined
            } : null);
            setCooldown({ active: true, remainingMinutes: data.remainingMinutes });
            
            toast({
              title: "Temporarily Blocked",
              description: data.message,
              variant: "destructive"
            });
            
          } else if (data.type === 'error') {
            setSession(prev => prev ? {
              ...prev,
              status: 'disconnected',
              qrCode: undefined
            } : null);
            
            if (data.cooldownActive) {
              setCooldown({ active: true, remainingMinutes: data.remainingMinutes });
            }
            
            toast({
              title: "Connection Error",
              description: data.message,
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error parsing robust WebSocket message:", error);
        }
      };

      newSocket.onerror = (error) => {
        console.error("Robust WebSocket error:", error);
        setIsConnecting(false);
        toast({
          title: "Connection Error",
          description: "Failed to connect to enhanced WhatsApp service",
          variant: "destructive"
        });
      };

      newSocket.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        setIsConnecting(false);
        clearTimeout(connectionTimeout);
        
        if (event.code === 1006) {
          // Network error - try to reconnect or show helpful message
          toast({
            title: "Network Connection Issue",
            description: "WebSocket connection failed. This might be a temporary network issue.",
            variant: "destructive"
          });
        } else if (event.code !== 1000) { // 1000 is normal closure
          toast({
            title: "Connection Lost",
            description: `WebSocket connection closed (${event.code})`,
            variant: "destructive"
          });
        }
      };

      setSocket(newSocket);

    } catch (error) {
      console.error("Error starting robust connection:", error);
      toast({
        title: "Error",
        description: "Failed to start enhanced WhatsApp connection",
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
      case 'blocked':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Blocked
        </Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Disconnected
        </Badge>;
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}`;
  };

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Enhanced WhatsApp Connection
              </CardTitle>
              <CardDescription>
                Advanced connection with better stability and error handling
              </CardDescription>
            </div>
            {session && getStatusBadge(session.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cooldown.active && (
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Temporary Block Active:</strong> Please wait {formatTime(cooldown.remainingMinutes)} before trying again.
                This helps prevent your account from being permanently blocked by WhatsApp.
              </AlertDescription>
            </Alert>
          )}

          {session?.status === 'connecting' && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Establishing secure connection to WhatsApp... 
                {session.attempt && session.maxAttempts && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    (Attempt {session.attempt} of {session.maxAttempts})
                  </span>
                )}
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
                {session.attempt && (
                  <p className="text-xs text-orange-600">
                    Connection attempt {session.attempt} - Scan quickly for best results
                  </p>
                )}
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

          {session?.status === 'blocked' && (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Connection Blocked:</strong> WhatsApp has temporarily blocked this connection.
                Please wait {formatTime(cooldown.remainingMinutes)} before trying again.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            {!session || session.status === 'disconnected' || session.status === 'blocked' ? (
              <Button 
                onClick={startRobustConnection} 
                disabled={isConnecting || cooldown.active}
                className="flex items-center gap-2"
              >
                <Wifi className="w-4 h-4" />
                {cooldown.active ? `Wait ${formatTime(cooldown.remainingMinutes)}` : 'Connect WhatsApp'}
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
            
            <Button 
              onClick={checkCooldownStatus} 
              variant="ghost" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check Status
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Enhanced Features:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Advanced error handling and recovery</li>
              <li>Smart rate limiting protection</li>
              <li>Automatic cooldown management</li>
              <li>Better connection stability</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}