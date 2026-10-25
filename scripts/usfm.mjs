// Parser for eBible.org USFM with Strong's-tagged words (eng-kjv2006). Pure; tested in test/usfm.test.mjs.
// A verse becomes tokens [text, strongs, flags]: strongs is "" or space-separated numbers (H0430, G2316 …);
// flags: 1 = translators' addition (printed in italics in the KJV), 2 = words of Jesus, 4 = divine name (LORD).
export const ADD = 1, WJ = 2, ND = 4;
const FLAG = { add: ADD, wj: WJ, nd: ND };

export function parseUsfmBook(text) {
  const chapters = []; // [{ title, verses: [tokens], notes: {verse: [note]} }]
  let ch = null, verse = null, flags = [], pendingTitle = "";
  const cur = () => flags.reduce((a, f) => a | f, 0);
  const push = (t, strong = "") => {
    if (!verse || !t) return;
    const f = cur(), last = verse.tokens.at(-1);
    if (!strong && last && !last[1] && last[2] === f) last[0] += t; // merge plain runs
    else verse.tokens.push([t, strong, f]);
  };
  const re = /\\(\+?)([a-z]+\d?)(\*?)/g;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    const lm = line.match(/^\\(c|v|d|id|h|toc\d|mt\d|s\d|q\d|p|b|m|pi\d?|li\d?|nb)\b\s*(.*)$/);
    let rest = line;
    if (lm) {
      const [, tag, body] = lm;
      if (tag === "c") { ch = { title: "", verses: [], notes: {} }; chapters[+body - 1] = ch; verse = null; continue; }
      if (["id", "h", "mt1", "mt2", "toc1", "toc2", "toc3", "s1"].includes(tag)) continue;
      if (tag === "d") { pendingTitle = body.replace(/\|strong="[^"]*"/g, "").replace(/\\\+?[a-z]+\d?\*/g, "").replace(/\\\+?[a-z]+\d?\s?/g, "").replace(/\s+/g, " ").trim(); if (ch) ch.title = pendingTitle; continue; }
      if (tag === "v") {
        const vm = body.match(/^(\d+)\s*(.*)$/);
        if (!ch || !vm) continue;
        verse = { n: +vm[1], tokens: [] }; ch.verses[verse.n - 1] = verse.tokens; flags = [];
        verse.tokensRef = ch.verses; rest = vm[2];
      } else rest = body;
    }
    if (!verse) continue;
    rest = rest.replace(/¶\s?/g, "");
    let i = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(rest))) {
      push(rest.slice(i, m.index).replace(/\s+/g, " "));
      const [, , tag, end] = m;
      if (tag === "w" && !end) {
        if (rest[re.lastIndex] === " ") re.lastIndex++;
        const close = rest.indexOf("\\", re.lastIndex);
        const inner = rest.slice(re.lastIndex, close);
        const [word, attrs = ""] = inner.split("|");
        const sm = attrs.match(/strong="([^"]*)"/);
        push(word, sm ? sm[1].split(/[\s,]+/).filter(Boolean).join(" ") : "");
        const endM = rest.slice(close).match(/^\\\+?w\*/);
        i = close + (endM ? endM[0].length : 0); re.lastIndex = i; continue;
      }
      if (tag === "f" && !end) {
        const close = rest.indexOf("\\f*", re.lastIndex);
        const body = rest.slice(re.lastIndex, close < 0 ? undefined : close);
        const note = (body.match(/\\ft\s*(.*)$/) || [, ""])[1].replace(/\\[a-z+]+\*?\s?/g, "").trim();
        if (note) (ch.notes[verse.n] ??= []).push(note);
        i = close < 0 ? rest.length : close + 3; re.lastIndex = i; continue;
      }
      if (FLAG[tag]) { if (end) flags.pop(); else flags.push(FLAG[tag]); }
      i = re.lastIndex;
      if (!end && rest[i] === " ") { i++; re.lastIndex = i; } // the space after an opening marker is part of the marker
    }
    push((i ? "" : "") + rest.slice(i).replace(/\s+/g, " "));
    // a line break inside a verse (poetry) becomes a space
    if (verse.tokens.length && !/\s$/.test(verse.tokens.at(-1)[0])) push(" ");
  }
  // tidy: trim each verse, drop empty tokens, collapse double spaces at token joins
  for (const c of chapters) if (c) c.verses = Array.from(c.verses, v => tidy(v || []));
  return Array.from(chapters, c => c || { title: "", verses: [], notes: {} });
}

function tidy(tokens) {
  const out = [];
  for (const t of tokens) {
    if (!t[0]) continue;
    const prev = out.at(-1);
    if (prev && /\s$/.test(prev[0]) && /^\s/.test(t[0])) t[0] = t[0].replace(/^\s+/, "");
    if (!t[0]) continue;
    out.push(t);
  }
  if (out.length) { out[0][0] = out[0][0].replace(/^\s+/, ""); out.at(-1)[0] = out.at(-1)[0].replace(/\s+$/, ""); }
  return out.filter(t => t[0]);
}

/** Plain text of a verse from its tokens. */
export const tokensText = tokens => tokens.map(t => t[0]).join("").replace(/\s+/g, " ").trim();

/** Count English renderings per Strong's number: Map(strong → Map(english → n)). */
export function renderings(books) {
  const out = new Map();
  for (const b of books) for (const c of b) for (const v of c.verses) for (const [text, strongs] of v) {
    if (!strongs) continue;
    const eng = text.trim().replace(/[.,;:!?]+$/, "");
    const key = /^[A-Z]{2,}$/.test(eng) ? eng : eng.toLowerCase(); // LORD stays distinct from Lord
    for (const s of strongs.split(" ")) {
      if (!out.has(s)) out.set(s, new Map());
      const m = out.get(s);
      if (!m.has(key)) m.set(key, { n: 0, forms: new Map() });
      const e = m.get(key); e.n++; e.forms.set(eng, (e.forms.get(eng) || 0) + 1);
    }
  }
  // show each rendering in its most common capitalisation ("God", not "god")
  for (const [s, m] of out) out.set(s, new Map([...m.values()].map(e => [[...e.forms].sort((a, b) => b[1] - a[1])[0][0], e.n])));
  return out;
}
