-- Add ban and mute columns to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_muted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_muted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'ban_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ban_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'mute_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mute_expires_at timestamptz;
  END IF;
END $$;

-- Function to ban a user
CREATE OR REPLACE FUNCTION ban_user(user_id uuid, ban_duration text)
RETURNS void AS $$
DECLARE
  duration_interval interval;
  expiry timestamptz;
BEGIN
  -- Convert duration string to interval
  CASE ban_duration
    WHEN '1h' THEN duration_interval := interval '1 hour';
    WHEN '24h' THEN duration_interval := interval '24 hours';
    WHEN '7d' THEN duration_interval := interval '7 days';
    WHEN 'permanent' THEN duration_interval := interval '100 years';
    ELSE
      -- Parse custom duration (e.g., '12h', '3d', '2w')
      duration_interval := CASE
        WHEN ban_duration ~ '^[0-9]+h$' THEN (substring(ban_duration from '^([0-9]+)h$'))::integer * interval '1 hour'
        WHEN ban_duration ~ '^[0-9]+d$' THEN (substring(ban_duration from '^([0-9]+)d$'))::integer * interval '1 day'
        WHEN ban_duration ~ '^[0-9]+w$' THEN (substring(ban_duration from '^([0-9]+)w$'))::integer * interval '1 week'
        ELSE interval '24 hours' -- default to 24 hours if invalid format
      END;
  END CASE;

  -- Calculate expiry time
  expiry := CASE
    WHEN ban_duration = 'permanent' THEN NULL
    ELSE now() + duration_interval
  END;

  -- Update user profile
  UPDATE profiles
  SET 
    is_banned = true,
    ban_expires_at = expiry
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mute a user
CREATE OR REPLACE FUNCTION mute_user(user_id uuid, mute_duration text)
RETURNS void AS $$
DECLARE
  duration_interval interval;
  expiry timestamptz;
BEGIN
  -- Convert duration string to interval
  CASE mute_duration
    WHEN '1h' THEN duration_interval := interval '1 hour';
    WHEN '24h' THEN duration_interval := interval '24 hours';
    WHEN '7d' THEN duration_interval := interval '7 days';
    WHEN 'permanent' THEN duration_interval := interval '100 years';
    ELSE
      -- Parse custom duration (e.g., '12h', '3d', '2w')
      duration_interval := CASE
        WHEN mute_duration ~ '^[0-9]+h$' THEN (substring(mute_duration from '^([0-9]+)h$'))::integer * interval '1 hour'
        WHEN mute_duration ~ '^[0-9]+d$' THEN (substring(mute_duration from '^([0-9]+)d$'))::integer * interval '1 day'
        WHEN mute_duration ~ '^[0-9]+w$' THEN (substring(mute_duration from '^([0-9]+)w$'))::integer * interval '1 week'
        ELSE interval '24 hours' -- default to 24 hours if invalid format
      END;
  END CASE;

  -- Calculate expiry time
  expiry := CASE
    WHEN mute_duration = 'permanent' THEN NULL
    ELSE now() + duration_interval
  END;

  -- Update user profile
  UPDATE profiles
  SET 
    is_muted = true,
    mute_expires_at = expiry
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically unban/unmute users when their punishment expires
CREATE OR REPLACE FUNCTION check_punishment_expiry()
RETURNS void AS $$
BEGIN
  -- Unban users whose ban has expired
  UPDATE profiles
  SET 
    is_banned = false,
    ban_expires_at = NULL
  WHERE is_banned = true
    AND ban_expires_at IS NOT NULL
    AND ban_expires_at <= now();

  -- Unmute users whose mute has expired
  UPDATE profiles
  SET 
    is_muted = false,
    mute_expires_at = NULL
  WHERE is_muted = true
    AND mute_expires_at IS NOT NULL
    AND mute_expires_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the expiry check to run every minute
SELECT cron.schedule(
  'check-punishments',
  '* * * * *',
  'SELECT check_punishment_expiry()'
);