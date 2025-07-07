import {
  users,
  whatsappNumbers,
  contactGroups,
  contacts,
  templates,
  campaigns,
  conversations,
  messages,
  antiBlockingSettings,
  type User,
  type UpsertUser,
  type WhatsappNumber,
  type InsertWhatsappNumber,
  type ContactGroup,
  type InsertContactGroup,
  type Contact,
  type InsertContact,
  type Template,
  type InsertTemplate,
  type Campaign,
  type InsertCampaign,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type AntiBlockingSettings,
  type InsertAntiBlockingSettings,
  chatbotSettings,
  type ChatbotSettings,
  type InsertChatbotSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // WhatsApp numbers
  getWhatsappNumbers(userId: string): Promise<WhatsappNumber[]>;
  createWhatsappNumber(number: InsertWhatsappNumber): Promise<WhatsappNumber>;
  updateWhatsappNumber(id: number, updates: Partial<WhatsappNumber>): Promise<WhatsappNumber>;
  deleteWhatsappNumber(id: number): Promise<void>;
  
  // Contact Groups
  getContactGroups(userId: string): Promise<ContactGroup[]>;
  createContactGroup(group: InsertContactGroup & { userId: string }): Promise<ContactGroup>;
  updateContactGroup(id: number, updates: Partial<ContactGroup>): Promise<ContactGroup>;
  deleteContactGroup(id: number): Promise<void>;
  
  // Contacts
  getContacts(userId: string): Promise<Contact[]>;
  createContact(contact: InsertContact & { userId: string }): Promise<Contact>;
  updateContact(id: number, updates: Partial<Contact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;
  bulkCreateContacts(contacts: (InsertContact & { userId: string })[]): Promise<Contact[]>;
  deleteContacts(ids: number[]): Promise<void>;
  bulkCreateContacts(contacts: (InsertContact & { userId: string })[]): Promise<Contact[]>;
  
  // Templates
  getTemplates(userId: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate & { userId: string }): Promise<Template>;
  updateTemplate(id: number, updates: Partial<Template>): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;
  
  // Campaigns
  getCampaigns(userId: string): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign & { userId: string }): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: number): Promise<void>;
  
  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation & { userId: string }): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation>;
  
  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Anti-blocking settings
  getAntiBlockingSettings(userId: string): Promise<AntiBlockingSettings | undefined>;
  upsertAntiBlockingSettings(settings: InsertAntiBlockingSettings & { userId: string }): Promise<AntiBlockingSettings>;
  
  // Chatbot settings
  getChatbotSettings(userId: string): Promise<ChatbotSettings | undefined>;
  createChatbotSettings(settings: InsertChatbotSettings & { userId: string }): Promise<ChatbotSettings>;
  upsertChatbotSettings(settings: InsertChatbotSettings & { userId: string }): Promise<ChatbotSettings>;
  
  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    readRate: number;
    activeNumbers: number;
    activeCampaigns: number;
    scheduledCampaigns: number;
    completedCampaigns: number;
    totalContacts: number;
    activeContacts: number;
    taggedContacts: number;
    blockedContacts: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // WhatsApp numbers
  async getWhatsappNumbers(userId: string): Promise<WhatsappNumber[]> {
    return await db
      .select()
      .from(whatsappNumbers)
      .where(eq(whatsappNumbers.userId, userId))
      .orderBy(desc(whatsappNumbers.createdAt));
  }

  async createWhatsappNumber(number: InsertWhatsappNumber): Promise<WhatsappNumber> {
    const [result] = await db
      .insert(whatsappNumbers)
      .values({
        ...number,
        lastActivity: new Date(),
      })
      .returning();
    return result;
  }

  async updateWhatsappNumber(id: number, updates: Partial<WhatsappNumber>): Promise<WhatsappNumber> {
    const [result] = await db
      .update(whatsappNumbers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(whatsappNumbers.id, id))
      .returning();
    return result;
  }

  async deleteWhatsappNumber(id: number): Promise<void> {
    await db.delete(whatsappNumbers).where(eq(whatsappNumbers.id, id));
  }

  // Contact Groups
  async getContactGroups(userId: string): Promise<ContactGroup[]> {
    return await db
      .select()
      .from(contactGroups)
      .where(eq(contactGroups.userId, userId))
      .orderBy(desc(contactGroups.createdAt));
  }

  async createContactGroup(group: InsertContactGroup & { userId: string }): Promise<ContactGroup> {
    const [result] = await db
      .insert(contactGroups)
      .values([group])
      .returning();
    return result;
  }

  async updateContactGroup(id: number, updates: Partial<ContactGroup>): Promise<ContactGroup> {
    const [result] = await db
      .update(contactGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contactGroups.id, id))
      .returning();
    return result;
  }

  async deleteContactGroup(id: number): Promise<void> {
    // First, remove group assignment from contacts
    await db
      .update(contacts)
      .set({ groupId: null })
      .where(eq(contacts.groupId, id));
    
    // Then delete the group
    await db.delete(contactGroups).where(eq(contactGroups.id, id));
  }

  // Contacts
  async getContacts(userId: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.createdAt));
  }

  async createContact(contact: InsertContact & { userId: string }): Promise<Contact> {
    const [result] = await db
      .insert(contacts)
      .values([contact])
      .returning();
    return result;
  }

  async updateContact(id: number, updates: Partial<Contact>): Promise<Contact> {
    const [result] = await db
      .update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return result;
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async bulkCreateContacts(contactList: (InsertContact & { userId: string })[]): Promise<Contact[]> {
    if (contactList.length === 0) return [];
    
    const result = await db.insert(contacts).values(contactList).returning();
    return result;
  }

  async deleteContacts(ids: number[]): Promise<void> {
    await db.delete(contacts).where(inArray(contacts.id, ids));
  }

  async bulkCreateContacts(contactsData: (InsertContact & { userId: string })[]): Promise<Contact[]> {
    if (contactsData.length === 0) return [];
    
    const results = await db
      .insert(contacts)
      .values(contactsData)
      .returning();
    return results;
  }

  // Templates
  async getTemplates(userId: string): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(desc(templates.createdAt));
  }

  async createTemplate(template: InsertTemplate & { userId: string }): Promise<Template> {
    const [result] = await db
      .insert(templates)
      .values([template])
      .returning();
    return result;
  }

  async updateTemplate(id: number, updates: Partial<Template>): Promise<Template> {
    const [result] = await db
      .update(templates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return result;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Campaigns
  async getCampaigns(userId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(campaign: InsertCampaign & { userId: string }): Promise<Campaign> {
    const [result] = await db
      .insert(campaigns)
      .values([campaign])
      .returning();
    return result;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const [result] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return result;
  }

  async deleteCampaign(id: number): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Conversations
  async getConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async createConversation(conversation: InsertConversation & { userId: string }): Promise<Conversation> {
    const [result] = await db
      .insert(conversations)
      .values([conversation])
      .returning();
    return result;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    const [result] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result;
  }

  async deleteConversation(id: number): Promise<void> {
    // Delete all messages first
    await db.delete(messages).where(eq(messages.conversationId, id));
    // Delete the conversation
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  // Messages
  async getMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [result] = await db
      .insert(messages)
      .values(message)
      .returning();
    return result;
  }

  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'read') {
      updateData.readAt = new Date();
    }
    
    await db.update(messages)
      .set(updateData)
      .where(eq(messages.messageId, messageId));
  }

  async markMessagesAsRead(conversationId: number): Promise<void> {
    await db.update(messages)
      .set({ 
        status: 'read',
        readAt: new Date()
      })
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.direction, 'incoming')
      ));
  }

  // Anti-blocking settings
  async getAntiBlockingSettings(userId: string): Promise<AntiBlockingSettings | undefined> {
    const [settings] = await db
      .select()
      .from(antiBlockingSettings)
      .where(eq(antiBlockingSettings.userId, userId));
    return settings;
  }

  async upsertAntiBlockingSettings(settings: InsertAntiBlockingSettings & { userId: string }): Promise<AntiBlockingSettings> {
    const [result] = await db
      .insert(antiBlockingSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: antiBlockingSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    readRate: number;
    activeNumbers: number;
    activeCampaigns: number;
    scheduledCampaigns: number;
    completedCampaigns: number;
    totalContacts: number;
    activeContacts: number;
    taggedContacts: number;
    blockedContacts: number;
  }> {
    // Get campaign stats
    const campaignStats = await db
      .select({
        totalSent: sql<number>`sum(${campaigns.messagesSent})`,
        totalDelivered: sql<number>`sum(${campaigns.messagesDelivered})`,
        totalRead: sql<number>`sum(${campaigns.messagesRead})`,
        activeCampaigns: sql<number>`count(case when ${campaigns.status} = 'active' then 1 end)`,
        scheduledCampaigns: sql<number>`count(case when ${campaigns.status} = 'scheduled' then 1 end)`,
        completedCampaigns: sql<number>`count(case when ${campaigns.status} = 'completed' then 1 end)`,
      })
      .from(campaigns)
      .where(eq(campaigns.userId, userId));

    // Get WhatsApp numbers stats
    const numbersStats = await db
      .select({
        activeNumbers: count(),
      })
      .from(whatsappNumbers)
      .where(and(eq(whatsappNumbers.userId, userId), eq(whatsappNumbers.status, 'active')));

    // Get contacts stats
    const contactsStats = await db
      .select({
        totalContacts: count(),
        activeContacts: sql<number>`count(case when ${contacts.status} = 'active' then 1 end)`,
        taggedContacts: sql<number>`count(case when jsonb_array_length(${contacts.tags}) > 0 then 1 end)`,
        blockedContacts: sql<number>`count(case when ${contacts.status} = 'blocked' then 1 end)`,
      })
      .from(contacts)
      .where(eq(contacts.userId, userId));

    const campaign = campaignStats[0] || {};
    const numbers = numbersStats[0] || {};
    const contactsData = contactsStats[0] || {};

    const totalSent = Number(campaign.totalSent) || 0;
    const totalDelivered = Number(campaign.totalDelivered) || 0;
    const totalRead = Number(campaign.totalRead) || 0;
    const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;

    return {
      totalSent,
      totalDelivered,
      readRate: Math.round(readRate),
      activeNumbers: Number(numbers.activeNumbers) || 0,
      activeCampaigns: Number(campaign.activeCampaigns) || 0,
      scheduledCampaigns: Number(campaign.scheduledCampaigns) || 0,
      completedCampaigns: Number(campaign.completedCampaigns) || 0,
      totalContacts: Number(contactsData.totalContacts) || 0,
      activeContacts: Number(contactsData.activeContacts) || 0,
      taggedContacts: Number(contactsData.taggedContacts) || 0,
      blockedContacts: Number(contactsData.blockedContacts) || 0,
    };
  }

  async getChatbotSettings(userId: string): Promise<ChatbotSettings | undefined> {
    console.log('Getting chatbot settings for user:', userId);
    const [settings] = await db.select().from(chatbotSettings).where(eq(chatbotSettings.userId, userId));
    console.log('Chatbot settings result:', settings);
    return settings;
  }

  async createChatbotSettings(settingsData: InsertChatbotSettings & { userId: string }): Promise<ChatbotSettings> {
    const [settings] = await db
      .insert(chatbotSettings)
      .values(settingsData)
      .returning();
    return settings;
  }

  async upsertChatbotSettings(settingsData: InsertChatbotSettings & { userId: string }): Promise<ChatbotSettings> {
    const [settings] = await db
      .insert(chatbotSettings)
      .values(settingsData)
      .onConflictDoUpdate({
        target: chatbotSettings.userId,
        set: {
          ...settingsData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return settings;
  }
}

export const storage = new DatabaseStorage();
