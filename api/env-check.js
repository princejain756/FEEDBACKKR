// Environment check endpoint
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405; 
    res.setHeader('Allow', 'GET'); 
    res.end('Method Not Allowed'); 
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    supabase_url: process.env.SUPABASE_URL,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_anon_key: !!process.env.SUPABASE_ANON_KEY,
    node_env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL
  }));
};
