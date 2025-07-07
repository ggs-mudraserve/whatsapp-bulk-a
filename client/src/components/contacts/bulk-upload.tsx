import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";
import type { ContactGroup } from "@shared/schema";

interface ContactData {
  name: string;
  phoneNumber: string;
  email?: string;
  notes?: string;
  groupId?: number;
}

interface BulkUploadProps {
  onUploadComplete?: () => void;
}

export default function BulkUpload({ onUploadComplete }: BulkUploadProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [contactsText, setContactsText] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewContacts, setPreviewContacts] = useState<ContactData[]>([]);

  // Fetch contact groups for selection
  const { data: groups = [] } = useQuery({
    queryKey: ["/api/contact-groups"],
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (contacts: ContactData[]) => {
      return await apiRequest("POST", "/api/contacts/bulk-upload", { contacts });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
      toast({
        title: "Upload successful",
        description: `Successfully uploaded ${data.count} contacts.`,
      });
      resetForm();
      onUploadComplete?.();
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload contacts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setContactsText("");
    setSelectedGroupId("");
    setUploadProgress(0);
    setIsProcessing(false);
    setValidationErrors([]);
    setPreviewContacts([]);
    setShowDialog(false);
  };

  const parseContactsFromText = (text: string): { contacts: ContactData[]; errors: string[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    const contacts: ContactData[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Support multiple formats:
      // 1. Name, Phone (basic)
      // 2. Name, Phone, Email (with email)
      // 3. CSV format with headers
      
      const parts = trimmedLine.split(',').map(part => part.trim());
      
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Invalid format. Expected at least Name, Phone`);
        return;
      }

      const [name, phoneNumber, email, notes] = parts;

      // Basic validation
      if (!name || name.length < 2) {
        errors.push(`Line ${index + 1}: Name must be at least 2 characters`);
        return;
      }

      if (!phoneNumber || !/^\+?[\d\s\-\(\)]{10,}$/.test(phoneNumber.replace(/\s/g, ''))) {
        errors.push(`Line ${index + 1}: Invalid phone number format`);
        return;
      }

      // Clean phone number (remove spaces, dashes, parentheses)
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

      const contact: ContactData = {
        name: name.trim(),
        phoneNumber: cleanPhone,
        email: email?.trim() || undefined,
        notes: notes?.trim() || undefined,
        groupId: selectedGroupId ? parseInt(selectedGroupId) : undefined,
      };

      contacts.push(contact);
    });

    return { contacts, errors };
  };

  const handlePreview = () => {
    if (!contactsText.trim()) {
      toast({
        title: "Error",
        description: "Please enter contact data to preview.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(25);

    setTimeout(() => {
      const { contacts, errors } = parseContactsFromText(contactsText);
      setPreviewContacts(contacts);
      setValidationErrors(errors);
      setUploadProgress(100);
      setIsProcessing(false);
    }, 500);
  };

  const handleUpload = () => {
    if (previewContacts.length === 0) {
      toast({
        title: "Error",
        description: "No valid contacts to upload.",
        variant: "destructive",
      });
      return;
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Validation errors",
        description: "Please fix validation errors before uploading.",
        variant: "destructive",
      });
      return;
    }

    bulkUploadMutation.mutate(previewContacts);
  };

  const downloadTemplate = () => {
    const template = `Name,Phone,Email,Notes
John Doe,+1234567890,john@example.com,Important client
Jane Smith,+1987654321,jane@example.com,Follow up next week
Mike Johnson,+1555555555,,New lead from website`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload Contacts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                Upload Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Enter contact data in the following formats:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li><strong>Basic:</strong> Name, Phone</li>
                <li><strong>With Email:</strong> Name, Phone, Email</li>
                <li><strong>Complete:</strong> Name, Phone, Email, Notes</li>
              </ul>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Group Selection */}
          <div>
            <Label htmlFor="groupSelect">Assign to Group (Optional)</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group or leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Group (Unassigned)</SelectItem>
                {groups.map((group: ContactGroup) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: group.color || "#3B82F6" }}
                      />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Data Input */}
          <div>
            <Label htmlFor="contactsInput">Contact Data</Label>
            <Textarea
              id="contactsInput"
              placeholder="John Doe, +1234567890, john@example.com
Jane Smith, +1987654321, jane@example.com
Mike Johnson, +1555555555"
              value={contactsText}
              onChange={(e) => setContactsText(e.target.value)}
              rows={8}
              className="mt-1"
            />
          </div>

          {/* Progress */}
          {isProcessing && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Processing contacts...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  Validation Errors ({validationErrors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-red-600">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                  {validationErrors.length > 10 && (
                    <div className="text-gray-500">
                      ... and {validationErrors.length - 10} more errors
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {previewContacts.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Valid Contacts ({previewContacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {previewContacts.slice(0, 5).map((contact, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{contact.name}</span>
                      <span className="text-gray-500">{contact.phoneNumber}</span>
                      {contact.email && <span className="text-blue-600">{contact.email}</span>}
                    </div>
                  ))}
                  {previewContacts.length > 5 && (
                    <div className="text-gray-500 text-sm">
                      ... and {previewContacts.length - 5} more contacts
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePreview}
              disabled={isProcessing || !contactsText.trim()}
            >
              Preview
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={bulkUploadMutation.isPending || previewContacts.length === 0 || validationErrors.length > 0}
            >
              {bulkUploadMutation.isPending ? "Uploading..." : `Upload ${previewContacts.length} Contacts`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}