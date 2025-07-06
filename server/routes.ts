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

  // Force landing page to load for root path - disable automatic Replit auth redirects
  app.get('/', (req, res, next) => {
    // Check if this is a direct access to prevent automatic auth redirects
    const userAgent = req.get('User-Agent') || '';
    const acceptsHtml = req.accepts('html');
    
    // If it's a browser request for HTML, let our React app handle it
    if (acceptsHtml && userAgent.includes('Mozilla')) {
      next();
      return;
    }
    
    next();
  });

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

  // Send direct message endpoint
  app.post('/api/messages/send-direct', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { whatsappNumberId, recipientPhone, message } = req.body;

      // Get the WhatsApp number
      const whatsappNumber = await storage.getWhatsappNumbers(userId);
      const selectedNumber = whatsappNumber.find(num => num.id === whatsappNumberId);
      
      if (!selectedNumber) {
        return res.status(404).json({ message: "WhatsApp number not found" });
      }

      // Create or find conversation
      let conversation = await storage.getConversations(userId);
      let existingConversation = conversation.find(conv => conv.contactPhone === recipientPhone);
      
      if (!existingConversation) {
        existingConversation = await storage.createConversation({
          userId,
          contactName: recipientPhone.replace('+', ''),
          contactPhone: recipientPhone,
          lastMessage: message,
          lastMessageAt: new Date(),
          unreadCount: 0,
          status: 'active',
          tags: [],
        });
      }

      // Create message record
      await storage.createMessage({
        conversationId: existingConversation.id,
        content: message,
        direction: 'outgoing',
        status: 'sent',
        messageType: 'text',
        timestamp: new Date(),
      });

      // Try to send via WhatsApp if session exists
      try {
        const sessionData = selectedNumber.sessionData as any;
        const sessionId = sessionData?.sessionId;
        if (sessionId) {
          await whatsappService.sendMessage(sessionId, recipientPhone.replace('+', ''), message);
        }
      } catch (error) {
        console.error('WhatsApp send error:', error);
        // Continue - message is still saved to inbox
      }

      res.json({ 
        message: 'Message sent successfully',
        conversationId: existingConversation.id 
      });
    } catch (error) {
      console.error("Error sending direct message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Send OTP for manual WhatsApp number verification
  app.post('/api/whatsapp/send-otp', isAuthenticated, async (req: any, res) => {
    try {
      const { phoneNumber } = req.body;
      
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP temporarily (in production, use Redis or similar)
      // For now, we'll just return the OTP for testing (remove in production)
      console.log(`OTP for ${phoneNumber}: ${otp}`);
      
      // In a real implementation, you would send the OTP via SMS or WhatsApp Business API
      // For demo purposes, we'll simulate sending it
      
      res.json({ 
        message: 'OTP sent successfully',
        // In production, remove this line and actually send the OTP
        otp: otp // Only for demo - remove in production
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify OTP and add WhatsApp number
  app.post('/api/whatsapp/verify-otp', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phoneNumber, otp, displayName, accountType, dailyMessageLimit, ...numberData } = req.body;
      
      // In production, verify the OTP against stored value
      // For demo, we'll accept any 6-digit OTP
      if (!otp || otp.length !== 6) {
        return res.status(400).json({ message: "Invalid OTP" });
      }
      
      // Create WhatsApp number in database
      const whatsappNumber = await storage.createWhatsappNumber({
        userId,
        phoneNumber,
        displayName,
        accountType,
        status: 'active',
        dailyMessageLimit,
        messagesSentToday: 0,
        successRate: '100.00',
        sessionData: { manuallyAdded: true, verified: true }
      });
      
      res.json({ 
        message: 'WhatsApp number verified and added successfully',
        number: whatsappNumber
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
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

  // Clear WhatsApp session data to fix connection issues
  app.post('/api/whatsapp/clear-cache', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Clear all auth data for this user
      const fs = await import('fs');
      const path = await import('path');
      
      const authDirs = fs.readdirSync('./').filter(dir => 
        dir.startsWith('auth_info_') && dir.includes(userId)
      );
      
      for (const dir of authDirs) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`Cleared auth cache: ${dir}`);
        } catch (error) {
          console.log(`Failed to clear ${dir}:`, error);
        }
      }
      
      res.json({ 
        message: 'WhatsApp cache cleared successfully. You can now try connecting again.',
        clearedDirs: authDirs.length
      });
    } catch (error) {
      console.error("Error clearing WhatsApp cache:", error);
      res.status(500).json({ message: "Failed to clear WhatsApp cache" });
    }
  });

  // Connect WhatsApp provider
  app.post('/api/whatsapp/connect-provider', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { provider, name, phoneNumber, apiKey, apiSecret, webhookUrl, businessId, notes } = req.body;

      // Validate required fields
      if (!provider || !name || !phoneNumber || !apiKey) {
        return res.status(400).json({ message: "Provider, name, phone number and API key are required" });
      }

      // Create WhatsApp number with provider details
      const whatsappNumber = await storage.createWhatsappNumber({
        userId,
        phoneNumber,
        displayName: name,
        connectionType: 'provider',
        status: 'active',
        providerName: provider,
        apiKey,
        apiSecret: apiSecret || undefined,
        webhookUrl: webhookUrl || undefined,
        businessId: businessId || undefined,
        notes: notes || undefined
      });

      res.json(whatsappNumber);
    } catch (error) {
      console.error("Error connecting WhatsApp provider:", error);
      res.status(500).json({ message: "Failed to connect provider" });
    }
  });

  // Add Facebook WhatsApp Business API endpoint
  app.post('/api/whatsapp/facebook-api', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phoneNumberId, accessToken, businessAccountId, displayName, phoneNumber, webhookVerifyToken } = req.body;
      
      // Validate required fields
      if (!phoneNumberId || !accessToken || !businessAccountId || !displayName || !phoneNumber) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Test the API connection by making a request to Facebook's Graph API
      const testResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!testResponse.ok) {
        return res.status(400).json({ 
          message: 'Invalid Facebook API credentials. Please check your Access Token and Phone Number ID.' 
        });
      }

      // Store the WhatsApp Business API number
      const whatsappNumber = await storage.createWhatsappNumber({
        userId,
        displayName,
        phoneNumber,
        accountType: 'business',
        connectionType: 'facebook_api',
        status: 'connected',
        sessionData: {
          phoneNumberId,
          accessToken,
          businessAccountId,
          webhookVerifyToken,
        },
      });

      res.json({ 
        message: 'WhatsApp Business API connected successfully',
        number: whatsappNumber 
      });
    } catch (error) {
      console.error('Error connecting Facebook API:', error);
      res.status(500).json({ message: 'Failed to connect WhatsApp Business API' });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WhatsApp WebSocket service
  await whatsappService.initializeWebSocket(httpServer);
  
  return httpServer;
}
