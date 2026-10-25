// Builds original-language, lexicon, morphology and cross-reference data into public/data.
// Sources (all CC BY): STEPBible TAHOT/TAGNT/TBESH/TBESG/TEHMC/TEGMC; OpenBible.info cross references.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { BOOKS, fileId } from "../public/js/books.js";
import { parseHebrewLine, parseGreekLine, parseLexiconLine, parseMorphLine, morphSegments, pack, parseCrossRef } from "./lang-parse.mjs";

const raw = new URL("../raw/", import.meta.url);
const out = new URL("../public/data/", import.meta.url);
const files = readdirSync(new URL("step/", raw));
const read = name => readFileSync(new URL(`step/${name}`, raw), "utf8");
const pick = prefix => files.filter(f => f.startsWith(prefix)).sort();

// ---- texts ----
const verses = new Map(); // packed ref -> [{n, word}]
let lines = 0;
const add = (p, parse) => {
  for (const line of read(p).split("\n")) {
    const r = parse(line); if (!r) continue;
    lines++;
    const k = pack(r.ref.book, r.ref.chapter, r.ref.verse);
    if (!verses.has(k)) verses.set(k, []);
    verses.get(k).push({ n: r.ref.word, w: r.word });
  }
};
["TAHOT Gen", "TAHOT Jos", "TAHOT Job", "TAHOT Isa"].forEach(p => pick(p).forEach(f => add(f, parseHebrewLine)));
["TAGNT Mat", "TAGNT Act"].forEach(p => pick(p).forEach(f => add(f, parseGreekLine)));

// ---- write chapter files ----
rmSync(new URL("orig/", out), { recursive: true, force: true });
const kjvIndex = JSON.parse(readFileSync(new URL("index.json", out), "utf8"));
const occ = new Map(); // strong -> {n, refs:Set}
const morphUsed = new Set();
let emptyVerses = [];
BOOKS.forEach(b => {
  mkdirSync(new URL(`orig/${fileId(b.i)}/`, out), { recursive: true });
  kjvIndex.books[b.i].verses.forEach((vcount, ci) => {
    const chapter = [];
    // include any extra verses the source has beyond KJV numbering
    let max = vcount;
    while (verses.has(pack(b.i, ci + 1, max + 1))) max++;
    for (let v = 1; v <= max; v++) {
      const k = pack(b.i, ci + 1, v);
      const ws = (verses.get(k) || []).sort((x, y) => x.n - y.n).map(x => x.w);
      if (!ws.length) emptyVerses.push(`${b.osis}.${ci + 1}.${v}`);
      ws.forEach(w => {
        const key = w[3];
        if (key) { if (!occ.has(key)) occ.set(key, { n: 0, refs: new Set() }); const o = occ.get(key); o.n++; o.refs.add(k); }
        morphSegments(w[5]).forEach(s => morphUsed.add(s));
      });
      chapter.push(ws);
    }
    writeFileSync(new URL(`orig/${fileId(b.i)}/${String(ci + 1).padStart(3, "0")}.json`, out),
      JSON.stringify({ book: b.i, chapter: ci + 1, lang: b.i < 39 ? "hbo" : "grc", verses: chapter }));
  });
});

// ---- lexicon shards ----
const lex = new Map();
for (const f of [...pick("TBESH"), ...pick("TBESG")]) for (const line of read(f).split("\n")) { const r = parseLexiconLine(line); if (r && !lex.has(r[0])) lex.set(r[0], r[1]); }
rmSync(new URL("lex/", out), { recursive: true, force: true });
mkdirSync(new URL("lex/", out), { recursive: true });
const shards = new Map();
let missing = [];
for (const [key, o] of occ) {
  let entry = lex.get(key) || lex.get(key.replace(/[A-Za-z]$/, "")) || lex.get(key.replace(/[A-Za-z]$/, "") + "G") || lex.get(key.replace(/[A-Za-z]$/, "") + "A");
  if (!entry) { missing.push(key); entry = { lemma: "", translit: "", pos: "", gloss: "", def: "" }; }
  const shard = key[0] + String(Math.floor(+key.slice(1, 5) / 100)).padStart(3, "0");
  if (!shards.has(shard)) shards.set(shard, {});
  shards.get(shard)[key] = { ...entry, n: o.n, refs: [...o.refs].sort((a, b) => a - b) };
}
for (const [s, obj] of shards) writeFileSync(new URL(`lex/${s}.json`, out), JSON.stringify(obj));

// ---- morphology table (codes in use only) ----
const morph = {};
for (const f of [...pick("TEHMC"), ...pick("TEGMC")]) for (const line of read(f).split("\n")) { const r = parseMorphLine(line); if (r && morphUsed.has(r[0]) && !(r[0] in morph)) morph[r[0]] = r[1]; }
writeFileSync(new URL("morph.json", out), JSON.stringify(morph));
const morphMissing = [...morphUsed].filter(c => !(c in morph));

// ---- cross references: top 15 per verse with positive votes ----
const osisIndex = new Map(BOOKS.map(b => [b.osis, b.i]));
const xr = new Map();
for (const line of readFileSync(new URL("xref/cross_references.txt", raw), "utf8").split("\n")) {
  const r = parseCrossRef(line, osisIndex); if (!r || r.votes <= 0) continue;
  if (!xr.has(r.from)) xr.set(r.from, []);
  xr.get(r.from).push([r.to, r.toEnd, r.votes]);
}
rmSync(new URL("xref/", out), { recursive: true, force: true });
mkdirSync(new URL("xref/", out), { recursive: true });
const byBook = BOOKS.map(() => ({}));
let xcount = 0;
for (const [from, list] of xr) {
  const top = list.sort((a, b) => b[2] - a[2]).slice(0, 15).map(([t, e, v]) => (t === e ? [t, v] : [t, v, e]));
  byBook[Math.floor(from / 1e6)][from] = top; xcount += top.length;
}
byBook.forEach((o, i) => writeFileSync(new URL(`xref/${fileId(i)}.json`, out), JSON.stringify(o)));

// ---- register the sources in the index ----
kjvIndex.language = {
  sources: [
    { name: "STEPBible TAHOT (Hebrew OT, Leningrad Codex with tagging)", owner: "Tyndale House, Cambridge / STEPBible.org", licence: "CC BY 4.0", url: "https://github.com/STEPBible/STEPBible-Data" },
    { name: "STEPBible TAGNT (Greek NT, amalgamated editions)", owner: "Tyndale House, Cambridge / STEPBible.org", licence: "CC BY 4.0", url: "https://github.com/STEPBible/STEPBible-Data" },
    { name: "STEPBible TBESH and TBESG lexicons", owner: "Tyndale House, Cambridge / STEPBible.org", licence: "CC BY 4.0", url: "https://github.com/STEPBible/STEPBible-Data" },
    { name: "OpenBible.info cross references", owner: "OpenBible.info", licence: "CC BY", url: "https://www.openbible.info/labs/cross-references/" }
  ],
  words: lines, lemmas: occ.size, crossRefs: xcount
};
writeFileSync(new URL("index.json", out), JSON.stringify(kjvIndex));

console.log(`words ${lines}, verses with words ${verses.size}, lemmas ${occ.size}, lexicon entries ${lex.size}`);
console.log(`lemmas without lexicon entry: ${missing.length}`, missing.slice(0, 15).join(" "));
console.log(`morph codes used ${morphUsed.size}, undescribed ${morphMissing.length}`, morphMissing.slice(0, 15).join(" "));
console.log(`KJV-numbered verses with no original words: ${emptyVerses.length}`, emptyVerses.slice(0, 20).join(" "));
console.log(`cross references kept: ${xcount}`);
