/** Auto-generated Supabase-compatible type definitions for Driftless.
 *
 * IMPORTANT: Row types MUST be `type` aliases, NOT `interface`.
 * TypeScript interfaces lack implicit index signatures, so they don't
 * satisfy `Record<string, unknown>` which postgrest-js GenericTable
 * requires.  Using `type` fixes the `never` resolution issue.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

/* ------------------------------------------------------------------ */
/*  Row types (also used as standalone imports in services/stores)     */
/* ------------------------------------------------------------------ */

export type Profile = {
  id: string
  display_name: string | null
  onboarding_done: boolean
  notification_hour: number
  celebration_style: string
  theme: string
  streak_shields: number
  current_streak: number
  longest_streak: number
  trust_score: number
  procrastination_type: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Goal = {
  id: string
  user_id: string
  title: string
  description: string | null
  is_active: boolean
  created_at: string
  archived_at: string | null
}

export type DailyCheckIn = {
  id: string
  user_id: string
  goal_id: string
  check_in_date: string
  /** NOTE: DB allows NULL but app treats as non-null; schema should add NOT NULL constraint */
  energy_level: number
  mood_note: string | null
  today_goal_text: string
  completed: boolean
  ai_messages: Json | null
  hard_reason: string | null
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  check_in_id: string
  title: string
  estimated_mins: number
  order_index: number
  completed: boolean
  completed_at: string | null
  created_at: string
}

export type FocusSession = {
  id: string
  user_id: string
  task_id: string
  check_in_id: string
  started_at: string
  ended_at: string | null
  planned_mins: number
  actual_secs: number
  /** DB column is JSONB but the app stores a numeric pause count value */
  pauses: number
  rating: number | null
  rating_label: string | null
  note: string | null
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  created_at: string
}

export type ChatMessage = {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  context: string | null
  tokens_used: number | null
  created_at: string
}

export type PromiseRecord = {
  id: string
  user_id: string
  promise_date: string
  text: string
  kept: boolean | null
  kept_at: string | null
  created_at: string
}

export type AiRateLimit = {
  id: string
  user_id: string
  window_start: string
  message_count: number
}

export type Milestone = {
  id: string
  user_id: string
  type: string
  achieved_at: string
  seen: boolean
}

export type Subscription = {
  id: string
  user_id: string
  revenuecat_user_id: string
  entitlement: string
  product_id: string
  period: string
  plan: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_ends: string | null
  cancel_at_period_end: boolean
  last_webhook_event_id: string | null
  status: 'active' | 'expired' | 'trialing' | 'cancelled' | 'billing_issue' | 'revoked'
  updated_at: string
}

export type BadDayAction = {
  id: string
  user_id: string
  category: string
  action_text: string
  completed_at: string | null
}

/* ------------------------------------------------------------------ */
/*  Database interface (Supabase generic)                             */
/* ------------------------------------------------------------------ */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          display_name?: string | null
          onboarding_done?: boolean
          notification_hour?: number
          celebration_style?: string
          theme?: string
          streak_shields?: number
          current_streak?: number
          longest_streak?: number
          trust_score?: number
          procrastination_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          onboarding_done?: boolean
          notification_hour?: number
          celebration_style?: string
          theme?: string
          streak_shields?: number
          current_streak?: number
          longest_streak?: number
          trust_score?: number
          procrastination_type?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: Goal
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      daily_check_ins: {
        Row: DailyCheckIn
        Insert: {
          id?: string
          user_id: string
          goal_id: string
          check_in_date: string
          energy_level: number
          mood_note?: string | null
          today_goal_text: string
          completed?: boolean
          ai_messages?: Json | null
          hard_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          check_in_date?: string
          energy_level?: number
          mood_note?: string | null
          today_goal_text?: string
          completed?: boolean
          ai_messages?: Json | null
          hard_reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: {
          id?: string
          user_id: string
          check_in_id: string
          title: string
          estimated_mins: number
          order_index: number
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          check_in_id?: string
          title?: string
          estimated_mins?: number
          order_index?: number
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: FocusSession
        Insert: {
          id?: string
          user_id: string
          task_id: string
          check_in_id: string
          started_at: string
          ended_at?: string | null
          planned_mins: number
          actual_secs?: number
          /** DB column is JSONB but the app stores a numeric pause count value */
          pauses?: number
          rating?: number | null
          rating_label?: string | null
          note?: string | null
          status?: 'active' | 'paused' | 'completed' | 'abandoned'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          check_in_id?: string
          started_at?: string
          ended_at?: string | null
          planned_mins?: number
          actual_secs?: number
          /** DB column is JSONB but the app stores a numeric pause count value */
          pauses?: number
          rating?: number | null
          rating_label?: string | null
          note?: string | null
          status?: 'active' | 'paused' | 'completed' | 'abandoned'
          created_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: ChatMessage
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          context?: string | null
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          context?: string | null
          tokens_used?: number | null
          created_at?: string
        }
        Relationships: []
      }
      promises: {
        Row: PromiseRecord
        Insert: {
          id?: string
          user_id: string
          promise_date: string
          text: string
          kept?: boolean | null
          kept_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          promise_date?: string
          text?: string
          kept?: boolean | null
          kept_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      milestones: {
        Row: Milestone
        Insert: {
          id?: string
          user_id: string
          type: string
          achieved_at: string
          seen?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          achieved_at?: string
          seen?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: Subscription
        Insert: {
          id?: string
          user_id: string
          revenuecat_user_id: string
          entitlement: string
          product_id: string
          period: string
          plan?: string | null
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_ends?: string | null
          cancel_at_period_end?: boolean
          last_webhook_event_id?: string | null
          status?: 'active' | 'expired' | 'trialing' | 'cancelled' | 'billing_issue' | 'revoked'
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          revenuecat_user_id?: string
          entitlement?: string
          product_id?: string
          period?: string
          plan?: string | null
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_ends?: string | null
          cancel_at_period_end?: boolean
          last_webhook_event_id?: string | null
          status?: 'active' | 'expired' | 'trialing' | 'cancelled' | 'billing_issue' | 'revoked'
          updated_at?: string
        }
        Relationships: []
      }
      bad_day_actions: {
        Row: BadDayAction
        Insert: {
          id?: string
          user_id: string
          category: string
          action_text: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          action_text?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: AiRateLimit
        Insert: {
          id?: string
          user_id: string
          window_start: string
          message_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          window_start?: string
          message_count?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
