// Builds the commentary shelf from public-domain SWORD commentary modules (CrossWire Bible Society).
// Input: raw/comm/<module>/ (unzipped module). Output: public/data/comm/<id>/<BB>/<CCC>.json, one file per chapter,
// plus 000.json for a book introduction and public/data/comm/index.json describing every commentary.
// The SWORD zText/zCom format: a verse index (.?zv) points to a zlib block (.?zs → .?zz) and a slice inside it.
// Output HTML is rebuilt from a small whitelist (p, h4, i, b, br, a to a Bible reference), so no source markup reaches the page.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { BOOKS } from "../public/js/books.js";
import { findBook } from "../public/js/ref.js";

export const COMMENTARIES = [
  { id: "mhcc", sword: "zcom/mhcc", rec: 10, ext: "b", markup: "osis", name: "Matthew Henry's Concise Commentary", author: "Matthew Henry", date: "1706–1721 (abridged)", tradition: "English Nonconformist (Presbyterian)", scope: "Whole Bible" },
  { id: "mhc", sword: "zcom4/mhc", rec: 12, ext: "b", markup: "osis", name: "Matthew Henry's Complete Commentary", author: "Matthew Henry, completed by his colleagues", date: "1706–1721", tradition: "English Nonconformist (Presbyterian)", scope: "Whole Bible" },
  { id: "jfb", sword: "zcom/jfb", rec: 12, ext: "b", markup: "osis", name: "Commentary Critical and Explanatory", author: "Robert Jamieson, A. R. Fausset and David Brown", date: "1871", tradition: "Scottish and Irish Protestant", scope: "Whole Bible" },
  { id: "barnes", sword: "zcom/barnes", rec: 10, ext: "c", markup: "thml", name: "Notes on the New Testament", author: "Albert Barnes", date: "19th century", tradition: "American Presbyterian", scope: "New Testament" },
  { id: "clarke", sword: "zcom/clarke", rec: 10, ext: "b", markup: "osis", name: "Commentary and Critical Notes", author: "Adam Clarke", date: "1810–1826", tradition: "British Methodist", scope: "Whole Bible" },
  { id: "kd", sword: "zcom4/kd", rec: 12, ext: "b", markup: "osis", name: "Biblical Commentary on the Old Testament", author: "C. F. Keil and F. Delitzsch", date: "19th century (English translation of the German)", tradition: "German Lutheran", scope: "Old Testament" },
  { id: "tdavid", sword: "zcom/tdavid", rec: 12, ext: "b", markup: "osis", name: "The Treasury of David", author: "C. H. Spurgeon", date: "1869–1885", tradition: "English Baptist", scope: "Psalms" }
];

const RAW = new URL("../raw/comm/", import.meta.url);
const OUT = new URL("../public/data/comm/", import.meta.url);
const V11N = JSON.parse(readFileSync(new URL("./kjv-versification.json", import.meta.url), "utf8")); // [[osis, [verses per chapter]], …] in KJV order

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const decode = s => s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
  e = e.toLowerCase();
  if (e === "amp") return "&"; if (e === "lt") return "<"; if (e === "gt") return ">"; if (e === "quot") return '"'; if (e === "apos") return "'"; if (e === "nbsp") return " ";
  const n = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return Number.isFinite(n) ? String.fromCodePoint(n) : "";
});
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i")) || [])[1] || "";

// Resolves a reference to { osis, c, v }. The visible text wins when it is a bare verse ("10") or chapter:verse ("3:16")
// following an earlier reference, because some modules mis-tag those continuations.
function parseSpec(spec) {
  const first = decode(spec).split(/[;,]/)[0].split(/-(?=[A-Za-z1-3])/)[0].trim();
  let m = first.match(/^([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?/) || first.match(/^([1-3]?\s?[A-Za-z]+)\.?\s+(\d+)(?::(\d+))?/);
  if (!m) return null;
  const b = findBook(m[1]);
  return b < 0 ? null : { osis: BOOKS[b].osis, c: +m[2], v: m[3] ? +m[3] : null };
}
function resolveRef(text, spec, last) {
  let m;
  if (last && (m = text.match(/^(\d+)(?:[-–]\d+)?$/))) return last.v ? { osis: last.osis, c: last.c, v: +m[1] } : { osis: last.osis, c: +m[1], v: null };
  if (last && (m = text.match(/^(\d+):(\d+)/))) return { osis: last.osis, c: +m[1], v: +m[2] };
  return parseSpec(spec) || parseSpec(text);
}

// Converts one entry to safe HTML. Returns { intro, body } (intro = a pre-verse introduction, if marked).
function toHtml(src, markup) {
  let out = "", intro = null, skip = 0, inLink = false, linkAt = 0, linkSpec = "", lastRef = null;
  const openLink = spec => { inLink = true; linkAt = out.length; linkSpec = spec; };
  const closeLink = () => {
    if (!inLink) return; inLink = false;
    const text = decode(out.slice(linkAt).replace(/<[^>]+>/g, "")).trim();
    const h = resolveRef(text, linkSpec, lastRef);
    if (!h) return;
    lastRef = h;
    out = out.slice(0, linkAt) + `<a href="/read/kjv/${h.osis}.${h.c}${h.v ? "." + h.v : ""}">` + out.slice(linkAt) + "</a>";
  };
  const parts = src.split(/(<[^>]+>)/);
  for (const p of parts) {
    if (!p) continue;
    if (p[0] !== "<") { if (!skip) out += esc(decode(p)); continue; }
    const tag = p.toLowerCase(), name = (tag.match(/^<\/?\s*([a-z0-9:]+)/) || [])[1] || "", close = tag.startsWith("</"), self = tag.endsWith("/>");
    if (name === "note") { if (!self) skip += close ? -1 : 1; if (skip < 0) skip = 0; continue; }
    if (skip) continue;
    if (markup === "osis") {
      if (name === "div" && /x-milestone/.test(tag) && /x-preverse/.test(tag)) {
        if (/\beid=/.test(tag) && intro === null) { intro = out; out = ""; }
        continue;
      }
      if (name === "div" && /\bsid=/.test(tag)) { out += "\n\n"; continue; }
      if (name === "div" || name === "p") { if (!close && !self) out += "\n\n"; continue; }
      if (name === "lb") { out += "<br>"; continue; }
      if (name === "title") { out += close ? "</h4>\n\n" : "\n\n<h4>"; continue; }
      if (name === "hi") {
        const t = attr(p, "type");
        if (close) { out += "</span>"; continue; } // closed generically below
        out += t === "italic" ? "<i>" : t === "bold" ? "<b>" : "<span>";
        continue;
      }
      if (name === "reference") { if (close) closeLink(); else openLink(attr(p, "osisRef")); continue; }
    } else { // ThML
      if (name === "p" || name === "div") { if (!close && !self) out += "\n\n"; continue; }
      if (name === "br") { out += "<br>"; continue; }
      if (/^h[1-6]$/.test(name)) { out += close ? "</h4>\n\n" : "\n\n<h4>"; continue; }
      if (name === "i" || name === "em") { out += close ? "</i>" : "<i>"; continue; }
      if (name === "b" || name === "strong") { out += close ? "</b>" : "<b>"; continue; }
      if (name === "scripref") { if (close) closeLink(); else openLink(attr(p, "passage")); continue; }
    }
    // everything else: keep the text, drop the tag
  }
  return { intro: intro === null ? null : tidy(intro), body: tidy(out) };
}

// Balances inline tags (<span> stands for any closed <hi>), wraps paragraphs, and drops empties.
function tidy(html) {
  // resolve generic </span> closers for <i>/<b>/<span> opened by <hi>
  const stack = [];
  html = html.replace(/<(\/?)(i|b|span)>/g, (m, c, t) => {
    if (!c) { stack.push(t); return t === "span" ? "" : m; }
    const open = stack.pop();
    return !open || open === "span" ? "" : `</${open}>`;
  });
  while (stack.length) { const t = stack.pop(); if (t !== "span") html += `</${t}>`; }
  const blocks = html.split(/\n{2,}/).map(s => s.replace(/\s+/g, " ").trim()).filter(s => s && s !== "<br>");
  return blocks.map(s => {
    if (s.startsWith("<h4>")) { const t = fixInline(s.replace(/<\/?h4>/g, "")); return t.replace(/<[^>]+>/g, "").trim() ? `<h4>${t}</h4>` : ""; }
    const t = fixInline(s.replace(/<\/?h4>/g, ""));
    return t.replace(/<[^>]+>/g, "").trim() ? `<p>${t}</p>` : "";
  }).join("");
}
// Keeps <i>, <b> and <a> properly nested inside one block: drops stray closers, closes what is left open.
function fixInline(s) {
  const st = [];
  s = s.replace(/<(\/?)(i|b|a)(\s[^>]*)?>/g, (m, c, t) => {
    if (!c) { st.push(t); return m; }
    if (st.at(-1) !== t) { if (!st.includes(t)) return ""; let close = ""; while (st.at(-1) !== t) close += `</${st.pop()}>`; st.pop(); return close + m; }
    st.pop(); return m;
  });
  while (st.length) s += `</${st.pop()}>`;
  return s;
}

const SAFE = /^(?:[^<]|<\/?(?:p|h4|i|b)>|<br>|<a href="\/read\/kjv\/[1-3]?[A-Za-z]+\.\d+(?:\.\d+)?">|<\/a>)*$/;

function readModule(c) {
  const dir = new URL(`modules/comments/${c.sword}/`, new URL(`${c.id}/`, RAW));
  const testaments = {};
  for (const t of ["ot", "nt"]) {
    const f = n => new URL(`${t}.${c.ext}z${n}`, dir);
    if (!existsSync(f("v")) || !existsSync(f("s"))) continue;
    testaments[t] = { v: readFileSync(f("v")), s: readFileSync(f("s")), z: readFileSync(f("z")), cache: new Map() };
  }
  const read = (t, idx) => {
    const T = testaments[t]; if (!T) return null;
    const o = idx * c.rec; if (o + c.rec > T.v.length) return null;
    const buf = T.v.readUInt32LE(o), start = T.v.readUInt32LE(o + 4), len = c.rec === 12 ? T.v.readUInt32LE(o + 8) : T.v.readUInt16LE(o + 8);
    if (!len) return { key: "", text: "" };
    if (!T.cache.has(buf)) {
      if ((buf + 1) * 12 > T.s.length) return null;
      const off = T.s.readUInt32LE(buf * 12), size = T.s.readUInt32LE(buf * 12 + 4);
      T.cache.clear();
      T.cache.set(buf, inflateSync(T.z.subarray(off, off + size)));
    }
    return { key: `${buf}:${start}:${len}`, text: T.cache.get(buf).subarray(start, start + len).toString("utf8") };
  };
  return { read, has: t => !!testaments[t] };
}

export function build() {
  if (!existsSync(RAW)) { console.log("commentaries: raw/comm missing, skipped"); return; }
  rmSync(OUT, { recursive: true, force: true });
  const index = { commentaries: [], books: {}, intros: {} };
  let files = 0, bytes = 0;
  for (const c of COMMENTARIES) {
    if (!existsSync(new URL(`${c.id}/`, RAW))) { console.log(`commentaries: ${c.id} missing, skipped`); continue; }
    const mod = readModule(c), books = [], intros = [];
    let offset = { ot: 2, nt: 2 };
    V11N.forEach(([osis, chapters], b) => {
      const t = b < 39 ? "ot" : "nt", base = offset[t];
      offset[t] += chapters.reduce((a, n) => a + n, 0) + chapters.length + 1;
      if (!mod.has(t)) return;
      const dir = new URL(`${c.id}/${String(b + 1).padStart(2, "0")}/`, OUT);
      let any = false;
      const write = (name, data) => { mkdirSync(dir, { recursive: true }); const s = JSON.stringify(data); writeFileSync(new URL(name, dir), s); files++; bytes += s.length; any = true; };
      const bookIntro = mod.read(t, base);
      if (bookIntro?.text) { const h = toHtml(bookIntro.text, c.markup); const html = (h.intro || "") + h.body; if (html) { write("000.json", { intro: check(html) }); intros.push(b); } }
      let before = 0;
      chapters.forEach((n, ci) => {
        const chapBase = base + before + ci + 1; // chapter heading
        before += n;
        const entries = [];
        let intro = null;
        const head = mod.read(t, chapBase);
        if (head?.text) { const h = toHtml(head.text, c.markup); intro = (h.intro || "") + h.body || null; }
        let last = null;
        for (let v = 1; v <= n; v++) {
          const r = mod.read(t, chapBase + v);
          if (!r || !r.text.trim()) { last = null; continue; }
          if (last && last.key === r.key) { last.entry[1] = v; continue; }
          const h = toHtml(r.text, c.markup);
          if (h.intro && v === 1) intro = (intro || "") + h.intro;
          if (!h.body) { last = null; continue; }
          // Matthew Henry's Concise opens each section with its own "Verses 1-5" line; the panel already says which verses.
          const body = c.id === "mhcc" ? h.body.replace(/^<p><b>Verses? [\d\s,–-]+<\/b><\/p>/, "") : h.body;
          const entry = [v, v, check(body)];
          entries.push(entry); last = { key: r.key, entry };
        }
        if (entries.length || intro) write(`${String(ci + 1).padStart(3, "0")}.json`, intro ? { intro: check(intro), e: entries } : { e: entries });
      });
      if (any) books.push(b);
    });
    if (books.length) { index.commentaries.push({ id: c.id, name: c.name, author: c.author, date: c.date, tradition: c.tradition, scope: c.scope, licence: "Public domain", source: "CrossWire Bible Society SWORD module" }); index.books[c.id] = books; index.intros[c.id] = intros; }
    console.log(`commentaries: ${c.id} ${books.length} books`);
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL("index.json", OUT), JSON.stringify(index));
  console.log(`commentaries: ${files} files, ${(bytes / 1048576).toFixed(1)} MB`);
}
function check(html) { if (!SAFE.test(html)) throw new Error("unsafe commentary HTML: " + html.match(/<(?!\/?(?:p|h4|i|b|a)\b|br>)[^>]*>/)?.[0]); return html; }

if (import.meta.url === `file://${process.argv[1]}`) build();
