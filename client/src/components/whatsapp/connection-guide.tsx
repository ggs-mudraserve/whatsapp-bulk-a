import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  QrCode, 
  Wifi, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  MessageSquare
} from "lucide-react";

export default function ConnectionGuide() {
  const [currentStep, setCurrentStep] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const steps = [
    {
      id: 1,
      title: "Prepare Your Phone",
      description: "Make sure your phone is ready for WhatsApp connection",
      icon: <Smartphone className="w-5 h-5" />,
      details: [
        "Ensure your phone has WhatsApp installed and working",
        "Make sure you have a stable internet connection",
        "Close any other WhatsApp Web sessions in your browser",
        "Have your phone ready to scan QR code"
      ]
    },
    {
      id: 2,
      title: "Generate QR Code",
      description: "Create a fresh QR code for connection",
      icon: <QrCode className="w-5 h-5" />,
      details: [
        "Click 'Start Connection' to generate a QR code",
        "The QR code will appear within 10-15 seconds",
        "QR codes expire after 60 seconds for security",
        "You can regenerate if needed"
      ]
    },
    {
      id: 3,
      title: "Scan with WhatsApp",
      description: "Use your phone to scan the QR code",
      icon: <Wifi className="w-5 h-5" />,
      details: [
        "Open WhatsApp on your phone",
        "Go to Settings > Linked Devices",
        "Tap 'Link a Device'",
        "Scan the QR code shown on screen"
      ]
    },
    {
      id: 4,
      title: "Connection Complete",
      description: "Your WhatsApp is now connected",
      icon: <CheckCircle className="w-5 h-5" />,
      details: [
        "You'll see a success message when connected",
        "Your phone number will be displayed",
        "You can now send and receive messages",
        "The connection stays active until you log out"
      ]
    }
  ];

  const troubleshootingTips = [
    {
      problem: "QR Code doesn't appear",
      solutions: [
        "Wait 30 seconds and try again",
        "Check your internet connection",
        "Clear browser cache and reload page",
        "Try using a different browser"
      ]
    },
    {
      problem: "Phone can't scan QR code",
      solutions: [
        "Make sure your phone camera is working",
        "Ensure good lighting conditions",
        "Hold phone steady and close to screen",
        "Try refreshing the QR code"
      ]
    },
    {
      problem: "Connection keeps failing",
      solutions: [
        "Wait 15 minutes before trying again",
        "Log out from other WhatsApp Web sessions",
        "Restart your phone's WhatsApp app",
        "Check if your WhatsApp account is restricted"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Connect Your WhatsApp</h2>
        <p className="text-gray-600">
          Follow these simple steps to connect your WhatsApp account
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
              <span className="font-medium">
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus === 'connected' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Connection Steps</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= step.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {step.icon}
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  
                  {currentStep === step.id && (
                    <div className="mt-3 space-y-2">
                      {step.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button 
          onClick={() => setCurrentStep(Math.min(currentStep + 1, 4))}
          className="flex-1"
          disabled={currentStep === 4}
        >
          {currentStep === 1 ? 'Start Connection' : 
           currentStep === 4 ? 'Connected' : 'Next Step'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(1)}
          disabled={currentStep === 1}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Restart
        </Button>
      </div>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span>Troubleshooting</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {troubleshootingTips.map((tip, index) => (
            <Alert key={index}>
              <AlertDescription>
                <div className="space-y-2">
                  <strong className="text-sm font-medium">{tip.problem}</strong>
                  <ul className="text-sm space-y-1 ml-4">
                    {tip.solutions.map((solution, idx) => (
                      <li key={idx} className="list-disc">{solution}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> WhatsApp limits the number of simultaneous connections. 
          If you're having trouble connecting, make sure to log out from other WhatsApp Web 
          sessions first. Wait 15 minutes between connection attempts to avoid rate limiting.
        </AlertDescription>
      </Alert>
    </div>
  );
}