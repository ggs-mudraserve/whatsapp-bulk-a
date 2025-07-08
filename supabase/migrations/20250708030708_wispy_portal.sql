/*
# Add Performance Indexes

1. New Indexes
  - Add indexes on foreign keys and frequently queried columns
  - Add indexes for search operations
  - Add indexes for timestamp sorting

2. Security
  - No changes to RLS policies

3. Changes
  - Add performance indexes to improve query speed
*/

-- Add index on users email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add indexes on whatsapp_numbers
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_user_id ON whatsapp_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_phone_number ON whatsapp_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_status ON whatsapp_numbers(status);

-- Add indexes on contact_groups
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON contact_groups(user_id);

-- Add indexes on contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_group_id ON contacts(group_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- Add indexes on templates
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);

-- Add indexes on campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at);

-- Add indexes on conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_number_id ON conversations(whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- Add indexes on messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Add indexes on anti_blocking_settings
CREATE INDEX IF NOT EXISTS idx_anti_blocking_settings_user_id ON anti_blocking_settings(user_id);

-- Add indexes on chatbot_settings
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_user_id ON chatbot_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_enabled ON chatbot_settings(enabled);