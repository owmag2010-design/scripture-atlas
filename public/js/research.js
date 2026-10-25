// Research helpers: English → original-word index, distributions, shared words, and the knowledge-graph layout.
// Pure functions, tested in test/research.test.mjs. The pages live in app.js.

const STOP = new Set("a an the of to in on at by for from with and or but not no is are was were be been am i me my we us our you your he him his she her it its they them their this that these those who whom which what there here then than so as if into upon unto out up down over under shall will would should may might can could do does did has have had let o oh also even very".split(" "));

/** A light, consistent stemmer applied to both the index and the query (love, loved, loving → lov). */
export function stem(word) {
  let w = String(word).toLowerCase().replace(/[’']s$/, "").replace(/[^a-z]/g, "");
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) w = w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  if (w.endsWith("e") && w.length > 3) w = w.slice(0, -1);
  return w;
}

/** Content-word stems in an English gloss such as "[the] shepherds of" → ["shepherd"]. */
export function glossStems(gloss) {
  return (String(gloss).toLowerCase().match(/[a-z’']+/g) || []).filter(w => w.length > 2 && !STOP.has(w.replace(/[’']s$/, ""))).map(stem);
}

/**
 * Build the English → Strong's index from tagged words.
 * words: iterable of [text, translit, gloss, strong, …]. Returns Map(stem → Map(strong → count)).
 */
export function buildEnglishIndex(words) {
  const idx = new Map();
  for (const w of words) {
    const k = w[3];
    if (!k || /^H9\d\d\d/.test(k)) continue; // Hebrew prefixes and suffixes carry no topic
    for (const s of new Set(glossStems(w[2]))) {
      if (!idx.has(s)) idx.set(s, new Map());
      const m = idx.get(s); m.set(k, (m.get(k) || 0) + 1);
    }
  }
  return idx;
}

/** Keep the original words that translate a stem often enough to matter: [[strong, count], …], most frequent first. */
export function topStrongs(counts, { min = 2, share = 0.03, limit = 8 } = {}) {
  const list = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = list.reduce((n, [, c]) => n + c, 0);
  return list.filter(([, c]) => c >= min && c / total >= share).slice(0, limit);
}

/** Occurrences per book (66 numbers) from packed verse refs (book×1e6 + chapter×1e3 + verse). */
export function distribution(refs) {
  const out = new Array(66).fill(0);
  for (const n of refs) { const b = Math.floor(n / 1e6); if (b >= 0 && b < 66) out[b]++; }
  return out;
}

/** Strong's numbers two verses share, in the order they appear in the first. Prefixes and pure grammar words are skipped. */
export function sharedStrongs(wordsA, wordsB, isGrammar = () => false) {
  const inB = new Set(wordsB.map(w => w[3]).filter(Boolean));
  const seen = new Set(), out = [];
  for (const w of wordsA) {
    const k = w[3];
    if (!k || seen.has(k) || !inB.has(k) || /^H9\d\d\d/.test(k) || isGrammar(k)) continue;
    seen.add(k); out.push(k);
  }
  return out;
}

export const NODE_TYPES = {
  word: { label: "Hebrew and Greek words", short: "Word" },
  person: { label: "People", short: "Person" },
  place: { label: "Places", short: "Place" },
  event: { label: "Events", short: "Event" },
  verse: { label: "Connected verses", short: "Verse" },
  family: { label: "Family", short: "Family" }
};

/**
 * Lay out a radial graph. groups: [{ type, nodes: [{ id, label, … }] }] in the order they go round the circle.
 * Returns { centre: {x, y}, nodes: [{ …node, type, x, y, anchor }] }. Sector size grows with the group's size.
 */
export function radialLayout(groups, { w = 800, h = 560, rx = 250, ry = 190 } = {}) {
  const cx = w / 2, cy = h / 2;
  const live = groups.filter(g => g.nodes.length);
  const weight = g => Math.max(2, g.nodes.length) + 1; // +1 leaves a gap between groups
  const total = live.reduce((n, g) => n + weight(g), 0);
  const out = [];
  let start = -Math.PI / 2; // twelve o'clock
  for (const g of live) {
    const span = (weight(g) / total) * Math.PI * 2;
    const usable = span * (1 - 1 / weight(g)); // the gap
    const stagger = g.nodes.length > 4;
    g.nodes.forEach((n, i) => {
      const a = start + (g.nodes.length === 1 ? usable / 2 : (usable * i) / (g.nodes.length - 1));
      const k = stagger && i % 2 ? 0.78 : 1;
      const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
      out.push({ ...n, type: g.type, x: Math.round(x), y: Math.round(y), anchor: x > cx + 12 ? "start" : x < cx - 12 ? "end" : "middle" });
    });
    start += span;
  }
  return { centre: { x: cx, y: cy }, nodes: out };
}

export const clip = (s, n = 24) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
