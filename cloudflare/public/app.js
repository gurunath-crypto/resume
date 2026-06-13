// Same-origin: the Pages Functions API is served under /api on this very domain.
const API_BASE = "";

let CATALOG = { skills: {}, roles: [], levels: [], turnstile_sitekey: "" };
let CURRENT = { resume: null, student: null };
let turnstileId = null;
const selectedSkills = new Set();
const feedbackKeep = new Set();
const feedbackDrop = new Set();
const $ = (id) => document.getElementById(id);

const FIELDS = {
  experience: [
    ["role", "Role / Title", "DevOps Engineer"],
    ["company", "Company", "Infosys"],
    ["client", "Client (optional)", "HSBC"],
    ["dates", "Dates", "Jun 2022 – Present"],
    ["location", "Location", "Hyderabad, India"],
    ["context", "One-line context", "Payments platform modernization"],
    ["highlights", "What you did (rough notes are fine)", "Built Jenkins pipelines, managed EKS, set up Prometheus...", true],
  ],
  projects: [
    ["name", "Project name", "GitOps Delivery Platform"],
    ["description", "What it does / your role", "ArgoCD + Helm pipeline deploying 30 microservices...", true],
  ],
  education: [
    ["degree", "Degree", "B.Tech in Computer Science"],
    ["institution", "Institution", "JNTU, India"],
    ["dates", "Dates", "2018 – 2022"],
    ["score", "Score (optional)", "CGPA 8.4/10"],
    ["coursework", "Relevant coursework (optional)", "DSA, OS, Networks, DBMS"],
  ],
};

function addCard(kind) {
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.dataset.kind = kind;
  wrap.innerHTML = `<button class="rm" title="Remove">×</button>`;
  for (const [key, label, ph, big] of FIELDS[kind]) {
    const l = document.createElement("label");
    l.textContent = label;
    const el = big ? document.createElement("textarea") : document.createElement("input");
    if (big) el.rows = 3;
    el.placeholder = ph; el.dataset.key = key;
    l.appendChild(el); wrap.appendChild(l);
  }
  wrap.querySelector(".rm").onclick = () => wrap.remove();
  $(kind + "-list").appendChild(wrap);
}

function collectCards(kind) {
  return [...document.querySelectorAll(`.card[data-kind="${kind}"]`)].map((card) => {
    const o = {};
    card.querySelectorAll("[data-key]").forEach((el) => (o[el.dataset.key] = el.value.trim()));
    return o;
  }).filter((o) => Object.values(o).some((v) => v));
}

function renderSkills() {
  const root = $("skills-catalog"); root.innerHTML = "";
  for (const [cat, items] of Object.entries(CATALOG.skills)) {
    const c = document.createElement("div"); c.className = "skill-cat"; c.textContent = cat;
    const chips = document.createElement("div"); chips.className = "chips";
    items.forEach((s) => {
      const chip = document.createElement("span");
      chip.className = "chip"; chip.textContent = s;
      chip.onclick = () => {
        if (selectedSkills.has(s)) { selectedSkills.delete(s); chip.classList.remove("on"); }
        else { selectedSkills.add(s); chip.classList.add("on"); }
      };
      chips.appendChild(chip);
    });
    root.appendChild(c); root.appendChild(chips);
  }
}

function studentPayload() {
  return {
    name: $("name").value.trim(), email: $("email").value.trim(), phone: $("phone").value.trim(),
    location: $("location").value.trim(), linkedin: $("linkedin").value.trim(), github: $("github").value.trim(),
    target_role: $("target_role").value, experience_level: $("experience_level").value,
    education: collectCards("education"), experience: collectCards("experience"),
    projects: collectCards("projects").map((p) => ({ name: p.name || "", description: p.description || "" })),
    certifications: $("certifications").value.split("\n").map((s) => s.trim()).filter(Boolean),
    selected_skills: [...selectedSkills], extra_skills: $("extra_skills").value.trim(),
    languages: $("languages").value.trim(),
  };
}

function turnstileToken() {
  if (CATALOG.turnstile_sitekey && window.turnstile && turnstileId !== null) {
    return window.turnstile.getResponse(turnstileId) || "";
  }
  return "";
}
function resetTurnstile() {
  if (CATALOG.turnstile_sitekey && window.turnstile && turnstileId !== null) window.turnstile.reset(turnstileId);
}

async function api(path, body) {
  const r = await fetch(API_BASE + path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
  return r;
}

async function refreshPreview() {
  const r = await api("/api/preview", { resume: CURRENT.resume });
  $("preview-frame").srcdoc = await r.text();
}

function showResult(data) {
  CURRENT.resume = data.resume;
  $("empty").classList.add("hidden");
  $("dl-buttons").classList.remove("hidden");
  refreshPreview();

  const v = $("verify"); const mtv = data.resume.metrics_to_verify || [];
  if (mtv.length) {
    v.innerHTML = `<b>⚠ Verify these AI-estimated numbers before you apply:</b><ul>${mtv.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`;
    v.classList.remove("hidden");
  } else v.classList.add("hidden");

  buildFeedbackSkills(data.resume);
  $("feedback").classList.remove("hidden");
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function buildFeedbackSkills(resume) {
  feedbackKeep.clear(); feedbackDrop.clear();
  const skills = new Set();
  (resume.competencies || []).forEach((c) => c.skills.split(",").forEach((s) => { s = s.trim(); if (s && s.length < 28) skills.add(s); }));
  const root = $("feedback-skills"); root.innerHTML = "";
  [...skills].slice(0, 40).forEach((s) => {
    const chip = document.createElement("span");
    chip.className = "fb-chip"; chip.textContent = s;
    chip.onclick = () => {
      if (chip.classList.contains("keep")) { chip.classList.remove("keep"); chip.classList.add("drop"); feedbackKeep.delete(s); feedbackDrop.add(s); }
      else if (chip.classList.contains("drop")) { chip.classList.remove("drop"); feedbackDrop.delete(s); }
      else { chip.classList.add("keep"); feedbackKeep.add(s); }
    };
    root.appendChild(chip);
  });
}

function msg(id, text, cls) { const el = $(id); el.textContent = text; el.className = "msg " + (cls || ""); }

async function generate() {
  const p = studentPayload();
  if (!p.name) { msg("form-msg", "Please enter a name.", "err"); return; }
  const token = turnstileToken();
  if (CATALOG.turnstile_sitekey && !token) { msg("form-msg", "Please complete the verification checkbox.", "err"); return; }
  const btn = $("generate"); btn.disabled = true; const old = btn.textContent; btn.textContent = "Building… (10–25s)";
  msg("form-msg", "Crafting a unique resume…", "");
  try {
    const r = await api("/api/generate", { student: p, turnstile_token: token });
    const data = await r.json();
    CURRENT.student = p;
    showResult(data);
    msg("form-msg", `Done. Fingerprint ${data.fingerprint} (unique).`, "ok");
  } catch (e) { msg("form-msg", e.message, "err"); }
  finally { btn.disabled = false; btn.textContent = old; resetTurnstile(); }
}

async function rebuild() {
  if (!CURRENT.resume) return;
  const token = turnstileToken();
  if (CATALOG.turnstile_sitekey && !token) { msg("rebuild-msg", "Please complete the verification checkbox above.", "err"); return; }
  const btn = $("rebuild"); btn.disabled = true; const old = btn.textContent; btn.textContent = "Rebuilding…";
  msg("rebuild-msg", "Applying your feedback…", "");
  try {
    const r = await api("/api/rebuild", {
      student: CURRENT.student, previous_resume: CURRENT.resume,
      accepted_skills: [...feedbackKeep], rejected_skills: [...feedbackDrop],
      feedback: $("feedback-note").value.trim(), turnstile_token: token,
    });
    const data = await r.json();
    showResult(data);
    msg("rebuild-msg", `Rebuilt. Fingerprint ${data.fingerprint}.`, "ok");
  } catch (e) { msg("rebuild-msg", e.message, "err"); }
  finally { btn.disabled = false; btn.textContent = old; resetTurnstile(); }
}

// PDF = print the styled preview (browser "Save as PDF" = identical fidelity, free).
function downloadPdf() {
  const frame = $("preview-frame");
  if (!frame.srcdoc) return;
  frame.contentWindow.focus();
  frame.contentWindow.print();
}

async function downloadDocx() {
  if (!CURRENT.resume) return;
  const r = await api("/api/docx", { resume: CURRENT.resume });
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (CURRENT.resume.name || "resume").replace(/[^A-Za-z0-9]+/g, "_") + "_Resume.docx";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function init() {
  try {
    CATALOG = await (await fetch(API_BASE + "/api/catalog")).json();
  } catch (e) {
    msg("form-msg", "Cannot reach the API. If this persists, the Pages Functions may still be deploying.", "err");
    CATALOG = { skills: {}, roles: ["DevOps Engineer"], levels: ["Mid / 2-4 yrs"], turnstile_sitekey: "" };
  }
  CATALOG.roles.forEach((role) => { const o = document.createElement("option"); o.value = o.textContent = role; $("target_role").appendChild(o); });
  CATALOG.levels.forEach((lv) => { const o = document.createElement("option"); o.value = o.textContent = lv; $("experience_level").appendChild(o); });
  $("experience_level").value = CATALOG.levels[2] || CATALOG.levels[0];
  renderSkills();
  ["experience", "education"].forEach(addCard);
  document.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => addCard(b.dataset.add)));
  $("generate").onclick = generate;
  $("rebuild").onclick = rebuild;
  $("dl-pdf").onclick = downloadPdf;
  $("dl-docx").onclick = downloadDocx;

  if (CATALOG.turnstile_sitekey) {
    const tryRender = () => {
      if (window.turnstile) turnstileId = window.turnstile.render("#turnstile", { sitekey: CATALOG.turnstile_sitekey });
      else setTimeout(tryRender, 300);
    };
    tryRender();
  } else {
    $("turnstile").style.display = "none";
  }
}
init();
