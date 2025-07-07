import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, RefreshCw, CheckCircle, XCircle, QrCode, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppSession {
  id: string;
  phoneNumber?: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  lastActivity: Date;
  type: string;
}

export default function WhatsAppSetupPersistent() {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [qrCode, setQrCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const { toast } = useToast();

  useEffect(() => {
    // Load existing sessions
    loadSessions();
    
    // Set up polling for session status
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/whatsapp/active-sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws-persistent`;
    
    console.log('Connecting to persistent WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Persistent WebSocket connected');
      setConnectionStatus('connected');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received persistent WebSocket message:', data);
        
        switch (data.type) {
          case 'connecting':
            setConnectionStatus('connecting');
            toast({
              title: "Connecting to WhatsApp",
              description: data.message || "Initializing connection..."
            });
            break;
            
          case 'qr_ready':
            setQrCode(data.qrCode);
            setConnectionStatus('qr_ready');
            toast({
              title: "QR Code Ready",
              description: "Scan the QR code with your WhatsApp mobile app"
            });
            break;
            
          case 'connected':
            setQrCode('');
            setConnectionStatus('connected');
            setIsConnecting(false);
            loadSessions(); // Refresh sessions
            toast({
              title: "WhatsApp Connected!",
              description: `Phone number: ${data.phoneNumber || 'Connected successfully'}`,
              variant: "default"
            });
            break;
            
          case 'disconnected':
            setConnectionStatus('disconnected');
            setQrCode('');
            setIsConnecting(false);
            loadSessions();
            toast({
              title: "WhatsApp Disconnected",
              description: data.reason || "Connection lost",
              variant: "destructive"
            });
            break;
            
          case 'error':
            setConnectionStatus('error');
            setIsConnecting(false);
            toast({
              title: "Connection Error",
              description: data.message || "Failed to connect to WhatsApp",
              variant: "destructive"
            });
            break;
            
          case 'auth_failure':
            setConnectionStatus('auth_failure');
            setIsConnecting(false);
            toast({
              title: "Authentication Failed",
              description: "Please try connecting again",
              variant: "destructive"
            });
            break;
            
          case 'already_connected':
            setConnectionStatus('connected');
            setIsConnecting(false);
            loadSessions();
            toast({
              title: "Already Connected",
              description: `Phone: ${data.phoneNumber}`,
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Persistent WebSocket disconnected');
      setConnectionStatus('disconnected');
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('Persistent WebSocket error:', error);
      setConnectionStatus('error');
    };
  };

  const startConnection = () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setQrCode('');
    
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      // Wait a moment for connection then send message
      setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          sendConnectionRequest();
        }
      }, 1000);
    } else {
      sendConnectionRequest();
    }
  };

  const sendConnectionRequest = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const sessionId = `whatsapp_persistent_${Date.now()}`;
      socket.send(JSON.stringify({
        type: 'connect',
        sessionId,
        userId: 'current_user' // This should be actual user ID
      }));
    } else {
      toast({
        title: "Connection Error",
        description: "WebSocket not connected. Please try again.",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnectSession = async (sessionId: string) => {
    try {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'disconnect',
          sessionId
        }));
        
        // Refresh sessions after a moment
        setTimeout(loadSessions, 1000);
        
        toast({
          title: "Session Disconnected",
          description: "WhatsApp session has been disconnected"
        });
      }
    } catch (error) {
      console.error('Error disconnecting session:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect session",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Connected</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Connecting</Badge>;
      case 'qr_ready':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">QR Ready</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="border-gray-300">Disconnected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const connectedSessions = sessions.filter(session => session.status === 'connected');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Smartphone className="w-8 h-8 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Setup (Persistent)</h1>
          <p className="text-gray-600">Connect your WhatsApp numbers with persistent sessions</p>
        </div>
      </div>

      {/* Connection Status */}
      <Alert className={`border-l-4 ${
        connectedSessions.length > 0 
          ? 'border-l-green-500 bg-green-50' 
          : 'border-l-yellow-500 bg-yellow-50'
      }`}>
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connectedSessions.length > 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-yellow-600" />
            )}
            <span className="font-medium">
              {connectedSessions.length > 0 
                ? `${connectedSessions.length} WhatsApp number(s) connected`
                : 'No WhatsApp numbers connected'
              }
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadSessions}
            className="border-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </AlertDescription>
      </Alert>

      {/* Add New Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Connect New WhatsApp Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={startConnection}
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect WhatsApp'}
            </Button>
            
            {connectionStatus !== 'disconnected' && (
              <div className="flex items-center gap-2">
                Status: {getStatusBadge(connectionStatus)}
              </div>
            )}
          </div>

          {qrCode && (
            <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <img src={qrCode} alt="WhatsApp QR Code" className="mx-auto mb-4" />
              <p className="text-sm text-gray-600">
                Scan this QR code with your WhatsApp mobile app
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Connected WhatsApp Numbers ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      session.status === 'connected' ? 'bg-green-500' : 
                      session.status === 'connecting' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium">
                        {session.phoneNumber || 'Unknown Number'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Session: {session.id.substring(0, 20)}... | Type: {session.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(session.status)}
                    {session.status === 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectSession(session.id)}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Connect WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">1</span>
            <p>Click "Connect WhatsApp" to generate a QR code</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">2</span>
            <p>Open WhatsApp on your mobile device</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">3</span>
            <p>Go to Settings → Linked Devices → Link a Device</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">4</span>
            <p>Scan the QR code displayed above</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">5</span>
            <p>Your WhatsApp is now connected and ready to send messages!</p>
          </div>
          
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Persistent Sessions:</strong> Your WhatsApp connection will persist across page refreshes and server restarts. 
              Authentication data is securely stored and automatically restored.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}