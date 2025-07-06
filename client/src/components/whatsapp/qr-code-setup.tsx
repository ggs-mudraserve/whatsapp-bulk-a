import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, RefreshCw } from "lucide-react";

export default function QRCodeSetup() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState("personal");

  const connectNumberMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/whatsapp-numbers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-numbers"] });
      toast({
        title: "Number connected",
        description: "WhatsApp number has been connected successfully.",
      });
      setPhoneNumber("");
      setDisplayName("");
      setQrCodeGenerated(false);
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
        description: "Failed to connect WhatsApp number.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateQR = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number before generating QR code.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    // Simulate QR code generation
    setTimeout(() => {
      setIsGenerating(false);
      setQrCodeGenerated(true);
      toast({
        title: "QR Code generated",
        description: "Scan the QR code with your WhatsApp to connect.",
      });
    }, 2000);
  };

  const handleConnectNumber = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number.",
        variant: "destructive",
      });
      return;
    }

    connectNumberMutation.mutate({
      phoneNumber,
      displayName: displayName || null,
      accountType,
      status: "active",
      dailyMessageLimit: 100,
      messagesSentToday: 0,
      successRate: "100.00",
      lastActivity: new Date().toISOString(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect New Number</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="displayName">Display Name (Optional)</Label>
          <Input
            id="displayName"
            placeholder="Business Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="accountType">Account Type</Label>
          <Select value={accountType} onValueChange={setAccountType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-center">
          <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            {isGenerating ? (
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 mb-2 animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Generating QR Code...</p>
              </div>
            ) : qrCodeGenerated ? (
              <div className="text-center">
                <div className="w-32 h-32 bg-black mx-auto mb-2 rounded" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='black'/%3E%3Crect x='10' y='10' width='10' height='10' fill='white'/%3E%3Crect x='30' y='10' width='10' height='10' fill='white'/%3E%3Crect x='50' y='10' width='10' height='10' fill='white'/%3E%3Crect x='70' y='10' width='10' height='10' fill='white'/%3E%3Crect x='10' y='30' width='10' height='10' fill='white'/%3E%3Crect x='30' y='30' width='10' height='10' fill='white'/%3E%3Crect x='50' y='30' width='10' height='10' fill='white'/%3E%3Crect x='70' y='30' width='10' height='10' fill='white'/%3E%3C/svg%3E")`,
                  backgroundSize: 'cover'
                }}></div>
                <p className="text-sm text-gray-600">Scan with WhatsApp</p>
              </div>
            ) : (
              <div className="text-center">
                <QrCode className="w-12 h-12 text-gray-400 mb-2 mx-auto" />
                <p className="text-sm text-gray-500">QR Code will appear here</p>
              </div>
            )}
          </div>
          
          {!qrCodeGenerated ? (
            <Button onClick={handleGenerateQR} disabled={isGenerating}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate QR Code
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with your WhatsApp to connect
              </p>
              <Button onClick={handleConnectNumber} disabled={connectNumberMutation.isPending}>
                {connectNumberMutation.isPending ? "Connecting..." : "Confirm Connection"}
              </Button>
              <br />
              <Button variant="outline" onClick={() => setQrCodeGenerated(false)} size="sm">
                Generate New QR
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
