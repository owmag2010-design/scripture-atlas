// Original-language helpers. Pure functions (tested in test/langui.test.mjs); no DOM.

/** Split a STEPBible morphology description into fields, keeping "(hence …)" as a note. */
export function parseMorph(desc) {
  if (!desc) return [];
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of desc) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === ";" && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map(p => {
    const m = p.trim().match(/^([^=]+)=\s*([^(]*?)\s*(?:\((.*)\))?$/);
    if (!m) return null;
    const note = m[3] ? m[3].replace(/^hence\s+/i, "").replace(/=/g, ": ") : "";
    return { k: m[1].trim(), v: m[2].trim(), note };
  }).filter(Boolean);
}

/** Morph code (e.g. "HR/Ncfsa" or "PRT-N+PRT") → [{code, fields, summary}] using the morph table. */
export function describeMorph(code, table) {
  if (!code) return [];
  let segs;
  if (code.includes("+")) segs = code.split("+");
  else if (/^[HA]/.test(code) && code.includes("/")) segs = code.split("/").map((s, i) => (i === 0 ? s : code[0] + s));
  else segs = [code];
  return segs.filter(Boolean).map(c => {
    const fields = parseMorph(table?.[c]);
    return { code: c, fields, summary: fields.map(f => f.v).filter(Boolean).join(" · ") || c };
  });
}

/** Language of a word from its morph code and book. */
export function languageOf(code, book) {
  if (book >= 39) return "Greek";
  return /^A/.test(code || "") ? "Aramaic" : "Hebrew";
}

/** "g26" / "G0026" / "h7225g" → "G0026" / "H7225G"; null if not a Strong's number. */
export function normaliseStrong(q) {
  const m = String(q || "").trim().match(/^([HhGg])0*(\d{1,4})([A-Za-z]?)$/);
  if (!m) return null;
  return m[1].toUpperCase() + m[2].padStart(4, "0") + m[3].toUpperCase();
}

/** Lexicon shard file stem for a Strong's key, e.g. "H7225G" → "H072". */
export const shardOf = key => key[0] + String(Math.floor(+key.slice(1, 5) / 100)).padStart(3, "0");

/** Display form without padding: "H7225G" → "H7225", "G0026" → "G26". */
export const displayStrong = key => (key ? key[0] + String(+key.slice(1, 5)) : "");

/** Hebrew prefix/suffix Strong's numbers (H9001–H9049) are grammatical, not lexical words. */
export const isGrammaticalStrong = key => /^H90\d\d/.test(key || "");

/** Text-critical flag → explanation. */
export const editionNote = flag =>
  flag === "K" ? "In the Textus Receptus (the Greek behind the KJV) but not in the NA28 critical text."
    : flag === "N" ? "In the NA28 critical text but not in the Textus Receptus."
      : flag === "Q" ? "Qere: the reading the Masoretes marked to be read aloud, where the written form (Ketiv) differs."
        : "";
