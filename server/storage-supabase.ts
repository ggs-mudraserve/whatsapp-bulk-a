import { supabase } from './db';
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
} from "@shared/schema";
import { IStorage } from './storage';

export class SupabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return undefined;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
    
    return data as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await supabase
      .from('users')
      .upsert([{
        ...userData,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
    
    return data as User;
  }

  async deleteUser(id: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // WhatsApp numbers
  async getWhatsappNumbers(userId: string): Promise<WhatsappNumber[]> {
    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting WhatsApp numbers:', error);
      return [];
    }
    
    // Remove duplicates by phone number, keeping the most recent one
    const uniqueNumbers = data.filter((num, index, arr) => 
      arr.findIndex(n => n.phone_number === num.phone_number) === index
    );
    
    return uniqueNumbers as WhatsappNumber[];
  }

  async createWhatsappNumber(number: InsertWhatsappNumber): Promise<WhatsappNumber> {
    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .insert([{
        ...number,
        last_activity: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating WhatsApp number:', error);
      throw error;
    }
    
    return data as WhatsappNumber;
  }

  async updateWhatsappNumber(id: number, updates: Partial<WhatsappNumber>): Promise<WhatsappNumber> {
    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating WhatsApp number:', error);
      throw error;
    }
    
    return data as WhatsappNumber;
  }

  async deleteWhatsappNumber(id: number): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_numbers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting WhatsApp number:', error);
      throw error;
    }
  }

  // Contact Groups
  async getContactGroups(userId: string): Promise<ContactGroup[]> {
    const { data, error } = await supabase
      .from('contact_groups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting contact groups:', error);
      return [];
    }
    
    return data as ContactGroup[];
  }

  async createContactGroup(group: InsertContactGroup & { userId: string }): Promise<ContactGroup> {
    const { data, error } = await supabase
      .from('contact_groups')
      .insert([{
        user_id: group.userId,
        name: group.name,
        description: group.description,
        color: group.color
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating contact group:', error);
      throw error;
    }
    
    return data as ContactGroup;
  }

  async updateContactGroup(id: number, updates: Partial<ContactGroup>): Promise<ContactGroup> {
    const { data, error } = await supabase
      .from('contact_groups')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating contact group:', error);
      throw error;
    }
    
    return data as ContactGroup;
  }

  async deleteContactGroup(id: number): Promise<void> {
    // First, remove group assignment from contacts
    await supabase
      .from('contacts')
      .update({ group_id: null })
      .eq('group_id', id);
    
    // Then delete the group
    const { error } = await supabase
      .from('contact_groups')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting contact group:', error);
      throw error;
    }
  }

  // Contacts
  async getContacts(userId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
    
    return data as Contact[];
  }

  async createContact(contact: InsertContact & { userId: string }): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        user_id: contact.userId,
        group_id: contact.groupId,
        name: contact.name,
        phone_number: contact.phoneNumber,
        email: contact.email,
        tags: contact.tags,
        status: contact.status,
        notes: contact.notes
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
    
    return data as Contact;
  }

  async updateContact(id: number, updates: Partial<Contact>): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
    
    return data as Contact;
  }

  async deleteContact(id: number): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  async bulkCreateContacts(contactList: (InsertContact & { userId: string })[]): Promise<Contact[]> {
    if (contactList.length === 0) return [];
    
    const formattedContacts = contactList.map(contact => ({
      user_id: contact.userId,
      group_id: contact.groupId,
      name: contact.name,
      phone_number: contact.phoneNumber,
      email: contact.email,
      tags: contact.tags,
      status: contact.status,
      notes: contact.notes
    }));
    
    const { data, error } = await supabase
      .from('contacts')
      .insert(formattedContacts)
      .select();
    
    if (error) {
      console.error('Error bulk creating contacts:', error);
      throw error;
    }
    
    return data as Contact[];
  }

  async deleteContacts(ids: number[]): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .in('id', ids);
    
    if (error) {
      console.error('Error deleting contacts:', error);
      throw error;
    }
  }

  // Templates
  async getTemplates(userId: string): Promise<Template[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting templates:', error);
      return [];
    }
    
    return data as Template[];
  }

  async createTemplate(template: InsertTemplate & { userId: string }): Promise<Template> {
    const { data, error } = await supabase
      .from('templates')
      .insert([{
        user_id: template.userId,
        name: template.name,
        category: template.category,
        content: template.content,
        variables: template.variables,
        cta_buttons: template.ctaButtons,
        media_type: template.mediaType,
        media_url: template.mediaUrl,
        media_caption: template.mediaCaption,
        tags: template.tags,
        language: template.language,
        is_active: template.isActive,
        estimated_read_time: template.estimatedReadTime
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }
    
    return data as Template;
  }

  async updateTemplate(id: number, updates: Partial<Template>): Promise<Template> {
    const { data, error } = await supabase
      .from('templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }
    
    return data as Template;
  }

  async deleteTemplate(id: number): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // Campaigns
  async getCampaigns(userId: string): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting campaigns:', error);
      return [];
    }
    
    return data as Campaign[];
  }

  async createCampaign(campaign: InsertCampaign & { userId: string }): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        user_id: campaign.userId,
        name: campaign.name,
        message: campaign.message,
        template_id: campaign.templateId,
        template_ids: campaign.templateIds,
        whatsapp_number_id: campaign.whatsappNumberId,
        whatsapp_number_ids: campaign.whatsappNumberIds,
        status: campaign.status,
        total_contacts: campaign.totalContacts,
        messages_sent: campaign.messagesSent,
        messages_delivered: campaign.messagesDelivered,
        messages_failed: campaign.messagesFailed,
        messages_read: campaign.messagesRead,
        scheduled_at: campaign.scheduledAt,
        target_groups: campaign.targetGroups,
        target_contacts: campaign.targetContacts,
        anti_blocking_settings: campaign.antiBlockingSettings,
        message_delay_min: campaign.messageDelayMin,
        message_delay_max: campaign.messageDelayMax
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
    
    return data as Campaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
    
    return data as Campaign;
  }

  async deleteCampaign(id: number, userId?: string): Promise<void> {
    const query = supabase
      .from('campaigns')
      .delete();
    
    if (userId) {
      query.eq('user_id', userId).eq('id', id);
    } else {
      query.eq('id', id);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  // Conversations
  async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });
    
    if (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
    
    return data as Conversation[];
  }

  async createConversation(conversation: InsertConversation & { userId: string }): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert([{
        user_id: conversation.userId,
        contact_id: conversation.contactId,
        whatsapp_number_id: conversation.whatsappNumberId,
        contact_name: conversation.contactName,
        contact_phone: conversation.contactPhone,
        last_message: conversation.lastMessage,
        last_message_at: conversation.lastMessageAt,
        unread_count: conversation.unreadCount,
        tags: conversation.tags,
        status: conversation.status
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
    
    return data as Conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
    
    return data as Conversation;
  }

  async deleteConversation(id: number): Promise<void> {
    // Delete all messages first
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', id);
    
    // Delete the conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Messages
  async getMessages(conversationId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error('Error getting messages:', error);
      return [];
    }
    
    return data as Message[];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating message:', error);
      throw error;
    }
    
    return data as Message;
  }

  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'read') {
      updateData.read_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('message_id', messageId);
    
    if (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  async markMessagesAsRead(conversationId: number): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('direction', 'incoming');
    
    if (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Anti-blocking settings
  async getAntiBlockingSettings(userId: string): Promise<AntiBlockingSettings | undefined> {
    const { data, error } = await supabase
      .from('anti_blocking_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return undefined;
      }
      console.error('Error getting anti-blocking settings:', error);
      return undefined;
    }
    
    return data as AntiBlockingSettings;
  }

  async upsertAntiBlockingSettings(settings: InsertAntiBlockingSettings & { userId: string }): Promise<AntiBlockingSettings> {
    const { data, error } = await supabase
      .from('anti_blocking_settings')
      .upsert([{
        user_id: settings.userId,
        enable_message_delays: settings.enableMessageDelays,
        enable_typing_simulation: settings.enableTypingSimulation,
        enable_auto_rotation: settings.enableAutoRotation,
        message_delay_min: settings.messageDelayMin,
        message_delay_max: settings.messageDelayMax,
        daily_message_limit: settings.dailyMessageLimit,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error upserting anti-blocking settings:', error);
      throw error;
    }
    
    return data as AntiBlockingSettings;
  }

  // Chatbot settings
  async getChatbotSettings(userId: string): Promise<ChatbotSettings | undefined> {
    const { data, error } = await supabase
      .from('chatbot_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return undefined;
      }
      console.error('Error getting chatbot settings:', error);
      return undefined;
    }
    
    return data as ChatbotSettings;
  }

  async createChatbotSettings(settingsData: InsertChatbotSettings & { userId: string }): Promise<ChatbotSettings> {
    const { data, error } = await supabase
      .from('chatbot_settings')
      .insert([{
        user_id: settingsData.userId,
        enabled: settingsData.enabled,
        business_name: settingsData.businessName,
        custom_instructions: settingsData.customInstructions,
        auto_reply_enabled: settingsData.autoReplyEnabled,
        sentiment_analysis_enabled: settingsData.sentimentAnalysisEnabled,
        response_delay: settingsData.responseDelay,
        max_response_length: settingsData.maxResponseLength,
        keyword_triggers: settingsData.keywordTriggers,
        ai_provider: settingsData.aiProvider,
        ai_model: settingsData.aiModel,
        custom_api_key: settingsData.customApiKey,
        temperature: settingsData.temperature,
        max_tokens: settingsData.maxTokens
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating chatbot settings:', error);
      throw error;
    }
    
    return data as ChatbotSettings;
  }

  async upsertChatbotSettings(settingsData: InsertChatbotSettings & { userId: string }): Promise<ChatbotSettings> {
    const { data, error } = await supabase
      .from('chatbot_settings')
      .upsert([{
        user_id: settingsData.userId,
        enabled: settingsData.enabled,
        business_name: settingsData.businessName,
        custom_instructions: settingsData.customInstructions,
        auto_reply_enabled: settingsData.autoReplyEnabled,
        sentiment_analysis_enabled: settingsData.sentimentAnalysisEnabled,
        response_delay: settingsData.responseDelay,
        max_response_length: settingsData.maxResponseLength,
        keyword_triggers: settingsData.keywordTriggers,
        ai_provider: settingsData.aiProvider,
        ai_model: settingsData.aiModel,
        custom_api_key: settingsData.customApiKey,
        temperature: settingsData.temperature,
        max_tokens: settingsData.maxTokens,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error upserting chatbot settings:', error);
      throw error;
    }
    
    return data as ChatbotSettings;
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
    const { data: campaignStats, error: campaignError } = await supabase
      .from('campaigns')
      .select('status, messages_sent, messages_delivered, messages_read')
      .eq('user_id', userId);
    
    if (campaignError) {
      console.error('Error getting campaign stats:', campaignError);
      return {
        totalSent: 0,
        totalDelivered: 0,
        readRate: 0,
        activeNumbers: 0,
        activeCampaigns: 0,
        scheduledCampaigns: 0,
        completedCampaigns: 0,
        totalContacts: 0,
        activeContacts: 0,
        taggedContacts: 0,
        blockedContacts: 0
      };
    }
    
    // Get WhatsApp numbers stats
    const { data: numbersData, error: numbersError } = await supabase
      .from('whatsapp_numbers')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (numbersError) {
      console.error('Error getting WhatsApp numbers stats:', numbersError);
    }
    
    // Get contacts stats
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('id, status, tags')
      .eq('user_id', userId);
    
    if (contactsError) {
      console.error('Error getting contacts stats:', contactsError);
    }
    
    // Calculate stats
    const totalSent = campaignStats?.reduce((sum, campaign) => sum + (campaign.messages_sent || 0), 0) || 0;
    const totalDelivered = campaignStats?.reduce((sum, campaign) => sum + (campaign.messages_delivered || 0), 0) || 0;
    const totalRead = campaignStats?.reduce((sum, campaign) => sum + (campaign.messages_read || 0), 0) || 0;
    const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;
    
    const activeCampaigns = campaignStats?.filter(c => c.status === 'active').length || 0;
    const scheduledCampaigns = campaignStats?.filter(c => c.status === 'scheduled').length || 0;
    const completedCampaigns = campaignStats?.filter(c => c.status === 'completed').length || 0;
    
    const totalContacts = contactsData?.length || 0;
    const activeContacts = contactsData?.filter(c => c.status === 'active').length || 0;
    const taggedContacts = contactsData?.filter(c => c.tags && (c.tags as string[]).length > 0).length || 0;
    const blockedContacts = contactsData?.filter(c => c.status === 'blocked').length || 0;
    
    return {
      totalSent,
      totalDelivered,
      readRate: Math.round(readRate),
      activeNumbers: numbersData?.length || 0,
      activeCampaigns,
      scheduledCampaigns,
      completedCampaigns,
      totalContacts,
      activeContacts,
      taggedContacts,
      blockedContacts
    };
  }
}

// Export a singleton instance
export const supabaseStorage = new SupabaseStorage();