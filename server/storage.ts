import type {
  User,
  UpsertUser,
  WhatsappNumber,
  InsertWhatsappNumber,
  ContactGroup,
  InsertContactGroup,
  Contact,
  InsertContact,
  Template,
  InsertTemplate,
  Campaign,
  InsertCampaign,
  Conversation,
  InsertConversation,
  Message,
  InsertMessage,
  AntiBlockingSettings,
  InsertAntiBlockingSettings,
  ChatbotSettings,
  InsertChatbotSettings,
} from "../shared/types";

// Import Supabase storage implementation
import { SupabaseStorage } from './storage-supabase';

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
  
  // Templates
  getTemplates(userId: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate & { userId: string }): Promise<Template>;
  updateTemplate(id: number, updates: Partial<Template>): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;
  
  // Campaigns
  getCampaigns(userId: string): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign & { userId: string }): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: number, userId?: string): Promise<void>;
  
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

// Always use Supabase storage since we removed Neon/Drizzle
console.log("Using Supabase storage implementation");
export const storage = new SupabaseStorage();
