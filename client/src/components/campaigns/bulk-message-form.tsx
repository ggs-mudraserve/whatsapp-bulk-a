import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Send, MessageSquare, Users, Clock, Settings } from "lucide-react";
import type { ContactGroup, Contact, WhatsappNumber, Template } from "@shared/schema";

interface BulkMessageFormProps {
  onSuccess?: () => void;
}

export default function BulkMessageForm({ onSuccess }: BulkMessageFormProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  
  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedWhatsappNumber, setSelectedWhatsappNumber] = useState<string>("");
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [antiBlockingEnabled, setAntiBlockingEnabled] = useState(true);
  const [messageDelay, setMessageDelay] = useState(5);
  const [randomizeDelay, setRandomizeDelay] = useState(true);
  const [delayMin, setDelayMin] = useState(3);
  const [delayMax, setDelayMax] = useState(8);

  // Fetch data
  const { data: contactGroups = [] } = useQuery({
    queryKey: ["/api/contact-groups"],
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const { data: whatsappNumbers = [] } = useQuery({
    queryKey: ["/api/whatsapp-numbers"],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });

  // Calculate target contacts
  const getTargetContactsCount = () => {
    let targetContacts: Contact[] = [];
    
    // Add contacts from selected groups
    if (selectedGroups.length > 0) {
      const groupContacts = contacts.filter((contact: Contact) => 
        selectedGroups.includes(contact.groupId)
      );
      targetContacts.push(...groupContacts);
    }

    // Add individually selected contacts
    if (selectedContacts.length > 0) {
      const individualContacts = contacts.filter((contact: Contact) => 
        selectedContacts.includes(contact.id)
      );
      targetContacts.push(...individualContacts);
    }

    // Remove duplicates and blocked contacts
    const uniqueContacts = targetContacts.filter((contact, index, self) => 
      index === self.findIndex(c => c.id === contact.id) && contact.status !== 'blocked'
    );

    return uniqueContacts.length;
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t: Template) => t.id === parseInt(templateId));
    if (template) {
      setMessageContent(template.content);
    }
  };

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await apiRequest("POST", "/api/campaigns", campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign created",
        description: `Bulk message campaign "${campaignName}" has been created successfully.`,
      });
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCampaignName("");
    setMessageContent("");
    setSelectedTemplate("");
    setSelectedWhatsappNumber("");
    setSelectedGroups([]);
    setSelectedContacts([]);
    setScheduleDate("");
    setScheduleTime("");
    setAntiBlockingEnabled(true);
    setMessageDelay(5);
    setRandomizeDelay(true);
    setDelayMin(3);
    setDelayMax(8);
    setShowDialog(false);
  };

  const handleSubmit = () => {
    // Validation
    if (!campaignName.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!messageContent.trim()) {
      toast({
        title: "Error",
        description: "Message content is required.",
        variant: "destructive",
      });
      return;
    }

    if (selectedGroups.length === 0 && selectedContacts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one contact group or individual contact.",
        variant: "destructive",
      });
      return;
    }

    const targetCount = getTargetContactsCount();
    if (targetCount === 0) {
      toast({
        title: "Error",
        description: "No valid target contacts found. Please check your selections.",
        variant: "destructive",
      });
      return;
    }

    // Prepare anti-blocking settings
    const antiBlockingSettings = {
      enabled: antiBlockingEnabled,
      messageDelay: randomizeDelay ? undefined : messageDelay,
      randomizeDelay,
      delayRange: randomizeDelay ? [delayMin, delayMax] : undefined,
    };

    // Prepare schedule
    let scheduledAt = null;
    if (scheduleDate && scheduleTime) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    }

    // Create campaign data
    const campaignData = {
      name: campaignName.trim(),
      message: messageContent.trim(),
      templateId: selectedTemplate ? parseInt(selectedTemplate) : null,
      whatsappNumberId: selectedWhatsappNumber ? parseInt(selectedWhatsappNumber) : null,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt,
      targetGroups: selectedGroups,
      targetContacts: selectedContacts,
      antiBlockingSettings,
      totalContacts: targetCount,
    };

    createCampaignMutation.mutate(campaignData);
  };

  const handleGroupToggle = (groupId: number, checked: boolean) => {
    if (checked) {
      setSelectedGroups(prev => [...prev, groupId]);
    } else {
      setSelectedGroups(prev => prev.filter(id => id !== groupId));
    }
  };

  const handleContactToggle = (contactId: number, checked: boolean) => {
    if (checked) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Send className="w-4 h-4 mr-2" />
          Bulk Message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Create Bulk Message Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g., Weekly Newsletter, Product Launch"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="whatsappNumber">WhatsApp Number (Optional)</Label>
                <Select value={selectedWhatsappNumber} onValueChange={setSelectedWhatsappNumber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select WhatsApp number to send from" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use any available number</SelectItem>
                    {whatsappNumbers
                      .filter((num: WhatsappNumber) => num.status === 'connected')
                      .map((num: WhatsappNumber) => (
                        <SelectItem key={num.id} value={num.id.toString()}>
                          {num.phoneNumber} ({num.displayName || 'No name'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Message Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Message Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template">Use Template (Optional)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template or write custom message" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template: Template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="messageContent">Message</Label>
                <Textarea
                  id="messageContent"
                  placeholder="Type your message here..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Characters: {messageContent.length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Groups */}
              <div>
                <Label className="text-sm font-medium">Contact Groups</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {contactGroups.map((group: ContactGroup) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={(checked) => handleGroupToggle(group.id, checked as boolean)}
                      />
                      <Label htmlFor={`group-${group.id}`} className="text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: group.color || "#3B82F6" }}
                          />
                          {group.name}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Individual Contacts */}
              <div>
                <Label className="text-sm font-medium">Individual Contacts</Label>
                <div className="max-h-40 overflow-y-auto mt-2 space-y-2">
                  {contacts.slice(0, 20).map((contact: Contact) => (
                    <div key={contact.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`contact-${contact.id}`}
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={(checked) => handleContactToggle(contact.id, checked as boolean)}
                      />
                      <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                        {contact.name} ({contact.phoneNumber})
                        {contact.status === 'blocked' && (
                          <Badge variant="destructive" className="ml-2 text-xs">Blocked</Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                  {contacts.length > 20 && (
                    <p className="text-xs text-gray-500">
                      Showing first 20 contacts. Use groups for better organization.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Target Contacts:</strong> {getTargetContactsCount()} contacts will receive this message
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Schedule & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scheduling */}
              <div>
                <Label className="text-sm font-medium">Schedule (Optional)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="scheduleDate" className="text-xs">Date</Label>
                    <Input
                      id="scheduleDate"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduleTime" className="text-xs">Time</Label>
                    <Input
                      id="scheduleTime"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Anti-blocking Settings */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Anti-blocking Protection</Label>
                  <Switch
                    checked={antiBlockingEnabled}
                    onCheckedChange={setAntiBlockingEnabled}
                  />
                </div>
                
                {antiBlockingEnabled && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="randomizeDelay"
                        checked={randomizeDelay}
                        onCheckedChange={(checked) => setRandomizeDelay(checked as boolean)}
                      />
                      <Label htmlFor="randomizeDelay" className="text-sm">
                        Randomize message delays
                      </Label>
                    </div>

                    {randomizeDelay ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="delayMin" className="text-xs">Min delay (seconds)</Label>
                          <Input
                            id="delayMin"
                            type="number"
                            min="1"
                            max="60"
                            value={delayMin}
                            onChange={(e) => setDelayMin(parseInt(e.target.value) || 3)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="delayMax" className="text-xs">Max delay (seconds)</Label>
                          <Input
                            id="delayMax"
                            type="number"
                            min="1"
                            max="60"
                            value={delayMax}
                            onChange={(e) => setDelayMax(parseInt(e.target.value) || 8)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="messageDelay" className="text-xs">Fixed delay (seconds)</Label>
                        <Input
                          id="messageDelay"
                          type="number"
                          min="1"
                          max="60"
                          value={messageDelay}
                          onChange={(e) => setMessageDelay(parseInt(e.target.value) || 5)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}