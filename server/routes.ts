import express, { type Express, type Request, type Response } from "express";
import { Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { campaignExecutor } from "./campaign-executor.js";
import { persistentWhatsAppService } from "./whatsapp-persistent.js";
import { multiAIService } from "./ai-service.js";

export async function registerRoutes(app: Express): Promise<Server> {
  const server = new Server(app);

  // Initialize WhatsApp WebSocket server
  try {
    if (persistentWhatsAppService && typeof persistentWhatsAppService.initializeWebSocket === 'function') {
      try {
        await persistentWhatsAppService.initializeWebSocket(server);
      } catch (error) {
        console.error("Error initializing WhatsApp WebSocket server:", error);
      }
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

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connection
      const { pool } = await import('./db.js');
      const dbResult = await pool.query('SELECT NOW()');
      
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          timestamp: dbResult.rows[0].now
        },
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      res.json({ 
        status: "warning", 
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error.message
        },
        environment: process.env.NODE_ENV || 'development'
      });
    }
  });

  // User authentication routes
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
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

  app.post("/api/whatsapp-numbers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const { phoneNumber, displayName, isActive, sessionId } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const whatsappNumber = await storage.createWhatsappNumber({
        phoneNumber,
        displayName: displayName || phoneNumber,
        userId,
        status: 'disconnected',
        sessionData: sessionId ? { sessionId } : null,
        webhookUrl: null
      });
      
      res.json(whatsappNumber);
    } catch (error) {
      console.error("Error creating WhatsApp number:", error);
      res.status(500).json({ message: "Failed to create WhatsApp number" });
    }
  });

  app.put("/api/whatsapp-numbers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const whatsappNumber = await storage.updateWhatsappNumber(id, updates);
      res.json(whatsappNumber);
    } catch (error) {
      console.error("Error updating WhatsApp number:", error);
      res.status(500).json({ message: "Failed to update WhatsApp number" });
    }
  });

  app.delete("/api/whatsapp-numbers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWhatsappNumber(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting WhatsApp number:", error);
      res.status(500).json({ message: "Failed to delete WhatsApp number" });
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

  // Generate QR code for WhatsApp connection (persistent)
  app.post("/api/whatsapp/qr-persistent", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const sessionId = `persistent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
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
      console.error("Error generating persistent QR code:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to generate QR code: " + error.message 
      });
    }
  });

  // Generate QR code for WhatsApp connection (direct)
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

  app.post("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { name, content, category, mediaType, mediaUrl, mediaCaption, ctaButtons, tags } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ message: "Name and content are required" });
      }

      console.log('Creating template with data:', {
        name,
        content: content?.substring?.(0, 50) + '...',
        category: category || 'general',
        userId
      });

      const template = await storage.createTemplate({
        name,
        content,
        category: category || 'general',
        mediaType: mediaType || null,
        mediaUrl: mediaUrl || null,
        mediaCaption: mediaCaption || null,
        ctaButtons: ctaButtons || [],
        tags: tags || [],
        userId
      });
      
      console.log('Template created successfully:', template.id);
      res.json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ 
        message: "Failed to create template",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  app.put("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, content, category, mediaType, mediaUrl, mediaCaption, ctaButtons, tags } = req.body;
      
      const template = await storage.updateTemplate(id, {
        name,
        content,
        category,
        mediaType,
        mediaUrl,
        mediaCaption,
        ctaButtons,
        tags
      });
      
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
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

  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const { conversationId, content, messageType, direction, messageId } = req.body;
      
      if (!conversationId || !content || !direction) {
        return res.status(400).json({ message: "ConversationId, content, and direction are required" });
      }

      const message = await storage.createMessage({
        conversationId,
        content,
        messageType: messageType || 'text',
        direction,
        messageId: messageId || null
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Conversations
  app.post("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const { contactName, contactPhone, whatsappNumberId, contactId } = req.body;
      
      if (!contactName || !contactPhone) {
        return res.status(400).json({ message: "Contact name and phone are required" });
      }

      const conversation = await storage.createConversation({
        userId,
        contactName,
        contactPhone,
        whatsappNumberId: whatsappNumberId || null,
        contactId: contactId || null
      });
      
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
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
      try {
        // Set a mock user for development
        if (!req.user) {
          (req as any).user = {
            claims: { sub: 'dev-user-123' },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_at: Math.floor(Date.now() / 1000) + 3600
          };
          
          // Set isAuthenticated method
          (req as any).isAuthenticated = () => true;
        }
      } catch (error) {
        console.error("Error setting mock user:", error);
      }
      
      next();
    });
  }

  // Database setup status endpoint
  app.get("/api/setup/status", async (req, res) => {
    try {
      const { pool } = await import('./db.js');
      
      // Check if tables exist
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      const tablesExist = result.rows[0].exists;
      
      res.json({
        status: tablesExist ? "ready" : "needs_setup",
        database: {
          connected: true,
          tablesExist
        }
      });
    } catch (error) {
      res.json({
        status: "error",
        message: error.message,
        database: {
          connected: false
        }
      });
    }
  });

  // Run database migrations endpoint
  app.post("/api/setup/run-migrations", async (req, res) => {
    try {
      const { setupDatabase } = await import('./db-setup.js');
      const result = await setupDatabase();
      
      res.json({
        success: result,
        message: result ? "Database setup completed successfully" : "Database setup failed"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Database setup error: ${error.message}`
      });
    }
  });

  return server;
}