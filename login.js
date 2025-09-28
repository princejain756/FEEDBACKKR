(() => {
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('errorBox');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    // trim to avoid accidental spaces causing login failure
    payload.username = (payload.username || '').trim();
    payload.password = (payload.password || '').trim();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Invalid');
      window.location.href = '/admin';
    } catch (err) {
      errorBox.style.display = 'block';
    }
  });
})();
