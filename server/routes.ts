import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { whatsappService } from "./whatsapp";
import { 
  insertContactSchema, 
  insertTemplateSchema, 
  insertCampaignSchema, 
  insertAntiBlockingSettingsSchema,
  insertWhatsappNumberSchema,
  insertConversationSchema,
  insertMessageSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // WhatsApp numbers routes
  app.get('/api/whatsapp-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const numbers = await storage.getWhatsappNumbers(userId);
      res.json(numbers);
    } catch (error) {
      console.error("Error fetching WhatsApp numbers:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp numbers" });
    }
  });

  app.post('/api/whatsapp-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertWhatsappNumberSchema.parse({
        ...req.body,
        userId,
      });
      const number = await storage.createWhatsappNumber(validatedData);
      res.json(number);
    } catch (error) {
      console.error("Error creating WhatsApp number:", error);
      res.status(500).json({ message: "Failed to create WhatsApp number" });
    }
  });

  app.put('/api/whatsapp-numbers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const number = await storage.updateWhatsappNumber(id, req.body);
      res.json(number);
    } catch (error) {
      console.error("Error updating WhatsApp number:", error);
      res.status(500).json({ message: "Failed to update WhatsApp number" });
    }
  });

  app.delete('/api/whatsapp-numbers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWhatsappNumber(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting WhatsApp number:", error);
      res.status(500).json({ message: "Failed to delete WhatsApp number" });
    }
  });

  // Contacts routes
  app.get('/api/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contacts = await storage.getContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post('/api/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact({ ...validatedData, userId });
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.put('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.updateContact(id, req.body);
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContact(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  app.post('/api/contacts/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { ids } = req.body;
      await storage.deleteContacts(ids);
      res.json({ success: true });
    } catch (error) {
      console.error("Error bulk deleting contacts:", error);
      res.status(500).json({ message: "Failed to bulk delete contacts" });
    }
  });

  // Templates routes
  app.get('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate({ ...validatedData, userId });
      res.json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.updateTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Campaigns routes
  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign({ ...validatedData, userId });
      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.put('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.updateCampaign(id, req.body);
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCampaign(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Conversations routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation({ ...validatedData, userId });
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.put('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.updateConversation(id, req.body);
      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  // Messages routes
  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
      });
      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Anti-blocking settings routes
  app.get('/api/anti-blocking-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getAntiBlockingSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching anti-blocking settings:", error);
      res.status(500).json({ message: "Failed to fetch anti-blocking settings" });
    }
  });

  app.post('/api/anti-blocking-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertAntiBlockingSettingsSchema.parse(req.body);
      const settings = await storage.upsertAntiBlockingSettings({ ...validatedData, userId });
      res.json(settings);
    } catch (error) {
      console.error("Error updating anti-blocking settings:", error);
      res.status(500).json({ message: "Failed to update anti-blocking settings" });
    }
  });

  // Add WhatsApp session endpoint
  app.post('/api/whatsapp/start-session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionId = `session_${userId}_${Date.now()}`;
      
      res.json({ 
        sessionId, 
        message: 'WhatsApp session initialized. Connect via WebSocket for QR code.' 
      });
    } catch (error) {
      console.error("Error starting WhatsApp session:", error);
      res.status(500).json({ message: "Failed to start WhatsApp session" });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WhatsApp WebSocket service
  await whatsappService.initializeWebSocket(httpServer);
  
  return httpServer;
}
