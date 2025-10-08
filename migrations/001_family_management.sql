-- Family Management Tables
-- Implements FR-2.1, FR-2.2, FR-2.3, FR-2.4
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (minimal - Supabase auth handles most of this)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  account_type TEXT CHECK (account_type IN ('adult', 'child')) DEFAULT 'adult',
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_parent ON users(parent_id) WHERE parent_id IS NOT NULL;

-- Families table (FR-2.1, FR-2.2)
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  theme_color TEXT DEFAULT '#4ECDC4', -- FR-2.2: Color-coding for family identification
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_created_by ON families(created_by);

-- Family members table (FR-2.2, FR-2.3)
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('head', 'member', 'child_member')) DEFAULT 'member', -- FR-2.3: RBAC
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

-- Family invites table (FR-2.4)
CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('head', 'member', 'child_member')) DEFAULT 'member',
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_code ON family_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_family ON family_invites(family_id);

-- Row-Level Security Policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- Users: Can only view their own profile and family members
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view family members" ON users
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM family_members
      WHERE family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Families: Can only see families they belong to
CREATE POLICY "Family member access" ON families
  FOR SELECT USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Families: Adults can create families (FR-2.1)
CREATE POLICY "Adults can create families" ON families
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND account_type = 'adult'
    )
  );

-- Families: Only head can update (FR-2.3)
CREATE POLICY "Family head can update" ON families
  FOR UPDATE USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
      AND role = 'head'
    )
  );

-- Families: Only head can delete (FR-2.2)
CREATE POLICY "Family head can delete" ON families
  FOR DELETE USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
      AND role = 'head'
    )
  );

-- Family Members: Can see members of their families
CREATE POLICY "Family member list access" ON family_members
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Family Members: Head can add members
CREATE POLICY "Family head can add members" ON family_members
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
      AND role = 'head'
    )
  );

-- Family Members: Head can update member roles (FR-2.3)
CREATE POLICY "Family head can update roles" ON family_members
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
      AND role = 'head'
    )
  );

-- Family Members: Members can leave (FR-2.2)
CREATE POLICY "Members can leave family" ON family_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
      AND role = 'head'
    )
  );

-- Family Invites: Members can view invites for their families (FR-2.4)
CREATE POLICY "Family members can view invites" ON family_invites
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Family Invites: Head and members (non-child) can create invites (FR-2.4)
CREATE POLICY "Members can create invites" ON family_invites
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT fm.family_id FROM family_members fm
      JOIN users u ON fm.user_id = u.id
      WHERE fm.user_id = auth.uid()
      AND (fm.role IN ('head', 'member'))
      AND u.account_type = 'adult'
    )
  );

-- Family Invites: Head can delete invites (FR-2.4)
CREATE POLICY "Family head can delete invites" ON family_invites
  FOR DELETE USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
      AND role = 'head'
    )
  );

-- Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for families table
DROP TRIGGER IF EXISTS update_families_updated_at ON families;
CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'adult')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE families IS 'FR-2.1, FR-2.2: Family groups with multi-family support';
COMMENT ON TABLE family_members IS 'FR-2.2, FR-2.3: Family memberships with RBAC';
COMMENT ON TABLE family_invites IS 'FR-2.4: Invite codes for joining families';
COMMENT ON COLUMN family_members.role IS 'FR-2.3: head (admin), member, child_member';
COMMENT ON COLUMN families.theme_color IS 'FR-2.2: Color-coding for family identification';
