import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Phone } from "lucide-react";

const manualNumberSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  displayName: z.string().min(1, "Display name is required"),
  accountType: z.enum(["personal", "business"]),
  dailyMessageLimit: z.number().min(100, "Minimum 100 messages per day").max(10000, "Maximum 10000 messages per day"),
});

type ManualNumberFormData = z.infer<typeof manualNumberSchema>;

export default function ManualNumberSetup() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<ManualNumberFormData>({
    resolver: zodResolver(manualNumberSchema),
    defaultValues: {
      phoneNumber: "",
      displayName: "",
      accountType: "personal",
      dailyMessageLimit: 1000,
    },
  });

  const addNumberMutation = useMutation({
    mutationFn: async (data: ManualNumberFormData) => {
      await apiRequest("POST", "/api/whatsapp-numbers", {
        ...data,
        status: "active",
        messagesSentToday: 0,
        successRate: "100.00",
        sessionData: { manuallyAdded: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-numbers"] });
      toast({
        title: "Number Added",
        description: "WhatsApp number has been added successfully.",
      });
      form.reset();
      setIsOpen(false);
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
        description: "Failed to add WhatsApp number.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ManualNumberFormData) => {
    // Ensure phone number starts with +
    const formattedNumber = data.phoneNumber.startsWith('+') 
      ? data.phoneNumber 
      : `+${data.phoneNumber}`;
    
    addNumberMutation.mutate({
      ...data,
      phoneNumber: formattedNumber,
    });
  };

  if (!isOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Manual Number Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Add WhatsApp numbers manually if you already have them connected elsewhere
          </p>
          <Button onClick={() => setIsOpen(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Number Manually
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Add WhatsApp Number
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My WhatsApp Business" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dailyMessageLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Message Limit</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="1000" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={addNumberMutation.isPending}
                className="flex-1"
              >
                {addNumberMutation.isPending ? "Adding..." : "Add Number"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}