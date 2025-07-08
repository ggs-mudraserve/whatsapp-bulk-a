import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2 } from "lucide-react";

export default function Login() {
  const [isLogging, setIsLogging] = useState(false);

  const handleLogin = async () => {
    setIsLogging(true);
    // In development, just redirect to the login endpoint
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
              SendWo Pro
            </CardTitle>
            <p className="text-gray-600 mt-2">Sign in to your WhatsApp Marketing Dashboard</p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="developer@example.com"
                defaultValue="developer@example.com"
                disabled
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                defaultValue="password"
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>

          <Button 
            onClick={handleLogin} 
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg shadow-lg"
            disabled={isLogging}
          >
            {isLogging ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </Button>

          <div className="text-center text-sm text-gray-500">
            <p>Development Mode - Demo Credentials</p>
            <p className="mt-1">Click "Sign In" to access the dashboard</p>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a href="/landing" className="text-green-600 hover:text-green-700 underline">
                View Marketing Page
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 