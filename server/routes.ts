import express, { type Express, type Request, type Response } from "express";
import { Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { campaignExecutor } from "./campaign-executor";
import { persistentWhatsAppService } from "./whatsapp-persistent";
import { multiAIService } from "./ai-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const server = new Server(app);

  // Initialize WhatsApp WebSocket server
  try {
    if (persistentWhatsAppService && typeof persistentWhatsAppService.initializeWebSocket === 'function') {
      await persistentWhatsAppService.initializeWebSocket(server);
    } else {
      console.warn("WhatsApp service not properly initialized");
    }
  } catch (error) {
    console.error("Error initializing WebSocket server:", error);
  }

  // Set up authentication if not in development mode
  if (process.env.NODE_ENV !== 'development') {
    await setupAuth(app);
  }

  // User authentication routes
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser((req.user as any).claims?.sub);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // WhatsApp numbers
  app.get("/api/whatsapp-numbers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const numbers = await storage.getWhatsappNumbers(userId);
      res.json(numbers);
    } catch (error) {
      console.error("Error fetching WhatsApp numbers:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp numbers" });
    }
  });

  // WhatsApp active sessions
  app.get("/api/whatsapp/active-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const sessions = persistentWhatsAppService.getSessionsByUser(userId);
      res.json({ 
        success: true, 
        sessions: sessions.map(s => ({
          id: s.id,
          phoneNumber: s.phoneNumber,
          status: s.status,
          type: 'persistent'
        })),
        total: sessions.length
      });
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  // Generate QR code for WhatsApp connection
  app.post("/api/whatsapp/generate-qr-direct", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const sessionId = `direct_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const qrCode = await persistentWhatsAppService.createDirectSession(sessionId, userId);
      
      if (qrCode) {
        res.json({
          success: true,
          sessionId,
          qrCode,
          message: "QR code generated successfully",
          expiresIn: 120 // 2 minutes
        });
      } else {
        res.json({
          success: false,
          message: "Failed to generate QR code. You may already have an active session."
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to generate QR code: " + error.message 
      });
    }
  });

  // Contact groups
  app.get("/api/contact-groups", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const groups = await storage.getContactGroups(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching contact groups:", error);
      res.status(500).json({ message: "Failed to fetch contact groups" });
    }
  });

  // Contacts
  app.get("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const contacts = await storage.getContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Templates
  app.get("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const templates = await storage.getTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Conversations
  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Messages
  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.query.conversationId as string);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // AI test response
  app.post("/api/ai/test-response", async (req, res) => {
    try {
      const { message, provider, model, apiKey, temperature, maxTokens, customInstructions } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      const config = {
        provider: provider || 'openai',
        model: model || 'gpt-4o',
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 500
      };
      
      const response = await multiAIService.generateResponse(message, config, {
        customInstructions
      });
      
      res.json({ message: response.message });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // Chatbot settings
  app.get("/api/chatbot/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const settings = await storage.getChatbotSettings(userId);
      res.json(settings || {
        enabled: false,
        autoReplyEnabled: true,
        sentimentAnalysisEnabled: true,
        responseDelay: 5,
        maxResponseLength: 200,
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 150
      });
    } catch (error) {
      console.error("Error fetching chatbot settings:", error);
      res.status(500).json({ message: "Failed to fetch chatbot settings" });
    }
  });

  // Development mode bypass for authentication
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      // Set a mock user for development
      if (!req.user) {
        console.log("Development mode: setting mock user");
        (req as any).user = {
          claims: { sub: 'dev-user-123' },
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        
        // Set isAuthenticated method
        (req as any).isAuthenticated = () => true;
      }
      
      next();
    });
  }

  return server;
}
      // Set a mock user for development
      (req as any).user = {
        claims: { sub: 'dev-user-123' },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      
      // Set isAuthenticated method
      (req as any).isAuthenticated = () => true;
      
      next();
    });
  }

  return server;
}