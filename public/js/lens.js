// Scripture Lens helpers: translation comparison, textual-variant notes, lesson export. Pure; tested in test/lens.test.mjs.

const normWord = w => w.toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, "");

/**
 * Word-level comparison of a translation against a base text (longest common subsequence).
 * Returns { parts: [{ w, same }], similarity } where parts are the words of `text` (original spelling and punctuation)
 * and similarity is the share of base words kept, 0–1.
 */
export function wordDiff(base, text) {
  const A = String(base || "").split(/\s+/).filter(Boolean), B = String(text || "").split(/\s+/).filter(Boolean);
  const a = A.map(normWord), b = B.map(normWord), n = a.length, m = b.length;
  if (!n || !m) return { parts: B.map(w => ({ w, same: false })), similarity: 0 };
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const same = new Set();
  for (let i = 0, j = 0; i < n && j < m;) { if (a[i] && a[i] === b[j]) { same.add(j); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return { parts: B.map((w, j) => ({ w, same: same.has(j) })), similarity: L[0][0] / n };
}

// Well-known textual questions, stated as the manuscript evidence; editorial summaries of standard scholarship.
// Keys are OSIS ranges "Book.c.v" or "Book.c.v-v2" / "Book.c.v-c2.v2".
export const TEXT_VARIANTS = [
  ["Mark.16.9-16.20", "The longer ending of Mark (16:9–20) is absent from the two oldest complete Greek Bibles, Codex Sinaiticus and Codex Vaticanus. It is present in Codex Alexandrinus and most later manuscripts. Many modern Bibles print it with a note."],
  ["John.7.53-8.11", "The account of the woman caught in adultery is absent from the earliest manuscripts, including Papyri 66 and 75 and Codices Sinaiticus and Vaticanus. It first appears in a Greek manuscript in Codex Bezae (5th century), and in some later copies it stands in other places."],
  ["1John.5.7-5.8", "The words about the three heavenly witnesses (the 'Johannine Comma') are found in no Greek manuscript before the late medieval period. They come from the Latin tradition and entered printed Greek in Erasmus's third edition of 1522."],
  ["Acts.8.37", "Acts 8:37 is absent from the early Greek manuscripts, including Papyri 45 and 74 and Codices Sinaiticus, Alexandrinus and Vaticanus. Erasmus included it from the Latin tradition, and the King James Version follows his text."],
  ["Matt.6.13", "The closing words 'For thine is the kingdom, and the power, and the glory, for ever' are absent from Codices Sinaiticus and Vaticanus. A similar ending appears in the early church manual the Didache."],
  ["Luke.22.43-22.44", "The angel and the sweat like drops of blood are absent from some of the earliest manuscripts, including Papyrus 75 and Codex Vaticanus, but present in Codex Sinaiticus."],
  ["John.5.4", "The angel who stirs the water is absent from Papyri 66 and 75 and Codices Sinaiticus and Vaticanus. Most scholars think it was added to explain verse 7."],
  ["Rom.16.25-16.27", "Manuscripts place this closing praise in different places: after 16:23 (as in the KJV), after 14:23, or after 15:33, as in Papyrus 46."],
  ["Luke.17.36", "This verse is absent from the earliest manuscripts and appears to have come in from Matthew 24:40."],
  ["Acts.15.34", "This verse is absent from the earliest Greek manuscripts; it was probably added to explain Silas being in Antioch in verse 40."],
  ["Acts.24.6-24.8", "The words from the end of verse 6 to the start of verse 8 are absent from the earliest manuscripts."],
  ["Josh.21.36-21.37", "These verses are not in the Leningrad Codex, the manuscript behind the Hebrew text here, but appear in other Hebrew manuscripts and the Septuagint."],
  ["Deut.32.8", "The Masoretic Hebrew reads 'according to the number of the children of Israel'. A Dead Sea Scroll of Deuteronomy (4QDeutj) reads 'sons of God', and the Septuagint has a related reading."],
  ["Isa.53.11", "The Great Isaiah Scroll and the Septuagint read 'he shall see light'; the word 'light' is not in the Masoretic Hebrew."],
  ["Ps.22.16", "Most Hebrew manuscripts read 'like a lion, my hands and my feet'. The Septuagint reads 'they dug (or pierced) my hands and my feet', and a Dead Sea Scroll fragment has a form that supports a verb."]
];

const order = (b, c, v) => b * 1e6 + c * 1e3 + v;
/** Variant notes that touch a verse. book is the 0-based index; bookIndex maps an OSIS book code to that index. */
export function variantsFor(book, chapter, verse, bookIndex) {
  const here = order(book, chapter, verse);
  return TEXT_VARIANTS.filter(([range]) => {
    const [from, to] = range.split("-");
    const [fb, fc, fv] = from.split("."), b = bookIndex(fb);
    if (b < 0) return false;
    let tc = +fc, tv = +fv;
    if (to) { const p = to.split("."); if (p.length === 2) { tc = +p[0]; tv = +p[1]; } else tv = +p[0]; }
    return here >= order(b, +fc, +fv) && here <= order(b, tc, tv);
  }).map(([, note]) => note);
}

/** Words whose presence differs between Greek editions (TAGNT flags): K = Textus Receptus only, N = NA28 only. */
export const editionDifferences = words => words.map((w, i) => ({ i, form: w[0], gloss: w[2], flag: w[6] })).filter(x => x.flag === "K" || x.flag === "N");

/** Markdown for a lesson built in Teach mode. */
export function lessonMarkdown(l) {
  const sec = (title, items) => items.length ? `\n## ${title}\n\n${items.map(x => `- ${x}`).join("\n")}\n` : "";
  return `# ${l.title}

${l.ref}${l.translation ? `, ${l.translation}` : ""}

> ${l.text}
${l.bigIdea ? `\n**Big idea:** ${l.bigIdea}\n` : ""}${sec("Observe", l.observe)}${sec("Key words", l.words)}${sec("Connect", l.refs)}${sec("Discuss", l.discuss)}${sec("Apply", l.apply)}${l.notes ? `\n## Notes\n\n${l.notes}\n` : ""}
---
Prepared with Ereunia. Sources: KJV with Strong's numbers (public domain); STEPBible (CC BY 4.0); OpenBible.info cross references (CC BY).
`;
}
