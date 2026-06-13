import { Env, json } from "../../lib/env";
import { fingerprint, generateResume } from "../../lib/generator";
import { verifyTurnstile } from "../../lib/guard";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const body = (await request.json()) as any;
  if (!(await verifyTurnstile(env, body.turnstile_token, ip))) {
    return json({ detail: "Human verification failed. Please complete the checkbox and retry." }, 403);
  }
  try {
    const resume = await generateResume(env, body.student ?? body);
    return json({ resume, fingerprint: await fingerprint(resume) });
  } catch (e: any) {
    return json({ detail: e?.message || "Generation failed" }, 500);
  }
};
