// Extra retrieval for the research assistant (netlify/functions/ask.mjs): original-language key words for a
// verse (STEPBible text and lexicon data built by scripts/build-lang.mjs) and family data for people named in a
// question (Theographic Bible Metadata built by scripts/build-hist.mjs). Pure functions over a JSON loader
// `J(path)` relative to public/data, so the tests can run them against the local build.
import { fileId } from "../../public/js/books.js";
import { formatRef } from "../../public/js/ref.js";
import { shardOf, displayStrong, isGrammaticalStrong, languageOf } from "../../public/js/lang.js";

const unpack = n => ({ book: Math.floor(n / 1e6), chapter: Math.floor(n / 1e3) % 1e3, verse: n % 1e3 });
const tryJ = (J, p) => { try { return J(p); } catch { return null; } };

// ---- lexicon ----

// Names exactly as build-lang.mjs registers them in index.json (used only if index.json lacks them).
const FALLBACK = {
  hbo: "STEPBible TAHOT (Hebrew OT, Leningrad Codex with tagging)",
  grc: "STEPBible TAGNT (Greek NT, amalgamated editions)",
  lex: "STEPBible TBESH and TBESG lexicons",
  owner: "Tyndale House, Cambridge / STEPBible.org"
};
function sourceNames(J) {
  const list = tryJ(J, "index.json")?.language?.sources || [];
  const find = re => list.find(s => re.test(s.name));
  const lex = find(/TBESH|TBESG/);
  return { hbo: find(/TAHOT/)?.name || FALLBACK.hbo, grc: find(/TAGNT/)?.name || FALLBACK.grc, lex: lex?.name || FALLBACK.lex, owner: lex?.owner || FALLBACK.owner };
}

/** Content words only: nouns, verbs, adjectives and proper names — not articles, particles, prepositions, conjunctions. */
const CONTENT = /^(?:[GHA]:(?:N(?!eg)|V|A(?:$|[-\s/]))|N:)/;
const POS = p => (/^N:/.test(p) ? "proper name" : /^[GHA]:N/.test(p) ? "noun" : /^[GHA]:V/.test(p) ? "verb" : /^[GHA]:A/.test(p) ? "adjective" : "word");
const COMMON_VERB = 1000; // "to be", "to say", "to do" ... are rarely the key word of a verse

/** Lexicon entry for an extended Strong's key, with the same fallbacks build-lang.mjs uses. */
export function lexEntry(J, key) {
  const base = key.replace(/[A-Za-z]$/, "");
  for (const k of [key, base, base + "G", base + "A"]) {
    const e = tryJ(J, `lex/${shardOf(k)}.json`)?.[k];
    if (e && (e.lemma || e.gloss)) return { key: k, ...e };
  }
  return null;
}

/** Brief plain-text definition from a TBESH/TBESG entry (HTML removed, LXX equivalents dropped). */
export function briefDef(def, max = 220) {
  let t = String(def || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\[in LXX[^\]]*\]/g, "")
    .replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").replace(/^\s*[:;,]\s*/, "").trim();
  if (t.length > max) t = t.slice(0, t.lastIndexOf(" ", max) > 40 ? t.lastIndexOf(" ", max) : max).replace(/[\s,;:]+$/, "") + " …";
  return t;
}

/** Key original-language words of one verse: [{verse, word, translit, strong, lemma, gloss, pos, def, n, english}]. */
export function keyWords(J, book, chapter, verse) {
  const ch = tryJ(J, `orig/${fileId(book)}/${String(chapter).padStart(3, "0")}.json`);
  const words = ch?.verses?.[verse - 1] || [];
  const out = [], seen = new Set();
  for (const w of words) {
    const key = w[3];
    if (!key || isGrammaticalStrong(key) || seen.has(key)) continue;
    const e = lexEntry(J, key);
    if (!e || !CONTENT.test(e.pos || "")) continue;
    if (/^[GHA]:V/.test(e.pos) && (e.n || 0) > COMMON_VERB) continue;
    seen.add(key);
    out.push({ verse, word: String(w[0]).replace(/[,.;:·׃־]+$/u, ""), translit: w[1], english: String(w[2] || "").replace(/[<>]/g, "").replace(/[,.;:]+$/, ""), morph: w[5], strong: displayStrong(e.key), lemma: e.lemma, ltranslit: e.translit, gloss: e.gloss, pos: POS(e.pos), def: briefDef(e.def), n: e.n || 0 });
  }
  return out;
}

/**
 * A "lexicon" source for a verse reference (verses verse..verseEnd, at most `maxVerses`, at most `maxWords` words).
 * Returns {label, text} or null when the site has no original-language data for the passage.
 */
export function lexiconSource(J, ref, { maxVerses = 3, maxWords = 8 } = {}) {
  if (!ref?.verse) return null;
  const last = Math.min(ref.verseEnd || ref.verse, ref.verse + maxVerses - 1);
  const words = [];
  for (let v = ref.verse; v <= last && words.length < maxWords; v++) {
    for (const w of keyWords(J, ref.book, ref.chapter, v)) { if (words.length >= maxWords) break; if (!words.some(x => x.strong === w.strong)) words.push(w); }
  }
  if (!words.length) return null;
  const names = sourceNames(J);
  const lang = ref.book >= 39 ? "Greek" : words.some(w => languageOf(w.morph, ref.book) === "Aramaic") ? "Hebrew and Aramaic" : "Hebrew";
  const where = formatRef(ref.book, ref.chapter, ref.verse, last > ref.verse ? last : null);
  const label = `Key ${lang} words in ${where} (text: ${ref.book >= 39 ? names.grc : names.hbo}; definitions: ${names.lex}, ${names.owner})`;
  const multi = last > ref.verse;
  const text = words.map(w => `${multi ? `[${w.verse}] ` : ""}${w.word} (${w.translit}), lemma ${w.lemma} (${w.ltranslit}), Strong's ${w.strong}, ${w.pos}: gloss "${w.gloss}"; rendered here as "${w.english}"; ${w.n} occurrence${w.n === 1 ? "" : "s"} in the tagged text. Lexicon: ${w.def}`).join(" | ");
  return { label, text };
}

// ---- people ----

// Display names that are also ordinary English words or too broad to treat as a person lookup.
const NAME_STOP = new Set(["god", "lord", "baal", "satan", "devil", "holy spirit", "spirit", "word", "king"]);
// Names that are also common English words: matched only when capitalised in a mixed-case question.
const AMBIGUOUS = new Set(["lot", "ram", "hur", "ephah", "ephod", "will", "hope", "joy", "grace", "rock", "dan", "gad", "asher", "job", "mark"]);
let PEOPLE_CACHE = null;
function peopleIndex(J) {
  if (PEOPLE_CACHE?.J === J) return PEOPLE_CACHE;
  const list = J("hist/people.json"); // [slug, name, also, desc, gender, verseCount], most-mentioned first
  const bySlug = new Map(list.map(p => [p[0], p]));
  const names = [];
  list.forEach((p, rank) => {
    const full = p[1].replace(/\s*\(.*?\)\s*/g, " ").trim();
    const first = full.includes(" ") ? full.split(" ")[0] : "";
    for (const n of [full, first]) if (n && n.length >= 3 && /^[A-Z]/.test(n) && !NAME_STOP.has(n.toLowerCase())) names.push({ n, slug: p[0], rank, words: n.split(" ").length });
  });
  // Longest names first, then the most-mentioned person with that name.
  names.sort((a, b) => b.words - a.words || b.n.length - a.n.length || a.rank - b.rank);
  PEOPLE_CACHE = { J, list, bySlug, names };
  return PEOPLE_CACHE;
}

/** People named in a question (Bible references removed first, so "John 1:1" is not John the Baptist). */
export function findPeople(J, question, limit = 2) {
  const { names } = peopleIndex(J);
  let q = " " + String(question || "").replace(/[’']s\b/g, "").replace(/\b(?:[1-3]\s*)?[A-Z][a-z]+(?:\s+of\s+[A-Z][a-z]+)?\.?\s+\d+(?::\d+(?:\s*[-–]\s*\d+)?)?/g, " ") + " ";
  const lower = q === q.toLowerCase();
  const found = [];
  for (const c of names) {
    if (found.length >= limit) break;
    if (found.some(f => f.slug === c.slug) || (lower && AMBIGUOUS.has(c.n.toLowerCase()))) continue;
    const esc = c.n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`(^|[^A-Za-z])${esc}(?![A-Za-z])`, lower ? "i" : "").exec(q);
    if (!m) continue;
    found.push({ slug: c.slug, name: c.n });
    q = q.slice(0, m.index + m[1].length) + " ".repeat(c.n.length) + q.slice(m.index + m[1].length + c.n.length);
  }
  return found.map(f => f.slug);
}

export function personEntry(J, slug) {
  const s = (slug[0] || "_").toLowerCase().replace(/[^a-z]/, "_");
  return tryJ(J, `hist/people/${s}.json`)?.[slug] || null;
}

const KIN = { father: ["father"], mother: ["mother"], siblings: ["brother", "brothers", "sister", "sisters", "sibling", "siblings"], children: ["son", "sons", "daughter", "daughters", "child", "children"], partners: ["wife", "wives", "husband", "married", "spouse"] };
const yearText = y => (y == null ? "" : y < 0 ? `${-y} BC` : `AD ${y}`);

/**
 * Up to `max` verses (KJV) that best show a person's family: verses naming the person and the relatives the
 * question asks about (father and mother by default), preferring explicit kinship wording ("son of", "begat").
 */
export function keyVerses(J, person, relatives, kjvBook, max = 3) {
  const own = person.name.replace(/\s*\(.*?\)\s*/g, " ").trim().split(" ")[0];
  const rel = relatives.map(n => n.replace(/\s*\(.*?\)\s*/g, " ").trim().split(" ")[0]).filter(Boolean);
  const scored = [];
  for (const n of (person.verses || []).slice(0, 2000)) {
    const r = unpack(n), t = kjvBook(r.book)?.chapters?.[r.chapter - 1]?.[r.verse - 1] || "";
    if (!t) continue;
    const has = w => new RegExp(`\\b${w}\\b`).test(t);
    let score = (has(own) ? 2 : 0) + rel.filter(has).length * 3 + (/\b(son|daughter|father|mother|begat|bare|wife|brother)s?\b/.test(t) ? 1 : 0);
    if (score > 2) scored.push({ n, r, t, score });
  }
  scored.sort((a, b) => b.score - a.score || a.n - b.n);
  return scored.slice(0, max);
}

/**
 * Sources for people named in a question: one "dataset" source per person (family relations, dates on the
 * dataset's chronology and up to 3 key verses with KJV text), the key verses again as "scripture" sources so
 * statements can cite Bible text, and the site's curated note (if any) as an "editorial" source.
 * Returns [{type, label, text}].
 */
export function personSources(J, question, kjvBook, { limit = 2 } = {}) {
  const { bySlug } = peopleIndex(J);
  const nameOf = slug => bySlug.get(slug)?.[1] || slug;
  const ql = String(question || "").toLowerCase();
  const asked = Object.keys(KIN).filter(k => KIN[k].some(w => new RegExp(`\\b${w}\\b`).test(ql)));
  const out = [];
  for (const slug of findPeople(J, question, limit)) {
    const p = personEntry(J, slug); if (!p) continue;
    const list = (k, n = 12) => { const a = (p[k] || []).map(nameOf); return a.length ? a.slice(0, n).join(", ") + (a.length > n ? ` and ${a.length - n} more` : "") : ""; };
    const relSlugs = (asked.length ? asked : ["father", "mother"]).flatMap(k => p[k] || []);
    const verses = keyVerses(J, p, relSlugs.map(nameOf), kjvBook);
    const parts = [
      `${p.name}${p.desc ? ` (${p.desc})` : ""}`,
      `Father: ${list("father") || "not recorded in this dataset"}`,
      `Mother: ${list("mother") || "not recorded in this dataset"}`,
      list("siblings") && `Siblings: ${list("siblings")}`,
      list("half") && `Half-siblings: ${list("half")}`,
      list("partners") && `Wives or husbands: ${list("partners")}`,
      list("children") && `Children: ${list("children")}`,
      (p.born != null || p.died != null) && `Dates on the dataset's traditional chronology: ${p.born != null ? "born " + yearText(p.born) : ""}${p.born != null && p.died != null ? ", " : ""}${p.died != null ? "died " + yearText(p.died) : ""}`,
      p.groups?.length && `Groups: ${p.groups.join(", ")}`,
      `Mentioned in ${p.verses?.length || 0} verses`,
      verses.length && `Key verses: ${verses.map(v => `${formatRef(v.r.book, v.r.chapter, v.r.verse)} (KJV) "${v.t}"`).join("; ")}`
    ].filter(Boolean);
    out.push({ type: "dataset", label: `Family and key verses: ${p.name} (Theographic Bible Metadata, Robert Rouse)`, text: parts.join(". ") + "." });
    for (const v of verses) out.push({ type: "scripture", label: `${formatRef(v.r.book, v.r.chapter, v.r.verse)} (KJV)`, text: v.t });
    if (p.note) out.push({ type: "editorial", label: `Ereunia note: ${p.name}`, text: p.note });
  }
  return out;
}
