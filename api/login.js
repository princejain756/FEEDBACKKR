const { ADMIN_USER, ADMIN_PASS, signToken } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end('Method Not Allowed'); return;
  }
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    const body = raw ? JSON.parse(raw) : {};
    const username = (body?.username || '').trim();
    const password = (body?.password || '').trim();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const exp = Date.now() + 12 * 60 * 60 * 1000; // 12h
      const token = signToken({ sub: username, exp });
      const cookie = `kriedko_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${12 * 60 * 60}`;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Set-Cookie', cookie);
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.statusCode = 401; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Invalid credentials' }));
    }
  } catch (e) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Bad request' }));
  }
};
