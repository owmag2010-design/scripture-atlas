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

export function newPrep(key, title, id = key) {
  return { id, key, title, name: "", occasion: "", audience: "", date: "", venue: "", seriesId: "", status: "draft", tags: [], target: 25,
    steps: {}, idea: "", points: [], inbox: [], preached: [], manuscript: [], notes: [], versions: [], structure: null, recordings: [],
    readings: "", serviceNotes: "", groupQs: [], offline: null, pos: null, created: null, updated: null };
}

/* ---------- sermon records ---------- */
// A sermon record extends a passage preparation. The first sermon on a passage keeps the passage as its id
// (so older links such as /prepare/John.1.1-18 still open it); later sermons on the same passage get "s-…" ids.
export const SERMON_ID = /^(?:s-[a-z0-9]{6,16}|[1-3]?[A-Za-z]+\.\d+(?:\.\d+(?:-\d+)?)?)$/;
export const newSermonId = () => "s-" + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
export const STATUS = { draft: "Draft", final: "Ready to preach", preached: "Preached" };
export const BLOCK_TYPES = [["heading", "Point heading"], ["para", "Paragraph"], ["scripture", "Scripture"], ["quote", "Quotation"], ["illus", "Illustration"], ["trans", "Transition"], ["cue", "Delivery cue (private)"], ["concl", "Conclusion"]];
export const ORIGINS = { mine: "My words", scripture: "Scripture", quote: "Quoted source", interp: "Interpretation", ai: "AI suggestion" };
export const NOTE_TYPES = { obs: "Observation", question: "Question", quote: "Quotation", illus: "Illustration", apply: "Application", interp: "Interpretation" };
export const RELATIONS = ["", "statement", "reason", "result", "purpose", "contrast", "condition", "command", "promise", "conclusion", "example", "question", "comparison", "time", "means"];
const defaultOrigin = t => (t === "scripture" ? "scripture" : t === "quote" ? "quote" : "mine");
const str = (v, n) => (typeof v === "string" ? v : "").slice(0, n);
const okHref = v => (/^\/[a-z]/i.test(str(v, 500)) ? v : "");
export function cleanBlock(b) {
  if (!b || typeof b !== "object") return null;
  const type = BLOCK_TYPES.some(([k]) => k === b.type) ? b.type : "para";
  return { id: str(b.id, 40) || blockId(), type, text: str(b.text, 20000), cite: str(b.cite, 300), href: okHref(b.href), origin: ORIGINS[b.origin] ? b.origin : defaultOrigin(type), pointId: str(b.pointId, 40), verseCheck: str(b.verseCheck, 60) };
}
export function cleanNote(n) {
  if (!n || typeof n !== "object") return null;
  return { id: str(n.id, 40) || blockId(), type: NOTE_TYPES[n.type] ? n.type : "obs", text: str(n.text, 6000), cite: str(n.cite, 300), href: okHref(n.href), verse: Number.isInteger(n.verse) ? n.verse : null, pointId: str(n.pointId, 40), at: str(n.at, 30) };
}

/** Normalises anything read back from storage into a valid preparation (tolerates older or damaged records). */
export function cleanPrep(p, key, title) {
  const s = v => (typeof v === "string" ? v : "");
  const block = b => b && typeof b === "object" ? { id: s(b.id) || blockId(), kind: KIND_LABEL[b.kind] ? b.kind : "note", text: s(b.text).slice(0, 4000), cite: s(b.cite).slice(0, 300), href: /^\/[a-z]/i.test(s(b.href)) ? s(b.href) : "" } : null;
  const out = newPrep(key, title);
  if (!p || typeof p !== "object") return out;
  for (const [k] of STEPS) { const st = p.steps?.[k]; if (st && typeof st === "object") out.steps[k] = { done: !!st.done, notes: s(st.notes).slice(0, 20000) }; }
  out.idea = s(p.idea).slice(0, 500);
  out.points = (Array.isArray(p.points) ? p.points : []).slice(0, 60).map(pt => ({ id: s(pt?.id) || blockId(), text: s(pt?.text).slice(0, 300), blocks: (Array.isArray(pt?.blocks) ? pt.blocks : []).map(block).filter(Boolean).slice(0, 200) }));
  out.inbox = (Array.isArray(p.inbox) ? p.inbox : []).map(block).filter(Boolean).slice(-500);
  out.preached = (Array.isArray(p.preached) ? p.preached : []).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(s(x?.date))).map(x => ({ date: x.date, where: s(x.where).slice(0, 80) })).slice(-20);
  out.id = SERMON_ID.test(str(p.id, 40)) ? p.id : (out.id || key);
  for (const k of ["name", "occasion", "audience", "venue", "seriesId"]) out[k] = str(p[k], 160);
  out.date = /^\d{4}-\d{2}-\d{2}$/.test(str(p.date, 10)) ? p.date : "";
  out.status = STATUS[p.status] ? p.status : (out.preached.length ? "preached" : "draft");
  out.tags = (Array.isArray(p.tags) ? p.tags : []).map(t => str(t, 40).trim()).filter(Boolean).slice(0, 20);
  out.target = Number.isFinite(p.target) ? Math.max(1, Math.min(180, Math.round(p.target))) : 25;
  out.manuscript = (Array.isArray(p.manuscript) ? p.manuscript : []).map(cleanBlock).filter(Boolean).slice(0, 1500);
  out.notes = (Array.isArray(p.notes) ? p.notes : []).map(cleanNote).filter(Boolean).slice(-2000);
  out.versions = trimVersions((Array.isArray(p.versions) ? p.versions : []).filter(v => v && typeof v === "object")).map(v => ({ at: str(v.at, 30), label: str(v.label, 80), idea: str(v.idea, 500), manuscript: (Array.isArray(v.manuscript) ? v.manuscript : []).map(cleanBlock).filter(Boolean) }));
  out.structure = p.structure && Array.isArray(p.structure.rows) ? { t: str(p.structure.t, 10), rows: p.structure.rows.slice(0, 400).map(r => ({ text: str(r?.text, 600), verse: Number.isInteger(r?.verse) ? r.verse : null, indent: Math.max(0, Math.min(5, r?.indent | 0)), rel: RELATIONS.includes(r?.rel) ? r.rel : "", note: str(r?.note, 300) })) } : null;
  out.recordings = (Array.isArray(p.recordings) ? p.recordings : []).filter(r => r && typeof r === "object" && /^r[a-z0-9]{4,20}$/.test(str(r.id, 24))).map(r => ({ id: r.id, at: str(r.at, 30), name: str(r.name, 120), mime: str(r.mime, 60), dur: Number.isFinite(r.dur) ? r.dur : 0, kind: r.kind === "rehearsal" ? "rehearsal" : "sermon", segs: r.segs | 0, complete: !!r.complete,
    transcript: (Array.isArray(r.transcript) ? r.transcript : []).slice(0, 4000).map(x => ({ t: Number.isFinite(x?.t) ? x.t : 0, text: str(x?.text, 2000) })), marks: (Array.isArray(r.marks) ? r.marks : []).slice(0, 200).map(m => ({ t: Number.isFinite(m?.t) ? m.t : 0, label: str(m?.label, 120) })) }));
  out.readings = str(p.readings, 600); out.serviceNotes = str(p.serviceNotes, 4000);
  out.groupQs = (Array.isArray(p.groupQs) ? p.groupQs : []).map(q => str(q, 400)).filter(Boolean).slice(0, 20);
  out.offline = p.offline && Array.isArray(p.offline.verses) ? { t: str(p.offline.t, 10), verses: p.offline.verses.slice(0, 200).map(v => [v?.[0] | 0, str(v?.[1], 2000)]), at: str(p.offline.at, 30) } : null;
  out.pos = p.pos && Number.isInteger(p.pos.i) ? { i: p.pos.i, size: Number.isFinite(p.pos.size) ? p.pos.size : 0, at: str(p.pos.at, 30) } : null;
  out.created = p.created || null; out.updated = p.updated || null;
  return out;
}

/** Versions you named are always kept; automatic ones ("Autosaved…", "Before…") keep the newest 40. */
export const isAutoVersion = v => /^(Autosaved|Before )/.test(v.label || "");
export function trimVersions(vs) {
  const autos = vs.filter(isAutoVersion), drop = new Set(autos.slice(0, Math.max(0, autos.length - 40)));
  return vs.filter(v => !drop.has(v)).slice(-200);
}
/** The display name of a sermon: its own title, else the passage. */
export const sermonName = p => p.name || p.title;
/** Sections of a manuscript: each heading starts a section; blocks before the first heading form an introduction. */
export function sections(ms) {
  const out = []; let cur = { head: null, blocks: [] };
  for (const b of ms) { if (b.type === "heading") { if (cur.head || cur.blocks.length) out.push(cur); cur = { head: b, blocks: [] }; } else cur.blocks.push(b); }
  if (cur.head || cur.blocks.length) out.push(cur);
  return out;
}
/** A first manuscript draft from the outline: main idea, each point as a heading with its material, then a conclusion. */
export function manuscriptFromOutline(p) {
  const B = (type, text = "", extra = {}) => cleanBlock({ type, text, ...extra });
  const out = [];
  if (p.idea) out.push(B("para", p.idea, { origin: "mine" }));
  for (const pt of p.points) {
    out.push(B("heading", pt.text || "Point", { pointId: pt.id }));
    for (const b of pt.blocks) {
      if (b.kind === "verse" || b.kind === "xref") out.push(B("scripture", b.text, { cite: b.cite, href: b.href }));
      else if (b.kind === "commentary") out.push(B("quote", b.text, { cite: b.cite, href: b.href, origin: "interp" }));
      else if (b.kind === "discovery" || b.kind === "context") out.push(B("illus", b.text, { cite: b.cite, href: b.href, origin: "quote" }));
      else if (b.kind === "word") out.push(B("para", b.text, { cite: b.cite, href: b.href, origin: "quote" }));
      else out.push(B("para", b.text, { origin: "mine" }));
    }
  }
  out.push(B("concl", ""));
  return out;
}
/** Words in the manuscript (delivery cues excluded) and an estimated speaking time at the given words per minute. */
export function wordCount(ms) { return ms.filter(b => b.type !== "cue").reduce((n, b) => n + (b.text.match(/\S+/g) || []).length, 0); }
export const minutesAt = (words, wpm = 130) => Math.round(words / wpm);

/* ---------- checks and source tracing ---------- */
const norm = t => String(t || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
/**
 * Review flags for a manuscript. verseText(cite) returns the official text for a Scripture citation, or null when it
 * cannot be checked. Returns [{ id, level, msg }].
 */
export function reviewFlags(ms, verseText = () => null) {
  const out = [];
  for (const b of ms) {
    if ((b.type === "quote" || b.origin === "quote" || b.origin === "interp") && b.text.trim() && !b.cite.trim()) out.push({ id: b.id, level: "warn", msg: "Quotation without a citation." });
    if (b.type === "scripture" && b.text.trim()) {
      if (!b.cite.trim()) out.push({ id: b.id, level: "warn", msg: "Scripture without a reference." });
      else { const t = verseText(b.cite); if (t != null && !norm(t).includes(norm(b.text)) && !norm(b.text).includes(norm(t))) out.push({ id: b.id, level: "warn", msg: "Scripture text does not match the cited translation. Check it was copied exactly." }); }
    }
    if (b.origin === "ai") out.push({ id: b.id, level: "info", msg: "AI suggestion: review it before you preach it." });
  }
  return out;
}
/** The chain behind one point: passage → observations → sources → interpretation → application. */
export function tracePoint(p, headingId) {
  const secs = sections(p.manuscript), sec = secs.find(x => x.head?.id === headingId);
  if (!sec) return null;
  const pid = sec.head.pointId, pt = p.points.find(x => x.id === pid);
  const linked = n => n.pointId && (n.pointId === pid || n.pointId === headingId);
  const scripture = [...sec.blocks.filter(b => b.type === "scripture"), ...(pt?.blocks || []).filter(b => b.kind === "verse" || b.kind === "xref").map(b => ({ text: b.text, cite: b.cite, href: b.href }))];
  const sources = [...sec.blocks.filter(b => b.origin !== "interp" && b.origin !== "ai" && (b.origin === "quote" || b.type === "illus" || b.type === "quote")), ...(pt?.blocks || []).filter(b => ["word", "discovery", "context"].includes(b.kind)).map(b => ({ text: b.text, cite: b.cite, href: b.href }))];
  const interp = [...sec.blocks.filter(b => b.origin === "interp"), ...(pt?.blocks || []).filter(b => b.kind === "commentary").map(b => ({ text: b.text, cite: b.cite, href: b.href })), ...p.notes.filter(n => linked(n) && n.type === "interp")];
  const uniq = arr => arr.filter((x, i) => arr.findIndex(y => y.text === x.text && y.cite === x.cite) === i);
  return {
    point: sec.head.text,
    passage: uniq(scripture),
    observations: p.notes.filter(n => linked(n) && (n.type === "obs" || n.type === "question")),
    sources: uniq(sources),
    interpretation: uniq(interp),
    application: [...sec.blocks.filter(b => b.type === "concl" || /\bapply|application\b/i.test(b.text.slice(0, 40))), ...p.notes.filter(n => linked(n) && n.type === "apply")],
    mine: sec.blocks.filter(b => b.origin === "mine" && b.type !== "cue"),
    ai: sec.blocks.filter(b => b.origin === "ai"),
    flags: reviewFlags([sec.head, ...sec.blocks])
  };
}

/* ---------- search across sermons ---------- */
export function searchSermons(list, q, f = {}) {
  const words = norm(q).split(" ").filter(Boolean);
  return list.filter(p => {
    if (f.series && p.seriesId !== f.series) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.book != null && f.book !== "" && !p.key.startsWith(f.book + ".")) return false;
    if (!words.length) return true;
    const hay = norm([p.name, p.title, p.key, p.idea, p.occasion, p.audience, p.venue, p.tags.join(" "), p.date, ...p.preached.map(r => r.date + " " + r.where), ...p.points.map(x => x.text), ...p.manuscript.filter(b => b.type === "heading").map(b => b.text)].join(" "));
    return words.every(w => hay.includes(w));
  });
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
    weeks: (Array.isArray(x.weeks) ? x.weeks : []).slice(0, 60).map(w => ({ spec: /^[1-3]?[A-Za-z]+\.\d+(?:\.\d+(?:-\d+)?)?$/.test(s(w?.spec)) ? w.spec : "", label: s(w?.label).slice(0, 80), title: s(w?.title).slice(0, 120), sermonId: /^(?:s-[a-z0-9]{6,16}|[1-3]?[A-Za-z]+\.\d+(?:\.\d+(?:-\d+)?)?)$/.test(s(w?.sermonId)) ? w.sermonId : "", readings: s(w?.readings).slice(0, 300) })),
    updated: x.updated || null
  };
}
/** The date of each week, or "" when the series has no start date. */
export const weekDates = x => x.weeks.map((_, i) => (x.start ? addDays(x.start, i * x.every) : ""));

/** Every preached record across preparations, newest first: [{ date, where, key, title }]. */
export function preachedLog(preps) {
  return preps.flatMap(p => (p.preached || []).map(r => ({ ...r, key: p.key, id: p.id || p.key, title: p.name || p.title }))).sort((a, b) => b.date.localeCompare(a.date));
}
