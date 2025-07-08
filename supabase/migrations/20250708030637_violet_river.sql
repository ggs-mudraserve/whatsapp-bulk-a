/*
# Initial Database Schema

1. New Tables
  - `users` - User accounts and profiles
  - `whatsapp_numbers` - Connected WhatsApp phone numbers
  - `contact_groups` - Groups for organizing contacts
  - `contacts` - Customer contact information
  - `templates` - Message templates
  - `campaigns` - Marketing campaigns
  - `conversations` - Chat conversations
  - `messages` - Individual messages
  - `chatbot_settings` - AI chatbot configuration

2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to access their own data

3. Changes
  - Initial schema creation
*/

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  time_zone TEXT DEFAULT 'America/New_York',
  email_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create whatsapp_numbers table
CREATE TABLE IF NOT EXISTS whatsapp_numbers (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  account_type TEXT DEFAULT 'personal',
  connection_type TEXT DEFAULT 'qr_code',
  status TEXT DEFAULT 'active',
  daily_message_limit INTEGER DEFAULT 100,
  messages_sent_today INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  last_activity TIMESTAMPTZ,
  session_data JSONB,
  provider_name TEXT,
  api_key TEXT,
  api_secret TEXT,
  webhook_url TEXT,
  business_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact_groups table
CREATE TABLE IF NOT EXISTS contact_groups (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES contact_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  tags JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  cta_buttons JSONB DEFAULT '[]',
  media_type TEXT,
  media_url TEXT,
  media_caption TEXT,
  tags JSONB DEFAULT '[]',
  language TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  estimated_read_time INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT,
  template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  template_ids JSONB DEFAULT '[]',
  whatsapp_number_id INTEGER REFERENCES whatsapp_numbers(id) ON DELETE SET NULL,
  whatsapp_number_ids JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  total_contacts INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  contact_ids JSONB DEFAULT '[]',
  target_groups JSONB DEFAULT '[]',
  target_contacts JSONB DEFAULT '[]',
  anti_blocking_settings JSONB DEFAULT '{"enabled": false}',
  message_delay_min INTEGER DEFAULT 2,
  message_delay_max INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  whatsapp_number_id INTEGER REFERENCES whatsapp_numbers(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  direction TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  media_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create anti_blocking_settings table
CREATE TABLE IF NOT EXISTS anti_blocking_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enable_message_delays BOOLEAN DEFAULT TRUE,
  enable_typing_simulation BOOLEAN DEFAULT TRUE,
  enable_auto_rotation BOOLEAN DEFAULT FALSE,
  message_delay_min INTEGER DEFAULT 2,
  message_delay_max INTEGER DEFAULT 8,
  daily_message_limit INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chatbot_settings table
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  business_name TEXT,
  custom_instructions TEXT,
  auto_reply_enabled BOOLEAN DEFAULT TRUE,
  sentiment_analysis_enabled BOOLEAN DEFAULT TRUE,
  response_delay INTEGER DEFAULT 5,
  max_response_length INTEGER DEFAULT 200,
  keyword_triggers TEXT[],
  ai_provider TEXT DEFAULT 'openai',
  ai_model TEXT DEFAULT 'gpt-4o',
  custom_api_key TEXT,
  temperature DOUBLE PRECISION DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 150,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_blocking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own data
CREATE POLICY "Users can access own data" ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id);

-- WhatsApp numbers
CREATE POLICY "Users can access own WhatsApp numbers" ON whatsapp_numbers
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Contact groups
CREATE POLICY "Users can access own contact groups" ON contact_groups
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Contacts
CREATE POLICY "Users can access own contacts" ON contacts
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Templates
CREATE POLICY "Users can access own templates" ON templates
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Campaigns
CREATE POLICY "Users can access own campaigns" ON campaigns
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Conversations
CREATE POLICY "Users can access own conversations" ON conversations
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Messages
CREATE POLICY "Users can access messages from their conversations" ON messages
  FOR ALL
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id::text = auth.uid()::text
    )
  );

-- Anti-blocking settings
CREATE POLICY "Users can access own anti-blocking settings" ON anti_blocking_settings
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Chatbot settings
CREATE POLICY "Users can access own chatbot settings" ON chatbot_settings
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);