// Builds the multi-language Bible library from eBible.org verse-per-line downloads (raw/ebible/zips).
// Only complete Bibles whose licence allows redistribution, including commercial use, are included:
// public domain, CC BY 4.0, CC BY-SA 4.0, and CC BY-ND 4.0 (text shown unchanged). Each licence was read
// from the translation's own copyright page on eBible.org (checked 2026-10-25).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileId } from "../public/js/books.js";

export const EBIBLE_BOOKS = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SOL ISA JER LAM EZE DAN HOS JOE AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL MAT MAR LUK JOH ACT ROM 1CO 2CO GAL EPH PHI COL 1TH 2TH 1TI 2TI TIT PHM HEB JAM 1PE 2PE 1JO 2JO 3JO JUD REV".split(" ");
const CODE = new Map(EBIBLE_BOOKS.map((c, i) => [c, i]));

/** Parse eBible VPL text into 66 books of chapters of verses (each translation keeps its own numbering). */
export function parseVpl(text) {
  const books = EBIBLE_BOOKS.map(() => []);
  let other = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([1-3]?[A-Z]{2,3}) (\d+):(\d+) ?(.*)$/);
    if (!m) continue;
    if (!CODE.has(m[1])) { other++; continue; }
    const b = CODE.get(m[1]), c = +m[2] - 1, v = +m[3] - 1;
    books[b][c] ??= [];
    const t = m[4].replace(/\s+/g, " ").trim();
    books[b][c][v] = books[b][c][v] ? books[b][c][v] + " " + t : t;
  }
  return { books: books.map(chs => Array.from(chs, ch => Array.from(ch ?? [], v => v ?? ""))), other };
}

export const LICENCES = {
  pd: "Public domain",
  "by-sa": "CC BY-SA 4.0",
  by: "CC BY 4.0",
  "by-nd": "CC BY-ND 4.0 (text shown unchanged)"
};

// id → licence key (verified) and numbering note where it differs from English Bibles.
export const SELECTED = {
  "eng-asv": "pd", engylt: "pd", engDBY: "pd", engDRA: "pd", enggnv: "pd", engBBE: "pd", engbsb: "pd", "eng-rv": "pd", engwebster: "pd",
  "arb-vd": "pd", "cmn-cu89s": "pd", "cmn-cu89t": "pd", ces1613: "pd", deu1912: "pd", deuelo: "pd", fraLSG: "pd", fra_fob: "pd", hat: "pd", heb: "pd",
  hrv: "pd", ita1927: "pd", ita1885: "pd", kor: "pd", latVUC: "pd", myajvb: "pd", nld: "pd", pesOPV: "pd", russyn: "pd", spaRV1909: "pd", srp1865: "pd",
  ukr1871: "pd", vie1934: "pd", epo: "pd", porbrbsl: "pd", jpnm: "pd", thafb: "pd",
  hin2017: "by-sa", benirv: "by-sa", tam2017: "by-sa", tel2017: "by-sa", mal: "by-sa", urd: "by-sa", swhulb: "by-sa", swhonen: "by-sa", tglulb: "by-sa",
  nde: "by-sa", nya: "by-sa", hausa: "by-sa", ibo: "by-sa", porbr2018: "by", polubg: "by-nd", turytc: "by-nd"
};
export const NUMBERING = {
  latVUC: "Psalms and some other chapters follow the Latin (Vulgate) numbering, which differs from English Bibles; most Psalms are one number lower.",
  engDRA: "Psalms follow the Latin (Vulgate) numbering, which differs from most English Bibles; most Psalms are one number lower.",
  heb: "Psalm titles are counted as verse 1, as in Hebrew Bibles, so verse numbers in many Psalms run one ahead of English Bibles.",
  russyn: "Psalms follow the Greek (Septuagint) numbering used in Russian Bibles; most are one number lower than English Bibles."
};

function csvRows() {
  const text = readFileSync(new URL("../raw/ebible/translations.csv", import.meta.url), "utf8").replace(/^﻿/, "");
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur.replace(/\r$/, "")); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift();
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

function main() {
  const meta = new Map(csvRows().map(r => [r.translationId, r]));
  const out = new URL("../public/data/bible/", import.meta.url);
  rmSync(out, { recursive: true, force: true });
  const catalogue = [];
  for (const [id, lic] of Object.entries(SELECTED)) {
    const m = meta.get(id); if (!m) throw new Error(`No catalogue row for ${id}`);
    const zip = new URL(`../raw/ebible/zips/${id}_vpl.zip`, import.meta.url).pathname;
    const text = execFileSync("unzip", ["-p", zip, `${id}_vpl.txt`], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8").normalize("NFC");
    const { books, other } = parseVpl(text);
    mkdirSync(new URL(`${id}/`, out), { recursive: true });
    // gzip-compressed JSON (".bin" so no server adds its own encoding); the browser inflates it with DecompressionStream.
    books.forEach((chs, i) => writeFileSync(new URL(`${id}/${fileId(i)}.bin`, out), gzipSync(JSON.stringify({ book: i, chapters: chs }), { level: 9 })));
    const verses = books.reduce((n, b) => n + b.reduce((x, c) => x + c.filter(Boolean).length, 0), 0);
    catalogue.push({
      id, name: m.shortTitle || m.title, title: m.title, language: m.languageName, languageEn: m.languageNameInEnglish, code: m.languageCode,
      dir: m.textDirection === "rtl" ? "rtl" : "ltr", script: m.script, licence: LICENCES[lic], licenceKey: lic, copyright: m.Copyright,
      source: `https://ebible.org/${id}/`, details: m.publicationURL || "", description: m.description, numbering: NUMBERING[id] || "",
      verses, extraBooks: other ? "Deuterocanonical books are in this edition but not yet shown here." : ""
    });
    console.log(`${id.padEnd(10)} ${verses} verses${other ? `, ${other} deuterocanon lines skipped` : ""}`);
  }
  writeFileSync(new URL("../public/data/bible/catalogue.json", import.meta.url), JSON.stringify(catalogue));
  console.log(`translations: ${catalogue.length}, languages: ${new Set(catalogue.map(c => c.languageEn)).size}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
