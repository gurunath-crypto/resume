# CV Builder — Cloudflare deployment (Worker API + Pages frontend)

Public, remotely-accessible version. The API runs as a **Worker** (your Groq key lives
there as a secret), and the UI is served by **Pages**. PDF export uses the browser's
"Save as PDF"; Word export is generated in the Worker. Abuse is limited by **Turnstile**
(invisible captcha) + a **per-IP rate limiter**.

```
cloudflare/
  worker/     TypeScript Worker (API)   -> deploy with wrangler
  pages/      static site (UI)          -> deploy with Pages
```

---

## 1. Deploy the Worker (API)

```powershell
cd cloudflare\worker
npm install
npx wrangler login                      # opens browser to authorize
npx wrangler secret put GROQ_API_KEY    # paste your Groq key when prompted
npx wrangler deploy
```

`wrangler deploy` prints your API URL, e.g.
`https://cv-builder-api.<your-subdomain>.workers.dev`. **Copy it.**

### Optional secrets
```powershell
npx wrangler secret put TURNSTILE_SECRET    # enables human verification (recommended)
npx wrangler secret put ANTHROPIC_API_KEY   # adds Claude as primary/fallback
```

### Turnstile (recommended, free)
1. Cloudflare dashboard → **Turnstile** → *Add site* → get a **Site Key** + **Secret Key**.
2. `npx wrangler secret put TURNSTILE_SECRET` (paste the Secret Key).
3. Put the **Site Key** into `worker/wrangler.toml` under `[vars] TURNSTILE_SITEKEY`, then
   `npx wrangler deploy` again. The widget then appears automatically in the UI.

> The per-IP rate limiter (10 generations/min) is already configured in `wrangler.toml`.

---

## 2. Point the frontend at your Worker

Edit **one line** in `cloudflare/pages/app.js`:
```js
const API_BASE = window.CV_API_BASE || "https://cv-builder-api.YOUR-SUBDOMAIN.workers.dev";
```
Replace with the URL `wrangler deploy` gave you.

---

## 3. Deploy the Pages site (UI)

**Option A — dashboard (Git):** Cloudflare dashboard → **Workers & Pages** → *Create* →
**Pages** → *Connect to Git* → pick the `suryakusumuru/resume` repo. Build settings:
- Framework preset: **None**
- Build command: *(empty)*
- Build output directory: **`cloudflare/pages`**

**Option B — CLI:**
```powershell
cd cloudflare\pages
npx wrangler pages deploy . --project-name cv-builder
```

Open the Pages URL (e.g. `https://cv-builder.pages.dev`) — done. Students worldwide can
use it; every resume is unique, with PDF + Word download.

---

## Local dev
```powershell
cd cloudflare\worker
npm install
echo "GROQ_API_KEY=gsk_..." > .dev.vars      # local-only secret (gitignored)
npx wrangler dev                              # API at http://localhost:8787
```
Set `API_BASE = "http://localhost:8787"` in `app.js` and open `pages/index.html`
(or serve it with any static server) to test end-to-end.

## Cost
- Workers + Pages: free tier is plenty for student volume.
- Groq: your key. Free tier is rate-limited (the Worker auto-retries on 429); a paid
  Groq tier removes the wait under heavy load.
