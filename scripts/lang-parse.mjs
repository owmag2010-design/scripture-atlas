// Parsers for STEPBible TAHOT / TAGNT / TBESH / TBESG and OpenBible cross references.
// Pure functions so they can be unit-tested (test/lang.test.mjs).

// STEPBible book abbreviations in canonical order (index = Scripture Atlas book index)
export const STEP_BOOKS = "Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Ezk Dan Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Jas 1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev".split(" ");
const STEP_INDEX = new Map(STEP_BOOKS.map((b, i) => [b, i]));

/**
 * STEP reference → { book, chapter, verse, word, type } in English (KJV) versification.
 * "Mal.4.1(3.19)#01=L"  (Hebrew numbering in parentheses, English first)
 * "2Co.13.13[13.14]#01=NKO"  (English/KJV numbering in square brackets: used)
 * "Rom.16.25{14.24}#01=NKO"  (alternative placement in braces: ignored)
 */
export function parseStepRef(s) {
  const m = s.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:\(([^)]*)\))?(?:\[(\d+)\.(\d+)\])?(?:\{[^}]*\})?#(\d+)=(\S+)$/);
  if (!m || !STEP_INDEX.has(m[1])) return null;
  const chapter = m[5] ? +m[5] : +m[2], verse = m[6] ? +m[6] : +m[3];
  return { book: STEP_INDEX.get(m[1]), chapter, verse, word: +m[7], type: m[8] };
}

const strip = s => (s || "").trim().normalize("NFC");
/** Hebrew transliteration "be./re.Shit" → "bereshit" */
export const cleanTranslit = t => strip(t).replace(/[./\\-]/g, "").toLowerCase();

/**
 * One TAHOT data line → word, or null if the line is not a main-text word.
 * Word = [text, translit, gloss, mainStrong, allStrongs, morph, flag]
 */
export function parseHebrewLine(line) {
  const c = line.split("\t");
  const ref = parseStepRef(c[0] || "");
  if (!ref) return null;
  if (!/^[LQ]/.test(ref.type)) return null; // Leningrad text or Qere reading; skip other witnesses
  const text = strip(c[1]).replace(/[/\\]/g, "");
  const strongs = strip(c[4]).split("\\")[0];
  const brace = strongs.match(/\{(H\d+[A-Za-z]?)\}/);
  const parts = strongs.replace(/[{}]/g, "").split("/").filter(Boolean);
  const main = brace ? brace[1] : parts.filter(p => !/^H90\d\d/.test(p)).pop() || parts[0] || "";
  const gloss = strip(c[3]).replace(/\s*\/\s*/g, " ").replace(/\s+/g, " ");
  return { ref, word: [text, cleanTranslit(c[2]), gloss, main, parts.join("/"), strip(c[5]), ref.type.startsWith("Q") ? "Q" : ""] };
}

/**
 * One TAGNT data line → word. Includes words printed in NA28 and/or the Textus Receptus (KJV base).
 * Flag "N" = NA28 only, "K" = TR only, "" = both. Editions column decides; type letters are the fallback.
 * Combined words (crasis, e.g. μήποτε = G3361 + G4218) keep every Strong's number; the first is the lookup key.
 */
export function parseGreekLine(line) {
  const c = line.split("\t");
  const ref = parseStepRef(c[0] || "");
  if (!ref) return null;
  const ed = c[5] || "";
  const inNA = ed ? /NA28/.test(ed) : ref.type.includes("N");
  const inTR = ed ? /\bTR\b/.test(ed) : ref.type.includes("K");
  if (!inNA && !inTR) return null;
  const m = strip(c[1]).replace(/^\[+|\]+$/g, "").match(/^(.*?)\s*\(([^)]*)\)\s*\]*$/);
  const text = (m ? m[1] : strip(c[1])).replace(/^\[+|\]+$/g, "");
  const translit = m ? m[2] : "";
  const parts = strip(c[3]).split(/\s*\+\s*/).map(p => p.split("=").map(strip));
  const strongs = parts.map(p => p[0]).filter(Boolean);
  const morph = parts.map(p => p[1] || "").join("+");
  const gloss = strip(c[2]).replace(/^\{[\d.]+\}\s*|^\[\d+\]\s*/, "");
  const flag = inNA && inTR ? "" : inNA ? "N" : "K";
  return { ref, word: [text, translit, gloss, strongs[0] || "", strongs.join("/"), morph, flag] };
}

/** Keep only <b>, <i>, <br>; turn <ref='X'>label</ref> into its label; tidy whitespace. */
export function sanitizeDefinition(html, max = 2200) {
  let s = String(html || "")
    .replace(/<ref='[^']*'>/gi, "").replace(/<\/ref>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(\/?)(b|i)>/gi, "\u0001$1$2\u0002")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/__/g, "")
    .replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
  s = s.replace(/[<>]/g, "");
  s = s.replace(/\u0001(\/?)(b|i)\u0002/gi, "<$1$2>").replace(/\n/g, "<br>");
  if (s.length > max) {
    s = s.slice(0, max);
    s = s.slice(0, s.lastIndexOf(" ")).replace(/<[^>]*$/, "") + " …";
  }
  // close any tags left open by truncation
  for (const t of ["b", "i"]) {
    const open = (s.match(new RegExp(`<${t}>`, "g")) || []).length;
    const close = (s.match(new RegExp(`</${t}>`, "g")) || []).length;
    s += `</${t}>`.repeat(Math.max(0, open - close));
  }
  return s;
}

/** TBESH/TBESG line → [key, entry] or null. */
export function parseLexiconLine(line) {
  const c = line.split("\t");
  if (!/^[HG]\d{4}/.test(c[0] || "") || !c[1]) return null;
  const key = c[1].split("=")[0].trim();
  if (!/^[HG]\d{4}[A-Za-z]?$/.test(key)) return null;
  return [key, { lemma: strip(c[3]), translit: strip(c[4]), pos: strip(c[5]), gloss: strip(c[6]), def: sanitizeDefinition(c[7]) }];
}

/** Morphology table line "HVqp3ms\tFunction=Verb ; ..." → [code, description] */
export function parseMorphLine(line) {
  const c = line.split("\t");
  if (!c[0] || !c[1] || !/=/.test(c[1]) || /\s/.test(c[0])) return null;
  return [c[0].trim(), c[1].trim().replace(/\s*;\s*/g, "; ")];
}

/** Hebrew morph "HR/Ncfsa" → ["HR","HNcfsa"]; Greek codes pass through. */
export function morphSegments(code) {
  if (!code) return [];
  if (code.includes("+")) return code.split("+").filter(Boolean);
  if (!/^[HA]/.test(code) || !code.includes("/")) return [code];
  const lang = code[0];
  return code.split("/").map((s, i) => (i === 0 ? s : lang + s));
}

/** Pack a reference into one integer: book*1e6 + chapter*1e3 + verse. */
export const pack = (b, c, v) => b * 1e6 + c * 1e3 + v;
export const unpack = n => ({ book: Math.floor(n / 1e6), chapter: Math.floor(n / 1e3) % 1e3, verse: n % 1e3 });

/** OpenBible line "Gen.1.1\tPs.134.3-Ps.134.4\t60" → {from, to, toEnd, votes} as packed ints. */
export function parseCrossRef(line, osisIndex) {
  const [from, to, votes] = line.split("\t");
  if (!from || !to || votes === undefined || isNaN(+votes)) return null;
  const p = r => { const m = r.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/); if (!m || !osisIndex.has(m[1])) return null; return pack(osisIndex.get(m[1]), +m[2], +m[3]); };
  const [a, b] = to.split("-");
  const f = p(from), t = p(a), e = b ? p(b) : t;
  if (f == null || t == null || e == null) return null;
  return { from: f, to: t, toEnd: e, votes: +votes };
}
