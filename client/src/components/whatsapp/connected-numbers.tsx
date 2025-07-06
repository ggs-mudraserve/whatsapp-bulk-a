import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Smartphone } from "lucide-react";

interface ConnectedNumbersProps {
  numbers: any[];
  loading: boolean;
}

export default function ConnectedNumbers({ numbers, loading }: ConnectedNumbersProps) {
  const { toast } = useToast();

  const deleteNumberMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whatsapp-numbers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-numbers"] });
      toast({
        title: "Number disconnected",
        description: "WhatsApp number has been disconnected successfully.",
      });
    },
    onError: (error) => {
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
        title: "Error",
        description: "Failed to disconnect WhatsApp number.",
        variant: "destructive",
      });
    },
  });

  const handleDisconnect = (id: number) => {
    if (confirm("Are you sure you want to disconnect this WhatsApp number?")) {
      deleteNumberMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'limited':
        return <Badge variant="secondary">Limited</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'disconnected':
        return <Badge variant="outline">Disconnected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'limited':
        return 'bg-yellow-500';
      case 'blocked':
        return 'bg-red-500';
      case 'disconnected':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Numbers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-6"></div>
                </div>
              </div>
            ))
          ) : numbers && numbers.length > 0 ? (
            numbers.map((number: any) => (
              <div key={number.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(number.status)}`}>
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {number.displayName || number.phoneNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {number.displayName ? number.phoneNumber : `${number.accountType} Account`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(number.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect(number.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No WhatsApp numbers connected</p>
              <p className="text-sm">Connect your first WhatsApp number to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
