// PDF studio: branded PDFs made in the browser from the saved sermon, with Ereunia's own fonts embedded
// (EB Garamond and Schibsted Grotesk, SIL Open Font License). Uses pdf-lib and fontkit (MIT), loaded only here.
// Every document derives from the same saved sermon, so later edits flow into every download.
import { STEPS, KIND_LABEL, NOTE_TYPES, sections, sermonName, clauses, wordCount, minutesAt, slides as outlineSlides } from "./prep-core.js";
import { buildDocx, zipStore } from "./docx.js";

let A, C, esc;
const INK = [0.082, 0.071, 0.055], GILT = [0.478, 0.345, 0.02], RUBRIC = [0.71, 0.196, 0.11], MUTED = [0.42, 0.39, 0.33], LINE = [0.85, 0.82, 0.76], SOFT = [0.96, 0.94, 0.9];
const PAPER = { A4: [595.28, 841.89], Letter: [612, 792] };
export const TEMPLATES = [
  ["dossier", "Study dossier", "The passage, its structure, your observations, word studies, commentary extracts, cross references and sources."],
  ["manuscript", "Full manuscript", "Readable paragraphs, headings and Scripture, with each source in a footnote."],
  ["pulpit", "Pulpit copy", "Large type and clear breaks for preaching, with your delivery cues if you want them."],
  ["handout", "Congregation handout", "The points and references, with space to write and optional fill-in blanks."],
  ["group", "Small-group guide", "The passage, your questions, application and prayer prompts."],
  ["family", "Family sheet", "A reading in modern English, questions for home, a matching Kids story and space to draw."]
];
const TNAME = Object.fromEntries(TEMPLATES.map(([k, l]) => [k, l]));

/* ---------- library loading ---------- */
let libs = null;
async function load() {
  if (libs) return libs;
  const PDFLib = await import("/vendor/pdf-lib.esm.min.js");
  if (!window.fontkit) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "/vendor/fontkit.umd.min.js"; s.onload = res; s.onerror = () => rej(new Error("The PDF fonts could not load.")); document.head.appendChild(s); });
  const names = ["garamond-regular", "garamond-italic", "garamond-semibold", "grotesk-regular", "grotesk-semibold", "grotesk-bold"];
  const bytes = await Promise.all(names.map(n => fetch(`/fonts/pdf/${n}.ttf`).then(r => { if (!r.ok) throw new Error("The PDF fonts could not load."); return r.arrayBuffer(); })));
  libs = { PDFLib, fontkit: window.fontkit, fontBytes: Object.fromEntries(names.map((n, i) => [n, bytes[i]])) };
  return libs;
}

/* ---------- layout engine ---------- */
class Layout {
  constructor(pdf, F, { paper = "A4", margin = 56, footer = "", title = "", big = false } = {}) {
    this.pdf = pdf; this.F = F; this.size = PAPER[paper] || PAPER.A4; this.m = margin; this.footer = footer; this.title = title; this.big = big;
    this.notes = []; this.pageNotes = new Map(); this.newPage();
  }
  get w() { return this.size[0] - this.m * 2; }
  newPage() { this.page = this.pdf.addPage(this.size); this.y = this.size[1] - this.m; this.pageNotes.set(this.page, []); this.fnH = 0; }
  bottom() { return this.m + 22 + this.fnH; }
  clean(font, s) { const set = font.__set || (font.__set = new Set(font.getCharacterSet())); return String(s ?? "").replace(/\s+/g, " ").split("").filter(ch => ch === " " || set.has(ch.codePointAt(0))).join(""); }
  /** Lay out runs [{ text, font, size, color, rise }] into lines no wider than width. */
  wrap(runs, width) {
    const lines = []; let line = [], lw = 0;
    for (const r of runs) {
      const text = this.clean(r.font, r.text); if (!text) continue;
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        const space = /^\s+$/.test(part), wd = r.font.widthOfTextAtSize(space ? " " : part, r.size);
        if (space) { if (line.length) { line.push({ ...r, text: " ", w: wd }); lw += wd; } continue; }
        if (lw + wd > width && line.length) { while (line.length && line.at(-1).text === " ") lw -= line.pop().w; lines.push(line); line = []; lw = 0; }
        if (wd > width) { // very long word: break by characters
          let chunk = ""; for (const ch of part) { const cw = r.font.widthOfTextAtSize(chunk + ch, r.size); if (cw > width && chunk) { lines.push([{ ...r, text: chunk, w: r.font.widthOfTextAtSize(chunk, r.size) }]); chunk = ch; } else chunk += ch; }
          line.push({ ...r, text: chunk, w: r.font.widthOfTextAtSize(chunk, r.size) }); lw = line.at(-1).w; continue;
        }
        line.push({ ...r, text: part, w: wd }); lw += wd;
      }
    }
    while (line.length && line.at(-1).text === " ") line.pop();
    if (line.length) lines.push(line);
    return lines;
  }
  /** A paragraph. opts: size, lead, indent, gap, color, font, keep (lines to keep with next), note (footnote text), bar (left bar colour), bg. */
  para(runsOrText, o = {}) {
    const size = o.size || 11, lead = o.lead || size * 1.45, indent = o.indent || 0, width = this.w - indent - (o.right || 0);
    const runs = typeof runsOrText === "string" ? [{ text: runsOrText, font: o.font || this.F.serif, size, color: o.color || INK }] : runsOrText.map(r => ({ size, color: INK, font: this.F.serif, ...r }));
    if (o.noteNum) runs.push({ text: String(o.noteNum), font: this.F.sansB, size: size * 0.62, color: GILT, rise: size * 0.38 });
    const lines = this.wrap(runs, width); if (!lines.length) return;
    const fn = o.note ? this.noteHeight(o.note) : 0;
    const need = Math.min(lines.length, 2 + (o.keep || 0)) * lead;
    if (this.y - need - fn < this.bottom()) this.newPage();
    // The footnote goes on the page that carries the paragraph's last line (where its number is printed).
    let noted = !o.note;
    const tryNote = left => { if (noted) return; if (this.y - left * lead - fn >= this.bottom()) { this.pageNotes.get(this.page).push(o.note); this.fnH += fn; noted = true; } };
    let top = this.y;
    for (const [li, line] of lines.entries()) {
      tryNote(lines.length - li);
      const rest = (lines.length - li) * lead, wouldFit = this.y - rest >= this.bottom();
      // the rest fits but its footnote would not: carry the rest to the next page with the note
      if (this.y - lead < this.bottom() || (!noted && wouldFit && this.y < this.size[1] - this.m - 1)) { this.drawBar(o, top, this.y); this.newPage(); top = this.y; tryNote(lines.length - li); }
      let x = this.m + indent;
      if (o.align === "center") x = this.m + (this.w - line.reduce((s, t) => s + t.w, 0)) / 2;
      const base = this.y - size;
      for (const t of line) { if (t.text !== " ") this.page.drawText(t.text, { x, y: base + (t.rise || 0), size: t.size, font: t.font, color: rgb(t.color) }); x += t.w; }
      this.y -= lead;
    }
    if (!noted) { this.pageNotes.get(this.page).push(o.note); this.fnH += fn; }
    this.drawBar(o, top, this.y);
    this.y -= o.gap ?? size * 0.6;
  }
  drawBar(o, top, y) { if (o.bar) this.page.drawRectangle({ x: this.m + (o.indent || 0) - 10, y: y + 2, width: 2.5, height: top - y - 2, color: rgb(o.bar) }); }
  noteHeight(text) { const lines = this.wrap([{ text, font: this.F.sans, size: 8 }], this.w - 14); return lines.length * 10.5 + 4; }
  heading(text, o = {}) {
    const size = o.size || 16;
    if (this.y - size * 1.4 - (o.keep ?? 3) * 15 < this.bottom()) this.newPage();
    this.y -= o.before ?? size * 0.5;
    this.para([{ text, font: o.font || this.F.serifB, size, color: o.color || INK }], { size, lead: size * 1.25, gap: o.gap ?? size * 0.45, align: o.align });
  }
  label(text, color = GILT) { this.para([{ text: text.toUpperCase(), font: this.F.sansB, size: 7.5, color }], { size: 7.5, lead: 11, gap: 3, keep: 2 }); }
  rule(color = LINE, gap = 10) { if (this.y - gap < this.bottom()) { this.newPage(); return; } this.page.drawLine({ start: { x: this.m, y: this.y }, end: { x: this.m + this.w, y: this.y }, thickness: 0.6, color: rgb(color) }); this.y -= gap; }
  space(h) { this.y -= h; if (this.y < this.bottom()) this.newPage(); }
  writeLines(n, gap = 22) { for (let i = 0; i < n; i++) { if (this.y - gap < this.bottom()) this.newPage(); this.y -= gap; this.page.drawLine({ start: { x: this.m, y: this.y }, end: { x: this.m + this.w, y: this.y }, thickness: 0.5, color: rgb(LINE) }); } this.y -= 8; }
  box(h, label) { if (this.y - h < this.bottom()) this.newPage(); this.page.drawRectangle({ x: this.m, y: this.y - h, width: this.w, height: h, borderColor: rgb(LINE), borderWidth: 1, borderDashArray: [4, 3] }); if (label) this.page.drawText(label, { x: this.m + 8, y: this.y - 14, size: 8, font: this.F.sans, color: rgb(MUTED) }); this.y -= h + 12; }
  /** Branded title block at the top of the first page. */
  masthead(kind, title, sub) {
    this.page.drawText("EREUNIA", { x: this.m, y: this.y - 8, size: 8, font: this.F.sansB, color: rgb(GILT) });
    const kw = this.F.sans.widthOfTextAtSize(kind, 8); this.page.drawText(this.clean(this.F.sans, kind), { x: this.m + this.w - kw, y: this.y - 8, size: 8, font: this.F.sans, color: rgb(MUTED) });
    this.y -= 18; this.rule(GILT, 18);
    this.para([{ text: title, font: this.F.serifB, size: this.big ? 30 : 24 }], { size: this.big ? 30 : 24, lead: (this.big ? 30 : 24) * 1.15, gap: 6 });
    if (sub) this.para([{ text: sub, font: this.F.sans, size: 10, color: MUTED }], { size: 10, gap: 14 });
  }
  finish() {
    const pages = this.pdf.getPages(), n = pages.length;
    pages.forEach((pg, i) => {
      const notes = this.pageNotes.get(pg) || [];
      if (notes.length) {
        let y = this.m + 22 + notes.reduce((s, t) => s + this.noteHeight(t), 0);
        pg.drawLine({ start: { x: this.m, y: y + 4 }, end: { x: this.m + 90, y: y + 4 }, thickness: 0.5, color: rgb(MUTED) });
        for (const t of notes) for (const line of this.wrap([{ text: t, font: this.F.sans, size: 8, color: MUTED }], this.w - 14)) { y -= 10.5; let x = this.m; for (const tk of line) { if (tk.text !== " ") pg.drawText(tk.text, { x, y, size: 8, font: tk.font, color: rgb(MUTED) }); x += tk.w; } }
      }
      const foot = this.clean(this.F.sans, this.footer), pn = `${i + 1} / ${n}`;
      pg.drawText(foot.length > 140 ? foot.slice(0, 137) + "…" : foot, { x: this.m, y: this.m - 6, size: 7, font: this.F.sans, color: rgb(MUTED) });
      pg.drawText(pn, { x: this.m + this.w - this.F.sans.widthOfTextAtSize(pn, this.big ? 11 : 8), y: this.m - 6, size: this.big ? 11 : 8, font: this.F.sans, color: rgb(MUTED) });
    });
  }
}
let rgb = c => libs.PDFLib.rgb(...c);

async function newDoc(meta) {
  const { PDFLib, fontkit, fontBytes } = await load();
  const pdf = await PDFLib.PDFDocument.create(); pdf.registerFontkit(fontkit);
  const emb = async n => pdf.embedFont(fontBytes[n], { subset: true, features: { liga: false, clig: false, dlig: false, calt: false } });
  const F = { serif: await emb("garamond-regular"), serifI: await emb("garamond-italic"), serifB: await emb("garamond-semibold"), sans: await emb("grotesk-regular"), sansM: await emb("grotesk-semibold"), sansB: await emb("grotesk-bold") };
  pdf.setTitle(meta.title); pdf.setAuthor(meta.author || ""); pdf.setCreator("Ereunia (ereunia.com)"); pdf.setProducer("Ereunia PDF studio with pdf-lib"); pdf.setSubject(meta.subject || ""); pdf.setLanguage("en");
  return { pdf, F };
}

/* ---------- content helpers ---------- */
const BLANK = /\[([^\]]+)\]/g;
const stripBlanks = s => String(s).replace(BLANK, "$1");
function blankOut(text, on) {
  if (!on) return { text: stripBlanks(text), answers: [] };
  const answers = []; let t = String(text);
  if (BLANK.test(t)) t = t.replace(BLANK, (_, w) => (answers.push(w), "_".repeat(Math.max(8, w.length + 2))));
  else { const w = (t.match(/[A-Za-z’']{5,}/g) || []).sort((a, b) => b.length - a.length)[0]; if (w) { answers.push(w); t = t.replace(w, "_".repeat(w.length + 2)); } }
  return { text: t, answers };
}
const heads = p => { const s = sections(p.manuscript).filter(x => x.head); return s.length ? s.map(x => ({ text: x.head.text, blocks: x.blocks })) : p.points.map(pt => ({ text: pt.text, blocks: pt.blocks.map(b => ({ type: b.kind === "verse" || b.kind === "xref" ? "scripture" : "para", text: b.text, cite: b.cite, origin: "quote" })) })); };
function verseRuns(F, verses, size) { const out = []; for (const [n, v] of verses) { out.push({ text: ` ${n} `, font: F.sansB, size: size * 0.62, color: RUBRIC, rise: size * 0.32 }); out.push({ text: v, font: F.serif, size }); } return out; }
function footerFor(t) { return `Prepared with Ereunia · ereunia.com${t ? ` · Scripture: ${C.META[t].name}, ${C.META[t].licence}` : ""}`; }

/* ---------- templates ---------- */
async function build(kind, g, o) {
  const p = A.loadPrep(g);
  let t = kind === "family" ? (o.t === "kjv" && C.TR.web ? "web" : o.t) : o.t;
  let { verses } = await A.passageVerses(g, t);
  // The embedded fonts cover Latin and Greek scripts. A translation in another script is shown in the KJV instead, and the page says so.
  let swapped = null;
  if (!/^[\p{Script=Latin}\p{Script=Greek}\p{Script=Common}\p{Script=Inherited}\s]*$/u.test(verses.map(v => v[1]).join(" "))) { swapped = C.META[t].name; t = "kjv"; verses = (await A.passageVerses(g, "kjv")).verses; }
  const name = sermonName(p), sub = [p.name ? g.title : "", p.date ? A.fmtDate(p.date) : "", p.venue, C.META[t].name + (swapped ? ` (${swapped} uses a script these PDFs cannot print yet)` : "")].filter(Boolean).join(" · ");
  const { pdf, F } = await newDoc({ title: `${TNAME[kind] || kind}: ${name}`, subject: g.title });
  const L = new Layout(pdf, F, { paper: o.paper, footer: footerFor(t), big: kind === "pulpit", margin: kind === "pulpit" ? 50 : 56 });
  const passage = (size = 11) => { L.label("The passage"); L.para(verseRuns(F, verses, size), { size, lead: size * 1.5, gap: 10 }); };
  let fn = 0;
  const cited = (runs, b, opt) => { if (b.cite) { fn++; L.para(runs, { ...opt, noteNum: fn, note: `${fn}. ${b.cite}` }); } else L.para(runs, opt); };

  if (kind === "dossier") {
    L.masthead("Study dossier", name, sub);
    if (p.idea) { L.label("Main idea"); L.para([{ text: p.idea, font: F.serifI, size: 13 }], { size: 13, gap: 12 }); }
    passage(11);
    const rows = p.structure?.rows?.length ? p.structure.rows : clauses(verses).map(c => ({ text: c.text, verse: c.verse, indent: c.indent, rel: c.link || "" }));
    L.label(p.structure?.rows?.length ? "Structure (your analysis)" : "Structure (reading aid from English punctuation)");
    for (const r of rows) L.para([...(r.verse ? [{ text: `${r.verse} `, font: F.sansB, size: 7, color: RUBRIC, rise: 3 }] : []), ...(r.rel && p.structure ? [{ text: `${r.rel}: `, font: F.sansM, size: 8.5, color: GILT }] : []), { text: r.text, font: F.serif, size: 10.5 }], { size: 10.5, lead: 14, indent: (r.indent || 0) * 16, gap: 1 });
    L.space(8);
    const group = (label, items) => { if (!items.length) return; L.heading(label, { size: 14 }); for (const b of items) cited([{ text: b.text, font: F.serif, size: 10.5 }], b, { size: 10.5, gap: 6 }); };
    const all = [...p.inbox, ...p.points.flatMap(pt => pt.blocks)];
    const obs = p.notes.filter(n => n.type === "obs" || n.type === "question");
    if (obs.length) { L.heading("Observations and questions", { size: 14 }); for (const n of obs) L.para([{ text: `${NOTE_TYPES[n.type]}${n.verse ? `, v. ${n.verse}` : ""}: `, font: F.sansM, size: 9, color: GILT }, { text: n.text, font: F.serif, size: 10.5 }], { size: 10.5, gap: 5 }); }
    group("Word studies", all.filter(b => b.kind === "word"));
    group("Commentary extracts", [...all.filter(b => b.kind === "commentary"), ...p.manuscript.filter(b => b.origin === "interp")]);
    group("Cross references", all.filter(b => b.kind === "xref"));
    group("Background and illustrations", all.filter(b => b.kind === "context" || b.kind === "discovery"));
    const others = p.notes.filter(n => !["obs", "question"].includes(n.type));
    if (others.length) { L.heading("Notebook", { size: 14 }); for (const n of others) cited([{ text: `${NOTE_TYPES[n.type]}: `, font: F.sansM, size: 9, color: GILT }, { text: n.text, font: F.serif, size: 10.5 }], n, { size: 10.5, gap: 5 }); }
    if (o.studyNotes) { const sn = STEPS.filter(([k]) => p.steps[k]?.notes?.trim()); if (sn.length) { L.heading("Study notes (private)", { size: 14 }); for (const [k, l] of sn) { L.label(l); L.para(p.steps[k].notes.trim(), { size: 10.5 }); } } }
  }

  if (kind === "manuscript" || kind === "pulpit") {
    const big = kind === "pulpit", s = big ? 17 : 11.5, cues = big ? o.cues : o.cuesMs;
    L.masthead(big ? "Pulpit copy" : "Sermon manuscript", name, sub + (big ? ` · planned ${p.target} min` : ""));
    if (!p.manuscript.length) { L.para("There is no manuscript yet. Write it in the Write tab; until then, here is the outline.", { size: s, color: MUTED }); }
    if (big && p.idea) L.para([{ text: p.idea, font: F.serifI, size: s + 2 }], { size: s + 2, gap: 16 });
    const ms = p.manuscript.length ? p.manuscript : heads(p).flatMap(h => [{ type: "heading", text: h.text, cite: "" }, ...h.blocks]);
    let pointNo = 0;
    for (const b of ms) {
      const text = stripBlanks(b.text); if (!text.trim() && b.type !== "heading") continue;
      if (b.type === "heading") { pointNo++; if (big && pointNo > 1) L.rule(GILT, 16); L.heading(`${pointNo}. ${text || "Point"}`, { size: big ? 24 : 16, before: big ? 6 : 10 }); }
      else if (b.type === "scripture") cited([{ text, font: big ? F.serifB : F.serifI, size: s }], b, { size: s, indent: 18, bar: RUBRIC, gap: s * 0.8 });
      else if (b.type === "quote") cited([{ text, font: F.serif, size: s }], b, { size: s, indent: 18, bar: GILT, gap: s * 0.8 });
      else if (b.type === "illus") cited([{ text: "Illustration  ", font: F.sansB, size: s * 0.62, color: GILT }, { text, font: F.serif, size: s }], b, { size: s, gap: s * 0.8 });
      else if (b.type === "trans") L.para([{ text, font: F.serifI, size: s, color: MUTED }], { size: s, gap: s });
      else if (b.type === "cue") { if (cues) L.para([{ text: "CUE  ", font: F.sansB, size: s * 0.62, color: GILT }, { text, font: F.sansM, size: s * 0.85, color: GILT }], { size: s * 0.85, indent: 10, bar: GILT, gap: s * 0.8 }); }
      else if (b.type === "concl") { L.heading("Conclusion", { size: big ? 22 : 14, before: 8 }); cited([{ text, font: F.serif, size: s }], b, { size: s }); }
      else cited([{ text, font: F.serif, size: s }], b, { size: s, lead: s * (big ? 1.55 : 1.5) });
    }
    if (!big) { const w = wordCount(p.manuscript); L.space(10); L.para(`${w.toLocaleString()} words · about ${minutesAt(w)} minutes at 130 words a minute.`, { size: 8.5, font: F.sans, color: MUTED }); }
  }

  if (kind === "handout") {
    L.masthead("Sermon notes", name, sub);
    if (p.idea && !o.blanks) L.para([{ text: p.idea, font: F.serifI, size: 13 }], { size: 13, gap: 12 });
    L.label("Read"); L.para([{ text: `${g.title}${p.readings ? `; ${p.readings}` : ""}`, font: F.sansM, size: 11 }], { size: 11, gap: 12 });
    if (o.passageText) passage(10.5);
    const answers = [];
    heads(p).forEach((h, i) => {
      const bo = blankOut(h.text, o.blanks); answers.push(...bo.answers);
      L.heading(`${i + 1}. ${bo.text || "Point"}`, { size: 14, keep: 4 });
      const refs = h.blocks.filter(b => b.type === "scripture" && b.cite).map(b => b.cite.replace(/\s*\([^)]*\)\s*$/, ""));
      if (refs.length) L.para([{ text: refs.join(" · "), font: F.sansM, size: 9.5, color: GILT }], { size: 9.5, gap: 4 });
      L.writeLines(o.lines ?? 3);
    });
    L.heading("Respond", { size: 14 }); L.writeLines(3);
    if (answers.length && o.answers) { L.space(6); L.para([{ text: `Answers: ${answers.join(", ")}`, font: F.sans, size: 8, color: MUTED }], { size: 8 }); }
  }

  if (kind === "group") {
    L.masthead("Small-group guide", name, sub);
    if (p.idea) { L.label("Sunday's main idea"); L.para([{ text: p.idea, font: F.serifI, size: 13 }], { size: 13, gap: 12 }); }
    passage(10.5);
    const hs = heads(p); if (hs.length) { L.label("Sunday's points"); hs.forEach((h, i) => L.para(`${i + 1}. ${stripBlanks(h.text)}`, { size: 11, gap: 3 })); L.space(8); }
    const qs = p.groupQs.length ? p.groupQs : defaultQs(g);
    L.heading("Questions for discussion", { size: 14 });
    qs.forEach((q, i) => { L.para([{ text: `${i + 1}. `, font: F.sansB, size: 11, color: GILT }, { text: q, font: F.serif, size: 11.5 }], { size: 11.5, gap: 2, keep: 2 }); L.writeLines(2, 20); });
    L.heading("This week", { size: 14 }); L.para("One thing I will do because of this passage:", { size: 11, color: MUTED }); L.writeLines(2);
    L.heading("Pray", { size: 14 }); for (const pr of [`Thank God for what ${g.title} shows of him.`, "Ask for help to live out what you discussed.", "Pray for one another by name."]) L.para(`• ${pr}`, { size: 11, gap: 3 });
  }

  if (kind === "family") {
    L.masthead("To read together at home", name, sub);
    if (p.idea) L.para([{ text: p.idea, font: F.serifI, size: 13 }], { size: 13, gap: 10 });
    L.heading("Read it together", { size: 14 });
    const short = verses.length > 12; L.para(verseRuns(F, short ? verses.slice(0, 12) : verses, 11.5), { size: 11.5, lead: 17, gap: 6 });
    if (short) L.para([{ text: `Read on to the end of ${g.title} in your Bible.`, font: F.serifI, size: 11 }], { size: 11 });
    L.heading("Talk about it", { size: 14 });
    ["What happens in this passage? Tell it in your own words.", "What does it show us about God?", "Is there someone in the passage you would like to be like? Why?", "What is one thing we could do this week because of it?", "What could we thank God for, or ask him for, after reading it?"].forEach((q, i) => { L.para(`${i + 1}. ${q}`, { size: 11.5, gap: 2 }); L.writeLines(1, 20); });
    const s = storyFor(g); if (s) { L.heading("A story to read with children", { size: 14 }); L.para([{ text: s.title, font: F.serifB, size: 11.5 }, { text: ` (${s.range}) is an illustrated, read-aloud retelling on Ereunia: ereunia.com/kids/${s.id}`, font: F.serif, size: 11.5 }], { size: 11.5 }); if (s.think) L.para([{ text: s.think, font: F.serifI, size: 11.5 }], { size: 11.5 }); }
    L.heading("Draw it", { size: 14 }); L.box(190, "Draw a picture of something in the passage.");
    L.heading("Pray", { size: 14 }); L.writeLines(2);
  }

  if (kind === "brief") {
    L.masthead("Service brief", name, [p.date ? A.fmtDate(p.date) : "", p.venue, p.occasion].filter(Boolean).join(" · "));
    const row = (k, v) => { if (v) L.para([{ text: `${k}  `, font: F.sansB, size: 8.5, color: GILT }, { text: v, font: F.serif, size: 11.5 }], { size: 11.5, gap: 6 }); };
    const ser = p.seriesId ? C.store.seriesGet(p.seriesId) : null;
    row("SERMON", name); row("PASSAGE", g.title); row("READINGS", p.readings); row("SERIES", ser?.title || ""); row("PLANNED LENGTH", `${p.target} minutes`); row("MAIN IDEA", p.idea);
    const hs = heads(p); if (hs.length) { L.label("Points"); hs.forEach((h, i) => L.para(`${i + 1}. ${stripBlanks(h.text)}`, { size: 11, gap: 3 })); L.space(6); }
    if (p.serviceNotes) { L.label("Notes for the service team"); for (const line of p.serviceNotes.split(/\n+/).filter(x => x.trim())) L.para(line, { size: 11, gap: 4 }); }
  }

  if (kind === "slides") {
    pdf.removePage(0);
    const S = slideData(p, g), [W, H] = [960, 540];
    for (const s of S) {
      const pg = pdf.addPage([W, H]); pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb([0.059, 0.051, 0.039]) });
      pg.drawRectangle({ x: 60, y: H - 70, width: 60, height: 3, color: rgb([0.949, 0.757, 0.306]) });
      const Ls = new Layout(pdf, F, { paper: "A4" }); pdf.removePage(pdf.getPageCount() - 1); Ls.page = pg; Ls.size = [W, H]; Ls.m = 60; Ls.y = H - 90; Ls.pageNotes.set(pg, []); Ls.fnH = 0; Ls.bottom = () => 40;
      Ls.newPage = () => { const np = pdf.addPage([W, H]); np.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb([0.059, 0.051, 0.039]) }); Ls.page = np; Ls.y = H - 60; Ls.pageNotes.set(np, []); };
      const fit = (str, n) => (str.length > n ? str.slice(0, n).replace(/\s\S*$/, "") + " …" : str);
      s.title = fit(s.title, 90); s.lines = s.lines.slice(0, s.lines.length > 1 && s.lines.some(x => x.text.length > 160) ? 1 : 2).map(x => ({ ...x, text: fit(x.text, s.lines.length > 1 ? 160 : 300) }));
      const cream = [0.961, 0.937, 0.902];
      Ls.para([{ text: s.title, font: F.serifB, size: s.kind === "title" ? 44 : 34, color: cream }], { size: s.kind === "title" ? 44 : 34, lead: (s.kind === "title" ? 44 : 34) * 1.15, gap: 18 });
      for (const x of s.lines) Ls.para([{ text: x.text, font: x.cite ? F.serifI : F.serif, size: 24, color: cream }], { size: 24, lead: 32, gap: 4 });
      for (const x of s.lines.filter(x => x.cite)) Ls.para([{ text: x.cite, font: F.sansM, size: 14, color: [0.949, 0.757, 0.306] }], { size: 14, gap: 10 });
      pg.drawText("ereunia.com", { x: W - 60 - F.sans.widthOfTextAtSize("ereunia.com", 10), y: 28, size: 10, font: F.sans, color: rgb([0.6, 0.56, 0.5]) });
    }
    return pdf.save();
  }
  L.finish();
  return pdf.save();
}
function slideData(p, g) {
  if (!p.manuscript.length) return outlineSlides(p, sermonName(p)).map(s => ({ kind: s.kind, title: s.title, lines: s.kind === "title" ? [{ text: s.body || g.title }] : s.scripture.map(x => ({ text: x.text, cite: x.cite })) }));
  const out = [{ kind: "title", title: sermonName(p), lines: [{ text: p.idea || g.title }] }];
  for (const sec of sections(p.manuscript)) { if (!sec.head) continue; const sc = sec.blocks.filter(b => b.type === "scripture").slice(0, 2); out.push({ kind: "point", title: stripBlanks(sec.head.text), lines: sc.map(b => ({ text: b.text.length > 260 ? b.text.slice(0, 257) + "…" : b.text, cite: b.cite })) }); }
  return out;
}
const defaultQs = g => [...C.OBSERVE.slice(0, 3), ...C.interpretQuestions(C.groupOf(g.book)).slice(0, 2), ...C.APPLY.slice(0, 3)];
function storyFor(g) {
  return C.KID_STORIES.find(s => { const refs = [s.ref, ...s.scenes.map(x => x[1])].map(C.fromOsis).filter(r => r && r.book === g.book); if (!refs.length) return false; const lo = Math.min(...refs.map(r => r.chapter)), hi = Math.max(...refs.map(r => r.chapter)); return g.chapter >= lo && g.chapter <= hi; }) || null;
}

/* ---------- Word document from the manuscript ---------- */
function docxBlocks(p, g, t, { cues = false } = {}) {
  const out = [{ type: "title", text: sermonName(p) }, { type: "subtitle", text: [p.name ? g.title : "", p.date ? A.fmtDate(p.date) : "", C.META[t].name].filter(Boolean).join(" · ") }];
  if (p.idea) out.push({ type: "h2", text: p.idea });
  if (!p.manuscript.length) return null;
  let n = 0;
  for (const b of p.manuscript) {
    const text = stripBlanks(b.text);
    if (b.type === "heading") out.push({ type: "h1", text: `${++n}. ${text}` });
    else if (b.type === "scripture" || b.type === "quote") { out.push({ type: "quote", text }); if (b.cite) out.push({ type: "cite", text: b.cite }); }
    else if (b.type === "cue") { if (cues) out.push({ type: "cite", text: `Cue: ${text}` }); }
    else if (b.type === "concl") { out.push({ type: "h1", text: "Conclusion" }); out.push({ type: "p", text }); }
    else { out.push({ type: "p", text }); if (b.cite) out.push({ type: "cite", text: b.cite }); }
  }
  const src = [...new Set(p.manuscript.map(b => b.cite).filter(Boolean))];
  if (src.length) { out.push({ type: "h2", text: "Sources" }); src.forEach(s => out.push({ type: "bullet", text: s })); }
  out.push({ type: "cite", text: `Prepared with Ereunia (ereunia.com). Scripture: ${C.META[t].name}, ${C.META[t].licence}.` });
  return out;
}

/* ---------- the Documents tab ---------- */
let previewUrl = null;
export async function docsTab(api, g, body) {
  A = api; C = api.C; esc = api.esc;
  const p = A.loadPrep(g), st = C.store, t = A.translation();
  const o = { paper: st.setting("pdfPaper", (navigator.language || "").match(/-(US|CA|MX|PH)$/) ? "Letter" : "A4"), t, cues: true, cuesMs: false, studyNotes: true, blanks: false, answers: true, passageText: true };
  let kind = st.setting("pdfKind", "manuscript");
  body.innerHTML = `<div class="docs">
    <section class="docpick"><h2>Choose a document</h2><div class="tplgrid" role="radiogroup" aria-label="Document">${TEMPLATES.map(([k, l, d]) => `<label class="tpl"><input type="radio" name="tpl" value="${k}" ${k === kind ? "checked" : ""}><b>${esc(l)}</b><span>${esc(d)}</span></label>`).join("")}</div>
      <div class="docopts" id="dopts"></div>
      <div class="actions"><button class="btn pri" type="button" id="dmake">Make the PDF</button><button class="btn" type="button" id="ddocx">Word document of the manuscript</button><span class="small" id="dstat" aria-live="polite"></span></div></section>
    <section class="docprev" id="dprev"><p class="small">Choose a document and make it to see the actual PDF here before you download it.</p></section>
    <section class="svcpack"><h2>Service pack</h2><p class="small">Everything for Sunday in one download: the documents you tick, slides for the screen (PDF, 16:9) and a service brief for the team. Private study notes and delivery cues are left out of everything except the pulpit copy.</p>
      <div class="actions">${[...TEMPLATES.map(([k, l]) => [k, l]), ["slides", "Slides (16:9 PDF)"], ["brief", "Service brief"]].map(([k, l]) => `<label class="chk"><input type="checkbox" data-pack="${k}" ${["pulpit", "handout", "slides", "brief"].includes(k) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div>
      <div class="actions"><button class="btn pri" type="button" id="dpack">Download the service pack (.zip)</button><span class="small" id="pstat" aria-live="polite"></span></div></section></div>`;
  const $ = id => document.getElementById(id);
  const opts = () => {
    const box = $("dopts"), q = A.loadPrep(g);
    box.innerHTML = `<label><span>Paper</span><select id="opaper">${Object.keys(PAPER).map(k => `<option ${k === o.paper ? "selected" : ""} value="${k}">${k === "A4" ? "A4" : "US Letter"}</option>`).join("")}</select></label>
      <label><span>Translation</span><select id="otr">${C.translationOptions(o.t)}</select></label>
      ${kind === "pulpit" ? `<label class="chk"><input type="checkbox" id="ocues" ${o.cues ? "checked" : ""}> Include my delivery cues (private)</label>` : ""}
      ${kind === "manuscript" ? `<label class="chk"><input type="checkbox" id="ocuesm" ${o.cuesMs ? "checked" : ""}> Include my delivery cues (private)</label>` : ""}
      ${kind === "dossier" ? `<label class="chk"><input type="checkbox" id="osn" ${o.studyNotes ? "checked" : ""}> Include my study notes (private)</label>` : ""}
      ${kind === "handout" ? `<label class="chk"><input type="checkbox" id="obl" ${o.blanks ? "checked" : ""}> Fill-in blanks in the points</label><label class="chk"><input type="checkbox" id="oans" ${o.answers ? "checked" : ""}> Print the answers small at the end</label><label class="chk"><input type="checkbox" id="opt" ${o.passageText ? "checked" : ""}> Print the passage</label><p class="small">For a blank, put the word in square brackets in a point heading, e.g. “The Word became [flesh]”. Otherwise the longest word is blanked.</p>` : ""}
      ${kind === "group" ? `<label class="wide"><span>Discussion questions, one per line (leave empty for the suggested ones)</span><textarea id="oqs" rows="6">${esc((q.groupQs.length ? q.groupQs : defaultQs(g)).join("\n"))}</textarea></label>` : ""}
      ${kind === "family" && o.t === "kjv" ? `<p class="small">The family sheet uses the World English Bible, which reads more easily at home.</p>` : ""}
      <p class="small">${kind === "pulpit" || kind === "dossier" || kind === "manuscript" ? "For you: private material appears only if you tick it." : "For others: private notes and delivery cues are never included."}</p>`;
    $("opaper").addEventListener("change", e => { o.paper = e.target.value; st.setSetting("pdfPaper", o.paper); });
    $("otr").addEventListener("change", e => { o.t = e.target.value; opts(); });
    $("ocues")?.addEventListener("change", e => { o.cues = e.target.checked; }); $("ocuesm")?.addEventListener("change", e => { o.cuesMs = e.target.checked; });
    $("osn")?.addEventListener("change", e => { o.studyNotes = e.target.checked; }); $("obl")?.addEventListener("change", e => { o.blanks = e.target.checked; });
    $("oans")?.addEventListener("change", e => { o.answers = e.target.checked; }); $("opt")?.addEventListener("change", e => { o.passageText = e.target.checked; });
    $("oqs")?.addEventListener("change", e => { const q2 = A.loadPrep(g); const lines = e.target.value.split("\n").map(x => x.trim()).filter(Boolean); q2.groupQs = JSON.stringify(lines) === JSON.stringify(defaultQs(g)) ? [] : lines.slice(0, 20); A.savePrep(q2, { now: true }); });
  };
  body.querySelectorAll('[name="tpl"]').forEach(r => r.addEventListener("change", () => { kind = r.value; st.setSetting("pdfKind", kind); opts(); }));
  opts();
  const fileName = k => `${A.slug(sermonName(A.loadPrep(g)))}-${k}.pdf`;
  $("dmake").addEventListener("click", async () => {
    const stat = $("dstat"); stat.textContent = "Making the PDF…"; A.flush();
    try {
      const bytes = await build(kind, g, o); const blob = new Blob([bytes], { type: "application/pdf" });
      if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(blob);
      const pages = new TextDecoder("latin1").decode(bytes.slice(0, 4000)).match(/\/Count (\d+)/)?.[1];
      $("dprev").innerHTML = `<div class="actions"><a class="btn pri" href="${previewUrl}" download="${esc(fileName(kind))}">Download the PDF</a><a class="btn" href="${previewUrl}" target="_blank" rel="noopener">Open in a new tab</a><span class="small">${esc(TNAME[kind])} · ${o.paper === "A4" ? "A4" : "US Letter"} · ${(bytes.length / 1024).toFixed(0)} KB</span></div>
        <iframe class="pdfframe" src="${previewUrl}#view=FitH" title="Preview of the ${esc(TNAME[kind])} PDF"></iframe><p class="small">If the preview stays blank (some phones cannot show PDFs inside a page), use “Open in a new tab”.</p>`;
      stat.textContent = "Ready.";
    } catch (e) { console.error(e); stat.textContent = `The PDF could not be made: ${e.message || e}. Check your connection; the fonts load the first time.`; }
  });
  $("ddocx").addEventListener("click", async () => {
    A.flush(); const q = A.loadPrep(g), blocks = docxBlocks(q, g, o.t, { cues: o.cuesMs });
    if (!blocks) return C.toast("Write the manuscript first, in the Write tab");
    A.download(`${A.slug(sermonName(q))}-manuscript.docx`, buildDocx(blocks, { title: sermonName(q) }), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
  $("dpack").addEventListener("click", async () => {
    const pick = [...body.querySelectorAll("[data-pack]:checked")].map(x => x.dataset.pack); if (!pick.length) return C.toast("Tick at least one document");
    const stat = $("pstat"); A.flush();
    try {
      const files = [];
      for (const [i, k] of pick.entries()) { stat.textContent = `Making ${i + 1} of ${pick.length}…`; files.push({ name: fileName(k), data: new Uint8Array(await build(k, g, { ...o, cues: k === "pulpit" ? o.cues : false, cuesMs: false, studyNotes: false })) }); }
      const q = A.loadPrep(g);
      files.push({ name: "README.txt", data: `${sermonName(q)} (${g.title})\r\nService pack made with Ereunia (ereunia.com) on ${new Date().toLocaleString()}.\r\n\r\n${files.map(f => "- " + f.name).join("\r\n")}\r\n\r\nScripture: ${C.META[o.t].name}, ${C.META[o.t].licence}.\r\n` });
      A.download(`${A.slug(sermonName(q))}-service-pack.zip`, zipStore(files), "application/zip"); stat.textContent = `Downloaded ${files.length - 1} documents.`;
    } catch (e) { console.error(e); stat.textContent = `The service pack could not be made: ${e.message || e}`; }
  });
}
/** Used by tests and the service pack: make one PDF and return its bytes. */
export async function makePdf(api, g, kind, o) { A = api; C = api.C; esc = api.esc; return build(kind, g, { paper: "A4", t: api.translation(), cues: true, cuesMs: false, studyNotes: true, blanks: false, answers: true, passageText: true, ...o }); }
