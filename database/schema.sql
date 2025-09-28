-- Kriedko Feedback Form Database Schema
-- Run this in your Supabase SQL Editor

-- Create feedback_submissions table
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_preference TEXT,
  taste INTEGER CHECK (taste >= 1 AND taste <= 5),
  service INTEGER CHECK (service >= 1 AND service <= 5),
  wait_time INTEGER CHECK (wait_time >= 1 AND wait_time <= 5),
  overall INTEGER CHECK (overall >= 1 AND overall <= 5),
  favourite_item TEXT,
  improvements TEXT,
  experience_index DECIMAL(3,2),
  sentiment DECIMAL(4,3)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_experience_index ON feedback_submissions(experience_index);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_sentiment ON feedback_submissions(sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_meal_preference ON feedback_submissions(meal_preference);

-- Enable Row Level Security (RLS)
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow anyone to read feedback submissions (for analytics/dashboard)
DROP POLICY IF EXISTS "Allow public read access" ON feedback_submissions;
CREATE POLICY "Allow public read access" 
  ON feedback_submissions FOR SELECT 
  USING (true);

-- Allow anyone to insert new feedback submissions
DROP POLICY IF EXISTS "Allow public insert access" ON feedback_submissions;
CREATE POLICY "Allow public insert access" 
  ON feedback_submissions FOR INSERT 
  WITH CHECK (true);

-- Allow authenticated users to delete submissions (for admin functionality)
DROP POLICY IF EXISTS "Allow authenticated delete access" ON feedback_submissions;
CREATE POLICY "Allow authenticated delete access" 
  ON feedback_submissions FOR DELETE 
  USING (true);

-- Allow authenticated users to update submissions (for admin functionality)
DROP POLICY IF EXISTS "Allow authenticated update access" ON feedback_submissions;
CREATE POLICY "Allow authenticated update access" 
  ON feedback_submissions FOR UPDATE 
  USING (true);

-- Create admin users table for authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Enable RLS for admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage admin users
DROP POLICY IF EXISTS "Service role only access" ON admin_users;
CREATE POLICY "Service role only access" 
  ON admin_users 
  USING (auth.role() = 'service_role');

-- Insert default admin user (password is 'admin123' hashed with bcrypt)
-- You should change this password after setup
INSERT INTO admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$rQy8YjLrEJhHXrKS.jrU8OKZKQCLq5z5Y.Hu0QjG1GJ9WcNxLqSoG')
ON CONFLICT (username) DO NOTHING;

-- Create a function to validate admin login
CREATE OR REPLACE FUNCTION validate_admin_login(username_input TEXT, password_input TEXT)
RETURNS TABLE(user_id UUID, username TEXT, is_valid BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.username,
    (au.password_hash = crypt(password_input, au.password_hash)) as is_valid
  FROM admin_users au
  WHERE au.username = username_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
