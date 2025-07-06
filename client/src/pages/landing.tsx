import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Users, BarChart, Shield, Zap, Globe } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">WhatsApp Pro</h1>
            </div>
            <Button onClick={handleLogin} className="bg-blue-500 hover:bg-blue-600">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Professional WhatsApp Marketing Made Simple
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Manage your WhatsApp marketing campaigns, track conversations, and grow your business with intelligent automation and anti-blocking protection.
          </p>
          <Button 
            onClick={handleLogin} 
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3"
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need for WhatsApp Marketing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-3 bg-blue-100 rounded-full w-fit">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Smart Inbox</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Manage all your WhatsApp conversations in one place with smart filtering and tagging.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-3 bg-green-100 rounded-full w-fit">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Bulk Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Send personalized messages to thousands of contacts with template support and scheduling.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-3 bg-purple-100 rounded-full w-fit">
                  <BarChart className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track delivery rates, read rates, and campaign performance with detailed insights.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-3 bg-red-100 rounded-full w-fit">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Anti-Blocking Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Intelligent delays, typing simulation, and human-like behavior to avoid blocks.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-3 bg-yellow-100 rounded-full w-fit">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle>Template Builder</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Create rich message templates with CTA buttons and personalization variables.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-3 bg-indigo-100 rounded-full w-fit">
                  <Globe className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Multi-Number Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Connect multiple WhatsApp numbers with automatic rotation and health monitoring.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h3 className="text-3xl font-bold mb-6">
            Ready to Scale Your WhatsApp Marketing?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of businesses using WhatsApp Pro to grow their customer base and increase sales.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">WhatsApp Pro</span>
          </div>
          <p className="text-gray-400">
            © 2024 WhatsApp Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
