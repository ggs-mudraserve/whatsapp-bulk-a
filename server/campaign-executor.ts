import { storage } from "./storage";
import { persistentWhatsAppService } from "./whatsapp-persistent";
import type { Campaign, Contact } from "@shared/schema";

interface CampaignExecutionContext {
  campaign: Campaign;
  contacts: Contact[];
  whatsappClient?: any;
  executionStartTime: Date;
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

      // Create execution context
      const context: CampaignExecutionContext = {
        campaign,
        contacts: targetContacts,
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
    const { campaign, contacts } = context;
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

      // Get WhatsApp client if whatsappNumberId is provided
      let whatsappClient = null;
      if (campaign.whatsappNumberId) {
        const whatsappNumbers = await storage.getWhatsappNumbers(campaign.userId);
        const whatsappNumber = whatsappNumbers.find(n => n.id === campaign.whatsappNumberId);
        
        if (whatsappNumber && whatsappNumber.status === 'connected') {
          // Get the active session for this number
          const sessions = persistentWhatsAppService.getActiveClients();
          const sessionKey = Object.keys(sessions).find(key => 
            key.includes(whatsappNumber.phoneNumber.replace(/\D/g, ''))
          );
          
          if (sessionKey) {
            whatsappClient = sessions[sessionKey];
            console.log(`Using WhatsApp client for number: ${whatsappNumber.phoneNumber}`);
          }
        }
      }

      // Process each contact with anti-blocking delays
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        try {
          console.log(`Sending message to contact ${i + 1}/${contacts.length}: ${contact.name} (${contact.phoneNumber})`);

          // Create or get conversation for this contact
          const conversations = await storage.getConversations(campaign.userId);
          let conversation = conversations.find(c => c.contactPhone === contact.phoneNumber);
          
          if (!conversation) {
            conversation = await storage.createConversation({
              userId: campaign.userId,
              contactId: contact.id,
              whatsappNumberId: campaign.whatsappNumberId,
              contactName: contact.name,
              contactPhone: contact.phoneNumber,
              lastMessage: messageContent,
              lastMessageAt: new Date(),
            });
          }

          // Send the message via WhatsApp if client is available
          let messageStatus = 'sent';
          let messageId = `campaign_${campaign.id}_${Date.now()}_${i}`;

          if (whatsappClient) {
            try {
              const formattedNumber = contact.phoneNumber.replace(/\D/g, '');
              const whatsappId = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@c.us`;
              
              const result = await whatsappClient.sendMessage(whatsappId, messageContent);
              messageId = result.id || messageId;
              messageStatus = 'sent';
              deliveredCount++;
              
              console.log(`✓ Message sent to ${contact.phoneNumber} via WhatsApp`);
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

          // Apply anti-blocking delays
          if (i < contacts.length - 1) { // Don't delay after the last message
            await this.applyAntiBlockingDelay(campaign);
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

  private async applyAntiBlockingDelay(campaign: Campaign): Promise<void> {
    const settings = campaign.antiBlockingSettings as any;
    
    if (!settings?.enabled) {
      // Default minimal delay even if anti-blocking is disabled
      await this.delay(1000);
      return;
    }

    let delayMs = 5000; // Default 5 seconds

    if (settings.messageDelay) {
      delayMs = settings.messageDelay * 1000;
    }

    if (settings.randomizeDelay && settings.delayRange) {
      const [min, max] = settings.delayRange;
      const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
      delayMs = randomDelay * 1000;
    }

    console.log(`Applying anti-blocking delay: ${delayMs}ms`);
    await this.delay(delayMs);
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