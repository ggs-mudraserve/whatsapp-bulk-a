import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import QRCodeSetup from "@/components/whatsapp/qr-code-setup";
import ConnectedNumbers from "@/components/whatsapp/connected-numbers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="WhatsApp Integration" 
          subtitle="Connect your WhatsApp numbers to start sending messages"
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <QRCodeSetup />
            <ConnectedNumbers numbers={whatsappNumbers} loading={numbersLoading} />
          </div>

          {/* Number Health Status */}
          <Card>
            <CardHeader>
              <CardTitle>Number Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Messages Today
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Success Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {numbersLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-6 w-16 rounded-full"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                          </td>
                        </tr>
                      ))
                    ) : whatsappNumbers?.length > 0 ? (
                      whatsappNumbers.map((number: any) => (
                        <tr key={number.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                            {number.phoneNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={
                              number.status === 'active' ? 'default' :
                              number.status === 'limited' ? 'secondary' :
                              'destructive'
                            }>
                              {number.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {number.messagesSentToday}/{number.dailyMessageLimit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {parseFloat(number.successRate).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {number.lastActivity 
                              ? new Date(number.lastActivity).toLocaleString()
                              : 'Never'
                            }
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No WhatsApp numbers connected yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
