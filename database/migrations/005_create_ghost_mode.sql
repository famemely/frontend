-- Create ghost mode tables for global and family-specific privacy settings

-- Global ghost mode (user-level)
CREATE TABLE IF NOT EXISTS public.user_ghost_mode (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family-specific ghost mode
CREATE TABLE IF NOT EXISTS public.family_ghost_mode (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, family_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ghost_mode_enabled ON public.user_ghost_mode(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_family_ghost_mode_enabled ON public.family_ghost_mode(family_id, enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_family_ghost_mode_user ON public.family_ghost_mode(user_id);

-- Enable RLS
ALTER TABLE public.user_ghost_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_ghost_mode ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_ghost_mode
-- Users can only manage their own global ghost mode
CREATE POLICY "Users can view their own ghost mode"
  ON public.user_ghost_mode
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own ghost mode"
  ON public.user_ghost_mode
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own ghost mode"
  ON public.user_ghost_mode
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Family members can see who has ghost mode enabled in their families
CREATE POLICY "Family members can view family ghost modes"
  ON public.family_ghost_mode
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own family ghost modes"
  ON public.family_ghost_mode
  FOR ALL
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp for user_ghost_mode
CREATE OR REPLACE FUNCTION update_user_ghost_mode_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_ghost_mode_updated_at
  BEFORE UPDATE ON public.user_ghost_mode
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ghost_mode_timestamp();

-- Trigger to update updated_at timestamp for family_ghost_mode
CREATE OR REPLACE FUNCTION update_family_ghost_mode_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER family_ghost_mode_updated_at
  BEFORE UPDATE ON public.family_ghost_mode
  FOR EACH ROW
  EXECUTE FUNCTION update_family_ghost_mode_timestamp();

-- Helper function to check if a user has ghost mode enabled for a family
CREATE OR REPLACE FUNCTION is_ghost_mode_enabled(
  _user_id UUID,
  _family_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  global_enabled BOOLEAN;
  family_enabled BOOLEAN;
BEGIN
  -- Check global ghost mode
  SELECT enabled INTO global_enabled
  FROM public.user_ghost_mode
  WHERE user_id = _user_id;
  
  IF global_enabled THEN
    RETURN TRUE;
  END IF;
  
  -- Check family-specific ghost mode
  SELECT enabled INTO family_enabled
  FROM public.family_ghost_mode
  WHERE user_id = _user_id AND family_id = _family_id;
  
  RETURN COALESCE(family_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to set global ghost mode (upsert)
CREATE OR REPLACE FUNCTION set_global_ghost_mode(
  _enabled BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_ghost_mode (user_id, enabled)
  VALUES (auth.uid(), _enabled)
  ON CONFLICT (user_id)
  DO UPDATE SET enabled = _enabled, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to set family ghost mode (upsert)
CREATE OR REPLACE FUNCTION set_family_ghost_mode(
  _family_id UUID,
  _enabled BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  -- Verify user is a member of this family
  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid() AND family_id = _family_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this family';
  END IF;
  
  INSERT INTO public.family_ghost_mode (user_id, family_id, enabled)
  VALUES (auth.uid(), _family_id, _enabled)
  ON CONFLICT (user_id, family_id)
  DO UPDATE SET enabled = _enabled, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
