import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical,
  Archive,
  Star,
  StarOff,
  Trash2,
  Tag,
  Block,
  Forward,
  Copy,
  Info,
  Bell,
  BellOff
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ConversationActionsProps {
  conversationId: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  tags: string[];
  onClose?: () => void;
}

export function ConversationActions({ 
  conversationId, 
  isPinned, 
  isArchived, 
  isMuted, 
  tags,
  onClose 
}: ConversationActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pin/Unpin conversation
  const pinMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/conversations/${conversationId}/pin`, {
        method: 'PATCH',
        body: { isPinned: !isPinned },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: isPinned ? 'Conversation unpinned' : 'Conversation pinned',
      });
    },
  });

  // Archive/Unarchive conversation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/conversations/${conversationId}/archive`, {
        method: 'PATCH',
        body: { isArchived: !isArchived },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: isArchived ? 'Conversation unarchived' : 'Conversation archived',
      });
    },
  });

  // Mute/Unmute conversation
  const muteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/conversations/${conversationId}/mute`, {
        method: 'PATCH',
        body: { isMuted: !isMuted },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: isMuted ? 'Conversation unmuted' : 'Conversation muted',
      });
    },
  });

  // Delete conversation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: 'Conversation deleted',
        variant: 'destructive',
      });
      onClose?.();
    },
  });

  // Add tag
  const addTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      return apiRequest(`/api/conversations/${conversationId}/tags`, {
        method: 'POST',
        body: { tag },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setNewTag('');
      setShowTagDialog(false);
      toast({
        title: 'Tag added successfully',
      });
    },
  });

  // Remove tag
  const removeTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      return apiRequest(`/api/conversations/${conversationId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: 'Tag removed successfully',
      });
    },
  });

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      addTagMutation.mutate(newTag.trim());
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => pinMutation.mutate()}>
            {isPinned ? <StarOff className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
            {isPinned ? 'Unpin' : 'Pin'} conversation
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => archiveMutation.mutate()}>
            <Archive className="w-4 h-4 mr-2" />
            {isArchived ? 'Unarchive' : 'Archive'} conversation
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => muteMutation.mutate()}>
            {isMuted ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
            {isMuted ? 'Unmute' : 'Mute'} notifications
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Tag className="w-4 h-4 mr-2" />
                Manage tags
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Tags</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer">
                        {tag}
                        <button
                          onClick={() => removeTagMutation.mutate(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-sm text-gray-500">No tags assigned</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Add New Tag</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter tag name"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenuItem>
            <Forward className="w-4 h-4 mr-2" />
            Forward conversation
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Copy className="w-4 h-4 mr-2" />
            Copy conversation
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Block className="w-4 h-4 mr-2" />
            Block contact
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Info className="w-4 h-4 mr-2" />
            Conversation info
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}