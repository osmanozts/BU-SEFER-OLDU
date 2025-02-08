/*
  # Add chat message cleanup

  1. Changes
    - Add function to delete messages older than 15 minutes
    - Add trigger to run cleanup every 15 minutes
  
  2. Security
    - Function runs with security definer to ensure it has proper permissions
*/

-- Function to delete old chat messages
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_messages 
  WHERE created_at < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create extension if it doesn't exist (required for pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run every 15 minutes
SELECT cron.schedule(
  'cleanup-chat-messages',   -- unique schedule name
  '*/15 * * * *',           -- every 15 minutes
  'SELECT cleanup_old_chat_messages()'
);