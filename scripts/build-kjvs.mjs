// Builds the KJV word-origin data (English word → Strong's number) from eBible.org's eng-kjv2006 USFM
// (public domain; KJV 1769 text with Strong's numbers, courtesy of the CrossWire Bible Society and eBible.org).
// Input:  raw/kjvs/*.usfm (fetched by fetch-sources.mjs)
// Output: public/data/kjvs/BB/CCC.json  { title, verses: [[ [text, strongs, flags], … ]], notes: { verse: [note] } }
//         public/data/kjvs/render/<shard>.json  { strong: { n, top: [[english, count], …] } }
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { parseUsfmBook, renderings } from "./usfm.mjs";
import { fileId } from "../public/js/books.js";
import { shardOf } from "../public/js/lang.js";

const raw = new URL("../raw/kjvs/", import.meta.url);
const out = new URL("../public/data/kjvs/", import.meta.url);
const files = readdirSync(raw).filter(f => f.endsWith(".usfm")).sort();
const num = f => +f.slice(0, 2);
const books = files.filter(f => (num(f) >= 2 && num(f) <= 40) || (num(f) >= 70 && num(f) <= 96)).map(f => parseUsfmBook(readFileSync(new URL(f, raw), "utf8").normalize("NFC")));
if (books.length !== 66) throw new Error(`expected 66 books, found ${books.length}`);

rmSync(out, { recursive: true, force: true });
let verses = 0, tagged = 0, words = 0;
books.forEach((chs, b) => {
  mkdirSync(new URL(`${fileId(b)}/`, out), { recursive: true });
  chs.forEach((c, i) => {
    writeFileSync(new URL(`${fileId(b)}/${String(i + 1).padStart(3, "0")}.json`, out), JSON.stringify({ title: c.title, verses: c.verses, notes: c.notes }));
    for (const v of c.verses) { if (v.length) verses++; for (const t of v) if (t[1]) { tagged++; words++; } else words += (t[0].match(/[A-Za-z]+/g) || []).length; }
  });
});

const shards = new Map();
for (const [s, m] of renderings(books)) {
  const list = [...m].sort((a, b) => b[1] - a[1]);
  const key = shardOf(s);
  if (!shards.has(key)) shards.set(key, {});
  shards.get(key)[s] = { n: list.reduce((a, [, c]) => a + c, 0), top: list.slice(0, 12) };
}
mkdirSync(new URL("render/", out), { recursive: true });
for (const [k, obj] of shards) writeFileSync(new URL(`render/${k}.json`, out), JSON.stringify(obj));
console.log(`KJV word origins: ${verses} verses, ${tagged.toLocaleString()} tagged words (${Math.round(tagged / words * 100)}% of words), ${[...shards.values()].reduce((a, o) => a + Object.keys(o).length, 0)} Strong's numbers`);
