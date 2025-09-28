const { computeAggregates } = require('./_utils');
const { loadSubmissions } = require('./_supabaseStore');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405; res.setHeader('Allow', 'GET'); res.end('Method Not Allowed'); return;
  }
  const subs = await loadSubmissions();
  const agg = computeAggregates(subs);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(agg));
};

