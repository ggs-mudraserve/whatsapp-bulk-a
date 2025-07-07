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
import { Send, MessageSquare, Users, Clock, Settings, Upload, FileText } from "lucide-react";
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
  
  // Advanced anti-blocking settings
  const [useMultipleNumbers, setUseMultipleNumbers] = useState(true);
  const [numberRotationStrategy, setNumberRotationStrategy] = useState<'sequential' | 'random' | 'load_balanced'>('load_balanced');
  const [messagesPerNumberPerHour, setMessagesPerNumberPerHour] = useState(20);
  const [cooldownBetweenNumbers, setCooldownBetweenNumbers] = useState(2);
  const [simulateTyping, setSimulateTyping] = useState(true);
  const [randomizeMessageOrder, setRandomizeMessageOrder] = useState(false);
  const [respectBusinessHours, setRespectBusinessHours] = useState(false);
  const [businessHoursStart, setBusinessHoursStart] = useState("09:00");
  const [businessHoursEnd, setBusinessHoursEnd] = useState("17:00");
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContacts, setCsvContacts] = useState<{name: string, phoneNumber: string}[]>([]);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [createGroupFromCampaign, setCreateGroupFromCampaign] = useState(true);

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

    return uniqueContacts.length + csvContacts.length;
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t: Template) => t.id === parseInt(templateId));
    if (template) {
      setMessageContent(template.content);
    }
  };

  // CSV upload handling
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header if present
      const startIndex = lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('phone') ? 1 : 0;
      
      const contacts = lines.slice(startIndex).map(line => {
        const [name, phoneNumber] = line.split(',').map(item => item.trim().replace(/"/g, ''));
        return { name: name || 'Unknown', phoneNumber: phoneNumber || '' };
      }).filter(contact => contact.phoneNumber);

      setCsvContacts(contacts);
      toast({
        title: "CSV uploaded",
        description: `Found ${contacts.length} contacts in the CSV file.`,
      });
    };
    
    reader.readAsText(file);
  };

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      let groupId = null;
      
      // If we have CSV contacts and user wants to create a group
      if (csvContacts.length > 0 && createGroupFromCampaign && campaignName.trim()) {
        try {
          // Create a new contact group with campaign name
          const groupResponse = await apiRequest("POST", "/api/contact-groups", {
            name: campaignName.trim(),
            color: "#3B82F6", // Default blue color
            description: `Contacts for campaign: ${campaignName}`
          });
          
          groupId = groupResponse.id;
          
          // Bulk create contacts and assign them to the new group
          const contactsToCreate = csvContacts.map(contact => ({
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            groupId: groupId,
            status: 'active',
            tags: [`campaign-${campaignName.toLowerCase().replace(/\s+/g, '-')}`]
          }));
          
          await apiRequest("POST", "/api/contacts/bulk", { contacts: contactsToCreate });
          
          // Add the new group to selected groups
          campaignData.targetGroups = [...(campaignData.targetGroups || []), groupId];
          
          toast({
            title: "Contacts uploaded",
            description: `Created group "${campaignName}" with ${csvContacts.length} contacts.`,
          });
        } catch (error) {
          console.error("Error creating group and contacts:", error);
          toast({
            title: "Warning",
            description: "Campaign created but failed to upload CSV contacts.",
            variant: "destructive",
          });
        }
      }
      
      return await apiRequest("POST", "/api/campaigns", campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
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
    setCsvFile(null);
    setCsvContacts([]);
    setShowCsvUpload(false);
    setCreateGroupFromCampaign(true);
    setUseMultipleNumbers(true);
    setNumberRotationStrategy('load_balanced');
    setMessagesPerNumberPerHour(20);
    setCooldownBetweenNumbers(2);
    setSimulateTyping(true);
    setRandomizeMessageOrder(false);
    setRespectBusinessHours(false);
    setBusinessHoursStart("09:00");
    setBusinessHoursEnd("17:00");
    setSkipWeekends(false);
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

    if (selectedGroups.length === 0 && selectedContacts.length === 0 && csvContacts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one contact group, individual contact, or upload a CSV file.",
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
      useMultipleNumbers,
      numberRotationStrategy,
      messagesPerNumberPerHour,
      cooldownBetweenNumbers,
      simulateTyping,
      randomizeMessageOrder,
      respectBusinessHours,
      businessHoursStart: respectBusinessHours ? businessHoursStart : undefined,
      businessHoursEnd: respectBusinessHours ? businessHoursEnd : undefined,
      skipWeekends,
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

              <Separator />

              {/* CSV Upload Section */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Upload CSV Contacts</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCsvUpload(!showCsvUpload)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {showCsvUpload ? 'Hide Upload' : 'Upload CSV'}
                  </Button>
                </div>

                {showCsvUpload && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="csvFile" className="text-xs">
                        CSV File (Name, Phone Number)
                      </Label>
                      <Input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Format: First column should be name, second column should be phone number
                      </p>
                    </div>

                    {csvContacts.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id="createGroup"
                            checked={createGroupFromCampaign}
                            onCheckedChange={(checked) => setCreateGroupFromCampaign(checked as boolean)}
                          />
                          <Label htmlFor="createGroup" className="text-sm">
                            Create contact group with campaign name
                          </Label>
                        </div>
                        
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            <p className="text-sm text-green-800">
                              <strong>{csvContacts.length} contacts</strong> ready to import
                              {createGroupFromCampaign && campaignName && (
                                <span> into group "{campaignName}"</span>
                              )}
                            </p>
                          </div>
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            <div className="text-xs text-green-700 space-y-1">
                              {csvContacts.slice(0, 5).map((contact, index) => (
                                <div key={index}>
                                  {contact.name} - {contact.phoneNumber}
                                </div>
                              ))}
                              {csvContacts.length > 5 && (
                                <div>... and {csvContacts.length - 5} more</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Target Contacts:</strong> {getTargetContactsCount()} contacts will receive this message
                  {csvContacts.length > 0 && (
                    <span> (including {csvContacts.length} from CSV)</span>
                  )}
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

              {/* Advanced Anti-blocking Settings */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Advanced Anti-blocking Protection</Label>
                  <Switch
                    checked={antiBlockingEnabled}
                    onCheckedChange={setAntiBlockingEnabled}
                  />
                </div>
                
                {antiBlockingEnabled && (
                  <div className="mt-3 space-y-4">
                    {/* Basic Delay Settings */}
                    <div className="space-y-3">
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

                    <Separator />

                    {/* Multiple Numbers Settings */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useMultipleNumbers"
                          checked={useMultipleNumbers}
                          onCheckedChange={(checked) => setUseMultipleNumbers(checked as boolean)}
                        />
                        <Label htmlFor="useMultipleNumbers" className="text-sm font-medium">
                          Use multiple WhatsApp numbers for load balancing
                        </Label>
                      </div>

                      {useMultipleNumbers && (
                        <div className="space-y-3 ml-6">
                          <div>
                            <Label htmlFor="rotationStrategy" className="text-xs">Number rotation strategy</Label>
                            <Select value={numberRotationStrategy} onValueChange={(value: any) => setNumberRotationStrategy(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="load_balanced">Load Balanced (Recommended)</SelectItem>
                                <SelectItem value="sequential">Sequential</SelectItem>
                                <SelectItem value="random">Random</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                              Load balanced distributes messages evenly across numbers
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor="messagesPerHour" className="text-xs">Max messages per number/hour</Label>
                              <Input
                                id="messagesPerHour"
                                type="number"
                                min="5"
                                max="100"
                                value={messagesPerNumberPerHour}
                                onChange={(e) => setMessagesPerNumberPerHour(parseInt(e.target.value) || 20)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="cooldownBetween" className="text-xs">Cooldown between numbers (sec)</Label>
                              <Input
                                id="cooldownBetween"
                                type="number"
                                min="1"
                                max="10"
                                value={cooldownBetweenNumbers}
                                onChange={(e) => setCooldownBetweenNumbers(parseInt(e.target.value) || 2)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Behavior Simulation */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Human Behavior Simulation</Label>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="simulateTyping"
                            checked={simulateTyping}
                            onCheckedChange={(checked) => setSimulateTyping(checked as boolean)}
                          />
                          <Label htmlFor="simulateTyping" className="text-sm">
                            Simulate typing delay before sending
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="randomizeOrder"
                            checked={randomizeMessageOrder}
                            onCheckedChange={(checked) => setRandomizeMessageOrder(checked as boolean)}
                          />
                          <Label htmlFor="randomizeOrder" className="text-sm">
                            Randomize message sending order
                          </Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Time-based Restrictions */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Time-based Restrictions</Label>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="respectBusinessHours"
                            checked={respectBusinessHours}
                            onCheckedChange={(checked) => setRespectBusinessHours(checked as boolean)}
                          />
                          <Label htmlFor="respectBusinessHours" className="text-sm">
                            Only send during business hours
                          </Label>
                        </div>

                        {respectBusinessHours && (
                          <div className="grid grid-cols-2 gap-2 ml-6">
                            <div>
                              <Label htmlFor="startTime" className="text-xs">Start time</Label>
                              <Input
                                id="startTime"
                                type="time"
                                value={businessHoursStart}
                                onChange={(e) => setBusinessHoursStart(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="endTime" className="text-xs">End time</Label>
                              <Input
                                id="endTime"
                                type="time"
                                value={businessHoursEnd}
                                onChange={(e) => setBusinessHoursEnd(e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="skipWeekends"
                            checked={skipWeekends}
                            onCheckedChange={(checked) => setSkipWeekends(checked as boolean)}
                          />
                          <Label htmlFor="skipWeekends" className="text-sm">
                            Skip weekends (Saturday & Sunday)
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-xs text-amber-800">
                        <strong>Advanced Protection:</strong> These settings help prevent account restrictions by mimicking natural messaging patterns and distributing load across multiple numbers.
                      </p>
                    </div>
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