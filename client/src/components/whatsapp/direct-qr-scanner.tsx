import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, RefreshCw, QrCode, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface QRResponse {
  success: boolean;
  sessionId?: string;
  qrCode?: string;
  message: string;
}

export default function DirectQRScanner() {
  const [qrData, setQrData] = useState<QRResponse | null>(null);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const generateQRMutation = useMutation({
    mutationFn: async (): Promise<QRResponse> => {
      console.log("Making direct QR generation request...");
      try {
        const response = await apiRequest("POST", "/api/whatsapp/generate-qr-direct", {});
        console.log("Raw response from server:", response);
        return response;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: (data: QRResponse) => {
      console.log("QR generation successful, data received:", data);
      console.log("Data success flag:", data.success);
      console.log("Data has QR code:", !!data.qrCode);
      
      setQrData(data);
      
      if (data.success && data.qrCode) {
        console.log("Showing success toast");
        toast({
          title: "QR Code Generated!",
          description: "Scan the QR code with your WhatsApp mobile app"
        });
      } else {
        console.log("Data success or QR code missing", { success: data.success, hasQR: !!data.qrCode });
        toast({
          title: "Partial Success",
          description: data.message || "QR generation completed but may have issues",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error("QR generation error:", error);
      
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
        title: "QR Generation Failed",
        description: error.message || "Failed to generate QR code. Please try again.",
        variant: "destructive"
      });
      setQrData(null);
    },
  });

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

  const handleGenerateQR = () => {
    setQrData(null);
    generateQRMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            Direct WhatsApp QR Scanner
          </CardTitle>
          <CardDescription>
            Generate and scan QR code directly - No WebSocket connection needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generateQRMutation.isPending && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Generating QR code... This may take up to 30 seconds.
              </AlertDescription>
            </Alert>
          )}

          {qrData?.success && qrData.qrCode && (
            <div className="text-center space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>QR Code Generated Successfully!</strong> Scan it with your WhatsApp mobile app.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-center p-6 bg-white rounded-lg border shadow-sm">
                <img 
                  src={qrData.qrCode} 
                  alt="WhatsApp QR Code" 
                  className="border rounded-lg"
                  style={{ width: '256px', height: '256px' }}
                />
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-medium">Scan this QR code with your WhatsApp mobile app</p>
                <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded space-y-2">
                  <p><strong>How to scan:</strong></p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to Settings → Linked Devices</li>
                    <li>Tap "Link a Device"</li>
                    <li>Point your camera at this QR code</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {qrData && !qrData.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>QR Generation Failed:</strong> {qrData.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleGenerateQR} 
              disabled={generateQRMutation.isPending}
              className="flex items-center gap-2"
            >
              {generateQRMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              {generateQRMutation.isPending ? 'Generating QR...' : (qrData?.success ? 'Generate New QR' : 'Generate QR Code')}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <p><strong>Direct HTTP Method:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>No WebSocket connection issues</li>
              <li>Direct server-side QR generation</li>
              <li>Stable Baileys WhatsApp integration</li>
              <li>Immediate response with QR code</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}