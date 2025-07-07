import { storage } from "./storage";
import { persistentWhatsAppService } from "./whatsapp-persistent";
import type { Campaign, Contact } from "@shared/schema";

interface CampaignExecutionContext {
  campaign: Campaign;
  contacts: Contact[];
  whatsappClients: Map<string, any>; // phoneNumber -> client
  executionStartTime: Date;
  numberUsageStats: Map<string, {
    messagesLastHour: number;
    lastUsed: Date;
    totalSent: number;
  }>;
  currentNumberIndex: number;
}

export class CampaignExecutor {
  private executingCampaigns = new Map<number, CampaignExecutionContext>();

  async startCampaign(campaignId: number): Promise<void> {
    console.log(`Starting campaign execution for ID: ${campaignId}`);
    
    try {
      // Get campaign details
      const campaigns = await storage.getCampaigns("");
      const campaign = campaigns.find(c => c.id === campaignId);
      
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        throw new Error(`Campaign ${campaignId} is in ${campaign.status} status and cannot be started`);
      }

      // Get target contacts
      const allContacts = await storage.getContacts(campaign.userId);
      let targetContacts: Contact[] = [];

      // Add contacts from selected groups
      if (campaign.targetGroups && Array.isArray(campaign.targetGroups)) {
        const groupContacts = allContacts.filter(contact => 
          campaign.targetGroups.includes(contact.groupId)
        );
        targetContacts.push(...groupContacts);
      }

      // Add individually selected contacts
      if (campaign.targetContacts && Array.isArray(campaign.targetContacts)) {
        const individualContacts = allContacts.filter(contact => 
          campaign.targetContacts.includes(contact.id)
        );
        targetContacts.push(...individualContacts);
      }

      // Remove duplicates based on contact ID
      targetContacts = targetContacts.filter((contact, index, self) => 
        index === self.findIndex(c => c.id === contact.id)
      );

      // Filter out blocked contacts
      targetContacts = targetContacts.filter(contact => contact.status !== 'blocked');

      if (targetContacts.length === 0) {
        throw new Error(`No valid target contacts found for campaign ${campaignId}`);
      }

      // Update campaign status and statistics
      await storage.updateCampaign(campaignId, {
        status: 'active',
        startedAt: new Date(),
        totalContacts: targetContacts.length,
        messagesSent: 0,
        messagesDelivered: 0,
        messagesFailed: 0,
      });

      // Initialize WhatsApp clients and usage statistics  
      const whatsappClients = new Map<string, any>();
      const numberUsageStats = new Map<string, any>();
      
      // Get available WhatsApp numbers for this user
      const whatsappNumbers = await storage.getWhatsappNumbers(campaign.userId);
      const connectedNumbers = whatsappNumbers.filter(number => number.status === 'connected');
      
      // Get active WhatsApp sessions
      const sessions = persistentWhatsAppService.getActiveClients();
      
      for (const number of connectedNumbers) {
        const sessionKey = Object.keys(sessions).find(key => 
          key.includes(number.phoneNumber.replace(/\D/g, '')) || 
          sessions[key]?.phoneNumber === number.phoneNumber
        );
        
        if (sessionKey && sessions[sessionKey]) {
          whatsappClients.set(number.phoneNumber, sessions[sessionKey]);
          numberUsageStats.set(number.phoneNumber, {
            messagesLastHour: 0,
            lastUsed: new Date(0), // Long time ago
            totalSent: 0
          });
          console.log(`✓ WhatsApp client ready for number: ${number.phoneNumber}`);
        }
      }
      
      if (whatsappClients.size === 0) {
        throw new Error(`No connected WhatsApp numbers available for campaign ${campaignId}`);
      } else {
        console.log(`✓ ${whatsappClients.size} WhatsApp numbers available for campaign`);
      }

      // Create execution context
      const context: CampaignExecutionContext = {
        campaign,
        contacts: targetContacts,
        whatsappClients,
        numberUsageStats,
        currentNumberIndex: 0,
        executionStartTime: new Date(),
      };

      this.executingCampaigns.set(campaignId, context);

      // Start message sending process
      this.executeMessaging(context);

    } catch (error) {
      console.error(`Failed to start campaign ${campaignId}:`, error);
      
      // Update campaign status to failed
      try {
        await storage.updateCampaign(campaignId, {
          status: 'cancelled',
          completedAt: new Date(),
        });
      } catch (updateError) {
        console.error(`Failed to update campaign status:`, updateError);
      }
      
      throw error;
    }
  }

  private async executeMessaging(context: CampaignExecutionContext): Promise<void> {
    const { campaign, contacts, whatsappClients, numberUsageStats } = context;
    let sentCount = 0;
    let failedCount = 0;
    let deliveredCount = 0;

    console.log(`Executing messaging for campaign "${campaign.name}" to ${contacts.length} contacts`);

    try {
      // Get the message content
      let messageContent = campaign.message;
      if (campaign.templateId) {
        const templates = await storage.getTemplates(campaign.userId);
        const template = templates.find(t => t.id === campaign.templateId);
        if (template) {
          messageContent = template.content;
        }
      }

      if (!messageContent) {
        throw new Error("No message content found for campaign");
      }

      console.log(`✓ ${whatsappClients.size} WhatsApp numbers available for campaign`);
      console.log(`📝 Message content: ${messageContent.substring(0, 100)}...`);

      // Shuffle contacts if randomization is enabled
      const antiBlockingSettings = campaign.antiBlockingSettings as any;
      let processContacts = [...contacts];
      if (antiBlockingSettings?.randomizeMessageOrder) {
        processContacts = this.shuffleArray(processContacts);
        console.log("📝 Randomized message order for anti-blocking");
      }

      // Process each contact with advanced anti-blocking
      for (let i = 0; i < processContacts.length; i++) {
        const contact = processContacts[i];
        
        try {
          // Check business hours if enabled
          if (antiBlockingSettings?.respectBusinessHours && !this.isBusinessHours(antiBlockingSettings)) {
            console.log("⏰ Outside business hours, skipping message");
            continue;
          }

          // Skip weekends if enabled
          if (antiBlockingSettings?.skipWeekends && this.isWeekend()) {
            console.log("📅 Weekend detected, skipping message");
            continue;
          }

          console.log(`Sending message to contact ${i + 1}/${processContacts.length}: ${contact.name} (${contact.phoneNumber})`);

          // Select optimal WhatsApp number using advanced rotation
          const selectedNumber = this.selectOptimalWhatsAppNumber(context, antiBlockingSettings);
          const whatsappClient = selectedNumber ? whatsappClients.get(selectedNumber) : null;

          // Create or get conversation for this contact
          const conversations = await storage.getConversations(campaign.userId);
          let conversation = conversations.find(c => c.contactPhone === contact.phoneNumber);
          
          if (!conversation) {
            // Find the WhatsApp number ID for the selected number
            const whatsappNumbers = await storage.getWhatsappNumbers(campaign.userId);
            const selectedWhatsAppNumberRecord = whatsappNumbers.find(n => n.phoneNumber === selectedNumber);
            
            conversation = await storage.createConversation({
              userId: campaign.userId,
              contactId: contact.id,
              whatsappNumberId: selectedWhatsAppNumberRecord?.id || null,
              contactName: contact.name,
              contactPhone: contact.phoneNumber,
              lastMessage: messageContent,
              lastMessageAt: new Date(),
            });
          }

          // Simulate typing if enabled
          if (antiBlockingSettings?.simulateTyping && whatsappClient) {
            const typingDuration = Math.random() * 3000 + 1000; // 1-4 seconds
            console.log(`⌨️ Simulating typing for ${Math.round(typingDuration)}ms`);
            await this.delay(typingDuration);
          }

          // Send the message via WhatsApp
          let messageStatus = 'sent';
          let messageId = `campaign_${campaign.id}_${Date.now()}_${i}`;
          let usedNumber = selectedNumber || 'none';

          if (whatsappClient && selectedNumber) {
            try {
              const formattedNumber = contact.phoneNumber.replace(/\D/g, '');
              const whatsappId = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@c.us`;
              
              const result = await whatsappClient.sendMessage(whatsappId, messageContent);
              messageId = result.id || messageId;
              messageStatus = 'sent';
              deliveredCount++;
              
              // Update number usage stats
              const stats = numberUsageStats.get(selectedNumber)!;
              stats.messagesLastHour++;
              stats.lastUsed = new Date();
              stats.totalSent++;
              
              console.log(`✓ Message sent to ${contact.phoneNumber} via ${selectedNumber}`);
            } catch (whatsappError) {
              console.error(`Failed to send WhatsApp message to ${contact.phoneNumber}:`, whatsappError);
              messageStatus = 'failed';
              failedCount++;
            }
          } else {
            console.log(`⚠ No WhatsApp client available, message logged for ${contact.phoneNumber}`);
          }

          // Store the message in the database
          await storage.createMessage({
            conversationId: conversation.id,
            content: messageContent,
            direction: 'outgoing',
            status: messageStatus,
            messageId: messageId,
            timestamp: new Date(),
          });

          sentCount++;

          // Update campaign progress
          await storage.updateCampaign(campaign.id, {
            messagesSent: sentCount,
            messagesDelivered: deliveredCount,
            messagesFailed: failedCount,
          });

          // Apply advanced anti-blocking delays
          if (i < processContacts.length - 1) {
            await this.applyAdvancedAntiBlockingDelay(campaign, context, usedNumber);
          }

        } catch (contactError) {
          console.error(`Failed to send message to contact ${contact.phoneNumber}:`, contactError);
          failedCount++;
          
          // Update campaign with failed count
          await storage.updateCampaign(campaign.id, {
            messagesSent: sentCount,
            messagesDelivered: deliveredCount,
            messagesFailed: failedCount,
          });
        }
      }

      // Mark campaign as completed
      await storage.updateCampaign(campaign.id, {
        status: 'completed',
        completedAt: new Date(),
        messagesSent: sentCount,
        messagesDelivered: deliveredCount,
        messagesFailed: failedCount,
      });

      console.log(`✓ Campaign "${campaign.name}" completed successfully`);
      console.log(`  Total contacts: ${contacts.length}`);
      console.log(`  Messages sent: ${sentCount}`);
      console.log(`  Messages delivered: ${deliveredCount}`);
      console.log(`  Messages failed: ${failedCount}`);

    } catch (error) {
      console.error(`Campaign execution failed:`, error);
      
      // Mark campaign as failed
      await storage.updateCampaign(campaign.id, {
        status: 'cancelled',
        completedAt: new Date(),
        messagesSent: sentCount,
        messagesDelivered: deliveredCount,
        messagesFailed: failedCount,
      });
    } finally {
      // Remove from executing campaigns
      this.executingCampaigns.delete(campaign.id);
    }
  }

  private selectOptimalWhatsAppNumber(context: CampaignExecutionContext, settings: any): string | null {
    const { whatsappClients, numberUsageStats } = context;
    
    if (whatsappClients.size === 0) return null;
    
    const availableNumbers = Array.from(whatsappClients.keys());
    
    // If not using multiple numbers, use the first available
    if (!settings?.useMultipleNumbers) {
      return availableNumbers[0];
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const maxMessagesPerHour = settings.messagesPerNumberPerHour || 20;

    // Filter numbers that haven't exceeded hourly limits
    const eligibleNumbers = availableNumbers.filter(number => {
      const stats = numberUsageStats.get(number)!;
      
      // Reset hourly count if it's been more than an hour
      if (stats.lastUsed < oneHourAgo) {
        stats.messagesLastHour = 0;
      }
      
      return stats.messagesLastHour < maxMessagesPerHour;
    });

    if (eligibleNumbers.length === 0) {
      console.log("⚠ All numbers have reached hourly limits, using least used number");
      // Use the number with the lowest usage in the last hour
      return availableNumbers.reduce((min, current) => {
        const minStats = numberUsageStats.get(min)!;
        const currentStats = numberUsageStats.get(current)!;
        return currentStats.messagesLastHour < minStats.messagesLastHour ? current : min;
      });
    }

    // Apply rotation strategy
    switch (settings.numberRotationStrategy) {
      case 'random':
        return eligibleNumbers[Math.floor(Math.random() * eligibleNumbers.length)];
      
      case 'load_balanced':
        // Select the number with the lowest total usage
        return eligibleNumbers.reduce((min, current) => {
          const minStats = numberUsageStats.get(min)!;
          const currentStats = numberUsageStats.get(current)!;
          return currentStats.totalSent < minStats.totalSent ? current : min;
        });
      
      case 'sequential':
      default:
        // Round-robin selection
        context.currentNumberIndex = (context.currentNumberIndex + 1) % eligibleNumbers.length;
        return eligibleNumbers[context.currentNumberIndex];
    }
  }

  private async applyAdvancedAntiBlockingDelay(campaign: Campaign, context: CampaignExecutionContext, usedNumber: string): Promise<void> {
    const settings = campaign.antiBlockingSettings as any;
    
    if (!settings?.enabled) {
      // Default minimal delay even if anti-blocking is disabled
      await this.delay(1000);
      return;
    }

    let delayMs = 5000; // Default 5 seconds

    // Base delay calculation
    if (settings.messageDelay) {
      delayMs = settings.messageDelay * 1000;
    }

    if (settings.randomizeDelay && settings.delayRange) {
      const [min, max] = settings.delayRange;
      const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
      delayMs = randomDelay * 1000;
    }

    // Add extra delay for number rotation
    if (settings.useMultipleNumbers && settings.cooldownBetweenNumbers && usedNumber !== 'none') {
      const numberStats = context.numberUsageStats.get(usedNumber);
      if (numberStats && numberStats.messagesLastHour > 0) {
        const extraDelay = settings.cooldownBetweenNumbers * 1000;
        delayMs += extraDelay;
        console.log(`🔄 Added ${extraDelay}ms cooldown for number rotation`);
      }
    }

    // Add human-like variability (±20%)
    const variability = 0.2;
    const variation = (Math.random() - 0.5) * 2 * variability;
    delayMs = Math.round(delayMs * (1 + variation));

    console.log(`⏳ Applying advanced anti-blocking delay: ${delayMs}ms`);
    await this.delay(delayMs);
  }

  private applyAntiBlockingDelay(campaign: Campaign): Promise<void> {
    // Legacy method for backward compatibility
    return this.applyAdvancedAntiBlockingDelay(campaign, {} as any, 'none');
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private isBusinessHours(settings: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(settings.businessHoursStart?.split(':')[0] || '9');
    const endHour = parseInt(settings.businessHoursEnd?.split(':')[0] || '17');
    
    return currentHour >= startHour && currentHour < endHour;
  }

  private isWeekend(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async pauseCampaign(campaignId: number): Promise<void> {
    const context = this.executingCampaigns.get(campaignId);
    if (context) {
      await storage.updateCampaign(campaignId, { status: 'paused' });
      // Note: This is a basic implementation. In a production system,
      // you'd want to implement proper pause/resume functionality
    }
  }

  async stopCampaign(campaignId: number): Promise<void> {
    const context = this.executingCampaigns.get(campaignId);
    if (context) {
      await storage.updateCampaign(campaignId, { 
        status: 'cancelled',
        completedAt: new Date()
      });
      this.executingCampaigns.delete(campaignId);
    }
  }

  getExecutingCampaigns(): number[] {
    return Array.from(this.executingCampaigns.keys());
  }
}

export const campaignExecutor = new CampaignExecutor();