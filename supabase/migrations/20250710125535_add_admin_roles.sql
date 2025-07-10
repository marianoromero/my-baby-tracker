-- Migration: Add admin roles to family_members table
-- Created: 2025-07-10 12:55:35
-- Purpose: Add role-based permissions system and make mariano.es@gmail.com admin of family FWKZPX

-- Add role column to family_members table
ALTER TABLE family_members 
ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member'));

-- Create an index for faster role-based queries
CREATE INDEX idx_family_members_role ON family_members(role);

-- Make mariano.es@gmail.com admin of family FWKZPX
UPDATE family_members 
SET role = 'admin' 
WHERE user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'mariano.es@gmail.com'
)
AND family_id = (
    SELECT id FROM families 
    WHERE invitation_code = 'FWKZPX'
);

-- For future family creations, automatically make the first member (creator) an admin
-- Note: This will be handled in the application code, not in triggers for simplicity

-- Add a helper function to check if a user is admin of a family
CREATE OR REPLACE FUNCTION is_family_admin(user_uuid UUID, family_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM family_members 
        WHERE user_id = user_uuid 
        AND family_id = family_uuid 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for admin-only operations (like deleting members)
-- This policy will allow admins to manage family members
CREATE POLICY family_admin_can_manage_members ON family_members
    FOR DELETE
    USING (
        is_family_admin(auth.uid(), family_id)
    );

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION is_family_admin(UUID, UUID) TO authenticated;

-- Add comment to document the role system
COMMENT ON COLUMN family_members.role IS 'Role of the user in the family: admin (can manage members) or member (regular user)';
COMMENT ON FUNCTION is_family_admin(UUID, UUID) IS 'Helper function to check if a user has admin role in a specific family';

-- Note: When deleting subjects (family members), the events table preserves
-- historical data. Events will show as "Miembro eliminado" in the timeline
-- but the event data and timestamps are maintained for family history.