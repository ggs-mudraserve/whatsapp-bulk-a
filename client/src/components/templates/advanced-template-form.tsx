import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Eye, EyeOff, Globe, Tag, Clock, Variable, Upload, Image, Video, FileText, Music } from "lucide-react";
import { insertTemplateSchema } from "@shared/schema";

const templateFormSchema = insertTemplateSchema.extend({
  name: z.string().min(1, "Template name is required").max(100, "Name too long"),
  category: z.string().min(1, "Category is required"),
  content: z.string().min(10, "Template content too short").max(4000, "Content too long"),
  language: z.string().optional(),
  isActive: z.boolean().optional(),
  mediaType: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaCaption: z.string().optional(),
}).omit({ variables: true, estimatedReadTime: true, lastUsed: true, usageCount: true });

type TemplateFormData = z.infer<typeof templateFormSchema>;
type CTAButton = { text: string; url?: string; type: 'url' | 'phone' | 'text' };

interface AdvancedTemplateFormProps {
  onSuccess: () => void;
  template?: any;
  isEdit?: boolean;
}

const TEMPLATE_CATEGORIES = [
  { value: "promotional", label: "🎯 Promotional", color: "bg-red-100 text-red-800" },
  { value: "follow-up", label: "📞 Follow-up", color: "bg-blue-100 text-blue-800" },
  { value: "newsletter", label: "📰 Newsletter", color: "bg-green-100 text-green-800" },
  { value: "events", label: "📅 Events", color: "bg-purple-100 text-purple-800" },
  { value: "sales", label: "💰 Sales", color: "bg-yellow-100 text-yellow-800" },
  { value: "support", label: "🛠️ Support", color: "bg-gray-100 text-gray-800" },
];

const LANGUAGES = [
  { value: "en", label: "🇺🇸 English" },
  { value: "hi", label: "🇮🇳 Hindi" },
  { value: "es", label: "🇪🇸 Spanish" },
  { value: "fr", label: "🇫🇷 French" },
  { value: "de", label: "🇩🇪 German" },
];

export default function AdvancedTemplateForm({ onSuccess, template, isEdit }: AdvancedTemplateFormProps) {
  const { toast } = useToast();
  const [ctaButtons, setCTAButtons] = useState<CTAButton[]>(template?.ctaButtons || []);
  const [newButton, setNewButton] = useState<CTAButton>({ text: "", type: "url" });
  const [tags, setTags] = useState<string[]>(template?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>(template?.mediaUrl || "");

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name || "",
      category: template?.category || "",
      content: template?.content || "",
      language: template?.language || "en",
      isActive: template?.isActive !== false,
      mediaType: template?.mediaType || "",
      mediaUrl: template?.mediaUrl || "",
      mediaCaption: template?.mediaCaption || "",
      ctaButtons: template?.ctaButtons || [],
      tags: template?.tags || [],
    },
  });

  const content = form.watch("content");

  // Auto-detect variables in content
  useEffect(() => {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const matches = content.match(variablePattern) || [];
    const variables = [...new Set(matches)];
    setDetectedVariables(variables);
  }, [content]);

  // Estimate read time (average 200 words per minute)
  const estimateReadTime = (text: string) => {
    const words = text.split(/\s+/).length;
    return Math.ceil((words / 200) * 60); // seconds
  };

  const mutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const payload = {
        ...data,
        ctaButtons,
        tags,
        variables: detectedVariables,
        estimatedReadTime: estimateReadTime(data.content),
        mediaUrl: mediaPreview,
      };

      if (isEdit && template?.id) {
        return await apiRequest("PUT", `/api/templates/${template.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/templates", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      // Trigger global cross-page refresh for all sections
      localStorage.setItem('global_data_updated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('global_refresh', { detail: { section: 'templates' } }));
      window.dispatchEvent(new CustomEvent('refresh_templates'));
      
      toast({
        title: isEdit ? "Template updated" : "Template created",
        description: `Template has been ${isEdit ? 'updated' : 'created'} successfully.`,
      });
      onSuccess();
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
        description: `Failed to ${isEdit ? 'update' : 'create'} template.`,
        variant: "destructive",
      });
    },
  });

  const addCTAButton = () => {
    if (newButton.text.trim()) {
      setCTAButtons([...ctaButtons, { ...newButton }]);
      setNewButton({ text: "", type: "url" });
    }
  };

  const removeCTAButton = (index: number) => {
    setCTAButtons(ctaButtons.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const insertVariable = (variable: string) => {
    const currentContent = form.getValues("content");
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = currentContent.substring(0, start) + variable + currentContent.substring(end);
      form.setValue("content", newContent);
      
      // Focus back and set cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 10);
    } else {
      form.setValue("content", currentContent + variable);
    }
  };

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
        form.setValue("mediaUrl", e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Set media type based on file type
      if (file.type.startsWith('image/')) {
        form.setValue("mediaType", "image");
      } else if (file.type.startsWith('video/')) {
        form.setValue("mediaType", "video");
      } else if (file.type.startsWith('audio/')) {
        form.setValue("mediaType", "audio");
      } else {
        form.setValue("mediaType", "document");
      }
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview("");
    form.setValue("mediaType", "");
    form.setValue("mediaUrl", "");
    form.setValue("mediaCaption", "");
  };

  const renderVariableContent = (content: string) => {
    // Replace variables with sample data for preview
    return content
      .replace(/\{\{name\}\}/g, "John Doe")
      .replace(/\{\{company\}\}/g, "Tech Corp")
      .replace(/\{\{phone\}\}/g, "+1234567890")
      .replace(/\{\{email\}\}/g, "john@example.com")
      .replace(/\{\{amount\}\}/g, "₹50,000")
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
  };

  const commonVariables = ["{{name}}", "{{company}}", "{{phone}}", "{{email}}", "{{amount}}", "{{date}}"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Template" : "Create New Template"}</h3>
          <p className="text-sm text-gray-600">Design powerful message templates with advanced features</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPreviewMode(!previewMode)}
          className="flex items-center gap-2"
        >
          {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {previewMode ? "Edit" : "Preview"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          
          {previewMode ? (
            // Preview Mode
            <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Template Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">{form.watch("category")}</Badge>
                    <Badge variant="outline">{LANGUAGES.find(l => l.value === form.watch("language"))?.label}</Badge>
                  </div>
                  {/* Media Preview in Template Preview */}
                  {mediaPreview && (
                    <div className="mb-4">
                      {form.watch("mediaType") === "image" && (
                        <img 
                          src={mediaPreview} 
                          alt="Media preview" 
                          className="max-w-full h-32 object-cover rounded border"
                        />
                      )}
                      {form.watch("mediaType") === "video" && (
                        <video 
                          src={mediaPreview} 
                          className="max-w-full h-32 rounded border"
                          muted
                        />
                      )}
                      {form.watch("mediaCaption") && (
                        <p className="text-xs text-gray-600 mt-1">{form.watch("mediaCaption")}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap text-sm">
                    {renderVariableContent(form.watch("content") || "Start typing your message...")}
                  </div>
                  {ctaButtons.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {ctaButtons.map((button, index) => (
                        <Button key={index} variant="outline" size="sm" className="mr-2">
                          {button.text}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                
                {detectedVariables.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Detected Variables:</h4>
                    <div className="flex flex-wrap gap-2">
                      {detectedVariables.map((variable, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Variable className="h-3 w-3 mr-1" />
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // Edit Mode
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter template name..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TEMPLATE_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Language</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LANGUAGES.map((lang) => (
                                  <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Active Template</FormLabel>
                            <div className="text-sm text-gray-600">
                              Enable this template for use in campaigns
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Tags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" variant="outline" onClick={addTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Message Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Write your message template here... Use {{variable}} for dynamic content."
                              className="min-h-[200px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{field.value?.length || 0}/4000 characters</span>
                            <span>~{estimateReadTime(field.value || "")}s read time</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quick Variables */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Quick Insert Variables</label>
                      <div className="flex flex-wrap gap-2">
                        {commonVariables.map((variable) => (
                          <Button
                            key={variable}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariable(variable)}
                            className="text-xs"
                          >
                            {variable}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {detectedVariables.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Detected Variables</label>
                        <div className="flex flex-wrap gap-2">
                          {detectedVariables.map((variable, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <Variable className="h-3 w-3 mr-1" />
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Media Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Media Attachment (Optional)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!mediaPreview ? (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Upload Media</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <div className="flex justify-center space-x-4 mb-4">
                            <Image className="h-8 w-8 text-gray-400" />
                            <Video className="h-8 w-8 text-gray-400" />
                            <Music className="h-8 w-8 text-gray-400" />
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 mb-4">
                            Upload images, videos, audio, or documents to enhance your template
                          </p>
                          <input
                            type="file"
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                            onChange={handleMediaUpload}
                            className="hidden"
                            id="media-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('media-upload')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Media Preview</label>
                        <div className="border rounded-lg p-4">
                          {form.watch("mediaType") === "image" && (
                            <img 
                              src={mediaPreview} 
                              alt="Preview" 
                              className="max-w-full h-40 object-cover rounded"
                            />
                          )}
                          {form.watch("mediaType") === "video" && (
                            <video 
                              src={mediaPreview} 
                              controls 
                              className="max-w-full h-40 rounded"
                            />
                          )}
                          {form.watch("mediaType") === "audio" && (
                            <audio 
                              src={mediaPreview} 
                              controls 
                              className="w-full"
                            />
                          )}
                          {form.watch("mediaType") === "document" && (
                            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded">
                              <FileText className="h-8 w-8 text-gray-600" />
                              <span className="text-sm text-gray-600">Document attached</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-3">
                            <span className="text-xs text-gray-500">
                              Type: {form.watch("mediaType")}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={removeMedia}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="mediaCaption"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Media Caption (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Add a caption for your media..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* CTA Buttons */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Call-to-Action Buttons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Button text"
                          value={newButton.text}
                          onChange={(e) => setNewButton({ ...newButton, text: e.target.value })}
                        />
                        <Select
                          value={newButton.type}
                          onValueChange={(value: 'url' | 'phone' | 'text') => 
                            setNewButton({ ...newButton, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="url">URL</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={addCTAButton} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {newButton.type === 'url' && (
                        <Input
                          placeholder="https://example.com"
                          value={newButton.url || ""}
                          onChange={(e) => setNewButton({ ...newButton, url: e.target.value })}
                        />
                      )}
                    </div>

                    {ctaButtons.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CTA Buttons</label>
                        {ctaButtons.map((button, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <span className="font-medium">{button.text}</span>
                              <Badge variant="outline" className="ml-2">{button.type}</Badge>
                              {button.url && <span className="text-xs text-gray-500 block">{button.url}</span>}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCTAButton(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : (isEdit ? "Update Template" : "Create Template")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}