import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { useGlobalSync } from "./useGlobalSync";

export function useRealtimeTemplates() {
  const { triggerGlobalSync } = useGlobalSync();
  
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["/api/templates"],
    retry: false,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Force refresh when data changes in other parts of the app
  useEffect(() => {
    const handleTemplateRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    };

    window.addEventListener('refresh_templates', handleTemplateRefresh);
    
    return () => {
      window.removeEventListener('refresh_templates', handleTemplateRefresh);
    };
  }, []);

  const triggerRefresh = () => {
    // Use global sync system to update all sections
    triggerGlobalSync('templates');
    
    // Also trigger specific template refresh
    window.dispatchEvent(new CustomEvent('refresh_templates'));
  };

  return {
    templates: templates || [],
    isLoading,
    error,
    triggerRefresh,
  };
}