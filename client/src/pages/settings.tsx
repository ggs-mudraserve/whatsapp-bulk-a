import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [antiBlockingSettings, setAntiBlockingSettings] = useState({
    enableMessageDelays: true,
    enableTypingSimulation: true,
    enableAutoRotation: false,
    messageDelayMin: 2,
    messageDelayMax: 8,
    dailyMessageLimit: 100,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/anti-blocking-settings"],
    retry: false,
  });

  useEffect(() => {
    if (settings) {
      setAntiBlockingSettings(settings);
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/anti-blocking-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anti-blocking-settings"] });
      toast({
        title: "Settings saved",
        description: "Your anti-blocking settings have been updated.",
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
        description: "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(antiBlockingSettings);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Settings" 
          subtitle="Configure your account and messaging preferences"
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Anti-Blocking Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Anti-Blocking Protection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-800">Enable Message Delays</Label>
                    <p className="text-xs text-gray-500">Add random delays between messages</p>
                  </div>
                  <Switch
                    checked={antiBlockingSettings.enableMessageDelays}
                    onCheckedChange={(checked) => 
                      setAntiBlockingSettings(prev => ({ ...prev, enableMessageDelays: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-800">Typing Simulation</Label>
                    <p className="text-xs text-gray-500">Simulate human typing behavior</p>
                  </div>
                  <Switch
                    checked={antiBlockingSettings.enableTypingSimulation}
                    onCheckedChange={(checked) => 
                      setAntiBlockingSettings(prev => ({ ...prev, enableTypingSimulation: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-800">Auto Number Rotation</Label>
                    <p className="text-xs text-gray-500">Automatically rotate between numbers</p>
                  </div>
                  <Switch
                    checked={antiBlockingSettings.enableAutoRotation}
                    onCheckedChange={(checked) => 
                      setAntiBlockingSettings(prev => ({ ...prev, enableAutoRotation: checked }))
                    }
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-800 mb-2">
                    Message Delay Range (seconds)
                  </Label>
                  <div className="flex items-center space-x-3">
                    <Input
                      type="number"
                      value={antiBlockingSettings.messageDelayMin}
                      onChange={(e) => setAntiBlockingSettings(prev => ({ 
                        ...prev, 
                        messageDelayMin: parseInt(e.target.value) || 1 
                      }))}
                      min="1"
                      max="60"
                      className="w-20"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="number"
                      value={antiBlockingSettings.messageDelayMax}
                      onChange={(e) => setAntiBlockingSettings(prev => ({ 
                        ...prev, 
                        messageDelayMax: parseInt(e.target.value) || 1 
                      }))}
                      min="1"
                      max="60"
                      className="w-20"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-800 mb-2">
                    Daily Message Limit per Number
                  </Label>
                  <Input
                    type="number"
                    value={antiBlockingSettings.dailyMessageLimit}
                    onChange={(e) => setAntiBlockingSettings(prev => ({ 
                      ...prev, 
                      dailyMessageLimit: parseInt(e.target.value) || 1 
                    }))}
                    min="1"
                    max="1000"
                    className="w-24"
                  />
                </div>

                <Button 
                  onClick={handleSaveSettings}
                  disabled={saveSettingsMutation.isPending}
                  className="w-full"
                >
                  {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-800 mb-2">Full Name</Label>
                  <Input
                    type="text"
                    value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-800 mb-2">Email Address</Label>
                  <Input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-800 mb-2">Time Zone</Label>
                  <Select value={user?.timeZone || 'America/New_York'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-800">Email Notifications</Label>
                    <p className="text-xs text-gray-500">Receive campaign updates via email</p>
                  </div>
                  <Switch
                    checked={user?.emailNotifications ?? true}
                    disabled
                  />
                </div>
                
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full"
                >
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-800">Delete All Campaign Data</p>
                  <p className="text-xs text-red-600">
                    This will permanently delete all your campaigns and cannot be undone
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Data
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-800">Close Account</p>
                  <p className="text-xs text-red-600">
                    This will permanently close your account and delete all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Close Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
