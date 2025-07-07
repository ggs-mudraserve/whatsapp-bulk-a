import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Edit, 
  Copy, 
  Trash2, 
  FileText, 
  Search, 
  Filter, 
  MoreVertical,
  Eye,
  Share,
  Activity,
  Clock,
  Globe,
  Tag,
  Variable
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdvancedTemplateForm from "./advanced-template-form";

interface TemplateGridProps {
  templates: any[];
  loading: boolean;
}

const TEMPLATE_CATEGORIES = [
  { value: "all", label: "All Categories", color: "bg-gray-100 text-gray-800" },
  { value: "promotional", label: "🎯 Promotional", color: "bg-red-100 text-red-800" },
  { value: "follow-up", label: "📞 Follow-up", color: "bg-blue-100 text-blue-800" },
  { value: "newsletter", label: "📰 Newsletter", color: "bg-green-100 text-green-800" },
  { value: "events", label: "📅 Events", color: "bg-purple-100 text-purple-800" },
  { value: "sales", label: "💰 Sales", color: "bg-yellow-100 text-yellow-800" },
  { value: "support", label: "🛠️ Support", color: "bg-gray-100 text-gray-800" },
];

const LANGUAGES = [
  { value: "all", label: "All Languages" },
  { value: "en", label: "🇺🇸 English" },
  { value: "hi", label: "🇮🇳 Hindi" },
  { value: "es", label: "🇪🇸 Spanish" },
  { value: "fr", label: "🇫🇷 French" },
  { value: "de", label: "🇩🇪 German" },
];

export default function AdvancedTemplateGrid({ templates, loading }: TemplateGridProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.tags || []).some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    const matchesLanguage = languageFilter === "all" || template.language === languageFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && template.isActive) ||
                         (statusFilter === "inactive" && !template.isActive);

    return matchesSearch && matchesCategory && matchesLanguage && matchesStatus;
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      // Trigger global cross-page refresh for all sections
      localStorage.setItem('global_data_updated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('global_refresh', { detail: { section: 'templates' } }));
      window.dispatchEvent(new CustomEvent('refresh_templates'));
      
      toast({
        title: "Template deleted",
        description: "Template has been deleted successfully.",
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
        description: "Failed to delete template.",
        variant: "destructive",
      });
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const duplicateData = {
        ...template,
        name: `${template.name} (Copy)`,
        usageCount: 0,
        lastUsed: null,
      };
      delete duplicateData.id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;
      
      await apiRequest("POST", "/api/templates", duplicateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      // Trigger global cross-page refresh for all sections
      localStorage.setItem('global_data_updated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('global_refresh', { detail: { section: 'templates' } }));
      window.dispatchEvent(new CustomEvent('refresh_templates'));
      
      toast({
        title: "Template duplicated",
        description: "Template has been duplicated successfully.",
      });
    },
  });

  const handleDelete = (template: any) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const handleDuplicate = (template: any) => {
    duplicateTemplateMutation.mutate(template);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryInfo = (category: string) => {
    return TEMPLATE_CATEGORIES.find(cat => cat.value === category) || TEMPLATE_CATEGORIES[0];
  };

  const getLanguageInfo = (language: string) => {
    return LANGUAGES.find(lang => lang.value === language) || { value: language, label: language };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates by name, content, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[140px]">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <Activity className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600">
              {searchTerm || categoryFilter !== "all" || languageFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters to see more templates."
                : "Create your first template to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const categoryInfo = getCategoryInfo(template.category);
            const languageInfo = getLanguageInfo(template.language || 'en');
            
            return (
              <Card key={template.id} className={`hover:shadow-lg transition-shadow ${!template.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" title={template.name}>
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={categoryInfo.color} variant="secondary">
                          {categoryInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {languageInfo.label}
                        </Badge>
                        {!template.isActive && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(template)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Content Preview */}
                  <div className="text-sm text-gray-600 line-clamp-3">
                    {template.content}
                  </div>

                  {/* Variables */}
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((variable: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Variable className="h-3 w-3 mr-1" />
                          {variable}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 2).map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tags.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* CTA Buttons */}
                  {template.ctaButtons && template.ctaButtons.length > 0 && (
                    <div className="text-xs text-gray-500">
                      🔘 {template.ctaButtons.length} CTA button{template.ctaButtons.length > 1 ? 's' : ''}
                    </div>
                  )}

                  {/* Meta Information */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {template.usageCount || 0} uses
                      </div>
                      {template.estimatedReadTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.estimatedReadTime}s
                        </div>
                      )}
                    </div>
                    <div>
                      {template.lastUsed ? formatDate(template.lastUsed) : formatDate(template.createdAt)}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <AdvancedTemplateForm
              template={editingTemplate}
              isEdit={true}
              onSuccess={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getCategoryInfo(previewTemplate.category).color}>
                  {getCategoryInfo(previewTemplate.category).label}
                </Badge>
                <Badge variant="outline">
                  {getLanguageInfo(previewTemplate.language || 'en').label}
                </Badge>
                {!previewTemplate.isActive && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    Inactive
                  </Badge>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="whitespace-pre-wrap">{previewTemplate.content}</div>
              </div>

              {previewTemplate.ctaButtons && previewTemplate.ctaButtons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">CTA Buttons:</h4>
                  <div className="space-y-2">
                    {previewTemplate.ctaButtons.map((button: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          {button.text}
                        </Button>
                        <Badge variant="outline">{button.type}</Badge>
                        {button.url && <span className="text-xs text-gray-500">{button.url}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Variables:</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.variables.map((variable: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        <Variable className="h-3 w-3 mr-1" />
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {previewTemplate.tags && previewTemplate.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500 border-t pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>Usage Count: {previewTemplate.usageCount || 0}</div>
                  <div>Read Time: ~{previewTemplate.estimatedReadTime || 0}s</div>
                  <div>Created: {formatDate(previewTemplate.createdAt)}</div>
                  <div>Last Used: {previewTemplate.lastUsed ? formatDate(previewTemplate.lastUsed) : 'Never'}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}