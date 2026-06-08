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
      assets: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          category?: string
          created_at?: string
          id: string
          name: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      budget_alerts: {
        Row: {
          category: string
          created_at: string
          id: string
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          threshold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          balance: number
          created_at: string
          id: string
          limit: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id: string
          limit?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          limit?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_cards: {
        Row: {
          created_at: string
          id: string
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          amount: number
          biweekly: boolean
          created_at: string
          due_day: number | null
          expense_card_id: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          biweekly?: boolean
          created_at?: string
          due_day?: number | null
          expense_card_id: string
          id: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          biweekly?: boolean
          created_at?: string
          due_day?: number | null
          expense_card_id?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_expense_card_id_fkey"
            columns: ["expense_card_id"]
            isOneToOne: false
            referencedRelation: "expense_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          account_id: string
          created_at: string
          id: string
          target_amount: number
          target_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id: string
          target_amount?: number
          target_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          target_amount?: number
          target_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "savings_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      income_streams: {
        Row: {
          amount: number
          biweekly: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          biweekly?: boolean
          created_at?: string
          id: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          biweekly?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          budget_type: string
          card_id: string | null
          created_at: string
          date: string
          frequency: string
          id: string
          name: string
          original: number
          payment_amount: number
          remaining: number
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_type?: string
          card_id?: string | null
          created_at?: string
          date?: string
          frequency?: string
          id: string
          name: string
          original?: number
          payment_amount?: number
          remaining?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_type?: string
          card_id?: string | null
          created_at?: string
          date?: string
          frequency?: string
          id?: string
          name?: string
          original?: number
          payment_amount?: number
          remaining?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      net_worth_snapshots: {
        Row: {
          created_at: string
          date: string
          id: string
          net_worth: number
          total_assets: number
          total_liabilities: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id: string
          net_worth?: number
          total_assets?: number
          total_liabilities?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          net_worth?: number
          total_assets?: number
          total_liabilities?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      one_time_incomes: {
        Row: {
          allocation: Json
          amount: number
          created_at: string
          date: string
          id: string
          label: string
          period_start: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation?: Json
          amount?: number
          created_at?: string
          date?: string
          id: string
          label?: string
          period_start?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation?: Json
          amount?: number
          created_at?: string
          date?: string
          id?: string
          label?: string
          period_start?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allocation: Json
          budget_display_mode: Json
          created_at: string
          dismissed_version: string | null
          funds_remaining: number
          funds_remaining_updated: string
          has_onboarded: boolean
          id: string
          income_stream_order: Json
          last_archived_period_start: string | null
          pay_start: string | null
          updated_at: string
        }
        Insert: {
          allocation?: Json
          budget_display_mode?: Json
          created_at?: string
          dismissed_version?: string | null
          funds_remaining?: number
          funds_remaining_updated?: string
          has_onboarded?: boolean
          id: string
          income_stream_order?: Json
          last_archived_period_start?: string | null
          pay_start?: string | null
          updated_at?: string
        }
        Update: {
          allocation?: Json
          budget_display_mode?: Json
          created_at?: string
          dismissed_version?: string | null
          funds_remaining?: number
          funds_remaining_updated?: string
          has_onboarded?: boolean
          id?: string
          income_stream_order?: Json
          last_archived_period_start?: string | null
          pay_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          budget_type: string
          card_id: string | null
          category: string
          created_at: string
          date: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          budget_type?: string
          card_id?: string | null
          category?: string
          created_at?: string
          date?: string | null
          id: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          budget_type?: string
          card_id?: string | null
          category?: string
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rules: {
        Row: {
          category: string
          created_at: string
          id: string
          match_type: string
          pattern: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          match_type?: string
          pattern: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          match_type?: string
          pattern?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_accounts: {
        Row: {
          balance: number
          created_at: string
          default_allocated: number
          id: string
          monthly_allocations: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          default_allocated?: number
          id: string
          monthly_allocations?: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          default_allocated?: number
          id?: string
          monthly_allocations?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spending_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spending_history_items: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string | null
          id: string
          name: string
          period_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          date?: string | null
          id: string
          name: string
          period_id: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          period_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spending_history_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "spending_history_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      spending_history_periods: {
        Row: {
          budgets: Json | null
          created_at: string
          date: string
          id: string
          label: string | null
          spent: Json | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          budgets?: Json | null
          created_at?: string
          date: string
          id: string
          label?: string | null
          spent?: Json | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          budgets?: Json | null
          created_at?: string
          date?: string
          id?: string
          label?: string | null
          spent?: Json | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          budget_type: string
          card_id: string | null
          category: string
          created_at: string
          date: string
          days_of_week: number[]
          frequency: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          budget_type?: string
          card_id?: string | null
          category?: string
          created_at?: string
          date: string
          days_of_week?: number[]
          frequency?: string
          id: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          budget_type?: string
          card_id?: string | null
          category?: string
          created_at?: string
          date?: string
          days_of_week?: number[]
          frequency?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          price: number | null
          saved: number | null
          target_month: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id: string
          name: string
          price?: number | null
          saved?: number | null
          target_month?: string | null
          updated_at?: string
          url?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          price?: number | null
          saved?: number | null
          target_month?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fetch_user_data: { Args: { uid: string }; Returns: Json }
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

// ─────────────────────────────────────────────────────────────────
//  HAND-MAINTAINED RE-EXPORTS — KEEP BELOW THIS LINE
//
//  `supabase gen types typescript` does NOT produce these aliases.
//  This block is appended by .github/workflows/migrate.yml's
//  "Re-append *Row aliases" step after every regenerate so that
//  src/lib/db.ts's imports continue to resolve. (See BUG-022.)
//  If you add a new table to the schema, add its Row alias here
//  too — otherwise CI will fail on the next migration.
// ─────────────────────────────────────────────────────────────────

type _DbTables = Database['public']['Tables']

export type ProfileRow               = _DbTables['profiles']['Row']
export type IncomeStreamRow          = _DbTables['income_streams']['Row']
export type ExpenseCardRow           = _DbTables['expense_cards']['Row']
export type ExpenseItemRow           = _DbTables['expense_items']['Row']
export type PurchaseRow              = _DbTables['purchases']['Row']
export type SpendingHistoryPeriodRow = _DbTables['spending_history_periods']['Row']
export type SpendingHistoryItemRow   = _DbTables['spending_history_items']['Row']
export type LoanRow                  = _DbTables['loans']['Row']
export type CreditCardRow            = _DbTables['credit_cards']['Row']
export type SubscriptionRow          = _DbTables['subscriptions']['Row']
export type WishlistItemRow          = _DbTables['wishlist_items']['Row']
export type SavingsAccountRow        = _DbTables['savings_accounts']['Row']
export type GoalRow                  = _DbTables['goals']['Row']
export type AssetRow                 = _DbTables['assets']['Row']
export type NetWorthSnapshotRow      = _DbTables['net_worth_snapshots']['Row']
export type RuleRow                  = _DbTables['rules']['Row']
export type BudgetAlertRow           = _DbTables['budget_alerts']['Row']
export type SpendingCategoryRow      = _DbTables['spending_categories']['Row']
export type OneTimeIncomeRow         = _DbTables['one_time_incomes']['Row']
