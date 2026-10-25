// Builds public/data from the raw public-domain sources in raw/.
// KJV: raw/kjv.json (thiagobodruk/bible, cleaned). WEB: raw/web/*.json (TehShrike/world-english-bible).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { BOOKS, NAMES, fileId } from "../public/js/books.js";

const out = new URL("../public/data/", import.meta.url);
const raw = new URL("../raw/", import.meta.url);
const sha = s => createHash("sha256").update(s).digest("hex").slice(0, 16);
const clean = s => s.replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").trim();

export function buildWebBook(items) {
  const chapters = [], paragraphs = [];
  let pendingPara = true, joinNext = " ";
  for (const it of items) {
    if (it.type === "paragraph start" || it.type === "stanza start") { pendingPara = true; continue; }
    if (it.type === "line break") { joinNext = "\n"; continue; }
    if (it.type !== "paragraph text" && it.type !== "line text") continue;
    const c = it.chapterNumber - 1, v = it.verseNumber - 1;
    chapters[c] ??= []; paragraphs[c] ??= [];
    const prev = chapters[c][v];
    if (prev === undefined) {
      chapters[c][v] = it.value;
      if (pendingPara && !paragraphs[c].includes(v)) paragraphs[c].push(v);
    } else {
      chapters[c][v] = prev.replace(/\s+$/, "") + (joinNext === "\n" ? "\n" : " ") + it.value.replace(/^\s+/, "");
    }
    pendingPara = false; joinNext = " ";
  }
  return {
    chapters: Array.from(chapters, ch => Array.from(ch ?? [], t => clean(t ?? ""))),
    paragraphs: Array.from(paragraphs, p => p ?? [])
  };
}

function main() {
  const kjvRaw = readFileSync(new URL("kjv.json", raw), "utf8");
  const kjv = JSON.parse(kjvRaw);
  if (kjv.length !== 66) throw new Error("KJV must have 66 books");
  mkdirSync(new URL("kjv/", out), { recursive: true });
  mkdirSync(new URL("web/", out), { recursive: true });

  const books = [];
  const webHashes = [];
  kjv.forEach(([name, chs], i) => {
    if (name !== NAMES[i]) throw new Error(`KJV book ${i} is ${name}, expected ${NAMES[i]}`);
    writeFileSync(new URL(`kjv/${fileId(i)}.json`, out), JSON.stringify({ book: i, chapters: chs.map(c => c.map(clean)) }));
    const file = NAMES[i].toLowerCase().replace(/ /g, "") + ".json";
    const webRaw = readFileSync(new URL(`web/${file}`, raw), "utf8");
    webHashes.push(sha(webRaw));
    const web = buildWebBook(JSON.parse(webRaw));
    writeFileSync(new URL(`web/${fileId(i)}.json`, out), JSON.stringify({ book: i, ...web }));
    books.push({ name, osis: BOOKS[i].osis, verses: chs.map(c => c.length), webVerses: web.chapters.map(c => c.length) });
  });

  const index = {
    generated: new Date().toISOString().slice(0, 10),
    books: books.map(({ name, osis, verses }) => ({ name, osis, verses })),
    translations: [
      { id: "kjv", name: "King James Version", short: "KJV", year: "1611 (1769 text)", licence: "Public domain (Crown patent applies in the United Kingdom)", source: "thiagobodruk/bible on GitHub", url: "https://github.com/thiagobodruk/bible", checksum: sha(kjvRaw) },
      { id: "web", name: "World English Bible", short: "WEB", year: "2000, updated", licence: "Public domain", source: "eBible.org via TehShrike/world-english-bible on GitHub", url: "https://github.com/TehShrike/world-english-bible", checksum: sha(webHashes.join("")) }
    ]
  };
  writeFileSync(new URL("index.json", out), JSON.stringify(index));

  // report versification differences (kept, never silently changed)
  const diffs = [];
  books.forEach((b, i) => b.verses.forEach((n, c) => { if (b.webVerses[c] !== n) diffs.push(`${b.name} ${c + 1}: KJV ${n}, WEB ${b.webVerses[c]}`); }));
  console.log(`Built 66 books. KJV verses: ${books.reduce((a, b) => a + b.verses.reduce((x, y) => x + y, 0), 0)}`);
  console.log(`Chapters where verse counts differ: ${diffs.length}`);
  diffs.slice(0, 40).forEach(d => console.log("  " + d));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
