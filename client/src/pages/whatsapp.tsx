import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, MessageSquare, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface QRResponse {
  success: boolean;
  sessionId?: string;
  qrCode?: string;
  message: string;
  expiresIn?: number;
}

export default function WhatsApp() {
  const [qrData, setQrData] = useState<QRResponse | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const generateQRMutation = useMutation({
    mutationFn: async (): Promise<QRResponse> => {
      const response = await apiRequest("POST", "/api/whatsapp/generate-qr-direct", {});
      return response;
    },
    onSuccess: (data: QRResponse) => {
      setQrData(data);
      
      if (data.success && data.qrCode) {
        toast({
          title: "QR Code Generated!",
          description: "Scan with your WhatsApp mobile app to connect."
        });
        
        // Start countdown timer
        if (data.expiresIn) {
          setSessionTimeLeft(data.expiresIn);
          const timer = setInterval(() => {
            setSessionTimeLeft(prev => {
              if (prev && prev > 1) {
                return prev - 1;
              } else {
                clearInterval(timer);
                return null;
              }
            });
          }, 1000);
        }
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to generate QR code";
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      setQrData({
        success: false,
        message: errorMessage
      });
    },
  });

  const handleGenerateQR = () => {
    setQrData(null);
    generateQRMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <MessageSquare className="w-8 h-8 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Add WhatsApp profiles
                </h1>
              </div>
              
              {qrData?.sessionId && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    🔗 Instance ID: <span className="font-mono text-green-600">{qrData.sessionId.slice(-8).toUpperCase()}</span>
                  </p>
                </div>
              )}
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Scan the QR Code on your WhatsApp app
              </p>
            </div>

            {/* QR Code Section */}
            <div className="flex justify-center mb-8">
              <Card className="w-full max-w-md">
                <CardContent className="p-8">
                  {generateQRMutation.isPending && (
                    <div className="text-center space-y-4">
                      <RefreshCw className="w-16 h-16 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Generating QR code...
                      </p>
                    </div>
                  )}

                  {qrData?.success && qrData.qrCode ? (
                    <div className="text-center space-y-4">
                      <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-gray-100">
                        <img 
                          src={qrData.qrCode} 
                          alt="WhatsApp QR Code" 
                          className="w-64 h-64"
                        />
                      </div>
                      
                      {sessionTimeLeft && sessionTimeLeft > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Active: {Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : qrData && !qrData.success ? (
                    <div className="text-center space-y-4">
                      <AlertCircle className="w-16 h-16 mx-auto text-red-400" />
                      <Alert variant="destructive">
                        <AlertDescription>{qrData.message}</AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="w-64 h-64 mx-auto border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Click below to generate QR code
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(!qrData || !qrData.success) && (
                    <div className="mt-6 text-center">
                      <Button 
                        onClick={handleGenerateQR}
                        disabled={generateQRMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        {generateQRMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Generate WhatsApp QR Code
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Instructions */}
            <div className="text-center text-gray-600 dark:text-gray-400 text-sm max-w-2xl mx-auto">
              <p className="mb-2">
                If you don't see your profiles above, you might try to reconnect, re-accept all permissions, and ensure that you're logged in to the correct profile.
              </p>
              <div className="mt-4 space-y-2">
                <p className="font-medium">How to scan:</p>
                <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to Settings → Linked Devices</li>
                    <li>Tap "Link a Device"</li>
                    <li>Scan the QR code above</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}