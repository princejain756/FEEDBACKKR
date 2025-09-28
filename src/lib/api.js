export async function postFeedback(data) {
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSubmissions() {
  try {
    const res = await fetch('/api/submissions', { method: 'GET', credentials: 'include' });
    if (!res.ok) return { ok: false, status: res.status, data: [] };
    const data = await res.json();
    return { ok: true, status: 200, data: Array.isArray(data) ? data : [] };
  } catch {
    return { ok: false, status: 0, data: [] };
  }
}

export async function fetchAggregates() {
  try {
    const res = await fetch('/api/aggregates', { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteSubmission(id) {
  try {
    const res = await fetch(`/api/submissions?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearAllRemote() {
  try {
    const res = await fetch('/api/submissions?all=1', { method: 'DELETE', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function importRemoteData(feedbacks) {
  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbacks })
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, ...data };
  } catch {
    return { ok: false };
  }
}
