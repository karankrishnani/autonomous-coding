export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string
          id: string
          last_run_at: string | null
          metadata: Json
          name: string
          next_run_at: string | null
          platform_connection_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_run_at?: string | null
          metadata?: Json
          name: string
          next_run_at?: string | null
          platform_connection_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_run_at?: string | null
          metadata?: Json
          name?: string
          next_run_at?: string | null
          platform_connection_id?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_platform_connection_id_fkey"
            columns: ["platform_connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      desktop_app_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          last_seen_at: string
          os_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          os_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          os_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desktop_app_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          created_at: string
          id: string
          text: string
          updated_at: string
          user_keyword_group_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          text: string
          updated_at?: string
          user_keyword_group_id: string
        }
        Update: {
          created_at?: string
          id?: string
          text?: string
          updated_at?: string
          user_keyword_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keywords_user_keyword_group_id_fkey"
            columns: ["user_keyword_group_id"]
            isOneToOne: false
            referencedRelation: "user_keyword_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          action: string
          created_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          first_viewed_at: string | null
          id: string
          matched_keywords: string[]
          post_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_viewed_at?: string | null
          id?: string
          matched_keywords: string[]
          post_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_viewed_at?: string | null
          id?: string
          matched_keywords?: string[]
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_events: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json
          occurred_at: string
          platform_connection_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          occurred_at?: string
          platform_connection_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          platform_connection_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_events_platform_connection_id_fkey"
            columns: ["platform_connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          metadata: Json
          platform: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          metadata?: Json
          platform: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          metadata?: Json
          platform?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          metadata: Json
          source_url: string | null
          timestamp: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          source_url?: string | null
          timestamp: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          source_url?: string | null
          timestamp?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_configs: {
        Row: {
          config: Json
          platform: string
          updated_at: string
          version: string
        }
        Insert: {
          config: Json
          platform: string
          updated_at?: string
          version: string
        }
        Update: {
          config?: Json
          platform?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      scrape_logs: {
        Row: {
          id: string
          platform_connection_id: string
          user_id: string
          status: string
          started_at: string
          completed_at: string | null
          messages_found: number
          leads_created: number
          error_message: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform_connection_id: string
          user_id: string
          status: string
          started_at?: string
          completed_at?: string | null
          messages_found?: number
          leads_created?: number
          error_message?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform_connection_id?: string
          user_id?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          messages_found?: number
          leads_created?: number
          error_message?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_logs_platform_connection_id_fkey"
            columns: ["platform_connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fingerprints: {
        Row: {
          collected_at: string
          created_at: string
          fingerprint: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collected_at?: string
          created_at?: string
          fingerprint: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          fingerprint?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fingerprints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_keyword_groups: {
        Row: {
          active: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_keyword_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

