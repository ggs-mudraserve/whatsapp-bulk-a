import { useState } from "react";
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
import { Plus, X } from "lucide-react";
import { insertTemplateSchema } from "../../../../shared/validation";

const templateFormSchema = insertTemplateSchema.extend({
  name: z.string().min(1, "Template name is required"),
  category: z.string().min(1, "Category is required"),
  content: z.string().min(1, "Template content is required"),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;
type CTAButton = { text: string; url?: string; type: 'url' | 'phone' | 'text' };

interface TemplateFormProps {
  onSuccess: () => void;
}

export default function TemplateForm({ onSuccess }: TemplateFormProps) {
  const { toast } = useToast();
  const [ctaButtons, setCTAButtons] = useState<CTAButton[]>([]);
  const [newButton, setNewButton] = useState<CTAButton>({ text: "", type: "url" });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      category: "",
      content: "",
      ctaButtons: [],
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      await apiRequest("POST", "/api/templates", {
        ...data,
        ctaButtons,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template created",
        description: "Your template has been created successfully.",
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
        description: "Failed to create template.",
        variant: "destructive",
      });
    },
  });

  const addCTAButton = () => {
    if (!newButton.text.trim()) return;
    
    setCTAButtons([...ctaButtons, newButton]);
    setNewButton({ text: "", type: "url" });
  };

  const removeCTAButton = (index: number) => {
    setCTAButtons(ctaButtons.filter((_, i) => i !== index));
  };

  const onSubmit = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const content = form.watch("content");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter template name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="events">Events</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your message template. Use {{name}} for personalization."
                      className="resize-none"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CTA Buttons Section */}
            <div>
              <FormLabel>CTA Buttons</FormLabel>
              <div className="space-y-3 mt-2">
                {ctaButtons.map((button, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium">{button.text}</span>
                      <span className="text-xs text-gray-500 ml-2">({button.type})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCTAButton(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Button text"
                    value={newButton.text}
                    onChange={(e) => setNewButton({ ...newButton, text: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={newButton.type}
                    onValueChange={(value: 'url' | 'phone' | 'text') => 
                      setNewButton({ ...newButton, type: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addCTAButton} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onSuccess}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplateMutation.isPending}>
                {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Preview */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {content ? content.replace(/\{\{name\}\}/g, "John") : "Your message preview will appear here..."}
              </p>
              {ctaButtons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ctaButtons.map((button, index) => (
                    <Button key={index} size="sm" variant="outline">
                      {button.text}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
