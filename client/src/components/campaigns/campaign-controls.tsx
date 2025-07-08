import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Pause, Square, MoreHorizontal, Clock, CheckCircle, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Campaign } from "../../../../shared/types";

interface CampaignControlsProps {
  campaign: Campaign;
}

export default function CampaignControls({ campaign }: CampaignControlsProps) {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/campaigns/${campaign.id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign started",
        description: `Campaign "${campaign.name}" is now running.`,
      });
      setIsExecuting(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start campaign.",
        variant: "destructive",
      });
    },
  });

  // Pause campaign mutation
  const pauseCampaignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/campaigns/${campaign.id}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign paused",
        description: `Campaign "${campaign.name}" has been paused.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to pause campaign.",
        variant: "destructive",
      });
    },
  });

  // Stop campaign mutation
  const stopCampaignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/campaigns/${campaign.id}/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign stopped",
        description: `Campaign "${campaign.name}" has been stopped.`,
      });
      setIsExecuting(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stop campaign.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case 'active':
        return <Badge variant="outline" className="border-green-500 text-green-600"><Play className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paused':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-purple-500 text-purple-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-red-500 text-red-600"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{campaign.status}</Badge>;
    }
  };

  const canStart = campaign.status === 'draft' || campaign.status === 'scheduled';
  const canPause = campaign.status === 'active';
  const canStop = campaign.status === 'active' || campaign.status === 'paused';

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge()}
      
      <div className="flex items-center gap-1">
        {/* Start Button */}
        {canStart && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={startCampaignMutation.isPending}
              >
                <Play className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start Campaign</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to start the campaign "{campaign.name}"? 
                  This will begin sending messages to all targeted contacts.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => startCampaignMutation.mutate()}
                  disabled={startCampaignMutation.isPending}
                >
                  {startCampaignMutation.isPending ? "Starting..." : "Start Campaign"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Pause Button */}
        {canPause && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseCampaignMutation.mutate()}
            disabled={pauseCampaignMutation.isPending}
          >
            <Pause className="w-4 h-4" />
          </Button>
        )}

        {/* Stop Button */}
        {canStop && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={stopCampaignMutation.isPending}
              >
                <Square className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Stop Campaign</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to stop the campaign "{campaign.name}"? 
                  This action cannot be undone and the campaign will be marked as cancelled.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => stopCampaignMutation.mutate()}
                  disabled={stopCampaignMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {stopCampaignMutation.isPending ? "Stopping..." : "Stop Campaign"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              Duplicate Campaign
            </DropdownMenuItem>
            <DropdownMenuItem>
              Download Report
            </DropdownMenuItem>
            {campaign.status === 'draft' && (
              <DropdownMenuItem className="text-red-600">
                Delete Campaign
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}