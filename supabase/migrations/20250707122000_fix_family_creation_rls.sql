-- Fix RLS policy for family creation
-- The current policy prevents users from creating families because they need to belong to a family to create one

-- Drop and recreate the family creation policy
DROP POLICY IF EXISTS "Users can create families" ON families;

-- Allow authenticated users to create families (any authenticated user can create a new family)
CREATE POLICY "Users can create families" ON families
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the function helper works correctly for new families
-- Update the policy for viewing families to handle new families better
DROP POLICY IF EXISTS "Users can view their families" ON families;

CREATE POLICY "Users can view their families" ON families
  FOR SELECT
  USING (
    -- Allow viewing if user belongs to the family OR if they just created it
    user_belongs_to_family(id) OR 
    -- Allow the creator to see the family immediately after creation
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_id = families.id 
      AND user_id = auth.uid()
    )
  );

-- Create a more efficient helper function for family access
CREATE OR REPLACE FUNCTION user_can_access_family(family_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = family_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the view policy to use the new function
DROP POLICY IF EXISTS "Users can view their families" ON families;

CREATE POLICY "Users can view their families" ON families
  FOR SELECT
  USING (user_can_access_family(id));

-- Update the update policy to use the new function
DROP POLICY IF EXISTS "Users can update their families" ON families;

CREATE POLICY "Users can update their families" ON families
  FOR UPDATE
  USING (user_can_access_family(id))
  WITH CHECK (user_can_access_family(id));

-- Update all other policies to use the more efficient function
-- FAMILY_MEMBERS policies remain the same since they already work correctly

-- Update SUBJECTS policies
DROP POLICY IF EXISTS "Users can view family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can create family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete family subjects" ON subjects;

CREATE POLICY "Users can view family subjects" ON subjects
  FOR SELECT USING (user_can_access_family(family_id));

CREATE POLICY "Users can create family subjects" ON subjects
  FOR INSERT WITH CHECK (user_can_access_family(family_id));

CREATE POLICY "Users can update family subjects" ON subjects
  FOR UPDATE 
  USING (user_can_access_family(family_id))
  WITH CHECK (user_can_access_family(family_id));

CREATE POLICY "Users can delete family subjects" ON subjects
  FOR DELETE USING (user_can_access_family(family_id));

-- Update ACTIONS policies
DROP POLICY IF EXISTS "Users can view family actions" ON actions;
DROP POLICY IF EXISTS "Users can create family actions" ON actions;
DROP POLICY IF EXISTS "Users can update family actions" ON actions;
DROP POLICY IF EXISTS "Users can delete family actions" ON actions;

CREATE POLICY "Users can view family actions" ON actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can create family actions" ON actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can update family actions" ON actions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can delete family actions" ON actions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = actions.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  );

-- Update EVENTS policies
DROP POLICY IF EXISTS "Users can view family events" ON events;
DROP POLICY IF EXISTS "Users can create family events" ON events;
DROP POLICY IF EXISTS "Users can update their family events" ON events;
DROP POLICY IF EXISTS "Users can delete their family events" ON events;

CREATE POLICY "Users can view family events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can create family events" ON events
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can update their family events" ON events
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  ) WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  );

CREATE POLICY "Users can delete their family events" ON events
  FOR DELETE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = events.subject_id 
      AND user_can_access_family(subjects.family_id)
    )
  );

-- Update SPECIAL_ACTION_CONFIGS policies (if table exists)
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
          FOR SELECT USING (user_can_access_family(family_id))';

        EXECUTE 'CREATE POLICY "Users can create family special configs" ON special_action_configs
          FOR INSERT WITH CHECK (user_can_access_family(family_id))';

        EXECUTE 'CREATE POLICY "Users can update family special configs" ON special_action_configs
          FOR UPDATE USING (user_can_access_family(family_id))
          WITH CHECK (user_can_access_family(family_id))';

        EXECUTE 'CREATE POLICY "Users can delete family special configs" ON special_action_configs
          FOR DELETE USING (user_can_access_family(family_id))';
    END IF;
END
$$;

-- Update diagnostic function
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

-- Show status
SELECT 'Family creation RLS fixed - Users can now create families' as status;