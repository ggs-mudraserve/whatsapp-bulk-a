import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, Users, Plus, Upload } from "lucide-react";
import type { ContactGroup, Contact } from "../../../../shared/types";

interface ContactGroupsProps {
  contacts: Contact[];
  onGroupSelect?: (groupId: number | null) => void;
  selectedGroupId?: number | null;
}

const colorOptions = [
  { value: "#3B82F6", label: "Blue", class: "bg-blue-500" },
  { value: "#10B981", label: "Green", class: "bg-green-500" },
  { value: "#F59E0B", label: "Yellow", class: "bg-yellow-500" },
  { value: "#EF4444", label: "Red", class: "bg-red-500" },
  { value: "#8B5CF6", label: "Purple", class: "bg-purple-500" },
  { value: "#06B6D4", label: "Cyan", class: "bg-cyan-500" },
  { value: "#EC4899", label: "Pink", class: "bg-pink-500" },
  { value: "#84CC16", label: "Lime", class: "bg-lime-500" },
];

export default function ContactGroups({ contacts, onGroupSelect, selectedGroupId }: ContactGroupsProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupColor, setGroupColor] = useState("#3B82F6");

  // Fetch contact groups
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["/api/contact-groups"],
    refetchInterval: 5000,
  });

  // Count contacts per group
  const getContactCount = (groupId: number) => {
    return contacts.filter(contact => contact.groupId === groupId).length;
  };

  const getUngroupedCount = () => {
    return contacts.filter(contact => !contact.groupId).length;
  };

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string }) => {
      return await apiRequest("POST", "/api/contact-groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Group created",
        description: "Contact group has been created successfully.",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contact group.",
        variant: "destructive",
      });
    },
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ContactGroup> }) => {
      return await apiRequest("PATCH", `/api/contact-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
      toast({
        title: "Group updated",
        description: "Contact group has been updated successfully.",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact group.",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/contact-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Group deleted",
        description: "Contact group has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact group.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupColor("#3B82F6");
    setEditingGroup(null);
    setShowCreateDialog(false);
  };

  const handleSubmit = () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
      color: groupColor,
    };

    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const handleEdit = (group: ContactGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setGroupColor(group.color || "#3B82F6");
    setShowCreateDialog(true);
  };

  const handleDelete = (group: ContactGroup) => {
    if (confirm(`Are you sure you want to delete the group "${group.name}"? Contacts in this group will be ungrouped.`)) {
      deleteGroupMutation.mutate(group.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Contact Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Loading groups...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Contact Groups
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? "Edit Group" : "Create New Group"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="Enter group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="groupDescription">Description (Optional)</Label>
                  <Textarea
                    id="groupDescription"
                    placeholder="Enter group description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="groupColor">Color</Label>
                  <Select value={groupColor} onValueChange={setGroupColor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${color.class}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                  >
                    {editingGroup ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* All Contacts option */}
          <div
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedGroupId === null 
                ? "bg-blue-50 border-blue-200" 
                : "hover:bg-gray-50"
            }`}
            onClick={() => onGroupSelect?.(null)}
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="font-medium">All Contacts</span>
            </div>
            <Badge variant="outline">{contacts.length}</Badge>
          </div>

          {/* Ungrouped Contacts */}
          {getUngroupedCount() > 0 && (
            <div
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedGroupId === 0 
                  ? "bg-blue-50 border-blue-200" 
                  : "hover:bg-gray-50"
              }`}
              onClick={() => onGroupSelect?.(0)}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="font-medium">Ungrouped</span>
              </div>
              <Badge variant="outline">{getUngroupedCount()}</Badge>
            </div>
          )}

          {/* Contact Groups */}
          {groups.map((group: ContactGroup) => (
            <div
              key={group.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedGroupId === group.id 
                  ? "bg-blue-50 border-blue-200" 
                  : "hover:bg-gray-50"
              }`}
              onClick={() => onGroupSelect?.(group.id)}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: group.color || "#3B82F6" }}
                />
                <div>
                  <div className="font-medium">{group.name}</div>
                  {group.description && (
                    <div className="text-sm text-gray-500">{group.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{getContactCount(group.id)}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(group);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(group);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No contact groups yet</p>
              <p className="text-sm">Create your first group to organize contacts</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}