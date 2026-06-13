// LLM completion via fetch. Primary = Claude, fallback = Groq (or set CV_PROVIDER=groq).

import { SYSTEM_PROMPT, buildRebuildMessage, buildUserMessage } from "./prompt";

export interface Env {
  GROQ_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CV_PROVIDER?: string;
  CV_MODEL?: string;
  GROQ_MODEL?: string;
  CV_MAX_TOKENS?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITEKEY?: string;
  RATE_LIMITER?: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function providers(env: Env): string[] {
  const available: Record<string, boolean> = {
    claude: !!env.ANTHROPIC_API_KEY,
    groq: !!env.GROQ_API_KEY,
  };
  const pref = (env.CV_PROVIDER || "").trim().toLowerCase();
  const order = pref === "groq" ? ["groq", "claude"] : ["claude", "groq"];
  const usable = order.filter((p) => available[p]);
  if (usable.length === 0) {
    throw new Error("No API key configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY as a Worker secret.");
  }
  return usable;
}

function extractJson(text: string): any {
  let t = text.trim();
  if (t.startsWith("```")) {
    const parts = t.split("```");
    t = parts.length > 1 ? parts[1] : t;
    if (t.trimStart().startsWith("json")) t = t.trimStart().slice(4);
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON.");
  return JSON.parse(t.slice(start, end + 1));
}

async function groqComplete(env: Env, system: string, user: string, temperature: number, maxTokens: number): Promise<string> {
  const body = {
    model: env.GROQ_MODEL || "llama-3.3-70b-versatile",
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.status === 429 && attempt < 2) {
      const ra = parseFloat(resp.headers.get("retry-after") || "0") || 8 * (attempt + 1);
      await new Promise((r) => setTimeout(r, Math.min(ra + 1, 30) * 1000));
      continue;
    }
    if (!resp.ok) throw new Error(`Groq ${resp.status}: ${await resp.text()}`);
    const data = (await resp.json()) as any;
    return data.choices[0].message.content;
  }
  throw new Error("Groq rate limited after retries.");
}

async function claudeComplete(env: Env, system: string, user: string, temperature: number, maxTokens: number): Promise<string> {
  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.CV_MODEL || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
  const data = (await resp.json()) as any;
  return data.content[0].text;
}

async function complete(env: Env, system: string, user: string, temperature: number): Promise<any> {
  const maxTokens = parseInt(env.CV_MAX_TOKENS || "8000", 10);
  const errors: string[] = [];
  for (const p of providers(env)) {
    try {
      const fn = p === "claude" ? claudeComplete : groqComplete;
      return extractJson(await fn(env, system, user, temperature, maxTokens));
    } catch (e: any) {
      errors.push(`${p}: ${e.message}`);
    }
  }
  throw new Error("All providers failed -> " + errors.join(" | "));
}

export async function generateResume(env: Env, student: any): Promise<any> {
  if (student.variation_seed == null) student.variation_seed = Math.floor(Math.random() * 1e9);
  return complete(env, SYSTEM_PROMPT, buildUserMessage(student), 0.9);
}

export async function rebuildResume(env: Env, req: any): Promise<any> {
  return complete(env, SYSTEM_PROMPT, buildRebuildMessage(req), 0.85);
}

// Stable short fingerprint of the resume prose (uniqueness indicator).
export async function fingerprint(resume: any): Promise<string> {
  const blob =
    (resume.summary || "") +
    (resume.experience || [])
      .flatMap((x: any) => (x.groups || []).flatMap((g: any) => g.bullets || []))
      .join("");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(blob));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
