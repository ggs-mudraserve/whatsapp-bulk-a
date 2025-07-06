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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Phone, MessageSquare, Shield } from "lucide-react";

const manualNumberSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  displayName: z.string().min(1, "Display name is required"),
  accountType: z.enum(["personal", "business"]),
  dailyMessageLimit: z.number().min(100, "Minimum 100 messages per day").max(10000, "Maximum 10000 messages per day"),
});

const otpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

type ManualNumberFormData = z.infer<typeof manualNumberSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function ManualNumberSetup() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [pendingData, setPendingData] = useState<ManualNumberFormData | null>(null);

  const form = useForm<ManualNumberFormData>({
    resolver: zodResolver(manualNumberSchema),
    defaultValues: {
      phoneNumber: "",
      displayName: "",
      accountType: "personal",
      dailyMessageLimit: 1000,
    },
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const addNumberMutation = useMutation({
    mutationFn: async (data: ManualNumberFormData) => {
      return await apiRequest('/api/whatsapp/connect-direct', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/numbers'] });
      toast({
        title: "Number Connected",
        description: "WhatsApp number connected successfully via direct method",
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
        description: "Failed to connect WhatsApp number",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ManualNumberFormData) => {
    setPendingData(data);
    addNumberMutation.mutate(data);
  };

  const resetForm = () => {
    setStep('form');
    setPendingData(null);
    form.reset();
    setIsOpen(false);
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Manual Number Setup
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add WhatsApp numbers manually if you already have them connected elsewhere
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Number Manually
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {step === 'form' && 'Add WhatsApp Number'}
                {step === 'otp' && 'Verify Your Number'}
                {step === 'success' && 'Number Added Successfully'}
              </DialogTitle>
            </DialogHeader>

            {step === 'form' && (
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
                          <Input placeholder="My Business Number" {...field} />
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
                              <SelectValue />
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
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={sendOTPMutation.isPending}>
                    {sendOTPMutation.isPending ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </form>
              </Form>
            )}

            {step === 'otp' && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <MessageSquare className="w-12 h-12 mx-auto text-green-500" />
                  <p className="text-sm text-muted-foreground">
                    We've sent a 6-digit verification code to {pendingData?.phoneNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check your WhatsApp messages and enter the code below
                  </p>
                </div>

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123456" 
                              maxLength={6}
                              className="text-center text-lg tracking-wider"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStep('form')}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        disabled={verifyOTPMutation.isPending}
                      >
                        {verifyOTPMutation.isPending ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center space-y-4">
                <Shield className="w-12 h-12 mx-auto text-green-500" />
                <div>
                  <h3 className="font-semibold">Number Added Successfully!</h3>
                  <p className="text-sm text-muted-foreground">
                    {pendingData?.phoneNumber} has been verified and added to your account.
                  </p>
                </div>
                <Button onClick={resetForm} className="w-full">
                  Add Another Number
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            You can add unlimited WhatsApp numbers to your account
          </p>
        </div>
      </CardContent>
    </Card>
  );
}