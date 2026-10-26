// Builds public/data/research/words.json: a compact list of every Hebrew, Aramaic and Greek dictionary word,
// so search can match lemmas and transliterations (e.g. "logos", "λόγος", "chesed") exactly.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
const dir = new URL("../public/data/lex/", import.meta.url);
const out = [];
for (const f of readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
  const shard = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  for (const [k, e] of Object.entries(shard)) out.push([k, e.lemma || "", (e.translit || "").replace(/\./g, ""), (e.gloss || "").slice(0, 60), e.n || 0]);
}
mkdirSync(new URL("../public/data/research/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/research/words.json", import.meta.url), JSON.stringify(out));
console.log(`word index: ${out.length} entries`);
