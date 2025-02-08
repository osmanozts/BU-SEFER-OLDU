/*
  # Add profile fields

  1. Changes
    - Add `banner_url` column to profiles table for storing banner image URLs
    - Add `bio` column to profiles table for storing user biographies

  2. Security
    - Maintains existing RLS policies
    - No additional security changes needed as these are just new columns
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banner_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;
END $$;