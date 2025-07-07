import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import InboxLayout from "@/components/inbox/inbox-layout";
import DirectMessage from "@/components/inbox/direct-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
          <InboxLayout />
          
          {/* Floating + Button */}
          <Dialog open={isDirectMessageOpen} onOpenChange={setIsDirectMessageOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-50"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Send Direct Message</DialogTitle>
              </DialogHeader>
              <DirectMessage onClose={() => setIsDirectMessageOpen(false)} />
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
