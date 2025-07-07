import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Play, Clock, Check, Pause, Upload, Settings, Users, MessageSquare, Shield, Zap, RefreshCw } from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  message: string;
  status: string;
  totalContacts: number;
  messagesSent: number;
  createdAt: string;
  scheduledAt?: string;
}

interface Template {
  id: number;
  name: string;
  content: string;
}

interface Contact {
  id: number;
  name: string;
  phoneNumber: string;
  isBlocked: boolean;
}

interface ContactGroup {
  id: number;
  name: string;
  contactCount: number;
}

interface WhatsappNumber {
  id: number;
  phoneNumber: string;
  displayName: string;
  status: string;
}

export default function Campaigns() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Campaign form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Anti-blocking settings
  const [antiBlockingEnabled, setAntiBlockingEnabled] = useState(true);
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [messagesPerHour, setMessagesPerHour] = useState(100);
  const [respectBusinessHours, setRespectBusinessHours] = useState(true);
  const [businessStart, setBusinessStart] = useState("09:00");
  const [businessEnd, setBusinessEnd] = useState("17:00");
  const [skipWeekends, setSkipWeekends] = useState(true);
  
  // Scheduling
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Data queries with real-time sync
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    refetchInterval: 3000, // Refresh every 3 seconds
    retry: false,
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: false,
  });

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: false,
  });

  const { data: contactGroups } = useQuery({
    queryKey: ["/api/contact-groups"],
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: false,
  });

  const { data: whatsappNumbers } = useQuery({
    queryKey: ["/api/whatsapp-numbers"],
    refetchInterval: 3000, // Refresh every 3 seconds
    retry: false,
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await apiRequest("POST", "/api/campaigns", campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign created",
        description: "Your marketing campaign has been created successfully.",
      });
      resetForm();
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign.",
        variant: "destructive",
      });
    },
  });

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      return await apiRequest("POST", `/api/campaigns/${campaignId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign started",
        description: "Your campaign is now running.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start campaign.",
        variant: "destructive",
      });
    },
  });

  // CSV file handler
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('groupName', campaignName || 'CSV Import Group');

    try {
      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
        toast({
          title: "CSV uploaded",
          description: "Contacts have been imported successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload CSV file.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setCampaignName("");
    setCampaignMessage("");
    setSelectedTemplates([]);
    setSelectedContacts([]);
    setSelectedGroups([]);
    setSelectedNumbers([]);
    setCsvFile(null);
    setAntiBlockingEnabled(true);
    setMinDelay(5);
    setMaxDelay(15);
    setMessagesPerHour(100);
    setRespectBusinessHours(true);
    setBusinessStart("09:00");
    setBusinessEnd("17:00");
    setSkipWeekends(true);
    setScheduleEnabled(false);
    setScheduleDate("");
    setScheduleTime("");
  };

  const handleSubmit = () => {
    if (!campaignName.trim()) {
      toast({
        title: "Validation Error",
        description: "Campaign name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!campaignMessage.trim() && selectedTemplates.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Either message content or templates must be selected.",
        variant: "destructive",
      });
      return;
    }

    if (selectedContacts.length === 0 && selectedGroups.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one contact or group must be selected.",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = scheduleEnabled && scheduleDate && scheduleTime 
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : null;

    const campaignData = {
      name: campaignName.trim(),
      message: campaignMessage.trim(),
      templateIds: selectedTemplates,
      whatsappNumberIds: selectedNumbers,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt,
      targetGroups: selectedGroups,
      targetContacts: selectedContacts,
      antiBlockingSettings: antiBlockingEnabled ? {
        enabled: true,
        minDelay,
        maxDelay,
        messagesPerHour,
        respectBusinessHours,
        businessStart,
        businessEnd,
        skipWeekends,
      } : { enabled: false },
      totalContacts: selectedContacts.length + selectedGroups.reduce((acc, groupId) => {
        const group = contactGroups?.find((g: ContactGroup) => g.id === groupId);
        return acc + (group?.contactCount || 0);
      }, 0),
    };

    createCampaignMutation.mutate(campaignData);
  };

  const handleTemplateToggle = (templateId: number, checked: boolean) => {
    if (checked) {
      setSelectedTemplates(prev => [...prev, templateId]);
    } else {
      setSelectedTemplates(prev => prev.filter(id => id !== templateId));
    }
  };

  const handleContactToggle = (contactId: number, checked: boolean) => {
    if (checked) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    }
  };

  const handleGroupToggle = (groupId: number, checked: boolean) => {
    if (checked) {
      setSelectedGroups(prev => [...prev, groupId]);
    } else {
      setSelectedGroups(prev => prev.filter(id => id !== groupId));
    }
  };

  const handleNumberToggle = (numberId: number, checked: boolean) => {
    if (checked) {
      setSelectedNumbers(prev => [...prev, numberId]);
    } else {
      setSelectedNumbers(prev => prev.filter(id => id !== numberId));
    }
  };

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

  const activeCampaigns = campaigns?.filter((c: Campaign) => c.status === 'active').length || 0;
  const scheduledCampaigns = campaigns?.filter((c: Campaign) => c.status === 'scheduled').length || 0;
  const completedCampaigns = campaigns?.filter((c: Campaign) => c.status === 'completed').length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'scheduled':
        return <Badge className="bg-yellow-100 text-yellow-800">Scheduled</Badge>;
      case 'paused':
        return <Badge className="bg-gray-100 text-gray-800">Paused</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  const getProgress = (campaign: Campaign) => {
    if (campaign.totalContacts === 0) return 0;
    return Math.round((campaign.messagesSent / campaign.totalContacts) * 100);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Marketing Campaigns" 
          subtitle="Create and manage advanced WhatsApp marketing campaigns"
          primaryAction={{
            label: "Create Campaign",
            onClick: () => setShowCreateForm(true)
          }}
        />
        <main className="flex-1 overflow-auto p-6">
          {/* Real-time Sync Indicator */}
          <div className="mb-4 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
              <span className="text-sm text-green-800 font-medium">Real-time Data Sync Active</span>
              <span className="text-xs text-green-600">All sections update automatically</span>
            </div>
            <div className="text-xs text-green-600">
              Last sync: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <Play className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeCampaigns}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{scheduledCampaigns}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Check className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{completedCampaigns}</div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campaign
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaignsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-6 w-20 rounded-full"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
                          </td>
                        </tr>
                      ))
                    ) : campaigns && campaigns.length > 0 ? (
                      campaigns.map((campaign: Campaign) => (
                        <tr key={campaign.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{campaign.name}</p>
                              <p className="text-xs text-gray-500">
                                Created {new Date(campaign.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(campaign.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${getProgress(campaign)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-500">{getProgress(campaign)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {campaign.messagesSent} / {campaign.totalContacts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              {campaign.status === 'draft' && (
                                <Button
                                  size="sm"
                                  onClick={() => startCampaignMutation.mutate(campaign.id)}
                                  disabled={startCampaignMutation.isPending}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Start
                                </Button>
                              )}
                              {campaign.status === 'active' && (
                                <Button size="sm" variant="outline">
                                  <Pause className="w-4 h-4 mr-1" />
                                  Pause
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No campaigns found. Create your first campaign to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Campaign Creation Dialog */}
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Create Advanced Marketing Campaign
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 p-4">
                {/* Basic Campaign Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Campaign Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="campaignName">Campaign Name</Label>
                      <Input
                        id="campaignName"
                        placeholder="e.g., Product Launch, Weekly Newsletter"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="campaignMessage">Custom Message (Optional)</Label>
                      <Textarea
                        id="campaignMessage"
                        placeholder="Type your custom message or select templates below..."
                        value={campaignMessage}
                        onChange={(e) => setCampaignMessage(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Multiple Templates Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Message Templates (Multiple Selection)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates && templates.length > 0 ? (
                        templates.map((template: Template) => (
                          <div key={template.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                            <Checkbox
                              id={`template-${template.id}`}
                              checked={selectedTemplates.includes(template.id)}
                              onCheckedChange={(checked) => handleTemplateToggle(template.id, checked as boolean)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={`template-${template.id}`} className="text-sm font-medium">
                                {template.name}
                              </Label>
                              <p className="text-xs text-gray-500 mt-1">
                                {template.content.substring(0, 100)}...
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-center text-gray-500 py-4">
                          No templates available. Create templates first.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Multiple WhatsApp Numbers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      WhatsApp Numbers (Multiple Selection)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {whatsappNumbers && whatsappNumbers.length > 0 ? (
                        // Remove duplicates by phone number
                        whatsappNumbers
                          .filter((num: WhatsappNumber) => num.status === 'connected')
                          .filter((num: WhatsappNumber, index: number, arr: WhatsappNumber[]) => 
                            arr.findIndex(n => n.phoneNumber === num.phoneNumber) === index
                          )
                          .map((number: WhatsappNumber) => (
                            <div key={number.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <Checkbox
                                id={`number-${number.id}`}
                                checked={selectedNumbers.includes(number.id)}
                                onCheckedChange={(checked) => handleNumberToggle(number.id, checked as boolean)}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`number-${number.id}`} className="text-sm font-medium">
                                  {number.phoneNumber}
                                </Label>
                                <p className="text-xs text-gray-500">
                                  {number.displayName || 'No display name'}
                                </p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="col-span-2 text-center text-gray-500 py-4">
                          No connected WhatsApp numbers found.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Target Audience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* CSV Upload */}
                    <div>
                      <Label htmlFor="csvUpload" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload CSV Contacts
                      </Label>
                      <Input
                        id="csvUpload"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        CSV format: name,phoneNumber (with country code)
                      </p>
                    </div>

                    <Separator />

                    {/* Contact Groups */}
                    <div>
                      <Label className="text-sm font-medium">Contact Groups</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        {contactGroups && contactGroups.length > 0 ? (
                          contactGroups.map((group: ContactGroup) => (
                            <div key={group.id} className="flex items-center space-x-3 p-2 border rounded">
                              <Checkbox
                                id={`group-${group.id}`}
                                checked={selectedGroups.includes(group.id)}
                                onCheckedChange={(checked) => handleGroupToggle(group.id, checked as boolean)}
                              />
                              <Label htmlFor={`group-${group.id}`} className="text-sm">
                                {group.name} ({group.contactCount} contacts)
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-center text-gray-500 py-2">
                            No contact groups available.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Individual Contacts */}
                    <div>
                      <Label className="text-sm font-medium">Individual Contacts</Label>
                      <div className="max-h-40 overflow-y-auto mt-2 space-y-2">
                        {contacts && contacts.length > 0 ? (
                          contacts
                            .filter((contact: Contact) => !contact.isBlocked)
                            .slice(0, 20)
                            .map((contact: Contact) => (
                              <div key={contact.id} className="flex items-center space-x-3 p-2 border rounded">
                                <Checkbox
                                  id={`contact-${contact.id}`}
                                  checked={selectedContacts.includes(contact.id)}
                                  onCheckedChange={(checked) => handleContactToggle(contact.id, checked as boolean)}
                                />
                                <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                                  {contact.name} ({contact.phoneNumber})
                                </Label>
                              </div>
                            ))
                        ) : (
                          <div className="text-center text-gray-500 py-2">
                            No contacts available.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Anti-Blocking System */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Anti-Blocking Protection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="antiBlocking"
                        checked={antiBlockingEnabled}
                        onCheckedChange={setAntiBlockingEnabled}
                      />
                      <Label htmlFor="antiBlocking">Enable Anti-Blocking Protection</Label>
                    </div>

                    {antiBlockingEnabled && (
                      <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="minDelay">Min Delay (seconds)</Label>
                            <Input
                              id="minDelay"
                              type="number"
                              value={minDelay}
                              onChange={(e) => setMinDelay(parseInt(e.target.value) || 5)}
                              min="1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="maxDelay">Max Delay (seconds)</Label>
                            <Input
                              id="maxDelay"
                              type="number"
                              value={maxDelay}
                              onChange={(e) => setMaxDelay(parseInt(e.target.value) || 15)}
                              min="1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="messagesPerHour">Messages Per Hour</Label>
                          <Input
                            id="messagesPerHour"
                            type="number"
                            value={messagesPerHour}
                            onChange={(e) => setMessagesPerHour(parseInt(e.target.value) || 100)}
                            min="1"
                            max="500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="businessHours"
                              checked={respectBusinessHours}
                              onCheckedChange={setRespectBusinessHours}
                            />
                            <Label htmlFor="businessHours">Respect Business Hours</Label>
                          </div>

                          {respectBusinessHours && (
                            <div className="grid grid-cols-2 gap-4 pl-6">
                              <div>
                                <Label htmlFor="businessStart">Start Time</Label>
                                <Input
                                  id="businessStart"
                                  type="time"
                                  value={businessStart}
                                  onChange={(e) => setBusinessStart(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="businessEnd">End Time</Label>
                                <Input
                                  id="businessEnd"
                                  type="time"
                                  value={businessEnd}
                                  onChange={(e) => setBusinessEnd(e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="skipWeekends"
                              checked={skipWeekends}
                              onCheckedChange={setSkipWeekends}
                            />
                            <Label htmlFor="skipWeekends">Skip Weekends</Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scheduling */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Campaign Scheduling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="scheduling"
                        checked={scheduleEnabled}
                        onCheckedChange={setScheduleEnabled}
                      />
                      <Label htmlFor="scheduling">Schedule Campaign</Label>
                    </div>

                    {scheduleEnabled && (
                      <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-yellow-200">
                        <div>
                          <Label htmlFor="scheduleDate">Date</Label>
                          <Input
                            id="scheduleDate"
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="scheduleTime">Time</Label>
                          <Input
                            id="scheduleTime"
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-4">
                  <Button variant="outline" onClick={resetForm}>
                    Reset Form
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createCampaignMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}