const { createClient } = require('@supabase/supabase-js');

// Server-side client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Client-side client with anon key for public operations
const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = {
  supabaseAdmin,
  supabaseClient
};
