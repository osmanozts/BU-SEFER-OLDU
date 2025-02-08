/*
  # Add role management system

  1. Changes
    - Add function to grant roles
    - Add function to revoke roles
    - Update role granting policies

  2. Security
    - Only staff members can grant/revoke roles
    - Staff can only grant roles lower than their own level
*/

-- Function to grant a role to a user
CREATE OR REPLACE FUNCTION grant_role(target_user_id uuid, role_id uuid)
RETURNS void AS $$
DECLARE
  granter_level integer;
  target_role_level integer;
BEGIN
  -- Get granter's highest role level
  SELECT MAX(r.level) INTO granter_level
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid();

  -- Get target role level
  SELECT level INTO target_role_level
  FROM roles
  WHERE id = role_id;

  -- Check permissions
  IF granter_level IS NULL OR target_role_level IS NULL THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF granter_level <= target_role_level THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Grant the role
  INSERT INTO user_roles (user_id, role_id, granted_by)
  VALUES (target_user_id, role_id, auth.uid())
  ON CONFLICT (user_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke a role from a user
CREATE OR REPLACE FUNCTION revoke_role(target_user_id uuid, role_id uuid)
RETURNS void AS $$
DECLARE
  granter_level integer;
  target_role_level integer;
BEGIN
  -- Get granter's highest role level
  SELECT MAX(r.level) INTO granter_level
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid();

  -- Get target role level
  SELECT level INTO target_role_level
  FROM roles
  WHERE id = role_id;

  -- Check permissions
  IF granter_level IS NULL OR target_role_level IS NULL THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF granter_level <= target_role_level THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Revoke the role
  DELETE FROM user_roles
  WHERE user_id = target_user_id
  AND role_id = role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;