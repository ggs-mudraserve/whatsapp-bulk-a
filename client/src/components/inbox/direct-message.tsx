import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Send, MessageSquare } from "lucide-react";

const directMessageSchema = z.object({
  whatsappNumberId: z.number().min(1, "Please select a WhatsApp number"),
  recipientPhone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  message: z.string().min(1, "Message is required").max(4096, "Message too long"),
});

type DirectMessageFormData = z.infer<typeof directMessageSchema>;

interface DirectMessageProps {
  onClose?: () => void;
}

export default function DirectMessage({ onClose }: DirectMessageProps) {
  const { toast } = useToast();

  const { data: whatsappNumbers, isLoading: numbersLoading } = useQuery({
    queryKey: ["/api/whatsapp-numbers"],
    retry: false,
  });

  const form = useForm<DirectMessageFormData>({
    resolver: zodResolver(directMessageSchema),
    defaultValues: {
      recipientPhone: "",
      message: "",
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: DirectMessageFormData) => {
      const response = await apiRequest("POST", "/api/messages/send-direct", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      
      // Force refresh to ensure immediate updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/conversations"] });
      }, 500);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      form.reset();
      onClose?.();
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
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DirectMessageFormData) => {
    // Ensure phone number starts with +
    const formattedPhone = data.recipientPhone.startsWith('+') 
      ? data.recipientPhone 
      : `+${data.recipientPhone}`;
    
    sendMessageMutation.mutate({
      ...data,
      recipientPhone: formattedPhone,
    });
  };

  const availableNumbers = Array.isArray(whatsappNumbers) ? whatsappNumbers.filter((num: any) => num.status === 'connected') : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Send Direct Message
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="whatsappNumberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From WhatsApp Number</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} disabled={numbersLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={numbersLoading ? "Loading..." : "Select WhatsApp number"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableNumbers.map((number: any) => (
                        <SelectItem key={number.id} value={number.id.toString()}>
                          {number.phoneNumber} - {number.displayName || 'No name'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Type your message here..." 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={sendMessageMutation.isPending || availableNumbers.length === 0}
                className="flex-1"
              >
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>

            {availableNumbers.length === 0 && !numbersLoading && (
              <p className="text-sm text-red-600">
                No active WhatsApp numbers available. Please connect a number first.
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}