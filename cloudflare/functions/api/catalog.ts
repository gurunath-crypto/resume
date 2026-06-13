import { Env, json } from "../../lib/env";
import { EXPERIENCE_LEVELS, ROLE_PRESETS, SKILLS_CATALOG } from "../../lib/skills";

export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({
    skills: SKILLS_CATALOG,
    roles: Object.keys(ROLE_PRESETS),
    levels: EXPERIENCE_LEVELS,
    turnstile_sitekey: env.TURNSTILE_SITEKEY || "",
  });
