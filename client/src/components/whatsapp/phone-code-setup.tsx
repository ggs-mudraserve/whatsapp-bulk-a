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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  Phone, 
  Link, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Copy,
  ArrowRight,
  Clock
} from "lucide-react";

const phoneNumberSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  displayName: z.string().min(1, "Display name is required"),
});

const linkingCodeSchema = z.object({
  code: z.string().min(6, "Code must be at least 6 characters").max(8, "Code must be at most 8 characters"),
});

type PhoneNumberFormData = z.infer<typeof phoneNumberSchema>;
type LinkingCodeFormData = z.infer<typeof linkingCodeSchema>;

export default function PhoneCodeSetup() {
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
  const [linkingCode, setLinkingCode] = useState<string>('');
  const [pendingData, setPendingData] = useState<PhoneNumberFormData | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  const phoneForm = useForm<PhoneNumberFormData>({
    resolver: zodResolver(phoneNumberSchema),
    defaultValues: {
      phoneNumber: "",
      displayName: "",
    },
  });

  const codeForm = useForm<LinkingCodeFormData>({
    resolver: zodResolver(linkingCodeSchema),
    defaultValues: { code: "" },
  });

  // Generate linking code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async (data: PhoneNumberFormData) => {
      return await apiRequest('POST', '/api/whatsapp/generate-link-code', data);
    },
    onSuccess: async (response: Response) => {
      const data = await response.json();
      setLinkingCode(data.code);
      setStep('code');
      setTimeLeft(300); // Reset timer
      
      // Start countdown timer
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast({
        title: "Linking Code Generated",
        description: "Use this code to link your WhatsApp account",
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
        description: "Failed to generate linking code",
        variant: "destructive",
      });
    },
  });

  // Verify linking code mutation
  const verifyCodeMutation = useMutation({
    mutationFn: async (data: LinkingCodeFormData) => {
      if (!pendingData) throw new Error("No pending data");
      
      return await apiRequest('POST', '/api/whatsapp/verify-link-code', {
        code: data.code,
        phoneNumber: pendingData.phoneNumber,
        displayName: pendingData.displayName,
      });
    },
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/numbers'] });
      toast({
        title: "WhatsApp Linked Successfully",
        description: "Your WhatsApp account has been connected",
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
        description: "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onPhoneSubmit = (data: PhoneNumberFormData) => {
    setPendingData(data);
    generateCodeMutation.mutate(data);
  };

  const onCodeSubmit = (data: LinkingCodeFormData) => {
    verifyCodeMutation.mutate(data);
  };

  const resetForm = () => {
    setStep('phone');
    setPendingData(null);
    setLinkingCode('');
    setTimeLeft(300);
    phoneForm.reset();
    codeForm.reset();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(linkingCode);
    toast({
      title: "Code Copied",
      description: "Linking code copied to clipboard",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const regenerateCode = () => {
    if (pendingData) {
      generateCodeMutation.mutate(pendingData);
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Phone Code Linking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Link your WhatsApp account using a secure code on your phone
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'phone' && (
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
              <FormField
                control={phoneForm.control}
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
                control={phoneForm.control}
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

              <Button 
                type="submit" 
                className="w-full"
                disabled={generateCodeMutation.isPending}
              >
                {generateCodeMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating Code...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Generate Linking Code
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {step === 'code' && (
          <div className="space-y-6">
            {/* Linking Code Display */}
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-xl font-normal text-gray-800 mb-2">Enter code on phone</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Linking WhatsApp account <span className="text-blue-600 font-medium">{pendingData?.phoneNumber}</span>
                  <button 
                    className="text-blue-600 ml-1 text-sm hover:underline"
                    onClick={() => setStep('phone')}
                  >
                    (edit)
                  </button>
                </p>
              </div>
              
              {/* Code Display - Individual Character Boxes like WhatsApp Web */}
              <div className="bg-white rounded-lg p-8">
                <div className="flex justify-center gap-2 mb-6">
                  {linkingCode.split('').map((char, index) => (
                    <div
                      key={index}
                      className="w-14 h-14 bg-gray-50 border-2 border-gray-200 rounded-lg flex items-center justify-center text-2xl font-semibold text-gray-800 hover:border-gray-300 transition-colors"
                    >
                      {char}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Code expires in {formatTime(timeLeft)}</span>
                </div>
                
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={regenerateCode} disabled={generateCodeMutation.isPending}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Code
                  </Button>
                </div>
              </div>

              {timeLeft > 0 && (
                <Button variant="outline" onClick={regenerateCode} disabled={generateCodeMutation.isPending}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Code
                </Button>
              )}
            </div>

            <Separator />

            {/* Instructions - WhatsApp Web Style */}
            <div className="space-y-4 text-left">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Open WhatsApp <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 rounded text-white text-xs font-bold ml-1">W</span> on your phone
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      On Android tap Menu <span className="font-mono text-xs">⋮</span> • On iPhone tap Settings <span className="font-mono text-xs">⚙️</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">Tap Linked devices, then Link device</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center text-sm font-medium">4</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">Tap Link with phone number instead and enter this code on your phone</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">5</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Enter the code: <span className="font-mono text-green-600">{linkingCode}</span></p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <button 
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => setStep('phone')}
                >
                  Log in with QR code →
                </button>
              </div>
            </div>

            <Separator />

            {/* Verification Form */}
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
                <FormField
                  control={codeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Code Entry</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter the code you used on your phone" 
                          {...field} 
                          className="text-center font-mono text-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={verifyCodeMutation.isPending || timeLeft === 0}
                  >
                    {verifyCodeMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Verify & Connect
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">WhatsApp Connected!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your WhatsApp account has been successfully linked to your marketing dashboard.
              </p>
            </div>
            <Button onClick={resetForm} className="w-full">
              <ArrowRight className="w-4 h-4 mr-2" />
              Connect Another Number
            </Button>
          </div>
        )}

        {/* Features */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900 text-sm">Why use phone code linking?</h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>More secure than QR codes</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>Works on any device</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>No camera required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>Easy to share remotely</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}