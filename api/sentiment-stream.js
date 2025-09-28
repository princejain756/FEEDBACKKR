const { computeAggregates } = require('./_utils');
const { loadSubmissions, currentVersion } = require('./_supabaseStore');

module.exports = async (req, res) => {
  // SSE stream that polls a KV-backed version key for near-realtime updates
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Initial snapshot
  const subs = await loadSubmissions();
  send('aggregate', computeAggregates(subs));
  send('ping', { t: Date.now() });

  // Poll KV/file mtime for changes, push aggregate when changed
  let last = await currentVersion();

  let active = true;
  req.on('close', () => { active = false; });

  // Keep-alive every 25s and stop after ~55s so the client reconnects (serverless limit)
  const start = Date.now();
  while (active) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const nowV = await currentVersion();
      if (nowV && nowV !== last) {
        last = nowV;
        const cur = await loadSubmissions();
        send('aggregate', computeAggregates(cur));
        // Also emit that there was a change; dashboard will refetch table via polling fallback
        send('tick', { t: Date.now() });
      }
      if ((Date.now() - start) > 55000) break; // end to allow reconnect
      // keepalive
      send('ping', { t: Date.now() });
    } catch {}
  }
  res.end();
};

