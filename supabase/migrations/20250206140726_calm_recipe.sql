/*
  # Add character limits to topics and comments

  1. Changes
    - Add check constraints for maximum lengths on topics and comments
    - Add trigger to update updated_at timestamp
*/

-- Add character limits to topics
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'topics_title_length_check'
  ) THEN
    ALTER TABLE topics
    ADD CONSTRAINT topics_title_length_check
    CHECK (length(title) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'topics_content_length_check'
  ) THEN
    ALTER TABLE topics
    ADD CONSTRAINT topics_content_length_check
    CHECK (length(content) <= 2000);
  END IF;
END $$;

-- Add character limit to comments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'comments_content_length_check'
  ) THEN
    ALTER TABLE comments
    ADD CONSTRAINT comments_content_length_check
    CHECK (length(content) <= 500);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to topics table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_topics_updated_at'
  ) THEN
    CREATE TRIGGER update_topics_updated_at
      BEFORE UPDATE ON topics
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add trigger to comments table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_comments_updated_at'
  ) THEN
    CREATE TRIGGER update_comments_updated_at
      BEFORE UPDATE ON comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;