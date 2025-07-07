import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Upload, RefreshCw, AlertCircle } from "lucide-react";
import type { ContactGroup } from "@shared/schema";

interface DailyUploadSchedulerProps {
  onScheduleCreated?: () => void;
}

interface UploadSchedule {
  id: number;
  name: string;
  targetGroupId: number;
  uploadTime: string; // HH:MM format
  maxContactsPerDay: number;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  totalUploaded: number;
}

export default function DailyUploadScheduler({ onScheduleCreated }: DailyUploadSchedulerProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [uploadTime, setUploadTime] = useState("09:00");
  const [maxContactsPerDay, setMaxContactsPerDay] = useState(50);
  const [enabled, setEnabled] = useState(true);

  // Mock schedules for demonstration - in a real app, this would come from the backend
  const [schedules, setSchedules] = useState<UploadSchedule[]>([
    {
      id: 1,
      name: "Daily Marketing Leads",
      targetGroupId: 1,
      uploadTime: "09:00",
      maxContactsPerDay: 100,
      enabled: true,
      lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      nextRun: new Date(Date.now() + 6 * 60 * 60 * 1000), // In 6 hours
      totalUploaded: 450,
    },
    {
      id: 2,
      name: "Weekend Promotions",
      targetGroupId: 2,
      uploadTime: "10:30",
      maxContactsPerDay: 75,
      enabled: false,
      lastRun: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      totalUploaded: 225,
    }
  ]);

  // Fetch contact groups
  const { data: groups = [] } = useQuery({
    queryKey: ["/api/contact-groups"],
  });

  const resetForm = () => {
    setScheduleName("");
    setSelectedGroupId("");
    setUploadTime("09:00");
    setMaxContactsPerDay(50);
    setEnabled(true);
    setShowDialog(false);
  };

  const handleSubmit = () => {
    if (!scheduleName.trim()) {
      toast({
        title: "Error",
        description: "Schedule name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedGroupId) {
      toast({
        title: "Error",
        description: "Please select a target group.",
        variant: "destructive",
      });
      return;
    }

    if (maxContactsPerDay < 1 || maxContactsPerDay > 1000) {
      toast({
        title: "Error",
        description: "Max contacts per day must be between 1 and 1000.",
        variant: "destructive",
      });
      return;
    }

    // Create new schedule
    const newSchedule: UploadSchedule = {
      id: schedules.length + 1,
      name: scheduleName.trim(),
      targetGroupId: parseInt(selectedGroupId),
      uploadTime,
      maxContactsPerDay,
      enabled,
      totalUploaded: 0,
    };

    setSchedules(prev => [...prev, newSchedule]);

    toast({
      title: "Schedule created",
      description: `Daily upload schedule "${scheduleName}" has been created.`,
    });

    resetForm();
    onScheduleCreated?.();
  };

  const toggleSchedule = (id: number, enabled: boolean) => {
    setSchedules(prev => 
      prev.map(schedule => 
        schedule.id === id ? { ...schedule, enabled } : schedule
      )
    );

    toast({
      title: enabled ? "Schedule enabled" : "Schedule disabled",
      description: `Upload schedule has been ${enabled ? 'enabled' : 'disabled'}.`,
    });
  };

  const deleteSchedule = (id: number) => {
    if (confirm("Are you sure you want to delete this upload schedule?")) {
      setSchedules(prev => prev.filter(schedule => schedule.id !== id));
      toast({
        title: "Schedule deleted",
        description: "Upload schedule has been deleted.",
      });
    }
  };

  const getGroupName = (groupId: number) => {
    const group = groups.find((g: ContactGroup) => g.id === groupId);
    return group?.name || "Unknown Group";
  };

  const formatNextRun = (nextRun?: Date) => {
    if (!nextRun) return "Not scheduled";
    
    const now = new Date();
    const diffHours = Math.floor((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `In ${diffHours}h`;
    } else {
      return `In ${Math.floor(diffHours / 24)}d`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Daily Upload Scheduler</h3>
          <p className="text-sm text-gray-600">Automate daily contact uploads to specific groups</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Create Daily Upload Schedule
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="scheduleName">Schedule Name</Label>
                <Input
                  id="scheduleName"
                  placeholder="e.g., Daily Marketing Leads"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="targetGroup">Target Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group to upload contacts to" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group: ContactGroup) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: group.color || "#3B82F6" }}
                          />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uploadTime">Upload Time</Label>
                  <Input
                    id="uploadTime"
                    type="time"
                    value={uploadTime}
                    onChange={(e) => setUploadTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxContacts">Max Contacts per Day</Label>
                  <Input
                    id="maxContacts"
                    type="number"
                    min="1"
                    max="1000"
                    value={maxContactsPerDay}
                    onChange={(e) => setMaxContactsPerDay(parseInt(e.target.value) || 50)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={(checked) => setEnabled(checked as boolean)}
                />
                <Label htmlFor="enabled">Enable schedule immediately</Label>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How it works:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• System automatically checks for new contacts at the specified time</li>
                      <li>• Uploads up to the daily limit of contacts to the selected group</li>
                      <li>• Contacts are sourced from your default upload queue or CSV files</li>
                      <li>• You can pause/resume schedules at any time</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  Create Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No upload schedules yet</p>
              <p className="text-sm text-gray-400">Create your first automated upload schedule</p>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{schedule.name}</h4>
                      {schedule.enabled ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-gray-400 text-gray-600">
                          Paused
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Target Group:</span>
                        <br />
                        {getGroupName(schedule.targetGroupId)}
                      </div>
                      <div>
                        <span className="font-medium">Upload Time:</span>
                        <br />
                        {schedule.uploadTime}
                      </div>
                      <div>
                        <span className="font-medium">Daily Limit:</span>
                        <br />
                        {schedule.maxContactsPerDay} contacts
                      </div>
                      <div>
                        <span className="font-medium">Next Run:</span>
                        <br />
                        {formatNextRun(schedule.nextRun)}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Total uploaded: {schedule.totalUploaded} contacts
                      {schedule.lastRun && (
                        <span className="ml-4">
                          Last run: {schedule.lastRun.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSchedule(schedule.id, !schedule.enabled)}
                    >
                      {schedule.enabled ? <RefreshCw className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSchedule(schedule.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}