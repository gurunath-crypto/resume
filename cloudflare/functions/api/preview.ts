import { Env } from "../../lib/env";
import { renderHtml } from "../../lib/template";

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  const body = (await request.json()) as any;
  return new Response(renderHtml(body.resume ?? body), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
