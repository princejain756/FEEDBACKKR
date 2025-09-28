const { sentimentScore } = require('./_utils');
const { appendSubmission } = require('./_supabaseStore');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end('Method Not Allowed'); return;
  }
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    const body = raw ? JSON.parse(raw) : {};
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

    await appendSubmission(record);

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Invalid payload' }));
  }
};
