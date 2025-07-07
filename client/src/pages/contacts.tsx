import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCard from "@/components/dashboard/stats-card";
import ContactTable from "@/components/contacts/contact-table";
import ContactForm from "@/components/contacts/contact-form";
import ContactGroups from "@/components/contacts/contact-groups";
import BulkUpload from "@/components/contacts/bulk-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle, Tags, Ban, Upload } from "lucide-react";
import type { Contact } from "@shared/schema";

export default function Contacts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
    retry: false,
  });

  // Filter contacts based on selected group
  const filteredContacts = selectedGroupId === null 
    ? contacts 
    : selectedGroupId === 0 
      ? contacts.filter((contact: Contact) => !contact.groupId)
      : contacts.filter((contact: Contact) => contact.groupId === selectedGroupId);

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

  const totalContacts = contacts?.length || 0;
  const activeContacts = contacts?.filter((c: any) => c.status === 'active').length || 0;
  const taggedContacts = contacts?.filter((c: any) => c.tags?.length > 0).length || 0;
  const blockedContacts = contacts?.filter((c: any) => c.status === 'blocked').length || 0;

  const handleImportCSV = () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // TODO: Implement CSV import
        toast({
          title: "CSV Import",
          description: "CSV import functionality will be implemented soon.",
        });
      }
    };
    input.click();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Contacts" 
          subtitle="Manage your contact database"
          primaryAction={{
            label: "Add Contact",
            onClick: () => setShowCreateForm(true)
          }}
          secondaryAction={{
            label: "Bulk Upload",
            component: <BulkUpload onUploadComplete={() => {
              // Refresh data
            }} />
          }}
        />
        <main className="flex-1 overflow-auto p-6">
          {/* Contact Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Contacts"
              value={totalContacts}
              icon={Users}
              color="blue"
              loading={contactsLoading}
            />
            <StatsCard
              title="Active Numbers"
              value={activeContacts}
              icon={CheckCircle}
              color="green"
              loading={contactsLoading}
            />
            <StatsCard
              title="Tagged"
              value={taggedContacts}
              icon={Tags}
              color="purple"
              loading={contactsLoading}
            />
            <StatsCard
              title="Blocked"
              value={blockedContacts}
              icon={Ban}
              color="red"
              loading={contactsLoading}
            />
          </div>

          {/* Main Content Area with Groups and Table */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Contact Groups Sidebar */}
            <div className="lg:col-span-1">
              <ContactGroups 
                contacts={contacts}
                selectedGroupId={selectedGroupId}
                onGroupSelect={setSelectedGroupId}
              />
            </div>

            {/* Contact Table */}
            <div className="lg:col-span-3">
              <ContactTable 
                contacts={filteredContacts} 
                loading={contactsLoading}
              />
            </div>
          </div>

          {/* Create Contact Dialog */}
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <ContactForm onSuccess={() => setShowCreateForm(false)} />
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
