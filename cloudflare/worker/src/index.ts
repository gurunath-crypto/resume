// CV Builder API — Cloudflare Worker.
// Routes: /api/catalog, /api/generate, /api/rebuild, /api/preview, /api/docx

import { Env, fingerprint, generateResume, rebuildResume } from "./generator";
import { EXPERIENCE_LEVELS, ROLE_PRESETS, SKILLS_CATALOG } from "./skills";
import { renderHtml } from "./template";
import { renderDocx } from "./docx";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });

function safeName(name: string): string {
  return (name || "resume").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "resume";
}

async function verifyTurnstile(env: Env, token: string | undefined, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true; // not configured -> open (use only for dev)
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const data = (await r.json()) as any;
  return !!data.success;
}

async function guard(env: Env, body: any, ip: string): Promise<string | null> {
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return "Rate limit reached — please wait a minute and try again.";
  }
  if (!(await verifyTurnstile(env, body.turnstile_token, ip))) {
    return "Human verification failed. Please complete the checkbox and retry.";
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    try {
      if (url.pathname === "/api/catalog" && request.method === "GET") {
        return json({
          skills: SKILLS_CATALOG,
          roles: Object.keys(ROLE_PRESETS),
          levels: EXPERIENCE_LEVELS,
          turnstile_sitekey: env.TURNSTILE_SITEKEY || "",
        });
      }

      if (url.pathname === "/api/generate" && request.method === "POST") {
        const body = (await request.json()) as any;
        const err = await guard(env, body, ip);
        if (err) return json({ detail: err }, 429);
        const resume = await generateResume(env, body.student ?? body);
        return json({ resume, fingerprint: await fingerprint(resume) });
      }

      if (url.pathname === "/api/rebuild" && request.method === "POST") {
        const body = (await request.json()) as any;
        const err = await guard(env, body, ip);
        if (err) return json({ detail: err }, 429);
        const resume = await rebuildResume(env, body);
        return json({ resume, fingerprint: await fingerprint(resume) });
      }

      if (url.pathname === "/api/preview" && request.method === "POST") {
        const body = (await request.json()) as any;
        return new Response(renderHtml(body.resume ?? body), { headers: { "Content-Type": "text/html; charset=utf-8", ...CORS } });
      }

      if (url.pathname === "/api/docx" && request.method === "POST") {
        const body = (await request.json()) as any;
        const resume = body.resume ?? body;
        const data = await renderDocx(resume);
        return new Response(data, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${safeName(resume.name)}_Resume.docx"`,
            ...CORS,
          },
        });
      }

      return json({ detail: "Not found" }, 404);
    } catch (e: any) {
      return json({ detail: e?.message || "Server error" }, 500);
    }
  },
};
