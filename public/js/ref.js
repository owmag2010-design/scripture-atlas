// Scripture reference parsing and formatting. Pure functions, unit-tested in test/ref.test.mjs.
import { BOOKS, NAMES } from "./books.js";

const squash = s => s.toLowerCase().replace(/\s+/g, "");

// lookup tables built once
const exact = new Map();
BOOKS.forEach(b => {
  exact.set(squash(b.name), b.i);
  exact.set(squash(b.osis), b.i);
  b.aliases.forEach(a => exact.set(squash(a), b.i));
});
const squashedNames = NAMES.map(squash);

function normalise(q) {
  let s = String(q || "").toLowerCase().replace(/[.,]/g, " ").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  s = s.replace(/^(first|1st)\s+/, "1 ").replace(/^(second|2nd)\s+/, "2 ").replace(/^(third|3rd)\s+/, "3 ");
  s = s.replace(/^iii\s+(?=[a-z])/, "3 ").replace(/^ii\s+(?=[a-z])/, "2 ").replace(/^i\s+(?=[a-z])/, "1 ");
  return s;
}

/** Book index for a typed name, alias, or unambiguous prefix (2+ letters). -1 if none or ambiguous. */
export function findBook(text, { allowPrefix = true } = {}) {
  const key = squash(normalise(text));
  if (!key || !/[a-z]/.test(key)) return -1;
  if (exact.has(key)) return exact.get(key);
  if (!allowPrefix || key.replace(/^\d/, "").length < 2) return -1;
  const hits = squashedNames.map((n, i) => (n.startsWith(key) ? i : -1)).filter(i => i >= 0);
  return hits.length === 1 ? hits[0] : -1;
}

/**
 * Parse a reference such as "John 3:16", "1 cor 13", "Gen 1:1-5", "Jude 3", "Romans".
 * chapterCount(bookIndex) bounds-checks chapters. Returns 1-based numbers or null.
 */
export function parseReference(q, chapterCount) {
  const s = normalise(q);
  if (!s) return null;
  const m = s.match(/^(.*?[a-z].*?)\s*(\d+)(?:\s*[: ]\s*(\d+)(?:\s*-\s*(\d+))?)?$/);
  if (!m) {
    const b = findBook(s, { allowPrefix: false });
    return b >= 0 ? { book: b, chapter: 1, verse: null, verseEnd: null } : null;
  }
  const book = findBook(m[1]);
  if (book < 0) return null;
  let chapter = +m[2], verse = m[3] ? +m[3] : null, verseEnd = m[4] ? +m[4] : null;
  const n = chapterCount(book);
  if (n === 1 && verse === null && chapter > 1) { verse = chapter; chapter = 1; }
  if (chapter < 1 || chapter > n) return null;
  if (verse !== null && verse < 1) return null;
  if (verseEnd !== null && verseEnd < verse) verseEnd = null;
  return { book, chapter, verse, verseEnd };
}

export function formatRef(book, chapter, verse = null, verseEnd = null) {
  const name = book === 18 && chapter ? "Psalm" : NAMES[book];
  let s = `${name} ${chapter}`;
  if (verse) s += `:${verse}`;
  if (verse && verseEnd && verseEnd !== verse) s += `–${verseEnd}`;
  return s;
}

export const toOsis = (book, chapter, verse) => `${BOOKS[book].osis}.${chapter}${verse ? "." + verse : ""}`;

export function fromOsis(id) {
  const m = String(id || "").match(/^([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  let book = BOOKS.findIndex(b => b.osis === m[1]);
  if (book < 0) { const lc = m[1].toLowerCase(); book = BOOKS.findIndex(b => b.osis.toLowerCase() === lc); } // links may arrive lower-cased
  if (book < 0) return null;
  return { book, chapter: +m[2], verse: m[3] ? +m[3] : null };
}
