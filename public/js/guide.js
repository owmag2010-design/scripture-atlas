const pl = (n, one, many) => `${typeof n === "number" ? n.toLocaleString() : n} ${Number(String(n).replace(/[^0-9.-]/g, "")) === 1 ? one : many}`;
// Study guide builder: pure helpers (tested in test/guide.test.mjs). The page itself lives in app.js.

const STOP = new Set(("a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours out over own said same say says shall she should so some such than that the their theirs them then there these they this those through thus to too under until unto up upon us very was we were what when where which while who whom why will with would ye yet you your yours thee thou thy thine hath doth art shalt wilt hast didst dost unto lo behold also even every one came come went go saying").split(" "));

/** Repeated content words in a passage, most frequent first: [[word, count], …] (count ≥ 2). */
export function repeatedWords(texts, limit = 8) {
  const counts = new Map();
  for (const t of texts) for (const w of String(t).toLowerCase().replace(/[’‘]/g, "'").match(/\p{L}[\p{L}']*/gu) || []) {
    const word = w.replace(/'s$/, "");
    if (word.length < 3 || STOP.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

/**
 * Choose key original-language words for a passage.
 * words: [[text, translit, gloss, strong, …]] across the passage; lex: Map(strong → {n}).
 * Ranks lexical words by how often they recur in the passage, then by rarity in the whole Bible.
 */
export function keyLemmas(words, lex, limit = 5) {
  const seen = new Map();
  for (const w of words) {
    const k = w[3];
    if (!k || /^H90\d\d/.test(k)) continue;
    const e = lex.get(k); if (!e) continue;
    if (e.pos && !/^[HGA]:(N|V|A)/.test(e.pos)) continue; // nouns, verbs, adjectives only; no pronouns, particles or names
    if (!seen.has(k)) seen.set(k, { strong: k, form: w[0], translit: w[1], gloss: w[2], inPassage: 0, total: e.n });
    seen.get(k).inPassage++;
  }
  const common = x => x.total > 2000; // articles, conjunctions, "LORD", "God", "say" …
  return [...seen.values()].filter(x => !common(x)).sort((a, b) => b.inPassage - a.inPassage || a.total - b.total).slice(0, limit);
}

/** Combine cross references from several verses: [[to, votes, toEnd?]] lists → top unique targets outside the passage. */
export function mergeCrossRefs(lists, inPassage, limit = 8) {
  const best = new Map();
  for (const list of lists) for (const [to, votes, toEnd] of list || []) {
    if (inPassage(to)) continue;
    const prev = best.get(to);
    if (!prev || votes > prev[1]) best.set(to, [to, votes, toEnd]);
  }
  return [...best.values()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

const GENRE = {
  "Law": ["What does this passage show about God's covenant with Israel?", "What instruction is given, and what purpose does it serve?", "How does the story or law fit the journey from Egypt to the promised land?"],
  "History": ["Who acts, and what choices do they make?", "How does the narrator signal approval or disapproval?", "Where is God at work, openly or behind the scenes?"],
  "Wisdom and Poetry": ["What images or comparisons does the writer use, and what do they convey?", "Which lines echo or contrast with each other (parallelism)?", "What feelings does the passage express, and how are they brought to God?"],
  "Major Prophets": ["What situation is the prophet addressing?", "What is the charge, and what is the hope?", "How might the first hearers have responded?"],
  "Minor Prophets": ["What situation is the prophet addressing?", "What is the charge, and what is the hope?", "How might the first hearers have responded?"],
  "Gospels and Acts": ["What does this passage reveal about who Jesus is?", "How do the people around Jesus respond, and why?", "Where does this episode fall in the larger story?"],
  "Pauline Letters": ["What problem or question in the church is being addressed?", "Follow the argument: what are the key 'therefore', 'because' and 'but' words?", "What does the writer want the readers to believe or do?"],
  "General Letters": ["What pressures are the readers facing?", "What does the writer urge them to hold on to?", "How is the teaching grounded in who God is or what Christ has done?"],
  "Apocalyptic": ["What symbols appear, and where else in Scripture do they come from?", "What does the vision reveal about God's rule over history?", "What encouragement or warning would the first readers take from it?"]
};
export const OBSERVE = ["Who is speaking, and to whom?", "What happens, or what is said, in order?", "Which words or ideas repeat?", "What surprised you?"];
export const APPLY = ["What does this passage show you about God?", "What does it show you about people, and about yourself?", "Is there something to believe, to stop, to start, or to give thanks for?", "Who could you share this with this week?"];
export const interpretQuestions = group => [...(GENRE[group] || GENRE["History"]), "What would this passage have meant to its first readers before it meant anything to us?"];

/** Markdown export of a completed guide. */
export function guideMarkdown(g) {
  const ans = k => (g.answers?.[k] || "").trim();
  const q = (list, prefix) => list.map((x, i) => `**${x}**\n\n${ans(prefix + i) || "_(not answered)_"}\n`).join("\n");
  return `# Study guide: ${g.title}

${g.translation}, exported ${g.date}

## 1. Read

${g.verses.map(([n, t]) => `**${n}** ${t}`).join(" ")}

## 2. Background

${g.background}

## 3. Observe

Repeated words: ${g.repeated.map(([w, n]) => `${w} (${n})`).join(", ") || "none"}

${q(OBSERVE, "o")}
## 4. Key words in the original

${g.keyWords.map(k => `- **${k.form}** (${k.translit}) "${k.gloss}", ${k.strong}, used ${pl(k.total, "time", "times")} in the Bible`).join("\n") || "None found."}

## 5. Connect

${g.crossRefs.map(([ref, text]) => `- **${ref}**: ${text}`).join("\n") || "None found."}

## 6. Interpret

${q(g.interpret, "i")}
## 7. Apply

${q(APPLY, "a")}
---
Built with Ereunia. Sources: ${g.sources}.
`;
}
