import { Env, json } from "../../lib/env";
import { renderDocx } from "../../lib/docxgen";

function safeName(name: string): string {
  return (name || "resume").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "resume";
}

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  const body = (await request.json()) as any;
  const resume = body.resume ?? body;
  try {
    const data = await renderDocx(resume);
    return new Response(data, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName(resume.name)}_Resume.docx"`,
      },
    });
  } catch (e: any) {
    return json({ detail: e?.message || "Word export failed" }, 500);
  }
};
