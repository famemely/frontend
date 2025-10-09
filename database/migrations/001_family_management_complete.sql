-- ============================================================================
-- Family Management Complete Migration
-- Implements FR-2.1, FR-2.2, FR-2.3, FR-2.4 from family_app_requirements.md
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This is a complete, idempotent migration that can be re-run safely
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (FR-1.1, FR-1.2)
-- Minimal - Supabase auth handles most authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  account_type TEXT CHECK (account_type IN ('adult', 'child')) DEFAULT 'adult',
  parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_parent ON public.users(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_account_type ON public.users(account_type);

-- Families table (FR-2.1, FR-2.2)
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  theme_color TEXT DEFAULT '#4ECDC4', -- FR-2.2: Color-coding for family identification
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_created_by ON public.families(created_by);
CREATE INDEX IF NOT EXISTS idx_families_created_at ON public.families(created_at DESC);

-- Family members table (FR-2.2, FR-2.3)
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('head', 'member', 'child_member')) DEFAULT 'member', -- FR-2.3: RBAC
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_role ON public.family_members(family_id, role);

-- Family invites table (FR-2.4)
CREATE TABLE IF NOT EXISTS public.family_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('head', 'member', 'child_member')) DEFAULT 'member',
  max_uses INTEGER, -- NULL means unlimited
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_invites_code ON public.family_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_family_invites_family ON public.family_invites(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_expires ON public.family_invites(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (must be done BEFORE dropping helper functions)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view family members" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Family member access" ON public.families;
DROP POLICY IF EXISTS "Adults can create families" ON public.families;
DROP POLICY IF EXISTS "Family head can update" ON public.families;
DROP POLICY IF EXISTS "Family head can delete" ON public.families;
DROP POLICY IF EXISTS "Family member list access" ON public.family_members;
DROP POLICY IF EXISTS "Family head can add members" ON public.family_members;
DROP POLICY IF EXISTS "Family head can update roles" ON public.family_members;
DROP POLICY IF EXISTS "Members can leave family" ON public.family_members;
DROP POLICY IF EXISTS "Family members can view invites" ON public.family_invites;
DROP POLICY IF EXISTS "Members can create invites" ON public.family_invites;
DROP POLICY IF EXISTS "Family head can delete invites" ON public.family_invites;
DROP POLICY IF EXISTS "Anyone can view invites by code" ON public.family_invites;

-- ============================================================================
-- HELPER FUNCTIONS (for RLS policies)
-- ============================================================================

-- Drop existing helper functions if they exist (to handle parameter name changes)
DROP FUNCTION IF EXISTS public.is_family_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_family_head(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_adult_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_family_role(UUID, UUID) CASCADE;

-- Check if user is a member of a family (without triggering RLS recursion)
CREATE FUNCTION public.is_family_member(_uid UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.family_members fm
    WHERE fm.user_id = _uid AND fm.family_id = _family_id
  );
$$;

-- Check if user is a family head (without triggering RLS recursion)
CREATE FUNCTION public.is_family_head(_uid UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.family_members fm
    WHERE fm.user_id = _uid 
      AND fm.family_id = _family_id 
      AND fm.role = 'head'
  );
$$;

-- Check if user is an adult (without triggering RLS recursion)
CREATE FUNCTION public.is_adult_user(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users u
    WHERE u.id = _uid AND u.account_type = 'adult'
  );
$$;

-- Get user's role in a family
CREATE FUNCTION public.get_user_family_role(_uid UUID, _family_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.family_members fm
  WHERE fm.user_id = _uid AND fm.family_id = _family_id
  LIMIT 1;
$$;

-- ============================================================================
-- USERS TABLE POLICIES (FR-1.2)
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can view profiles of family members
CREATE POLICY "Users can view family members" ON public.users
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM public.family_members
      WHERE family_id IN (
        SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert their own profile (for initial creation on login)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- FAMILIES TABLE POLICIES (FR-2.1, FR-2.2)
-- ============================================================================

-- Family members can view their families
CREATE POLICY "Family member access" ON public.families
  FOR SELECT USING (
    public.is_family_member(auth.uid(), id)
  );

-- Adults can create families (FR-2.1)
CREATE POLICY "Adults can create families" ON public.families
  FOR INSERT WITH CHECK (
    public.is_adult_user(auth.uid())
    AND created_by = auth.uid()
  );

-- Only family head can update family details (FR-2.3)
CREATE POLICY "Family head can update" ON public.families
  FOR UPDATE USING (
    public.is_family_head(auth.uid(), id)
  );

-- Only family head can delete family (FR-2.2)
CREATE POLICY "Family head can delete" ON public.families
  FOR DELETE USING (
    public.is_family_head(auth.uid(), id)
  );

-- ============================================================================
-- FAMILY_MEMBERS TABLE POLICIES (FR-2.2, FR-2.3)
-- ============================================================================

-- Family members can view all members in their families
CREATE POLICY "Family member list access" ON public.family_members
  FOR SELECT USING (
    public.is_family_member(auth.uid(), family_id)
  );

-- Family head can add new members (FR-2.3)
CREATE POLICY "Family head can add members" ON public.family_members
  FOR INSERT WITH CHECK (
    public.is_family_head(auth.uid(), family_id)
  );

-- Family head can update member roles (FR-2.3)
CREATE POLICY "Family head can update roles" ON public.family_members
  FOR UPDATE USING (
    public.is_family_head(auth.uid(), family_id)
  );

-- Members can leave family, head can remove members (FR-2.2)
CREATE POLICY "Members can leave family" ON public.family_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_family_head(auth.uid(), family_id)
  );

-- ============================================================================
-- FAMILY_INVITES TABLE POLICIES (FR-2.4)
-- ============================================================================

-- Family members can view invites for their families
CREATE POLICY "Family members can view invites" ON public.family_invites
  FOR SELECT USING (
    public.is_family_member(auth.uid(), family_id)
  );

-- Head and adult members can create invites (FR-2.4)
CREATE POLICY "Members can create invites" ON public.family_invites
  FOR INSERT WITH CHECK (
    public.is_family_member(auth.uid(), family_id)
    AND public.is_adult_user(auth.uid())
    AND created_by = auth.uid()
  );

-- Family head can delete invites (FR-2.4)
CREATE POLICY "Family head can delete invites" ON public.family_invites
  FOR DELETE USING (
    public.is_family_head(auth.uid(), family_id)
  );

-- Anyone (authenticated) can view invite by code to join
CREATE POLICY "Anyone can view invites by code" ON public.family_invites
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- ============================================================================
-- STORED PROCEDURES / FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for families table
DROP TRIGGER IF EXISTS update_families_updated_at ON public.families;
CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create user profile on signup (FR-1.1)
-- This handles both new signups and existing users logging in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'adult')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UTILITY FUNCTION: Ensure User Profile Exists (FR-1.1)
-- ============================================================================
-- This function is called on login to ensure the user has a profile in public.users
-- It creates the profile if it doesn't exist (for existing auth users)

DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT) CASCADE;

CREATE FUNCTION public.ensure_user_profile(
  _user_id UUID,
  _email TEXT,
  _name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record JSON;
BEGIN
  -- Insert or update user profile
  INSERT INTO public.users (id, email, name, account_type)
  VALUES (
    _user_id,
    _email,
    COALESCE(_name, _email),
    'adult'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(_name, public.users.name),
    updated_at = NOW();

  -- Return the user profile
  SELECT row_to_json(u.*) INTO user_record
  FROM public.users u
  WHERE u.id = _user_id;

  RETURN user_record;
END;
$$;

-- ============================================================================
-- COMPOSITE FUNCTION: Create Family with Head (FR-2.1)
-- ============================================================================
-- This function creates a family and assigns the creator as head in one transaction
-- Returns the created family record as JSON to avoid RLS issues

DROP FUNCTION IF EXISTS public.create_family_with_head(TEXT, TEXT, TEXT, UUID) CASCADE;

CREATE FUNCTION public.create_family_with_head(
  _name TEXT,
  _avatar_url TEXT DEFAULT NULL,
  _theme_color TEXT DEFAULT '#4ECDC4',
  _creator UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_family_id UUID;
  new_family_record JSON;
  invite_code TEXT;
BEGIN
  -- Validate: only adult users can create families (FR-2.1)
  IF NOT public.is_adult_user(_creator) THEN
    RAISE EXCEPTION 'Only adult users can create families';
  END IF;

  -- Validate: name is required
  IF _name IS NULL OR trim(_name) = '' THEN
    RAISE EXCEPTION 'Family name is required';
  END IF;

  -- Create the family
  INSERT INTO public.families (name, avatar_url, theme_color, created_by)
  VALUES (
    trim(_name), 
    _avatar_url, 
    COALESCE(_theme_color, '#4ECDC4'), 
    _creator
  )
  RETURNING id INTO new_family_id;

  -- Add creator as family head (FR-2.3)
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family_id, _creator, 'head');

  -- Generate initial invite code for members (FR-2.4)
  -- 8-character alphanumeric code (excluding confusing chars: 0, O, I, 1, L)
  invite_code := (
    SELECT string_agg(
      substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 
             (floor(random() * 32) + 1)::INT, 
             1
      ), 
      ''
    )
    FROM generate_series(1, 8)
  );

  -- Create the initial invite
  INSERT INTO public.family_invites (
    family_id, 
    invite_code, 
    role, 
    uses, 
    created_by
  )
  VALUES (
    new_family_id, 
    invite_code, 
    'member', 
    0, 
    _creator
  );

  -- Fetch and return the created family as JSON
  SELECT row_to_json(f.*) INTO new_family_record
  FROM public.families f
  WHERE f.id = new_family_id;

  RETURN new_family_record;
END;
$$;

-- ============================================================================
-- COMPOSITE FUNCTION: Join Family via Invite Code (FR-2.4)
-- ============================================================================

DROP FUNCTION IF EXISTS public.join_family_with_code(TEXT, UUID) CASCADE;

CREATE FUNCTION public.join_family_with_code(
  _invite_code TEXT,
  _user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
  membership_exists BOOLEAN;
  result JSON;
BEGIN
  -- Find the invite
  SELECT * INTO invite_record
  FROM public.family_invites
  WHERE invite_code = _invite_code
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR uses < max_uses)
  LIMIT 1;

  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Check if user is already a member
  SELECT EXISTS(
    SELECT 1 FROM public.family_members
    WHERE family_id = invite_record.family_id
      AND user_id = _user_id
  ) INTO membership_exists;

  IF membership_exists THEN
    RAISE EXCEPTION 'You are already a member of this family';
  END IF;

  -- Add user to family with the specified role
  INSERT INTO public.family_members (family_id, user_id, role, invited_by)
  VALUES (
    invite_record.family_id,
    _user_id,
    invite_record.role,
    invite_record.created_by
  );

  -- Increment invite usage counter
  UPDATE public.family_invites
  SET uses = uses + 1
  WHERE id = invite_record.id;

  -- Return success with family info
  SELECT json_build_object(
    'success', true,
    'family_id', invite_record.family_id,
    'role', invite_record.role
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================================
-- COMPOSITE FUNCTION: Leave Family (FR-2.2)
-- ============================================================================

DROP FUNCTION IF EXISTS public.leave_family(UUID, UUID) CASCADE;

CREATE FUNCTION public.leave_family(
  _family_id UUID,
  _user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  head_count INT;
  result JSON;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.family_members
  WHERE family_id = _family_id AND user_id = _user_id;

  IF user_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this family';
  END IF;

  -- If user is head, check if there are other heads
  IF user_role = 'head' THEN
    SELECT COUNT(*) INTO head_count
    FROM public.family_members
    WHERE family_id = _family_id AND role = 'head';

    IF head_count <= 1 THEN
      RAISE EXCEPTION 'Cannot leave family as the only head. Please assign another head first or delete the family.';
    END IF;
  END IF;

  -- Remove user from family
  DELETE FROM public.family_members
  WHERE family_id = _family_id AND user_id = _user_id;

  SELECT json_build_object(
    'success', true,
    'message', 'Successfully left the family'
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON TABLE public.families IS 'FR-2.1, FR-2.2: Family groups with multi-family support';
COMMENT ON TABLE public.family_members IS 'FR-2.2, FR-2.3: Family memberships with role-based access control (RBAC)';
COMMENT ON TABLE public.family_invites IS 'FR-2.4: Invite codes for joining families';
COMMENT ON TABLE public.users IS 'FR-1.1, FR-1.2: User profiles with adult/child account types';

COMMENT ON COLUMN public.family_members.role IS 'FR-2.3: head (admin), member (adult), child_member (restricted)';
COMMENT ON COLUMN public.families.theme_color IS 'FR-2.2: Color-coding for quick family identification';
COMMENT ON COLUMN public.users.account_type IS 'FR-1.1: adult (can create families) or child (can only join)';

COMMENT ON FUNCTION public.create_family_with_head IS 'FR-2.1: Creates a new family with creator as head, generates initial invite code';
COMMENT ON FUNCTION public.join_family_with_code IS 'FR-2.4: Join a family using an invite code';
COMMENT ON FUNCTION public.leave_family IS 'FR-2.2: Leave a family (with head validation)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
