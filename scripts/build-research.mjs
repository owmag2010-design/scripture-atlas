// Builds the English → Hebrew/Greek index for topic research, from the STEPBible-tagged text in public/data/orig
// and the lexicon in public/data/lex (run after build-lang). Output: public/data/research/en/<letter>.json
// Each entry: stem → [[strong, timesTranslatedThisWay, lemma, translit, gloss, totalOccurrences, partOfSpeech], …]
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { buildEnglishIndex, topStrongs } from "../public/js/research.js";

const data = new URL("../public/data/", import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, data), "utf8"));

function* words() {
  for (const b of readdirSync(new URL("orig/", data)).sort())
    for (const c of readdirSync(new URL(`orig/${b}/`, data)).sort())
      for (const v of read(`orig/${b}/${c}`).verses) yield* v || [];
}

const lex = new Map();
for (const f of readdirSync(new URL("lex/", data))) if (/^[HG]\d{3}\.json$/.test(f)) for (const [k, e] of Object.entries(read(`lex/${f}`))) lex.set(k, e);

const idx = buildEnglishIndex(words());
const shards = new Map();
let kept = 0;
for (const [s, counts] of idx) {
  const top = topStrongs(counts).filter(([k]) => lex.has(k));
  if (!top.length) continue;
  const key = s[0];
  if (!shards.has(key)) shards.set(key, {});
  shards.get(key)[s] = top.map(([k, n]) => { const e = lex.get(k); return [k, n, e.lemma, e.translit.replace(/\./g, ""), e.gloss, e.n, e.pos || ""]; });
  kept++;
}
const out = new URL("research/en/", data);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [k, obj] of shards) writeFileSync(new URL(`${k}.json`, out), JSON.stringify(obj));
console.log(`research index: ${kept} English stems → original words, ${shards.size} shards`);
