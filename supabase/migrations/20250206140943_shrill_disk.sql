/*
  # Add real-time chat functionality

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `content` (text, max 200 chars)
      - `author_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `chat_messages` table
    - Add policies for authenticated users
*/

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add character limit to chat messages
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_content_length_check
CHECK (length(content) <= 200);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Chat messages are viewable by everyone"
  ON chat_messages
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);