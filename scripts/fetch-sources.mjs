// Downloads every source dataset into raw/ so the whole site can be rebuilt from scratch (locally or on Netlify).
// Skips files that are already present. All sources are public domain or openly licensed; see README.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { NAMES } from "../public/js/books.js";

const raw = new URL("../raw/", import.meta.url);
const GH = "https://raw.githubusercontent.com";
const STEP = `${GH}/STEPBible/STEPBible-Data/master`;
const enc = p => p.split("/").map(encodeURIComponent).join("/");

const jobs = [
  ...["Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "Translators Amalgamated OT+NT/TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "Translators Amalgamated OT+NT/TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "Translators Amalgamated OT+NT/TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
    "Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
    "Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt",
    "Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt",
    "Morphology codes/TEHMC - Translators Expansion of Hebrew Morphology Codes - STEPBible.org CC BY.txt",
    "Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt"
  ].map(p => [`${STEP}/${enc(p)}`, `step/${p.split("/").pop()}`]),
  ...NAMES.map(n => n.toLowerCase().replace(/ /g, "")).map(f => [`${GH}/TehShrike/world-english-bible/master/json/${f}.json`, `web/${f}.json`]),
  ...["people", "places", "events", "peopleGroups", "verses"].map(f => [`${GH}/robertrouse/theographic-bible-metadata/master/json/${f}.json`, `theo/${f}.json`]),
  ...["ne_50m_land", "ne_50m_rivers_lake_centerlines", "ne_50m_lakes"].map(f => [`${GH}/nvkelso/natural-earth-vector/master/geojson/${f}.geojson`, `ne/${f}.geojson`]),
  ["https://a.openbible.info/data/cross-references.zip", "xref/cross-references.zip"],
  [`${GH}/thiagobodruk/bible/master/json/en_kjv.json`, "kjv-source.json"],
  ["https://ebible.org/Scriptures/translations.csv", "ebible/translations.csv"],
  ["https://ebible.org/Scriptures/eng-kjv2006_usfm.zip", "kjvs/kjv.zip"]
];

async function get(url, dest, tries = 3) {
  const file = new URL(dest, raw);
  if (existsSync(file)) return false;
  mkdirSync(new URL(".", file), { recursive: true });
  for (let t = 1; t <= tries; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      return true;
    } catch (e) { if (t === tries) throw new Error(`${dest}: ${e.message}`); await new Promise(r => setTimeout(r, 2000 * t)); }
  }
}
let n = 0;
for (let i = 0; i < jobs.length; i += 8) n += (await Promise.all(jobs.slice(i, i + 8).map(([u, d]) => get(u, d)))).filter(Boolean).length;

// Derived inputs: cross references unzipped; KJV compacted (drops the source's {italic} braces).
if (!existsSync(new URL("xref/cross_references.txt", raw))) execFileSync("unzip", ["-o", "-q", new URL("xref/cross-references.zip", raw).pathname, "-d", new URL("xref/", raw).pathname]);
if (!existsSync(new URL("kjvs/02-GENeng-kjv2006.usfm", raw))) execFileSync("unzip", ["-o", "-q", new URL("kjvs/kjv.zip", raw).pathname, "-d", new URL("kjvs/", raw).pathname]);
if (!existsSync(new URL("kjv.json", raw))) {
  const src = JSON.parse(readFileSync(new URL("kjv-source.json", raw), "utf8").replace(/^﻿/, ""));
  writeFileSync(new URL("kjv.json", raw), JSON.stringify(src.map(b => [b.name, b.chapters.map(ch => ch.map(v => v.replace(/\{([^}]*)\}/g, "$1")))])));
}
console.log(`fetched ${n} source files`);
