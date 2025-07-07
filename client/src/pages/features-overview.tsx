import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Users, 
  Send, 
  FileText, 
  Settings, 
  Bot, 
  BarChart3, 
  Smartphone,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function FeaturesOverview() {
  const features = [
    {
      title: "📨 Inbox Management",
      description: "Advanced WhatsApp conversation management with real-time sync",
      icon: MessageSquare,
      route: "/inbox",
      status: "active",
      capabilities: [
        "Real-time message synchronization",
        "WhatsApp-style chat interface", 
        "Message status tracking (sent, delivered, read)",
        "Contact avatars and status indicators",
        "Direct messaging to any phone number"
      ]
    },
    {
      title: "👥 Contact Management", 
      description: "Organize and manage your customer database",
      icon: Users,
      route: "/contacts",
      status: "active",
      capabilities: [
        "Import contacts from CSV files",
        "Tag and categorize contacts",
        "Track contact status and engagement",
        "Bulk contact operations",
        "Advanced search and filtering"
      ]
    },
    {
      title: "🚀 Campaign Management",
      description: "Create and manage bulk WhatsApp marketing campaigns",
      icon: Send,
      route: "/campaigns", 
      status: "active",
      capabilities: [
        "Bulk message campaigns",
        "Campaign scheduling",
        "Delivery tracking and analytics",
        "Personalized message templates",
        "Campaign performance metrics"
      ]
    },
    {
      title: "📝 Message Templates",
      description: "Create reusable message templates with dynamic content",
      icon: FileText,
      route: "/templates",
      status: "active", 
      capabilities: [
        "Reusable message templates",
        "Dynamic variable insertion",
        "Template categories and organization",
        "Rich text formatting support",
        "Call-to-action buttons"
      ]
    },
    {
      title: "📱 WhatsApp Integration",
      description: "Connect unlimited WhatsApp numbers with persistent sessions",
      icon: Smartphone,
      route: "/whatsapp-persistent",
      status: "active",
      capabilities: [
        "QR code-based number connection",
        "Persistent sessions across restarts",
        "Multiple WhatsApp number support",
        "Real-time connection monitoring",
        "Session management and controls"
      ]
    },
    {
      title: "🤖 AI Agents & Chatbot",
      description: "Intelligent AI-powered customer interactions",
      icon: Bot,
      route: "/ai-agents",
      status: "active",
      capabilities: [
        "Multi-provider AI support (OpenAI, Claude, Gemini)",
        "Specialized AI agents (Sales, Support, Marketing)",
        "Custom agent creation",
        "Sentiment analysis",
        "Auto-reply functionality"
      ]
    },
    {
      title: "📊 Analytics Dashboard",
      description: "Comprehensive analytics and performance insights",
      icon: BarChart3,
      route: "/",
      status: "active",
      capabilities: [
        "Campaign performance metrics",
        "Message delivery statistics", 
        "Contact engagement analytics",
        "Revenue and conversion tracking",
        "Real-time dashboard updates"
      ]
    },
    {
      title: "🛡️ Anti-Blocking Protection",
      description: "Advanced protection against WhatsApp restrictions",
      icon: Shield,
      route: "/settings",
      status: "active",
      capabilities: [
        "Message delay randomization",
        "Number rotation strategies",
        "Behavior simulation",
        "Rate limiting controls",
        "Compliance monitoring"
      ]
    }
  ];

  const handleFeatureClick = (route: string) => {
    window.location.href = route;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SendWo Pro Features</h1>
          <p className="text-gray-600">Complete WhatsApp marketing platform overview</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-green-800">WhatsApp Connected Successfully!</h2>
        </div>
        <p className="text-green-700 mb-4">
          Your WhatsApp number (919211737685) is connected and ready for messaging. 
          All features below are now fully functional.
        </p>
        <Button 
          onClick={() => handleFeatureClick('/inbox')}
          className="bg-green-600 hover:bg-green-700"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Start Messaging
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-green-700 border-green-300">
                      {feature.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm mt-2">{feature.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Key Capabilities:</h4>
                  <ul className="space-y-1">
                    {feature.capabilities.map((capability, capIndex) => (
                      <li key={capIndex} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  onClick={() => handleFeatureClick(feature.route)}
                  variant="outline" 
                  className="w-full mt-4 hover:bg-blue-50"
                >
                  Explore Feature
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <div className="text-center">
            <Globe className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to Scale Your WhatsApp Marketing
            </h3>
            <p className="text-gray-600 mb-4">
              With your WhatsApp connected, you can now leverage all premium features to grow your business
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => handleFeatureClick('/campaigns')}>
                <Send className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
              <Button variant="outline" onClick={() => handleFeatureClick('/contacts')}>
                <Users className="w-4 h-4 mr-2" />
                Manage Contacts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}