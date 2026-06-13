// Abuse protection: Cloudflare Turnstile verification.
// If TURNSTILE_SECRET is not set, verification is skipped (open) — set it in the
// dashboard before going public. Add a Cloudflare WAF rate-limiting rule for
// per-IP throttling (no code needed); see cloudflare/README.md.

import { Env } from "./env";

export async function verifyTurnstile(env: Env, token: string | undefined, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const data = (await r.json()) as any;
  return !!data.success;
}
