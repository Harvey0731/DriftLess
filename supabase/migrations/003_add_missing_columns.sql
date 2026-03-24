-- ============================================================
-- Migration 003: Add missing columns referenced by edge functions
-- ============================================================

-- Add procrastination_type to profiles (used by ai-chat, ai-checkin, edit-profile)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS procrastination_type TEXT;

-- Add missing columns to subscriptions (used by activate-trial, revenuecat-webhook)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS last_webhook_event_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan TEXT;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_user_checkin ON tasks (user_id, check_in_id);
CREATE INDEX IF NOT EXISTS idx_bad_day_actions_user ON bad_day_actions (user_id);

-- Add CHECK constraints for data integrity
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trialing', 'active', 'cancelled', 'expired', 'billing_issue'));

ALTER TABLE focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_status_check;
ALTER TABLE focus_sessions
  ADD CONSTRAINT focus_sessions_status_check
  CHECK (status IN ('active', 'paused', 'completed', 'abandoned'));

-- Restrict RLS UPDATE on ai_rate_limits to prevent users resetting their own count
-- Drop the overly permissive UPDATE policy and replace with a restricted one
DROP POLICY IF EXISTS arl_update ON ai_rate_limits;
CREATE POLICY arl_update ON ai_rate_limits
  FOR UPDATE USING (false); -- Users cannot directly update; only the SECURITY DEFINER RPC can
