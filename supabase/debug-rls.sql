-- Debug RLS policies for families table

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t 
WHERE schemaname = 'public' AND tablename = 'families';

-- Check what policies exist for families
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'families'
ORDER BY cmd;

-- Test if current user can insert (this should work for authenticated users)
SELECT 
  'Current user ID:' as info,
  auth.uid() as user_id;

-- Test the user_can_access_family function
SELECT 
  'Testing user_can_access_family function' as test,
  user_can_access_family('00000000-0000-0000-0000-000000000000'::uuid) as result;

-- Show all RLS functions
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%family%'
ORDER BY routine_name;