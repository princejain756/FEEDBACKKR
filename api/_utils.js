const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'kriedko-session-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'kriedkoadmin1235$2';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-kriedko';

function parseCookies(req) {
  const header = req.headers['cookie'] || '';
  const out = {};
  header.split(';').forEach((p) => {
    const [k, v] = p.split('=');
    if (!k) return;
    out[k.trim()] = decodeURIComponent((v || '').trim());
  });
  return out;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signToken(payloadObj) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(payloadObj));
  const data = `${head}.${body}`;
  const sig = b64url(crypto.createHmac('sha256', SESSION_SECRET).update(data).digest());
  return `${data}.${sig}`;
}

function verifyToken(token) {
  try {
    const [head, body, sig] = token.split('.');
    if (!head || !body || !sig) return null;
    const data = `${head}.${body}`;
    const expected = b64url(crypto.createHmac('sha256', SESSION_SECRET).update(data).digest());
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function assertSession(req) {
  const cookies = parseCookies(req);
  const token = cookies['kriedko_admin'];
  if (!token) return false;
  const payload = verifyToken(token);
  return !!payload;
}

function assertAdmin(req) {
  const token = req.headers['x-admin-token'];
  if (token && token === ADMIN_TOKEN) return true;
  return assertSession(req);
}

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const POSITIVE = new Set([
  'good','great','amazing','awesome','fantastic','delicious','tasty','yummy','love','loved','fresh','friendly','fast','perfect','best','wow','nice','excellent','incredible','divine','heavenly','juicy','crispy','tender','savory','sweet','spicy','rich','flavourful','flavorful','balanced','satisfying','quick','warm','cozy','clean','recommend','recommended'
]);
const NEGATIVE = new Set([
  'bad','terrible','awful','disappointing','slow','cold','stale','bland','salty','soggy','greasy','burnt','overcooked','undercooked','rude','expensive','dirty','worst','meh','okay','ok','average','late','wait','delay','noise','noisy','crowded','hard','raw','dry','tough','chewy','boring','weak','watery','too','less','under','over','issue','problem','complaint'
]);

function sentimentScore(...texts) {
  const words = texts.flatMap(tokenize);
  let score = 0;
  for (const w of words) {
    if (POSITIVE.has(w)) score += 1;
    if (NEGATIVE.has(w)) score -= 1;
  }
  const normalized = Math.max(-1, Math.min(1, score / 10));
  const label = normalized > 0.15 ? 'positive' : normalized < -0.15 ? 'negative' : 'neutral';
  return { score: normalized, label };
}

function computeAggregates(subs) {
  const aggregates = {
    count: subs.length || 0,
    averages: { taste: 0, service: 0, wait: 0, overall: 0, experienceIndex: 0 },
    sentiment: { positive: 0, neutral: 0, negative: 0, averageScore: 0 },
  };
  if (!subs.length) return aggregates;
  let sums = { taste: 0, service: 0, wait: 0, overall: 0 };
  let sScore = 0;
  for (const s of subs) {
    sums.taste += s.taste || 0;
    sums.service += s.service || 0;
    sums.wait += s.wait || 0;
    sums.overall += s.overall || 0;
    sScore += (s.sentiment && typeof s.sentiment.score === 'number') ? s.sentiment.score : 0;
    if (s.sentiment) aggregates.sentiment[s.sentiment.label] = (aggregates.sentiment[s.sentiment.label] || 0) + 1;
  }
  aggregates.averages.taste = +(sums.taste / subs.length).toFixed(2);
  aggregates.averages.service = +(sums.service / subs.length).toFixed(2);
  aggregates.averages.wait = +(sums.wait / subs.length).toFixed(2);
  aggregates.averages.overall = +(sums.overall / subs.length).toFixed(2);
  aggregates.averages.experienceIndex = +(((sums.taste + sums.service + sums.wait + sums.overall) / 4) / subs.length).toFixed(2);
  aggregates.sentiment.averageScore = +(sScore / subs.length).toFixed(3);
  return aggregates;
}

module.exports = {
  SESSION_SECRET,
  ADMIN_USER,
  ADMIN_PASS,
  ADMIN_TOKEN,
  parseCookies,
  signToken,
  verifyToken,
  assertSession,
  assertAdmin,
  sentimentScore,
  computeAggregates,
};

