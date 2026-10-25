// Scripture Atlas — Phases 1–2. Hash routes:
//   #/                      home
//   #/read/<t>/<OSIS>       reader, e.g. #/read/kjv/John.3.16
//   #/search/<query>        search
//   #/word/<Strong>         lexicon entry and occurrences, e.g. #/word/G0026
//   #/history[/map|timeline|people]  #/person/<slug>  #/place/<slug>
//   #/learn  #/learn/<course>  #/learn/<course>/<lesson>
//   #/languages  #/study  #/library  #/soon/<section>
//   #/research[/<OSIS>|/topic/<q>|/person/<slug>|/place/<slug>]  knowledge graph and topic research
import { BOOKS, NAMES, GROUPS, groupOf, testamentOf, fileId } from "./books.js";
import { parseReference, formatRef, toOsis, fromOsis } from "./ref.js";
import { parseQuery, searchCorpus, highlightTerms, escapeHtml as esc } from "./search.js";
import { createStore, exportMarkdown } from "./store.js";
import { CONTEXT } from "./context.js";
import { DAILY, QUESTIONS, TEXT_NOTES, SOURCES, MANUSCRIPTS, SOON } from "./content.js";
import { yearText, dateCertainty, PRECISION, inMapBox } from "./history.js";
import { mountMap } from "./atlas-map.js";
import { COURSES, PLANNED, STATUS } from "./courses.js";
import { SECTIONS } from "./ai-core.js";
import { HISTORY, NOT_HOSTED } from "./translations-info.js";
import { stem, glossStems, distribution, sharedStrongs, radialLayout, NODE_TYPES, clip } from "./research.js";
import { repeatedWords, keyLemmas, mergeCrossRefs, interpretQuestions, guideMarkdown, OBSERVE, APPLY } from "./guide.js";
import { describeMorph, languageOf, normaliseStrong, shardOf, displayStrong, isGrammaticalStrong, editionNote } from "./lang.js";

let storage = null;
try { storage = window.localStorage; } catch { storage = null; }
const store = createStore(storage);
const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");
const TR = { kjv: "KJV", web: "WEB" };
const META = { kjv: { id: "kjv", name: "King James Version", languageEn: "English", language: "English", code: "eng", dir: "ltr", licence: "Public domain (Crown patent in the UK)", source: "https://github.com/thiagobodruk/bible" }, web: { id: "web", name: "World English Bible", languageEn: "English", language: "English", code: "eng", dir: "ltr", licence: "Public domain", source: "https://ebible.org/web/" } };
let CATALOGUE = [];
const dirOf = t => META[t]?.dir || "ltr";
const langOf = t => META[t]?.code || "en";
const compareWith = () => { const c = store.setting("compare", store.setting("parallel", false) ? "web" : ""); return c && TR[c] ? c : ""; };
function translationOptions(selected, { none = "" } = {}) {
  const groups = new Map([["English", []]]);
  for (const t of [META.kjv, META.web, ...CATALOGUE]) { if (!groups.has(t.languageEn)) groups.set(t.languageEn, []); groups.get(t.languageEn).push(t); }
  const sorted = [["English", groups.get("English")], ...[...groups].filter(([k]) => k !== "English").sort((a, b) => a[0].localeCompare(b[0]))];
  return (none ? `<option value="">${none}</option>` : "") + sorted.map(([lang, list]) => `<optgroup label="${esc(lang)}">${list.map(t => `<option value="${t.id}" ${t.id === selected ? "selected" : ""}>${esc(t.id === "kjv" || t.id === "web" ? t.name : t.name)}</option>`).join("")}</optgroup>`).join("");
}
const HL = ["gold", "lapis", "rose", "sage"];
let INDEX = null;
const cache = new Map();

/* ---------- data ---------- */
async function getIndex() {
  if (!INDEX) {
    const [idx, cat] = await Promise.all([fetch("data/index.json").then(r => r.json()), fetch("data/bible/catalogue.json").then(r => r.json()).catch(() => [])]);
    CATALOGUE = cat;
    cat.forEach(c => { META[c.id] = c; TR[c.id] = c.name.length > 34 ? c.name.slice(0, 32) + "…" : c.name; });
    INDEX = idx;
  }
  return INDEX;
}
const chapterCount = i => INDEX.books[i].verses.length;
function loadBook(t, i) {
  const k = `${t}/${i}`;
  const core = t === "kjv" || t === "web";
  if (!cache.has(k)) cache.set(k, fetch(core ? `data/${t}/${fileId(i)}.json` : `data/bible/${t}/${fileId(i)}.bin`).then(async r => {
    if (!r.ok) throw new Error(r.status);
    if (core) return r.json();
    return new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).json();
  }).catch(e => { cache.delete(k); throw e; }));
  return cache.get(k);
}
const loadAll = t => Promise.all(BOOKS.map(b => loadBook(t, b.i)));
function loadJson(url) {
  if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { cache.delete(url); throw e; }));
  return cache.get(url);
}
const loadOrig = (b, c) => loadJson(`data/orig/${fileId(b)}/${String(c).padStart(3, "0")}.json`);
const loadMorph = () => loadJson("data/morph.json");
const loadXref = b => loadJson(`data/xref/${fileId(b)}.json`);
async function loadLex(key) { const shard = await loadJson(`data/lex/${shardOf(key)}.json`); return shard[key] || null; }
const H = {
  people: () => loadJson("data/hist/people.json"), places: () => loadJson("data/hist/places.json"),
  events: () => loadJson("data/hist/events.json"), base: () => loadJson("data/hist/basemap.json"),
  vx: b => loadJson(`data/hist/vx/${fileId(b)}.json`),
  shard: s => (s[0] || "_").toLowerCase().replace(/[^a-z]/, "_"),
  async person(slug) { return (await loadJson(`data/hist/people/${H.shard(slug)}.json`))[slug] || null; },
  async place(slug) { return (await loadJson(`data/hist/places/${H.shard(slug)}.json`))[slug] || null; },
  async peopleMap() { if (!H._pm) H._pm = new Map((await H.people()).map(r => [r[0], r])); return H._pm; },
  async placeMap() { if (!H._lm) H._lm = new Map((await H.places()).map(r => [r[0], r])); return H._lm; },
  async eventMap() { if (!H._em) H._em = new Map((await H.events()).map(e => [e.id, e])); return H._em; }
};
const certChip = y => { const c = dateCertainty(y); return `<span class="cert ${c.level}" title="${esc(c.note)}">${c.label}</span>`; };
const unpackRef = n => ({ book: Math.floor(n / 1e6), chapter: Math.floor(n / 1e3) % 1e3, verse: n % 1e3 });
async function verseText(t, osis) {
  const r = fromOsis(osis); if (!r) return "";
  const b = await loadBook(t, r.book);
  return b.chapters[r.chapter - 1]?.[r.verse - 1] ?? "";
}
const anyText = async osis => (await verseText("kjv", osis).catch(() => "")) || (await verseText("web", osis).catch(() => ""));
const orderOf = osis => { const r = fromOsis(osis); return r ? r.book * 1e6 + r.chapter * 1e3 + (r.verse || 0) : 0; };
const labelOf = osis => { const r = fromOsis(osis); return r ? formatRef(r.book, r.chapter, r.verse) : osis; };

/* ---------- ui helpers ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2200);
}
function setNav(key) {
  document.querySelectorAll("nav.main a").forEach(a => a.classList.toggle("on", a.dataset.nav === key));
}
function setTitle(s) { document.title = s ? `${s} · Scripture Atlas` : "Scripture Atlas · Owen Magocha"; }
const readUrl = (t, book, chapter, verse) => `#/read/${t}/${toOsis(book, chapter, verse)}`;
const inLink = (title, desc, target, tab = false) => `<li><a href="${tab ? "#" : target}" ${tab ? `data-gotab="${target}"` : ""}><span><span class="t">${title}</span><span class="d">${desc}</span></span><span class="arr" aria-hidden="true">›</span></a></li>`;
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); toast("Copied"); }
  catch { toast("Copy is blocked here; select the text instead"); }
}
function goSearch(q) {
  q = q.trim(); if (!q) return;
  const sk = normaliseStrong(q);
  if (sk) { location.hash = `#/word/${sk}`; return; }
  const r = parseReference(q, chapterCount);
  if (r) location.hash = readUrl(store.setting("translation", "kjv"), r.book, r.chapter, r.verse);
  else location.hash = `#/search/${encodeURIComponent(q)}`;
}

/* ---------- theme ---------- */
$("#theme").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const next = dark ? "light" : "dark";
  document.documentElement.dataset.theme = next; store.setSetting("theme", next);
});
$("#gsearch").addEventListener("submit", e => { e.preventDefault(); goSearch($("#gq").value); });

/* ---------- home ---------- */
async function renderHome() {
  setNav("home"); setTitle("");
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const votd = DAILY[day % DAILY.length];
  const pos = store.position();
  const hist = store.history().slice(0, 8);
  const posRef = pos && fromOsis(pos.osis);
  view.innerHTML = `
  <section class="hero">
    <span class="eyebrow">Scripture Atlas · Bible study and research</span>
    <h1>Read the Bible with its <em>history</em>, languages and sources in view.</h1>
    <p>54 complete Bibles in 38 languages, the Hebrew and Greek beneath them word by word, background for all 66 books, and cross references for every verse.</p>
    <form class="bigsearch" id="bigsearch" role="search"><label class="sr" for="bq">Search</label>
      <input id="bq" type="search" placeholder="Try covenant, &quot;bread of life&quot; or Romans 8:28" autocomplete="off"><button>Search</button></form>
    <div class="tryline"><span class="small">Try</span>
      <button data-q="Genesis 1">Genesis 1</button><button data-q="Psalm 23">Psalm 23</button><button data-q="&quot;in the beginning&quot;">"in the beginning"</button><button data-q="John 1">John 1</button><button data-q="covenant">covenant</button></div>
  </section>
  <div class="homegrid">
    <section class="card votd span7"><span class="eyebrow">Verse for today</span>
      <blockquote id="votd">…</blockquote>
      <div class="actions"><a class="btn" href="${readUrl("kjv", fromOsis(votd).book, fromOsis(votd).chapter, fromOsis(votd).verse)}">Read in context</a><a class="btn" href="${readUrl("kjv", fromOsis(votd).book, fromOsis(votd).chapter, fromOsis(votd).verse)}">Study this verse</a></div>
    </section>
    <section class="card resume span5"><span class="eyebrow">${posRef ? "Continue reading" : "Start reading"}</span>
      ${posRef
        ? `<h2>${formatRef(posRef.book, posRef.chapter)}</h2><p class="small">${TR[pos.translation] || "KJV"} · last opened ${new Date(pos.at).toLocaleDateString()}</p><a class="btn pri" href="${readUrl(pos.translation || "kjv", posRef.book, posRef.chapter, pos.verse ? fromOsis(pos.verse)?.verse : null)}">Resume where you stopped</a>`
        : `<h2>Genesis 1</h2><p class="small">Or open any book from the reader.</p><a class="btn pri" href="#/read/kjv/Gen.1">Open the reader</a>`}
      ${hist.length > 1 ? `<p class="small" style="margin:14px 0 0">Recently read</p><ul class="history">${hist.map(h => { const r = fromOsis(h.osis); return `<li><a href="${readUrl(h.translation || "kjv", r.book, r.chapter)}">${formatRef(r.book, r.chapter)}</a></li>`; }).join("")}</ul>` : ""}
    </section>
    <a class="card entry span3" href="#/read/kjv/Gen.1"><span class="eyebrow">Read</span><h3>The reading room</h3><p class="small">KJV and WEB, side by side if you like. Tap any verse for background, research links, highlights and notes.</p></a>
    <a class="card entry span3" href="#/languages"><span class="eyebrow">Languages</span><h3>Hebrew and Greek, word by word</h3><p class="small">Interlinear for every verse, with grammar, lexicon entries and every occurrence of each word.</p></a>
    <a class="card entry span3" href="#/history/map"><span class="eyebrow">History</span><h3>Map, timeline and people</h3><p class="small">1,267 places, 450 events and 3,067 people, with family trees and an honest label on every date and location.</p></a>
    <a class="card entry span3" href="#/learn"><span class="eyebrow">Learn</span><h3>Courses and quizzes</h3><p class="small">Bible foundations, Genesis, the life of Jesus and first steps in Hebrew, with a family mode.${store.streak() ? ` Your streak: ${store.streak()} day${store.streak() === 1 ? "" : "s"}.` : ""}</p></a>
    <section class="card span12"><span class="eyebrow">What is here now, and what comes next</span>
      <div class="roadmap">
        <div class="now"><b>Phase 1 · live</b><span class="small">Reader, search, background, notes</span></div>
        <div class="now"><b>Phase 2 · live</b><span class="small">Hebrew and Greek, cross references</span></div>
        <div class="now"><b>Phase 3 · AI live</b><span class="small">Source-checked assistant; accounts next</span></div>
        <div class="now"><b>Phase 4 · live</b><span class="small">Maps, timeline, people</span></div>
        <div class="now"><b>Phase 5 · live</b><span class="small">Courses, quizzes, family mode</span></div>
      </div>
    </section>
  </div>`;
  $("#bigsearch").addEventListener("submit", e => { e.preventDefault(); goSearch($("#bq").value); });
  view.querySelectorAll(".tryline button").forEach(b => b.addEventListener("click", () => goSearch(b.dataset.q)));
  try {
    const t = await verseText("kjv", votd);
    $("#votd").innerHTML = `${esc(t)}<br><cite>${labelOf(votd)} · KJV</cite>`;
  } catch { $("#votd").textContent = labelOf(votd); }
}

/* ---------- reader ---------- */
const R = { t: "kjv", book: 0, chapter: 1, verse: null, word: null, tab: "verse" };

function timelineSvg(x) {
  const lo = -1500, hi = 150, W = 320, pad = 14, sx = y => pad + (y - lo) / (hi - lo) * (W - 2 * pad);
  const x1 = sx(x[2]), x2 = Math.max(sx(x[3]), x1 + 4);
  const fy = y => (y < 0 ? `${-y} BC` : `AD ${y}`);
  const label = x[2] === x[3] ? fy(x[2]) : `${fy(x[2])} – ${fy(x[3])}`;
  const ticks = [-1500, -1000, -500, 1, 150];
  return `<svg viewBox="0 0 ${W} 58" role="img" aria-label="Proposed composition dates ${label}">
    <line x1="${pad}" y1="30" x2="${W - pad}" y2="30" stroke="var(--line)" stroke-width="2"/>
    ${ticks.map(t => `<line x1="${sx(t)}" y1="25" x2="${sx(t)}" y2="35" stroke="var(--muted)"/><text x="${sx(t)}" y="52" fill="var(--muted)" font-size="10" font-family="Alegreya Sans, sans-serif" text-anchor="${t === -1500 ? "start" : t === 150 ? "end" : "middle"}">${t === 1 ? "BC | AD" : fy(t)}</text>`).join("")}
    <rect x="${x1}" y="24" width="${x2 - x1}" height="12" rx="3" fill="var(--rubric)" opacity=".85"/>
    <text x="${Math.min(Math.max((x1 + x2) / 2, 50), W - 50)}" y="15" fill="var(--ink)" font-size="11" text-anchor="middle" font-family="Alegreya Sans, sans-serif">${label}</text></svg>`;
}

function backgroundPane() {
  const x = CONTEXT[R.book];
  const [kc, kv] = x[6].split(":").map(Number);
  return `<div class="pane">
    <div><span class="eyebrow">${testamentOf(R.book)} · ${groupOf(R.book)} · ${chapterCount(R.book)} chapter${chapterCount(R.book) > 1 ? "s" : ""}</span><h2>${NAMES[R.book]}</h2></div>
    <dl class="facts">
      <dt>Author</dt><dd>${esc(x[0])}</dd><dt>Date</dt><dd>${esc(x[1])}</dd>
      <dt>Setting</dt><dd>${esc(x[4])}</dd><dt>Themes</dt><dd>${esc(x[5])}</dd>
      <dt>Key text</dt><dd><a href="${readUrl(R.t, R.book, kc, kv)}">${formatRef(R.book, kc, kv)}</a></dd>
    </dl>
    <div class="timeline"><span class="eyebrow">Range of proposed composition dates</span>${timelineSvg(x)}</div>
    <p class="small">Scripture Atlas editorial note. Where tradition and academic scholarship differ, both are given; neither is presented as settled.</p>
    <ul class="linklist">
      ${inLink(`Study guide for ${formatRef(R.book, R.chapter)}`, "Observe, key words, connections, questions", `#/guide/${BOOKS[R.book].osis}.${R.chapter}`)}
      ${inLink("People, places and events in this chapter", "From the History data", "people", true)}
      ${inLink(`${NAMES[R.book]} on the timeline`, "When it happened, and how sure we are", "#/history/timeline")}
    </ul></div>`;
}

async function versePane() {
  if (!R.verse) return `<div class="pane"><h2>Choose a verse</h2><p class="small">Tap or click any verse to see it in both translations, research it in the original languages, see its connections, highlight it, bookmark it, or write a note.</p><details open><summary>Questions to bring to any passage</summary><ol>${QUESTIONS.map(q => `<li>${q}</li>`).join("")}</ol></details></div>`;
  const osis = toOsis(R.book, R.chapter, R.verse);
  const other = compareWith() && compareWith() !== R.t ? compareWith() : (R.t === "kjv" ? "web" : "kjv");
  const [mine, theirs] = await Promise.all([verseText(R.t, osis), verseText(other, osis)]);
  const c = R.chapter, v = R.verse;
  const note = TEXT_NOTES[osis];
  const noteHtml = note === "absent"
    ? `<div class="textnote"><b>Textual note</b><br>The KJV includes this verse from the Textus Receptus. The World English Bible follows a Greek text in which it is absent; it is missing from the oldest manuscripts. See <a href="#/library">Manuscripts</a> for how the texts differ.</div>`
    : note === "doxology"
      ? `<div class="textnote"><b>Textual note</b><br>Manuscripts place the closing doxology of Romans in different positions. The KJV prints it at 16:25–27; the World English Bible prints it at 14:24–26.</div>` : "";
  const hl = store.highlight(osis), bm = store.isBookmarked(osis);
  return `<div class="pane">
    <div><span class="chip scripture">Scripture · ${TR[R.t]}</span><div class="vref" style="margin-top:6px">${formatRef(R.book, c, v)}</div></div>
    <p class="vtext" dir="${dirOf(R.t)}" lang="${langOf(R.t)}">${mine ? esc(mine).replace(/\n/g, "<br>") : "<em>Not in this translation's base text.</em>"}</p>
    <div class="compare"><span class="chip scripture">Translation · ${TR[other]}</span><p class="vtext" style="margin-top:6px" dir="${dirOf(other)}" lang="${langOf(other)}">${theirs ? esc(theirs).replace(/\n/g, "<br>") : "<em>Not in this translation's base text.</em>"}</p></div>
    ${noteHtml}
    <div class="actions" aria-label="Verse actions">
      <button class="btn ${bm ? "on" : ""}" id="bmk" type="button" aria-pressed="${bm}">${bm ? "Bookmarked" : "Bookmark"}</button>
      <button class="btn" id="cpy" type="button">Copy</button>
      <span class="small" style="margin-left:4px">Highlight</span>
      ${HL.map(h => `<button type="button" class="swatch sw-${h}" data-hl="${h}" aria-label="Highlight ${h}" aria-pressed="${hl === h}"></button>`).join("")}
      <button type="button" class="swatch sw-none" data-hl="" aria-label="Remove highlight"></button>
    </div>
    <div><h3>Your note</h3><label class="sr" for="note">Note on ${formatRef(R.book, c, v)}</label>
      <textarea id="note" placeholder="What do you notice in ${formatRef(R.book, c, v)}?">${esc(store.note(osis))}</textarea>
      <span class="small" id="saved">Saved on this device as you type.</span></div>
    <div><h3>Research this verse</h3>
    <ul class="linklist">
      ${inLink(R.book < 39 ? "Hebrew words of this verse" : "Greek words of this verse", "Each word with its grammar, dictionary entry and other uses", "words", true)}
      ${inLink("Cross references", "The passages readers most often link to this verse", "xref", true)}
      ${inLink("Connections", "Words, people, places and linked verses as a graph", `#/research/${osis}`)}
      ${inLink("This verse in every translation", `All ${allTranslations().length} Bibles, side by side`, `#/compare/${osis}`)}
      ${inLink("People and places", "Who and where this verse mentions", "people", true)}
    </ul>
    <p class="small">Strong's numbers are an index to words, not full definitions. Use the Hebrew-Greek tab for the words of this verse.</p></div>
    <div class="actions"><a class="btn" href="#/research/${osis}">Explore connections</a><a class="btn" href="#/ai/${osis}">Ask the research assistant</a><a class="btn" href="#/guide/${BOOKS[R.book].osis}.${c}">Study guide for this chapter</a></div>
    <details><summary>Study questions</summary><ol>${QUESTIONS.map(q => `<li>${q}</li>`).join("")}</ol></details>
  </div>`;
}

function wordButton(w, i, v, sel) {
  return `<button type="button" class="wb${sel ? " on" : ""}${w[6] ? " fl-" + w[6] : ""}" data-v="${v}" data-w="${i}"><span class="ow">${esc(w[0])}</span><span class="tl">${esc(w[1])}</span><span class="gl">${esc(w[2])}</span></button>`;
}

async function wordsPane() {
  if (!R.verse) return `<div class="pane"><h2>Original words</h2><p class="small">Choose a verse to see its ${R.book < 39 ? "Hebrew" : "Greek"} words, then tap a word for its dictionary form, grammar, meaning and every other place it appears.</p></div>`;
  const c = await loadOrig(R.book, R.chapter);
  const words = c.verses[R.verse - 1] || [];
  const lang = R.book < 39 ? "Hebrew" : "Greek";
  if (!words.length) return `<div class="pane"><h2>Original words</h2><p class="small">No ${lang} words are recorded for ${formatRef(R.book, R.chapter, R.verse)}. ${R.book === 5 ? "Joshua 21:36–37 are not in the Leningrad Codex, the manuscript behind the Hebrew text here; they appear in other Hebrew manuscripts and the Septuagint." : ""}</p></div>`;
  const rtl = c.lang === "hbo";
  const card = R.word != null && words[R.word] ? await wordCard(words[R.word], R.book) : `<p class="small">Tap a word for its full entry.</p>`;
  return `<div class="pane">
    <div><span class="chip lang">${[...new Set(words.map(w => languageOf(w[5], R.book)))].join(" and ")} · ${R.book < 39 ? "Leningrad Codex" : "Greek NT"}</span><div class="vref" style="margin-top:6px">${formatRef(R.book, R.chapter, R.verse)}</div></div>
    <div class="wordrow" dir="${rtl ? "rtl" : "ltr"}" lang="${rtl ? "hbo" : "grc"}">${words.map((w, i) => wordButton(w, i, R.verse, i === R.word)).join("")}</div>
    <div id="wordcard">${card}</div>
    <p class="small">Data: STEPBible.org (Tyndale House, Cambridge), CC BY 4.0. Glosses are word-level aids, not a translation.</p>
  </div>`;
}

async function wordCard(w, book) {
  const [morph, entry] = await Promise.all([loadMorph(), w[3] ? loadLex(w[3]).catch(() => null) : null]);
  const parts = describeMorph(w[5], morph);
  const rtl = book < 39;
  const note = editionNote(w[6]);
  const prefixes = (w[4] || "").split("/").filter(k => k && k !== w[3]);
  return `<article class="wordcard">
    <div class="wchead"><span class="big" dir="${rtl ? "rtl" : "ltr"}" lang="${rtl ? "hbo" : "grc"}">${esc(w[0])}</span><span class="small">${esc(w[1])}</span></div>
    <p class="wgloss">“${esc(w[2])}” <span class="small">in this verse</span></p>
    ${note ? `<div class="textnote"><b>Textual note</b><br>${note}</div>` : ""}
    <dl class="facts">
      <dt>Grammar</dt><dd>${parts.map(p => `<div><b>${esc(p.summary)}</b>${p.fields.some(f => f.note) ? `<span class="small"> (${esc(p.fields.filter(f => f.note).map(f => f.note).join("; "))})</span>` : ""}</div>`).join("")}<span class="small mono">${esc(w[5])}</span></dd>
      ${entry ? `<dt>Dictionary</dt><dd><span class="lemma" dir="${rtl ? "rtl" : "ltr"}">${esc(entry.lemma)}</span> <span class="small">${esc(entry.translit.replace(/\./g, ""))}</span><br>${esc(entry.gloss)}</dd>
      <dt>Strong's</dt><dd><a href="#/word/${w[3]}">${displayStrong(w[3])}</a>${prefixes.length ? ` <span class="small">with ${prefixes.map(displayStrong).join(", ")}</span>` : ""}<br><span class="small">An index number for the dictionary form, not a definition.</span></dd>
      <dt>Used</dt><dd>${entry.n.toLocaleString()} time${entry.n === 1 ? "" : "s"} in ${entry.refs.length.toLocaleString()} verse${entry.refs.length === 1 ? "" : "s"}. <a href="#/word/${w[3]}">See them all</a></dd>` : ""}
    </dl>
    ${entry?.def ? `<details><summary>Lexicon entry</summary><div class="lexdef">${entry.def}</div><p class="small">Source: STEPBible Translators Brief Lexicon (${book < 39 ? "TBESH, based on BDB" : "TBESG, based on Abbott-Smith"}), CC BY 4.0.</p></details>` : ""}
  </article>`;
}

async function peoplePane() {
  const [vx, pm, lm, em] = await Promise.all([H.vx(R.book), H.peopleMap(), H.placeMap(), H.eventMap()]);
  let ppl = new Set(), pls = new Set(), evs = new Set(), scope;
  if (R.verse) {
    const r = vx[R.book * 1e6 + R.chapter * 1e3 + R.verse] || [[], [], []];
    r[0].forEach(x => ppl.add(x)); r[1].forEach(x => pls.add(x)); r[2].forEach(x => evs.add(x));
    scope = formatRef(R.book, R.chapter, R.verse);
  } else {
    for (const [k, r] of Object.entries(vx)) if (Math.floor(k / 1e3) % 1e3 === R.chapter) { r[0].forEach(x => ppl.add(x)); r[1].forEach(x => pls.add(x)); r[2].forEach(x => evs.add(x)); }
    scope = `${formatRef(R.book, R.chapter)} (whole chapter)`;
  }
  const P = [...ppl].map(s => pm.get(s)).filter(Boolean).sort((a, b) => b[5] - a[5]);
  const L = [...pls].map(s => lm.get(s)).filter(Boolean);
  const E = [...evs].map(i => em.get(i)).filter(Boolean);
  if (!P.length && !L.length && !E.length) return `<div class="pane"><h2>People and places</h2><p class="small">No people, places or events are tagged in ${scope}.</p></div>`;
  return `<div class="pane"><div><span class="chip">People, places, events</span><div class="vref" style="margin-top:6px">${scope}</div></div>
    ${E.length ? `<div><h3>Events</h3><ul class="evlist">${E.map(e => `<li><span class="yr">${yearText(e.year)}</span> ${certChip(e.year)}<br><a href="#/history/timeline#e${e.id}">${esc(e.title)}</a></li>`).join("")}</ul></div>` : ""}
    ${P.length ? `<div><h3>People</h3><div class="plist">${P.map(r => `<a href="#/person/${r[0]}"><b>${esc(r[1])}</b><span class="small">${esc(r[3] || "")}</span></a>`).join("")}</div></div>` : ""}
    ${L.length ? `<div><h3>Places</h3><div class="plist">${L.map(r => `<a href="#/place/${r[0]}"><b>${esc(r[1])}</b><span class="small">${esc(r[4] || "Place")} · ${PRECISION[r[5]].label}</span></a>`).join("")}</div></div>` : ""}
    <p class="small">Tagging: Theographic Bible Metadata, CC BY-SA 4.0. Dates follow a traditional chronology; see the timeline for how firm each is.</p></div>`;
}

async function xrefPane() {
  if (!R.verse) return `<div class="pane"><h2>Cross references</h2><p class="small">Choose a verse to see related passages, ranked by how many readers linked them.</p></div>`;
  const key = R.book * 1e6 + R.chapter * 1e3 + R.verse;
  const list = (await loadXref(R.book))[key] || [];
  if (!list.length) return `<div class="pane"><h2>Cross references</h2><p class="small">No cross references are recorded for ${formatRef(R.book, R.chapter, R.verse)}.</p></div>`;
  const top = list[0][1];
  const rows = await Promise.all(list.map(async ([to, votes, toEnd]) => {
    const a = unpackRef(to), e = toEnd ? unpackRef(toEnd) : null;
    const label = e && (e.chapter !== a.chapter || e.book !== a.book) ? `${formatRef(a.book, a.chapter, a.verse)}–${e.chapter}:${e.verse}` : formatRef(a.book, a.chapter, a.verse, e?.verse);
    const text = await verseText(R.t, toOsis(a.book, a.chapter, a.verse)).catch(() => "");
    return `<a class="hit" href="${readUrl(R.t, a.book, a.chapter, a.verse)}"><span class="meta"><span class="ref">${label}</span><span class="votes" title="${votes} reader votes"><i style="width:${Math.max(8, Math.round(votes / top * 100))}%"></i></span></span><span class="tx small-tx">${esc(text)}${e && e.verse !== a.verse ? " …" : ""}</span></a>`;
  }));
  return `<div class="pane"><div><span class="chip">Cross references</span><div class="vref" style="margin-top:6px">${formatRef(R.book, R.chapter, R.verse)}</div></div>
    <div class="results">${rows.join("")}</div>
    <p class="small">Top ${list.length} by reader votes. Data: OpenBible.info, CC BY. A link means readers saw a connection; it is not a claim about the author's intent.</p></div>`;
}

function verseSpan(t, i, text, osis) {
  const cls = ["v"];
  const h = store.highlight(osis); if (h) cls.push("hl-" + h);
  if (store.isBookmarked(osis)) cls.push("bm");
  if (store.note(osis)) cls.push("nt");
  if (R.verse === i + 1) cls.push("sel");
  if (!text) cls.push("absent");
  const body = text ? esc(text).replace(/\n/g, "<br>") : "[not in this translation's base text]";
  return `<span class="${cls.join(" ")}" data-v="${i + 1}" data-t="${t}" id="${t}-v${i + 1}" dir="${dirOf(t)}" lang="${langOf(t)}" tabindex="0" role="button" aria-label="Verse ${i + 1}"><sup class="vn">${i + 1}</sup>${body}</span>`;
}

async function renderChapterText() {
  const box = $("#text");
  const parallel = compareWith() && compareWith() !== R.t ? compareWith() : "";
  const lines = store.setting("lines", false);
  const ch = R.chapter - 1;
  try {
    if (store.setting("interlinear", false)) {
      const [d, o] = await Promise.all([loadBook(R.t, R.book), loadOrig(R.book, R.chapter)]);
      const rtl = o.lang === "hbo";
      box.className = "text inter";
      box.innerHTML = d.chapters[ch].map((v, i) => `<div class="ilv">${verseSpan(R.t, i, v, toOsis(R.book, R.chapter, i + 1))}<div class="wordrow" dir="${rtl ? "rtl" : "ltr"}" lang="${rtl ? "hbo" : "grc"}">${(o.verses[i] || []).map((w, k) => wordButton(w, k, i + 1, R.verse === i + 1 && R.word === k)).join("")}</div></div>`).join("");
      return;
    }
    if (parallel) {
      const [a, b] = await Promise.all([loadBook(R.t, R.book), loadBook(parallel, R.book)]);
      const ka = a.chapters[ch] || [], kb = b.chapters[ch] || [];
      const n = Math.max(ka.length, kb.length);
      let html = `<div class="par"><div class="ph">${esc(META[R.t].name)}</div><div class="ph">${esc(META[parallel].name)}</div>`;
      for (let i = 0; i < n; i++) {
        const osis = toOsis(R.book, R.chapter, i + 1);
        html += i < ka.length ? verseSpan(R.t, i, ka[i], osis) : `<span></span>`;
        html += i < kb.length ? verseSpan(parallel, i, kb[i], osis) : `<span></span>`;
      }
      box.className = "text"; box.innerHTML = html + "</div>";
    } else {
      const d = await loadBook(R.t, R.book);
      const vs = d.chapters[ch];
      if (!vs || !vs.length) { box.innerHTML = `<p class="empty">This translation has no ${formatRef(R.book, R.chapter)}. Its chapters may be numbered differently; try the chapter before or after.</p>`; return; }
      box.dir = dirOf(R.t); box.lang = langOf(R.t);
      const paras = d.paragraphs?.[ch];
      const poetry = vs.some(v => v.includes("\n"));
      if (R.t === "kjv" || lines || !paras) {
        box.className = "text lines";
        box.innerHTML = vs.map((v, i) => verseSpan(R.t, i, v, toOsis(R.book, R.chapter, i + 1))).join("");
      } else {
        box.className = "text" + (poetry ? " poetry" : "");
        let html = "", open = false;
        vs.forEach((v, i) => {
          if (paras.includes(i) || !open) { if (open) html += "</p>"; html += "<p>"; open = true; }
          html += verseSpan(R.t, i, v, toOsis(R.book, R.chapter, i + 1)) + " ";
        });
        box.innerHTML = html + (open ? "</p>" : "");
      }
    }
  } catch {
    box.innerHTML = `<p class="loading">This chapter could not load. Check your connection and <a href="${location.hash}">try again</a>.</p>`;
  }
}

async function renderMargin() {
  const m = $("#margin");
  m.querySelectorAll(".tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === R.tab));
  const pane = $("#pane");
  pane.innerHTML = '<p class="small" style="padding:16px 18px">Loading…</p>';
  try {
    pane.innerHTML = R.tab === "bg" ? backgroundPane() : R.tab === "words" ? await wordsPane() : R.tab === "xref" ? await xrefPane() : R.tab === "people" ? await peoplePane() : await versePane();
  } catch { pane.innerHTML = `<div class="pane"><p class="small">This could not load. Check your connection and try again.</p></div>`; }
  pane.querySelectorAll("[data-gotab]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); R.tab = a.dataset.gotab; renderMargin(); }));
  if (R.tab === "verse" && R.verse) wireVersePane();
}

function wireVersePane() {
  const osis = toOsis(R.book, R.chapter, R.verse);
  const refresh = () => {
    document.querySelectorAll(`[data-v="${R.verse}"]`).forEach(el => {
      el.classList.remove(...HL.map(h => "hl-" + h), "bm", "nt");
      const h = store.highlight(osis); if (h) el.classList.add("hl-" + h);
      if (store.isBookmarked(osis)) el.classList.add("bm");
      if (store.note(osis)) el.classList.add("nt");
    });
  };
  $("#bmk").addEventListener("click", e => {
    const on = store.toggleBookmark(osis);
    e.currentTarget.textContent = on ? "Bookmarked" : "Bookmark";
    e.currentTarget.classList.toggle("on", on); e.currentTarget.setAttribute("aria-pressed", on);
    refresh(); toast(on ? "Bookmarked" : "Bookmark removed");
  });
  $("#cpy").addEventListener("click", async () => copyText(`${await verseText(R.t, osis)} (${labelOf(osis)}, ${TR[R.t]})`));
  document.querySelectorAll("[data-hl]").forEach(b => b.addEventListener("click", () => {
    store.setHighlight(osis, b.dataset.hl || null);
    document.querySelectorAll("[data-hl]").forEach(x => x.setAttribute("aria-pressed", x.dataset.hl === (b.dataset.hl || "-")));
    refresh();
  }));
  let timer;
  $("#note").addEventListener("input", e => {
    clearTimeout(timer);
    timer = setTimeout(() => { store.setNote(osis, e.target.value); $("#saved").textContent = "Saved"; refresh(); }, 300);
  });
}

function selectVerse(v, { scroll = false, open = true, word = null, tab = null } = {}) {
  R.verse = v; R.word = word; R.tab = tab || (R.tab === "bg" ? "verse" : R.tab);
  document.querySelectorAll("#text .v.sel").forEach(el => el.classList.remove("sel"));
  document.querySelectorAll(`#text .v[data-v="${v}"]`).forEach(el => el.classList.add("sel"));
  document.querySelectorAll("#text .wb.on").forEach(el => el.classList.remove("on"));
  if (word != null) document.querySelector(`#text .wb[data-v="${v}"][data-w="${word}"]`)?.classList.add("on");
  const osis = toOsis(R.book, R.chapter, v);
  history.replaceState(null, "", readUrl(R.t, R.book, R.chapter, v));
  store.setPositionVerse(osis);
  if (open) $("#margin").classList.add("open");
  if (open && matchMedia("(max-width: 960px)").matches) document.getElementById(`${R.t}-v${v}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  else if (scroll) document.getElementById(`${R.t}-v${v}`)?.scrollIntoView({ block: "center" });
  renderMargin();
}

async function renderRead(t, osis) {
  setNav("read");
  await getIndex();
  let r = fromOsis(osis || "");
  if (!r) { const p = store.position(); r = (p && fromOsis(p.osis)) || { book: 0, chapter: 1, verse: null }; t = t || p?.translation; }
  R.t = TR[t] ? t : store.setting("translation", "kjv");
  R.book = r.book; R.chapter = Math.min(Math.max(r.chapter, 1), chapterCount(r.book));
  R.word = null;
  R.verse = r.verse; if (!["verse", "words", "xref", "people", "bg"].includes(R.tab)) R.tab = "verse";
  store.setSetting("translation", R.t);
  store.visit(toOsis(R.book, R.chapter), R.t);
  setTitle(formatRef(R.book, R.chapter));
  const parallel = compareWith() && compareWith() !== R.t ? compareWith() : "", lines = store.setting("lines", false), size = store.setting("size", "m"), inter = store.setting("interlinear", false);
  const lastBook = R.book === 65 && R.chapter === chapterCount(65), firstBook = R.book === 0 && R.chapter === 1;
  view.innerHTML = `
  <div class="readtools">
    <label class="sr" for="bk">Book</label><select id="bk">${GROUPS.map(([g, a, z]) => `<optgroup label="${g}">${NAMES.slice(a, z + 1).map((n, k) => `<option value="${a + k}" ${a + k === R.book ? "selected" : ""}>${n}</option>`).join("")}</optgroup>`).join("")}</select>
    <label class="sr" for="cp">Chapter</label><select id="cp">${Array.from({ length: chapterCount(R.book) }, (_, k) => `<option value="${k + 1}" ${k + 1 === R.chapter ? "selected" : ""}>${R.book === 18 ? "Psalm" : "Chapter"} ${k + 1}</option>`).join("")}</select>
    <label class="sr" for="trsel">Translation</label><select id="trsel" class="trsel">${translationOptions(R.t)}</select>
    <label class="sr" for="cmpsel">Compare with</label><select id="cmpsel" class="trsel">${translationOptions(parallel, { none: "Compare with…" })}</select>
    <span class="grow"></span>
    <button class="btn" type="button" id="bgbtn">About ${NAMES[R.book]}</button>
    <a class="btn" href="#/guide/${BOOKS[R.book].osis}.${R.chapter}">Study guide</a>
    <div class="seg" role="group" aria-label="Text size">${["s", "m", "l"].map(x => `<button type="button" data-size="${x}" aria-pressed="${size === x}" aria-label="Text size ${x}">${x === "s" ? "A−" : x === "m" ? "A" : "A+"}</button>`).join("")}</div>
    <button class="btn ${inter ? "on" : ""}" type="button" id="interbtn" aria-pressed="${inter}" title="Show ${R.book < 39 ? "Hebrew" : "Greek"} words under each verse">Interlinear</button>
    <button class="btn ${lines ? "on" : ""}" type="button" id="linesbtn" aria-pressed="${lines}" title="One verse per line">Verse lines</button>
    <button class="btn" type="button" id="focusbtn" title="Hide everything except the text">Focus</button>
  </div>
  <div class="reader">
    <article class="page" aria-labelledby="chh">
      <div class="runhead"><div><span class="eyebrow">${testamentOf(R.book)} · ${groupOf(R.book)}</span><h1 id="chh">${R.book === 18 ? "Psalm" : NAMES[R.book]} <span class="cn">${R.chapter}</span></h1></div>
      <span class="chip scripture">${inter ? `Scripture · ${TR[R.t]} with ${R.book < 39 ? "Hebrew" : "Greek"}` : parallel ? `Scripture · ${TR[R.t]} and ${TR[parallel]}` : `Scripture · ${TR[R.t]}`}</span></div>
      <p class="small trnote"><a href="#/translation/${R.t}">About the ${esc(META[R.t].name)}</a> · ${esc(META[R.t].licence)}${META[R.t].numbering ? ` · ${esc(META[R.t].numbering)}` : ""}</p>
      <div id="text" class="text"><p class="loading">Opening the text…</p></div>
      <nav class="chapnav" aria-label="Chapters">
        <button class="btn" type="button" id="prev" ${firstBook ? "disabled" : ""}>‹ Previous</button>
        <button class="btn" type="button" id="next" ${lastBook ? "disabled" : ""}>Next ›</button>
      </nav>
    </article>
    <aside class="margin" id="margin" aria-label="Study margin">
      <div class="tabs" role="tablist"><button role="tab" type="button" data-tab="verse">Verse</button><button role="tab" type="button" data-tab="words">${R.book < 39 ? "Hebrew" : "Greek"}</button><button role="tab" type="button" data-tab="xref">Refs</button><button role="tab" type="button" data-tab="people">People</button><button role="tab" type="button" data-tab="bg">Book</button><button class="close" type="button" aria-label="Close study panel">×</button></div>
      <div id="pane"></div>
    </aside>
  </div>`;
  const go = (b, c, v = null) => (location.hash = readUrl(R.t, b, c, v));
  $("#bk").addEventListener("change", e => go(+e.target.value, 1));
  $("#cp").addEventListener("change", e => go(R.book, +e.target.value));
  $("#prev").addEventListener("click", () => { if (R.chapter > 1) go(R.book, R.chapter - 1); else if (R.book > 0) go(R.book - 1, chapterCount(R.book - 1)); });
  $("#next").addEventListener("click", () => { if (R.chapter < chapterCount(R.book)) go(R.book, R.chapter + 1); else if (R.book < 65) go(R.book + 1, 1); });
  $("#trsel").addEventListener("change", e => { location.hash = readUrl(e.target.value, R.book, R.chapter, R.verse); });
  $("#cmpsel").addEventListener("change", e => { store.setSetting("compare", e.target.value); store.setSetting("parallel", false); renderRead(R.t, toOsis(R.book, R.chapter, R.verse)); });
  view.querySelectorAll("[data-size]").forEach(b => b.addEventListener("click", () => {
    store.setSetting("size", b.dataset.size); document.documentElement.dataset.size = b.dataset.size;
    view.querySelectorAll("[data-size]").forEach(x => x.setAttribute("aria-pressed", x === b));
  }));
  $("#interbtn").addEventListener("click", () => { store.setSetting("interlinear", !inter); renderRead(R.t, toOsis(R.book, R.chapter, R.verse)); });
  $("#linesbtn").addEventListener("click", () => { store.setSetting("lines", !lines); renderRead(R.t, toOsis(R.book, R.chapter, R.verse)); });
  $("#focusbtn").addEventListener("click", enterFocus);
  $("#bgbtn").addEventListener("click", () => { R.tab = "bg"; $("#margin").classList.add("open"); renderMargin(); });
  $("#pane").addEventListener("click", e => {
    const wb = e.target.closest(".wb"); if (!wb) return;
    R.word = +wb.dataset.w;
    document.querySelectorAll("#pane .wb.on").forEach(x => x.classList.remove("on")); wb.classList.add("on");
    document.querySelectorAll("#text .wb.on").forEach(x => x.classList.remove("on"));
    document.querySelector(`#text .wb[data-v="${R.verse}"][data-w="${R.word}"]`)?.classList.add("on");
    loadOrig(R.book, R.chapter).then(c => wordCard(c.verses[R.verse - 1][R.word], R.book)).then(h => { $("#wordcard").innerHTML = h; });
  });
  $("#margin .tabs").addEventListener("click", e => {
    if (e.target.closest(".close")) { $("#margin").classList.remove("open"); return; }
    const b = e.target.closest("[data-tab]"); if (b) { R.tab = b.dataset.tab; renderMargin(); }
  });
  const pick = el => {
    const wb = el.closest(".wb");
    if (wb) return selectVerse(+wb.dataset.v, { word: +wb.dataset.w, tab: "words" });
    const v = el.closest(".v"); if (v) selectVerse(+v.dataset.v);
  };
  $("#text").addEventListener("click", e => pick(e.target));
  $("#text").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(e.target); } });
  await renderChapterText();
  await renderMargin();
  if (R.verse) {
    try { await document.fonts?.ready; } catch {}
    const phone = matchMedia("(max-width: 960px)").matches;
    document.getElementById(`${R.t}-v${R.verse}`)?.scrollIntoView({ block: phone ? "start" : "center" });
    if (phone) $("#margin").classList.add("open");
  } else window.scrollTo(0, 0);
}

function enterFocus() {
  document.body.classList.add("focus");
  const b = document.createElement("button");
  b.className = "btn exitfocus"; b.type = "button"; b.textContent = "Exit focus";
  const exit = () => { document.body.classList.remove("focus"); b.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = e => { if (e.key === "Escape") exit(); };
  b.addEventListener("click", exit); document.addEventListener("keydown", onKey);
  document.body.appendChild(b);
}

/* ---------- search ---------- */
async function renderSearch(q) {
  const sk = normaliseStrong(q);
  if (sk) { location.replace(`#/word/${sk}`); return; }
  setNav(""); setTitle(`Search: ${q}`);
  await getIndex();
  $("#gq").value = q;
  const t = TR[store.setting("searchT", "kjv")] ? store.setting("searchT", "kjv") : "kjv";
  const parsed = parseQuery(q);
  const bookHits = NAMES.map((n, i) => i).filter(i => q.trim().length > 2 && NAMES[i].toLowerCase().includes(q.trim().toLowerCase()));
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">Search</span><h1>${esc(q)}</h1>
    <div class="actions"><label class="sr" for="stsel">Search in</label><select id="stsel" class="trsel">${translationOptions(t)}</select>
    <span class="small">Words match whole words and word beginnings; put a phrase in "quotes" for an exact match.</span></div></div>
    ${bookHits.length ? `<div class="card" style="margin-bottom:16px"><span class="chip">Book</span><ul class="linklist">${bookHits.map(i => `<li><a href="${readUrl(t, i, 1)}"><span><span class="t">${NAMES[i]}</span><span class="d">${esc(CONTEXT[i][1])}</span></span><span class="arr">›</span></a></li>`).join("")}</ul></div>` : ""}
    <div id="res"><p class="loading">Searching the ${esc(META[t]?.name || "Bible")}…</p></div>`;
  $("#stsel").addEventListener("change", e => { store.setSetting("searchT", e.target.value); renderSearch(q); });
  try {
    const corpus = await loadAll(t);
    const hits = searchCorpus(corpus, q, { limit: 500 });
    $("#res").innerHTML = hits.length
      ? `<p class="small">${hits.total.toLocaleString()} verse${hits.total === 1 ? "" : "s"}${hits.total > hits.length ? `, showing the first ${hits.length}` : ""}. Refine with more words or a "phrase in quotes".</p>
        <div class="results">${hits.map(h => `<a class="hit" href="${readUrl(t, h.book, h.chapter, h.verse)}"><span class="meta"><span class="ref">${formatRef(h.book, h.chapter, h.verse)}</span><span class="chip scripture">Scripture · ${TR[t]}</span></span><span class="tx" dir="${dirOf(t)}" lang="${langOf(t)}">${highlightTerms(h.text, parsed)}</span></a>`).join("")}</div>`
      : `<p class="empty">No verses in the ${TR[t]} contain ${parsed.phrases.length ? "that phrase" : "all of those words"}. Try fewer words, the other translation, or a reference such as John 3:16.</p>`;
  } catch { $("#res").innerHTML = `<p class="empty">The text could not load for searching. Check your connection and try again.</p>`; }
}

/* ---------- my study ---------- */
async function renderStudy(tab = "notes") {
  setNav("study"); setTitle("My study");
  await getIndex();
  const lists = { notes: store.notes(), bookmarks: store.bookmarks(), highlights: store.highlights(), history: store.history() };
  const sorted = (tab === "history" ? lists.history : lists[tab].slice().sort((a, b) => orderOf(a.osis) - orderOf(b.osis)));
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">My study</span><h1>Your notes and saved verses</h1>
    <p class="small">Kept in this browser on this device. Export them to keep a copy; accounts that sync across devices arrive in Phase 3.</p>
    <div class="actions"><span class="chip">Study streak: ${store.streak()} day${store.streak() === 1 ? "" : "s"}</span><span class="chip ext">${store.studyDays()} days studied</span><a class="small" href="#/learn">Courses</a></div></div>
    <div class="tabsrow">${[["notes", "Notes"], ["bookmarks", "Bookmarks"], ["highlights", "Highlights"], ["history", "Reading history"]].map(([k, l]) => `<button type="button" class="btn ${k === tab ? "on" : ""}" data-st="${k}">${l} (${lists[k].length})</button>`).join("")}
      <span style="flex:1"></span><button class="btn" type="button" id="exp">Download as Markdown</button><button class="btn" type="button" id="cpyall">Copy all</button></div>
    <div class="card"><div class="results" id="slist"><p class="loading">Loading…</p></div></div>
    <p style="margin-top:20px"><button class="btn" type="button" id="clear">Delete all study data on this device</button></p><div id="confirm"></div>`;
  view.querySelectorAll("[data-st]").forEach(b => b.addEventListener("click", () => renderStudy(b.dataset.st)));
  const rows = await Promise.all(sorted.map(async it => {
    if (tab === "history") { const r = fromOsis(it.osis); return `<a class="hit" href="${readUrl(it.translation || "kjv", r.book, r.chapter)}"><span class="meta"><span class="ref">${formatRef(r.book, r.chapter)}</span><span class="small">${TR[it.translation] || ""} · ${new Date(it.at).toLocaleString()}</span></span></a>`; }
    const r = fromOsis(it.osis); const txt = await anyText(it.osis);
    return `<a class="hit" href="${readUrl("kjv", r.book, r.chapter, r.verse)}"><span class="meta"><span class="ref">${labelOf(it.osis)}</span>${it.color ? `<span class="chip">${it.color}</span>` : ""}</span><span class="tx">${esc(txt)}</span>${it.text ? `<span>${esc(it.text).replace(/\n/g, "<br>")}</span>` : ""}</a>`;
  }));
  $("#slist").innerHTML = rows.length ? rows.join("") : `<p class="empty">${{ notes: "No notes yet. In the reader, tap a verse and write in the note box.", bookmarks: "No bookmarks yet. Tap a verse and choose Bookmark.", highlights: "No highlights yet. Tap a verse and pick a colour.", history: "Chapters you open will be listed here." }[tab]}</p>`;
  const md = async () => {
    const texts = new Map();
    for (const it of [...store.notes(), ...store.bookmarks(), ...store.highlights()]) texts.set(it.osis, await anyText(it.osis));
    return exportMarkdown(store, { order: orderOf, label: labelOf, text: o => texts.get(o) || "" });
  };
  $("#exp").addEventListener("click", async () => {
    const blob = new Blob([await md()], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `scripture-atlas-notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("#cpyall").addEventListener("click", async () => copyText(await md()));
  $("#clear").addEventListener("click", () => {
    $("#confirm").innerHTML = `<div class="confirm"><span>This permanently deletes every note, bookmark, highlight and your reading history on this device.</span><button class="btn" type="button" id="yes">Delete everything</button><button class="btn" type="button" id="no">Keep my data</button></div>`;
    $("#yes").addEventListener("click", () => { store.clearAll(); toast("Study data deleted"); renderStudy(tab); });
    $("#no").addEventListener("click", () => ($("#confirm").innerHTML = ""));
  });
}

/* ---------- word (lexicon) page ---------- */
async function renderWord(key, page = 0) {
  await getIndex();
  const k = normaliseStrong(key) || key;
  setNav("languages"); setTitle(displayStrong(k));
  let e = await loadLex(k).catch(() => null);
  if (!e && !/[A-Z]$/.test(k)) for (const s of ["G", "A", "B", "H"]) { e = await loadLex(k + s).catch(() => null); if (e) { location.replace(`#/word/${k + s}`); return; } }
  if (!e) { view.innerHTML = `<div class="pagehead"><span class="eyebrow">Languages</span><h1>${esc(displayStrong(k) || key)}</h1><p class="empty">No word with this Strong's number appears in the Hebrew or Greek text here. Try another number, such as H7225 or G26.</p></div>`; return; }
  const greek = k[0] === "G", PAGE = 50;
  const refs = e.refs.slice(page * PAGE, page * PAGE + PAGE);
  const rows = await Promise.all(refs.map(async n => { const r = unpackRef(n); const t = await verseText("kjv", toOsis(r.book, r.chapter, r.verse)).catch(() => ""); return `<a class="hit" href="${readUrl("kjv", r.book, r.chapter, r.verse)}"><span class="meta"><span class="ref">${formatRef(r.book, r.chapter, r.verse)}</span></span><span class="tx">${esc(t)}</span></a>`; }));
  const pages = Math.ceil(e.refs.length / PAGE);
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">Languages · ${greek ? "Greek" : "Hebrew or Aramaic"} word study</span>
    <h1><span class="big" dir="${greek ? "ltr" : "rtl"}" lang="${greek ? "grc" : "hbo"}">${esc(e.lemma)}</span> <span class="small" style="font-size:1rem">${esc(e.translit.replace(/\./g, ""))}</span></h1>
    <p style="margin:0;font-size:1.15rem">${esc(e.gloss)}</p>
    <div class="actions"><span class="chip">Strong's ${displayStrong(k)}</span><span class="chip ext">${esc(e.pos)}</span><span class="small">${e.n.toLocaleString()} occurrence${e.n === 1 ? "" : "s"} in ${e.refs.length.toLocaleString()} verse${e.refs.length === 1 ? "" : "s"}</span></div></div>
  <div class="two">
    <section class="card"><h2 style="font-size:1.4rem">Lexicon entry</h2><div class="lexdef">${e.def || "<p class='small'>No definition recorded.</p>"}</div>
      <p class="small">Source: STEPBible Translators Brief Lexicon (${greek ? "TBESG, based on Abbott-Smith" : "TBESH, based on BDB"}), CC BY 4.0. A lexicon gives a word's range of meaning; context decides which sense applies in a given verse.</p>
      <div class="actions"><a class="btn" href="#/research/topic/${encodeURIComponent(e.gloss.split(/[:;,]/)[0].replace(/^to /, ""))}">Related words in the ${greek ? "Hebrew" : "Greek"} and ${greek ? "Greek" : "Hebrew"}</a></div></section>
    <section class="card"><h2 style="font-size:1.4rem">Where it appears</h2><p class="small">Verses ${page * PAGE + 1}–${page * PAGE + refs.length} of ${e.refs.length.toLocaleString()}, KJV text shown. The English word may differ from verse to verse.</p>
      <div class="results">${rows.join("")}</div>
      ${pages > 1 ? `<div class="chapnav"><button class="btn" type="button" id="pp" ${page === 0 ? "disabled" : ""}>‹ Previous</button><span class="small">Page ${page + 1} of ${pages}</span><button class="btn" type="button" id="pn" ${page >= pages - 1 ? "disabled" : ""}>Next ›</button></div>` : ""}</section>
  </div>`;
  $("#pp")?.addEventListener("click", () => renderWord(k, page - 1).then(() => window.scrollTo(0, 0)));
  $("#pn")?.addEventListener("click", () => renderWord(k, page + 1).then(() => window.scrollTo(0, 0)));
}

function renderLanguages() {
  setNav("languages"); setTitle("Languages");
  const ex = [["H7225G", "רֵאשִׁית", "beginning"], ["H2617A", "חֶסֶד", "kindness"], ["H7965G", "שָׁלוֹם", "peace"], ["H1285", "בְּרִית", "covenant"], ["G0026", "ἀγάπη", "love"], ["G3056", "λόγος", "word"], ["G5485", "χάρις", "grace"], ["G4102G", "πίστις", "faith"]];
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">Languages</span><h1>Read the Hebrew, Aramaic and Greek beneath the English.</h1>
    <p class="small" style="max-width:70ch">Every verse is tagged word by word: the original form, a transliteration, a short gloss, its dictionary form, its grammar, and every other place the word appears. Open any chapter, turn on <b>Interlinear</b>, and tap a word.</p></div>
  <div class="two">
    <section class="card"><h2 style="font-size:1.4rem">Look up a word</h2>
      <form class="bigsearch" id="lk" style="margin:10px 0"><label class="sr" for="lkq">Strong's number</label><input id="lkq" placeholder="Strong's number, e.g. H7225 or G26" autocomplete="off"><button>Look up</button></form>
      <div class="exgrid">${ex.map(([k, l, g]) => `<a href="#/word/${k}"><span class="big" lang="${k[0] === "G" ? "grc" : "hbo"}">${l}</span><span class="small">${g} · ${displayStrong(k)}</span></a>`).join("")}</div></section>
    <section class="card"><h2 style="font-size:1.4rem">How to read the tools</h2>
      <dl class="facts" style="margin-top:10px;grid-template-columns:100px minmax(0,1fr)">
        <dt>Gloss</dt><dd>A one-word aid for this verse, not a translation.</dd>
        <dt>Strong's</dt><dd>An index number for a dictionary form. It points to a word; it does not define it, and one Hebrew or Greek word rarely has one English equivalent.</dd>
        <dt>Grammar</dt><dd>Parsing from STEPBible's tagging, such as stem, tense, person and number.</dd>
        <dt>Flags</dt><dd>Greek words found only in the Textus Receptus or only in the NA28 text are marked, as are Hebrew Qere readings.</dd>
      </dl>
      <p class="small">Hebrew: Leningrad Codex (c. AD 1008). Greek: STEPBible's amalgamated New Testament, covering NA28 and the Textus Receptus. All tagging and lexicons from STEPBible.org (Tyndale House, Cambridge), CC BY 4.0.</p>
      <a class="btn pri" href="#/read/kjv/Gen.1.1">Try Genesis 1 interlinear</a></section>
  </div>`;
  $("#lk").addEventListener("submit", ev => { ev.preventDefault(); const k = normaliseStrong($("#lkq").value); if (k) location.hash = `#/word/${k}`; else toast("Enter a number such as H7225 or G26"); });
}

/* ---------- history: map, timeline, people ---------- */
const ERAS = [
  ["Primeval history", -Infinity, -2000], ["The patriarchs", -2000, -1500], ["Exodus and wilderness", -1500, -1450],
  ["Conquest and judges", -1450, -1100], ["The united kingdom", -1100, -975], ["The divided kingdom", -975, -586],
  ["Exile and return", -586, -300], ["The life of Jesus", -300, 30.44], ["The early church", 30.44, Infinity]
];
async function renderHistory(tab = "map") {
  setNav("history"); setTitle("History");
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">History</span><h1>Where and when the story happened, and how sure we are.</h1>
    <div class="tabsrow">${[["map", "Map"], ["timeline", "Timeline"], ["people", "People"]].map(([k, l]) => `<a class="btn ${k === tab ? "on" : ""}" href="#/history/${k}">${l}</a>`).join("")}</div></div><div id="hist"><p class="loading">Loading…</p></div>`;
  const box = $("#hist");
  if (tab === "timeline") return renderTimeline(box);
  if (tab === "people") return renderPeopleList(box);
  const [base, places] = await Promise.all([H.base(), H.places()]);
  const off = places.filter(p => p[2] != null && !inMapBox(p[3], p[2])).map(p => p[1]);
  box.innerHTML = `<div class="maplayout"><div class="card mapcard"><div id="map"></div></div>
    <aside class="card mapside"><form id="pf" class="minisearch"><label class="sr" for="pq">Find a place</label><input id="pq" list="plist" placeholder="Find a place, e.g. Bethel" autocomplete="off"><datalist id="plist">${places.filter(p => p[2] != null).map(p => `<option value="${esc(p[1])}">`).join("")}</datalist><button class="btn">Find</button></form>
    <label class="small"><input type="checkbox" id="appx" checked> Show approximate locations</label>
    <div class="legend"><span><i class="pm located"></i>Identified site</span><span><i class="pm approximate"></i>Approximate</span><span><i class="pm related"></i>Placed by a related site</span></div>
    <div id="pinfo"><p class="small">${places.filter(p => p[2] != null).length.toLocaleString()} places are plotted. Tap one to see what happened there. Drag to move; pinch, scroll or use + and − to zoom.</p></div>
    <p class="small">${places.filter(p => p[5] === "unknown").length} places have no known location and are not shown. Off this map: ${esc(off.slice(0, 6).join(", "))}${off.length > 6 ? " and others" : ""}.</p></aside></div>`;
  const map = mountMap($("#map"), { base, places, onPick: slug => showPlace(slug) });
  async function showPlace(slug) {
    const p = await H.place(slug); if (!p) return;
    map.focusOn(slug, 5);
    $("#pinfo").innerHTML = `<h2 style="font-size:1.5rem">${esc(p.name)}</h2><p class="small">${esc([p.type, p.sub].filter(Boolean).join(" · "))}${p.comment ? " · " + esc(p.comment) : ""}</p>
      <p><span class="prec ${p.cls}">${PRECISION[p.cls].label}</span> <span class="small">${PRECISION[p.cls].note}</span></p>
      <p class="small">Mentioned in ${p.verses.length.toLocaleString()} verse${p.verses.length === 1 ? "" : "s"}${p.events.length ? `, with ${p.events.length} event${p.events.length === 1 ? "" : "s"}` : ""}.</p>
      <a class="btn pri" href="#/place/${slug}">Open ${esc(p.name)}</a>`;
  }
  $("#pf").addEventListener("submit", e => { e.preventDefault(); const q = $("#pq").value.trim().toLowerCase(); const hit = places.find(p => p[2] != null && p[1].toLowerCase() === q) || places.find(p => p[2] != null && p[1].toLowerCase().startsWith(q)); if (hit) showPlace(hit[0]); else toast("No plotted place by that name"); });
  $("#appx").addEventListener("change", e => map.setFilter(e.target.checked));
}

async function renderTimeline(box) {
  const [events, pm, lm] = await Promise.all([H.events(), H.peopleMap(), H.placeMap()]);
  const groups = ERAS.map(([name, a, b]) => ({ name, items: events.filter(e => e.sort >= a && e.sort < b) })).filter(g => g.items.length);
  box.innerHTML = `<div class="card certlegend"><b>How firm are these dates?</b>
    <div class="legendrow"><span>${certChip(-1500)} ${dateCertainty(-1500).note}</span><span>${certChip(-700)} ${dateCertainty(-700).note}</span><span>${certChip(30)} ${dateCertainty(30).note}</span></div>
    <p class="small">Dates come from the Theographic dataset, which follows a traditional chronology close to Archbishop Ussher's (for example, the Exodus in 1490 BC). Many scholars place the Exodus around 1446 BC or in the 13th century BC, and treat earlier dates as unknowable.</p></div>
    <nav class="eranav" aria-label="Eras">${groups.map((g, i) => `<a class="btn" href="#/history/timeline#era${i}">${g.name}</a>`).join("")}</nav>
    ${groups.map((g, i) => `<section class="era" id="era${i}"><h2>${g.name} <span class="small">${yearText(g.items[0].year)} – ${yearText(g.items.at(-1).year)}</span></h2>
      <ol class="tl">${g.items.map(e => { const f = e.first != null ? unpackRef(e.first) : null; return `<li id="e${e.id}"><span class="yr">${yearText(e.year)}</span><div><b>${esc(e.title)}</b> ${certChip(e.year)}
        <div class="tlmeta">${e.places.map(s => lm.get(s)).filter(Boolean).map(r => `<a class="chip ext" href="#/place/${r[0]}">${esc(r[1])}</a>`).join(" ")} ${e.people.map(s => pm.get(s)).filter(Boolean).filter(r => !["god_1324", "holy_spirit_7400", "jesus_905"].includes(r[0]) || e.year > -10).filter(r => r[0] !== "god_1324").slice(0, 4).map(r => `<a class="chip" href="#/person/${r[0]}">${esc(r[1])}</a>`).join(" ")}
        ${f ? `<a class="small" href="${readUrl("kjv", f.book, f.chapter, f.verse)}">${formatRef(f.book, f.chapter, f.verse)}</a>` : ""}</div></div></li>`; }).join("")}</ol></section>`).join("")}`;
  const h = location.hash.split("#")[2];
  if (h) document.getElementById(h)?.scrollIntoView({ block: "center" });
}

async function renderPeopleList(box) {
  const people = await H.people();
  box.innerHTML = `<div class="card"><form class="minisearch" id="ppf"><label class="sr" for="ppq">Find a person</label><input id="ppq" placeholder="Find a person, e.g. Ruth or Barnabas" autocomplete="off"></form>
    <p class="small">${people.length.toLocaleString()} people, most-mentioned first. Several people can share a name; the description tells them apart.</p><div class="plist wide" id="pres"></div></div>`;
  const draw = q => {
    q = q.trim().toLowerCase();
    const hits = (q ? people.filter(r => r[1].toLowerCase().includes(q) || r[2].toLowerCase().includes(q)) : people).slice(0, 120);
    $("#pres").innerHTML = hits.map(r => `<a href="#/person/${r[0]}"><b>${esc(r[1])}</b><span class="small">${esc(r[3] || (r[2] ? "also called " + r[2] : ""))}${r[3] || r[2] ? " · " : ""}${r[5]} verse${r[5] === 1 ? "" : "s"}</span></a>`).join("") || `<p class="empty">No one by that name.</p>`;
  };
  draw("");
  $("#ppq").addEventListener("input", e => draw(e.target.value));
  $("#ppf").addEventListener("submit", e => e.preventDefault());
}

async function versesList(refs, page, onPage) {
  const PAGE = 30, slice = refs.slice(page * PAGE, page * PAGE + PAGE), pages = Math.ceil(refs.length / PAGE);
  const rows = await Promise.all(slice.map(async n => { const r = unpackRef(n); const t = await verseText("kjv", toOsis(r.book, r.chapter, r.verse)).catch(() => ""); return `<a class="hit" href="${readUrl("kjv", r.book, r.chapter, r.verse)}"><span class="meta"><span class="ref">${formatRef(r.book, r.chapter, r.verse)}</span></span><span class="tx">${esc(t)}</span></a>`; }));
  const html = `<div class="results">${rows.join("")}</div>${pages > 1 ? `<div class="chapnav"><button class="btn" type="button" data-pg="${page - 1}" ${page === 0 ? "disabled" : ""}>‹ Previous</button><span class="small">Page ${page + 1} of ${pages}</span><button class="btn" type="button" data-pg="${page + 1}" ${page >= pages - 1 ? "disabled" : ""}>Next ›</button></div>` : ""}`;
  return { html, wire: el => el.querySelectorAll("[data-pg]").forEach(b => b.addEventListener("click", () => onPage(+b.dataset.pg))) };
}

async function renderPerson(slug) {
  setNav("history");
  const [p, pm, lm, em] = await Promise.all([H.person(slug), H.peopleMap(), H.placeMap(), H.eventMap()]);
  if (!p) { view.innerHTML = `<p class="empty">No person found. <a href="#/history/people">Browse people</a>.</p>`; return; }
  setTitle(p.name);
  const card = s => { const r = pm.get(s); return r ? `<a class="pcard" href="#/person/${s}"><b>${esc(r[1])}</b><span class="small">${esc(r[3] || "")}</span></a>` : ""; };
  const ancestors = [];
  let cur = p;
  for (let i = 0; i < 30 && cur?.father?.[0]; i++) { const f = cur.father[0]; if (ancestors.includes(f)) break; ancestors.push(f); cur = await H.person(f); }
  const born = p.born != null ? `${yearText(p.born)} ${certChip(p.born)}` : "", died = p.died != null ? `${yearText(p.died)}` : "";
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">History · Person</span><h1>${esc(p.name)}</h1>
    <p style="margin:0;font-size:1.1rem">${esc(p.desc || "")}${p.also ? ` <span class="small">also called ${esc(p.also)}</span>` : ""}</p>
    <div class="actions">${p.groups.map(g => `<span class="chip ext">${esc(g)}</span>`).join("")}<span class="small">Mentioned in ${p.verses.length.toLocaleString()} verse${p.verses.length === 1 ? "" : "s"}</span><a class="btn" href="#/research/person/${slug}">See connections</a></div></div>
  ${p.note ? `<div class="textnote" style="margin-bottom:16px"><b>Two accounts</b><br>${esc(p.note)}</div>` : ""}
  <div class="two">
    <section class="card"><h2 style="font-size:1.4rem">Family</h2>
      <div class="tree">
        ${p.father.length || p.mother.length ? `<div class="trow"><span class="tlabel">Parents</span>${[...p.father, ...p.mother].map(card).join("")}</div>` : ""}
        <div class="trow self"><span class="tlabel">${p.partners.length ? "Person and spouses" : "Person"}</span><span class="pcard me"><b>${esc(p.name)}</b><span class="small">${born}${died ? " – " + died : ""}</span></span>${p.partners.map(card).join("")}</div>
        ${p.children.length ? `<div class="trow"><span class="tlabel">Children</span>${p.children.map(card).join("")}</div>` : ""}
        ${p.siblings.length || p.half.length ? `<div class="trow sib"><span class="tlabel">Siblings</span>${p.siblings.map(card).join("")}${p.half.map(s => card(s).replace("</a>", '<span class="small">half-sibling</span></a>')).join("")}</div>` : ""}
      </div>
      ${ancestors.length > 1 ? `<details><summary>Father's line (${ancestors.length} generations)</summary><ol class="anc">${ancestors.map(s => `<li><a href="#/person/${s}">${esc(pm.get(s)?.[1] || s)}</a></li>`).join("")}</ol></details>` : ""}
      <p class="small">Family links follow the Theographic dataset. Biblical genealogies sometimes skip generations or differ between books; check the verses before relying on a link.</p>
      ${p.born != null ? `<p class="small">Dates: ${dateCertainty(p.born).note}</p>` : ""}
      ${p.bornAt || p.diedAt ? `<p>${p.bornAt && lm.get(p.bornAt) ? `Born: <a href="#/place/${p.bornAt}">${esc(lm.get(p.bornAt)[1])}</a>. ` : ""}${p.diedAt && lm.get(p.diedAt) ? `Died: <a href="#/place/${p.diedAt}">${esc(lm.get(p.diedAt)[1])}</a>.` : ""}</p>` : ""}
      ${p.events.length ? `<h3>Events</h3><ul class="evlist">${p.events.map(i => em.get(i)).filter(Boolean).map(e => `<li><span class="yr">${yearText(e.year)}</span> <a href="#/history/timeline#e${e.id}">${esc(e.title)}</a></li>`).join("")}</ul>` : ""}
    </section>
    <section class="card">${p.dict ? `<h2 style="font-size:1.4rem">Dictionary entry</h2><p class="dict">${esc(p.dict)}</p><p class="small">Easton's Bible Dictionary (1897), public domain. A historic reference: some views and archaeology are out of date.</p>` : ""}
      <h2 style="font-size:1.4rem;margin-top:12px">Verses</h2><div id="pv"></div></section>
  </div>`;
  const page = async n => { const r = await versesList(p.verses, n, page); $("#pv").innerHTML = r.html; r.wire($("#pv")); };
  page(0);
}

async function renderPlace(slug) {
  setNav("history");
  const [p, base, places, pm, em] = await Promise.all([H.place(slug), H.base(), H.places(), H.peopleMap(), H.eventMap()]);
  if (!p) { view.innerHTML = `<p class="empty">No place found. <a href="#/history/map">Open the map</a>.</p>`; return; }
  setTitle(p.name);
  const plotted = p.cls !== "unknown" && p.lat != null && inMapBox(p.lon, p.lat);
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">History · Place</span><h1>${esc(p.name)}</h1>
    <p style="margin:0" class="small">${esc([p.type, p.sub].filter(Boolean).join(" · "))}${p.other ? ` · also ${esc(p.other)}` : ""}${p.comment ? ` · ${esc(p.comment)}` : ""}</p>
    <div class="actions"><a class="btn" href="#/research/place/${slug}">See connections</a><span class="prec ${p.cls}">${PRECISION[p.cls].label}</span><span class="small">${PRECISION[p.cls].note}${p.lat != null && p.cls !== "unknown" ? ` (${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°)` : ""}</span></div></div>
  <div class="two">
    <section class="card">${plotted ? `<div id="pmap"></div>` : `<p class="small">This place is not shown on the map.</p>`}
      ${p.events.length ? `<h3>Events here</h3><ul class="evlist">${p.events.map(i => em.get(i)).filter(Boolean).map(e => `<li><span class="yr">${yearText(e.year)}</span> <a href="#/history/timeline#e${e.id}">${esc(e.title)}</a></li>`).join("")}</ul>` : ""}
      ${p.born.length || p.died.length ? `<p>${p.born.length ? `Born here: ${p.born.map(s => `<a href="#/person/${s}">${esc(pm.get(s)?.[1] || s)}</a>`).join(", ")}. ` : ""}${p.died.length ? `Died here: ${p.died.map(s => `<a href="#/person/${s}">${esc(pm.get(s)?.[1] || s)}</a>`).join(", ")}.` : ""}</p>` : ""}
      ${p.dict ? `<h3>Dictionary entry</h3><p class="dict">${esc(p.dict)}</p><p class="small">Easton's Bible Dictionary (1897), public domain. Some identifications have changed since it was written.</p>` : ""}</section>
    <section class="card"><h2 style="font-size:1.4rem">Verses</h2><div id="lv"></div></section></div>`;
  if (plotted) mountMap($("#pmap"), { base, places, focus: slug, onPick: s => (location.hash = `#/place/${s}`) }).focusOn(slug, 16);
  const page = async n => { const r = await versesList(p.verses, n, page); $("#lv").innerHTML = r.html; r.wire($("#lv")); };
  page(0);
}

/* ---------- learn ---------- */
const familyMode = () => store.setting("family", false);
function familyToggle() {
  return `<label class="famtoggle"><input type="checkbox" id="fam" ${familyMode() ? "checked" : ""}> Family mode <span class="small">simpler explanations and questions for children</span></label>`;
}
function wireFamily(rerender) { $("#fam")?.addEventListener("change", e => { store.setSetting("family", e.target.checked); rerender(); }); }
const statusChip = c => `<span class="chip ${c.status === "reviewed" ? "" : "draftchip"}" title="${STATUS[c.status].label}">${STATUS[c.status].short}</span>`;

function renderLearn() {
  setNav("learn"); setTitle("Learn");
  const streak = store.streak(), days = store.studyDays();
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">Learn</span><h1>Structured study, from first steps to deeper reading.</h1>
    <p class="small" style="max-width:70ch">Each lesson has goals, Bible readings shown in full, teaching, questions to discuss and a short quiz. Your progress is saved on this device.</p>
    <div class="actions">${familyToggle()}</div></div>
  <div class="textnote" style="margin-bottom:16px"><b>Editorial status</b><br>These first courses are drafts written with AI assistance. They are labelled as drafts until the Scripture Atlas editor has reviewed them. Bible readings are shown from the KJV text itself, never retyped.</div>
  <form class="card guidebuild" id="gb"><div><h2 style="font-size:1.4rem">Build a study guide for any passage</h2><p class="small">Read, background, observe, key Hebrew or Greek words, cross references, interpret and apply, with space for your answers. Download or print it for a group.</p></div>
    <div class="minisearch"><label class="sr" for="gbq">Passage</label><input id="gbq" placeholder="e.g. Psalm 23, John 15:1-17"><button class="btn pri">Build guide</button></div></form>
  <div class="streak card"><div><span class="big">${streak}</span><span class="small">day study streak</span></div><div><span class="big">${days}</span><span class="small">day${days === 1 ? "" : "s"} studied</span></div><div><span class="big">${COURSES.reduce((n, c) => n + store.courseProgress(c.id, c.lessons.map(l => l.id)), 0)}</span><span class="small">lessons completed</span></div></div>
  <div class="coursegrid">${COURSES.map(c => { const done = store.courseProgress(c.id, c.lessons.map(l => l.id)), n = c.lessons.length; const next = c.lessons.find(l => !store.lessonResult(c.id, l.id)) || c.lessons[0];
    return `<article class="card course"><div class="actions"><span class="chip ext">${c.level}</span>${statusChip(c)}</div><h2>${c.title}</h2><p class="small">${c.summary}</p>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}" aria-label="${done} of ${n} lessons done"><i style="width:${done / n * 100}%"></i></div><span class="small">${done} of ${n} lessons</span>
      <div class="actions"><a class="btn pri" href="#/learn/${c.id}/${next.id}">${done ? (done === n ? "Review" : "Continue") : "Start"}</a><a class="btn" href="#/learn/${c.id}">All lessons</a></div></article>`; }).join("")}</div>
  <section class="card" style="margin-top:18px"><h2 style="font-size:1.4rem">Planned courses</h2><ul class="planned">${PLANNED.map(([t, d]) => `<li><b>${t}</b> <span class="small">${d}</span></li>`).join("")}</ul></section>`;
  wireFamily(renderLearn);
  $("#gb").addEventListener("submit", e => { e.preventDefault(); const r = parseReference($("#gbq").value, chapterCount); if (r) location.hash = `#/guide/${guideSpec(r.book, r.chapter, r.verse, r.verseEnd)}`; else toast("Enter a passage such as Psalm 23 or John 15:1-17"); });
}

function renderCourse(id) {
  const c = COURSES.find(x => x.id === id); if (!c) return renderLearn();
  setNav("learn"); setTitle(c.title);
  view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="#/learn">Learn</a> · ${c.level}</span><h1>${c.title}</h1><p style="margin:0">${c.summary}</p><div class="actions">${statusChip(c)}<span class="small">${STATUS[c.status].label}</span></div></div>
    <ol class="lessons">${c.lessons.map((l, i) => { const r = store.lessonResult(c.id, l.id); return `<li><a class="card" href="#/learn/${c.id}/${l.id}"><span class="ln">${i + 1}</span><span><b>${l.title}</b><span class="small">${l.minutes} minutes · ${l.readings.join("; ")}</span></span><span class="lstate ${r ? "done" : ""}">${r ? `Done · ${r.score}/${r.total}` : "Not started"}</span></a></li>`; }).join("")}</ol>`;
}

async function renderLesson(cid, lid) {
  const c = COURSES.find(x => x.id === cid); const i = c ? c.lessons.findIndex(l => l.id === lid) : -1;
  if (i < 0) return renderCourse(cid);
  const l = c.lessons[i], next = c.lessons[i + 1], fam = familyMode();
  setNav("learn"); setTitle(l.title);
  await getIndex();
  const readings = await Promise.all(l.readings.map(async ref => {
    const r = parseReference(ref, chapterCount); if (!r) return "";
    const b = await loadBook("kjv", r.book); const vs = b.chapters[r.chapter - 1];
    const a = r.verse || 1, z = r.verseEnd || r.verse || vs.length;
    return `<figure class="reading"><figcaption><b>${formatRef(r.book, r.chapter, r.verse, r.verseEnd)}</b> <span class="chip scripture">Scripture · KJV</span> <a class="small" href="${readUrl("kjv", r.book, r.chapter, r.verse)}">Open in the reader</a></figcaption>
      <div class="text lines">${vs.slice(a - 1, z).map((t, k) => `<span class="v"><sup class="vn">${a + k}</sup>${esc(t)}</span>`).join("")}</div></figure>`;
  }));
  const prev = store.lessonResult(cid, lid);
  view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="#/learn">Learn</a> · <a href="#/learn/${c.id}">${c.title}</a> · Lesson ${i + 1} of ${c.lessons.length}</span><h1>${l.title}</h1>
    <div class="actions">${statusChip(c)}<span class="small">${l.minutes} minutes</span>${prev ? `<span class="chip">Best score ${prev.score}/${prev.total}</span>` : ""}${familyToggle()}</div></div>
  <div class="lesson">
    <aside class="card goals"><h2>You will</h2><ul>${l.objectives.map(o => `<li>${o}</li>`).join("")}</ul></aside>
    ${fam ? `<section class="card family"><h2>For the family</h2><p>${esc(l.family)}</p><h3>Talk about it</h3><ul>${l.familyQuestions.map(q => `<li>${esc(q)}</li>`).join("")}</ul></section>` : ""}
    <section><h2>Read</h2>${readings.join("")}</section>
    <section class="card teach"><h2>Teaching</h2>${l.body.map(p => `<p>${esc(p)}</p>`).join("")}<p class="small">${STATUS[c.status].label}.</p></section>
    ${fam ? "" : `<section class="card"><h2>Discuss</h2><ol>${l.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ol></section>`}
    <form class="card quiz" id="quiz"><h2>Check your understanding</h2>
      ${l.quiz.map((q, n) => `<fieldset><legend>${n + 1}. ${esc(q.q)}</legend>${q.options.map((o, k) => `<label><input type="radio" name="q${n}" value="${k}" required> ${esc(o)}</label>`).join("")}<p class="fb" id="fb${n}" hidden></p></fieldset>`).join("")}
      <div class="actions"><button class="btn pri">Check answers</button><span id="score" class="small"></span></div></form>
    <nav class="chapnav"><a class="btn" href="${i > 0 ? `#/learn/${c.id}/${c.lessons[i - 1].id}` : `#/learn/${c.id}`}">‹ ${i > 0 ? "Previous lesson" : "Course"}</a>${next ? `<a class="btn pri" href="#/learn/${c.id}/${next.id}">Next: ${next.title} ›</a>` : `<a class="btn pri" href="#/learn">Course complete · back to Learn</a>`}</nav>
  </div>`;
  wireFamily(() => renderLesson(cid, lid));
  $("#quiz").addEventListener("submit", e => {
    e.preventDefault();
    let score = 0;
    l.quiz.forEach((q, n) => {
      const pick = +new FormData(e.target).get(`q${n}`), ok = pick === q.answer; if (ok) score++;
      const fb = $(`#fb${n}`); fb.hidden = false; fb.className = "fb " + (ok ? "ok" : "no");
      let refLink = "";
      if (q.ref) { const r = parseReference(q.ref, chapterCount); if (r) refLink = ` <a href="${readUrl("kjv", r.book, r.chapter, r.verse)}">${formatRef(r.book, r.chapter, r.verse)}</a>`; }
      fb.innerHTML = `${ok ? "Correct." : `Not quite. The answer is: <b>${esc(q.options[q.answer])}</b>.`} ${esc(q.explain)}${refLink}`;
    });
    store.completeLesson(cid, lid, score, l.quiz.length);
    $("#score").textContent = `${score} of ${l.quiz.length} correct. Progress saved.`;
  });
}

/* ---------- study guide ---------- */
function parseGuideSpec(spec) {
  const m = String(spec || "").match(/^([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/);
  if (!m) return null;
  const r = fromOsis(`${m[1]}.${m[2]}`); if (!r) return null;
  return { book: r.book, chapter: r.chapter, from: m[3] ? +m[3] : null, to: m[4] ? +m[4] : m[3] ? +m[3] : null };
}
const guideSpec = (b, c, from, to) => `${BOOKS[b].osis}.${c}${from ? "." + from + (to && to !== from ? "-" + to : "") : ""}`;

async function renderGuide(spec) {
  setNav("learn"); await getIndex();
  let g = parseGuideSpec(spec);
  if (!g) { const p = store.position(); const r = p ? fromOsis(p.osis) : null; g = r ? { book: r.book, chapter: r.chapter, from: null, to: null } : { book: 18, chapter: 23, from: null, to: null }; }
  const t = TR[store.setting("guideT", store.setting("translation", "kjv"))] ? store.setting("guideT", store.setting("translation", "kjv")) : "kjv";
  const key = guideSpec(g.book, g.chapter, g.from, g.to);
  const title = formatRef(g.book, g.chapter, g.from, g.to);
  setTitle(`Study guide: ${title}`);
  view.innerHTML = `<p class="loading">Building your study guide for ${title}…</p>`;
  const [text, kjv, orig, xref, vx, pm, lm, em, morph] = await Promise.all([loadBook(t, g.book), loadBook("kjv", g.book), loadOrig(g.book, g.chapter).catch(() => null), loadXref(g.book), H.vx(g.book), H.peopleMap(), H.placeMap(), H.eventMap(), Promise.resolve(null)]);
  const all = text.chapters[g.chapter - 1] || [];
  const from = g.from || 1, to = Math.min(g.to || all.length, all.length);
  const verses = all.slice(from - 1, to).map((v, i) => [from + i, v]);
  const kv = (kjv.chapters[g.chapter - 1] || []).slice(from - 1, to);
  const pk = v => g.book * 1e6 + g.chapter * 1e3 + v;
  const inPassage = n => n >= pk(from) && n <= pk(to);
  // background, people, places, events
  const c = CONTEXT[g.book];
  const ppl = new Set(), pls = new Set(), evs = new Set();
  for (let v = from; v <= to; v++) { const r = vx[pk(v)]; if (r) { r[0].forEach(x => ppl.add(x)); r[1].forEach(x => pls.add(x)); r[2].forEach(x => evs.add(x)); } }
  const P = [...ppl].filter(x => x !== "god_1324").map(x => pm.get(x)).filter(Boolean).sort((a, b) => b[5] - a[5]).slice(0, 10);
  const L = [...pls].map(x => lm.get(x)).filter(Boolean).slice(0, 8);
  const E = [...evs].map(x => em.get(x)).filter(Boolean).slice(0, 6);
  // original-language key words
  const words = orig ? orig.verses.slice(from - 1, to).flat() : [];
  const strongs = [...new Set(words.map(w => w[3]).filter(k => k && !/^H90\d\d/.test(k)))];
  const lexEntries = new Map((await Promise.all(strongs.map(async k => [k, await loadLex(k).catch(() => null)]))).filter(([, e]) => e));
  const keys = keyLemmas(words, lexEntries);
  // cross references
  const xr = mergeCrossRefs(Array.from({ length: to - from + 1 }, (_, i) => xref[pk(from + i)] || []), inPassage);
  const xrows = await Promise.all(xr.map(async ([n]) => { const r = unpackRef(n); return [formatRef(r.book, r.chapter, r.verse), await verseText("kjv", toOsis(r.book, r.chapter, r.verse)).catch(() => ""), r]; }));
  const repeated = repeatedWords(kv.length ? kv : verses.map(v => v[1]));
  const interpret = interpretQuestions(groupOf(g.book));
  const answers = store.guideAnswers(key);
  const box = (id, q) => `<label class="gq"><span>${esc(q)}</span><textarea data-ans="${id}" placeholder="Your answer">${esc(answers[id] || "")}</textarea></label>`;
  const rtl = dirOf(t) === "rtl";
  view.innerHTML = `<article class="guide">
  <div class="pagehead"><span class="eyebrow"><a href="#/learn">Learn</a> · Study guide</span><h1>${title}</h1>
    <div class="actions noprint"><label class="sr" for="gtr">Translation</label><select id="gtr" class="trsel">${translationOptions(t)}</select>
      <form id="gp" class="minisearch"><label class="sr" for="gpq">Another passage</label><input id="gpq" placeholder="Another passage, e.g. Romans 8:28-39"><button class="btn">Build</button></form></div>
    <div class="actions noprint"><button class="btn pri" type="button" id="gdl">Download as Markdown</button><button class="btn" type="button" id="gpr">Print</button><a class="btn" href="#/ai/${toOsis(g.book, g.chapter, from)}">Ask the research assistant</a><a class="btn" href="${readUrl(t, g.book, g.chapter, g.from)}">Open in the reader</a><span class="small" id="gsv">Your answers save on this device as you type.</span></div></div>
  <section class="gsec"><h2><span class="gn">1</span> Read</h2><p class="small">Read the passage slowly, twice if you can. ${esc(META[t].name)}.</p>
    <div class="text lines gtext" dir="${rtl ? "rtl" : "ltr"}" lang="${langOf(t)}">${verses.map(([n, v]) => `<span class="v"><sup class="vn">${n}</sup>${esc(v).replace(/\n/g, "<br>")}</span>`).join("")}</div></section>
  <section class="gsec"><h2><span class="gn">2</span> Background</h2>
    <dl class="facts"><dt>Book</dt><dd>${NAMES[g.book]} · ${testamentOf(g.book)} · ${groupOf(g.book)}</dd><dt>Author</dt><dd>${esc(c[0])}</dd><dt>Date</dt><dd>${esc(c[1])}</dd><dt>Setting</dt><dd>${esc(c[4])}</dd><dt>Themes</dt><dd>${esc(c[5])}</dd></dl>
    ${E.length ? `<p><b>Events:</b> ${E.map(e => `${esc(e.title)} (${yearText(e.year)}, ${dateCertainty(e.year).label.toLowerCase()})`).join("; ")}</p>` : ""}
    ${P.length ? `<p><b>People:</b> ${P.map(r => `<a href="#/person/${r[0]}">${esc(r[1])}</a>`).join(", ")}</p>` : ""}
    ${L.length ? `<p><b>Places:</b> ${L.map(r => `<a href="#/place/${r[0]}">${esc(r[1])}</a>`).join(", ")}</p>` : ""}</section>
  <section class="gsec"><h2><span class="gn">3</span> Observe</h2>
    ${repeated.length ? `<p><b>Repeated words</b> (in the KJV): ${repeated.map(([w, n]) => `<span class="chip">${esc(w)} × ${n}</span>`).join(" ")}</p>` : ""}
    ${OBSERVE.map((q, i) => box("o" + i, q)).join("")}</section>
  <section class="gsec"><h2><span class="gn">4</span> Key words in the ${g.book < 39 ? "Hebrew" : "Greek"}</h2>
    ${keys.length ? `<div class="kwgrid">${keys.map(k => `<a class="kw" href="#/word/${k.strong}"><span class="big" lang="${g.book < 39 ? "hbo" : "grc"}" dir="${g.book < 39 ? "rtl" : "ltr"}">${esc(k.form)}</span><span class="small">${esc(k.translit)}</span><b>“${esc(k.gloss)}”</b><span class="small">${k.inPassage > 1 ? `${k.inPassage} times here · ` : ""}${k.total.toLocaleString()} times in the Bible · ${displayStrong(k.strong)}</span></a>`).join("")}</div><p class="small">Chosen because they repeat in this passage or are rare in the Bible. Tap one for its full entry. Data: STEPBible, CC BY 4.0.</p>` : `<p class="small">No original-language data for this passage.</p>`}</section>
  <section class="gsec"><h2><span class="gn">5</span> Connect</h2><p class="small">Passages readers most often link to this one (OpenBible.info).</p>
    ${xrows.length ? `<div class="results">${xrows.map(([ref, txt, r]) => `<a class="hit" href="${readUrl("kjv", r.book, r.chapter, r.verse)}"><span class="meta"><span class="ref">${ref}</span></span><span class="tx">${esc(txt)}</span></a>`).join("")}</div>` : `<p class="small">No cross references recorded.</p>`}
    ${box("c0", "How do these passages shed light on this one?")}</section>
  <section class="gsec"><h2><span class="gn">6</span> Interpret</h2><p class="small">Questions suited to ${groupOf(g.book).toLowerCase()}.</p>${interpret.map((q, i) => box("i" + i, q)).join("")}</section>
  <section class="gsec"><h2><span class="gn">7</span> Apply</h2>${APPLY.map((q, i) => box("a" + i, q)).join("")}</section>
  <p class="small">Built from the Bible text, Scripture Atlas book notes, STEPBible language data, OpenBible.info cross references and the Theographic dataset. The questions guide your own study; they are not answers.</p>
  </article>`;
  let tmr;
  view.querySelectorAll("[data-ans]").forEach(el => el.addEventListener("input", () => { clearTimeout(tmr); tmr = setTimeout(() => { store.setGuideAnswer(key, el.dataset.ans, el.value); $("#gsv").textContent = "Saved"; }, 400); }));
  $("#gtr").addEventListener("change", e => { store.setSetting("guideT", e.target.value); renderGuide(key); });
  $("#gp").addEventListener("submit", e => { e.preventDefault(); const r = parseReference($("#gpq").value, chapterCount); if (r) location.hash = `#/guide/${guideSpec(r.book, r.chapter, r.verse, r.verseEnd)}`; else toast("Enter a passage such as Psalm 23 or Romans 8:28-39"); });
  $("#gpr").addEventListener("click", () => window.print());
  $("#gdl").addEventListener("click", () => {
    view.querySelectorAll("[data-ans]").forEach(el => store.setGuideAnswer(key, el.dataset.ans, el.value));
    const md = guideMarkdown({ title, translation: META[t].name, date: new Date().toISOString().slice(0, 10), verses, background: `${NAMES[g.book]}. Author: ${c[0]} Date: ${c[1]}. Setting: ${c[4]}`, repeated, keyWords: keys, crossRefs: xrows.map(([r, x]) => [r, x]), interpret, answers: store.guideAnswers(key), sources: `${META[t].name}; STEPBible (CC BY 4.0); OpenBible.info (CC BY); Theographic (CC BY-SA 4.0)` });
    const blob = new Blob([md], { type: "text/markdown" }); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `study-guide-${key.replace(/\./g, "-")}.md`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}

/* ---------- Bible translations library ---------- */
const allTranslations = () => [META.kjv, META.web, ...CATALOGUE];
async function renderTranslations() {
  setNav("bibles"); setTitle("Bibles");
  await getIndex();
  const list = allTranslations(), langs = new Set(list.map(t => t.languageEn));
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">Bibles</span><h1>${list.length} complete Bibles in ${langs.size} languages, with the story behind each.</h1>
    <p class="small" style="max-width:72ch">Every Bible here is complete and may be freely shared: public domain or an open Creative Commons licence, each checked against its publisher's own licence page. Popular modern translations such as the NIV and ESV are copyrighted, so they are described at the end but not included.</p>
    <form class="minisearch" id="tf" style="max-width:420px"><label class="sr" for="tq">Filter</label><input id="tq" placeholder="Filter by language or name, e.g. Swahili" autocomplete="off"></form></div>
  <div id="tlist"></div>
  <section class="card" style="margin-top:22px"><h2 style="font-size:1.5rem">Well-known translations under copyright</h2><p class="small">Not hosted here, because their publishers do not allow free redistribution. Their history is given for reference.</p>
    <div class="tgrid">${NOT_HOSTED.map(t => `<article class="tcard"><b>${esc(t.name)}</b><span class="small">${esc(t.year)} · ${esc(t.owner)}</span><p>${esc(t.history)}</p></article>`).join("")}</div></section>`;
  const draw = q => {
    q = q.trim().toLowerCase();
    const groups = new Map();
    list.filter(t => !q || [t.languageEn, t.language, t.name, t.title || ""].some(x => (x || "").toLowerCase().includes(q))).forEach(t => { if (!groups.has(t.languageEn)) groups.set(t.languageEn, []); groups.get(t.languageEn).push(t); });
    const order = [...groups.keys()].sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)));
    $("#tlist").innerHTML = order.map(l => `<section class="tlang"><h2>${esc(l)}</h2><div class="tgrid">${groups.get(l).map(t => { const h = HISTORY[t.id] || {}; return `<article class="tcard"><a href="#/translation/${t.id}"><b>${esc(t.name)}</b></a><span class="small" dir="${t.dir}">${esc(t.title && t.title !== t.name ? t.title : t.language)}</span><span class="small">${esc(h.year || "")}</span><div class="actions"><span class="chip ${/Public/.test(t.licence) ? "" : "ext"}">${esc(t.licence.replace(" (text shown unchanged)", ""))}</span></div><div class="actions"><a class="btn pri" href="#/read/${t.id}/John.1">Read</a><a class="btn" href="#/translation/${t.id}">History</a></div></article>`; }).join("")}</div></section>`).join("") || `<p class="empty">No translation matches. Shona and Zulu have no complete Bible under an open licence yet.</p>`;
  };
  draw("");
  $("#tq").addEventListener("input", e => draw(e.target.value));
  $("#tf").addEventListener("submit", e => e.preventDefault());
}

async function renderTranslation(id) {
  await getIndex();
  const t = META[id]; if (!t) return renderTranslations();
  setNav("bibles"); setTitle(t.name);
  const h = HISTORY[id] || {};
  const samples = await Promise.all([["John.3.16"], ["Ps.23.1"], ["Gen.1.1"]].map(async ([o]) => [o, await verseText(id, o).catch(() => "")]));
  view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="#/bibles">Bibles</a> · ${esc(t.languageEn)}</span><h1>${esc(t.name)}</h1>
    ${t.title && t.title !== t.name ? `<p style="margin:0;font-size:1.2rem" dir="${t.dir}" lang="${t.code}">${esc(t.title)}</p>` : ""}
    <div class="actions"><span class="chip">${esc(t.licence)}</span><span class="small">${esc(t.language)}${t.copyright ? " · " + esc(t.copyright) : ""}</span></div>
    <div class="actions"><a class="btn pri" href="#/read/${id}/John.1">Read this Bible</a><a class="btn" href="#/read/${id}/John.3.16" id="cmpk">Compare with the KJV</a><a class="btn" href="#/compare/John.3.16">John 3:16 in every Bible</a></div></div>
  <div class="two">
    <section class="card"><h2 style="font-size:1.4rem">History and origin</h2>
      <dl class="facts" style="grid-template-columns:110px minmax(0,1fr);margin:10px 0">
        <dt>Published</dt><dd>${esc(h.year || "See source")}</dd><dt>Translated from</dt><dd>${esc(h.base || "See source")}</dd>
        ${t.numbering ? `<dt>Numbering</dt><dd>${esc(t.numbering)}</dd>` : ""}${t.extraBooks ? `<dt>Books</dt><dd>${esc(t.extraBooks)}</dd>` : ""}
      </dl>
      <p class="dict">${esc(h.history || "No history note has been written for this edition yet.")}</p>
      <p class="small">Scripture Atlas editorial note. Text source: ${id === "kjv" ? "thiagobodruk/bible on GitHub" : "eBible.org"}, <span class="mono">${esc(t.source)}</span>. ${esc(t.licence)}.</p></section>
    <section class="card"><h2 style="font-size:1.4rem">A taste of this translation</h2>
      ${samples.map(([o, txt]) => `<figure class="reading"><figcaption><b>${labelOf(o)}</b></figcaption><p class="vtext" dir="${t.dir}" lang="${t.code}">${txt ? esc(txt) : "<em>Not found at this reference; numbering may differ.</em>"}</p></figure>`).join("")}</section>
  </div>`;
  $("#cmpk").addEventListener("click", () => { store.setSetting("compare", id === "kjv" ? "web" : "kjv"); });
}

/* ---------- AI Studio ---------- */
const AI_EXAMPLES = [["John 3:16", "What does this verse mean, and how do the KJV and WEB differ?"], ["Genesis 15:6", "How do Paul and James use this verse?"], ["", "What does the Bible say about forgiveness?"], ["Ruth 1:16", "Explain this to a beginner, with its background."]];
function renderAnswer(res) {
  const src = new Map(res.sources.map(s => [s.id, s]));
  const chip = id => `<button type="button" class="srcchip" data-src="${id}" title="${esc(src.get(id)?.label || "")}">${id}</button>`;
  const secs = SECTIONS.filter(([k]) => res.sections[k]?.length).map(([k, title, desc]) => `<section class="ans ${k}"><h3>${title} <span class="small">${desc}</span></h3><ul>${res.sections[k].map(st => `<li>${esc(st.text)} ${st.cites.map(chip).join(" ")}</li>`).join("")}</ul></section>`).join("");
  return `<div class="card answer"><div class="actions"><span class="chip draftchip">AI-generated</span><span class="small">Every statement links to the sources it used. ${res.dropped?.length ? `${res.dropped.length} statement${res.dropped.length === 1 ? " was" : "s were"} removed because ${res.dropped.length === 1 ? "it" : "they"} failed the citation check.` : "All statements passed the citation check."}</span></div>
    ${secs}
    <details class="srcs" open><summary>Sources (${res.sources.length})</summary><ol>${res.sources.map(s => `<li id="src-${s.id}"><b>${s.id}</b> <span class="chip ${s.type === "scripture" || s.type === "translation" ? "scripture" : "ext"}">${s.type === "scripture" ? "Scripture" : s.type === "translation" ? "Translation" : s.type === "dataset" ? "Dataset" : "Editorial"}</span> ${esc(s.label)}<p class="small">${esc(s.text)}</p></li>`).join("")}</ol></details>
    ${res.dropped?.length ? `<details><summary>Removed statements (${res.dropped.length})</summary><ul>${res.dropped.map(d => `<li><span class="small">${esc(d.reason)}:</span> ${esc(d.text)}</li>`).join("")}</ul></details>` : ""}
    <p class="small">An AI summary of the sources above, not an authority. Read the passages yourself; for pastoral questions, talk with someone who knows you.</p></div>`;
}
function wireAnswer(el) {
  el.querySelectorAll(".srcchip").forEach(b => b.addEventListener("click", () => { const t = el.querySelector(`#src-${b.dataset.src}`); t?.scrollIntoView({ block: "center", behavior: "smooth" }); t?.classList.add("flash"); setTimeout(() => t?.classList.remove("flash"), 1200); }));
}
function renderAI(refArg) {
  setNav("ai"); setTitle("AI Studio");
  const ref = refArg ? (fromOsis(refArg) ? labelOf(refArg) : refArg) : "";
  const past = store.answers();
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">AI Studio · research assistant</span><h1>Ask a question. See exactly what the answer rests on.</h1>
    <p class="small" style="max-width:72ch">The assistant answers only from the Bible text, the second translation, cross references, tagged people and events, and the book background, all numbered as sources. Answers come in five parts: Scripture, Translation, Historical evidence, Interpretation and Uncertainty. Statements that cite nothing, or quote words not found in their sources, are removed before you see them.</p></div>
  <div class="two">
    <form class="card askform" id="ask"><label for="aq"><b>Your question</b></label>
      <textarea id="aq" maxlength="600" placeholder="For example: What does this verse mean, and how do translations differ?" required></textarea>
      <div class="askrow"><label>Passage (optional)<input id="ar" value="${esc(ref)}" placeholder="e.g. Romans 8:28"></label>
      <label>Level<select id="al"><option value="beginner">Beginner</option><option value="intermediate" selected>Intermediate</option><option value="academic">Academic</option></select></label></div>
      <div class="actions"><button class="btn pri" id="asb">Ask</button><span class="small" id="ast"></span></div>
      <p class="small">Try: ${AI_EXAMPLES.map(([r, q]) => `<button type="button" class="linkbtn" data-r="${esc(r)}" data-q="${esc(q)}">${esc(r ? r + ": " + q : q)}</button>`).join(" · ")}</p></form>
    <section class="card"><h2 style="font-size:1.3rem">Earlier answers on this device</h2>${past.length ? `<ul class="pastq">${past.map((a, i) => `<li><button type="button" class="linkbtn" data-past="${i}">${esc(a.question)}</button> <span class="small">${esc(a.ref || "")}</span></li>`).join("")}</ul><button class="btn" type="button" id="clrai">Clear</button>` : `<p class="small">Your questions and answers are kept here, on this device only.</p>`}</section>
  </div><div id="aout"></div>`;
  view.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { $("#aq").value = b.dataset.q; $("#ar").value = b.dataset.r; }));
  view.querySelectorAll("[data-past]").forEach(b => b.addEventListener("click", () => { const a = past[+b.dataset.past]; $("#aout").innerHTML = `<h2 class="qhead">${esc(a.question)}</h2>` + renderAnswer(a.result); wireAnswer($("#aout")); }));
  $("#clrai")?.addEventListener("click", () => { store.clearAnswers(); renderAI(refArg); });
  $("#ask").addEventListener("submit", async e => {
    e.preventDefault();
    const question = $("#aq").value.trim(), refv = $("#ar").value.trim(), level = $("#al").value;
    $("#asb").disabled = true; $("#ast").textContent = "Gathering sources and checking the answer… this can take 20 seconds.";
    try {
      const r = await fetch("api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, ref: refv, level }) });
      const res = await r.json().catch(() => ({ error: "The assistant sent an unreadable reply." }));
      if (!r.ok || res.error) { $("#aout").innerHTML = `<p class="empty">${esc(res.error || (r.status === 429 ? "Too many questions in a minute. Wait a moment and try again." : "The assistant is unavailable."))}</p>`; return; }
      store.saveAnswer({ question, ref: refv, result: res });
      $("#aout").innerHTML = `<h2 class="qhead">${esc(question)}</h2>` + renderAnswer(res); wireAnswer($("#aout"));
      $("#aout").scrollIntoView({ behavior: "smooth" });
    } catch { $("#aout").innerHTML = `<p class="empty">Could not reach the assistant. Check your connection and try again.</p>`; }
    finally { $("#asb").disabled = false; $("#ast").textContent = ""; }
  });
}

/* ---------- library & roadmap pages ---------- */
/* ---------- research: knowledge graph and topic research ---------- */
const NO_GRAPH_PEOPLE = new Set(["god_1324", "holy_spirit_7400"]);
const narrow = () => window.innerWidth < 720;
const graphDims = () => (narrow() ? { w: 560, h: 640, rx: 140, ry: 250 } : {});
const lexMapOf = async keys => new Map((await Promise.all(keys.map(async k => [k, await loadLex(k).catch(() => null)]))).filter(([, e]) => e));
const refLabel = n => { const r = unpackRef(n); return formatRef(r.book, r.chapter, r.verse); };
const refOsis = n => { const r = unpackRef(n); return toOsis(r.book, r.chapter, r.verse); };

function graphSvg({ centre, nodes }, rawTitle, sub) {
  const paren = rawTitle.match(/^(.*?)\s*\((.+)\)$/); // "Bethel (of Palestine)" → title "Bethel", sub "of Palestine"
  const title = paren ? paren[1] : rawTitle; if (paren) sub = paren[2];
  const max = narrow() ? 15 : 24, cmax = narrow() ? 12 : 16;
  const edge = n => `<line class="ge g-${n.type}" x1="${centre.x}" y1="${centre.y}" x2="${n.x}" y2="${n.y}"/>`;
  const node = n => { const dy = n.y < centre.y - 30 ? -12 : n.y > centre.y + 30 ? 20 : 5; const dx = n.anchor === "start" ? 12 : n.anchor === "end" ? -12 : 0;
    return `<a href="${n.href}" class="gn g-${n.type}"><title>${esc(NODE_TYPES[n.type].short)}: ${esc(n.title || n.label)}</title><circle cx="${n.x}" cy="${n.y}" r="${n.r || 8}"/><text x="${n.x + dx}" y="${n.y + dy}" text-anchor="${n.anchor}"${n.lang ? ` lang="${n.lang}"` : ""}>${esc(clip(n.label, max))}</text></a>`; };
  return `<svg class="kgraph" viewBox="0 0 ${centre.x * 2} ${centre.y * 2}" role="img" aria-label="Connections of ${esc(title)}">${nodes.map(edge).join("")}
    <circle class="gc" cx="${centre.x}" cy="${centre.y}" r="46"/><text class="gct" x="${centre.x}" y="${centre.y - 2}" text-anchor="middle">${esc(clip(title, cmax))}</text>${sub ? `<text class="gcs" x="${centre.x}" y="${centre.y + 16}" text-anchor="middle">${esc(clip(sub, cmax + 2))}</text>` : ""}
    ${nodes.map(node).join("")}</svg>`;
}
const graphLegend = types => `<div class="glegend">${types.map(t => `<span><i class="g-${t}"></i>${NODE_TYPES[t].label}</span>`).join("")}</div>`;

function researchHead(eyebrow, h1, lead = "") {
  return `<div class="pagehead"><span class="eyebrow">Research · ${eyebrow}</span><h1>${h1}</h1>${lead}
    <form class="minisearch rsearch" id="rf"><label class="sr" for="rq">Research a verse or a topic</label><input id="rq" placeholder="A verse (John 1:1) or a topic (covenant, shepherd)" autocomplete="off"><button class="btn pri">Research</button></form></div>`;
}
function wireResearchForm() {
  $("#rf")?.addEventListener("submit", e => {
    e.preventDefault();
    const q = $("#rq").value.trim(); if (!q) return;
    const sk = normaliseStrong(q);
    if (sk) { location.hash = `#/word/${sk}`; return; }
    const r = parseReference(q, chapterCount);
    location.hash = r ? `#/research/${toOsis(r.book, r.chapter, r.verse || 1)}` : `#/research/topic/${encodeURIComponent(q)}`;
  });
}

async function renderResearch(rest) {
  setNav("research");
  await getIndex();
  const [a, b] = rest;
  if (a === "topic" && b) return renderTopic(b);
  if (a === "person" && b) return renderEntityGraph("person", b);
  if (a === "place" && b) return renderEntityGraph("place", b);
  if (a && fromOsis(a)) return renderVerseGraph(a);
  setTitle("Research");
  view.innerHTML = researchHead("Knowledge graph", "Follow a verse into everything connected to it.", `<p class="small" style="max-width:70ch">Every link comes from a named dataset: Hebrew and Greek word tagging (STEPBible), people, places and events (Theographic) and cross references voted by readers (OpenBible.info). Nothing on these pages is generated by AI.</p>`) + `
    <div class="grid3">
      <section class="card"><span class="eyebrow">Verse graph</span><h2 style="font-size:1.4rem">From one verse outward</h2><p class="small">The verse's key Hebrew or Greek words, the people, places and events in it, and the passages most often linked to it, with the words they share.</p>
        <ul class="linklist">${[["John.1.1", "In the beginning was the Word"], ["Gen.12.3", "In thee shall all families be blessed"], ["Ps.23.1", "The LORD is my shepherd"], ["Rom.5.8", "While we were yet sinners"]].map(([o, d]) => `<li><a href="#/research/${o}"><span><span class="t">${labelOf(o)}</span><span class="d">${d}</span></span><span class="arr">›</span></a></li>`).join("")}</ul></section>
      <section class="card"><span class="eyebrow">Topic research</span><h2 style="font-size:1.4rem">From an English word to the originals</h2><p class="small">Which Hebrew and Greek words lie behind an English word, how often, and where in the Bible each one is concentrated.</p>
        <ul class="linklist">${["covenant", "grace", "shepherd", "love", "righteousness", "spirit"].map(t => `<li><a href="#/research/topic/${t}"><span><span class="t">${t[0].toUpperCase() + t.slice(1)}</span></span><span class="arr">›</span></a></li>`).join("")}</ul></section>
      <section class="card"><span class="eyebrow">People and places</span><h2 style="font-size:1.4rem">Lives and locations</h2><p class="small">A person's family, the places and events of their life and the verses that mention them, or everything that happened at a place.</p>
        <ul class="linklist">${[["person", "abraham_58", "Abraham"], ["person", "ruth_2450", "Ruth"], ["person", "paul_2479", "Paul"], ["place", "jerusalem_636", "Jerusalem"], ["place", "bethel_202", "Bethel"]].map(([k, s, n]) => `<li><a href="#/research/${k}/${s}"><span><span class="t">${n}</span><span class="d">${k === "person" ? "Person" : "Place"}</span></span><span class="arr">›</span></a></li>`).join("")}</ul></section>
    </div>`;
  wireResearchForm();
}

async function renderVerseGraph(osis) {
  const r = fromOsis(osis); const verse = r.verse || 1;
  const key = r.book * 1e6 + r.chapter * 1e3 + verse, label = formatRef(r.book, r.chapter, verse);
  setTitle(`${label} · Research`);
  view.innerHTML = researchHead("Verse graph", esc(label)) + `<div id="rg"><p class="loading">Gathering connections…</p></div>`;
  wireResearchForm();
  const t = store.setting("translation", "kjv");
  const [orig, vx, xref, pm, lm, em, text] = await Promise.all([loadOrig(r.book, r.chapter).catch(() => null), H.vx(r.book), loadXref(r.book), H.peopleMap(), H.placeMap(), H.eventMap(), verseText(TR[t] ? t : "kjv", toOsis(r.book, r.chapter, verse)).catch(() => "")]);
  const words = orig?.verses[verse - 1] || [];
  const lex = await lexMapOf([...new Set(words.map(w => w[3]).filter(k => k && !isGrammaticalStrong(k)))]);
  const keys = keyLemmas(words, lex, 7);
  const tags = vx[key] || [[], [], []];
  const P = tags[0].filter(s => !NO_GRAPH_PEOPLE.has(s)).map(s => pm.get(s)).filter(Boolean).sort((a, b) => b[5] - a[5]).slice(0, 6);
  const L = tags[1].map(s => lm.get(s)).filter(Boolean).slice(0, 5);
  const E = tags[2].map(i => em.get(i)).filter(Boolean).slice(0, 4);
  const X = (xref[key] || []).slice(0, 7);
  const greek = r.book >= 39;
  // what each linked verse shares with this one, in the original language
  const shared = await Promise.all(X.map(async ([to]) => {
    const u = unpackRef(to);
    const o = await loadOrig(u.book, u.chapter).catch(() => null);
    const ks = sharedStrongs(words, o?.verses[u.verse - 1] || [], isGrammaticalStrong);
    const lx = await lexMapOf(ks.slice(0, 6));
    return ks.filter(k => lx.get(k) && lx.get(k).n <= 3000).slice(0, 3).map(k => ({ k, e: lx.get(k) }));
  }));
  const groups = [
    { type: "word", nodes: keys.map(k => ({ id: k.strong, label: k.form.replace(/[׃,.;·]/g, ""), title: `${k.translit}, “${k.gloss}”`, href: `#/word/${k.strong}`, lang: greek ? "grc" : "hbo" })) },
    { type: "person", nodes: P.map(p => ({ id: p[0], label: p[1], title: p[3] || p[1], href: `#/research/person/${p[0]}` })) },
    { type: "place", nodes: L.map(p => ({ id: p[0], label: p[1], href: `#/research/place/${p[0]}` })) },
    { type: "event", nodes: E.map(e => ({ id: "e" + e.id, label: e.title, href: `#/history/timeline#e${e.id}` })) },
    { type: "verse", nodes: X.map(([to, votes], i) => ({ id: "v" + to, label: refLabel(to), title: `${votes} reader votes${shared[i].length ? "; shares " + shared[i].map(s => s.e.translit.replace(/\./g, "")).join(", ") : ""}`, href: `#/research/${refOsis(to)}`, r: 6 + Math.min(5, Math.round(votes / Math.max(1, X[0][1]) * 5)) })) }
  ];
  const layout = radialLayout(groups, graphDims());
  const xrows = await Promise.all(X.map(async ([to, votes], i) => `<div class="hit"><span class="meta"><a class="ref" href="#/research/${refOsis(to)}">${refLabel(to)}</a><span class="small">${votes} reader votes</span><a class="small" href="${readUrl(TR[t] ? t : "kjv", unpackRef(to).book, unpackRef(to).chapter, unpackRef(to).verse)}">Read</a></span>
    <span class="tx small-tx">${esc(await anyText(refOsis(to)))}</span>
    ${shared[i].length ? `<span class="small">Shares ${shared[i].map(s => `<a class="chip scripture" href="#/word/${s.k}"><span lang="${greek ? "grc" : "hbo"}">${esc(s.e.lemma)}</span> ${esc(s.e.translit.replace(/\./g, ""))}, “${esc(s.e.gloss)}”</a>`).join(" ")}</span>` : `<span class="small">No key word in common${(unpackRef(to).book >= 39) !== greek ? " (one verse is Hebrew, the other Greek)" : ""}: the link is by theme.</span>`}</div>`));
  $("#rg").innerHTML = `<blockquote class="rverse" dir="${dirOf(TR[t] ? t : "kjv")}">${esc(text)} <cite>${label}, ${esc(META[TR[t] ? t : "kjv"].name)}</cite></blockquote>
    <div class="card graphcard">${groups.some(g => g.nodes.length) ? graphSvg(layout, label, greek ? "Greek" : "Hebrew") + graphLegend(groups.filter(g => g.nodes.length).map(g => g.type)) : `<p class="empty">Nothing is tagged for this verse.</p>`}
      <p class="small">Tap a verse, person or place to move the centre of the graph there. Word links open the word study.</p>
      <div class="actions"><a class="btn" href="${readUrl(TR[t] ? t : "kjv", r.book, r.chapter, verse)}">Open in the reader</a>${verse > 1 ? `<a class="btn" href="#/research/${toOsis(r.book, r.chapter, verse - 1)}">‹ Previous verse</a>` : ""}${verse < (INDEX.books[r.book].verses[r.chapter - 1] || 0) ? `<a class="btn" href="#/research/${toOsis(r.book, r.chapter, verse + 1)}">Next verse ›</a>` : ""}<a class="btn" href="#/guide/${BOOKS[r.book].osis}.${r.chapter}">Study guide</a></div></div>
    <div class="two">
      <section class="card"><h2 style="font-size:1.4rem">Connected verses</h2><p class="small">The passages readers most often link to ${label}, and the Hebrew or Greek words each one shares with it.</p><div class="results">${xrows.join("") || `<p class="small">No cross references are recorded.</p>`}</div>
        <p class="small">Cross references: OpenBible.info, CC BY. A shared word is a fact about the text; whether the authors meant the link is a matter of interpretation.</p></section>
      <section class="card"><h2 style="font-size:1.4rem">Key words</h2>${keys.length ? `<div class="plist">${keys.map(k => `<a href="#/word/${k.strong}"><b lang="${greek ? "grc" : "hbo"}">${esc(k.form)}</b><span class="small">${esc(k.translit)} · “${esc(k.gloss)}” · ${k.total.toLocaleString()} uses in the Bible</span></a>`).join("")}</div>` : `<p class="small">No key words found.</p>`}
        ${P.length || L.length ? `<h3>People and places</h3><div class="plist">${P.map(p => `<a href="#/research/person/${p[0]}"><b>${esc(p[1])}</b><span class="small">${esc(p[3] || "Person")}</span></a>`).join("")}${L.map(p => `<a href="#/research/place/${p[0]}"><b>${esc(p[1])}</b><span class="small">${esc(p[4] || "Place")}</span></a>`).join("")}</div>` : ""}
        ${E.length ? `<h3>Events</h3><ul class="evlist">${E.map(e => `<li><span class="yr">${yearText(e.year)}</span> ${certChip(e.year)}<br><a href="#/history/timeline#e${e.id}">${esc(e.title)}</a></li>`).join("")}</ul>` : ""}
        <p class="small">Word tagging: STEPBible TAHOT and TAGNT, CC BY 4.0. People, places and events: Theographic, CC BY-SA 4.0. Key words are nouns, verbs and adjectives, ranked by how rare they are.</p></section>
    </div>`;
}

async function renderEntityGraph(kind, slug) {
  const [ent, pm, lm, em] = await Promise.all([kind === "person" ? H.person(slug) : H.place(slug), H.peopleMap(), H.placeMap(), H.eventMap()]);
  if (!ent) { view.innerHTML = `<p class="empty">Not found. <a href="#/research">Back to Research</a>.</p>`; return; }
  setTitle(`${ent.name} · Research`);
  const pnode = (s, rel) => { const r = pm.get(s); return r && { id: s, label: r[1], title: rel ? `${rel}: ${r[3] || r[1]}` : r[3] || r[1], href: `#/research/person/${s}` }; };
  const lnode = s => { const r = lm.get(s); return r && { id: s, label: r[1], href: `#/research/place/${s}` }; };
  const evs = ent.events.map(i => em.get(i)).filter(Boolean).sort((a, b) => a.sort - b.sort);
  const verseNodes = ent.verses.slice(0, 5).map(n => ({ id: "v" + n, label: refLabel(n), href: `#/research/${refOsis(n)}`, r: 6 }));
  let groups;
  if (kind === "person") {
    const fam = [...ent.father.map(s => pnode(s, "Father")), ...ent.mother.map(s => pnode(s, "Mother")), ...ent.partners.map(s => pnode(s, "Spouse")), ...ent.children.slice(0, 6).map(s => pnode(s, "Child")), ...ent.siblings.slice(0, 4).map(s => pnode(s, "Sibling"))].filter(Boolean);
    const places = [...new Set([ent.bornAt, ent.diedAt, ...evs.flatMap(e => e.places)].filter(Boolean))].map(lnode).filter(Boolean).slice(0, 6);
    groups = [{ type: "family", nodes: fam }, { type: "place", nodes: places }, { type: "event", nodes: evs.slice(0, 6).map(e => ({ id: "e" + e.id, label: e.title, href: `#/history/timeline#e${e.id}` })) }, { type: "verse", nodes: verseNodes }];
  } else {
    const ppl = [...new Set([...ent.born, ...ent.died, ...evs.flatMap(e => e.people)])].filter(s => !NO_GRAPH_PEOPLE.has(s)).map(s => pnode(s)).filter(Boolean).sort((a, b) => (pm.get(b.id)[5] - pm.get(a.id)[5])).slice(0, 8);
    groups = [{ type: "person", nodes: ppl }, { type: "event", nodes: evs.slice(0, 6).map(e => ({ id: "e" + e.id, label: e.title, href: `#/history/timeline#e${e.id}` })) }, { type: "verse", nodes: verseNodes }];
  }
  const sub = kind === "person" ? (ent.desc || "Person") : (ent.type || "Place");
  view.innerHTML = researchHead(kind === "person" ? "Person graph" : "Place graph", esc(ent.name), `<p style="margin:0" class="small">${esc(sub)} · mentioned in ${ent.verses.length.toLocaleString()} verse${ent.verses.length === 1 ? "" : "s"}</p>`) + `
    <div class="card graphcard">${groups.some(g => g.nodes.length) ? graphSvg(radialLayout(groups, graphDims()), ent.name, kind === "person" ? "Person" : "Place") + graphLegend(groups.filter(g => g.nodes.length).map(g => g.type)) : `<p class="empty">No connections are recorded.</p>`}
      <p class="small">Tap a person, place or verse to move the centre there. ${kind === "person" ? "Family links follow the Theographic dataset; biblical genealogies sometimes skip generations." : "Location certainty is shown on the place page."} Dates follow a traditional chronology.</p>
      <div class="actions"><a class="btn pri" href="#/${kind}/${slug}">Full ${kind === "person" ? "profile" : "place page"}, with every verse</a><a class="btn" href="#/research">Research home</a></div></div>
    ${evs.length ? `<section class="card" style="margin-top:16px"><h2 style="font-size:1.4rem">Events, in order</h2><ul class="evlist">${evs.map(e => `<li><span class="yr">${yearText(e.year)}</span> ${certChip(e.year)}<br><a href="#/history/timeline#e${e.id}">${esc(e.title)}</a></li>`).join("")}</ul></section>` : ""}`;
  wireResearchForm();
}

function distSvg(d, testament) {
  const max = Math.max(1, ...d), w = 6, gap = 2;
  return `<svg class="dist" viewBox="0 0 ${66 * (w + gap)} 44" role="img" aria-label="Uses per book, Genesis to Revelation">${d.map((n, i) => `<rect class="${i < 39 ? "ot" : "nt"}" x="${i * (w + gap)}" y="${40 - (n ? Math.max(2, Math.round(n / max * 38)) : 0)}" width="${w}" height="${n ? Math.max(2, Math.round(n / max * 38)) : 0}"><title>${NAMES[i]}: ${n}</title></rect>`).join("")}<line x1="${39 * (w + gap) - 1}" y1="0" x2="${39 * (w + gap) - 1}" y2="44" class="sep"/></svg>`;
}

async function renderTopic(raw) {
  const q = raw.trim();
  setTitle(`${q} · Research`);
  view.innerHTML = researchHead("Topic", esc(q)) + `<div id="rt"><p class="loading">Looking up the Hebrew and Greek behind “${esc(q)}”…</p></div>`;
  wireResearchForm();
  const stems = [...new Set(glossStems(q).length ? glossStems(q) : [stem(q)])].filter(Boolean);
  const shards = await Promise.all([...new Set(stems.map(s => s[0]))].map(l => loadJson(`data/research/en/${l}.json`).catch(() => ({}))));
  const idx = Object.assign({}, ...shards);
  const merged = new Map();
  for (const s of stems) for (const row of idx[s] || []) { const m = merged.get(row[0]); if (!m || m[1] < row[1]) merged.set(row[0], row); }
  const rows = [...merged.values()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const entries = await lexMapOf(rows.map(r => r[0]));
  const lower = q.toLowerCase();
  const [people, places, events] = await Promise.all([H.people(), H.places(), H.events()]);
  const nameHit = s => { const t = s.toLowerCase(); return t === lower || t.startsWith(lower + " ") || t.includes(" " + lower); };
  const P = people.filter(r => nameHit(r[1])).sort((a, b) => b[5] - a[5]).slice(0, 8);
  const L = places.filter(r => nameHit(r[1])).slice(0, 8);
  const E = events.filter(e => e.title.toLowerCase().includes(lower)).slice(0, 8);
  const card = r => {
    const e = entries.get(r[0]); if (!e) return "";
    const d = distribution(e.refs), heb = r[0][0] === "H";
    const top = d.map((n, i) => [n, i]).filter(([n]) => n).sort((a, b) => b[0] - a[0]).slice(0, 3);
    return `<article class="card tcard"><div class="wchead"><a class="big" href="#/word/${r[0]}" dir="${heb ? "rtl" : "ltr"}" lang="${heb ? "hbo" : "grc"}">${esc(r[2])}</a><span class="small">${esc(r[3])} · ${displayStrong(r[0])} · ${heb ? "Hebrew or Aramaic" : "Greek"}</span></div>
      <p class="wgloss">“${esc(r[4])}”</p>
      <p class="small">Glossed with “${esc(q)}” ${r[1].toLocaleString()} time${r[1] === 1 ? "" : "s"} out of ${e.n.toLocaleString()} uses.</p>
      ${distSvg(d)}<div class="distlab small"><span>Genesis</span><span>Matthew</span><span>Revelation</span></div>
      <p class="small">Most used in ${top.map(([n, i]) => `<a href="${readUrl("kjv", i, 1)}">${NAMES[i]}</a> (${n})`).join(", ")}.</p>
      <p class="small"><a href="#/word/${r[0]}">Lexicon entry and every verse ›</a></p></article>`;
  };
  $("#rt").innerHTML = `${rows.length ? `<p class="small" style="max-width:72ch">These are the Hebrew and Greek words that STEPBible's word-by-word English glosses render as “${esc(q)}” (or a form of it), most often first. Glosses are literal and are not the wording of any one translation; the lexicon entry gives each word's full range of meaning.</p>
      <div class="grid3">${rows.map(card).join("")}</div>` : `<p class="empty">No Hebrew or Greek word is glossed with “${esc(q)}”. Try a single word, or a related word (for example “mercy” for “merciful”).</p>`}
    <div class="two" style="margin-top:16px">
      <section class="card"><h2 style="font-size:1.4rem">Verses</h2><p class="small">Search the text of any translation for “${esc(q)}”.</p><a class="btn pri" href="#/search/${encodeURIComponent(q)}">Search the Bible for “${esc(q)}”</a>
        <p class="small">Ask the AI assistant to trace the theme, with every claim cited: <a href="#/ai">AI Studio</a>.</p></section>
      <section class="card"><h2 style="font-size:1.4rem">People, places and events</h2>${P.length || L.length || E.length ? `<div class="plist">${P.map(p => `<a href="#/research/person/${p[0]}"><b>${esc(p[1])}</b><span class="small">${esc(p[3] || "Person")}</span></a>`).join("")}${L.map(p => `<a href="#/research/place/${p[0]}"><b>${esc(p[1])}</b><span class="small">${esc(p[4] || "Place")}</span></a>`).join("")}</div>${E.length ? `<ul class="evlist">${E.map(e => `<li><span class="yr">${yearText(e.year)}</span> <a href="#/history/timeline#e${e.id}">${esc(e.title)}</a></li>`).join("")}</ul>` : ""}` : `<p class="small">No person, place or event is named “${esc(q)}”.</p>`}</section>
    </div>
    <p class="small" style="margin-top:12px">Sources: STEPBible TAHOT, TAGNT, TBESH and TBESG (CC BY 4.0); Theographic Bible Metadata (CC BY-SA 4.0).</p>`;
}

function renderLibrary() {
  setNav("library"); setTitle("Library");
  const credit = (name, url) => `${esc(name)}<br><span class="mono small">${esc(url || "")}</span>`;
  const msLink = m => (m.see[0].startsWith("#") ? m.see[0] : `#/read/kjv/${m.see[0]}`);
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">Library</span><h1>The manuscripts behind the text, and where every source comes from.</h1>
    <p class="small" style="max-width:72ch">Scripture Atlas is self-contained: everything you read here is hosted here. Sources are credited below as their licences require.</p></div>
    <section><h2 style="font-size:1.6rem;margin:0 0 10px">Manuscripts and editions</h2>
      <p class="small" style="max-width:72ch">No original manuscript of any biblical book survives. What we have are copies, and copies of copies, which scholars compare to recover the earliest text. Dates are estimates; where they are debated a range is given.</p>
      <div class="grid3">${MANUSCRIPTS.map(m => `<article class="card mscard"><span class="eyebrow">${esc(m.lang)}</span><h3 style="font-size:1.3rem;margin:4px 0">${esc(m.name)}</h3>
        <p class="small"><b>${esc(m.date)}</b> · ${esc(m.where)}</p><p>${esc(m.about)}</p><a class="small" href="${msLink(m)}">${esc(m.see[1])} ›</a></article>`).join("")}</div>
      <p class="small">Scripture Atlas editorial summaries of widely published scholarship.</p></section>
    <div class="card" style="margin:22px 0 18px"><h2 style="font-size:1.5rem;margin-bottom:8px">Source register</h2><div class="tablewrap"><table class="reg">
      <thead><tr><th>Source</th><th>Type</th><th>Owner</th><th>Licence</th><th>How it is used</th></tr></thead>
      <tbody>${SOURCES.map(s => `<tr><td>${credit(s.name, s.url)}</td><td>${s.type}</td><td>${s.owner}</td><td>${s.licence}</td><td>${s.use}</td></tr>`).join("")}
      <tr><td>${credit("54 Bibles from eBible.org", "https://ebible.org/")}</td><td>Scripture · translations</td><td>Each translation's publisher</td><td>Public domain, CC BY, CC BY-SA or CC BY-ND, shown on each Bible's page</td><td>Full text, unchanged</td></tr>
      <tr><td>${credit("Theographic Bible Metadata", "https://github.com/robertrouse/theographic-bible-metadata")}</td><td>People, places, events</td><td>Robert Rouse</td><td>CC BY-SA 4.0 (derived data shared alike)</td><td>Family trees, map, timeline and verse tagging</td></tr>
      <tr><td>Easton's Bible Dictionary</td><td>Historic reference</td><td>M. G. Easton, 1897</td><td>Public domain</td><td>Entries on people and places, labelled as historic</td></tr>
      <tr><td>${credit("Natural Earth", "https://www.naturalearthdata.com/")}</td><td>Base map</td><td>Natural Earth</td><td>Public domain</td><td>Coastlines, rivers and lakes</td></tr>
      ${(INDEX?.language?.sources || []).map(s => `<tr><td>${credit(s.name, s.url)}</td><td>Original language data</td><td>${s.owner}</td><td>${s.licence}</td><td>Word tagging, lexicons or cross references</td></tr>`).join("")}</tbody></table></div></div>
    <section class="card"><h2 style="font-size:1.5rem">How to read the labels</h2>
      <dl class="facts" style="margin-top:10px;grid-template-columns:110px minmax(0,1fr)">
        <dt>Scripture</dt><dd>The Bible text itself, in a named translation.</dd>
        <dt>Translation</dt><dd>How another translation renders the same verse.</dd>
        <dt>Editorial</dt><dd>Scripture Atlas notes on history and dating, showing each scholarly view.</dd>
        <dt>AI</dt><dd>Generated by the research assistant, with every claim tied to a cited source.</dd>
      </dl>
      <p class="small">Translation versions in use: ${INDEX ? INDEX.translations.map(t => `${t.short} (checksum ${t.checksum})`).join(", ") : "loading"}.</p></section>`;
}

/* ---------- one verse in every translation ---------- */
async function renderCompare(osis) {
  await getIndex();
  const r = fromOsis(osis || ""); if (!r) { location.replace("#/bibles"); return; }
  const v = r.verse || 1, label = formatRef(r.book, r.chapter, v), o = toOsis(r.book, r.chapter, v);
  setNav("bibles"); setTitle(`${label} in every translation`);
  const list = allTranslations();
  const groups = new Map();
  for (const t of list) { if (!groups.has(t.languageEn)) groups.set(t.languageEn, []); groups.get(t.languageEn).push(t); }
  const order = [...groups.keys()].sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)));
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">Bibles · compare</span><h1>${esc(label)} in ${list.length} Bibles</h1>
    <div class="actions">${v > 1 ? `<a class="btn" href="#/compare/${toOsis(r.book, r.chapter, v - 1)}">‹ Previous verse</a>` : ""}<a class="btn" href="#/compare/${toOsis(r.book, r.chapter, v + 1)}">Next verse ›</a><a class="btn" href="#/read/kjv/${o}">Open in the reader</a><a class="btn" href="#/research/${o}">Connections</a></div>
    <p class="small" style="max-width:72ch">Each translation keeps its own verse numbering, so a few (Psalms especially) may show a neighbouring verse; the Bible's page explains its numbering.</p></div>
    ${order.map(l => `<section class="tlang"><h2>${esc(l)}</h2><div class="results">${groups.get(l).map(t => `<div class="hit"><span class="meta"><a class="ref" href="#/translation/${t.id}">${esc(t.name)}</a><span class="chip ext">${esc(t.licence.replace(" (text shown unchanged)", ""))}</span></span><span class="tx" dir="${t.dir}" lang="${t.code}" data-cmp="${t.id}"><span class="loading small">Loading…</span></span></div>`).join("")}</div></section>`).join("")}`;
  // load a few at a time so the page fills in progressively
  const ids = order.flatMap(l => groups.get(l).map(t => t.id));
  for (let i = 0; i < ids.length; i += 6) await Promise.all(ids.slice(i, i + 6).map(async id => {
    const el = view.querySelector(`[data-cmp="${id}"]`); if (!el) return;
    const txt = await verseText(id, o).catch(() => "");
    el.innerHTML = txt ? esc(txt) : `<em class="small">Not in this translation at this reference.</em>`;
  }));
}

function renderSoon(key) {
  const s = SOON[key];
  if (!s) return renderHome();
  setNav(key); setTitle(s.title);
  view.innerHTML = `<div class="pagehead soon"><span class="eyebrow">${s.title} · arrives in Phase ${s.phase}</span><h1>${s.lead}</h1></div>
    <div class="two"><section class="card soon"><h2 style="font-size:1.4rem">What it will do</h2><ul>${s.items.map(i => `<li>${i}</li>`).join("")}</ul></section>
    <section class="card"><h2 style="font-size:1.4rem">Available now</h2><p class="small">Open any verse in the reader for background, other translations, the Hebrew or Greek, cross references and connections.</p><a class="btn pri" href="#/read">Open the reader</a></section></div>`;
}

/* ---------- router ---------- */
async function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, "").split("#")[0]);
  const [head, ...rest] = h.split("/");
  document.body.classList.remove("focus"); document.querySelector(".exitfocus")?.remove();
  try {
    if (head === "read") await renderRead(rest[0], rest[1]);
    else if (head === "search") await renderSearch(rest.join("/"));
    else if (head === "word") await renderWord(rest[0]);
    else if (head === "languages") renderLanguages();
    else if (head === "ai") renderAI(rest[0]);
    else if (head === "bibles") await renderTranslations();
    else if (head === "guide") await renderGuide(rest[0]);
    else if (head === "translation") await renderTranslation(rest[0]);
    else if (head === "compare") await renderCompare(rest[0]);
    else if (head === "history") await renderHistory(rest[0] || "map");
    else if (head === "learn") { if (rest[1]) await renderLesson(rest[0], rest[1]); else if (rest[0]) renderCourse(rest[0]); else renderLearn(); }
    else if (head === "person") await renderPerson(rest[0]);
    else if (head === "place") await renderPlace(rest[0]);
    else if (head === "study") await renderStudy();
    else if (head === "library") { await getIndex(); renderLibrary(); }
    else if (head === "research") await renderResearch(rest);
    else if (head === "soon") renderSoon(rest[0]);
    else await renderHome();
  } catch (e) {
    console.error(e);
    view.innerHTML = `<p class="empty">Something did not load. Check your connection, then <a href="${location.hash || "#/"}">try again</a>.</p>`;
  }
  if (head !== "read") window.scrollTo(0, 0);
}
addEventListener("hashchange", route);
getIndex().catch(() => {});
route();
