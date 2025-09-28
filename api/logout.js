module.exports = async (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Set-Cookie', 'kriedko_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  res.end(JSON.stringify({ ok: true }));
};

