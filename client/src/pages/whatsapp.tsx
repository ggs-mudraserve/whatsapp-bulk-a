import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SimpleQRSetup from "@/components/whatsapp/simple-qr-setup";
import ConnectedNumbers from "@/components/whatsapp/connected-numbers";
import ConnectionNotice from "@/components/whatsapp/connection-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, Smartphone } from "lucide-react";

export default function WhatsApp() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: whatsappNumbers, isLoading: numbersLoading } = useQuery({
    queryKey: ["/api/whatsapp-numbers"],
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const connectedNumbers = Array.isArray(whatsappNumbers) ? whatsappNumbers : [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Smartphone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Connection</h1>
              <p className="text-gray-600">Connect your WhatsApp numbers using QR code</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Connection Notice */}
            <div className="lg:col-span-3">
              <ConnectionNotice />
            </div>

            {/* QR Code Connection */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    QR Code Connection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SimpleQRSetup />
                </CardContent>
              </Card>
            </div>

            {/* Connected Numbers */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Connected Numbers
                    <Badge variant="secondary">{connectedNumbers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {numbersLoading ? (
                    <div className="text-center py-4 text-gray-500">Loading...</div>
                  ) : connectedNumbers.length > 0 ? (
                    <ConnectedNumbers />
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No numbers connected yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}