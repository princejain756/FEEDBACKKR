const { assertAdmin } = require('./_utils');
const { loadSubmissions, removeSubmission, clearAllSubmissions, replaceAllSubmissions } = require('./_supabaseStore');

module.exports = async (req, res) => {
  const send = (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };

  if (!assertAdmin(req)) {
    return send(401, { error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const subs = await loadSubmissions();
    return send(200, subs);
  }

  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const id = url.searchParams.get('id');
      const all = url.searchParams.get('all');
      if (all === '1' || all === 'true') {
        await clearAllSubmissions();
        return send(200, { ok: true, cleared: true });
      }
      if (!id) return send(400, { error: 'Missing id' });
      const ok = await removeSubmission(id);
      return send(ok ? 200 : 404, { ok });
    } catch {
      return send(400, { error: 'Bad request' });
    }
  }

  if (req.method === 'POST') {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString('utf8');
      const body = raw ? JSON.parse(raw) : {};
      const arr = Array.isArray(body?.feedbacks) ? body.feedbacks : null;
      if (!arr) return send(400, { error: 'Invalid payload' });
      await replaceAllSubmissions(arr);
      return send(200, { ok: true, count: arr.length });
    } catch {
      return send(400, { error: 'Bad request' });
    }
  }

  res.statusCode = 405; res.setHeader('Allow', 'GET, POST, DELETE'); res.end('Method Not Allowed');
};
