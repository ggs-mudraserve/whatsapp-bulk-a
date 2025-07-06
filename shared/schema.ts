import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  timeZone: varchar("time_zone").default("America/New_York"),
  emailNotifications: boolean("email_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp numbers connected to the user
export const whatsappNumbers = pgTable("whatsapp_numbers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phoneNumber: varchar("phone_number").notNull(),
  displayName: varchar("display_name"),
  accountType: varchar("account_type").default("personal"), // personal, business
  connectionType: varchar("connection_type").default("qr_code"), // qr_code, facebook_api, provider
  status: varchar("status").default("active"), // active, limited, blocked, disconnected
  dailyMessageLimit: integer("daily_message_limit").default(100),
  messagesSentToday: integer("messages_sent_today").default(0),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default("0.00"),
  lastActivity: timestamp("last_activity"),
  sessionData: jsonb("session_data"),
  // Provider-specific fields
  providerName: varchar("provider_name"),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  webhookUrl: text("webhook_url"),
  businessId: varchar("business_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts database
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  email: varchar("email"),
  tags: jsonb("tags").$type<string[]>().default([]),
  status: varchar("status").default("active"), // active, blocked, inactive
  lastContactedAt: timestamp("last_contacted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message templates
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // promotional, follow-up, newsletter, events
  content: text("content").notNull(),
  ctaButtons: jsonb("cta_buttons").$type<{ text: string; url?: string; type: 'url' | 'phone' | 'text' }[]>().default([]),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketing campaigns
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  templateId: integer("template_id").references(() => templates.id, { onDelete: "set null" }),
  status: varchar("status").default("draft"), // draft, active, paused, completed, cancelled
  totalContacts: integer("total_contacts").default(0),
  messagesSent: integer("messages_sent").default(0),
  messagesDelivered: integer("messages_delivered").default(0),
  messagesFailed: integer("messages_failed").default(0),
  messagesRead: integer("messages_read").default(0),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  contactIds: jsonb("contact_ids").$type<number[]>().default([]),
  messageDelayMin: integer("message_delay_min").default(2),
  messageDelayMax: integer("message_delay_max").default(8),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations (inbox)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  whatsappNumberId: integer("whatsapp_number_id").references(() => whatsappNumbers.id, { onDelete: "set null" }),
  contactName: varchar("contact_name").notNull(),
  contactPhone: varchar("contact_phone").notNull(),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: integer("unread_count").default(0),
  tags: jsonb("tags").$type<string[]>().default([]),
  status: varchar("status").default("active"), // active, archived, blocked
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual messages in conversations
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // text, image, document, voice
  direction: varchar("direction").notNull(), // incoming, outgoing
  status: varchar("status").default("sent"), // sent, delivered, read, failed
  mediaUrl: varchar("media_url"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Anti-blocking settings
export const antiBlockingSettings = pgTable("anti_blocking_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  enableMessageDelays: boolean("enable_message_delays").default(true),
  enableTypingSimulation: boolean("enable_typing_simulation").default(true),
  enableAutoRotation: boolean("enable_auto_rotation").default(false),
  messageDelayMin: integer("message_delay_min").default(2),
  messageDelayMax: integer("message_delay_max").default(8),
  dailyMessageLimit: integer("daily_message_limit").default(100),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatbotSettings = pgTable("chatbot_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").default(false),
  businessName: varchar("business_name"),
  customInstructions: text("custom_instructions"),
  autoReplyEnabled: boolean("auto_reply_enabled").default(true),
  sentimentAnalysisEnabled: boolean("sentiment_analysis_enabled").default(true),
  responseDelay: integer("response_delay").default(5), // seconds
  maxResponseLength: integer("max_response_length").default(200),
  keywordTriggers: text("keyword_triggers").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  whatsappNumbers: many(whatsappNumbers),
  contacts: many(contacts),
  templates: many(templates),
  campaigns: many(campaigns),
  conversations: many(conversations),
  antiBlockingSettings: many(antiBlockingSettings),
  chatbotSettings: many(chatbotSettings),
}));

export const whatsappNumbersRelations = relations(whatsappNumbers, ({ one, many }) => ({
  user: one(users, { fields: [whatsappNumbers.userId], references: [users.id] }),
  conversations: many(conversations),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, { fields: [contacts.userId], references: [users.id] }),
  conversations: many(conversations),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  user: one(users, { fields: [templates.userId], references: [users.id] }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  user: one(users, { fields: [campaigns.userId], references: [users.id] }),
  template: one(templates, { fields: [campaigns.templateId], references: [templates.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  contact: one(contacts, { fields: [conversations.contactId], references: [contacts.id] }),
  whatsappNumber: one(whatsappNumbers, { fields: [conversations.whatsappNumberId], references: [whatsappNumbers.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const antiBlockingSettingsRelations = relations(antiBlockingSettings, ({ one }) => ({
  user: one(users, { fields: [antiBlockingSettings.userId], references: [users.id] }),
}));

export const chatbotSettingsRelations = relations(chatbotSettings, ({ one }) => ({
  user: one(users, { fields: [chatbotSettings.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertWhatsappNumberSchema = createInsertSchema(whatsappNumbers).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  lastActivity: z.date().optional()
});
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true, userId: true, usageCount: true, createdAt: true, updatedAt: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertAntiBlockingSettingsSchema = createInsertSchema(antiBlockingSettings).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertChatbotSettingsSchema = createInsertSchema(chatbotSettings).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type WhatsappNumber = typeof whatsappNumbers.$inferSelect;
export type InsertWhatsappNumber = z.infer<typeof insertWhatsappNumberSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AntiBlockingSettings = typeof antiBlockingSettings.$inferSelect;
export type InsertAntiBlockingSettings = z.infer<typeof insertAntiBlockingSettingsSchema>;
export type ChatbotSettings = typeof chatbotSettings.$inferSelect;
export type InsertChatbotSettings = z.infer<typeof insertChatbotSettingsSchema>;
