-- Create geofences table
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius INTEGER NOT NULL CHECK (radius > 0 AND radius <= 10000), -- Max 10km radius
  notify_on_enter BOOLEAN DEFAULT TRUE,
  notify_on_exit BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_geofences_family_id ON public.geofences(family_id);
CREATE INDEX IF NOT EXISTS idx_geofences_created_by ON public.geofences(created_by);

-- Enable RLS
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Members can view geofences for their families
CREATE POLICY "Members can view family geofences"
  ON public.geofences
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

-- Family heads can create geofences
CREATE POLICY "Family heads can create geofences"
  ON public.geofences
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE user_id = auth.uid()
      AND family_id = geofences.family_id
      AND role = 'head'
    )
  );

-- Family heads can update geofences
CREATE POLICY "Family heads can update geofences"
  ON public.geofences
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE user_id = auth.uid()
      AND family_id = geofences.family_id
      AND role = 'head'
    )
  );

-- Family heads can delete geofences
CREATE POLICY "Family heads can delete geofences"
  ON public.geofences
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE user_id = auth.uid()
      AND family_id = geofences.family_id
      AND role = 'head'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_geofences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER geofences_updated_at
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW
  EXECUTE FUNCTION update_geofences_updated_at();
