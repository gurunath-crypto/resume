// Renders a resume object to standalone styled HTML (preview + browser "Save as PDF").

function esc(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLE = `
:root{--header:#191970;--accent:#4682b4;--text:#212121;}
@page{size:A4;margin:10mm;}
*{box-sizing:border-box;}
body{font-family:"Linux Libertine","Libertinus Serif",Georgia,"Times New Roman",serif;font-size:9pt;line-height:1.28;color:var(--text);margin:0;}
.name{font-size:23pt;font-weight:700;color:var(--header);letter-spacing:.5px;text-align:center;}
.role{font-size:11pt;color:var(--accent);text-align:center;margin-top:2px;}
.contact{text-align:center;font-size:8.5pt;margin-top:5px;}
.contact a{color:var(--accent);text-decoration:none;}
.contact .sep{color:#999;margin:0 6px;}
.band{margin:7px auto 2px;padding:5px 8px;text-align:center;background:rgba(70,130,180,.10);color:var(--header);font-weight:700;font-size:8.7pt;border-radius:3px;}
.band .sep{color:var(--accent);margin:0 5px;font-weight:400;}
h2.section{text-transform:uppercase;color:var(--header);font-size:11pt;font-weight:700;border-bottom:1.5px solid var(--accent);margin:11px 0 5px;padding-bottom:1px;letter-spacing:.4px;}
.summary{text-align:justify;}
.comp-grid{column-count:2;column-gap:16px;}
.comp{break-inside:avoid;margin-bottom:3px;}
.comp .cat{color:var(--accent);font-weight:700;}
.xp-head{display:flex;justify-content:space-between;font-weight:700;font-size:10pt;margin-top:4px;}
.xp-sub{display:flex;justify-content:space-between;font-style:italic;font-size:8.8pt;}
.xp-ctx{font-style:italic;font-size:8.6pt;color:#444;margin-bottom:2px;}
.grp-head{color:var(--accent);font-weight:700;margin-top:4px;}
ul{margin:1px 0 3px;padding-left:14px;}
li{margin-bottom:1.5px;text-align:justify;}
li::marker{color:var(--accent);}
.edu-line{display:flex;justify-content:space-between;}
.edu-line .deg{font-weight:700;}
.muted{color:#444;font-style:italic;}
.footer{text-align:center;color:var(--accent);font-style:italic;font-size:8pt;margin-top:10px;border-top:.5px solid var(--accent);padding-top:3px;}
`;

export function renderHtml(r: any): string {
  const contact: string[] = [];
  if (r.email) contact.push(`<span><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></span>`);
  if (r.phone) contact.push(`<span>${esc(r.phone)}</span>`);
  if (r.location) contact.push(`<span>${esc(r.location)}</span>`);
  if (r.linkedin) contact.push(`<span><a href="${esc(r.linkedin)}">LinkedIn</a></span>`);
  if (r.github) contact.push(`<span><a href="${esc(r.github)}">GitHub</a></span>`);

  const band = (r.impact_metrics || []).length
    ? `<div class="band">${(r.impact_metrics as string[]).map((m) => `<b>${esc(m)}</b>`).join('<span class="sep">|</span>')}</div>`
    : "";

  const comps = (r.competencies || []).length
    ? `<h2 class="section">Core Technical Competencies</h2><div class="comp-grid">${(r.competencies as any[])
        .map((c) => `<div class="comp"><span class="cat">${esc(c.category)}:</span> ${esc(c.skills)}</div>`)
        .join("")}</div>`
    : "";

  const experience = (r.experience || []).length
    ? `<h2 class="section">Professional Experience</h2>${(r.experience as any[])
        .map(
          (x) =>
            `<div class="xp-head"><span>${esc(x.role)}</span><span>${esc(x.dates)}</span></div>` +
            `<div class="xp-sub"><span>${esc(x.company)}${x.client ? " | Client: " + esc(x.client) : ""}</span><span>${esc(x.location)}</span></div>` +
            (x.context ? `<div class="xp-ctx">${esc(x.context)}</div>` : "") +
            (x.groups || [])
              .map(
                (g: any) =>
                  (g.subhead ? `<div class="grp-head">${esc(g.subhead)}</div>` : "") +
                  `<ul>${(g.bullets || []).map((b: string) => `<li>${esc(b)}</li>`).join("")}</ul>`
              )
              .join("")
        )
        .join("")}`
    : "";

  const projects = (r.projects || []).length
    ? `<h2 class="section">Key Projects</h2>${(r.projects as any[])
        .map(
          (p) =>
            (p.subhead ? `<div class="grp-head">${esc(p.subhead)}</div>` : "") +
            `<ul>${(p.bullets || []).map((b: string) => `<li>${esc(b)}</li>`).join("")}</ul>`
        )
        .join("")}`
    : "";

  const education = (r.education || []).length
    ? `<h2 class="section">Education</h2>${(r.education as any[])
        .map(
          (e) =>
            `<div class="edu-line"><span class="deg">${esc(e.degree)}</span><span><b>${esc(e.dates)}</b></span></div>` +
            `<div class="edu-line"><span>${esc(e.institution)}</span><span>${e.score ? esc(e.score) : ""}</span></div>` +
            (e.coursework ? `<div class="muted">Relevant Coursework: ${esc(e.coursework)}</div>` : "")
        )
        .join("")}`
    : "";

  const certs = (r.certifications || []).length
    ? `<h2 class="section">Certifications &amp; Professional Development</h2><ul>${(r.certifications as string[])
        .map((c) => `<li>${esc(c)}</li>`)
        .join("")}</ul>`
    : "";

  const additional =
    r.languages || r.target_roles
      ? `<h2 class="section">Additional Information</h2>${
          r.languages ? `<div><b>Languages:</b> ${esc(r.languages)}</div>` : ""
        }${r.target_roles ? `<div><b>Target Roles:</b> ${esc(r.target_roles)}</div>` : ""}`
      : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(r.name)} - Resume</title><style>${STYLE}</style></head><body>
<div class="name">${esc((r.name || "").toUpperCase())}</div>
${r.title ? `<div class="role">${esc(r.title)}</div>` : ""}
<div class="contact">${contact.join('<span class="sep">|</span>')}</div>
${band}
${r.summary ? `<h2 class="section">Executive Summary</h2><div class="summary">${esc(r.summary)}</div>` : ""}
${comps}
${experience}
${projects}
${education}
${certs}
${additional}
<div class="footer">References and detailed project portfolio available upon request</div>
</body></html>`;
}
