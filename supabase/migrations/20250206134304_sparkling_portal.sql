/*
  # Forum Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - Matches auth.users id
      - `username` (text, unique)
      - `avatar_url` (text)
      - `is_vip` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)

    - `topics`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `author_id` (uuid, references profiles)
      - `category_id` (uuid, references categories)
      - `is_vip` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `comments`
      - `id` (uuid, primary key)
      - `content` (text)
      - `author_id` (uuid, references profiles)
      - `topic_id` (uuid, references topics)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for public read access where appropriate
*/

-- Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  avatar_url text,
  is_vip boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories
  FOR SELECT
  USING (true);

-- Topics table
CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
  is_vip boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topics are viewable by everyone"
  ON topics
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create topics"
  ON topics
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own topics"
  ON topics
  FOR UPDATE
  USING (auth.uid() = author_id);

-- Comments table
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  topic_id uuid REFERENCES topics(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON comments
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments"
  ON comments
  FOR UPDATE
  USING (auth.uid() = author_id);

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES
  ('Teknoloji', 'teknoloji', 'Teknoloji dünyasındaki son gelişmeler ve tartışmalar'),
  ('Spor', 'spor', 'Spor dünyasından haberler ve tartışmalar'),
  ('Oyunlar', 'oyunlar', 'Video oyunları hakkında her şey'),
  ('Bilim', 'bilim', 'Bilimsel gelişmeler ve keşifler'),
  ('Sanat', 'sanat', 'Sanat dünyasından haberler ve tartışmalar'),
  ('Müzik', 'muzik', 'Müzik dünyasından haberler ve tartışmalar'),
  ('Seyahat', 'seyahat', 'Seyahat deneyimleri ve önerileri');

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();