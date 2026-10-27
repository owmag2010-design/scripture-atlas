// Sermon and lesson preparation: pure helpers shared by the Prepare workspace and the Research Desk.
// A preparation is kept on this device, keyed by its passage ("John.1.1-18"), and holds step notes,
// collected material (each with its source) and an outline. Unit-tested in test/prep.test.mjs.

export const STEPS = [
  ["read", "Read", "Read the passage slowly in two translations."],
  ["observe", "Observe", "Notice who speaks, what happens and what repeats."],
  ["words", "Words", "Look at the key words in the Hebrew or Greek."],
  ["context", "Context", "Set the passage in its book, history and places."],
  ["commentaries", "Commentaries", "Hear how others have read it, and weigh them."],
  ["connections", "Connections", "Follow where Scripture echoes this passage."],
  ["outline", "Outline", "Shape the main idea and the points."],
  ["apply", "Apply", "Decide what the passage asks of your hearers."]
];

export const KIND_LABEL = { verse: "Scripture", word: "Word study", xref: "Cross reference", commentary: "Commentary", discovery: "Discovery", context: "Background", note: "Note" };

let seq = 0;
export const blockId = () => "b" + Date.now().toString(36) + (seq++).toString(36);

export function newPrep(key, title) {
  return { key, title, steps: {}, idea: "", points: [], inbox: [], preached: [], created: null, updated: null };
}

/** Normalises anything read back from storage into a valid preparation (tolerates older or damaged records). */
export function cleanPrep(p, key, title) {
  const s = v => (typeof v === "string" ? v : "");
  const block = b => b && typeof b === "object" ? { id: s(b.id) || blockId(), kind: KIND_LABEL[b.kind] ? b.kind : "note", text: s(b.text).slice(0, 4000), cite: s(b.cite).slice(0, 300), href: /^\/[a-z]/i.test(s(b.href)) ? s(b.href) : "" } : null;
  const out = newPrep(key, title);
  if (!p || typeof p !== "object") return out;
  for (const [k] of STEPS) { const st = p.steps?.[k]; if (st && typeof st === "object") out.steps[k] = { done: !!st.done, notes: s(st.notes).slice(0, 20000) }; }
  out.idea = s(p.idea).slice(0, 500);
  out.points = (Array.isArray(p.points) ? p.points : []).slice(0, 12).map(pt => ({ id: s(pt?.id) || blockId(), text: s(pt?.text).slice(0, 300), blocks: (Array.isArray(pt?.blocks) ? pt.blocks : []).map(block).filter(Boolean).slice(0, 40) }));
  out.inbox = (Array.isArray(p.inbox) ? p.inbox : []).map(block).filter(Boolean).slice(-100);
  out.preached = (Array.isArray(p.preached) ? p.preached : []).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(s(x?.date))).map(x => ({ date: x.date, where: s(x.where).slice(0, 80) })).slice(-20);
  out.created = p.created || null; out.updated = p.updated || null;
  return out;
}

export const doneCount = p => STEPS.filter(([k]) => p.steps?.[k]?.done).length;

/** Blocks for a Word document or handout, in reading order. */
export function outlineDoc(p, { passageText = [], translation = "", forHandout = false } = {}) {
  const out = [{ type: "title", text: p.title }, { type: "subtitle", text: forHandout ? `${translation}` : `Sermon preparation · ${translation}` }];
  if (p.idea) out.push({ type: "h1", text: p.idea });
  if (passageText.length) { out.push({ type: "h2", text: p.title }); out.push({ type: "quote", text: passageText.map(([n, t]) => `${n} ${t}`).join(" ") }); }
  p.points.forEach((pt, i) => {
    out.push({ type: "h1", text: `${i + 1}. ${pt.text || "Point " + (i + 1)}` });
    for (const b of pt.blocks) {
      if (b.kind === "note") { out.push({ type: "p", text: b.text }); continue; }
      out.push({ type: b.kind === "verse" || b.kind === "xref" ? "quote" : "p", text: b.text });
      if (b.cite) out.push({ type: "cite", text: b.cite });
    }
  });
  if (!forHandout) {
    const notes = STEPS.filter(([k]) => p.steps?.[k]?.notes?.trim());
    if (notes.length) { out.push({ type: "h1", text: "Study notes" }); for (const [k, label] of notes) { out.push({ type: "h2", text: label }); out.push({ type: "p", text: p.steps[k].notes.trim() }); } }
  }
  const sources = [...new Set(p.points.flatMap(pt => pt.blocks.map(b => b.cite).filter(Boolean)))];
  if (sources.length) { out.push({ type: "h2", text: "Sources" }); sources.forEach(s => out.push({ type: "bullet", text: s })); }
  out.push({ type: "cite", text: "Prepared with Ereunia (ereunia.com). Commentaries are interpretation; the text of Scripture is the authority." });
  return out;
}

/** Plain-text slides for the Present view: the main idea, then one slide per point with its Scripture. */
export function slides(p, passageLabel) {
  const s = [{ kind: "title", title: p.title, body: p.idea || passageLabel }];
  p.points.forEach((pt, i) => {
    const scripture = pt.blocks.filter(b => b.kind === "verse" || b.kind === "xref");
    const rest = pt.blocks.filter(b => !(b.kind === "verse" || b.kind === "xref"));
    s.push({ kind: "point", n: i + 1, title: pt.text || `Point ${i + 1}`, scripture: scripture.map(b => ({ text: b.text, cite: b.cite })), notes: rest.map(b => ({ text: b.text, cite: b.cite, kind: b.kind })) });
  });
  return s;
}

/* ---------- passage structure: clauses and linking words ---------- */
// A reading aid, not a grammatical analysis: splits English verses at strong punctuation and before
// linking words that follow a comma, and marks the linking word so the flow of an argument stands out.
const LINKS = ["so that", "even as", "in order that", "because", "therefore", "wherefore", "for", "but", "yet", "nevertheless", "that", "if", "unless", "when", "as", "since", "lest", "and", "then", "so", "which", "who"];
const SUBORDINATE = new Set(["so that", "in order that", "because", "for", "that", "if", "unless", "when", "as", "since", "lest", "which", "who", "even as"]);
const linkAt = t => { const low = t.toLowerCase(); return LINKS.find(w => low.startsWith(w + " ") || low.startsWith(w + ",")) || null; };
/** [[verse, text]] → [{ verse, text, link, indent }] in reading order. */
export function clauses(verses) {
  const out = [];
  for (const [n, raw] of verses) {
    const parts = String(raw || "").split(/(?<=[;:])\s+|(?<=,)\s+(?=(?:so that|even as|because|therefore|wherefore|for|but|yet|nevertheless|that|if|unless|when|since|lest|and then|then|which|who)\b)/i).map(x => x.trim()).filter(Boolean);
    parts.forEach((t, i) => { const link = linkAt(t); out.push({ verse: i === 0 ? n : null, text: t, link, indent: link && SUBORDINATE.has(link) ? 1 : 0 }); });
  }
  return out;
}
/** Logical linking words and how often they occur (and/then left out). */
export function linkCounts(cl) {
  const c = new Map();
  for (const x of cl) if (x.link && !["and", "then", "which", "who", "as", "so"].includes(x.link)) c.set(x.link, (c.get(x.link) || 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1]);
}

/* ---------- series calendar ---------- */
const icsEsc = s => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
export function addDays(iso, n) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
/** An iCalendar file with one all-day event per planned week. weeks: [{ date, label, title, url }] */
export function seriesIcs(title, weeks, stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ereunia//Series planner//EN", "CALSCALE:GREGORIAN"];
  weeks.forEach((w, i) => {
    const d = w.date.replace(/-/g, ""), next = addDays(w.date, 1).replace(/-/g, "");
    lines.push("BEGIN:VEVENT", `UID:ereunia-${d}-${i}-${icsEsc(title).replace(/[^A-Za-z0-9]/g, "").slice(0, 20)}@ereunia.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${icsEsc(`${title}: ${w.title || w.label || "Week " + (i + 1)}`)}`, `DESCRIPTION:${icsEsc([w.label, w.url].filter(Boolean).join("\n"))}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/* ---------- sermon series ---------- */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** A series plan: { id, title, start, every (days between weeks), weeks: [{ spec, label, title }] }. */
export function cleanSeries(x) {
  const s = v => (typeof v === "string" ? v : "");
  if (!x || typeof x !== "object" || !/^[a-z0-9]{4,24}$/.test(s(x.id))) return null;
  return {
    id: x.id, title: s(x.title).slice(0, 120) || "Untitled series", start: ISO.test(s(x.start)) ? x.start : "",
    every: [7, 14].includes(x.every) ? x.every : 7, notes: s(x.notes).slice(0, 4000),
    weeks: (Array.isArray(x.weeks) ? x.weeks : []).slice(0, 60).map(w => ({ spec: /^[1-3]?[A-Za-z]+\.\d+(?:\.\d+(?:-\d+)?)?$/.test(s(w?.spec)) ? w.spec : "", label: s(w?.label).slice(0, 80), title: s(w?.title).slice(0, 120) })),
    updated: x.updated || null
  };
}
/** The date of each week, or "" when the series has no start date. */
export const weekDates = x => x.weeks.map((_, i) => (x.start ? addDays(x.start, i * x.every) : ""));

/** Every preached record across preparations, newest first: [{ date, where, key, title }]. */
export function preachedLog(preps) {
  return preps.flatMap(p => (p.preached || []).map(r => ({ ...r, key: p.key, title: p.title }))).sort((a, b) => b.date.localeCompare(a.date));
}
