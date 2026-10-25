// Sermon studio helpers: turn spoken Bible references into written ones, find them in a transcript,
// and check an AI outline against the transcript. Pure; tested in test/sermon.test.mjs.
import { findRefs } from "./ai-core.js";

const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const ORD = { first: "1", second: "2", third: "3", "1st": "1", "2nd": "2", "3rd": "3" };
const NUMBERED = "samuel|kings|chronicles|corinthians|thessalonians|timothy|peter|john";

const clean = w => w.toLowerCase().replace(/[^a-z0-9-]/g, "");
/** "one hundred and nineteen" → 119, "twenty eight" → 28; returns [value, tokensUsed] or null. */
function readNumber(toks, i) {
  let n = 0, cur = 0, used = 0, any = false;
  for (let k = i; k < toks.length; k++) {
    const w = toks[k].toLowerCase().replace(/[^a-z0-9-]/g, "");
    const parts = w.split("-");
    if (parts.length === 2 && TENS[parts[0]] != null && ONES[parts[1]] != null) { cur += TENS[parts[0]] + ONES[parts[1]]; used++; any = true; continue; }
    if (ONES[w] != null) { if (cur % 10 || (cur >= 10 && cur < 20)) break; cur += ONES[w]; used++; any = true; continue; }
    if (TENS[w] != null) { if (cur % 100) break; cur += TENS[w]; used++; any = true; continue; }
    if (w === "hundred" && any) { cur = (cur || 1) * 100; used++; continue; }
    if (w === "and" && any && cur >= 100 && k + 1 < toks.length && (ONES[clean(toks[k + 1])] != null || TENS[clean(toks[k + 1])] != null || TENS[clean(toks[k + 1]).split("-")[0]] != null)) { used++; continue; }
    break;
  }
  n += cur;
  return any ? [n, used] : null;
}

/** Convert spoken references to written ones: "first Corinthians chapter thirteen verse four" → "1 Corinthians 13:4". */
export function normaliseSpoken(text) {
  const toks = String(text || "").split(/(\s+)/);
  // number words → digits (only the word tokens; whitespace tokens are kept)
  const words = [], out = [];
  for (let i = 0; i < toks.length; i++) if (!/^\s+$/.test(toks[i]) && toks[i]) words.push(toks[i]);
  for (let i = 0; i < words.length; i++) {
    const r = readNumber(words, i);
    if (r) {
      const trail = words[i + r[1] - 1].match(/[.,;:!?]+$/)?.[0] || "";
      out.push(String(r[0]) + trail); i += r[1] - 1;
    } else out.push(words[i]);
  }
  let s = out.join(" ");
  s = s.replace(new RegExp(`\\b(first|second|third|1st|2nd|3rd)\\s+(${NUMBERED})\\b`, "gi"), (_, o, b) => `${ORD[o.toLowerCase()]} ${b}`);
  s = s.replace(/\bchapter\s+(\d+)[,]?\s+(?:and\s+)?verses?\s+(\d+)(?:\s*(?:to|through|-|–)\s*(\d+))?/gi, (_, c, v, e) => `${c}:${v}${e ? "-" + e : ""}`);
  s = s.replace(/\bchapter\s+(\d+)/gi, "$1");
  s = s.replace(/\b([1-3]?\s?[A-Z][a-z]+)\s+(\d{1,3})[,]?\s+verses?\s+(\d{1,3})(?:\s*(?:to|through|-)\s*(\d{1,3}))?/g, (m, b, c, v, e) => `${b} ${c}:${v}${e ? "-" + e : ""}`);
  return s;
}

/** Bible references in a spoken or written transcript, in order of first mention. */
export const sermonRefs = (text, chapterCount) => findRefs(normaliseSpoken(text), chapterCount);

const norm = s => String(s || "").toLowerCase().replace(/[‘’`']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Check an AI outline against the transcript. Quotes must appear word for word in the transcript;
 * scripture references must be real references. Returns { outline, dropped }.
 */
export function checkOutline(o, transcript, isRealRef) {
  const t = norm(transcript), dropped = [];
  if (!o || typeof o !== "object") return { outline: null, dropped: ["The outline could not be read."] };
  const keepQuote = q => { if (!q) return ""; if (t.includes(norm(q))) return q; dropped.push(`Quote not found in the transcript: “${q}”`); return ""; };
  const points = (Array.isArray(o.points) ? o.points : []).slice(0, 8).map(p => ({ heading: String(p?.heading || "").slice(0, 140), summary: String(p?.summary || "").slice(0, 600), quote: keepQuote(String(p?.quote || "")) })).filter(p => p.heading);
  const scriptures = (Array.isArray(o.scriptures) ? o.scriptures : []).map(String).filter(r => { const ok = isRealRef(r); if (!ok) dropped.push(`Not a valid Bible reference: ${r}`); return ok; });
  const list = k => (Array.isArray(o[k]) ? o[k] : []).map(String).filter(Boolean).slice(0, 8);
  return { outline: { title: String(o.title || "Sermon notes").slice(0, 120), bigIdea: String(o.bigIdea || "").slice(0, 300), summary: String(o.summary || "").slice(0, 1200), points, scriptures, questions: list("questions"), application: list("application") }, dropped };
}

/** Markdown export of a sermon. */
export function sermonMarkdown(s) {
  const o = s.outline;
  return `# ${s.title || o?.title || "Sermon"}
${[s.speaker, s.date].filter(Boolean).join(", ")}

${o ? `> AI-generated outline from the transcript below. Check it against the recording.

**Big idea:** ${o.bigIdea}

${o.summary}

## Points
${o.points.map((p, i) => `${i + 1}. **${p.heading}**: ${p.summary}${p.quote ? `\n   > “${p.quote}”` : ""}`).join("\n")}

## Discussion questions
${o.questions.map(q => `- ${q}`).join("\n")}

## Application
${o.application.map(q => `- ${q}`).join("\n")}
` : ""}
## Scriptures mentioned
${(s.refs || []).map(r => `- ${r}`).join("\n") || "None found."}

## Transcript
${s.transcript}
`;
}
