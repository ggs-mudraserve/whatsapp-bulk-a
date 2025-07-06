import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCard from "@/components/dashboard/stats-card";
import CampaignChart from "@/components/dashboard/campaign-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, Eye, MessageCircle, Play, Clock, Check } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

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

  const recentCampaigns = campaigns?.slice(0, 3) || [];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard" 
          subtitle="Welcome back! Here's your marketing overview"
          primaryAction={{
            label: "New Campaign",
            onClick: () => window.location.href = "/campaigns"
          }}
        />
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Sent"
              value={stats?.totalSent || 0}
              icon={Send}
              color="blue"
              trend={{ value: 12, label: "vs last month" }}
              loading={statsLoading}
            />
            <StatsCard
              title="Delivered"
              value={stats?.totalDelivered || 0}
              icon={CheckCircle}
              color="green"
              trend={{ value: Math.round(((stats?.totalDelivered || 0) / (stats?.totalSent || 1)) * 100), label: "success rate", suffix: "%" }}
              loading={statsLoading}
            />
            <StatsCard
              title="Read Rate"
              value={stats?.readRate || 0}
              suffix="%"
              icon={Eye}
              color="purple"
              trend={{ value: 5, label: "improvement" }}
              loading={statsLoading}
            />
            <StatsCard
              title="Active Numbers"
              value={stats?.activeNumbers || 0}
              icon={MessageCircle}
              color="emerald"
              trend={{ label: "All healthy" }}
              loading={statsLoading}
            />
          </div>

          {/* Charts and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Performance Chart */}
            <div className="lg:col-span-2">
              <CampaignChart />
            </div>

            {/* Recent Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaignsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentCampaigns.length > 0 ? (
                    recentCampaigns.map((campaign: any) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{campaign.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={
                          campaign.status === 'active' ? 'default' :
                          campaign.status === 'completed' ? 'secondary' :
                          campaign.status === 'scheduled' ? 'outline' : 'destructive'
                        }>
                          {campaign.status === 'active' && <Play className="w-3 h-3 mr-1" />}
                          {campaign.status === 'completed' && <Check className="w-3 h-3 mr-1" />}
                          {campaign.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                          {campaign.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No campaigns yet</p>
                      <p className="text-sm">Create your first campaign to get started</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
