import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileId } from "../public/js/books.js";
import { morphSegments } from "../scripts/lang-parse.mjs";

const load = p => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), "utf8"));
const chap = (b, c) => load(`orig/${fileId(b)}/${String(c).padStart(3, "0")}.json`);
const index = load("index.json");
const shard = key => load(`lex/${key[0]}${String(Math.floor(+key.slice(1, 5) / 100)).padStart(3, "0")}.json`);

test("Genesis 1:1 has the seven Hebrew words of the Leningrad Codex", () => {
  const v = chap(0, 1).verses[0];
  assert.equal(v.length, 7);
  assert.equal(v[0][3], "H7225G");
  assert.equal(v[1][3], "H1254A");
  assert.equal(v[2][2], "God");
  assert.equal(chap(0, 1).lang, "hbo");
});

test("John 3:16 Greek begins οὕτως γὰρ ἠγάπησεν", () => {
  const v = chap(42, 3).verses[15];
  assert.deepEqual(v.slice(0, 3).map(w => w[0]), ["οὕτως", "γὰρ", "ἠγάπησεν"].map(s => s.normalize("NFC")));
  assert.equal(v[2][5], "V-AAI-3S");
  assert.equal(chap(42, 3).lang, "grc");
});

test("every KJV verse has original words except the two Joshua verses absent from the Leningrad Codex", () => {
  const empty = [];
  index.books.forEach((b, i) => b.verses.forEach((n, ci) => {
    const c = chap(i, ci + 1);
    for (let v = 0; v < n; v++) if (!c.verses[v]?.length) empty.push(`${b.osis}.${ci + 1}.${v + 1}`);
  }));
  assert.deepEqual(empty, ["Josh.21.36", "Josh.21.37"]);
});

test("text-critical flags: Acts 8:37 is TR-only; John 7:53 is in both, with one TR-only word form", () => {
  const a = chap(43, 8).verses[36];
  assert.ok(a.length > 0 && a.every(w => w[6] === "K"));
  assert.deepEqual(chap(42, 7).verses[52].filter(w => w[6]).map(w => w[6]), ["K"]);
});

test("lexicon entries carry gloss, definition and every occurrence", () => {
  const e = shard("H7225G").H7225G;
  assert.equal(e.lemma, "רֵאשִׁית".normalize("NFC"));
  assert.match(e.gloss, /beginning/);
  assert.ok(e.refs.includes(1001), "Genesis 1:1 listed");
  assert.ok(e.n >= e.refs.length);
  const love = shard("G0025").G0025;
  assert.equal(love.lemma, "ἀγαπάω".normalize("NFC"));
  assert.ok(love.refs.includes(42003016));
  assert.ok(!/<(script|a|img)/i.test(love.def));
});

test("morphology table describes every code in use", () => {
  const morph = load("morph.json");
  assert.match(morph.HVqp3ms, /Qal/);
  assert.match(morph["V-AAI-3S"], /Aorist/);
  const missing = new Set();
  for (const [b, c] of [[0, 1], [18, 23], [42, 3], [44, 8]]) chap(b, c).verses.flat().forEach(w => morphSegments(w[5]).forEach(s => { if (!(s in morph)) missing.add(s); }));
  assert.deepEqual([...missing], []);
});

test("cross references for Genesis 1:1 include John 1:1 and Hebrews 11:3", () => {
  const x = load("xref/01.json")["1001"];
  const targets = x.map(r => r[0]);
  assert.ok(targets.includes(57011003));
  assert.ok(targets.includes(42001001));
  assert.ok(x.length <= 15);
  for (let i = 1; i < x.length; i++) assert.ok(x[i - 1][1] >= x[i][1], "sorted by votes");
});

test("index registers language sources with licences", () => {
  assert.equal(index.language.sources.length, 4);
  index.language.sources.forEach(s => assert.match(s.licence, /CC BY/));
  assert.ok(index.language.words > 440000);
});
