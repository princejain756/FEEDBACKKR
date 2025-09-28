const { loadSubmissions } = require('./_supabaseStore');

module.exports = async (req, res) => {
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const subs = await loadSubmissions();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    supabaseConfigured: hasSupabase,
    count: subs.length,
  }));
};
