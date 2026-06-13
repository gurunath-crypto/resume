// Shared environment bindings for all Pages Functions.
// Public values come from [vars] in wrangler.toml; secrets are set in the
// Cloudflare dashboard (Settings -> Environment variables -> Encrypt).
export interface Env {
  GROQ_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CV_PROVIDER?: string;
  CV_MODEL?: string;
  GROQ_MODEL?: string;
  CV_MAX_TOKENS?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITEKEY?: string;
}

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
