# CV Builder on Cloudflare — everything runs in the cloud, nothing local

One **Cloudflare Pages** project serves the whole app: the static UI **and** the API
(as **Pages Functions** under `/api/*`). No local Node, no wrangler CLI, no Python —
you deploy entirely from the Cloudflare dashboard by connecting this GitHub repo.

```
cloudflare/
  wrangler.toml      Pages config (build output = public, nodejs_compat, vars)
  package.json       declares the one dependency (docx) — Cloudflare installs it
  public/            static UI (index.html, app.js, styles.css)
  functions/api/     API endpoints, run on Cloudflare:
                       catalog.ts  generate.ts  rebuild.ts  preview.ts  docx.ts
  lib/               shared logic (LLM calls, prompt, template, docx, turnstile)
```

---

## Deploy (all in the browser)

### 1. Create the Pages project
Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
**Connect to Git** → pick the **`gurunath-crypto/resume`** repo.

**Build settings:**
| Field | Value |
|---|---|
| Project root directory | `cloudflare` |
| Build command | `npm install` |
| Build output directory | `public` |

(The Functions in `functions/` and the `docx` dependency are bundled automatically.)

### 2. Add your Groq key (secret)
Project → **Settings → Variables and Secrets** → **Add** →
- Name: `GROQ_API_KEY`  Value: *your Groq key*  → **Encrypt** → Save.

> Optional: add `ANTHROPIC_API_KEY` too (Claude becomes primary, Groq the fallback).

### 3. Deploy
Hit **Save and Deploy**. You get a public URL like `https://cv-builder.pages.dev`.
Open it — students anywhere can build resumes, each unique, with PDF + Word download.

---

## Recommended before going fully public: protect your Groq key

### Turnstile (invisible captcha) — free
1. Dashboard → **Turnstile** → **Add site** → copy the **Site Key** + **Secret Key**.
2. Pages → Settings → Variables → add secret `TURNSTILE_SECRET` = *Secret Key* (Encrypt).
3. Edit `cloudflare/wrangler.toml` → set `TURNSTILE_SITEKEY = "your-site-key"` → commit/push.
   Cloudflare auto-redeploys; the verification widget then appears in the UI and the
   API rejects requests without a valid token.

### Per-IP rate limiting — free, no code
Dashboard → your domain/zone → **Security → WAF → Rate limiting rules** → create a rule:
- When URI path contains `/api/generate` → more than `10` requests per `1 min` per IP → **Block**.

(WAF rate-limiting rules apply to `*.pages.dev` via the dashboard once the project has a
custom domain, or use Turnstile alone on the default `pages.dev` domain.)

---

## How it works
- **Same-origin:** the UI calls `/api/...` on its own domain — no CORS, no API URL to edit.
- **Stateless:** the browser holds the resume JSON; downloads POST it back. No database.
- **PDF:** the ⬇ PDF button prints the styled preview → "Save as PDF" (pixel-identical,
  free, runs in the visitor's browser).
- **Word:** generated on Cloudflare with the pure-JS `docx` library.
- **Uniqueness:** temperature 0.9 + per-student seed; a content fingerprint is shown.

## Changing config later
Edit files in this repo and push — Cloudflare rebuilds automatically. Change the model
via `GROQ_MODEL` in `wrangler.toml`, or rotate keys in the dashboard.

> The Python app in the repo root (`backend/`, `frontend/`) is the optional local version.
> For the cloud deployment you only need this `cloudflare/` folder.
