import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertCampaignSchema } from "../../../../shared/validation";

const campaignFormSchema = insertCampaignSchema.extend({
  name: z.string().min(1, "Campaign name is required"),
  templateId: z.number().optional(),
  contactIds: z.array(z.number()).min(1, "At least one contact must be selected"),
  scheduledAt: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  onSuccess: () => void;
}

export default function CampaignForm({ onSuccess }: CampaignFormProps) {
  const { toast } = useToast();
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    retry: false,
  });

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
    retry: false,
  });

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      status: "draft",
      totalContacts: 0,
      messagesSent: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      messagesRead: 0,
      contactIds: [],
      messageDelayMin: 2,
      messageDelayMax: 8,
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      await apiRequest("POST", "/api/campaigns", {
        ...data,
        totalContacts: data.contactIds.length,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully.",
      });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create campaign.",
        variant: "destructive",
      });
    },
  });

  const handleContactSelection = (contactId: number, checked: boolean) => {
    const updatedContacts = checked
      ? [...selectedContacts, contactId]
      : selectedContacts.filter(id => id !== contactId);
    
    setSelectedContacts(updatedContacts);
    form.setValue("contactIds", updatedContacts);
  };

  const onSubmit = (data: CampaignFormData) => {
    createCampaignMutation.mutate({
      ...data,
      contactIds: selectedContacts,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter campaign name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message Template</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templates?.map((template: any) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label className="text-sm font-medium">Select Contacts</Label>
          <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
            {contacts?.map((contact: any) => (
              <div key={contact.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`contact-${contact.id}`}
                  checked={selectedContacts.includes(contact.id)}
                  onChange={(e) => handleContactSelection(contact.id, e.target.checked)}
                  className="rounded"
                />
                <label htmlFor={`contact-${contact.id}`} className="text-sm">
                  {contact.name} ({contact.phoneNumber})
                </label>
              </div>
            ))}
          </div>
          {form.formState.errors.contactIds && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.contactIds.message}</p>
          )}
        </div>

        <FormField
          control={form.control}
          name="scheduledAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Schedule Campaign (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="messageDelayMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Delay (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="messageDelayMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Delay (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCampaignMutation.isPending}>
            {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
