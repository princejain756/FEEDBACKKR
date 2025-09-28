Kriedko Feedback Form + Admin Dashboard
======================================

Overview
--------
- Guest feedback form at `http://localhost:3000/`.
- Admin dashboard at `http://localhost:3000/admin` with live sentiment pulse and real‑time updates.
- Submissions persisted to `data/submissions.json`.

Run
---
1. Ensure Node.js is installed.
2. Start the server:

   - Default: `node server.js`
   - Custom port: `PORT=4000 node server.js`
   - Admin token: `ADMIN_TOKEN=your-secret node server.js`

3. Open the feedback form: `http://localhost:3000/`.
4. Open the admin login: `http://localhost:3000/login`.
   - Username: `admin`
   - Password: `kriedkoadmin1235$2`
   - After login, you are redirected to the dashboard at `/admin`.

Admin Access
------------
- Default credentials: `admin` / `kriedkoadmin1235$2`.
- Change via env vars `ADMIN_USER` and `ADMIN_PASS`.
- A signed session cookie authorizes access to the dashboard and APIs.
- Legacy header token (`ADMIN_TOKEN`, header `x-admin-token`) still works for programmatic access.

Live Sentiment
--------------
- The serverless API exposes an SSE stream at `/api/sentiment-stream`.
- On Vercel, the stream stays open ~55s and auto-reconnects.
- When Vercel KV is enabled, updates propagate within ~1s of new feedback.
- The admin dashboard listens for:
  - `aggregate`: live aggregated metrics.
  - `tick`: signal for table to refresh (the dashboard fetches new submissions).

Data
----
- Locally: submissions are stored as JSON array at `data/submissions.json`.
- On Vercel: enable durable storage via Vercel KV (Upstash Redis).

Vercel KV Setup
---------------
1. In Vercel Project → Settings → Integrations, install “Vercel KV”.
2. In Project → Settings → Environment Variables, ensure the following exist (created by the KV integration):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. Also set:
   - `SESSION_SECRET` = a long random string
   - Optionally `ADMIN_USER`, `ADMIN_PASS`
4. Redeploy. The app will automatically use KV for reads/writes and for near real‑time signals.
- Each record includes ratings, free‑text fields, computed `experienceIndex`, and `sentiment` `{ score, label }`.
