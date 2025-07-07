import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import DirectMessage from "@/components/inbox/direct-message";
import ErrorBoundary from "@/components/error-boundary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle } from "lucide-react";
import { Plus } from "lucide-react";


export default function Inbox() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isDirectMessageOpen, setIsDirectMessageOpen] = useState(false);

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
          title="Inbox" 
          subtitle="Manage your WhatsApp conversations"
        />
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary>
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold mb-2 text-gray-700">Inbox Coming Soon</h3>
                <p className="text-gray-500 max-w-sm">
                  We're working on bringing you an amazing inbox experience. This feature will be available shortly.
                </p>
              </div>
            </Card>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
