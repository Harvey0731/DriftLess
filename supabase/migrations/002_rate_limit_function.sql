-- Atomic rate limit increment function
-- Prevents TOCTOU race conditions by doing check + increment in one transaction
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID,
  p_max_count INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 3600
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Get current state with row lock
  SELECT message_count, window_start INTO v_count, v_window_start
  FROM ai_rate_limits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First message ever: create row
    INSERT INTO ai_rate_limits (user_id, message_count, window_start)
    VALUES (p_user_id, 1, now());
    RETURN 1;
  END IF;

  -- Check if window expired
  IF v_window_start < (now() - (p_window_seconds || ' seconds')::interval) THEN
    -- Reset window
    UPDATE ai_rate_limits
    SET message_count = 1, window_start = now()
    WHERE user_id = p_user_id;
    RETURN 1;
  END IF;

  -- Check if at limit
  IF v_count >= p_max_count THEN
    RETURN -1;  -- Rate limited
  END IF;

  -- Increment
  UPDATE ai_rate_limits
  SET message_count = message_count + 1
  WHERE user_id = p_user_id;

  RETURN v_count + 1;
END;
$$;
