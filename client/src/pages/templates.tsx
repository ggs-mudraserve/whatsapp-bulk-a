import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import TemplateGrid from "@/components/templates/template-grid";
import TemplateForm from "@/components/templates/template-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Handshake, Newspaper, Calendar } from "lucide-react";

export default function Templates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/templates"],
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

  const getCategoryCount = (category: string) => {
    return templates?.filter((t: any) => t.category === category).length || 0;
  };

  const categories = [
    { name: 'promotional', label: 'Promotional', description: 'Sales and offers', icon: Megaphone, color: 'blue' },
    { name: 'follow-up', label: 'Follow-up', description: 'Customer care', icon: Handshake, color: 'green' },
    { name: 'newsletter', label: 'Newsletter', description: 'Updates & news', icon: Newspaper, color: 'purple' },
    { name: 'events', label: 'Events', description: 'Invitations', icon: Calendar, color: 'yellow' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Message Templates" 
          subtitle="Create and manage your message templates"
          primaryAction={{
            label: "Create Template",
            onClick: () => setShowCreateForm(true)
          }}
        />
        <main className="flex-1 overflow-auto p-6">
          {/* Template Categories */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {categories.map(({ name, label, description, icon: Icon, color }) => (
              <Card key={name} className="text-center">
                <CardHeader>
                  <div className={`p-3 bg-${color}-100 rounded-full w-fit mx-auto mb-4`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                  </div>
                  <CardTitle className="text-lg">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{description}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {templatesLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-8 rounded mx-auto"></div>
                    ) : (
                      getCategoryCount(name)
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Templates Grid */}
          <TemplateGrid templates={templates} loading={templatesLoading} />

          {/* Create Template Dialog */}
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
              </DialogHeader>
              <TemplateForm onSuccess={() => setShowCreateForm(false)} />
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
