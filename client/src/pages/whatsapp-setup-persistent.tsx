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
      
      // Send connection request immediately
      const sessionId = `whatsapp_persistent_${Date.now()}`;
      ws.send(JSON.stringify({
        type: 'connect',
        sessionId,
        userId: 'current_user'
      }));
      console.log('Sent connection request:', sessionId);
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

  const startConnection = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setQrCode('');
    setConnectionStatus('connecting');
    
    try {
      // Use direct API call instead of WebSocket for faster QR generation
      const response = await fetch('/api/whatsapp/qr-persistent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success && data.qrCode) {
        setQrCode(data.qrCode);
        setConnectionStatus('qr_ready');
        
        toast({
          title: "QR Code Ready",
          description: "Scan the QR code with your WhatsApp mobile app"
        });
        
        // Start polling for connection status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch('/api/whatsapp/active-sessions');
            const statusData = await statusResponse.json();
            
            if (statusData.sessions && statusData.sessions.length > 0) {
              const connectedSession = statusData.sessions.find((s: any) => s.type === 'persistent');
              if (connectedSession) {
                setConnectionStatus('connected');
                setQrCode('');
                setIsConnecting(false);
                clearInterval(pollInterval);
                loadSessions();
                
                toast({
                  title: "WhatsApp Connected!",
                  description: `Phone: ${connectedSession.phoneNumber}`,
                });
              }
            }
          } catch (error) {
            console.error('Status polling error:', error);
          }
        }, 2000);
        
        // Clear polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (connectionStatus !== 'connected') {
            setIsConnecting(false);
          }
        }, 120000);
        
      } else {
        throw new Error(data.message || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
      setConnectionStatus('error');
      
      toast({
        title: "Connection Error",
        description: error.message || "Failed to start WhatsApp connection",
        variant: "destructive"
      });
    }
  };

  const sendConnectionRequest = () => {
    // This function is now handled in ws.onopen
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

  const handleShowQR = async (sessionId: string) => {
    try {
      const response = await fetch('/api/whatsapp/qr-persistent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });
      
      const data = await response.json();
      
      if (data.success && data.qrCode) {
        setQrCode(data.qrCode);
        setConnectionStatus('qr_ready');
        
        toast({
          title: "QR Code Generated",
          description: "Scan the QR code with your WhatsApp mobile app"
        });
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/delete-session/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadSessions();
        toast({
          title: "Session Deleted",
          description: "WhatsApp session has been deleted permanently"
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This will permanently delete all your data including WhatsApp sessions, contacts, campaigns, and messages. This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Account Deleted",
          description: "Your account has been deleted successfully"
        });
        // Redirect to login after account deletion
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadSessions}
              className="border-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                try {
                  const response = await fetch('/api/whatsapp/debug-sessions');
                  const data = await response.json();
                  console.log('Debug sessions:', data);
                  toast({
                    title: "Debug Info",
                    description: `Found ${data.persistent.length} persistent and ${data.working.length} working sessions`,
                  });
                } catch (error) {
                  console.error('Debug error:', error);
                }
              }}
              className="border-gray-300"
            >
              Debug
            </Button>
          </div>
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
                  <div className="flex items-center gap-2">
                    {getStatusBadge(session.status)}
                    {session.status === 'connected' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectSession(session.id)}
                      >
                        Disconnect
                      </Button>
                    ) : (session.status === 'connecting' || session.status === 'qr_ready') ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowQR(session.id)}
                        className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        Show QR
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                      className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                    >
                      Delete
                    </Button>
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

          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Account Management</h4>
            <p className="text-sm text-red-700 mb-3">
              Permanently delete your account and all associated data including WhatsApp sessions, contacts, campaigns, and messages.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}