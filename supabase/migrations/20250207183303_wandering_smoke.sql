/*
  # Add role system
  
  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `level` (integer) - for permission hierarchy
      - `created_at` (timestamp)
    
    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `role_id` (uuid, references roles)
      - `granted_by` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for role management
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  level integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  role_id uuid REFERENCES roles(id) NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for roles table
CREATE POLICY "Roles are viewable by everyone"
  ON roles FOR SELECT
  USING (true);

-- Policies for user_roles table
CREATE POLICY "User roles are viewable by everyone"
  ON user_roles FOR SELECT
  USING (true);

-- Policy for granting VIP roles (Admin, Yönetici, Kurucu can grant VIP roles)
CREATE POLICY "Grant VIP roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.level >= 7 -- Admin ve üstü
    )
    AND EXISTS (
      SELECT 1 FROM roles
      WHERE id = user_roles.role_id
      AND level <= 6 -- VIP rolleri
    )
  );

-- Policy for granting staff roles (Yönetici, Kurucu can grant staff roles)
CREATE POLICY "Grant staff roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.level >= 8 -- Yönetici ve üstü
    )
    AND EXISTS (
      SELECT 1 FROM roles
      WHERE id = user_roles.role_id
      AND level BETWEEN 7 AND 8 -- Destek, Moderatör, Admin
    )
  );

-- Policy for granting manager role (only Kurucu can grant)
CREATE POLICY "Grant manager role"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.level = 9 -- Kurucu
    )
    AND EXISTS (
      SELECT 1 FROM roles
      WHERE id = user_roles.role_id
      AND level = 8 -- Yönetici
    )
  );

-- Insert default roles
INSERT INTO roles (name, level) VALUES
  ('Üye', 1),
  ('Premium', 2),
  ('VIP', 3),
  ('Süper VIP', 4),
  ('Ultra VIP', 5),
  ('Destek', 6),
  ('Moderatör', 7),
  ('Admin', 8),
  ('Yönetici', 9),
  ('Kurucu', 10);

-- Function to automatically assign member role to new users
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role_id)
  SELECT NEW.id, r.id
  FROM roles r
  WHERE r.name = 'Üye';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to assign default role
CREATE TRIGGER assign_member_role
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();

-- Function to check if user can grant role
CREATE OR REPLACE FUNCTION can_grant_role(granter_id uuid, role_name text)
RETURNS boolean AS $$
DECLARE
  granter_level integer;
  role_level integer;
BEGIN
  -- Get granter's highest role level
  SELECT MAX(r.level) INTO granter_level
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = granter_id;

  -- Get target role level
  SELECT level INTO role_level
  FROM roles
  WHERE name = role_name;

  -- Check permission based on role hierarchy
  RETURN CASE
    WHEN granter_level >= 9 THEN true -- Kurucu can grant any role
    WHEN granter_level >= 8 AND role_level <= 7 THEN true -- Yönetici can grant up to Admin
    WHEN granter_level >= 7 AND role_level <= 6 THEN true -- Admin can grant up to VIP roles
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;