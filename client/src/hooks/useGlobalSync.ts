import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export function useGlobalSync() {
  useEffect(() => {
    // Listen for global refresh events
    const handleGlobalRefresh = (event: CustomEvent) => {
      const { section } = event.detail || {};
      
      // Refresh all data when any section updates
      if (section === 'templates' || !section) {
        queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      }
      if (section === 'campaigns' || !section) {
        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      }
      if (section === 'contacts' || !section) {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
      }
      if (section === 'whatsapp' || !section) {
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-numbers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/active-sessions"] });
      }
      if (section === 'conversations' || !section) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    };

    // Storage change listener for cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'global_data_updated') {
        // Refresh all queries
        queryClient.invalidateQueries();
      }
    };

    window.addEventListener('global_refresh', handleGlobalRefresh as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('global_refresh', handleGlobalRefresh as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const triggerGlobalSync = (section?: string) => {
    // Update localStorage to trigger cross-tab sync
    localStorage.setItem('global_data_updated', Date.now().toString());
    
    // Dispatch custom event for same-tab sync
    window.dispatchEvent(new CustomEvent('global_refresh', {
      detail: { section }
    }));
  };

  return { triggerGlobalSync };
}