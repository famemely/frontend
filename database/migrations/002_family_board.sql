-- ============================================================================
-- Family Board Migration
-- Implements FR-5.1, FR-5.2, FR-5.3 from family_app_requirements.md
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This migration adds Family Board functionality with encryption support
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- pgcrypto is already enabled in 001 migration

-- ============================================================================
-- TABLES
-- ============================================================================

-- Family encryption keys table (for auto shared key encryption)
CREATE TABLE IF NOT EXISTS public.family_encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL UNIQUE,
  encryption_key_hash TEXT NOT NULL, -- Stores encrypted family shared key
  key_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_encryption_keys_family ON public.family_encryption_keys(family_id);

-- Board posts table (FR-5.1, FR-5.2, FR-5.3)
CREATE TABLE IF NOT EXISTS public.board_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  post_type TEXT CHECK (post_type IN ('text', 'todo_list', 'reminder', 'photo')) NOT NULL,
  
  -- Encrypted content fields (using family auto shared key)
  title_encrypted TEXT, -- Encrypted post title
  content_encrypted TEXT NOT NULL, -- Encrypted post content (markdown for text posts)
  metadata_encrypted TEXT, -- Encrypted metadata (JSON for todo lists, reminders, etc.)
  
  -- Non-encrypted fields for functionality
  is_pinned BOOLEAN DEFAULT FALSE,
  is_moderated BOOLEAN DEFAULT FALSE, -- For child user posts requiring moderation
  moderation_status TEXT CHECK (moderation_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
  moderated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ, -- For soft delete and 30+ day archive
  
  -- Search support
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(title_encrypted, '') || ' ' || 
      COALESCE(content_encrypted, '')
    )
  ) STORED
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_board_posts_family ON public.board_posts(family_id);
CREATE INDEX IF NOT EXISTS idx_board_posts_author ON public.board_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_board_posts_type ON public.board_posts(family_id, post_type);
CREATE INDEX IF NOT EXISTS idx_board_posts_created ON public.board_posts(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_posts_pinned ON public.board_posts(family_id, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_posts_archived ON public.board_posts(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_board_posts_moderation ON public.board_posts(family_id, moderation_status) WHERE moderation_status != 'approved';
CREATE INDEX IF NOT EXISTS idx_board_posts_search ON public.board_posts USING GIN(search_vector);

-- Post edit history table (FR-5.2)
CREATE TABLE IF NOT EXISTS public.board_post_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.board_posts(id) ON DELETE CASCADE NOT NULL,
  editor_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  
  -- Encrypted previous content
  previous_title_encrypted TEXT,
  previous_content_encrypted TEXT,
  previous_metadata_encrypted TEXT,
  
  edit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_post_edits_post ON public.board_post_edits(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_post_edits_editor ON public.board_post_edits(editor_id);

-- Todo list items table (FR-5.1 - shared shopping/todo lists)
CREATE TABLE IF NOT EXISTS public.todo_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.board_posts(id) ON DELETE CASCADE NOT NULL,
  item_text_encrypted TEXT NOT NULL, -- Encrypted item text
  is_completed BOOLEAN DEFAULT FALSE,
  completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todo_list_items_post ON public.todo_list_items(post_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_todo_list_items_completed ON public.todo_list_items(post_id, is_completed);

-- Post attachments table (FR-5.1 - attachments <=5mb)
CREATE TABLE IF NOT EXISTS public.board_post_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.board_posts(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size <= 5242880), -- 5MB limit
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase storage
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_post_attachments_post ON public.board_post_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_board_post_attachments_size ON public.board_post_attachments(file_size);

-- Reminders table (FR-5.1 - time-based notifications)
CREATE TABLE IF NOT EXISTS public.board_post_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.board_posts(id) ON DELETE CASCADE NOT NULL,
  reminder_time TIMESTAMPTZ NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('once', 'daily', 'weekly', 'monthly')) DEFAULT 'once',
  is_completed BOOLEAN DEFAULT FALSE,
  notified_users UUID[] DEFAULT '{}', -- Array of user IDs who have been notified
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_post_reminders_post ON public.board_post_reminders(post_id);
CREATE INDEX IF NOT EXISTS idx_board_post_reminders_time ON public.board_post_reminders(reminder_time) WHERE NOT is_completed;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.family_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_post_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_post_reminders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate family encryption key
CREATE OR REPLACE FUNCTION public.generate_family_encryption_key(_family_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _key TEXT;
BEGIN
  -- Generate a random 256-bit key and hash it
  _key := encode(gen_random_bytes(32), 'base64');
  
  -- Store the hashed key
  INSERT INTO public.family_encryption_keys (family_id, encryption_key_hash)
  VALUES (_family_id, crypt(_key, gen_salt('bf', 12)))
  ON CONFLICT (family_id) DO UPDATE SET
    encryption_key_hash = crypt(_key, gen_salt('bf', 12)),
    key_version = family_encryption_keys.key_version + 1,
    updated_at = NOW();
    
  RETURN _key;
END;
$$;

-- Function to verify family encryption key
CREATE OR REPLACE FUNCTION public.verify_family_encryption_key(_family_id UUID, _key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _stored_hash TEXT;
BEGIN
  SELECT encryption_key_hash INTO _stored_hash
  FROM public.family_encryption_keys
  WHERE family_id = _family_id;
  
  IF _stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN crypt(_key, _stored_hash) = _stored_hash;
END;
$$;

-- Function to check if user can moderate posts (adults in family)
CREATE OR REPLACE FUNCTION public.can_moderate_family_posts(_uid UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.family_members fm
    JOIN public.users u ON u.id = fm.user_id
    WHERE fm.user_id = _uid 
      AND fm.family_id = _family_id 
      AND u.account_type = 'adult'
  );
$$;

-- Function to check if post needs moderation
CREATE OR REPLACE FUNCTION public.post_needs_moderation(_author_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users u
    JOIN public.family_members fm ON fm.user_id = u.id
    WHERE u.id = _author_id 
      AND fm.family_id = _family_id
      AND u.account_type = 'child'
  );
$$;

-- Function to archive old posts (30+ days) - for monthly cleanup
CREATE OR REPLACE FUNCTION public.archive_old_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _archived_count INTEGER;
BEGIN
  UPDATE public.board_posts
  SET archived_at = NOW()
  WHERE created_at < (NOW() - INTERVAL '30 days')
    AND archived_at IS NULL;
    
  GET DIAGNOSTICS _archived_count = ROW_COUNT;
  
  RETURN _archived_count;
END;
$$;

-- Function to permanently delete archived posts (for server-side cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_archived_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _deleted_count INTEGER;
BEGIN
  -- Delete posts that have been archived for more than 30 days
  DELETE FROM public.board_posts
  WHERE archived_at IS NOT NULL
    AND archived_at < (NOW() - INTERVAL '30 days');
    
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  
  RETURN _deleted_count;
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Family encryption keys policies
CREATE POLICY "Family members can view encryption keys" ON public.family_encryption_keys
  FOR SELECT USING (
    public.is_family_member(auth.uid(), family_id)
  );

CREATE POLICY "Family heads can manage encryption keys" ON public.family_encryption_keys
  FOR ALL USING (
    public.is_family_head(auth.uid(), family_id)
  );

-- Board posts policies
CREATE POLICY "Family members can view approved posts" ON public.board_posts
  FOR SELECT USING (
    public.is_family_member(auth.uid(), family_id)
    AND (moderation_status = 'approved' OR author_id = auth.uid())
  );

CREATE POLICY "Family members can create posts" ON public.board_posts
  FOR INSERT WITH CHECK (
    public.is_family_member(auth.uid(), family_id)
    AND author_id = auth.uid()
  );

CREATE POLICY "Authors and moderators can update posts" ON public.board_posts
  FOR UPDATE USING (
    public.is_family_member(auth.uid(), family_id)
    AND (
      author_id = auth.uid() 
      OR public.can_moderate_family_posts(auth.uid(), family_id)
    )
  );

CREATE POLICY "Authors and family heads can delete posts" ON public.board_posts
  FOR DELETE USING (
    public.is_family_member(auth.uid(), family_id)
    AND (
      author_id = auth.uid() 
      OR public.is_family_head(auth.uid(), family_id)
    )
  );

-- Post edits policies
CREATE POLICY "Family members can view edit history" ON public.board_post_edits
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM public.board_posts bp
      WHERE bp.id = post_id
        AND public.is_family_member(auth.uid(), bp.family_id)
    )
  );

CREATE POLICY "Editors can create edit history" ON public.board_post_edits
  FOR INSERT WITH CHECK (
    editor_id = auth.uid()
    AND EXISTS(
      SELECT 1 FROM public.board_posts bp
      WHERE bp.id = post_id
        AND public.is_family_member(auth.uid(), bp.family_id)
    )
  );

-- Todo list items policies
CREATE POLICY "Family members can manage todo items" ON public.todo_list_items
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.board_posts bp
      WHERE bp.id = post_id
        AND public.is_family_member(auth.uid(), bp.family_id)
    )
  );

-- Post attachments policies
CREATE POLICY "Family members can view attachments" ON public.board_post_attachments
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM public.board_posts bp
      WHERE bp.id = post_id
        AND public.is_family_member(auth.uid(), bp.family_id)
    )
  );

CREATE POLICY "Family members can upload attachments" ON public.board_post_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS(
      SELECT 1 FROM public.board_posts bp
      WHERE bp.id = post_id
        AND public.is_family_member(auth.uid(), bp.family_id)
    )
  );

-- Reminders policies
CREATE POLICY "Family members can manage reminders" ON public.board_post_reminders
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.board_posts bp
      WHERE bp.id = post_id
        AND public.is_family_member(auth.uid(), bp.family_id)
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_board_posts_updated_at 
  BEFORE UPDATE ON public.board_posts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_todo_list_items_updated_at 
  BEFORE UPDATE ON public.todo_list_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_encryption_keys_updated_at 
  BEFORE UPDATE ON public.family_encryption_keys 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create edit history when posts are updated
CREATE OR REPLACE FUNCTION public.create_post_edit_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history if content actually changed
  IF (OLD.title_encrypted IS DISTINCT FROM NEW.title_encrypted) OR
     (OLD.content_encrypted IS DISTINCT FROM NEW.content_encrypted) OR
     (OLD.metadata_encrypted IS DISTINCT FROM NEW.metadata_encrypted) THEN
    
    INSERT INTO public.board_post_edits (
      post_id,
      editor_id,
      previous_title_encrypted,
      previous_content_encrypted,
      previous_metadata_encrypted
    ) VALUES (
      OLD.id,
      auth.uid(),
      OLD.title_encrypted,
      OLD.content_encrypted,
      OLD.metadata_encrypted
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_board_post_edit_history
  BEFORE UPDATE ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.create_post_edit_history();

-- Trigger to set moderation status for child posts
CREATE OR REPLACE FUNCTION public.set_post_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if post needs moderation
  IF public.post_needs_moderation(NEW.author_id, NEW.family_id) THEN
    NEW.is_moderated = TRUE;
    NEW.moderation_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_board_post_moderation_status
  BEFORE INSERT ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_post_moderation_status();

-- ============================================================================
-- FUNCTIONS FOR CLIENT-SIDE USAGE
-- ============================================================================

-- Function to get family board posts with pagination
CREATE OR REPLACE FUNCTION public.get_family_board_posts(
  _family_id UUID,
  _limit INTEGER DEFAULT 20,
  _offset INTEGER DEFAULT 0,
  _post_type TEXT DEFAULT NULL,
  _search_query TEXT DEFAULT NULL,
  _include_archived BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  family_id UUID,
  author_id UUID,
  author_name TEXT,
  author_avatar_url TEXT,
  post_type TEXT,
  title_encrypted TEXT,
  content_encrypted TEXT,
  metadata_encrypted TEXT,
  is_pinned BOOLEAN,
  is_moderated BOOLEAN,
  moderation_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  attachment_count BIGINT,
  todo_items_count BIGINT,
  completed_todos_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    bp.id,
    bp.family_id,
    bp.author_id,
    u.name as author_name,
    u.avatar_url as author_avatar_url,
    bp.post_type,
    bp.title_encrypted,
    bp.content_encrypted,
    bp.metadata_encrypted,
    bp.is_pinned,
    bp.is_moderated,
    bp.moderation_status,
    bp.created_at,
    bp.updated_at,
    bp.archived_at,
    COALESCE(att.attachment_count, 0) as attachment_count,
    COALESCE(todos.todo_items_count, 0) as todo_items_count,
    COALESCE(todos.completed_todos_count, 0) as completed_todos_count
  FROM public.board_posts bp
  LEFT JOIN public.users u ON u.id = bp.author_id
  LEFT JOIN (
    SELECT post_id, COUNT(*) as attachment_count
    FROM public.board_post_attachments
    GROUP BY post_id
  ) att ON att.post_id = bp.id
  LEFT JOIN (
    SELECT 
      post_id, 
      COUNT(*) as todo_items_count,
      COUNT(*) FILTER (WHERE is_completed = true) as completed_todos_count
    FROM public.todo_list_items
    GROUP BY post_id
  ) todos ON todos.post_id = bp.id
  WHERE bp.family_id = _family_id
    AND public.is_family_member(auth.uid(), bp.family_id)
    AND (bp.moderation_status = 'approved' OR bp.author_id = auth.uid())
    AND (_post_type IS NULL OR bp.post_type = _post_type)
    AND (_include_archived OR bp.archived_at IS NULL)
    AND (
      _search_query IS NULL OR 
      bp.search_vector @@ plainto_tsquery('english', _search_query)
    )
  ORDER BY 
    bp.is_pinned DESC,
    bp.created_at DESC
  LIMIT _limit
  OFFSET _offset;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_family_encryption_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_family_encryption_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_moderate_family_posts TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_needs_moderation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_board_posts TO authenticated;

-- Grant permissions for cleanup functions (for scheduled jobs)
GRANT EXECUTE ON FUNCTION public.archive_old_posts TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_archived_posts TO service_role;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- No initial data needed - encryption keys will be generated when families are created

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.family_encryption_keys IS 'Stores encrypted family shared keys for board post encryption';
COMMENT ON TABLE public.board_posts IS 'Family board posts with encrypted content using family shared keys';
COMMENT ON TABLE public.board_post_edits IS 'Edit history for board posts';
COMMENT ON TABLE public.todo_list_items IS 'Items for shared todo/shopping lists';
COMMENT ON TABLE public.board_post_attachments IS 'File attachments for board posts (<=5MB)';
COMMENT ON TABLE public.board_post_reminders IS 'Time-based reminders for board posts';

COMMENT ON FUNCTION public.generate_family_encryption_key IS 'Generates and stores a new encryption key for a family';
COMMENT ON FUNCTION public.verify_family_encryption_key IS 'Verifies a family encryption key';
COMMENT ON FUNCTION public.archive_old_posts IS 'Archives posts older than 30 days (for monthly cleanup)';
COMMENT ON FUNCTION public.cleanup_archived_posts IS 'Permanently deletes archived posts (server-side cleanup)';
COMMENT ON FUNCTION public.get_family_board_posts IS 'Gets paginated family board posts with filters';