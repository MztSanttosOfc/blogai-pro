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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string
          details: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      articles: {
        Row: {
          blogger_post_id: string | null
          blogger_post_url: string | null
          content: string
          created_at: string
          faq: Json
          headings: Json
          id: string
          images: Json
          keyword: string
          language: string
          meta_description: string
          status: Database["public"]["Enums"]["article_status"]
          tags: string[]
          title: string
          tone: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          blogger_post_id?: string | null
          blogger_post_url?: string | null
          content?: string
          created_at?: string
          faq?: Json
          headings?: Json
          id?: string
          images?: Json
          keyword: string
          language?: string
          meta_description?: string
          status?: Database["public"]["Enums"]["article_status"]
          tags?: string[]
          title?: string
          tone?: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          blogger_post_id?: string | null
          blogger_post_url?: string | null
          content?: string
          created_at?: string
          faq?: Json
          headings?: Json
          id?: string
          images?: Json
          keyword?: string
          language?: string
          meta_description?: string
          status?: Database["public"]["Enums"]["article_status"]
          tags?: string[]
          title?: string
          tone?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      blog_checks: {
        Row: {
          created_at: string
          id: string
          report: Json
          score: number
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report?: Json
          score?: number
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report?: Json
          score?: number
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      blogger_connections: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          id: string
          refresh_token: string | null
          selected_blog_id: string | null
          selected_blog_name: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string | null
          selected_blog_id?: string | null
          selected_blog_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string | null
          selected_blog_id?: string | null
          selected_blog_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          lesson_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          lesson_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          lesson_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          description: string
          id: string
          type: Database["public"]["Enums"]["credit_txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          description?: string
          id?: string
          type: Database["public"]["Enums"]["credit_txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          description?: string
          id?: string
          type?: Database["public"]["Enums"]["credit_txn_type"]
          user_id?: string
        }
        Relationships: []
      }
      financial_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          level: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          level?: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          level?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          external_id: string | null
          id: string
          metadata: Json
          method: string
          paid_at: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          plan_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json
          method?: string
          paid_at?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          plan_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json
          method?: string
          paid_at?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          features: Json
          id: string
          is_unlimited: boolean
          monthly_credits: number
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          features?: Json
          id: string
          is_unlimited?: boolean
          monthly_credits?: number
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          is_unlimited?: boolean
          monthly_credits?: number
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          credits: number
          email: string | null
          full_name: string | null
          id: string
          plan: Database["public"]["Enums"]["user_plan"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          email?: string | null
          full_name?: string | null
          id: string
          plan?: Database["public"]["Enums"]["user_plan"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          email?: string | null
          full_name?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      reward_completions: {
        Row: {
          correct_answers: number
          created_at: string
          credits_awarded: number
          id: string
          mission_id: string
          read_seconds: number
          score: number
          scroll_percent: number
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_answers?: number
          created_at?: string
          credits_awarded?: number
          id?: string
          mission_id: string
          read_seconds?: number
          score?: number
          scroll_percent?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          correct_answers?: number
          created_at?: string
          credits_awarded?: number
          id?: string
          mission_id?: string
          read_seconds?: number
          score?: number
          scroll_percent?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_completions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "reward_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_missions: {
        Row: {
          category: string
          completion_count: number
          content: string
          created_at: string
          credits: number
          difficulty: string
          estimated_read_seconds: number
          excerpt: string
          external_id: string
          id: string
          published_at: string | null
          quiz: Json | null
          read_count: number
          source: string
          status: string
          title: string
          updated_at: string
          url: string
          word_count: number
        }
        Insert: {
          category?: string
          completion_count?: number
          content?: string
          created_at?: string
          credits?: number
          difficulty?: string
          estimated_read_seconds?: number
          excerpt?: string
          external_id: string
          id?: string
          published_at?: string | null
          quiz?: Json | null
          read_count?: number
          source?: string
          status?: string
          title: string
          updated_at?: string
          url: string
          word_count?: number
        }
        Update: {
          category?: string
          completion_count?: number
          content?: string
          created_at?: string
          credits?: number
          difficulty?: string
          estimated_read_seconds?: number
          excerpt?: string
          external_id?: string
          id?: string
          published_at?: string | null
          quiz?: Json | null
          read_count?: number
          source?: string
          status?: string
          title?: string
          updated_at?: string
          url?: string
          word_count?: number
        }
        Relationships: []
      }
      reward_settings: {
        Row: {
          auto_approve: boolean
          blog_url: string
          content_source: string
          credits_by_category: Json
          credits_by_difficulty: Json
          credits_per_article: number
          daily_credit_limit: number
          daily_mission_limit: number
          eligible_categories: string[]
          enabled: boolean
          id: boolean
          min_scroll_percent: number
          pass_threshold: number
          seconds_per_100_words: number
          updated_at: string
        }
        Insert: {
          auto_approve?: boolean
          blog_url?: string
          content_source?: string
          credits_by_category?: Json
          credits_by_difficulty?: Json
          credits_per_article?: number
          daily_credit_limit?: number
          daily_mission_limit?: number
          eligible_categories?: string[]
          enabled?: boolean
          id?: boolean
          min_scroll_percent?: number
          pass_threshold?: number
          seconds_per_100_words?: number
          updated_at?: string
        }
        Update: {
          auto_approve?: boolean
          blog_url?: string
          content_source?: string
          credits_by_category?: Json
          credits_by_difficulty?: Json
          credits_per_article?: number
          daily_credit_limit?: number
          daily_mission_limit?: number
          eligible_categories?: string[]
          enabled?: boolean
          id?: boolean
          min_scroll_percent?: number
          pass_threshold?: number
          seconds_per_100_words?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          blogger_post_id: string | null
          blogger_post_url: string | null
          content: string
          created_at: string
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blogger_post_id?: string | null
          blogger_post_url?: string | null
          content?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blogger_post_id?: string | null
          blogger_post_url?: string | null
          content?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          blog_name: string
          contact_email: string
          created_at: string
          domain: string
          niche: string
          owner_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blog_name?: string
          contact_email?: string
          created_at?: string
          domain?: string
          niche?: string
          owner_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blog_name?: string
          contact_email?: string
          created_at?: string
          domain?: string
          niche?: string
          owner_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          syncpay_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          syncpay_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          syncpay_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_payment: {
        Args: { p_external_id?: string; p_payment_id: string }
        Returns: Json
      }
      admin_adjust_credits: {
        Args: {
          p_amount: number
          p_mode: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_list_audit_logs: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string
          details: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          target_email: string | null
          target_user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_audit_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          credits: number
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          plan: Database["public"]["Enums"]["user_plan"]
          role: Database["public"]["Enums"]["app_role"]
          subscription_status: string
        }[]
      }
      admin_set_plan: {
        Args: {
          p_plan: Database["public"]["Enums"]["user_plan"]
          p_user_id: string
        }
        Returns: Json
      }
      admin_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      reward_admin_list_missions: { Args: never; Returns: Json }
      reward_admin_set_status: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      reward_admin_stats: { Args: never; Returns: Json }
      reward_admin_update_settings: { Args: { p: Json }; Returns: Json }
      reward_claim: {
        Args: {
          p_correct: number
          p_mission_id: string
          p_read_seconds: number
          p_scroll_percent: number
          p_total: number
        }
        Returns: Json
      }
      reward_config: { Args: never; Returns: Json }
      reward_get_mission: { Args: { p_id: string }; Returns: Json }
      reward_list_missions: { Args: never; Returns: Json }
      reward_save_quiz: {
        Args: { p_id: string; p_quiz: Json }
        Returns: undefined
      }
      reward_upsert_mission: { Args: { p: Json }; Returns: Json }
    }
    Enums: {
      app_role: "owner" | "admin" | "user"
      article_status: "draft" | "published"
      credit_txn_type:
        | "grant"
        | "consume"
        | "renewal"
        | "purchase"
        | "adjustment"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "canceled"
      subscription_status: "active" | "pending" | "canceled" | "expired"
      user_plan: "free" | "pro" | "premium" | "teste"
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
      app_role: ["owner", "admin", "user"],
      article_status: ["draft", "published"],
      credit_txn_type: [
        "grant",
        "consume",
        "renewal",
        "purchase",
        "adjustment",
      ],
      payment_status: ["pending", "paid", "failed", "refunded", "canceled"],
      subscription_status: ["active", "pending", "canceled", "expired"],
      user_plan: ["free", "pro", "premium", "teste"],
    },
  },
} as const
