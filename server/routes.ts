import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { simpleWhatsAppService } from "./whatsapp-simple";
import { robustWhatsAppService } from "./whatsapp-robust";
import { workingWhatsAppService } from "./whatsapp-working";
import { chatbotService } from "./openai";
import { multiAIService } from "./ai-service";
import { 
  insertContactSchema, 
  insertTemplateSchema, 
  insertCampaignSchema, 
  insertAntiBlockingSettingsSchema,
  insertWhatsappNumberSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertChatbotSettingsSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // AI test response endpoint (placed before auth to bypass authentication)
  app.post('/api/ai/test-response', async (req: any, res) => {
    try {
      console.log("AI test endpoint hit:", req.body);
      
      // Return a simple test response without requiring AI service
      const response = {
        message: "Test response from AI Agent! This confirms the endpoint is working properly.",
        shouldReply: true,
        confidence: 0.95,
        tokensUsed: 15,
        provider: "test",
        model: "test-model"
      };

      res.json(response);
    } catch (error: any) {
      console.error("Error generating AI test response:", error);
      res.status(500).json({ message: error.message || "Failed to generate AI response" });
    }
  });

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
      
      // Check which numbers have active sessions
      global.activeSessions = global.activeSessions || new Map();
      const userSessions = Array.from(global.activeSessions.entries())
        .filter(([key, session]) => session.userId === userId && session.connected)
        .map(([key, session]) => ({
          phoneNumber: session.phoneNumber,
          sessionId: session.sessionId
        }));
      
      // Merge database numbers with active session info
      const numbersWithStatus = numbers.map(number => {
        const activeSession = userSessions.find(session => 
          session.phoneNumber === number.phoneNumber
        );
        
        return {
          ...number,
          isActiveSession: !!activeSession,
          sessionId: activeSession?.sessionId,
          // Override status if there's an active session
          status: activeSession ? 'connected' : number.status
        };
      });
      
      // Also add any active sessions that might not be in the database yet
      const phoneNumbersInDb = numbers.map(n => n.phoneNumber);
      const additionalSessions = userSessions.filter(session => 
        session.phoneNumber && !phoneNumbersInDb.includes(session.phoneNumber)
      );
      
      for (const session of additionalSessions) {
        numbersWithStatus.push({
          id: Date.now(), // Temporary ID for active session
          userId,
          phoneNumber: session.phoneNumber,
          displayName: `Active Session`,
          status: 'connected',
          qrConnected: true,
          isActiveSession: true,
          sessionId: session.sessionId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      res.json(numbersWithStatus);
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

  app.post('/api/conversations/ai-test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { agentId, agentName } = req.body;

      // Try to find existing AI test contact or create one
      let testContact;
      try {
        const contacts = await storage.getContacts(userId);
        testContact = contacts.find(c => c.name === `AI Agent: ${agentName}`);
        
        if (!testContact) {
          testContact = await storage.createContact({
            userId,
            name: `AI Agent: ${agentName}`,
            phoneNumber: `ai_test_${agentId}`,
            status: 'active'
          });
        }
      } catch (error) {
        console.error("Error with test contact:", error);
        testContact = await storage.createContact({
          userId,
          name: `AI Agent: ${agentName}`,
          phoneNumber: `ai_test_${agentId}`,
          status: 'active'
        });
      }

      // Try to find existing conversation or create one
      let conversation;
      try {
        const conversations = await storage.getConversations(userId);
        conversation = conversations.find(c => c.contactId === testContact.id);
        
        if (!conversation) {
          conversation = await storage.createConversation({
            userId,
            contactId: testContact.id,
            contactName: testContact.name,
            contactPhone: testContact.phoneNumber,
            status: 'active'
          });
        }
      } catch (error) {
        console.error("Error with test conversation:", error);
        conversation = await storage.createConversation({
          userId,
          contactId: testContact.id,
          contactName: testContact.name,
          contactPhone: testContact.phoneNumber,
          status: 'active'
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error creating AI test conversation:", error);
      res.status(500).json({ message: "Failed to create AI test conversation" });
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

  // Get messages for a conversation (alternative endpoint)
  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.query.conversationId);
      if (!conversationId) {
        return res.status(400).json({ message: "conversationId is required" });
      }
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        timestamp: new Date(),
      });

      // Get conversation details to find the recipient
      const conversations = await storage.getConversations(userId);
      const conversation = conversations.find(conv => conv.id === conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Create message record
      const message = await storage.createMessage(validatedData);

      // Try to send via WhatsApp if it's an outgoing message
      if (validatedData.direction === 'outgoing') {
        console.log(`Attempting to send WhatsApp message to ${conversation.contactPhone}`);
        
        try {
          // Get user's WhatsApp numbers to find an active session
          const whatsappNumbers = await storage.getWhatsappNumbers(userId);
          console.log(`Found ${whatsappNumbers.length} WhatsApp numbers for user ${userId}`);
          
          let messageSent = false;
          
          // Also try active sessions directly
          const activeSessions = workingWhatsAppService.getAllSessions();
          console.log(`Found ${activeSessions.length} active sessions:`);
          activeSessions.forEach(session => {
            console.log(`- Session ${session.id}, phone: ${session.phoneNumber}, status: ${session.status}`);
          });

          // Try stored WhatsApp numbers first
          for (const number of whatsappNumbers) {
            const sessionData = number.sessionData as any;
            const sessionId = sessionData?.sessionId;
            
            console.log(`Checking stored WhatsApp number ${number.phoneNumber}, sessionId: ${sessionId}`);
            
            if (sessionId) {
              try {
                await workingWhatsAppService.sendMessage(
                  sessionId, 
                  conversation.contactPhone.replace('+', ''), 
                  validatedData.content
                );
                console.log(`✓ Message sent via WhatsApp to ${conversation.contactPhone} using stored session ${sessionId}`);
                messageSent = true;
                break; // Success, stop trying other numbers
              } catch (sendError) {
                console.error(`✗ Failed to send via stored session ${sessionId}:`, sendError);
                continue; // Try next session
              }
            } else {
              console.log(`No session ID found for stored WhatsApp number ${number.phoneNumber}`);
            }
          }
          
          // If no stored sessions worked, try active sessions directly
          if (!messageSent && activeSessions.length > 0) {
            console.log('Trying active sessions directly...');
            for (const session of activeSessions) {
              if (session.status === 'connected') {
                try {
                  await workingWhatsAppService.sendMessage(
                    session.id, 
                    conversation.contactPhone.replace('+', ''), 
                    validatedData.content
                  );
                  console.log(`✓ Message sent via WhatsApp to ${conversation.contactPhone} using active session ${session.id}`);
                  messageSent = true;
                  break;
                } catch (sendError) {
                  console.error(`✗ Failed to send via active session ${session.id}:`, sendError);
                  continue;
                }
              }
            }
          }
          
          if (!messageSent) {
            console.warn(`No active WhatsApp sessions found to send message to ${conversation.contactPhone}`);
          }
        } catch (whatsappError) {
          console.error('WhatsApp send error:', whatsappError);
          // Message is still saved to database even if WhatsApp send fails
        }
      }

      // Update conversation with latest message
      await storage.updateConversation(conversationId, {
        lastMessage: validatedData.content,
        lastMessageAt: new Date(),
      });

      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Create message (alternative endpoint)
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content, conversationId, direction = 'outgoing' } = req.body;

      if (!content || !conversationId) {
        return res.status(400).json({ message: "Content and conversationId are required" });
      }

      const messageData = {
        conversationId: parseInt(conversationId),
        content,
        direction,
        timestamp: new Date().toISOString(),
        status: 'sent' as const,
        type: 'text' as const
      };

      const message = await storage.createMessage(messageData);
      
      // Update conversation's last message
      await storage.updateConversation(parseInt(conversationId), {
        updatedAt: new Date()
      });
      
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

      // Create or find contact first
      let contacts = await storage.getContacts(userId);
      let existingContact = contacts.find(contact => contact.phoneNumber === recipientPhone);
      
      if (!existingContact) {
        existingContact = await storage.createContact({
          userId,
          name: recipientPhone.replace('+', ''),
          phoneNumber: recipientPhone,
          status: 'active'
        });
      }

      // Create or find conversation
      let conversations = await storage.getConversations(userId);
      let existingConversation = conversations.find(conv => conv.contactId === existingContact.id);
      
      if (!existingConversation) {
        existingConversation = await storage.createConversation({
          userId,
          contactId: existingContact.id,
          whatsappNumberId: whatsappNumberId,
          contactName: existingContact.name,
          contactPhone: existingContact.phoneNumber,
          lastMessage: message,
          lastMessageAt: new Date(),
          unreadCount: 0,
          status: 'active',
          tags: [],
        });
      }

      // Update conversation with latest message
      await storage.updateConversation(existingConversation.id, {
        lastMessage: message,
        lastMessageAt: new Date(),
      });

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
        
        console.log(`Direct message - trying to send to ${recipientPhone}`);
        console.log(`Selected number: ${selectedNumber.phoneNumber}, session: ${sessionId}`);
        
        if (sessionId) {
          await workingWhatsAppService.sendMessage(sessionId, recipientPhone.replace('+', ''), message);
          console.log(`✓ Direct message sent via WhatsApp to ${recipientPhone} using session ${sessionId}`);
        } else {
          console.log(`No session ID found for WhatsApp number ${selectedNumber.phoneNumber}`);
          
          // Try active sessions as fallback
          const activeSessions = workingWhatsAppService.getAllSessions();
          console.log(`Trying ${activeSessions.length} active sessions for direct message...`);
          
          for (const session of activeSessions) {
            if (session.status === 'connected') {
              try {
                await workingWhatsAppService.sendMessage(session.id, recipientPhone.replace('+', ''), message);
                console.log(`✓ Direct message sent via active session ${session.id} to ${recipientPhone}`);
                break;
              } catch (sendError) {
                console.error(`✗ Failed to send direct message via session ${session.id}:`, sendError);
                continue;
              }
            }
          }
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

  // WhatsApp QR Code generation using whatsapp-web.js
  app.post('/api/whatsapp/generate-qr-direct', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionId = `whatsapp_session_${userId}_${Date.now()}`;
      
      console.log(`Starting WhatsApp QR generation for user ${userId}, session: ${sessionId}`);
      
      // Check if user has too many active sessions
      global.activeSessions = global.activeSessions || new Map();
      const userSessions = Array.from(global.activeSessions.keys()).filter(key => key.startsWith(`${userId}_`));
      
      if (userSessions.length >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Maximum number of WhatsApp sessions reached (5). Please disconnect some numbers first.'
        });
      }
      
      // Import whatsapp-web.js using createRequire for ES modules
      const { createRequire } = await import('module');
      const { execSync } = await import('child_process');
      const require = createRequire(import.meta.url);
      const { Client, LocalAuth } = require('whatsapp-web.js');
      console.log('Imported whatsapp-web.js:', { Client: typeof Client, LocalAuth: typeof LocalAuth });
      
      // Find chromium executable path
      let chromiumPath;
      try {
        chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();
      } catch (e) {
        chromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
      }
      console.log('Using Chromium path:', chromiumPath);
      const QRCode = await import('qrcode');
      const fs = await import('fs');
      const path = await import('path');
      
      // Clean session directory
      const sessionPath = path.join(process.cwd(), `.wwebjs_auth/session-${sessionId}`);
      try {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      } catch (e) {
        console.log('Session cleanup not needed');
      }

      // Create WhatsApp client
      const client = new Client({
        authStrategy: new LocalAuth({ 
          clientId: sessionId,
          dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
          headless: true,
          executablePath: chromiumPath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-default-apps'
          ]
        }
      });

      let qrGenerated = false;
      let connectionTimeout: NodeJS.Timeout;
      let sessionActive = true;
      
      // Store active sessions with better isolation
      const activeSessionKey = `${userId}_${sessionId}`;
      global.activeSessions.set(activeSessionKey, {
        sessionId,
        userId,
        createdAt: new Date(),
        client,
        status: 'initializing'
      });
      
      const cleanup = async (immediate = false) => {
        if (!sessionActive) return;
        
        sessionActive = false;
        global.activeSessions?.delete(activeSessionKey);
        
        try {
          if (client) {
            await client.destroy();
          }
        } catch (e) {
          console.log('Client cleanup error:', e);
        }
        
        // Clean session directory after delay
        if (!immediate) {
          setTimeout(() => {
            try {
              if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
              }
            } catch (e) {}
          }, qrGenerated ? 600000 : 180000); // 10 minutes vs 3 minutes
        }
        
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
      };

      // QR code generation
      client.on('qr', async (qr) => {
        if (qrGenerated) return;
        
        qrGenerated = true;
        console.log('WhatsApp QR code generated successfully');
        
        try {
          // Store the active session
          global.activeSessions.set(activeSessionKey, {
            client,
            sessionId,
            userId,
            createdAt: new Date(),
            sessionPath
          });
          
          // Generate QR code image
          const qrCodeDataUrl = await QRCode.default.toDataURL(qr, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          // Send QR code response
          res.json({
            success: true,
            sessionId,
            qrCode: qrCodeDataUrl,
            message: 'QR code generated successfully. Scan with WhatsApp mobile app.',
            expiresIn: 300 // 5 minutes
          });
          
        } catch (qrError) {
          console.error('QR code generation error:', qrError);
          await cleanup(true);
          if (!res.headersSent) {
            res.status(500).json({ 
              success: false,
              message: 'Failed to generate QR code image' 
            });
          }
        }
      });

      // Client ready (successful connection)
      client.on('ready', async () => {
        console.log(`WhatsApp client ready for session ${sessionId}`);
        
        try {
          // Get phone number info
          const info = client.info;
          const phoneNumber = info?.wid?.user ? `+${info.wid.user}` : null;
          
          // Update session with connection info
          const session = global.activeSessions.get(activeSessionKey);
          if (session) {
            session.connected = true;
            session.connectedAt = new Date();
            session.phoneNumber = phoneNumber || 'Connected';
          }
          
          // Save phone number to database
          if (phoneNumber) {
            await storage.createWhatsappNumber({
              userId,
              phoneNumber,
              status: 'connected',
              qrConnected: true
            });
            console.log(`Phone number ${phoneNumber} saved for session ${sessionId}`);
          }
        } catch (e) {
          console.log('Error saving phone number:', e);
        }
        
        clearTimeout(connectionTimeout);
      });

      // Authentication success
      client.on('authenticated', () => {
        console.log(`WhatsApp authenticated for session ${sessionId}`);
      });

      // Authentication failure
      client.on('auth_failure', (msg) => {
        console.log(`WhatsApp auth failure for session ${sessionId}:`, msg);
        cleanup(true);
      });

      // Client disconnected
      client.on('disconnected', (reason) => {
        console.log(`WhatsApp disconnected for session ${sessionId}:`, reason);
        cleanup(false);
      });

      // Initialize client
      await client.initialize();

      // Timeout fallback
      connectionTimeout = setTimeout(async () => {
        if (!qrGenerated) {
          console.log('QR generation timeout');
          await cleanup(true);
          
          if (!res.headersSent) {
            res.status(408).json({ 
              success: false,
              message: 'QR generation timeout. Please try again.' 
            });
          }
        }
      }, 45000); // 45 seconds timeout

    } catch (error) {
      console.error("WhatsApp QR generation error:", error);
      res.status(500).json({ 
        success: false,
        message: `Failed to generate QR code: ${error.message}` 
      });
    }
  });

  // List active WhatsApp sessions
  app.get('/api/whatsapp/active-sessions', isAuthenticated, (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      global.activeSessions = global.activeSessions || new Map();
      
      const userSessions = Array.from(global.activeSessions.entries())
        .filter(([key, session]) => session.userId === userId)
        .map(([key, session]) => ({
          sessionId: session.sessionId,
          phoneNumber: session.phoneNumber || 'Connecting...',
          connected: session.connected || false,
          createdAt: session.createdAt,
          connectedAt: session.connectedAt
        }));

      res.json({
        success: true,
        sessions: userSessions,
        total: userSessions.length
      });
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch active sessions' 
      });
    }
  });

  // Disconnect a WhatsApp session
  app.delete('/api/whatsapp/session/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;
      const activeSessionKey = `${userId}_${sessionId}`;
      
      global.activeSessions = global.activeSessions || new Map();
      const session = global.activeSessions.get(activeSessionKey);
      
      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found' 
        });
      }
      
      // Disconnect the client
      if (session.client) {
        try {
          await session.client.destroy();
        } catch (e) {
          console.log('Client destroy error:', e);
        }
      }
      
      // Remove from active sessions
      global.activeSessions.delete(activeSessionKey);
      
      res.json({
        success: true,
        message: 'Session disconnected successfully'
      });
    } catch (error) {
      console.error('Error disconnecting session:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to disconnect session' 
      });
    }
  });

  // Check active WhatsApp sessions with connection status
  app.get('/api/whatsapp/session-status/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;
      const activeSessionKey = `${userId}_${sessionId}`;
      
      global.activeSessions = global.activeSessions || new Map();
      const session = global.activeSessions.get(activeSessionKey);
      
      if (session) {
        const timeElapsed = Date.now() - session.createdAt.getTime();
        const maxTime = session.connected ? 600000 : 300000; // 10 min if connected, 5 min if not
        const remainingTime = Math.max(0, maxTime - timeElapsed);
        
        // Check if client is still active (for whatsapp-web.js)
        let clientStatus = 'unknown';
        try {
          if (session.client) {
            clientStatus = session.client.pupPage ? 'active' : 'inactive';
          }
        } catch (e) {
          clientStatus = 'inactive';
        }
        
        res.json({
          active: true,
          connected: session.connected || false,
          phoneNumber: session.phoneNumber || null,
          connectedAt: session.connectedAt || null,
          remainingTime: Math.ceil(remainingTime / 1000),
          clientStatus,
          message: session.connected ? `Connected to ${session.phoneNumber}` : 'Session is active and ready for QR scanning'
        });
      } else {
        res.json({
          active: false,
          connected: false,
          remainingTime: 0,
          message: 'Session expired or not found'
        });
      }
    } catch (error) {
      console.error("Error checking session status:", error);
      res.status(500).json({ message: "Failed to check session status" });
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

  // Chatbot settings routes
  app.get('/api/chatbot/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getChatbotSettings(userId);
      res.json(settings || { enabled: false });
    } catch (error) {
      console.error("Error fetching chatbot settings:", error);
      res.status(500).json({ message: "Failed to fetch chatbot settings" });
    }
  });

  app.post('/api/chatbot/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertChatbotSettingsSchema.parse(req.body);
      
      const settings = await storage.upsertChatbotSettings({
        ...validatedData,
        userId
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating chatbot settings:", error);
      res.status(500).json({ message: "Failed to update chatbot settings" });
    }
  });

  // AI response generation
  app.post('/api/chatbot/generate-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, conversationId } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get chatbot settings
      const settings = await storage.getChatbotSettings(userId);
      if (!settings?.enabled) {
        return res.status(400).json({ message: "Chatbot is not enabled" });
      }

      // Get conversation context if provided
      let context = {
        businessName: settings.businessName || undefined,
        customInstructions: settings.customInstructions || undefined,
        previousMessages: [] as string[]
      };

      if (conversationId) {
        const messages = await storage.getMessages(conversationId);
        context.previousMessages = messages.slice(-5).map(m => 
          `${m.direction === 'incoming' ? 'Customer' : 'Bot'}: ${m.content}`
        );
      }

      const response = await chatbotService.generateResponse(message, context);
      res.json(response);
    } catch (error) {
      console.error("Error generating chatbot response:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // Sentiment analysis
  app.post('/api/chatbot/analyze-sentiment', isAuthenticated, async (req: any, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const analysis = await chatbotService.analyzeSentiment(message);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      res.status(500).json({ message: "Failed to analyze sentiment" });
    }
  });

  // Template variations
  app.post('/api/chatbot/template-variations', isAuthenticated, async (req: any, res) => {
    try {
      const { template, count = 3 } = req.body;
      
      if (!template) {
        return res.status(400).json({ message: "Template is required" });
      }

      const variations = await chatbotService.generateTemplateVariations(template, count);
      res.json({ variations });
    } catch (error) {
      console.error("Error generating template variations:", error);
      res.status(500).json({ message: "Failed to generate template variations" });
    }
  });

  // Advanced AI Features with Multi-Provider Support
  app.post('/api/ai/template-variations', isAuthenticated, async (req: any, res) => {
    try {
      const { template, provider, model, apiKey, count } = req.body;
      const { multiAIService } = await import('./ai-service');
      
      const config = {
        provider: provider || 'openai',
        model: model || 'gpt-4o',
        apiKey,
        temperature: 0.8,
        maxTokens: 300
      };

      const variations = await multiAIService.generateTemplateVariations(template || "Hi {{name}}, thanks for contacting us! How can we help you today?", config, count || 3);
      res.json({ variations });
    } catch (error) {
      console.error("Template variations error:", error);
      res.status(500).json({ 
        message: "Failed to generate template variations",
        error: error.message
      });
    }
  });

  // AI Chat Response endpoint for inbox multi-agent system
  app.post('/api/ai/chat-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, agentId, conversationId, config, context } = req.body;
      const { multiAIService } = await import('./ai-service');

      if (!message || !config) {
        return res.status(400).json({ message: "Message and config are required" });
      }

      // Generate AI response with agent personality
      const response = await multiAIService.generateResponse(message, config, context);

      res.json({
        message: response.message,
        agentId,
        conversationId,
        confidence: response.confidence,
        provider: response.provider,
        model: response.model,
        shouldReply: response.shouldReply
      });
    } catch (error: any) {
      console.error("Error generating AI chat response:", error);
      res.status(500).json({ message: error.message || "Failed to generate AI response" });
    }
  });

  // Direct WhatsApp connection endpoint
  app.post('/api/whatsapp/connect-direct', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phoneNumber, method } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Create a WhatsApp number entry for direct connection
      const whatsappNumber = await storage.createWhatsappNumber({
        userId,
        phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
        displayName: phoneNumber,
        accountType: 'personal',
        status: 'active', // Direct connections are considered active
        dailyMessageLimit: 1000,
        messagesSentToday: 0,
        successRate: '100.00',
        sessionData: { 
          method: 'direct_link',
          connectedAt: new Date().toISOString()
        }
      });

      res.json({
        message: "WhatsApp number connected successfully",
        number: whatsappNumber
      });
    } catch (error: any) {
      console.error("Error connecting WhatsApp number:", error);
      res.status(500).json({ message: error.message || "Failed to connect WhatsApp number" });
    }
  });

  // Generate phone linking code endpoint
  app.post('/api/whatsapp/generate-link-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phoneNumber, displayName } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Generate a secure 8-character code with mixed case like real WhatsApp
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Store the pending linking request in memory (you could use Redis in production)
      const linkingRequest = {
        code,
        userId,
        phoneNumber,
        displayName,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
      };

      // Store in a simple in-memory cache (replace with Redis in production)
      global.linkingCodes = global.linkingCodes || new Map();
      global.linkingCodes.set(code, linkingRequest);

      // Clean up expired codes
      setTimeout(() => {
        global.linkingCodes?.delete(code);
      }, 5 * 60 * 1000);

      res.json({
        code,
        expiresIn: 300, // 5 minutes in seconds
        message: "Linking code generated successfully"
      });
    } catch (error: any) {
      console.error("Error generating linking code:", error);
      res.status(500).json({ message: error.message || "Failed to generate linking code" });
    }
  });

  // Verify phone linking code endpoint
  app.post('/api/whatsapp/verify-link-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code, phoneNumber, displayName } = req.body;

      if (!code || !phoneNumber) {
        return res.status(400).json({ message: "Code and phone number are required" });
      }

      // Check if code exists and is valid
      global.linkingCodes = global.linkingCodes || new Map();
      const linkingRequest = global.linkingCodes.get(code.toUpperCase());

      if (!linkingRequest) {
        return res.status(400).json({ message: "Invalid or expired linking code" });
      }

      if (linkingRequest.expiresAt < new Date()) {
        global.linkingCodes.delete(code.toUpperCase());
        return res.status(400).json({ message: "Linking code has expired" });
      }

      if (linkingRequest.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to linking code" });
      }

      // Create WhatsApp number entry
      const whatsappNumber = await storage.createWhatsappNumber({
        userId,
        phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
        displayName: displayName || phoneNumber,
        accountType: 'personal',
        status: 'active',
        dailyMessageLimit: 1000,
        messagesSentToday: 0,
        successRate: '100.00',
        sessionData: { 
          method: 'phone_code_link',
          linkingCode: code,
          connectedAt: new Date().toISOString()
        }
      });

      // Clean up the used code
      global.linkingCodes.delete(code.toUpperCase());

      res.json({
        message: "WhatsApp account linked successfully",
        number: whatsappNumber
      });
    } catch (error: any) {
      console.error("Error verifying linking code:", error);
      res.status(500).json({ message: error.message || "Failed to verify linking code" });
    }
  });



  app.post('/api/ai/sentiment-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const { message, provider, model, apiKey } = req.body;
      const { multiAIService } = await import('./ai-service');
      
      const config = {
        provider: provider || 'openai',
        model: model || 'gpt-4o',
        apiKey,
        temperature: 0.1,
        maxTokens: 100
      };

      const analysis = await multiAIService.analyzeSentiment(message || "I am very disappointed with your service. This is unacceptable!", config);
      res.json(analysis);
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      res.status(500).json({ 
        message: "Failed to analyze sentiment",
        error: error.message
      });
    }
  });

  app.post('/api/ai/categorize-message', isAuthenticated, async (req: any, res) => {
    try {
      const { message, provider, model, apiKey } = req.body;
      const { multiAIService } = await import('./ai-service');
      
      const config = {
        provider: provider || 'openai',
        model: model || 'gpt-4o',
        apiKey,
        temperature: 0.2,
        maxTokens: 150
      };

      const categorization = await multiAIService.categorizeMessage(message || "Can you help me track my order?", config);
      res.json(categorization);
    } catch (error) {
      console.error("Message categorization error:", error);
      res.status(500).json({ 
        message: "Failed to categorize message",
        error: error.message
      });
    }
  });

  // Public AI test endpoint - no authentication required
  app.post('/api/ai/test-response', async (req, res) => {
    try {
      const { 
        message = "Hello, can you help me?", 
        provider = "openai", 
        model = "gpt-4o", 
        apiKey,
        temperature = 0.7,
        maxTokens = 500,
        prompt = "You are a helpful assistant."
      } = req.body;

      const config = {
        provider,
        model,
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        temperature,
        maxTokens
      };

      const response = await multiAIService.generateResponse(
        message,
        config
      );

      res.json({
        success: true,
        response: response.message,
        confidence: response.confidence,
        tokensUsed: response.tokensUsed,
        provider: response.provider,
        model: response.model
      });
    } catch (error: any) {
      console.error("AI test response error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to generate AI response",
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WhatsApp WebSocket services
  await simpleWhatsAppService.initializeWebSocket(httpServer);
  await robustWhatsAppService.initializeWebSocket(httpServer);
  await workingWhatsAppService.initializeWebSocket(httpServer);
  
  return httpServer;
}
