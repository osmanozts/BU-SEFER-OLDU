/*
  # Add topic deletion and role management policies

  1. Changes
    - Add RLS policy for topic deletion
    - Add RLS policy for role management
    - Add function to check staff permissions

  2. Security
    - Only staff members (level 7+) can delete topics
    - Role management follows hierarchy rules
*/

-- Add policy for topic deletion (staff only)
CREATE POLICY "Staff can delete topics"
  ON topics
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.level >= 7
    )
  );

-- Function to check if user is staff
CREATE OR REPLACE FUNCTION is_staff(user_id uuid)
RETURNS boolean AS $$
DECLARE
  highest_role_level integer;
BEGIN
  SELECT MAX(r.level) INTO highest_role_level
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id;

  RETURN COALESCE(highest_role_level >= 7, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;