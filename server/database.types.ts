export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          profile_image_url: string | null
          time_zone: string | null
          email_notifications: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          profile_image_url?: string | null
          time_zone?: string | null
          email_notifications?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          profile_image_url?: string | null
          time_zone?: string | null
          email_notifications?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_numbers: {
        Row: {
          id: number
          user_id: string
          phone_number: string
          display_name: string | null
          account_type: string | null
          connection_type: string | null
          status: string | null
          daily_message_limit: number | null
          messages_sent_today: number | null
          success_rate: number | null
          last_activity: string | null
          session_data: Json | null
          provider_name: string | null
          api_key: string | null
          api_secret: string | null
          webhook_url: string | null
          business_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          phone_number: string
          display_name?: string | null
          account_type?: string | null
          connection_type?: string | null
          status?: string | null
          daily_message_limit?: number | null
          messages_sent_today?: number | null
          success_rate?: number | null
          last_activity?: string | null
          session_data?: Json | null
          provider_name?: string | null
          api_key?: string | null
          api_secret?: string | null
          webhook_url?: string | null
          business_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          phone_number?: string
          display_name?: string | null
          account_type?: string | null
          connection_type?: string | null
          status?: string | null
          daily_message_limit?: number | null
          messages_sent_today?: number | null
          success_rate?: number | null
          last_activity?: string | null
          session_data?: Json | null
          provider_name?: string | null
          api_key?: string | null
          api_secret?: string | null
          webhook_url?: string | null
          business_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_numbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      contact_groups: {
        Row: {
          id: number
          user_id: string
          name: string
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      contacts: {
        Row: {
          id: number
          user_id: string
          group_id: number | null
          name: string
          phone_number: string
          email: string | null
          tags: Json | null
          status: string | null
          last_contacted_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          group_id?: number | null
          name: string
          phone_number: string
          email?: string | null
          tags?: Json | null
          status?: string | null
          last_contacted_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          group_id?: number | null
          name?: string
          phone_number?: string
          email?: string | null
          tags?: Json | null
          status?: string | null
          last_contacted_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      templates: {
        Row: {
          id: number
          user_id: string
          name: string
          category: string
          content: string
          variables: Json | null
          cta_buttons: Json | null
          media_type: string | null
          media_url: string | null
          media_caption: string | null
          tags: Json | null
          language: string | null
          is_active: boolean | null
          usage_count: number | null
          last_used: string | null
          estimated_read_time: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          category: string
          content: string
          variables?: Json | null
          cta_buttons?: Json | null
          media_type?: string | null
          media_url?: string | null
          media_caption?: string | null
          tags?: Json | null
          language?: string | null
          is_active?: boolean | null
          usage_count?: number | null
          last_used?: string | null
          estimated_read_time?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          category?: string
          content?: string
          variables?: Json | null
          cta_buttons?: Json | null
          media_type?: string | null
          media_url?: string | null
          media_caption?: string | null
          tags?: Json | null
          language?: string | null
          is_active?: boolean | null
          usage_count?: number | null
          last_used?: string | null
          estimated_read_time?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      campaigns: {
        Row: {
          id: number
          user_id: string
          name: string
          message: string | null
          template_id: number | null
          template_ids: Json | null
          whatsapp_number_id: number | null
          whatsapp_number_ids: Json | null
          status: string | null
          total_contacts: number | null
          messages_sent: number | null
          messages_delivered: number | null
          messages_failed: number | null
          messages_read: number | null
          scheduled_at: string | null
          started_at: string | null
          completed_at: string | null
          contact_ids: Json | null
          target_groups: Json | null
          target_contacts: Json | null
          anti_blocking_settings: Json | null
          message_delay_min: number | null
          message_delay_max: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          message?: string | null
          template_id?: number | null
          template_ids?: Json | null
          whatsapp_number_id?: number | null
          whatsapp_number_ids?: Json | null
          status?: string | null
          total_contacts?: number | null
          messages_sent?: number | null
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_read?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          contact_ids?: Json | null
          target_groups?: Json | null
          target_contacts?: Json | null
          anti_blocking_settings?: Json | null
          message_delay_min?: number | null
          message_delay_max?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          message?: string | null
          template_id?: number | null
          template_ids?: Json | null
          whatsapp_number_id?: number | null
          whatsapp_number_ids?: Json | null
          status?: string | null
          total_contacts?: number | null
          messages_sent?: number | null
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_read?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          contact_ids?: Json | null
          target_groups?: Json | null
          target_contacts?: Json | null
          anti_blocking_settings?: Json | null
          message_delay_min?: number | null
          message_delay_max?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: number
          user_id: string
          contact_id: number | null
          whatsapp_number_id: number | null
          contact_name: string
          contact_phone: string
          last_message: string | null
          last_message_at: string | null
          unread_count: number | null
          tags: Json | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          contact_id?: number | null
          whatsapp_number_id?: number | null
          contact_name: string
          contact_phone: string
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number | null
          tags?: Json | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          contact_id?: number | null
          whatsapp_number_id?: number | null
          contact_name?: string
          contact_phone?: string
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number | null
          tags?: Json | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: number
          conversation_id: number
          content: string
          message_type: string | null
          direction: string
          status: string | null
          media_url: string | null
          timestamp: string
          delivered_at: string | null
          read_at: string | null
          message_id: string | null
          created_at: string
        }
        Insert: {
          id?: number
          conversation_id: number
          content: string
          message_type?: string | null
          direction: string
          status?: string | null
          media_url?: string | null
          timestamp?: string
          delivered_at?: string | null
          read_at?: string | null
          message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          conversation_id?: number
          content?: string
          message_type?: string | null
          direction?: string
          status?: string | null
          media_url?: string | null
          timestamp?: string
          delivered_at?: string | null
          read_at?: string | null
          message_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      anti_blocking_settings: {
        Row: {
          id: number
          user_id: string
          enable_message_delays: boolean | null
          enable_typing_simulation: boolean | null
          enable_auto_rotation: boolean | null
          message_delay_min: number | null
          message_delay_max: number | null
          daily_message_limit: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          enable_message_delays?: boolean | null
          enable_typing_simulation?: boolean | null
          enable_auto_rotation?: boolean | null
          message_delay_min?: number | null
          message_delay_max?: number | null
          daily_message_limit?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          enable_message_delays?: boolean | null
          enable_typing_simulation?: boolean | null
          enable_auto_rotation?: boolean | null
          message_delay_min?: number | null
          message_delay_max?: number | null
          daily_message_limit?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anti_blocking_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      chatbot_settings: {
        Row: {
          id: number
          user_id: string
          enabled: boolean | null
          business_name: string | null
          custom_instructions: string | null
          auto_reply_enabled: boolean | null
          sentiment_analysis_enabled: boolean | null
          response_delay: number | null
          max_response_length: number | null
          keyword_triggers: string[] | null
          ai_provider: string | null
          ai_model: string | null
          custom_api_key: string | null
          temperature: number | null
          max_tokens: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          enabled?: boolean | null
          business_name?: string | null
          custom_instructions?: string | null
          auto_reply_enabled?: boolean | null
          sentiment_analysis_enabled?: boolean | null
          response_delay?: number | null
          max_response_length?: number | null
          keyword_triggers?: string[] | null
          ai_provider?: string | null
          ai_model?: string | null
          custom_api_key?: string | null
          temperature?: number | null
          max_tokens?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          enabled?: boolean | null
          business_name?: string | null
          custom_instructions?: string | null
          auto_reply_enabled?: boolean | null
          sentiment_analysis_enabled?: boolean | null
          response_delay?: number | null
          max_response_length?: number | null
          keyword_triggers?: string[] | null
          ai_provider?: string | null
          ai_model?: string | null
          custom_api_key?: string | null
          temperature?: number | null
          max_tokens?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          sid: string
          sess: Json
          expire: string
        }
        Insert: {
          sid: string
          sess: Json
          expire: string
        }
        Update: {
          sid?: string
          sess?: Json
          expire?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}