import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Copy, Trash2, FileText } from "lucide-react";

interface TemplateGridProps {
  templates: any[];
  loading: boolean;
}

export default function TemplateGrid({ templates, loading }: TemplateGridProps) {
  const { toast } = useToast();

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
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

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleCopy = (template: any) => {
    navigator.clipboard.writeText(template.content);
    toast({
      title: "Template copied",
      description: "Template content has been copied to clipboard.",
    });
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, any> = {
      promotional: "default",
      "follow-up": "secondary",
      newsletter: "outline",
      events: "destructive",
    };
    return <Badge variant={variants[category] || "default"}>{category}</Badge>;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      promotional: "border-blue-200",
      "follow-up": "border-green-200",
      newsletter: "border-purple-200",
      events: "border-yellow-200",
    };
    return colors[category] || "border-gray-200";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gray-200 h-6 w-20 rounded-full"></div>
                <div className="flex space-x-2">
                  <div className="bg-gray-200 h-8 w-8 rounded"></div>
                  <div className="bg-gray-200 h-8 w-8 rounded"></div>
                  <div className="bg-gray-200 h-8 w-8 rounded"></div>
                </div>
              </div>
              <div className="bg-gray-200 h-6 w-3/4 rounded mb-2"></div>
              <div className="bg-gray-200 h-20 w-full rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <div className="bg-gray-200 h-4 w-24 rounded"></div>
                <div className="bg-gray-200 h-4 w-20 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-500 text-center">
            Create your first message template to get started with campaigns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template: any) => (
        <Card key={template.id} className={`${getCategoryColor(template.category)} border-2`}>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              {getCategoryBadge(template.category)}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => handleCopy(template)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">{template.name}</h4>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-wrap">
                {template.content}
              </p>
              {template.ctaButtons && template.ctaButtons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.ctaButtons.map((button: any, index: number) => (
                    <Button key={index} size="sm" variant="outline" className="text-xs">
                      {button.text}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Used in {template.usageCount || 0} campaigns</span>
              <span>{new Date(template.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
