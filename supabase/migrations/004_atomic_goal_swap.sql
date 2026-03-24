-- Atomic goal swap: deactivates all active goals and inserts a new one in a single transaction.
-- Prevents the race condition where deactivate succeeds but insert fails,
-- leaving the user with no active goal.

CREATE OR REPLACE FUNCTION swap_active_goal(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_goal RECORD;
BEGIN
  -- Deactivate all existing active goals for this user
  UPDATE goals
  SET is_active = false,
      archived_at = now()
  WHERE user_id = p_user_id
    AND is_active = true;

  -- Insert the new goal
  INSERT INTO goals (user_id, title, description, is_active, archived_at)
  VALUES (p_user_id, p_title, p_description, true, NULL)
  RETURNING * INTO v_new_goal;

  RETURN to_jsonb(v_new_goal);
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION swap_active_goal FROM PUBLIC;
GRANT EXECUTE ON FUNCTION swap_active_goal TO authenticated;

-- Atomic onboarding: sets onboarding_done and creates initial goal in one transaction.
-- Uses CAS on onboarding_done = false to prevent double-tap races.

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_goal_title TEXT,
  p_notification_hour INT,
  p_procrastination_type TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  -- CAS guard: only update if onboarding is not yet done
  UPDATE profiles
  SET onboarding_done = true,
      notification_hour = p_notification_hour,
      procrastination_type = COALESCE(p_procrastination_type, procrastination_type),
      updated_at = now()
  WHERE id = p_user_id
    AND onboarding_done = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- If no row was updated, onboarding was already completed
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  -- Create the initial goal (inside the same transaction)
  INSERT INTO goals (user_id, title, description, is_active, archived_at)
  VALUES (p_user_id, p_goal_title, NULL, true, NULL);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION complete_onboarding FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_onboarding TO authenticated;
