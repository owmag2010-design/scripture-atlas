// POST /api/ask — source-grounded research assistant.
// Retrieves Bible text, the other translation, cross references, book background and tagged people/events,
// asks the model to answer ONLY from those numbered sources in five labelled sections, then drops any
// statement that fails the citation check (public/js/ai-core.js). Model access: Netlify AI Gateway.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BOOKS, NAMES, fileId } from "../../public/js/books.js";
import { parseReference, formatRef } from "../../public/js/ref.js";
import { searchCorpus } from "../../public/js/search.js";
import { CONTEXT } from "../../public/js/context.js";
import { DISCOVERIES } from "../../public/js/discoveries-data.js";
import { forVerse, forChapter, STATUS } from "../../public/js/discoveries.js";
import { findRefs, parseModelJson, verifyAnswer, isEmpty, SECTIONS } from "../../public/js/ai-core.js";

const MODEL = process.env.ATLAS_MODEL || "claude-sonnet-5-5";
const base = [process.cwd(), process.env.LAMBDA_TASK_ROOT || "", "/var/task"].map(b => join(b, "public/data")).find(d => d && existsSync(join(d, "index.json")));
const cache = new Map();
const J = p => { if (!cache.has(p)) cache.set(p, JSON.parse(readFileSync(join(base, p), "utf8"))); return cache.get(p); };
const index = () => J("index.json");
const chapters = i => index().books[i].verses.length;
const book = (t, i) => J(`${t}/${fileId(i)}.json`);
const unpack = n => ({ book: Math.floor(n / 1e6), chapter: Math.floor(n / 1e3) % 1e3, verse: n % 1e3 });

export function gather(question, refText) {
  const sources = [];
  const add = (type, label, text) => { const id = `S${sources.length + 1}`; sources.push({ id, type, label, text }); return id; };
  let refs = refText ? [parseReference(refText, chapters)].filter(Boolean) : [];
  if (!refs.length) refs = findRefs(question, chapters).slice(0, 3);
  for (const r of refs) {
    const k = book("kjv", r.book).chapters[r.chapter - 1], w = book("web", r.book).chapters[r.chapter - 1];
    const a = r.verse || 1, z = r.verseEnd || r.verse || Math.min(k.length, a + 11);
    const lo = r.verse ? Math.max(1, a - 2) : a, hi = r.verse ? Math.min(k.length, z + 2) : z;
    const span = (arr, from, to) => arr.slice(from - 1, to).map((t, i) => `[${from + i}] ${t || "(not in this translation's base text)"}`).join(" ");
    add("scripture", `${formatRef(r.book, r.chapter, lo, hi)} (KJV)`, span(k, lo, hi));
    add("translation", `${formatRef(r.book, r.chapter, lo, hi)} (World English Bible)`, span(w, lo, hi));
    if (r.verse) {
      const xr = (J(`xref/${fileId(r.book)}.json`)[r.book * 1e6 + r.chapter * 1e3 + r.verse] || []).slice(0, 5);
      for (const [to] of xr) { const t = unpack(to); add("scripture", `${formatRef(t.book, t.chapter, t.verse)} (KJV, cross reference)`, book("kjv", t.book).chapters[t.chapter - 1]?.[t.verse - 1] || ""); }
      const vx = J(`hist/vx/${fileId(r.book)}.json`)[r.book * 1e6 + r.chapter * 1e3 + r.verse];
      if (vx) {
        const people = new Map(J("hist/people.json").map(p => [p[0], p])), events = new Map(J("hist/events.json").map(e => [e.id, e]));
        const ps = vx[0].map(s => people.get(s)).filter(Boolean).map(p => `${p[1]}${p[3] ? " (" + p[3] + ")" : ""}`);
        const es = vx[2].map(i => events.get(i)).filter(Boolean).map(e => `${e.title}, dated ${e.year < 0 ? -e.year + " BC" : "AD " + e.year} on a traditional chronology`);
        if (ps.length || es.length) add("dataset", `People and events tagged in ${formatRef(r.book, r.chapter, r.verse)} (Theographic dataset)`, [ps.length ? "People: " + ps.join("; ") : "", es.length ? "Events: " + es.join("; ") : ""].filter(Boolean).join(". "));
      }
    }
    const bi = code => BOOKS.findIndex(b => b.osis === code);
    const found = r.verse ? forVerse(DISCOVERIES, r.book, r.chapter, r.verse, bi) : forChapter(DISCOVERIES, r.book, r.chapter, bi);
    for (const d of found.slice(0, 3)) addDiscovery(add, d);
    const c = CONTEXT[r.book];
    add("editorial", `Ereunia book background: ${NAMES[r.book]}`, `Author: ${c[0]} Date: ${c[1]}. Setting: ${c[4]} Themes: ${c[5]}.`);
  }
  // Discoveries named in the question (e.g. "What is the Tel Dan Stele?"), by name or id.
  const ql = question.toLowerCase();
  for (const d of DISCOVERIES.filter(d => ql.includes(d.name.toLowerCase()) || ql.includes(d.id.replace(/-/g, " "))).slice(0, 3)) if (!sources.some(s => s.label.includes(d.name))) addDiscovery(add, d);
  if (!refs.length) {
    const words = question.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)).slice(0, 4);
    const corpus = BOOKS.map(b => book("kjv", b.i));
    let hits = [];
    for (let n = words.length; n >= 1 && hits.length < 3; n--) hits = searchCorpus(corpus, words.slice(0, n).join(" "), { limit: 8 });
    for (const h of hits.slice(0, 8)) add("scripture", `${formatRef(h.book, h.chapter, h.verse)} (KJV)`, h.text);
  }
  return { sources, refs };
}
function addDiscovery(add, d) {
  add("archaeology", `Discovery: ${d.name} (Ereunia summary of ${d.sources.map(s => s.publisher).join("; ")}; evidence status: ${STATUS[d.status].label})`,
    `${d.description} Date: ${d.objectDate?.text || "n/a"}. Biblical connection: ${d.connection || "n/a"} What it establishes: ${d.establishes} Limits and debate: ${d.limits}`);
}
const STOP = new Set("what does about when where which with from that this have will would could should there their they them were been into than then also mean means explain tell bible verse verses passage".split(" "));

const LEVEL = { beginner: "Write for a newcomer: plain words, short sentences, no jargon.", intermediate: "Write for a regular Bible reader: clear and precise.", academic: "Write for a student of theology: precise, and name scholarly positions where the sources support it." };

function systemPrompt(level) {
  return `You are the Ereunia research assistant. Answer ONLY from the numbered SOURCES provided. ${LEVEL[level] || LEVEL.intermediate}
Return a single JSON object with exactly these keys: ${SECTIONS.map(s => `"${s[0]}" (${s[2]})`).join(", ")}.
Each key holds an array of statements: {"text": "...", "cites": ["S1", ...]}.
Rules:
- Every statement except under "uncertainty" must cite at least one source id that supports it.
- "scripture" and "translation" statements must cite Bible text sources.
- Put a direct quotation in double quotes only if it appears word for word in a cited source.
- Never invent quotations, manuscripts, scholars, publications, dates or archaeological finds. Do not cite anything that is not in SOURCES.
- Keep interpretation separate from what the text says, and name whose interpretation it is (e.g. "many Christian interpreters", "Jewish tradition", "historical-critical scholars"). Do not present a disputed view as settled.
- "archaeology" sources are summaries of documented discoveries. Use them under "evidence", say exactly what they establish, and always carry their stated limits into "uncertainty". Never say archaeology proves a biblical or theological claim.
- If the sources do not answer part of the question, say so under "uncertainty" and suggest what to read or look up.
- Do not give personal spiritual direction or claim divine authority. 2 to 4 statements per section at most; omit a section by using an empty array.
Reply with the JSON object only.`;
}

export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Send JSON with a question." }, { status: 400 }); }
  const question = String(body.question || "").trim().slice(0, 600);
  if (question.length < 5) return Response.json({ error: "Ask a question of at least a few words." }, { status: 400 });
  if (!base) return Response.json({ error: "Bible data is not available to the assistant." }, { status: 500 });
  if (!process.env.ANTHROPIC_BASE_URL && !process.env.ANTHROPIC_API_KEY) return Response.json({ error: "The AI Gateway is not active for this site yet." }, { status: 503 });

  const { sources, refs } = gather(question, body.ref);
  if (!sources.length) return Response.json({ sections: { uncertainty: [{ text: "No Bible passages matched this question. Try naming a passage, such as John 3:16, or using different words.", cites: [] }] }, sources: [], dropped: [], refs: [] });

  const client = new Anthropic();
  let reply;
  try {
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 1400, system: systemPrompt(body.level),
      messages: [{ role: "user", content: `QUESTION: ${question}\n\nSOURCES:\n${sources.map(s => `${s.id} [${s.type}] ${s.label}: ${s.text}`).join("\n")}` }]
    });
    reply = msg.content.map(c => c.text || "").join("");
  } catch (e) {
    return Response.json({ error: "The assistant could not answer just now. Try again in a minute." , detail: String(e?.status || "") }, { status: 502 });
  }
  const parsed = parseModelJson(reply);
  const { sections, dropped } = verifyAnswer(parsed, sources);
  if (isEmpty(sections)) sections.uncertainty.push({ text: "No statement passed the citation check, so nothing is shown. Try a narrower question or name a passage.", cites: [] });
  return Response.json({ sections, sources, dropped, refs: refs.map(r => formatRef(r.book, r.chapter, r.verse, r.verseEnd)), model: MODEL });
};

export const config = { path: "/api/ask", rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ["ip", "domain"] } };
