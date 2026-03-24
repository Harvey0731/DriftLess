-- ============================================================
-- Migration 005: Add hard_reason column, fix subscription status
--                constraint, fix pauses column type, and fix
--                update_streak timezone handling
-- ============================================================

-- 1. Add hard_reason column to daily_check_ins
-- Used by ai-checkin edge function and check-in.tsx to record
-- why a task felt hard (when the user selects "Need a break")
ALTER TABLE daily_check_ins
  ADD COLUMN IF NOT EXISTS hard_reason TEXT;

-- 2. Update subscription status CHECK constraint to include 'revoked'
-- The revenuecat-webhook edge function sets status to 'revoked' on REFUND events
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trialing', 'active', 'cancelled', 'expired', 'billing_issue', 'revoked'));

-- 3. Add reason column to promises table
-- Used by promises.service.ts updatePromise to record why a promise was broken
ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS reason TEXT;

-- 4. Fix update_streak to accept a timezone parameter for correct date handling
-- The previous version used CURRENT_DATE (server timezone) which caused
-- streak miscounts for users in timezones far from UTC
CREATE OR REPLACE FUNCTION update_streak(
  p_user_id UUID,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_yesterday DATE;
  v_has_today BOOLEAN;
  v_has_yesterday BOOLEAN;
  v_current_streak INT;
  v_longest_streak INT;
BEGIN
  -- Use the user's local date, not server's CURRENT_DATE
  BEGIN
    v_today := (now() AT TIME ZONE p_timezone)::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_today := CURRENT_DATE; -- Fallback to server date if timezone is invalid
  END;
  v_yesterday := v_today - INTERVAL '1 day';

  -- Check if user has a check-in today
  SELECT EXISTS(
    SELECT 1 FROM daily_check_ins
    WHERE user_id = p_user_id AND check_in_date = v_today::TEXT
  ) INTO v_has_today;

  -- Check if user had a check-in yesterday
  SELECT EXISTS(
    SELECT 1 FROM daily_check_ins
    WHERE user_id = p_user_id AND check_in_date = v_yesterday::TEXT
  ) INTO v_has_yesterday;

  -- Get current profile values
  SELECT current_streak, longest_streak
  INTO v_current_streak, v_longest_streak
  FROM profiles WHERE id = p_user_id;

  IF v_has_today THEN
    IF v_has_yesterday THEN
      -- Continue streak
      v_current_streak := v_current_streak + 1;
    ELSE
      -- Start new streak
      v_current_streak := 1;
    END IF;

    -- Update longest streak if needed
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;

    UPDATE profiles
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;
