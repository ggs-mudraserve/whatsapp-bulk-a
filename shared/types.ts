import type { Database } from '../server/database.types';

// Extract types from Supabase database schema
export type User = Database['public']['Tables']['users']['Row'];
export type UpsertUser = Database['public']['Tables']['users']['Insert'];

export type WhatsappNumber = Database['public']['Tables']['whatsapp_numbers']['Row'];
export type InsertWhatsappNumber = Database['public']['Tables']['whatsapp_numbers']['Insert'];

export type ContactGroup = Database['public']['Tables']['contact_groups']['Row'];
export type InsertContactGroup = Database['public']['Tables']['contact_groups']['Insert'];

export type Contact = Database['public']['Tables']['contacts']['Row'];
export type InsertContact = Database['public']['Tables']['contacts']['Insert'];

export type Template = Database['public']['Tables']['templates']['Row'];
export type InsertTemplate = Database['public']['Tables']['templates']['Insert'];

export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type InsertCampaign = Database['public']['Tables']['campaigns']['Insert'];

export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type InsertConversation = Database['public']['Tables']['conversations']['Insert'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type InsertMessage = Database['public']['Tables']['messages']['Insert'];

export type AntiBlockingSettings = Database['public']['Tables']['anti_blocking_settings']['Row'];
export type InsertAntiBlockingSettings = Database['public']['Tables']['anti_blocking_settings']['Insert'];

export type ChatbotSettings = Database['public']['Tables']['chatbot_settings']['Row'];
export type InsertChatbotSettings = Database['public']['Tables']['chatbot_settings']['Insert']; 