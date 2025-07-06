import { useState, useEffect } from "react";
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
import QRCode from "qrcode";

export default function QRCodeSetup() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
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
      setQrCodeUrl("");
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

  const handleGenerateQR = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number before generating QR code.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Generate QR code for WhatsApp Web connection
      // This would typically contain a session token or connection string
      const qrData = `whatsapp-web-connect:${phoneNumber}:${Date.now()}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrCodeDataUrl);
      setQrCodeGenerated(true);
      toast({
        title: "QR Code generated",
        description: "Scan the QR code with your WhatsApp to connect.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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
      lastActivity: new Date(),
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
            ) : qrCodeGenerated && qrCodeUrl ? (
              <div className="text-center">
                <img 
                  src={qrCodeUrl} 
                  alt="WhatsApp QR Code" 
                  className="w-40 h-40 mx-auto mb-2 rounded"
                />
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
              <Button variant="outline" onClick={() => {
                setQrCodeGenerated(false);
                setQrCodeUrl("");
              }} size="sm">
                Generate New QR
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
