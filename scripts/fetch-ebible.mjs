// Downloads the selected eBible.org translations (verse-per-line zips) into raw/ebible/zips.
// Run during the Netlify build so the large translation files never need uploading.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { SELECTED } from "./build-trans.mjs";

const dir = new URL("../raw/ebible/zips/", import.meta.url);
mkdirSync(dir, { recursive: true });
const ids = Object.keys(SELECTED).filter(id => !existsSync(new URL(`${id}_vpl.zip`, dir)));
let done = 0;
async function get(id, tries = 3) {
  for (let t = 1; t <= tries; t++) {
    try {
      const r = await fetch(`https://ebible.org/Scriptures/${id}_vpl.zip`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      writeFileSync(new URL(`${id}_vpl.zip`, dir), Buffer.from(await r.arrayBuffer()));
      done++; return;
    } catch (e) { if (t === tries) throw new Error(`${id}: ${e.message}`); await new Promise(r => setTimeout(r, 2000 * t)); }
  }
}
for (let i = 0; i < ids.length; i += 6) await Promise.all(ids.slice(i, i + 6).map(id => get(id)));
console.log(`downloaded ${done} translations (${Object.keys(SELECTED).length - ids.length} already present)`);
