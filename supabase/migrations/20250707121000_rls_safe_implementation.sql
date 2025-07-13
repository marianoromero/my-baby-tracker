-- Safe RLS Implementation - Idempotent version
-- This migration can be run multiple times safely

-- =====================================================
-- STEP 1: Enable RLS (safe)
-- =====================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Enable RLS for special_action_configs if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'special_action_configs') THEN
        EXECUTE 'ALTER TABLE special_action_configs ENABLE ROW LEVEL SECURITY';
    END IF;
END
$$;

-- =====================================================
-- STEP 2: Create helper function (replace if exists)
-- =====================================================

CREATE OR REPLACE FUNCTION user_belongs_to_family(family_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = family_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: Create policies (safe - drop and recreate)
-- =====================================================

-- FAMILIES table policies
DROP POLICY IF EXISTS "Users can view their families" ON families;
DROP POLICY IF EXISTS "Users can update their families" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;

CREATE POLICY "Users can view their families" ON families
  FOR SELECT USING (user_belongs_to_family(id));

CREATE POLICY "Users can update their families" ON families
  FOR UPDATE USING (user_belongs_to_family(id))
  WITH CHECK (user_belongs_to_family(id));

CREATE POLICY "Users can create families" ON families
  FOR INSERT WITH CHECK (true);

-- FAMILY_MEMBERS table policies
DROP POLICY IF EXISTS "Users can view family memberships" ON family_members;
DROP POLICY IF EXISTS "Users can join families" ON family_members;
DROP POLICY IF EXISTS "Users can update their memberships" ON family_members;
DROP POLICY IF EXISTS "Users can delete their memberships" ON family_members;

CREATE POLICY "Users can view family memberships" ON family_members
  FOR SELECT USING (user_id = auth.uid() OR user_belongs_to_family(family_id));

CREATE POLICY "Users can join families" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their memberships" ON family_members
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their memberships" ON family_members
  FOR DELETE USING (user_id = auth.uid());

-- SUBJECTS table policies
DROP POLICY IF EXISTS "Users can view family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can create family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete family subjects" ON subjects;

CREATE POLICY "Users can view family subjects" ON subjects
  FOR SELECT USING (user_belongs_to_family(family_id));

CREATE POLICY "Users can create family subjects" ON subjects
  FOR INSERT WITH CHECK (user_belongs_to_family(family_id));

CREATE POLICY "Users can update family subjects" ON subjects
  FOR UPDATE USING (user_belongs_to_family(family_id))
  WITH CHECK (user_belongs_to_family(family_id));

CREATE POLICY "Users can delete family subjects" ON subjects
  FOR DELETE USING (user_belongs_to_family(family_id));

-- ACTIONS table policies
DROP POLICY IF EXISTS "Users can view family actions" ON actions;
DROP POLICY IF EXISTS "Users can create family actions" ON actions;
DROP POLICY IF EXISTS "Users can update family actions" ON actions;
DROP POLICY IF EXISTS "Users can delete family actions" ON actions;

CREATE POLICY "Users can view family actions" ON actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can create family actions" ON actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can update family actions" ON actions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can delete family actions" ON actions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  );

-- EVENTS table policies
DROP POLICY IF EXISTS "Users can view family events" ON events;
DROP POLICY IF EXISTS "Users can create family events" ON events;
DROP POLICY IF EXISTS "Users can update their family events" ON events;
DROP POLICY IF EXISTS "Users can delete their family events" ON events;

CREATE POLICY "Users can view family events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can create family events" ON events
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can update their family events" ON events
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  ) WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can delete their family events" ON events
  FOR DELETE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_belongs_to_family(subjects.family_id)
    )
  );

-- SPECIAL_ACTION_CONFIGS table policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'special_action_configs') THEN
        
        EXECUTE 'DROP POLICY IF EXISTS "Users can view family special configs" ON special_action_configs';
        EXECUTE 'DROP POLICY IF EXISTS "Users can create family special configs" ON special_action_configs';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update family special configs" ON special_action_configs';
        EXECUTE 'DROP POLICY IF EXISTS "Users can delete family special configs" ON special_action_configs';

        EXECUTE 'CREATE POLICY "Users can view family special configs" ON special_action_configs
          FOR SELECT USING (user_belongs_to_family(family_id))';

        EXECUTE 'CREATE POLICY "Users can create family special configs" ON special_action_configs
          FOR INSERT WITH CHECK (user_belongs_to_family(family_id))';

        EXECUTE 'CREATE POLICY "Users can update family special configs" ON special_action_configs
          FOR UPDATE USING (user_belongs_to_family(family_id))
          WITH CHECK (user_belongs_to_family(family_id))';

        EXECUTE 'CREATE POLICY "Users can delete family special configs" ON special_action_configs
          FOR DELETE USING (user_belongs_to_family(family_id))';
    END IF;
END
$$;

-- =====================================================
-- STEP 4: Create diagnostic function
-- =====================================================

CREATE OR REPLACE FUNCTION rls_diagnostic()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
  FROM pg_tables t
  WHERE schemaname = 'public' 
  AND tablename IN ('families', 'family_members', 'subjects', 'actions', 'events', 'special_action_configs')
  ORDER BY tablename;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: Verification
-- =====================================================

-- Show RLS status
SELECT 'RLS Implementation Complete - Run: SELECT * FROM rls_diagnostic(); to verify' as status;