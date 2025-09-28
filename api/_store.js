const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

// Try to use Vercel KV if configured
let kv = null;
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const hasKV = !!kvUrl && !!kvToken;
async function ensureKV() {
  if (!hasKV || kv) return kv;
  try {
    // Map Upstash vars to Vercel KV expected names if needed
    if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_REST_URL) {
      process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_REST_URL;
    }
    if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN) {
      process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    }
    kv = (await import('@vercel/kv')).kv;
    return kv;
  } catch (e) {
    kv = null; // fallback silently
    return null;
  }
}

const isVercel = !!process.env.VERCEL;
const DATA_FILE = isVercel
  ? '/tmp/kriedko-submissions.json'
  : path.join(process.cwd(), 'data', 'submissions.json');

async function ensureFileStore() {
  try {
    await fsp.mkdir(path.dirname(DATA_FILE), { recursive: true });
    try { await fsp.access(DATA_FILE, fs.constants.F_OK); }
    catch { await fsp.writeFile(DATA_FILE, '[]', 'utf8'); }
  } catch {}
}

async function loadSubmissions() {
  await ensureKV();
  if (kv) {
    const ids = (await kv.zrange('kriedko:index', 0, -1, { rev: true })) || [];
    if (!ids.length) return [];
    const keys = ids.map((id) => `kriedko:sub:${id}`);
    const arr = await kv.mget(keys);
    return (arr || []).filter(Boolean);
  }
  try {
    await ensureFileStore();
    const buf = await fsp.readFile(DATA_FILE, 'utf8');
    const arr = JSON.parse(buf || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveSubmissions(subs) {
  await ensureKV();
  if (kv) {
    // Replace index from array (less efficient, used rarely)
    await kv.del('kriedko:index');
    if (!subs || !subs.length) {
      await kv.set('kriedko:version', Date.now());
      return;
    }
    const pipeline = [];
    for (const record of subs) {
      const id = record.id;
      pipeline.push(kv.set(`kriedko:sub:${id}`, record));
      pipeline.push(kv.zadd('kriedko:index', { score: new Date(record.createdAt || Date.now()).getTime(), member: id }));
    }
    await Promise.all(pipeline);
    await kv.set('kriedko:version', Date.now());
    return;
  }
  await ensureFileStore();
  const tmp = DATA_FILE + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(subs, null, 2), 'utf8');
  await fsp.rename(tmp, DATA_FILE);
}

async function appendSubmission(record) {
  await ensureKV();
  if (kv) {
    const id = record.id;
    await kv.set(`kriedko:sub:${id}`, record);
    await kv.zadd('kriedko:index', { score: Date.now(), member: id });
    await kv.set('kriedko:version', Date.now());
    return;
  }
  const subs = await loadSubmissions();
  subs.push(record);
  await saveSubmissions(subs);
}

async function removeSubmission(id) {
  await ensureKV();
  if (kv) {
    await kv.del(`kriedko:sub:${id}`);
    try { await kv.zrem('kriedko:index', id); } catch {}
    await kv.set('kriedko:version', Date.now());
    return true;
  }
  const subs = await loadSubmissions();
  const filtered = subs.filter(r => r.id !== id);
  await saveSubmissions(filtered);
  return filtered.length !== subs.length;
}

async function clearAllSubmissions() {
  await ensureKV();
  if (kv) {
    try {
      const ids = (await kv.zrange('kriedko:index', 0, -1)) || [];
      const dels = ids.map(id => kv.del(`kriedko:sub:${id}`));
      if (dels.length) await Promise.all(dels);
    } catch {}
    await kv.del('kriedko:index');
    await kv.set('kriedko:version', Date.now());
    return;
  }
  await ensureFileStore();
  const tmp = DATA_FILE + '.tmp';
  await fsp.writeFile(tmp, '[]', 'utf8');
  await fsp.rename(tmp, DATA_FILE);
}

async function replaceAllSubmissions(subs) {
  // helper used by import
  await clearAllSubmissions();
  if (!subs || !subs.length) return;
  await saveSubmissions(subs);
}

async function currentVersion() {
  await ensureKV();
  if (kv) return (await kv.get('kriedko:version')) || 0;
  try {
    const stat = await fsp.stat(DATA_FILE);
    return stat.mtimeMs;
  } catch { return Date.now(); }
}

module.exports = { DATA_FILE, loadSubmissions, saveSubmissions, appendSubmission, removeSubmission, clearAllSubmissions, replaceAllSubmissions, currentVersion, ensureKV };
