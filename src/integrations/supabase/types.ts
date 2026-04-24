export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          phone: string | null
          state: string | null
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          phone?: string | null
          state?: string | null
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          phone?: string | null
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_details: Json
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          order_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
          order_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
          order_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
          order_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by_receiver: boolean
          deleted_by_sender: boolean
          edited_at: string | null
          id: string
          is_read: boolean
          is_system_message: boolean
          message: string
          message_type: string
          order_id: string | null
          original_attachment_size: number | null
          original_attachment_type: string | null
          original_attachment_url: string | null
          original_message: string | null
          product_id: string | null
          seen_at: string | null
          sender_id: string
          vendor_id: string
        }
        Insert: {
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_receiver?: boolean
          deleted_by_sender?: boolean
          edited_at?: string | null
          id?: string
          is_read?: boolean
          is_system_message?: boolean
          message: string
          message_type?: string
          order_id?: string | null
          original_attachment_size?: number | null
          original_attachment_type?: string | null
          original_attachment_url?: string | null
          original_message?: string | null
          product_id?: string | null
          seen_at?: string | null
          sender_id: string
          vendor_id: string
        }
        Update: {
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_receiver?: boolean
          deleted_by_sender?: boolean
          edited_at?: string | null
          id?: string
          is_read?: boolean
          is_system_message?: boolean
          message?: string
          message_type?: string
          order_id?: string | null
          original_attachment_size?: number | null
          original_attachment_type?: string | null
          original_attachment_url?: string | null
          original_message?: string | null
          product_id?: string | null
          seen_at?: string | null
          sender_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cookie_consents: {
        Row: {
          analytics: boolean
          created_at: string
          essential: boolean
          id: string
          ip_country: string | null
          marketing: boolean
          preferences: boolean
          session_id: string
          user_id: string | null
        }
        Insert: {
          analytics?: boolean
          created_at?: string
          essential?: boolean
          id?: string
          ip_country?: string | null
          marketing?: boolean
          preferences?: boolean
          session_id: string
          user_id?: string | null
        }
        Update: {
          analytics?: boolean
          created_at?: string
          essential?: boolean
          id?: string
          ip_country?: string | null
          marketing?: boolean
          preferences?: boolean
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_notes: string | null
          closed_at: string | null
          id: string
          opened_at: string
          opened_by: string
          order_id: string
          reason: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          closed_at?: string | null
          id?: string
          opened_at?: string
          opened_by: string
          order_id: string
          reason: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          closed_at?: string | null
          id?: string
          opened_at?: string
          opened_by?: string
          order_id?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      hero_banners: {
        Row: {
          created_at: string
          cta_label: string | null
          desktop_image_url: string
          display_order: number
          ends_at: string | null
          id: string
          is_active: boolean
          link_url: string
          mobile_image_url: string | null
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          desktop_image_url: string
          display_order?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string
          mobile_image_url?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          desktop_image_url?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string
          mobile_image_url?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_edit_history: {
        Row: {
          edited_at: string
          edited_by: string
          id: string
          message_id: string
          new_text: string | null
          old_text: string | null
        }
        Insert: {
          edited_at?: string
          edited_by: string
          id?: string
          message_id: string
          new_text?: string | null
          old_text?: string | null
        }
        Update: {
          edited_at?: string
          edited_by?: string
          id?: string
          message_id?: string
          new_text?: string | null
          old_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_edit_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: string
          sender_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id: string
          sender_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string
          sender_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          status: string
          variant_id: string | null
          variant_options: Json | null
          vendor_id: string | null
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          quantity?: number
          status?: string
          variant_id?: string | null
          variant_options?: Json | null
          vendor_id?: string | null
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          status?: string
          variant_id?: string | null
          variant_options?: Json | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          payment_method: string | null
          payment_status: string
          shipping_address: Json | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          shipping_address?: Json | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          shipping_address?: Json | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          url: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          url: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          url?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          price: number | null
          product_id: string
          sku: string | null
          stock: number
          variant_options: Json
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number | null
          product_id: string
          sku?: string | null
          stock?: number
          variant_options?: Json
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
          variant_options?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          condition: string
          created_at: string
          deal_ends_at: string | null
          description: string | null
          featured: boolean
          id: string
          key_features: string[] | null
          name: string
          price: number
          sku: string | null
          slug: string
          status: string
          stock: number
          updated_at: string
          vendor_id: string
          video_url: string | null
          whats_in_box: string[] | null
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          condition?: string
          created_at?: string
          deal_ends_at?: string | null
          description?: string | null
          featured?: boolean
          id?: string
          key_features?: string[] | null
          name: string
          price: number
          sku?: string | null
          slug: string
          status?: string
          stock?: number
          updated_at?: string
          vendor_id: string
          video_url?: string | null
          whats_in_box?: string[] | null
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          condition?: string
          created_at?: string
          deal_ends_at?: string | null
          description?: string | null
          featured?: boolean
          id?: string
          key_features?: string[] | null
          name?: string
          price?: number
          sku?: string | null
          slug?: string
          status?: string
          stock?: number
          updated_at?: string
          vendor_id?: string
          video_url?: string | null
          whats_in_box?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          display_order: number
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          kind: string
          link_url: string
          placement: string
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          kind: string
          link_url?: string
          placement: string
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          kind?: string
          link_url?: string
          placement?: string
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          click_count: number
          code: string
          created_at: string
          created_by: string | null
          id: string
          target_url: string
        }
        Insert: {
          click_count?: number
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_url: string
        }
        Update: {
          click_count?: number
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_url?: string
        }
        Relationships: []
      }
      site_analytics_cache: {
        Row: {
          data: Json
          id: number
          updated_at: string | null
        }
        Insert: {
          data?: Json
          id?: number
          updated_at?: string | null
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          team_role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          team_role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          team_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_role_id_fkey"
            columns: ["team_role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      user_risk_flags: {
        Row: {
          created_at: string
          expires_at: string | null
          flag_type: string
          id: string
          reason: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          flag_type: string
          id?: string
          reason?: string | null
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          flag_type?: string
          id?: string
          reason?: string | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          product_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          product_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          product_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_analytics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_analytics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_follows: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_subscription_payments: {
        Row: {
          admin_notes: string | null
          created_at: string
          expires_days: number
          id: string
          max_listings: number
          notes: string | null
          payer_phone: string
          payment_method: string
          plan_name: string
          price: number
          status: string
          subscription_id: string | null
          transaction_code: string
          updated_at: string
          vendor_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          expires_days?: number
          id?: string
          max_listings?: number
          notes?: string | null
          payer_phone: string
          payment_method?: string
          plan_name: string
          price?: number
          status?: string
          subscription_id?: string | null
          transaction_code: string
          updated_at?: string
          vendor_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          expires_days?: number
          id?: string
          max_listings?: number
          notes?: string | null
          payer_phone?: string
          payment_method?: string
          plan_name?: string
          price?: number
          status?: string
          subscription_id?: string | null
          transaction_code?: string
          updated_at?: string
          vendor_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "vendor_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_subscription_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_subscription_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          max_listings: number
          plan_name: string
          price: number
          started_at: string
          status: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          max_listings?: number
          plan_name?: string
          price?: number
          started_at?: string
          status?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          max_listings?: number
          plan_name?: string
          price?: number
          started_at?: string
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_subscriptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_subscriptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_uploads: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          storage_path: string
          url: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          storage_path: string
          url: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          storage_path?: string
          url?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          banner_url: string | null
          commission_rate: number
          created_at: string
          id: string
          logo_url: string | null
          payment_details: Json | null
          phone: string | null
          phone2: string | null
          slug: string | null
          status: string
          store_description: string | null
          store_name: string
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          banner_url?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          logo_url?: string | null
          payment_details?: Json | null
          phone?: string | null
          phone2?: string | null
          slug?: string | null
          status?: string
          store_description?: string | null
          store_name: string
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          banner_url?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          logo_url?: string | null
          payment_details?: Json | null
          phone?: string | null
          phone2?: string | null
          slug?: string | null
          status?: string
          store_description?: string | null
          store_name?: string
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          id: string
          payment_details: Json | null
          payment_method: string
          processed_at: string | null
          requested_at: string
          status: string
          vendor_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          id?: string
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          vendor_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          id?: string
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vendors_public: {
        Row: {
          banner_url: string | null
          id: string | null
          logo_url: string | null
          status: string | null
          store_description: string | null
          store_name: string | null
        }
        Insert: {
          banner_url?: string | null
          id?: string | null
          logo_url?: string | null
          status?: string | null
          store_description?: string | null
          store_name?: string | null
        }
        Update: {
          banner_url?: string | null
          id?: string | null
          logo_url?: string | null
          status?: string | null
          store_description?: string | null
          store_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_message_originals: {
        Args: { _message_ids: string[] }
        Returns: {
          id: string
          original_attachment_size: number
          original_attachment_type: string
          original_attachment_url: string
          original_message: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_message_for_everyone: {
        Args: { _message_id: string }
        Returns: undefined
      }
      delete_message_for_me: {
        Args: { _message_id: string }
        Returns: undefined
      }
      edit_message: {
        Args: { _message_id: string; _new_text: string }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_public_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
        }[]
      }
      get_vendor_follower_count: { Args: { v_id: string }; Returns: number }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_short_link_click: {
        Args: { _code: string }
        Returns: undefined
      }
      log_system_event: {
        Args: { _details?: Json; _event_type: string; _order_id: string }
        Returns: undefined
      }
      mark_messages_seen: {
        Args: { _message_ids: string[] }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      open_dispute: {
        Args: { _order_id: string; _reason: string }
        Returns: string
      }
      order_has_open_dispute: { Args: { _order_id: string }; Returns: boolean }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      slugify: { Args: { _input: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "vendor" | "customer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendor", "customer"],
    },
  },
} as const
