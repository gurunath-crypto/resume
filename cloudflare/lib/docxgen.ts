// Clean, ATS-friendly .docx built with the pure-JS `docx` library (runs on Workers).

import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun,
} from "docx";

const HEADER = "191970";
const ACCENT = "4682b4";

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    border: { bottom: { color: ACCENT, space: 1, style: BorderStyle.SINGLE, size: 6 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: HEADER })],
  });
}

function bullets(items: string[]): Paragraph[] {
  return (items || []).map(
    (b) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [new TextRun({ text: b, size: 18 })] })
  );
}

export async function renderDocx(r: any): Promise<Uint8Array> {
  const kids: Paragraph[] = [];

  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (r.name || "").toUpperCase(), bold: true, size: 44, color: HEADER })] }));
  if (r.title) kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.title, size: 22, color: ACCENT })] }));

  const contact = [r.email, r.phone, r.location, r.linkedin, r.github].filter(Boolean).join("  |  ");
  if (contact) kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: contact, size: 17 })] }));

  if ((r.impact_metrics || []).length)
    kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.impact_metrics.join("   |   "), bold: true, color: HEADER, size: 18 })] }));

  if (r.summary) {
    kids.push(heading("Executive Summary"));
    kids.push(new Paragraph({ children: [new TextRun({ text: r.summary, size: 18 })] }));
  }

  if ((r.competencies || []).length) {
    kids.push(heading("Core Technical Competencies"));
    for (const c of r.competencies)
      kids.push(new Paragraph({ children: [new TextRun({ text: `${c.category}: `, bold: true, color: ACCENT, size: 18 }), new TextRun({ text: c.skills, size: 18 })] }));
  }

  if ((r.experience || []).length) {
    kids.push(heading("Professional Experience"));
    for (const x of r.experience) {
      kids.push(new Paragraph({ children: [new TextRun({ text: x.role, bold: true, size: 20 }), new TextRun({ text: x.dates ? `\t${x.dates}` : "", bold: true, size: 20 })] }));
      const company = (x.company || "") + (x.client ? ` | Client: ${x.client}` : "") + (x.location ? `  —  ${x.location}` : "");
      kids.push(new Paragraph({ children: [new TextRun({ text: company, italics: true, size: 17 })] }));
      if (x.context) kids.push(new Paragraph({ children: [new TextRun({ text: x.context, italics: true, size: 17 })] }));
      for (const g of x.groups || []) {
        if (g.subhead) kids.push(new Paragraph({ children: [new TextRun({ text: g.subhead, bold: true, color: ACCENT, size: 18 })] }));
        kids.push(...bullets(g.bullets));
      }
    }
  }

  if ((r.projects || []).length) {
    kids.push(heading("Key Projects"));
    for (const p of r.projects) {
      if (p.subhead) kids.push(new Paragraph({ children: [new TextRun({ text: p.subhead, bold: true, color: ACCENT, size: 18 })] }));
      kids.push(...bullets(p.bullets));
    }
  }

  if ((r.education || []).length) {
    kids.push(heading("Education"));
    for (const e of r.education) {
      kids.push(new Paragraph({ children: [new TextRun({ text: e.degree, bold: true, size: 18 }), new TextRun({ text: e.dates ? `\t${e.dates}` : "", bold: true, size: 18 })] }));
      kids.push(new Paragraph({ children: [new TextRun({ text: (e.institution || "") + (e.score ? `   ${e.score}` : ""), size: 18 })] }));
      if (e.coursework) kids.push(new Paragraph({ children: [new TextRun({ text: `Relevant Coursework: ${e.coursework}`, italics: true, size: 17 })] }));
    }
  }

  if ((r.certifications || []).length) {
    kids.push(heading("Certifications & Professional Development"));
    kids.push(...bullets(r.certifications));
  }

  if (r.languages || r.target_roles) {
    kids.push(heading("Additional Information"));
    if (r.languages) kids.push(new Paragraph({ children: [new TextRun({ text: "Languages: ", bold: true, size: 18 }), new TextRun({ text: r.languages, size: 18 })] }));
    if (r.target_roles) kids.push(new Paragraph({ children: [new TextRun({ text: "Target Roles: ", bold: true, size: 18 }), new TextRun({ text: r.target_roles, size: 18 })] }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 18 } } } },
    sections: [{ properties: { page: { margin: { top: 567, bottom: 567, left: 567, right: 567 } } }, children: kids }],
  });
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}
