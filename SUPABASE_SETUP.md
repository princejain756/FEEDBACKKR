# Supabase Database Setup for Kriedko Feedback Form

## Step 1: Set up the Database Schema

Go to your Supabase dashboard (https://uotvcxsudnemwsjjsspi.supabase.co/project/uotvcxsudnemwsjjsspi) and navigate to the **SQL Editor**.

Run the following SQL to create the required tables and policies:

```sql
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

-- Insert default admin user (password is 'admin123')
-- You should change this password after setup
INSERT INTO admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$rQy8YjLrEJhHXrKS.jrU8OKZKQCLq5z5Y.Hu0QjG1GJ9WcNxLqSoG')
ON CONFLICT (username) DO NOTHING;
```

## Step 2: Test the Connection

After running the SQL above, test the database connection:

```bash
npm run test-db
```

## Step 3: Migrate Existing Data (if any)

If you have existing feedback data in local storage or Vercel KV, you can migrate it using:

```bash
npm run migrate-data
```

## Step 4: Start the Application

```bash
npm start
```

## Environment Variables

The following environment variables are already configured in your `.env` file:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side admin operations
- `REACT_APP_SUPABASE_URL` - Public URL for React frontend
- `REACT_APP_SUPABASE_ANON_KEY` - Public anon key for React frontend

## Database Schema

### feedback_submissions table
- `id` (TEXT, PRIMARY KEY) - Unique identifier for each submission
- `created_at` (TIMESTAMPTZ) - When the feedback was submitted
- `meal_preference` (TEXT) - Customer's meal preference
- `taste` (INTEGER 1-5) - Taste rating
- `service` (INTEGER 1-5) - Service rating
- `wait_time` (INTEGER 1-5) - Wait time rating
- `overall` (INTEGER 1-5) - Overall experience rating
- `favourite_item` (TEXT) - Customer's favorite item
- `improvements` (TEXT) - Suggested improvements
- `experience_index` (DECIMAL) - Calculated average of all ratings
- `sentiment` (DECIMAL) - Sentiment score of text feedback

### admin_users table
- `id` (UUID, PRIMARY KEY) - Unique identifier for admin users
- `username` (TEXT, UNIQUE) - Admin username
- `password_hash` (TEXT) - Hashed password
- `created_at` (TIMESTAMPTZ) - When the admin was created
- `last_login` (TIMESTAMPTZ) - Last login timestamp

## Security

- Row Level Security (RLS) is enabled on all tables
- Public users can read and insert feedback submissions
- Only authenticated admin users can delete/update submissions
- Admin user management is restricted to service role access

## Default Admin Login

- Username: `admin`
- Password: `admin123`

**⚠️ Important: Change the admin password after initial setup!**
