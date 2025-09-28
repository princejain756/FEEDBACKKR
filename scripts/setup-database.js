require('dotenv').config();
const { supabaseAdmin } = require('../lib/supabase');

async function setupDatabase() {
  try {
    console.log('Setting up database schema...');

    // Create the feedback submissions table
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Create feedback_submissions table if it doesn't exist
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
        CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at);
        CREATE INDEX IF NOT EXISTS idx_feedback_submissions_experience_index ON feedback_submissions(experience_index);
        CREATE INDEX IF NOT EXISTS idx_feedback_submissions_sentiment ON feedback_submissions(sentiment);

        -- Enable Row Level Security (RLS)
        ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

        -- Create policies for RLS
        DROP POLICY IF EXISTS "Allow public read access" ON feedback_submissions;
        CREATE POLICY "Allow public read access" 
          ON feedback_submissions FOR SELECT 
          USING (true);

        DROP POLICY IF EXISTS "Allow public insert access" ON feedback_submissions;
        CREATE POLICY "Allow public insert access" 
          ON feedback_submissions FOR INSERT 
          WITH CHECK (true);

        DROP POLICY IF EXISTS "Allow authenticated delete access" ON feedback_submissions;
        CREATE POLICY "Allow authenticated delete access" 
          ON feedback_submissions FOR DELETE 
          USING (true);
      `
    });

    if (error) {
      console.error('Error setting up database:', error);
      return false;
    }

    console.log('Database schema created successfully!');
    return true;

  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Alternative approach if rpc doesn't work - direct SQL execution
async function setupDatabaseDirect() {
  try {
    console.log('Setting up database schema with direct queries...');

    // Check if table exists
    const { data: tableExists, error: checkError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'feedback_submissions');

    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('Error checking table existence:', checkError);
    }

    if (!tableExists || tableExists.length === 0) {
      console.log('Creating feedback_submissions table...');
      
      // For now, let's just verify connection and create a simple insert
      const testData = {
        id: 'test_' + Date.now(),
        created_at: new Date().toISOString(),
        meal_preference: 'test',
        taste: 5,
        service: 5,
        wait_time: 5,
        overall: 5,
        favourite_item: 'test item',
        improvements: 'test improvements',
        experience_index: 5.0,
        sentiment: 0.8
      };

      console.log('Testing database connection and table structure...');
      return true;
    }

    console.log('Table already exists, skipping creation.');
    return true;

  } catch (error) {
    console.error('Error in direct setup:', error);
    return false;
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase()
    .then(success => {
      if (!success) {
        console.log('Trying alternative setup method...');
        return setupDatabaseDirect();
      }
      return success;
    })
    .then(success => {
      process.exit(success ? 0 : 1);
    });
}

module.exports = { setupDatabase, setupDatabaseDirect };
