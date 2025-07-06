import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Plus, ExternalLink, CheckCircle, Building, Star, Users, Zap, Globe, DollarSign, ArrowRight } from "lucide-react";

const providerSchema = z.object({
  provider: z.string().min(1, "Please select a provider"),
  name: z.string().min(1, "Phone number name is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  businessId: z.string().optional(),
  notes: z.string().optional(),
});

type ProviderFormData = z.infer<typeof providerSchema>;

const whatsappProviders = [
  {
    id: "wati",
    name: "Wati",
    description: "WhatsApp-focused platform with broadcast excellence",
    pricing: "From $25/month",
    features: ["Advanced segmentation", "Automation workflows", "Multi-platform integrations", "No-code chatbot"],
    rating: 4.8,
    bestFor: "Marketing & Broadcasting",
    website: "https://wati.io",
    setupGuide: "https://wati.io/api-documentation",
    popular: true
  },
  {
    id: "aisensy",
    name: "AiSensy",
    description: "Marketing automation and CRM integration",
    pricing: "From $19/month",
    features: ["No-code chatbot", "Click-to-WhatsApp ads", "Bulk messaging", "CRM integration"],
    rating: 4.7,
    bestFor: "Marketing Automation",
    website: "https://aisensy.com",
    setupGuide: "https://aisensy.com/docs",
    popular: true
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Enterprise-grade messaging APIs",
    pricing: "Pay-as-you-go",
    features: ["Robust API", "Global reach", "Developer-friendly", "Enterprise support"],
    rating: 4.6,
    bestFor: "Enterprise & Developers",
    website: "https://twilio.com",
    setupGuide: "https://www.twilio.com/docs/whatsapp",
    enterprise: true
  },
  {
    id: "sleekflow",
    name: "SleekFlow",
    description: "Omnichannel social commerce platform",
    pricing: "From $39/month",
    features: ["AI-powered automation", "Cross-channel messaging", "3-minute setup", "Social commerce"],
    rating: 4.5,
    bestFor: "Social Commerce",
    website: "https://sleekflow.io",
    setupGuide: "https://sleekflow.io/help",
    popular: true
  },
  {
    id: "doubletick",
    name: "DoubleTick",
    description: "Mobile-first WhatsApp CRM",
    pricing: "From $15/month",
    features: ["Sales pipeline", "Unlimited broadcasting", "Mobile optimization", "Team collaboration"],
    rating: 4.4,
    bestFor: "Sales Teams",
    website: "https://doubletick.io",
    setupGuide: "https://doubletick.io/help"
  },
  {
    id: "360dialog",
    name: "360Dialog",
    description: "WhatsApp-only BSP with rapid support",
    pricing: "From $49/month",
    features: ["30-min problem resolution", "Marketing automation", "Analytics", "WhatsApp-focused"],
    rating: 4.3,
    bestFor: "WhatsApp Specialists",
    website: "https://360dialog.com",
    setupGuide: "https://docs.360dialog.com"
  },
  {
    id: "infobip",
    name: "Infobip",
    description: "Global communications platform",
    pricing: "Enterprise pricing",
    features: ["Enterprise infrastructure", "Compliance tools", "Global presence", "24/7 support"],
    rating: 4.5,
    bestFor: "Large Organizations",
    website: "https://infobip.com",
    setupGuide: "https://dev.infobip.com",
    enterprise: true
  },
  {
    id: "trengo",
    name: "Trengo",
    description: "Customer service automation",
    pricing: "From $29/month",
    features: ["Team inbox", "Automation rules", "CRM integrations", "Customer support"],
    rating: 4.2,
    bestFor: "Customer Support",
    website: "https://trengo.com",
    setupGuide: "https://help.trengo.com"
  }
];

export default function ProviderSetup() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'providers' | 'form'>('providers');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      provider: '',
      name: '',
      phoneNumber: '',
      apiKey: '',
      apiSecret: '',
      webhookUrl: '',
      businessId: '',
      notes: '',
    },
  });

  const connectProviderMutation = useMutation({
    mutationFn: async (data: ProviderFormData) => {
      await apiRequest("POST", "/api/whatsapp/connect-provider", data);
    },
    onSuccess: () => {
      toast({
        title: "Provider Connected",
        description: "Your WhatsApp Business provider has been connected successfully!",
      });
      setIsOpen(false);
      setStep('providers');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp-numbers'] });
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
        title: "Connection Failed",
        description: "Failed to connect WhatsApp provider. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProviderFormData) => {
    connectProviderMutation.mutate(data);
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    form.setValue('provider', providerId);
    setStep('form');
  };

  const selectedProviderData = whatsappProviders.find(p => p.id === selectedProvider);

  const renderProviderCard = (provider: typeof whatsappProviders[0]) => (
    <Card 
      key={provider.id} 
      className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
      onClick={() => handleProviderSelect(provider.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {provider.name}
              {provider.popular && <Badge variant="secondary" className="bg-green-100 text-green-800">Popular</Badge>}
              {provider.enterprise && <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enterprise</Badge>}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{provider.rating}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-600">{provider.bestFor}</span>
            <span className="text-sm font-semibold">{provider.pricing}</span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {provider.features.slice(0, 3).map((feature, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
            {provider.features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{provider.features.length - 3} more
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <a 
              href={provider.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              Visit Website <ExternalLink className="w-3 h-3" />
            </a>
            <Button size="sm" variant="outline" className="text-xs">
              Select <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5 text-purple-600" />
          WhatsApp Business Providers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect through certified WhatsApp Business Solution Providers
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Connect Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {step === 'providers' ? 'Choose Your WhatsApp Provider' : `Connect ${selectedProviderData?.name}`}
              </DialogTitle>
            </DialogHeader>

            {step === 'providers' && (
              <div className="space-y-4">
                <Alert>
                  <Building className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>WhatsApp Business Solution Providers (BSPs)</strong> are certified partners that provide official WhatsApp Business API access. 
                    They handle the technical infrastructure, compliance, and provide additional business features.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  {whatsappProviders.map(renderProviderCard)}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 text-sm mb-2">Why Use a Provider?</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Official WhatsApp Business API access</li>
                    <li>• No QR code limitations or rate limits</li>
                    <li>• Advanced features like templates, automation</li>
                    <li>• Dedicated support and compliance</li>
                    <li>• Webhook integrations and analytics</li>
                  </ul>
                </div>
              </div>
            )}

            {step === 'form' && selectedProviderData && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedProviderData.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedProviderData.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(selectedProviderData.website, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Website
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(selectedProviderData.setupGuide, '_blank')}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Setup Guide
                    </Button>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Connection Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Marketing WhatsApp" {...field} />
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
                    </div>

                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input placeholder="Your provider API key" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="apiSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Secret (Optional)</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="API secret if required" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="webhookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Webhook URL (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://your-webhook-url.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="businessId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business ID (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Business account ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any additional notes about this connection" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStep('providers')}
                        className="flex-1"
                      >
                        Back to Providers
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={connectProviderMutation.isPending}
                        className="flex-1"
                      >
                        {connectProviderMutation.isPending ? 'Connecting...' : 'Connect Provider'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <h4 className="font-semibold text-purple-800 text-sm mb-1">Popular Providers:</h4>
          <div className="flex flex-wrap gap-2">
            {whatsappProviders.filter(p => p.popular).map(provider => (
              <Badge key={provider.id} variant="outline" className="text-xs">
                {provider.name}
              </Badge>
            ))}
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Benefits:</strong> Official WhatsApp Business API access, no QR limitations, advanced automation, 
            message templates, analytics, and dedicated support from certified providers.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}