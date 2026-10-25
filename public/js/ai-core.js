// AI research assistant core: find references, check answers against their sources.
// Shared by the server function (netlify/functions/ask.mjs) and the tests. No DOM, no network.
import { parseReference } from "./ref.js";

export const SECTIONS = [
  ["scripture", "Scripture", "What the text explicitly says"],
  ["translation", "Translation", "How translations render it"],
  ["evidence", "Historical evidence", "What historical sources and data establish"],
  ["interpretation", "Interpretation", "What traditions and scholars argue"],
  ["uncertainty", "Uncertainty", "What remains debated, unknown, or outside these sources"]
];
const KEYS = SECTIONS.map(s => s[0]);

/** Find Bible references written in a question, e.g. "What does John 3:16 mean compared with 1 Jn 4:8?" */
export function findRefs(text, chapterCount) {
  const out = [], seen = new Set();
  const toks = String(text || "").replace(/[–—]/g, "-").split(/\s+/).map(t => t.replace(/^[(“"']+|[)”"',.;?!]+$/g, ""));
  toks.forEach((t, i) => {
    if (!/^\d{1,3}(:\d{1,3}(-\d{1,3})?)?$/.test(t)) return;
    for (let k = Math.min(4, i); k >= 1; k--) {
      const cand = toks.slice(i - k, i + 1).join(" ");
      if (!/[A-Za-z]/.test(toks[i - k]) && !/^[1-3]$/.test(toks[i - k])) continue;
      const r = parseReference(cand, chapterCount);
      if (r) { const key = `${r.book}.${r.chapter}.${r.verse}.${r.verseEnd}`; if (!seen.has(key)) { seen.add(key); out.push(r); } break; }
    }
  });
  return out;
}

const norm = s => String(s || "").toLowerCase().replace(/[‘’`']/g, "'").replace(/[“”"]/g, '"').replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
/** Quoted spans in a sentence: text inside straight or curly double quotes, 3+ words. */
export function quotesIn(text) {
  return [...String(text || "").matchAll(/[“"]([^”"]{8,}?)[”"]/g)].map(m => m[1]).filter(q => q.trim().split(/\s+/).length >= 3);
}

/** Pull the first JSON object out of a model reply. */
export function parseModelJson(text) {
  const s = String(text || "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

/**
 * Keep only statements that pass the citation rules:
 *  1. every statement except Uncertainty cites at least one known source id;
 *  2. Scripture and Translation statements cite a scripture or translation source;
 *  3. every quotation appears word for word in one of the cited sources.
 * Returns { sections, dropped }.
 */
export function verifyAnswer(answer, sources) {
  const byId = new Map(sources.map(s => [s.id, s]));
  const sections = Object.fromEntries(KEYS.map(k => [k, []]));
  const dropped = [];
  for (const key of KEYS) {
    for (const item of Array.isArray(answer?.[key]) ? answer[key] : []) {
      const text = String(item?.text || "").trim();
      const cites = [...new Set((Array.isArray(item?.cites) ? item.cites : []).map(String))];
      if (!text) continue;
      const known = cites.filter(c => byId.has(c));
      let reason = "";
      if (cites.length !== known.length) reason = "cites a source that does not exist";
      else if (key !== "uncertainty" && !known.length) reason = "no source cited";
      else if ((key === "scripture" || key === "translation") && !known.some(c => ["scripture", "translation"].includes(byId.get(c).type))) reason = "not tied to a Bible text";
      else {
        const pool = norm(known.map(c => byId.get(c).text).join(" "));
        const bad = quotesIn(text).find(q => !pool.includes(norm(q)));
        if (bad) reason = `quotation not found in the cited source: "${bad}"`;
      }
      if (reason) dropped.push({ section: key, text, reason });
      else sections[key].push({ text, cites: known });
    }
  }
  return { sections, dropped };
}

/** True when nothing survived verification. */
export const isEmpty = sections => KEYS.every(k => !sections[k].length);
