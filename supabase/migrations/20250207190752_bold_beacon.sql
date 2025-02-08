/*
  # Fix topic deletion with cascade

  1. Changes
    - Add CASCADE delete constraint to comments table
    - Update topic deletion policy
    - Add function for safe topic deletion

  2. Security
    - Only staff members can delete topics
    - Comments are automatically deleted when topic is deleted
*/

-- Drop existing foreign key constraint
ALTER TABLE comments
DROP CONSTRAINT comments_topic_id_fkey;

-- Add new foreign key constraint with CASCADE delete
ALTER TABLE comments
ADD CONSTRAINT comments_topic_id_fkey
FOREIGN KEY (topic_id)
REFERENCES topics(id)
ON DELETE CASCADE;

-- Function to safely delete a topic
CREATE OR REPLACE FUNCTION delete_topic(topic_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if user is staff
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.level >= 7
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Delete the topic (comments will be deleted automatically due to CASCADE)
  DELETE FROM topics WHERE id = topic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;