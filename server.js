const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-kriedko';
const SESSION_SECRET = process.env.SESSION_SECRET || 'kriedko-session-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'kriedkoadmin1235$2';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

/** Ensure data directory + file exist */
async function ensureDataStore() {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    try {
      await fsp.access(DATA_FILE, fs.constants.F_OK);
    } catch {
      await fsp.writeFile(DATA_FILE, '[]', 'utf8');
    }
  } catch (e) {
    console.error('Failed to prepare data store', e);
  }
}

async function loadSubmissions() {
  try {
    const buf = await fsp.readFile(DATA_FILE, 'utf8');
    const arr = JSON.parse(buf || '[]');
    if (Array.isArray(arr)) return arr;
    return [];
  } catch (e) {
    console.error('Read error', e);
    return [];
  }
}

async function saveSubmissions(subs) {
  const tmp = DATA_FILE + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(subs, null, 2), 'utf8');
  await fsp.rename(tmp, DATA_FILE);
}

/** Very lightweight sentiment scoring */
const POSITIVE = new Set([
  'good','great','amazing','awesome','fantastic','delicious','tasty','yummy','love','loved','fresh','friendly','fast','perfect','best','wow','nice','excellent','incredible','divine','heavenly','juicy','crispy','tender','savory','sweet','spicy','rich','flavourful','flavorful','balanced','satisfying','quick','warm','cozy','clean','recommend','recommended'
]);
const NEGATIVE = new Set([
  'bad','terrible','awful','disappointing','slow','cold','stale','bland','salty','soggy','greasy','burnt','overcooked','undercooked','rude','expensive','dirty','worst','meh','okay','ok','average','late','wait','delay','noise','noisy','crowded','hard','raw','dry','tough','chewy','boring','weak','watery','too','less','under','over','issue','problem','complaint'
]);

function tokenize(text='') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function sentimentScore(...texts) {
  const words = texts.flatMap(tokenize);
  let score = 0;
  for (const w of words) {
    if (POSITIVE.has(w)) score += 1;
    if (NEGATIVE.has(w)) score -= 1;
  }
  // normalize to -1..1 range with tanh-like squashing
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

/** SSE client pool */
const clients = new Set();

function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function broadcastAggregates() {
  const subs = await loadSubmissions();
  const agg = computeAggregates(subs);
  for (const res of clients) {
    try { sseSend(res, 'aggregate', agg); } catch {}
  }
}

function isApi(pathname) { return pathname.startsWith('/api/'); }

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
  // Allow either header token or valid session cookie
  const token = req.headers['x-admin-token'];
  if (token && token === ADMIN_TOKEN) return true;
  return assertSession(req);
}

function serveFile(res, filePath, contentType='text/plain') {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function guessContentType(fp) {
  const ext = path.extname(fp).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 200 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        const ct = req.headers['content-type'] || '';
        if (ct.includes('application/json')) {
          resolve(JSON.parse(raw || '{}'));
        } else if (ct.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(raw);
          resolve(Object.fromEntries(params.entries()));
        } else {
          resolve({ raw });
        }
      } catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url);

  // API: SSE sentiment stream
  if (req.method === 'GET' && pathname === '/api/sentiment-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    clients.add(res);
    // Send initial aggregates
    const subs = await loadSubmissions();
    sseSend(res, 'aggregate', computeAggregates(subs));
    sseSend(res, 'ping', { t: Date.now() });
    const interval = setInterval(() => {
      try { sseSend(res, 'ping', { t: Date.now() }); } catch {}
    }, 25000);
    req.on('close', () => {
      clearInterval(interval);
      clients.delete(res);
    });
    return;
  }

  // API: List submissions (admin)
  if (req.method === 'GET' && pathname === '/api/submissions') {
    if (!assertAdmin(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const subs = await loadSubmissions();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(subs));
    return;
  }

  // API: Login (sets signed cookie on success)
  if (req.method === 'POST' && pathname === '/api/login') {
    try {
      const body = await parseBody(req);
      const { username, password } = body || {};
      if (username === ADMIN_USER && password === ADMIN_PASS) {
        const exp = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
        const token = signToken({ sub: username, exp });
        const cookie = `kriedko_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${12 * 60 * 60}`;
        res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': cookie });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad request' }));
    }
    return;
  }

  // API: Logout (clear cookie)
  if ((req.method === 'POST' || req.method === 'GET') && pathname === '/api/logout') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'kriedko_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // API: Create feedback
  if (req.method === 'POST' && pathname === '/api/feedback') {
    try {
      const body = await parseBody(req);
      const now = new Date();
      const toNum = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return Math.max(1, Math.min(5, Math.round(n)));
      };
      const record = {
        id: `${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now.toISOString(),
        mealPreference: body.mealPreference || null,
        taste: toNum(body.taste),
        service: toNum(body.service),
        wait: toNum(body.wait),
        overall: toNum(body.overall),
        favouriteItem: (body.favouriteItem || '').slice(0, 2000),
        improvements: (body.improvements || '').slice(0, 2000),
      };
      const avgParts = [record.taste, record.service, record.wait, record.overall].filter((v) => typeof v === 'number');
      record.experienceIndex = avgParts.length ? +(avgParts.reduce((a, b) => a + b, 0) / avgParts.length).toFixed(2) : null;
      record.sentiment = sentimentScore(record.favouriteItem, record.improvements);

      const subs = await loadSubmissions();
      subs.push(record);
      await saveSubmissions(subs);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));

      // Broadcast updates
      for (const sse of clients) {
        try {
          sseSend(sse, 'new_submission', record);
        } catch {}
      }
      await broadcastAggregates();
      return;
    } catch (e) {
      console.error('Error saving feedback', e);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload' }));
      return;
    }
  }

  // Static routing
  if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
    serveFile(res, path.join(__dirname, 'index.html'), 'text/html; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && (pathname === '/admin' || pathname === '/admin.html')) {
    // Allow direct access to admin page since we now use local storage
    serveFile(res, path.join(__dirname, 'admin.html'), 'text/html; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && (pathname === '/login' || pathname === '/login.html')) {
    serveFile(res, path.join(__dirname, 'login.html'), 'text/html; charset=utf-8');
    return;
  }

  // Serve any file from cwd (basic static server, no directory traversal)
  if (req.method === 'GET') {
    const safe = path.normalize(pathname).replace(/^\/+/, '');
    const candidate = path.join(__dirname, safe);
    if (!candidate.startsWith(__dirname)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    serveFile(res, candidate, guessContentType(candidate));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

ensureDataStore().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
  });
});
