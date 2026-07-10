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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_notifications: {
        Row: {
          body: string
          created_at: string | null
          dismissed: boolean | null
          id: string
          read: boolean | null
          title: string
          triggers: string[]
          user_id: string
          weather_data: Json
        }
        Insert: {
          body: string
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          read?: boolean | null
          title: string
          triggers: string[]
          user_id: string
          weather_data: Json
        }
        Update: {
          body?: string
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          read?: boolean | null
          title?: string
          triggers?: string[]
          user_id?: string
          weather_data?: Json
        }
        Relationships: []
      }
      episodes: {
        Row: {
          body_areas: string[]
          created_at: string
          date: string
          id: string
          notes: string | null
          severity: number
          triggers: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_areas: string[]
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          severity: number
          triggers?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_areas?: string[]
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          severity?: number
          triggers?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          embedding: string | null
          id: string
          source: string
          title: string | null
          tokens_count: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          source: string
          title?: string | null
          tokens_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          source?: string
          title?: string | null
          tokens_count?: number | null
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          email: string
          id: string
          source: string | null
          status: string
          subscribed_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          source?: string | null
          status?: string
          subscribed_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          source?: string | null
          status?: string
          subscribed_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          created_date: string
          id: string
          notification_type: string
          sent_at: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          created_date?: string
          id?: string
          notification_type: string
          sent_at?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_date?: string
          id?: string
          notification_type?: string
          sent_at?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          humidity_threshold: number | null
          id: string
          location_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          temperature_threshold: number | null
          updated_at: string | null
          user_id: string
          uv_threshold: number | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          humidity_threshold?: number | null
          id?: string
          location_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          temperature_threshold?: number | null
          updated_at?: string | null
          user_id: string
          uv_threshold?: number | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          humidity_threshold?: number | null
          id?: string
          location_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          temperature_threshold?: number | null
          updated_at?: string | null
          user_id?: string
          uv_threshold?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          biological_sex: string | null
          country: string | null
          created_at: string
          diagnosis_type: string | null
          display_name: string | null
          gender_identity: string | null
          id: string
          is_profile_complete: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          biological_sex?: string | null
          country?: string | null
          created_at?: string
          diagnosis_type?: string | null
          display_name?: string | null
          gender_identity?: string | null
          id?: string
          is_profile_complete?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          biological_sex?: string | null
          country?: string | null
          created_at?: string
          diagnosis_type?: string | null
          display_name?: string | null
          gender_identity?: string | null
          id?: string
          is_profile_complete?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          humidity_threshold: number | null
          id: string
          is_active: boolean | null
          last_reminder_sent_at: string | null
          latitude: number | null
          longitude: number | null
          p256dh: string
          temperature_threshold: number | null
          updated_at: string | null
          user_id: string | null
          uv_threshold: number | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          humidity_threshold?: number | null
          id?: string
          is_active?: boolean | null
          last_reminder_sent_at?: string | null
          latitude?: number | null
          longitude?: number | null
          p256dh: string
          temperature_threshold?: number | null
          updated_at?: string | null
          user_id?: string | null
          uv_threshold?: number | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          humidity_threshold?: number | null
          id?: string
          is_active?: boolean | null
          last_reminder_sent_at?: string | null
          latitude?: number | null
          longitude?: number | null
          p256dh?: string
          temperature_threshold?: number | null
          updated_at?: string | null
          user_id?: string | null
          uv_threshold?: number | null
        }
        Relationships: []
      }
      specialist_reviews: {
        Row: {
          comment: string | null
          compassion: number | null
          created_at: string | null
          hh_knowledge: number | null
          id: string
          rating: number | null
          specialist_id: string | null
          user_id: string | null
          verified_visit: boolean | null
        }
        Insert: {
          comment?: string | null
          compassion?: number | null
          created_at?: string | null
          hh_knowledge?: number | null
          id?: string
          rating?: number | null
          specialist_id?: string | null
          user_id?: string | null
          verified_visit?: boolean | null
        }
        Update: {
          comment?: string | null
          compassion?: number | null
          created_at?: string | null
          hh_knowledge?: number | null
          id?: string
          rating?: number | null
          specialist_id?: string | null
          user_id?: string | null
          verified_visit?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "specialist_reviews_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      specialists: {
        Row: {
          accepts_warrior_report: boolean | null
          address: string
          city: string
          clinic_name: string | null
          continent: string
          country: string
          country_code: string
          created_at: string | null
          email: string | null
          id: string
          is_ihs_verified: boolean | null
          is_nds_member: boolean | null
          is_telehealth: boolean | null
          languages: string[] | null
          lat: number
          lng: number
          name: string
          phone: string | null
          source: string | null
          specialty: string
          state: string | null
          tier: string | null
          treatments: string[] | null
          updated_at: string | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          accepts_warrior_report?: boolean | null
          address: string
          city: string
          clinic_name?: string | null
          continent: string
          country: string
          country_code: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_ihs_verified?: boolean | null
          is_nds_member?: boolean | null
          is_telehealth?: boolean | null
          languages?: string[] | null
          lat: number
          lng: number
          name: string
          phone?: string | null
          source?: string | null
          specialty?: string
          state?: string | null
          tier?: string | null
          treatments?: string[] | null
          updated_at?: string | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          accepts_warrior_report?: boolean | null
          address?: string
          city?: string
          clinic_name?: string | null
          continent?: string
          country?: string
          country_code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_ihs_verified?: boolean | null
          is_nds_member?: boolean | null
          is_telehealth?: boolean | null
          languages?: string[] | null
          lat?: number
          lng?: number
          name?: string
          phone?: string | null
          source?: string | null
          specialty?: string
          state?: string | null
          tier?: string | null
          treatments?: string[] | null
          updated_at?: string | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          daily_reminders: boolean | null
          data_sharing: boolean | null
          id: string
          reminder_time: string | null
          trigger_alerts: boolean | null
          updated_at: string
          user_id: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          daily_reminders?: boolean | null
          data_sharing?: boolean | null
          id?: string
          reminder_time?: string | null
          trigger_alerts?: boolean | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          daily_reminders?: boolean | null
          data_sharing?: boolean | null
          id?: string
          reminder_time?: string | null
          trigger_alerts?: boolean | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_notification_count: {
        Args: { p_date: string; p_user_id: string }
        Returns: undefined
      }
      keep_alive: { Args: never; Returns: undefined }
      search_knowledge_base: {
        Args: {
          filter_category?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          source: string
          title: string
        }[]
      }
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
  public: {
    Enums: {},
  },
} as const
