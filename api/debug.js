// Debug endpoint to check Supabase connection and recent records
const { supabaseAdmin } = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405; 
    res.setHeader('Allow', 'GET'); 
    res.end('Method Not Allowed'); 
    return;
  }

  try {
    // Test Supabase connection
    const { data, error } = await supabaseAdmin
      .from('feedback_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing',
      total_records: data ? data.length : 0,
      error: error ? error.message : null,
      latest_records: data ? data.map(r => ({
        id: r.id,
        created_at: r.created_at,
        meal_preference: r.meal_preference,
        favourite_item: r.favourite_item?.substring(0, 50)
      })) : []
    }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: e.message,
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    }));
  }
};
