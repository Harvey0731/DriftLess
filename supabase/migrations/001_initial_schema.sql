-- ============================================================
-- Driftless: Initial Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- profiles
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  notification_hour SMALLINT,
  celebration_style TEXT NOT NULL DEFAULT 'moderate',
  theme        TEXT NOT NULL DEFAULT 'system',
  streak_shields SMALLINT NOT NULL DEFAULT 0 CHECK (streak_shields <= 3),
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  trust_score  SMALLINT NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- goals
CREATE TABLE goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Only one active goal per user
CREATE UNIQUE INDEX goals_one_active ON goals (user_id) WHERE is_active = TRUE;

-- daily_check_ins
CREATE TABLE daily_check_ins (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  goal_id        UUID REFERENCES goals ON DELETE SET NULL,
  check_in_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_level   SMALLINT CHECK (energy_level >= 1 AND energy_level <= 5),
  mood_note      TEXT,
  today_goal_text TEXT,
  completed      BOOLEAN NOT NULL DEFAULT FALSE,
  ai_messages    JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, check_in_date)
);
ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;

-- tasks
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  check_in_id   UUID REFERENCES daily_check_ins ON DELETE CASCADE,
  title         TEXT NOT NULL,
  estimated_mins SMALLINT,
  order_index   SMALLINT,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- focus_sessions
CREATE TABLE focus_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  task_id      UUID REFERENCES tasks ON DELETE SET NULL,
  check_in_id  UUID REFERENCES daily_check_ins ON DELETE SET NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  planned_mins SMALLINT,
  actual_secs  INT,
  pauses       JSONB,
  rating       SMALLINT CHECK (rating >= 1 AND rating <= 4),
  rating_label TEXT,
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- chat_messages
CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  context     JSONB,
  tokens_used INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- promises
CREATE TABLE promises (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  promise_date DATE NOT NULL DEFAULT CURRENT_DATE,
  text         TEXT NOT NULL,
  kept         BOOLEAN,
  kept_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, promise_date)
);
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;

-- milestones
CREATE TABLE milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type        TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen        BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- subscriptions
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  revenuecat_user_id  TEXT UNIQUE,
  entitlement         TEXT NOT NULL DEFAULT 'free',
  product_id          TEXT,
  period              TEXT,
  trial_ends_at       TIMESTAMPTZ,
  current_period_ends TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'trialing',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- bad_day_actions
CREATE TABLE bad_day_actions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category     TEXT,
  action_text  TEXT NOT NULL,
  completed_at TIMESTAMPTZ
);
ALTER TABLE bad_day_actions ENABLE ROW LEVEL SECURITY;

-- ai_rate_limits
CREATE TABLE ai_rate_limits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  window_start  TIMESTAMPTZ,
  message_count INT NOT NULL DEFAULT 0
);
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_chat_messages_user_created ON chat_messages (user_id, created_at DESC);
CREATE INDEX idx_focus_sessions_user_created ON focus_sessions (user_id, created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles: owner-only access (id = auth.uid, not user_id)
CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (id = auth.uid());

-- goals
CREATE POLICY goals_select ON goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY goals_insert ON goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY goals_update ON goals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY goals_delete ON goals FOR DELETE USING (user_id = auth.uid());

-- daily_check_ins
CREATE POLICY checkins_select ON daily_check_ins FOR SELECT USING (user_id = auth.uid());
CREATE POLICY checkins_insert ON daily_check_ins FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY checkins_update ON daily_check_ins FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY checkins_delete ON daily_check_ins FOR DELETE USING (user_id = auth.uid());

-- tasks
CREATE POLICY tasks_select ON tasks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (user_id = auth.uid());

-- focus_sessions
CREATE POLICY sessions_select ON focus_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sessions_insert ON focus_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY sessions_update ON focus_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY sessions_delete ON focus_sessions FOR DELETE USING (user_id = auth.uid());

-- chat_messages
CREATE POLICY chat_select ON chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY chat_insert ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_update ON chat_messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY chat_delete ON chat_messages FOR DELETE USING (user_id = auth.uid());

-- promises
CREATE POLICY promises_select ON promises FOR SELECT USING (user_id = auth.uid());
CREATE POLICY promises_insert ON promises FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY promises_update ON promises FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY promises_delete ON promises FOR DELETE USING (user_id = auth.uid());

-- milestones
CREATE POLICY milestones_select ON milestones FOR SELECT USING (user_id = auth.uid());
CREATE POLICY milestones_insert ON milestones FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY milestones_update ON milestones FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY milestones_delete ON milestones FOR DELETE USING (user_id = auth.uid());

-- subscriptions
CREATE POLICY subs_select ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY subs_insert ON subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY subs_update ON subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY subs_delete ON subscriptions FOR DELETE USING (user_id = auth.uid());

-- bad_day_actions
CREATE POLICY bda_select ON bad_day_actions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY bda_insert ON bad_day_actions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY bda_update ON bad_day_actions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY bda_delete ON bad_day_actions FOR DELETE USING (user_id = auth.uid());

-- ai_rate_limits
CREATE POLICY arl_select ON ai_rate_limits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY arl_insert ON ai_rate_limits FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY arl_update ON ai_rate_limits FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY arl_delete ON ai_rate_limits FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile + subscription on signup
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    now(),
    now()
  );

  INSERT INTO public.subscriptions (user_id, entitlement, status, trial_ends_at, current_period_ends, updated_at)
  VALUES (
    NEW.id,
    'free',
    'trialing',
    now() + INTERVAL '7 days',
    now() + INTERVAL '7 days',
    now()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_on_signup();

-- Recalculate streak for a user
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_streak INT := 0;
  v_longest_streak INT;
  v_check_date     DATE := CURRENT_DATE;
  v_found          BOOLEAN;
BEGIN
  -- Walk backwards from today counting consecutive check-in dates
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM daily_check_ins
      WHERE user_id = p_user_id
        AND check_in_date = v_check_date
        AND completed = TRUE
    ) INTO v_found;

    EXIT WHEN NOT v_found;

    v_current_streak := v_current_streak + 1;
    v_check_date := v_check_date - 1;
  END LOOP;

  -- Fetch existing longest streak
  SELECT longest_streak INTO v_longest_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Update profile
  UPDATE profiles
  SET
    current_streak = v_current_streak,
    longest_streak = GREATEST(COALESCE(v_longest_streak, 0), v_current_streak),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;
