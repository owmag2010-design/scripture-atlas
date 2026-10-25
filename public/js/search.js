// Full-text search over loaded Bible text. Pure functions, unit-tested in test/search.test.mjs.

export const escapeHtml = s => String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
// Lower-case, unify quotes, and drop accents and vowel points (Arabic harakat, Hebrew niqqud) for matching.
const fold = s => s.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC").toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”]/g, '"');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Split a query into exact phrases ("...") and single words. */
export function parseQuery(q) {
  const s = fold(String(q || ""));
  const phrases = [...s.matchAll(/"([^"]+)"/g)].map(m => m[1].trim()).filter(Boolean);
  const words = s.replace(/"[^"]*"/g, " ").split(/[^\p{L}\p{N}']+/u).map(w => w.replace(/^'+|'+$/g, "")).filter(Boolean);
  return { phrases, words };
}

// Scripts written without spaces between words (or with attached particles) match anywhere in the text.
const NOSPACE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Myanmar}]/u;
function matchers({ phrases, words }) {
  if ([...phrases, ...words].some(w => NOSPACE.test(w))) return [...phrases, ...words].map(w => new RegExp(reEsc(w).replace(/\s+/g, "\\s*"), "u"));
  return [
    ...phrases.map(p => new RegExp(`(^|[^\\p{L}])${reEsc(p).replace(/\s+/g, "\\s+")}(?![\\p{L}])`, "u")),
    ...words.map(w => new RegExp(`(^|[^\\p{L}])${reEsc(w)}`, "u"))
  ];
}

/**
 * corpus: [{ book, chapters: [[verseText, ...], ...] }]
 * Returns hits [{book, chapter, verse, text}] (1-based) with a .total property.
 */
export function searchCorpus(corpus, query, { limit = 500 } = {}) {
  const q = parseQuery(query);
  const res = [];
  res.total = 0;
  if (!q.phrases.length && !q.words.length) return res;
  const ms = matchers(q);
  for (const b of corpus) {
    b.chapters.forEach((ch, ci) => ch.forEach((text, vi) => {
      if (!text) return;
      const t = fold(text);
      if (ms.every(m => m.test(t))) {
        res.total++;
        if (res.length < limit) res.push({ book: b.book, chapter: ci + 1, verse: vi + 1, text });
      }
    }));
  }
  return res;
}

/** Escape text for HTML and wrap matched words/phrases in <mark>. */
export function highlightTerms(text, q) {
  if ([...q.phrases, ...q.words].some(w => NOSPACE.test(w))) {
    const re = new RegExp(`(${[...q.phrases, ...q.words].map(reEsc).join("|")})`, "gu");
    return escapeHtml(text).replace(re, "<mark>$1</mark>");
  }
  const terms = [...q.phrases.map(p => reEsc(p).replace(/\s+/g, "\\s+")), ...q.words.map(w => reEsc(w).replace(/'/g, "['’]") + "\\p{L}*")];
  if (!terms.length) return escapeHtml(text);
  const re = new RegExp(`(?<![\\p{L}])(${terms.join("|")})`, "giu");
  let out = "", last = 0;
  for (const m of text.matchAll(re)) {
    out += escapeHtml(text.slice(last, m.index)) + "<mark>" + escapeHtml(m[0]) + "</mark>";
    last = m.index + m[0].length;
  }
  return out + escapeHtml(text.slice(last));
}
