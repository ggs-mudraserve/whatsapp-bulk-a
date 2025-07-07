import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCard from "@/components/dashboard/stats-card";
import CampaignTable from "@/components/campaigns/campaign-table";
import CampaignForm from "@/components/campaigns/campaign-form";
import BulkMessageForm from "@/components/campaigns/bulk-message-form";
import DailyUploadScheduler from "@/components/campaigns/daily-upload-scheduler";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Clock, Check } from "lucide-react";

export default function Campaigns() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
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

  const activeCampaigns = campaigns?.filter((c: any) => c.status === 'active').length || 0;
  const scheduledCampaigns = campaigns?.filter((c: any) => c.status === 'scheduled').length || 0;
  const completedCampaigns = campaigns?.filter((c: any) => c.status === 'completed').length || 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Campaigns" 
          subtitle="Create and manage your marketing campaigns"
          primaryAction={{
            label: "Bulk Message",
            component: <BulkMessageForm onSuccess={() => {
              // Refresh campaigns after bulk message creation
            }} />
          }}
          secondaryAction={{
            label: "Simple Campaign",
            onClick: () => setShowCreateForm(true)
          }}
        />
        <main className="flex-1 overflow-auto p-6">
          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Active Campaigns"
              value={activeCampaigns}
              icon={Play}
              color="green"
              loading={campaignsLoading}
            />
            <StatsCard
              title="Scheduled"
              value={scheduledCampaigns}
              icon={Clock}
              color="blue"
              loading={campaignsLoading}
            />
            <StatsCard
              title="Completed"
              value={completedCampaigns}
              icon={Check}
              color="purple"
              loading={campaignsLoading}
            />
          </div>

          {/* Campaigns Table */}
          <div className="space-y-8">
            <CampaignTable campaigns={campaigns} loading={campaignsLoading} />
            
            {/* Daily Upload Scheduler */}
            <DailyUploadScheduler onScheduleCreated={() => {
              // Refresh campaigns or handle schedule creation
            }} />
          </div>

          {/* Simple Campaign Dialog */}
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Simple Campaign</DialogTitle>
              </DialogHeader>
              <CampaignForm onSuccess={() => setShowCreateForm(false)} />
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
