// AI research assistant core: find references, check answers against their sources.
// Shared by the server function (netlify/functions/ask.mjs) and the tests. No DOM, no network.
import { parseReference } from "./ref.js";

export const SECTIONS = [
  ["scripture", "Scripture", "What the text explicitly says"],
  ["translation", "Translation", "How translations render it"],
  ["evidence", "Historical evidence", "What historical sources and data establish"],
  ["interpretation", "Interpretation", "Views the sources attribute to named traditions or scholars, and readings marked as inference"],
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

// ---- attribution ----
// Group or tradition attribution in a statement: "many interpreters", "scholars", "Jewish tradition",
// "is traditionally read", "widely held", "church fathers" ... Quoted text is removed first, because quotations
// are checked word for word against the sources (e.g. Matthew 16:14 "Some say that thou art John the Baptist").
const Q = "(?:many|some|most|several|few|other|certain|numerous|various|modern|early|later|ancient|medieval|traditional|conservative|liberal|critical|evangelical|catholic|protestant|orthodox|reformed|christian|jewish|rabbinic|patristic|historical[- ]critical|feminist|contemporary|mainstream|older|recent)";
const GROUP = "(?:interpreters|scholars|commentators|theologians|exegetes|historians|archaeologists|critics|academics|readers|translators|expositors|preachers|specialists)";
const ATTRIBUTION = [
  // "many interpreters", "some scholars", "early Christian writers", "most modern translators"
  new RegExp(`\\b${Q}(?:\\s+${Q})*\\s+${GROUP}\\b`, "i"),
  // bare professional groups: "Scholars date ...", "commentators note"; "scholarship", "scholarly consensus"
  /\b(?:scholars|scholarship|scholarly|commentators|theologians|exegetes|interpreters|historians|archaeologists|academics|expositors)\b/i,
  // "early Christian writers", "patristic authors" (not "other writers", which may mean biblical authors)
  /\b(?:early|patristic|christian|jewish|rabbinic|church|ancient|medieval|later)\s+(?:christian\s+|jewish\s+|church\s+)?(?:writers|authors|fathers)\b/i,
  // named traditions and bodies
  /\b(?:christian|jewish|rabbinic|catholic|protestant|orthodox|reformed|lutheran|patristic|church|early church|ecclesiastical|talmudic|messianic|evangelical)\s+(?:tradition|traditions|teaching|doctrine|interpretation|interpretations|thought|theology|exegesis|commentary|commentaries|readers|readings|reading|understanding|view|views|consensus|sources|literature|scholarship|writers)\b/i,
  /\b(?:church fathers|the fathers of the church|patristic|rabbis|rabbinic|reformers|protestants|catholics|evangelicals|the early church (?:taught|held|read|understood|believed|saw))\b/i,
  /\b(?:christians|jews|believers|the church|churches)\s+(?:have\s+)?(?:traditionally\s+|often\s+|generally\s+|usually\s+|commonly\s+|long\s+|historically\s+)?(?:believe|read|understand|interpret|hold|see|regard|identify|take|teach|confess|view|have (?:read|understood|seen|taken|held|believed|interpreted))\b/i,
  // tradition as authority
  /\b(?:traditionally|by tradition|according to tradition|in tradition|tradition (?:holds|says|identifies|attributes|names|teaches|records|places|dates|has it))\b/i,
  /\btraditional\s+(?:view|reading|interpretation|understanding|attribution|identification|dating|position|account|claim)\b/i,
  // majority / consensus phrasing
  /\b(?:widely|commonly|generally|broadly|usually|often|frequently|typically|traditionally|historically)\s+(?:held|accepted|believed|read|understood|thought|interpreted|identified|agreed|recognized|recognised|assumed|attributed|dated|(?:seen|viewed|regarded|considered|taken)\s+as)\b/i,
  /\bit is (?:often|usually|generally|widely|commonly|sometimes|frequently) (?:held|said|thought|believed|argued|suggested|claimed|noted|assumed|read|understood|taken)\b/i,
  /\b(?:consensus|majority view|minority view|mainstream view|standard view|prevailing view|dominant view|common view|popular view|classic view|usual view)\b/i,
  /\b(?:a|the)\s+(?:common|usual|standard|classic|classical|dominant|majority|prevailing|popular|mainstream|conventional|orthodox|accepted)\s+(?:interpretation|reading|understanding|position|explanation)\b/i,
  // "some argue", "others suggest" (present tense only, so narrative "some believed" is not caught)
  /\b(?:some|others|many|most|few)\s+(?:argue|suggest|hold|believe|maintain|contend|propose|interpret|understand|think|claim|insist|prefer|see it|read it|read this|take it|take this)\b/i,
  /\b(?:some|many|most|others)\s+(?:have\s+)?(?:argued|suggested|proposed|contended|maintained|claimed)\b/i,
  /\b(?:interpreted|understood|read|taken)\s+by\s+(?:many|some|most|others|several)\b/i
];
/** Strip quoted spans so a quoted verse cannot trigger (or satisfy) the attribution check. */
const unquoted = text => String(text || "").replace(/[“"][^”"]*[”"]/g, " ");
/** The group-attribution phrase in a statement, or "" if none. */
export function attributionIn(text) {
  const t = unquoted(text);
  for (const rx of ATTRIBUTION) { const m = t.match(rx); if (m) return m[0]; }
  return "";
}

// A source "names who holds a view" when its own text uses attribution language or names a scholar or work:
// an author with a year ("Wright 1992", not "Date: 1800 BC"), "according to", "argues", a named ancient author or
// reference work (not Strong's numbers or the data publishers, which every lexicon or dataset source mentions),
// a lexicon abbreviation such as "(AS)" or "VGT", or an et al. citation.
const NAMED = [
  /\b(?!(?:Date|Dated|About|Around|Circa|From|In|By|Until|Since|Before|After|Born|Died|Reigned)\b)[A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?,?\s+\(?(?:1[5-9]|20)\d\d[a-z]?\)?(?!\s*(?:BC|BCE|B\.C|AD|CE|years|\d))/,
  /\bet al\.?/i,
  /\baccording to\b/i,
  /\b(?:argues?|argued|contends?|proposes?|proposed|maintains that|attributes?|attributed to)\b/i,
  /\b(?:Josephus|Philo|Eusebius|Origen|Augustine|Jerome|Irenaeus|Tertullian|Justin|Chrysostom|Aquinas|Luther|Calvin|Rashi|Maimonides|Ibn Ezra|Talmud|Mishnah|Midrash|Targum|Septuagint|LXX|Vulgate|Dead Sea Scrolls|Abbott-Smith|Thayer|Liddell|Brown-Driver-Briggs|BDB|BDAG|Gesenius|Cremer)\b/,
  /\((?:AS|MM|VGT|LSJ|BDB|BDAG|HALOT|TWOT)\)|\b(?:VGT|LSJ|HALOT|TWOT)\b/
];
export function namesAuthority(text) {
  const t = String(text || "");
  return ATTRIBUTION.some(rx => rx.test(t)) || NAMED.some(rx => rx.test(t));
}
/** Source types that may back an attribution to a group (never Scripture itself, never a bare data tag). */
export const ATTRIBUTION_TYPES = ["editorial", "lexicon", "archaeology", "reference"];
const BIBLE_TYPES = ["scripture", "translation"];
const INFERENCE_SECTIONS = ["interpretation", "uncertainty"];

/**
 * Keep only statements that pass the citation rules:
 *  1. every statement except Uncertainty cites at least one known source id;
 *  2. Scripture and Translation statements cite a scripture or translation source;
 *  3. a statement marked kind "inference" (the assistant's own reading) appears only under Interpretation or
 *     Uncertainty, cites the Bible passages it reasons from, and does not attribute views to groups;
 *  4. a statement that attributes a view to a group or tradition ("many interpreters", "Jewish tradition",
 *     "is traditionally read as") cites an editorial, lexicon, archaeology or reference source whose own text
 *     names who holds it or uses attribution language;
 *  5. every quotation appears word for word in one of the cited sources.
 * Returns { sections, dropped }: kept statements are {text, cites, kind}; dropped ones are {section, text, kind, reason}.
 */
export function verifyAnswer(answer, sources) {
  const byId = new Map(sources.map(s => [s.id, s]));
  const sections = Object.fromEntries(KEYS.map(k => [k, []]));
  const dropped = [];
  for (const key of KEYS) {
    for (const item of Array.isArray(answer?.[key]) ? answer[key] : []) {
      const text = String(item?.text || "").trim();
      const cites = [...new Set((Array.isArray(item?.cites) ? item.cites : []).map(String))];
      const kind = item?.kind === "inference" ? "inference" : "source";
      if (!text) continue;
      const known = cites.filter(c => byId.has(c));
      const types = known.map(c => byId.get(c).type);
      const group = attributionIn(text);
      let reason = "";
      if (cites.length !== known.length) reason = "cites a source that does not exist";
      else if (key !== "uncertainty" && !known.length) reason = "no source cited";
      else if ((key === "scripture" || key === "translation") && !types.some(t => BIBLE_TYPES.includes(t))) reason = "not tied to a Bible text";
      else if (kind === "inference" && !INFERENCE_SECTIONS.includes(key)) reason = `an inference cannot appear under ${key}; inferences belong under interpretation or uncertainty`;
      else if (kind === "inference" && !types.some(t => BIBLE_TYPES.includes(t))) reason = "an inference must cite the Bible passages it reasons from";
      else if (kind === "inference" && group) reason = `an inference must not attribute views to groups or scholars ("${group}")`;
      else if (group && !known.some(c => ATTRIBUTION_TYPES.includes(byId.get(c).type) && namesAuthority(byId.get(c).text))) reason = `attributes a view to a group ("${group}") but no cited editorial, lexicon or archaeology source names who holds it`;
      else {
        const pool = norm(known.map(c => byId.get(c).text).join(" "));
        const bad = quotesIn(text).find(q => !pool.includes(norm(q)));
        if (bad) reason = `quotation not found in the cited source: "${bad}"`;
      }
      if (reason) dropped.push({ section: key, text, kind, reason });
      else sections[key].push({ text, cites: known, kind });
    }
  }
  return { sections, dropped };
}

/** True when nothing survived verification. */
export const isEmpty = sections => KEYS.every(k => !sections[k].length);
