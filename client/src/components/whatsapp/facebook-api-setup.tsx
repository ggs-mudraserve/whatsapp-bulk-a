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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Facebook, Plus, ExternalLink, CheckCircle, AlertTriangle, Key, Building } from "lucide-react";

const facebookApiSchema = z.object({
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  businessAccountId: z.string().min(1, "WhatsApp Business Account ID is required"),
  displayName: z.string().min(1, "Display name is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  webhookVerifyToken: z.string().optional(),
});

type FacebookApiFormData = z.infer<typeof facebookApiSchema>;

export default function FacebookApiSetup() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'verification' | 'success'>('form');

  const form = useForm<FacebookApiFormData>({
    resolver: zodResolver(facebookApiSchema),
    defaultValues: {
      phoneNumberId: "",
      accessToken: "",
      businessAccountId: "",
      displayName: "",
      phoneNumber: "",
      webhookVerifyToken: "",
    },
  });

  const addFacebookApiMutation = useMutation({
    mutationFn: async (data: FacebookApiFormData) => {
      await apiRequest("POST", "/api/whatsapp/facebook-api", data);
    },
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-numbers"] });
      toast({
        title: "WhatsApp Business API Connected",
        description: "Your Facebook WhatsApp Business number has been added successfully.",
      });
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
        description: "Failed to connect WhatsApp Business API. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FacebookApiFormData) => {
    setStep('verification');
    addFacebookApiMutation.mutate(data);
  };

  const resetForm = () => {
    setStep('form');
    form.reset();
    setIsOpen(false);
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="w-5 h-5 text-blue-600" />
          Facebook Business API
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your verified WhatsApp Business numbers through Facebook Business Manager
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Connect Business API
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {step === 'form' && 'Connect WhatsApp Business API'}
                {step === 'verification' && 'Verifying Connection'}
                {step === 'success' && 'Successfully Connected'}
              </DialogTitle>
            </DialogHeader>

            {step === 'form' && (
              <div className="space-y-4">
                <Alert>
                  <Building className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Prerequisites:</strong> You need a verified WhatsApp Business Account through Facebook Business Manager with API access enabled.
                    <br />
                    <a 
                      href="https://developers.facebook.com/docs/whatsapp/getting-started" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      Setup Guide <ExternalLink className="w-3 h-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Business WhatsApp" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                      name="businessAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp Business Account ID</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789012345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number ID</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789012345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accessToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Token</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="EAAxxxxxxxxxx..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="webhookVerifyToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook Verify Token (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="your_webhook_verify_token" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-800">
                        <Key className="w-3 h-3 inline mr-1" />
                        <strong>How to get these values:</strong>
                        <br />
                        1. Go to Facebook Developer Console → Your App → WhatsApp → API Setup
                        <br />
                        2. Copy the Phone Number ID and Access Token
                        <br />
                        3. Find Business Account ID in WhatsApp Manager
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={addFacebookApiMutation.isPending}
                    >
                      {addFacebookApiMutation.isPending ? "Connecting..." : "Connect API"}
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {step === 'verification' && (
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">
                  Verifying your WhatsApp Business API credentials...
                </p>
                <p className="text-xs text-muted-foreground">
                  This may take a few moments
                </p>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <div>
                  <h3 className="font-semibold">API Connected Successfully!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your WhatsApp Business API is now active and ready for messaging
                  </p>
                </div>
                <Button onClick={resetForm} className="w-full">
                  Connect Another API
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Official WhatsApp Business API with enterprise features
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Note:</strong> WhatsApp Business API requires approval from Facebook and may have messaging costs. 
            This is different from WhatsApp Web and provides official business messaging capabilities.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}