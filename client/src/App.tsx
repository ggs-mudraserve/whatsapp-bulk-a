import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Inbox from "@/pages/inbox";
import Campaigns from "@/pages/campaigns";
import Contacts from "@/pages/contacts";
import Templates from "@/pages/templates";
import WhatsApp from "@/pages/whatsapp";
import Settings from "@/pages/settings";
import AIChatbot from "@/pages/ai-chatbot";
import AIAgents from "@/pages/ai-agents";
import WhatsAppSetupPersistent from "@/pages/whatsapp-setup-persistent";
import FeaturesOverview from "@/pages/features-overview";
import TestPage from "@/components/test-page";
import CleanInbox from "@/components/inbox/clean-inbox";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('Router render:', { isAuthenticated, isLoading, path: window.location.pathname });

  // Force landing page to show for unauthenticated users
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SendWo Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={() => { window.location.href = "/api/login"; return null; }} />
          <Route component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/inbox" component={CleanInbox} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/templates" component={Templates} />
          <Route path="/whatsapp" component={WhatsApp} />
          <Route path="/whatsapp-persistent" component={WhatsAppSetupPersistent} />
          <Route path="/ai-agents" component={AIAgents} />
          <Route path="/features" component={FeaturesOverview} />
          <Route path="/settings" component={Settings} />
          <Route component={() => <div className="p-4 text-center text-gray-500">Page not found. Please check the URL.</div>} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
