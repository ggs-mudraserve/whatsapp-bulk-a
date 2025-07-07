import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import AdvancedTemplateGrid from "@/components/templates/advanced-template-grid";
import AdvancedTemplateForm from "@/components/templates/advanced-template-form";
import { useRealtimeTemplates } from "@/hooks/useRealtimeTemplates";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Activity, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  Megaphone, 
  Handshake, 
  Newspaper, 
  Calendar,
  Zap
} from "lucide-react";

export default function Templates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const { templates, isLoading: templatesLoading, triggerRefresh } = useRealtimeTemplates();

  // Update sync time when templates are refreshed
  useEffect(() => {
    if (!templatesLoading) {
      setLastSyncTime(new Date());
    }
  }, [templates, templatesLoading]);

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

  // Calculate template stats
  const totalTemplates = templates?.length || 0;
  const activeTemplates = templates?.filter((t: any) => t.isActive !== false).length || 0;
  const totalUsage = templates?.reduce((sum: number, t: any) => sum + (t.usageCount || 0), 0) || 0;
  const categoryCounts = {
    promotional: templates?.filter((t: any) => t.category === 'promotional').length || 0,
    'follow-up': templates?.filter((t: any) => t.category === 'follow-up').length || 0,
    newsletter: templates?.filter((t: any) => t.category === 'newsletter').length || 0,
    events: templates?.filter((t: any) => t.category === 'events').length || 0,
    sales: templates?.filter((t: any) => t.category === 'sales').length || 0,
    support: templates?.filter((t: any) => t.category === 'support').length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Advanced Templates</h1>
                <p className="text-gray-600 mt-2">Create, manage and optimize your message templates with advanced features</p>
                
                {/* Real-time Sync Indicator */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Real-time sync active</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    Last sync: {lastSyncTime.toLocaleTimeString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={triggerRefresh}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Template</span>
              </Button>
            </div>

            {/* Enhanced Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Templates */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Templates</p>
                      <p className="text-2xl font-bold text-gray-900">{totalTemplates}</p>
                      <p className="text-xs text-gray-600 mt-1">{activeTemplates} active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Usage */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Activity className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Usage</p>
                      <p className="text-2xl font-bold text-gray-900">{totalUsage.toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-1">across all templates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Most Popular Category */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Top Category</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Object.entries(categoryCounts).reduce((a, b) => categoryCounts[a[0]] > categoryCounts[b[0]] ? a : b)?.[1] || 0}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 capitalize">
                        {Object.entries(categoryCounts).reduce((a, b) => categoryCounts[a[0]] > categoryCounts[b[0]] ? a : b)?.[0] || 'none'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Indicator */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Zap className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Avg Usage</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {totalTemplates > 0 ? Math.round(totalUsage / totalTemplates) : 0}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">per template</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Template Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="flex items-center gap-3">
                    <Megaphone className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">Promotional</p>
                      <p className="text-sm text-gray-600">{categoryCounts.promotional}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Handshake className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Follow-up</p>
                      <p className="text-sm text-gray-600">{categoryCounts['follow-up']}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Newspaper className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Newsletter</p>
                      <p className="text-sm text-gray-600">{categoryCounts.newsletter}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Events</p>
                      <p className="text-sm text-gray-600">{categoryCounts.events}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Sales</p>
                      <p className="text-sm text-gray-600">{categoryCounts.sales}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Support</p>
                      <p className="text-sm text-gray-600">{categoryCounts.support}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Template Grid */}
            <AdvancedTemplateGrid templates={templates || []} loading={templatesLoading} />
          </div>
        </main>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <AdvancedTemplateForm onSuccess={() => setShowCreateForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}