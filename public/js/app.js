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
import { KID_STORIES } from "./kids.js";
import { JOURNEYS } from "./journeys.js";
import { sermonRefs, sermonMarkdown } from "./sermon.js";
import { wordDiff, variantsFor, editionDifferences, lessonMarkdown } from "./lens.js";
import { stem, glossStems, distribution, sharedStrongs, radialLayout, NODE_TYPES, clip } from "./research.js";
import { repeatedWords, keyLemmas, mergeCrossRefs, interpretQuestions, guideMarkdown, OBSERVE, APPLY } from "./guide.js";
import { KINDS, STATUS as DSTATUS, DATING, parseRange, forVerse as discForVerse, forChapter as discForChapter, forPerson as discForPerson, forPlace as discForPlace, inEra as discInEra, related as discRelated, filterList as discFilter } from "./discoveries.js";
import { DISCOVERIES } from "./discoveries-data.js";
import { describeMorph, languageOf, normaliseStrong, shardOf, displayStrong, isGrammaticalStrong, editionNote } from "./lang.js";

// Images load from images.js when present (public domain, credited in the Library).
let IMAGES = {};
const imagesReady = import("./images.js").then(m => { IMAGES = m.IMAGES || {}; }).catch(() => {});
function pic(slot, { cls = "", sizes = "100vw", eager = false } = {}) {
  const m = IMAGES[slot]; if (!m) return "";
  return `<img class="${cls}" src="img/${slot}-sm.webp" srcset="img/${slot}-sm.webp 640w, img/${slot}.webp 1600w" sizes="${sizes}" alt="${esc(m.alt || m.title)}" width="${m.w}" height="${m.h}" style="object-position:${m.focus || "50% 50%"}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const artHead = slot => (IMAGES[slot] ? `<div class="pagehead art">${pic(slot, { cls: "headart", sizes: "(max-width: 720px) 100vw, 62vw", eager: true })}` : `<div class="pagehead">`);
const credit = slot => { const m = IMAGES[slot]; return m ? `${esc(m.artist)}, ${esc(m.title)}${m.date ? ` (${esc(m.date)})` : ""}` : ""; };

// Gustave Doré's Bible engravings (1866, public domain), one per book and for major people, from art.js when present.
let BOOK_ART = {}, PEOPLE_ART = {};
const artReady = import("./art.js").then(m => { BOOK_ART = m.BOOK_ART || {}; PEOPLE_ART = m.PEOPLE_ART || {}; }).catch(() => {});
function artImg(kind, key, { cls = "", sizes = "100vw", eager = false } = {}) {
  const m = (kind === "books" ? BOOK_ART : PEOPLE_ART)[key]; if (!m) return "";
  const big = m.large !== false;
  return `<img class="${cls}" src="img/${kind}/${key}-sm.webp" ${big ? `srcset="img/${kind}/${key}-sm.webp 600w, img/${kind}/${key}.webp 1400w" sizes="${sizes}"` : ""} alt="${esc(m.alt || m.title)}" width="${m.w}" height="${m.h}" style="object-position:${m.focus || "50% 40%"}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const bookArt = (i, o) => artImg("books", BOOKS[i].osis, o);
const personArt = (slug, o) => artImg("people", slug, o);
const artCredit = (kind, key) => { const m = (kind === "books" ? BOOK_ART : PEOPLE_ART)[key]; return m ? `Gustave Doré, ${esc(m.title)} (1866)${m.related && m.note ? `. ${esc(m.note)}` : ""}` : ""; };
// A horizontal, swipeable row of picture cards. items: [{ href, img, title, sub }]
const carousel = (label, items, cls = "") => items.length ? `<div class="snap ${cls}" role="list" aria-label="${esc(label)}">${items.map(c => `<a class="scard" role="listitem" href="${c.href}"><span class="simg">${c.img || `<span class="sfall"></span>`}</span><span class="scap"><b>${c.title}</b>${c.sub ? `<span>${c.sub}</span>` : ""}</span></a>`).join("")}</div>` : "";

/* ---------- discoveries: archaeology, inscriptions, manuscripts, science ---------- */
const DISC = new Map(DISCOVERIES.map(d => [d.id, d]));
const bIdx = code => BOOKS.findIndex(b => b.osis === code);
function discImg(d, { cls = "", sizes = "100vw", eager = false } = {}) {
  const m = d?.image; if (!m?.local) return "";
  return `<img class="${cls}" src="img/disc/${d.id}-sm.webp" srcset="img/disc/${d.id}-sm.webp 640w, img/disc/${d.id}.webp 1400w" sizes="${sizes}" alt="${esc(m.alt || d.name)}" width="${m.w}" height="${m.h}" style="object-position:${m.focus || "50% 50%"}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const discCredit = d => d?.image?.local ? `Photo: ${esc(d.image.author || "unknown")}, ${esc(d.image.licence || "")}, via Wikimedia Commons` : "";
const dChip = d => `<span class="dstat s-${d.status}" title="${esc(DSTATUS[d.status]?.note || "")}">${DSTATUS[d.status]?.label || d.status}</span>`;
/** "2Kgs.9.14-9.29" → "2 Kings 9:14–29" */
function rangeLabel(r) {
  const p = parseRange(r, bIdx); if (!p) return r;
  const [b, c1, v1] = [p.b, Math.floor(p.from / 1e3) % 1e3, p.from % 1e3], [c2, v2] = [Math.floor(p.to / 1e3) % 1e3, p.to % 1e3];
  if (v2 === 999 && v1 === 1) return c1 === c2 ? formatRef(b, c1) : `${formatRef(b, c1)}–${c2}`;
  return c1 === c2 ? formatRef(b, c1, v1, v2 !== v1 ? v2 : undefined) : `${formatRef(b, c1, v1)}–${c2}:${v2}`;
}
const rangeHref = r => { const p = parseRange(r, bIdx); return p ? readUrl("kjv", p.b, Math.floor(p.from / 1e3) % 1e3, p.from % 1e3 || null) : "#/"; };
const discCard = (d, sizes = "(max-width: 520px) 100vw, 300px") => `<a class="dcard" href="#/discoveries/${d.id}"><span class="dimg">${discImg(d, { sizes }) || `<span class="dfall k-${d.kind}"><b>${esc(KINDS[d.kind] || "")}</b></span>`}</span>
  <span class="dbody"><span class="dmeta">${dChip(d)}<span>${esc(KINDS[d.kind] || "")}</span>${d.objectDate?.text ? `<span>${esc(d.objectDate.text)}</span>` : ""}</span><b>${esc(d.name)}</b><span class="dsum">${esc(d.summary)}</span>
  ${(d.passages || []).length ? `<span class="dpass">${d.passages.slice(0, 2).map(rangeLabel).join(" · ")}${d.passages.length > 2 ? ` +${d.passages.length - 2}` : ""}</span>` : ""}</span></a>`;
/** A compact list of discoveries for side panels (Lens, reader, person, place). */
const discMini = (list, title = "Archaeology and discoveries") => list.length ? `<section class="dmini"><h3>${title}</h3>${list.slice(0, 6).map(d => `<a href="#/discoveries/${d.id}"><span class="dthumb">${discImg(d, { sizes: "64px" }) || `<span class="dfall k-${d.kind}"></span>`}</span><span><b>${esc(d.name)}</b> ${dChip(d)}<span class="small">${esc(d.summary)}</span></span></a>`).join("")}${list.length > 6 ? `<a class="small" href="#/discoveries">${list.length - 6} more in Discoveries ›</a>` : ""}</section>` : "";

async function renderDiscoveries(id) {
  setNav("discoveries");
  if (id) return renderDiscovery(id);
  setTitle("Discoveries");
  const st = { kind: "", status: "", q: "" };
  const datable = DISCOVERIES.filter(d => d.kind !== "method" && d.objectDate).sort((a, b) => a.objectDate.sort - b.objectDate.sort);
  const counts = k => DISCOVERIES.filter(d => d.kind === k).length;
  view.innerHTML = `${artHead("isaiah-scroll")}<span class="eyebrow">Discoveries · Archaeology, manuscripts and science</span><h1>What the ground, the archives and the laboratory add to the Bible.</h1>
    <p>${DISCOVERIES.length} documented finds: inscriptions naming biblical kings, excavated cities, ancient manuscripts and the scientific methods used to date them. Each one is linked to the passages it relates to, and each cites the museums, excavation teams or peer-reviewed studies behind it.</p>
    <form class="minisearch rsearch" id="dsf" role="search"><label class="sr" for="dsq">Find a discovery</label><input id="dsq" type="search" placeholder="A king, a place or a find: Hezekiah, Lachish, scroll" autocomplete="off"></form></div>
  <section class="card dstd"><h2>How to read the evidence</h2>
    <p class="small">Archaeology can show that a person existed, that a city stood at a certain time, or that a text was copied by a certain date. It cannot show that a theological claim is true, and it rarely confirms every detail of a story. Every entry says what the find <b>establishes</b> and what it does <b>not</b>, and gives its status:</p>
    <div class="dlegend">${Object.entries(DSTATUS).map(([k, v]) => `<button type="button" class="dlg" data-status="${k}" aria-pressed="false">${dChip({ status: k })}<span>${esc(v.note)}</span></button>`).join("")}</div></section>
  <div class="dkinds" role="group" aria-label="Kind of discovery"><button type="button" class="btn on" data-kind="">All ${DISCOVERIES.length}</button>${Object.entries(KINDS).filter(([k]) => counts(k)).map(([k, l]) => `<button type="button" class="btn" data-kind="${k}">${l} <span class="small">${counts(k)}</span></button>`).join("")}</div>
  <div id="dgrid" class="dgrid"></div>
  ${datable.length ? `<section class="shelf"><div class="ribbon-head"><h2>Through time</h2><p class="small">Ordered by the date of the object or site, not the date it was found.</p></div>
    <ol class="dtime">${datable.map(d => `<li><a href="#/discoveries/${d.id}"><span class="dty">${esc(yearText(d.objectDate.sort))}</span><b>${esc(d.name)}</b>${dChip(d)}</a></li>`).join("")}</ol></section>` : ""}
  ${DISCOVERIES.some(d => d.location) ? `<section class="shelf"><div class="ribbon-head"><h2>Where they were found</h2><p class="small">Tap a marker to open the discovery.</p></div><div id="dmap" class="dmapbox"><p class="loading">Loading the map…</p></div></section>` : ""}
  <p class="small dnote">Sources open the museum, excavation or journal page in a new tab. Scripture Atlas summaries are editorial; where specialists disagree, the entry says so. Photographs are credited on each page.</p>`;
  const draw = () => {
    const list = discFilter(DISCOVERIES, st).sort((a, b) => (a.kind === "method") - (b.kind === "method") || (a.objectDate?.sort ?? 0) - (b.objectDate?.sort ?? 0));
    $("#dgrid").innerHTML = list.map(d => discCard(d)).join("") || `<p class="empty">No discoveries match. Clear the filters to see all ${DISCOVERIES.length}.</p>`;
  };
  view.querySelectorAll("[data-kind]").forEach(b => b.addEventListener("click", () => { st.kind = b.dataset.kind; view.querySelectorAll("[data-kind]").forEach(x => x.classList.toggle("on", x === b)); draw(); }));
  view.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", () => { st.status = st.status === b.dataset.status ? "" : b.dataset.status; view.querySelectorAll("[data-status]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.status === st.status))); draw(); }));
  $("#dsq").addEventListener("input", e => { st.q = e.target.value; draw(); });
  $("#dsf").addEventListener("submit", e => e.preventDefault());
  draw();
  if ($("#dmap")) {
    const base = await H.base();
    const rows = DISCOVERIES.filter(d => d.location).map(d => [d.id, d.name, d.location.lat, d.location.lon, "Discovery", "located", 40]);
    mountMap($("#dmap"), { base, places: rows, onPick: s => (location.hash = `#/discoveries/${s}`) }).fit(new Set(rows.map(r => r[0])));
  }
}

async function renderDiscovery(id) {
  const d = DISC.get(id);
  if (!d) { view.innerHTML = `<p class="empty">No discovery found. <a href="#/discoveries">Browse all discoveries</a>.</p>`; return; }
  setTitle(d.name);
  const [pm, lm] = await Promise.all([H.peopleMap(), H.placeMap()]);
  const photo = discImg(d, { cls: "headart", sizes: "(max-width: 720px) 100vw, 62vw", eager: true });
  const fact = (k, v) => v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : "";
  const rel = discRelated(DISCOVERIES, d, bIdx);
  view.innerHTML = `<div class="pagehead ${photo ? "art" : ""}">${photo}<span class="eyebrow"><a href="#/discoveries">Discoveries</a> · ${esc(KINDS[d.kind] || "")}</span><h1>${esc(d.name)}</h1>
    <p>${esc(d.summary)}</p><div class="actions">${dChip(d)}<span class="small">${esc(DSTATUS[d.status]?.note || "")}</span></div>${photo ? `<p class="headcredit">${discCredit(d)}</p>` : ""}</div>
  <div class="dlayout">
    <div class="dmain">
      <section class="card"><h2>What it is</h2><p>${esc(d.description)}</p></section>
      ${d.connection ? `<section class="card"><h2>${d.kind === "method" ? "How it is used" : "The biblical connection"}</h2><p>${esc(d.connection)}</p>
        ${(d.passages || []).length ? `<div class="dverses" id="dverses">${d.passages.map(r => `<a class="dverse" href="${rangeHref(r)}"><b>${esc(rangeLabel(r))}</b><span class="tx" data-r="${esc(r)}">…</span></a>`).join("")}</div>` : ""}</section>` : ""}
      <div class="two dweigh"><section class="card est"><h2>What it establishes</h2><p>${esc(d.establishes)}</p></section>
        <section class="card lim"><h2>Limits and debate</h2><p>${esc(d.limits)}</p></section></div>
      <section class="card"><h2>Sources</h2><ol class="dsrc">${(d.sources || []).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a> <span class="small">${esc(s.publisher)} · opens in a new tab</span></li>`).join("")}</ol>
        <p class="small">Summary written by Scripture Atlas from these sources. If you spot an error, the sources above are the authority.</p></section>
    </div>
    <aside class="dside">
      <section class="card"><h2>At a glance</h2><dl class="dfacts">
        ${fact("Date of the object", esc(d.objectDate?.text || ""))}
        ${fact("Found", d.found ? esc([d.found.year, d.found.by].filter(Boolean).join(", ")) : "")}
        ${fact("Where found", d.location?.placeSlug && lm.get(d.location.placeSlug) ? `<a href="#/place/${d.location.placeSlug}">${esc(d.found?.where || lm.get(d.location.placeSlug)[1])}</a>` : esc(d.found?.where || ""))}
        ${fact("Where it is now", esc([d.heldAt?.institution, d.heldAt?.ref].filter(Boolean).join(", ")))}
        ${fact("Language", esc(d.language || ""))}
        ${fact("Dated by", (d.dating || []).map(m => esc(DATING[m] || m)).join(", "))}
      </dl></section>
      ${(d.people || []).length ? `<section class="card"><h2>People</h2><div class="plist">${d.people.map(s => pm.get(s) ? `<a href="#/person/${s}"><b>${esc(pm.get(s)[1])}</b><span class="small">${esc(pm.get(s)[3] || "")}</span></a>` : "").join("")}</div></section>` : ""}
      ${d.location ? `<section class="card"><h2>On the map</h2><div id="dpmap" class="dpmap"></div></section>` : ""}
      ${(d.passages || []).length ? `<a class="btn pri" href="#/lens/${(() => { const p = parseRange(d.passages[0], bIdx); return toOsis(p.b, Math.floor(p.from / 1e3) % 1e3, p.from % 1e3 || 1); })()}/scholar">Study the passage in Scripture Lens</a>` : ""}
    </aside>
  </div>
  ${rel.length ? `<section class="shelf"><div class="ribbon-head"><h2>Related discoveries</h2></div><div class="dgrid">${rel.map(x => discCard(x)).join("")}</div></section>` : ""}`;
  view.querySelectorAll("#dverses .tx").forEach(async el => {
    const p = parseRange(el.dataset.r, bIdx); if (!p) return;
    const t = await verseText("kjv", toOsis(p.b, Math.floor(p.from / 1e3) % 1e3, p.from % 1e3 || 1)).catch(() => "");
    el.textContent = t ? `${t}${p.to > p.from ? " …" : ""}` : "";
  });
  if (d.location && $("#dpmap")) {
    const base = await H.base();
    mountMap($("#dpmap"), { base, places: [[d.id, d.name, d.location.lat, d.location.lon, "Discovery", "located", 40], ...DISCOVERIES.filter(x => x.location && x.id !== d.id).map(x => [x.id, x.name, x.location.lat, x.location.lon, "Discovery", "located", 10])], focus: d.id, onPick: s => (location.hash = `#/discoveries/${s}`) }).focusOn(d.id, 10);
  }
}

function renderBooks() {
  setNav("read"); setTitle("Books of the Bible");
  view.innerHTML = `<div class="pagehead"><span class="eyebrow">Read · All 66 books</span><h1>Books of the Bible</h1>
    <p class="small">Each book is shown with one of Gustave Doré's engravings for La Grande Bible de Tours (1866). Where Doré made no plate for a book, a related plate is used and the caption says how it relates.</p></div>
    ${GROUPS.map(([g, a, z]) => `<section class="bookgroup"><h2><span>${g}</span><span class="small">${z - a + 1} book${z === a ? "" : "s"}</span></h2>
      <div class="bookgrid">${NAMES.slice(a, z + 1).map((n, k) => { const i = a + k; return `<a class="bookcard" href="#/read/kjv/${BOOKS[i].osis}.1"><span class="bimg">${bookArt(i, { sizes: "(max-width: 520px) 50vw, 220px" }) || `<span class="sfall"></span>`}</span><span class="bcap"><b>${esc(n)}</b><span>${esc((CONTEXT[i]?.[5] || "").split(",").slice(0, 3).join(","))}</span></span></a>`; }).join("")}</div></section>`).join("")}`;
}

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
const loadKjvs = (b, c) => loadJson(`data/kjvs/${fileId(b)}/${String(c).padStart(3, "0")}.json`);
const loadRenderings = k => loadJson(`data/kjvs/render/${shardOf(k)}.json`).then(s => s[k] || null).catch(() => null);
const baseStrong = k => (k || "").slice(0, 5);
async function lexFor(k, verseWords = []) {
  // KJV tags use plain Strong's numbers (H0430); the lexicon distinguishes senses (H0430G). Prefer the sense used in this verse.
  const shard = await loadJson(`data/lex/${shardOf(k)}.json`).catch(() => ({}));
  const inVerse = verseWords.map(w => w[3]).find(x => baseStrong(x) === k && shard[x]);
  const key = inVerse || (shard[k] ? k : Object.keys(shard).find(x => baseStrong(x) === k));
  return key ? { key, ...shard[key] } : null;
}
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
  document.querySelectorAll("nav.main a, nav.tabbar a").forEach(a => a.classList.toggle("on", a.dataset.nav === key));
  const inBar = [...document.querySelectorAll("nav.tabbar a")].some(a => a.dataset.nav === key);
  document.querySelector("#morebtn")?.classList.toggle("on", !inBar && key !== "home");
}
// Phone "More" sheet: the full section list, as large picture-free tiles.
function closeMore() { const s = document.querySelector("#moresheet"); if (s && !s.hidden) { s.hidden = true; document.querySelector("#morebtn")?.setAttribute("aria-expanded", "false"); } }
(function wireTabbar() {
  const btn = document.querySelector("#morebtn"), sheet = document.querySelector("#moresheet"); if (!btn || !sheet) return;
  sheet.querySelector(".sheetlinks").innerHTML = [...document.querySelectorAll("nav.main a")].map(a => `<a href="${a.getAttribute("href")}" data-nav="${a.dataset.nav}">${a.textContent}</a>`).join("") + `<a href="#/books" data-nav="read">All 66 books</a>`;
  btn.addEventListener("click", () => { const open = sheet.hidden; sheet.hidden = !open; btn.setAttribute("aria-expanded", String(open)); });
  sheet.addEventListener("click", e => { if (e.target === sheet || e.target.closest("a, .sheetclose")) closeMore(); });
  addEventListener("keydown", e => { if (e.key === "Escape") closeMore(); });
})();
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
const THREADS = [["Gen.1.1", "Genesis 1:1"], ["John.1.1", "John 1:1"], ["Ps.23.1", "Psalm 23:1"], ["John.3.16", "John 3:16"]];
async function renderHome() {
  setNav("home"); setTitle("");
  await getIndex();
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const votd = DAILY[day % DAILY.length], vr = fromOsis(votd);
  const pos = store.position(), posRef = pos && fromOsis(pos.osis);
  const tile = (href, slot, title, desc, cls = "") => `<a class="tile ${cls}" href="${href}">${pic(slot, { cls: "tart", sizes: "(max-width: 760px) 100vw, 40vw" }) || `<span class="tart fallback"></span>`}<span class="tcap"><b>${title}</b><span>${desc}</span></span></a>`;
  const ms = MANUSCRIPTS.filter(m => IMAGES[m.img]);
  view.innerHTML = `
  <section class="hero2">
    ${pic("creation-light", { cls: "heroart", eager: true, sizes: "100vw" })}
    <div class="hero-in">
      <div class="hero-copy">
        <h1>Every word of the Bible, traced to its source.</h1>
        <p>Read ${allTranslations().length} Bibles in ${new Set(allTranslations().map(t => t.languageEn)).size} languages. Tap an English word to reach the Hebrew or Greek behind it, then follow it through history, manuscripts and every verse it touches.</p>
        <form class="bigsearch" id="bigsearch" role="search"><label class="sr" for="bq">Search</label>
          <input id="bq" type="search" placeholder="A verse, a word or a topic: Romans 8:28, shepherd, covenant" autocomplete="off"><button>Search</button></form>
        <div class="tryline"><span>Try</span>${["Psalm 23", "John 1", "covenant", "Abraham", "\"bread of life\""].map(q => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      </div>
      <figure class="threads" id="threads" aria-label="How English words come from the original language">
        <div class="th-tabs" role="tablist">${THREADS.map(([o, l], i) => `<button type="button" role="tab" data-th="${o}" aria-selected="${i === 0}">${l}</button>`).join("")}</div>
        <div class="th-stage"><div class="th-en" id="then"></div><svg class="th-svg" id="thsvg" aria-hidden="true"></svg><div class="th-src" id="thsrc"></div></div>
        <figcaption><span id="thcap">King James Version, with the Hebrew of the Leningrad Codex.</span> Tap a word to open it.</figcaption>
      </figure>
    </div>
    ${IMAGES["creation-light"] ? `<p class="herocredit">${credit("creation-light")}</p>` : ""}
  </section>

  <section class="home-row">
    <div class="votd2"><span class="eyebrow">Verse for today</span><blockquote id="votd">…</blockquote>
      <div class="actions"><a class="btn pri" href="${readUrl("kjv", vr.book, vr.chapter, vr.verse)}">Read in context</a><a class="btn" href="#/research/${votd}">See its connections</a><a class="btn" href="#/compare/${votd}">In every Bible</a></div></div>
    <div class="resume2">${posRef
      ? `<span class="eyebrow">Continue reading</span><h2>${formatRef(posRef.book, posRef.chapter)}</h2><p class="small">${TR[pos.translation] || "KJV"}, last opened ${new Date(pos.at).toLocaleDateString()}</p><a class="btn gold" href="${readUrl(pos.translation || "kjv", posRef.book, posRef.chapter, pos.verse ? fromOsis(pos.verse)?.verse : null)}">Resume reading</a>`
      : `<span class="eyebrow">Start reading</span><h2>Genesis 1</h2><p class="small">Or choose any book in the reader.</p><a class="btn gold" href="#/read/kjv/Gen.1">Open the reader</a>`}
      ${store.streak() ? `<p class="small streak">Study streak: ${store.streak()} day${store.streak() === 1 ? "" : "s"}</p>` : ""}</div>
  </section>

  <section class="mosaic" aria-label="Explore">
    ${tile("#/lens/John.1.1", "sinaiticus", "Scripture Lens", "One verse, every layer: plain meaning, context, the Hebrew or Greek, manuscripts and 11 English translations compared", "t-big")}
    ${tile("#/history/journeys/paul2", "map-paul", "Journeys and maps", "Follow Abraham, the Exodus and Paul stop by stop, with 1,267 places and 450 dated events", "t-tall")}
    ${tile("#/languages", "leningrad", "Hebrew and Greek", "Interlinear for every verse, grammar and lexicon")}
    ${tile("#/bibles", "gutenberg", "54 Bibles, 38 languages", "Each with the story of its translation")}
    <a class="tile t-kids" href="#/kids">${kidImg("hero", "tart")}<span class="tcap"><b>Kids</b><span>Eight Bible stories to read, hear and play</span></span></a>
    ${tile("#/sermon", "era-gospels", "Sermon studio", "Record a sermon, catch every verse, make study notes")}
    ${tile("#/research", "vaticanus", "Research", "Follow a verse into its words, people, places and links")}
    ${tile("#/library", "isaiah-scroll", "The manuscripts", "From the Dead Sea Scrolls to the printed page")}
    ${DISCOVERIES.length ? tile("#/discoveries", "aleppo", "Discoveries", `${DISCOVERIES.length} finds from archaeology, inscriptions and science, each linked to its passages and sources`, "t-wide") : ""}
  </section>

  ${Object.keys(BOOK_ART).length ? `<section class="shelf"><div class="ribbon-head"><h2>The library of 66 books</h2><a class="seeall" href="#/books">See all 66 ›</a></div>
    ${carousel("Books of the Bible", BOOKS.map((b, i) => ({ i, b })).filter(({ b }) => BOOK_ART[b.osis] && !BOOK_ART[b.osis].related).map(({ b, i }) => ({ href: `#/read/kjv/${b.osis}.1`, img: bookArt(i, { sizes: "260px" }), title: esc(NAMES[i]), sub: esc(groupOf(i)) })))}</section>` : ""}

  ${Object.keys(PEOPLE_ART).length ? `<section class="shelf"><div class="ribbon-head"><h2>People of the Bible</h2><a class="seeall" href="#/history/people">All 3,000+ people ›</a></div>
    ${carousel("People of the Bible", Object.keys(PEOPLE_ART).map(s => ({ href: `#/person/${s}`, img: personArt(s, { sizes: "200px" }), title: esc(PEOPLE_ART[s].name || s.replace(/_\d+$/, "").replace(/^./, c => c.toUpperCase())), sub: esc(PEOPLE_ART[s].title) })), "portrait")}</section>` : ""}

  ${ms.length ? `<section class="ribbon"><div class="ribbon-head"><h2>From scroll to screen</h2><p class="small">No original manuscript of any biblical book survives. These copies, oldest first, are how the text reached us.</p></div>
    <ol class="ribbon-track">${ms.map(m => `<li><a href="#/library"><span class="rimg">${pic(m.img, { sizes: "220px" })}</span><span class="rdate">${esc(m.date.replace(/^about /, "c. "))}</span><b>${esc(m.name)}</b></a></li>`).join("")}</ol></section>` : ""}`;

  $("#bigsearch").addEventListener("submit", e => { e.preventDefault(); goSearch($("#bq").value); });
  view.querySelectorAll(".tryline button").forEach(b => b.addEventListener("click", () => goSearch(b.dataset.q)));
  view.querySelectorAll("[data-th]").forEach(b => b.addEventListener("click", () => { view.querySelectorAll("[data-th]").forEach(x => x.setAttribute("aria-selected", x === b)); drawThreads(b.dataset.th); }));
  drawThreads(THREADS[0][0]);
  try {
    const t = await verseText("kjv", votd);
    $("#votd").innerHTML = `${esc(t)}<cite>${labelOf(votd)}, King James Version</cite>`;
  } catch { $("#votd").textContent = labelOf(votd); }
}

// The hero diagram: English words (KJV, Strong's-tagged) joined by gold threads to the Hebrew or Greek words they translate.
let threadsResize = null;
async function drawThreads(osis) {
  const r = fromOsis(osis), fig = $("#threads"); if (!fig) return;
  const [kt, o] = await Promise.all([loadKjvs(r.book, r.chapter), loadOrig(r.book, r.chapter)]);
  const toks = kt.verses[r.verse - 1] || [], words = o.verses[r.verse - 1] || [], heb = r.book < 39;
  const bases = w => (w[4] || w[3] || "").split("/").map(baseStrong).filter(k => k && !/^H90\d\d/.test(k));
  $("#then").innerHTML = toks.map(([t, st, f]) => st ? `<a class="thw" href="${readUrl("kjv", r.book, r.chapter, r.verse)}" data-s="${st}">${esc(t)}</a>` : `<span class="${f & 4 ? "nd" : ""}">${esc(t)}</span>`).join("");
  const src = $("#thsrc"); src.dir = heb ? "rtl" : "ltr"; src.lang = heb ? "hbo" : "grc";
  src.innerHTML = words.map((w, i) => `<a class="ths" href="#/word/${w[3]}" data-s="${bases(w).join(" ")}" title="${esc(w[1])}: ${esc(w[2])}">${esc(w[0].replace(/[׃,.;·]/g, ""))}</a>`).join(" ");
  $("#thcap").textContent = heb ? "King James Version, with the Hebrew of the Leningrad Codex." : "King James Version, with the Greek New Testament.";
  const svg = $("#thsvg");
  const draw = () => {
    const box = fig.querySelector(".th-stage").getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    const srcEls = [...src.querySelectorAll(".ths")];
    let paths = "", n = 0;
    fig.querySelectorAll(".thw").forEach(a => {
      const ks = a.dataset.s.split(" ");
      const target = srcEls.find(e => e.dataset.s.split(" ").some(k => ks.includes(k)));
      if (!target) return;
      const ra = a.getBoundingClientRect(), rb = target.getBoundingClientRect();
      const x1 = ra.left + ra.width / 2 - box.left, y1 = ra.bottom - box.top + 4, x2 = rb.left + rb.width / 2 - box.left, y2 = rb.top - box.top - 4;
      const my = (y1 + y2) / 2;
      a.dataset.i = target.dataset.i = n;
      paths += `<path data-i="${n}" style="--d:${n * 90}ms" d="M${x1.toFixed(1)} ${y1.toFixed(1)} C${x1.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/><circle data-i="${n}" cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="2.4"/><circle data-i="${n}" cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.4"/>`;
      n++;
    });
    svg.innerHTML = paths;
    svg.querySelectorAll("path").forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.setProperty("--len", L); });
  };
  try { await document.fonts?.ready; } catch {}
  draw();
  const hot = (i, on) => fig.querySelectorAll(`[data-i="${i}"]`).forEach(e => e.classList.toggle("hot", on));
  fig.querySelectorAll(".thw, .ths").forEach(e => { e.addEventListener("mouseenter", () => hot(e.dataset.i, true)); e.addEventListener("mouseleave", () => hot(e.dataset.i, false)); e.addEventListener("focus", () => hot(e.dataset.i, true)); e.addEventListener("blur", () => hot(e.dataset.i, false)); });
  if (threadsResize) removeEventListener("resize", threadsResize);
  let t; threadsResize = () => { clearTimeout(t); t = setTimeout(() => { if ($("#thsvg")) { draw(); $("#thsvg").classList.add("still"); } }, 120); };
  addEventListener("resize", threadsResize);
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
  const kjvNotes = R.t === "kjv" || other === "kjv" ? ((await loadKjvs(R.book, R.chapter).catch(() => null))?.notes?.[R.verse] || []) : [];
  const hl = store.highlight(osis), bm = store.isBookmarked(osis);
  return `<div class="pane">
    <div><span class="chip scripture">Scripture · ${TR[R.t]}</span><div class="vref" style="margin-top:6px">${formatRef(R.book, c, v)}</div></div>
    <p class="vtext" dir="${dirOf(R.t)}" lang="${langOf(R.t)}">${mine ? esc(mine).replace(/\n/g, "<br>") : "<em>Not in this translation's base text.</em>"}</p>
    <div class="compare"><span class="chip scripture">Translation · ${TR[other]}</span><p class="vtext" style="margin-top:6px" dir="${dirOf(other)}" lang="${langOf(other)}">${theirs ? esc(theirs).replace(/\n/g, "<br>") : "<em>Not in this translation's base text.</em>"}</p></div>
    ${noteHtml}
    ${kjvNotes.length ? `<div class="textnote margnote"><b>KJV margin</b><br>${kjvNotes.map(esc).join("<br>")}<br><span class="small">The 1611 translators' own notes: alternative renderings and literal Hebrew or Greek.</span></div>` : ""}
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
    <div class="actions"><a class="btn pri" href="#/lens/${osis}">Open in Scripture Lens</a><a class="btn" href="#/research/${osis}">Explore connections</a><a class="btn" href="#/ai/${osis}">Ask the research assistant</a><a class="btn" href="#/guide/${BOOKS[R.book].osis}.${c}">Study guide for this chapter</a></div>
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
  const origin = R.origin != null ? await originCard(R.verse, R.origin, words) : "";
  const card = R.word != null && words[R.word] ? await wordCard(words[R.word], R.book) : `<p class="small">Tap a word for its full entry.</p>`;
  return `<div class="pane">${origin}
    <div><span class="chip lang">${[...new Set(words.map(w => languageOf(w[5], R.book)))].join(" and ")} · ${R.book < 39 ? "Leningrad Codex" : "Greek NT"}</span><div class="vref" style="margin-top:6px">${formatRef(R.book, R.chapter, R.verse)}</div></div>
    <div class="wordrow" dir="${rtl ? "rtl" : "ltr"}" lang="${rtl ? "hbo" : "grc"}">${words.map((w, i) => wordButton(w, i, R.verse, i === R.word)).join("")}</div>
    <div id="wordcard">${card}</div>
    <p class="small">Data: STEPBible.org (Tyndale House, Cambridge), CC BY 4.0. Glosses are word-level aids, not a translation.</p>
  </div>`;
}

async function originCard(v, k, words) {
  const kt = await loadKjvs(R.book, R.chapter).catch(() => null);
  const tok = kt?.verses[v - 1]?.[k]; if (!tok || !tok[1]) return "";
  const heb = R.book < 39, morph = await loadMorph();
  const parts = await Promise.all(tok[1].split(" ").map(async s => {
    const [e, rend] = await Promise.all([lexFor(s, words), loadRenderings(s)]);
    const forms = words.filter(w => baseStrong(w[3]) === s);
    return { s, e, rend, forms };
  }));
  const block = ({ s, e, rend, forms }) => {
    if (!e) return `<p class="small">${displayStrong(s)}: no lexicon entry.</p>`;
    const rtl = s[0] === "H", lang = rtl ? "hbo" : "grc", top = rend?.top || [], max = top[0]?.[1] || 1;
    const f = forms[0];
    return `<div class="origin">
      <div class="thread"><span class="en">${esc(tok[0])}</span><svg viewBox="0 0 120 24" aria-hidden="true"><path d="M2 12 C40 12 80 12 112 12" /><path d="M104 5 L114 12 L104 19" /></svg>
        <span class="src" dir="${rtl ? "rtl" : "ltr"}" lang="${lang}">${esc(f ? f[0].replace(/[׃,.;·]/g, "") : e.lemma)}</span></div>
      <dl class="facts">
        ${f ? `<dt>In this verse</dt><dd><b dir="${rtl ? "rtl" : "ltr"}" lang="${lang}">${esc(f[0])}</b> <span class="small">${esc(f[1])}</span>, “${esc(f[2])}”<br><span class="small">${esc(describeMorph(f[5], morph).map(p => p.summary).join(" + "))}</span></dd>` : ""}
        <dt>Dictionary form</dt><dd><span class="lemma" dir="${rtl ? "rtl" : "ltr"}" lang="${lang}">${esc(e.lemma)}</span> <span class="small">${esc(e.translit.replace(/\./g, ""))}</span><br>${esc(e.gloss)}</dd>
        <dt>Strong's</dt><dd><a href="#/word/${e.key}">${displayStrong(e.key)}</a> · ${rtl ? "Hebrew or Aramaic" : "Greek"} · used ${e.n.toLocaleString()} times</dd>
      </dl>
      ${top.length ? `<div class="rend"><h3>How the KJV translates it</h3><p class="small">${rend.n.toLocaleString()} tagged uses, ${top.length < 12 ? top.length : "12 most common"} English renderings:</p>
        <ul>${top.map(([w, n]) => `<li><span class="w">${esc(w)}</span><span class="bar"><i style="width:${Math.max(3, Math.round(n / max * 100))}%"></i></span><span class="n">${n.toLocaleString()}</span></li>`).join("")}</ul></div>` : ""}
      <div class="actions"><a class="btn pri" href="#/word/${e.key}">Full word study</a><a class="btn" href="#/research/topic/${encodeURIComponent(tok[0].toLowerCase())}">Other words for “${esc(tok[0].toLowerCase())}”</a></div>
    </div>`;
  };
  return `<div class="origincard"><span class="eyebrow">Word origin · ${formatRef(R.book, R.chapter, v)}</span>${parts.map(block).join("")}
    ${!heb && tok[1].includes("H") ? "" : ""}<p class="small">KJV word tagging: CrossWire Bible Society and eBible.org, public domain. Original text: STEPBible, CC BY 4.0. Tagging links a word to its source word; a few tags are approximate.</p></div>`;
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

const ADD = 1, WJ = 2, ND = 4;
function tokensHtml(tokens) {
  const heb = R.book < 39, red = store.setting("redletters", true);
  return tokens.map(([text, strongs, f], k) => {
    const cls = [];
    if (f & ADD) cls.push("add"); if (f & WJ && red) cls.push("wj"); if (f & ND) cls.push("nd");
    const body = esc(text);
    if (strongs) return `<span class="ew ${heb ? "oh" : "og"} ${cls.join(" ")}" data-k="${k}">${body}</span>`;
    return cls.length ? `<span class="${cls.join(" ")}">${body}</span>` : body;
  }).join("");
}
function verseSpan(t, i, text, osis, tokens = null) {
  const cls = ["v"];
  const h = store.highlight(osis); if (h) cls.push("hl-" + h);
  if (store.isBookmarked(osis)) cls.push("bm");
  if (store.note(osis)) cls.push("nt");
  if (R.verse === i + 1) cls.push("sel");
  if (!text) cls.push("absent");
  const body = tokens?.length ? tokensHtml(tokens) : text ? esc(text).replace(/\n/g, "<br>") : "[not in this translation's base text]";
  return `<span class="${cls.join(" ")}" data-v="${i + 1}" data-t="${t}" id="${t}-v${i + 1}" dir="${dirOf(t)}" lang="${langOf(t)}" tabindex="0" role="button" aria-label="Verse ${i + 1}"><sup class="vn">${i + 1}</sup>${body}</span>`;
}

async function renderChapterText() {
  const box = $("#text");
  const parallel = compareWith() && compareWith() !== R.t ? compareWith() : "";
  const lines = store.setting("lines", false);
  const ch = R.chapter - 1;
  const kt = R.t === "kjv" || parallel === "kjv" ? await loadKjvs(R.book, R.chapter).catch(() => null) : null;
  const toks = (t, i) => (t === "kjv" && kt ? kt.verses[i] : null);
  const title = kt?.title && (R.t === "kjv" || parallel === "kjv") ? `<p class="pstitle">${esc(kt.title)}</p>` : "";
  try {
    if (store.setting("interlinear", false)) {
      const [d, o] = await Promise.all([loadBook(R.t, R.book), loadOrig(R.book, R.chapter)]);
      const rtl = o.lang === "hbo";
      box.className = "text inter";
      box.innerHTML = title + d.chapters[ch].map((v, i) => `<div class="ilv">${verseSpan(R.t, i, v, toOsis(R.book, R.chapter, i + 1), toks(R.t, i))}<div class="wordrow" dir="${rtl ? "rtl" : "ltr"}" lang="${rtl ? "hbo" : "grc"}">${(o.verses[i] || []).map((w, k) => wordButton(w, k, i + 1, R.verse === i + 1 && R.word === k)).join("")}</div></div>`).join("");
      return;
    }
    if (parallel) {
      const [a, b] = await Promise.all([loadBook(R.t, R.book), loadBook(parallel, R.book)]);
      const ka = a.chapters[ch] || [], kb = b.chapters[ch] || [];
      const n = Math.max(ka.length, kb.length);
      let html = `<div class="par"><div class="ph">${esc(META[R.t].name)}</div><div class="ph">${esc(META[parallel].name)}</div>`;
      for (let i = 0; i < n; i++) {
        const osis = toOsis(R.book, R.chapter, i + 1);
        html += i < ka.length ? verseSpan(R.t, i, ka[i], osis, toks(R.t, i)) : `<span></span>`;
        html += i < kb.length ? verseSpan(parallel, i, kb[i], osis, toks(parallel, i)) : `<span></span>`;
      }
      box.className = "text"; box.innerHTML = title + html + "</div>";
    } else {
      const d = await loadBook(R.t, R.book);
      const vs = d.chapters[ch];
      if (!vs || !vs.length) { box.innerHTML = `<p class="empty">This translation has no ${formatRef(R.book, R.chapter)}. Its chapters may be numbered differently; try the chapter before or after.</p>`; return; }
      box.dir = dirOf(R.t); box.lang = langOf(R.t);
      const paras = d.paragraphs?.[ch];
      const poetry = vs.some(v => v.includes("\n"));
      if (R.t === "kjv" || lines || !paras) {
        box.className = "text lines";
        box.innerHTML = title + vs.map((v, i) => verseSpan(R.t, i, v, toOsis(R.book, R.chapter, i + 1), toks(R.t, i))).join("");
        if (kt) box.classList.add("origins");
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
    // Discoveries linked to the selected verse (Verse tab) or to this chapter (Book tab).
    const dl = R.tab === "verse" && R.verse ? discForVerse(DISCOVERIES, R.book, R.chapter, R.verse, bIdx) : R.tab === "bg" ? discForChapter(DISCOVERIES, R.book, R.chapter, bIdx) : [];
    if (dl.length) pane.querySelector(".pane")?.insertAdjacentHTML("beforeend", discMini(dl, R.tab === "bg" ? `Discoveries linked to ${formatRef(R.book, R.chapter)}` : "Archaeology and discoveries"));
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

function selectVerse(v, { scroll = false, open = true, word = null, tab = null, origin = null } = {}) {
  R.verse = v; R.word = word; R.origin = origin;
  document.querySelectorAll("#text .ew.on").forEach(el => el.classList.remove("on"));
  if (origin != null) document.querySelector(`#text .v[data-v="${v}"][data-t="kjv"] .ew[data-k="${origin}"]`)?.classList.add("on"); R.tab = tab || (R.tab === "bg" ? "verse" : R.tab);
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
  R.word = null; R.origin = null;
  R.verse = r.verse; if (!["verse", "words", "xref", "people", "bg"].includes(R.tab)) R.tab = "verse";
  store.setSetting("translation", R.t);
  store.visit(toOsis(R.book, R.chapter), R.t);
  setTitle(formatRef(R.book, R.chapter));
  const parallel = compareWith() && compareWith() !== R.t ? compareWith() : "", lines = store.setting("lines", false), size = store.setting("size", "m"), inter = store.setting("interlinear", false);
  const lastBook = R.book === 65 && R.chapter === chapterCount(65), firstBook = R.book === 0 && R.chapter === 1;
  view.innerHTML = `
  <div class="readtools">
    <a class="btn allbooks" href="#/books" title="All 66 books, with pictures">Books</a>
    <label class="sr" for="bk">Book</label><select id="bk">${GROUPS.map(([g, a, z]) => `<optgroup label="${g}">${NAMES.slice(a, z + 1).map((n, k) => `<option value="${a + k}" ${a + k === R.book ? "selected" : ""}>${n}</option>`).join("")}</optgroup>`).join("")}</select>
    <label class="sr" for="cp">Chapter</label><select id="cp">${Array.from({ length: chapterCount(R.book) }, (_, k) => `<option value="${k + 1}" ${k + 1 === R.chapter ? "selected" : ""}>${R.book === 18 ? "Psalm" : "Chapter"} ${k + 1}</option>`).join("")}</select>
    <label class="sr" for="trsel">Translation</label><select id="trsel" class="trsel">${translationOptions(R.t)}</select>
    <label class="sr" for="cmpsel">Compare with</label><select id="cmpsel" class="trsel">${translationOptions(parallel, { none: "Compare with…" })}</select>
    <span class="grow"></span>
    <button class="btn" type="button" id="bgbtn">About ${NAMES[R.book]}</button>
    <a class="btn" href="#/guide/${BOOKS[R.book].osis}.${R.chapter}">Study guide</a>
    <div class="seg" role="group" aria-label="Text size">${["s", "m", "l"].map(x => `<button type="button" data-size="${x}" aria-pressed="${size === x}" aria-label="Text size ${x}">${x === "s" ? "A−" : x === "m" ? "A" : "A+"}</button>`).join("")}</div>
    <button class="btn ${inter ? "on" : ""}" type="button" id="interbtn" aria-pressed="${inter}" title="Show ${R.book < 39 ? "Hebrew" : "Greek"} words under each verse">Interlinear</button>
    ${R.t === "kjv" || parallel === "kjv" ? `<button class="btn ${store.setting("redletters", true) ? "on" : ""}" type="button" id="redbtn" aria-pressed="${store.setting("redletters", true)}" title="Show the words of Jesus in red">Red letters</button>` : ""}
    <button class="btn ${lines ? "on" : ""}" type="button" id="linesbtn" aria-pressed="${lines}" title="One verse per line">Verse lines</button>
    <button class="btn" type="button" id="focusbtn" title="Hide everything except the text">Focus</button>
  </div>
  <div class="reader">
    <article class="page" aria-labelledby="chh">
      ${BOOK_ART[BOOKS[R.book].osis] ? `<figure class="bookban ${R.chapter === 1 ? "" : "slim"}"><a href="#/books" aria-label="All books of the Bible">${bookArt(R.book, { sizes: "(max-width: 960px) 100vw, 760px", eager: true })}</a><figcaption>${artCredit("books", BOOKS[R.book].osis)}</figcaption></figure>` : ""}
      <div class="runhead"><div><span class="eyebrow">${testamentOf(R.book)} · ${groupOf(R.book)}</span><h1 id="chh">${R.book === 18 ? "Psalm" : NAMES[R.book]} <span class="cn">${R.chapter}</span></h1></div>
      <span class="chip scripture">${inter ? `Scripture · ${TR[R.t]} with ${R.book < 39 ? "Hebrew" : "Greek"}` : parallel ? `Scripture · ${TR[R.t]} and ${TR[parallel]}` : `Scripture · ${TR[R.t]}`}</span></div>
      ${R.t === "kjv" ? `<p class="originhint"><span class="ew oh demo">Underlined</span> words come from a ${R.book < 39 ? "Hebrew" : "Greek"} word. Tap one to see it. <i class="add">Italic</i> words were added by the translators.</p>` : ""}
      <p class="small trnote"><a href="#/translation/${R.t}">About the ${esc(META[R.t].name)}</a> · ${esc(META[R.t].licence)}${META[R.t].numbering ? ` · ${esc(META[R.t].numbering)}` : ""}</p>
      ${(() => { const dl = discForChapter(DISCOVERIES, R.book, R.chapter, bIdx); return dl.length ? `<div class="dstrip"><span class="eyebrow">Discoveries for this chapter</span>${dl.slice(0, 5).map(d => `<a href="#/discoveries/${d.id}">${esc(d.name)}</a>`).join("")}</div>` : ""; })()}
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
  $("#redbtn")?.addEventListener("click", () => { store.setSetting("redletters", !store.setting("redletters", true)); renderRead(R.t, toOsis(R.book, R.chapter, R.verse)); });
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
    const ew = el.closest(".ew");
    if (ew) { const v = ew.closest(".v"); return selectVerse(+v.dataset.v, { origin: +ew.dataset.k, tab: "words" }); }
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
  const lists = { notes: store.notes(), bookmarks: store.bookmarks(), highlights: store.highlights(), history: store.history(), collections: collLoad() };
  const sorted = tab === "history" || tab === "collections" ? lists[tab] : lists[tab].slice().sort((a, b) => orderOf(a.osis) - orderOf(b.osis));
  view.innerHTML = `${artHead("aleppo")}<span class="eyebrow">My study</span><h1>Your notes and saved verses</h1>
    <p class="small">Kept in this browser on this device. Export them to keep a copy; accounts that sync across devices arrive in Phase 3.</p>
    <div class="actions"><span class="chip">Study streak: ${store.streak()} day${store.streak() === 1 ? "" : "s"}</span><span class="chip ext">${store.studyDays()} days studied</span><a class="small" href="#/learn">Courses</a></div></div>
    <div class="tabsrow">${[["notes", "Notes"], ["bookmarks", "Bookmarks"], ["highlights", "Highlights"], ["collections", "Collections"], ["history", "Reading history"]].map(([k, l]) => `<button type="button" class="btn ${k === tab ? "on" : ""}" data-st="${k}">${l} (${lists[k].length})</button>`).join("")}
      <span style="flex:1"></span><button class="btn" type="button" id="exp">Download as Markdown</button><button class="btn" type="button" id="cpyall">Copy all</button></div>
    <div class="card"><div class="results" id="slist"><p class="loading">Loading…</p></div></div>
    <p style="margin-top:20px"><button class="btn" type="button" id="clear">Delete all study data on this device</button></p><div id="confirm"></div>`;
  view.querySelectorAll("[data-st]").forEach(b => b.addEventListener("click", () => renderStudy(b.dataset.st)));
  const rows = await Promise.all(sorted.map(async (it, ci) => {
    if (tab === "collections") return `<div class="hit coll"><span class="meta"><b>${esc(it.name)}</b><span class="small">${it.items.length} verse${it.items.length === 1 ? "" : "s"}</span><button class="linkbtn small" type="button" data-delc="${ci}">Delete</button></span>${(await Promise.all(it.items.map(async o => `<a class="cref" href="#/lens/${o}"><b>${labelOf(o)}</b> <span class="small">${esc(await anyText(o))}</span></a>`))).join("")}</div>`;
    if (tab === "history") { const r = fromOsis(it.osis); return `<a class="hit" href="${readUrl(it.translation || "kjv", r.book, r.chapter)}"><span class="meta"><span class="ref">${formatRef(r.book, r.chapter)}</span><span class="small">${TR[it.translation] || ""} · ${new Date(it.at).toLocaleString()}</span></span></a>`; }
    const r = fromOsis(it.osis); const txt = await anyText(it.osis);
    return `<a class="hit" href="${readUrl("kjv", r.book, r.chapter, r.verse)}"><span class="meta"><span class="ref">${labelOf(it.osis)}</span>${it.color ? `<span class="chip">${it.color}</span>` : ""}</span><span class="tx">${esc(txt)}</span>${it.text ? `<span>${esc(it.text).replace(/\n/g, "<br>")}</span>` : ""}</a>`;
  }));
  $("#slist").innerHTML = rows.length ? rows.join("") : `<p class="empty">${{ notes: "No notes yet. In the reader, tap a verse and write in the note box.", bookmarks: "No bookmarks yet. Tap a verse and choose Bookmark.", highlights: "No highlights yet. Tap a verse and pick a colour.", history: "Chapters you open will be listed here.", collections: "No collections yet. In Scripture Lens, choose “Add to a collection” to group verses for a study or a sermon." }[tab]}</p>`;
  view.querySelectorAll("[data-delc]").forEach(b => b.addEventListener("click", () => { const l = collLoad(); l.splice(+b.dataset.delc, 1); collSave(l); renderStudy("collections"); }));
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
  view.innerHTML = `${artHead("leningrad")}<span class="eyebrow">Languages</span><h1>Read the Hebrew, Aramaic and Greek beneath the English.</h1>
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
const ERA_ART = ["creation-light", "era-patriarchs", "era-exodus", "map-holyland", "era-kingdom", "isaiah-scroll", "era-exile", "era-gospels", "map-paul"];
const JOURNEY_ART = { abraham: "era-patriarchs", exodus: "era-exodus", paul1: "map-paul", paul2: "map-paul", paul3: "map-paul", rome: "map-paul" };
const COURSE_ART = { foundations: "gutenberg", genesis: "creation-light", jesus: "era-gospels", hebrew: "leningrad" };
async function renderHistory(tab = "map", sub = "") {
  setNav("history"); setTitle("History");
  view.innerHTML = `${artHead(tab === "timeline" ? "era-exodus" : tab === "people" ? "era-patriarchs" : "map-holyland")}<span class="eyebrow">History</span><h1>Where and when the story happened, and how sure we are.</h1>
    <div class="tabsrow">${[["map", "Map"], ["journeys", "Journeys"], ["timeline", "Timeline"], ["people", "People"]].map(([k, l]) => `<a class="btn ${k === tab ? "on" : ""}" href="#/history/${k}">${l}</a>`).join("")}${DISCOVERIES.length ? `<a class="btn" href="#/discoveries">Discoveries</a>` : ""}</div></div><div id="hist"><p class="loading">Loading…</p></div>`;
  const box = $("#hist");
  if (tab === "timeline") return renderTimeline(box);
  if (tab === "people") return renderPeopleList(box);
  if (tab === "journeys") return renderJourneys(box, sub);
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

let journeyTimer = null;
async function renderJourneys(box, id) {
  const j = JOURNEYS.find(x => x.id === id) || JOURNEYS[0];
  const [base, places, lm] = await Promise.all([H.base(), H.places(), H.placeMap()]);
  const slugs = j.stops.map(s => s[0]);
  box.innerHTML = `<div class="jpick">${JOURNEYS.map(x => `<a class="jchip ${x.id === j.id ? "on" : ""}" href="#/history/journeys/${x.id}" style="--c:${x.colour}">${pic(JOURNEY_ART[x.id], { cls: "jart", sizes: "240px" })}<b>${esc(x.title)}</b><span>${esc(x.range)}</span></a>`).join("")}</div>
    <div class="maplayout journey" style="--c:${j.colour}"><div class="card mapcard"><div id="jmap"></div></div>
      <aside class="card mapside"><h2 style="font-size:1.35rem">${esc(j.title)}</h2><p class="small">${esc(j.range)} · ${esc(j.when)}</p>
        ${j.note ? `<div class="textnote"><b>How sure is this?</b><br>${esc(j.note)}</div>` : ""}
        <div class="actions"><button class="btn pri" type="button" id="jplay">Play the journey</button><span class="small" id="jstep"></span></div>
        <ol class="jstops" id="jstops">${j.stops.map(([sl, o, what], i) => { const r = fromOsis(o); return `<li data-i="${i}"><button type="button" class="jstop" data-i="${i}"><b>${esc(lm.get(sl)?.[1] || sl)}</b><span>${esc(what)}</span></button><a class="small" href="#/lens/${o}">${labelOf(o)}</a></li>`; }).join("")}</ol>
        <p class="small">Places: Theographic Bible Metadata (CC BY-SA 4.0); lines join the stops in order and do not show the exact road or sea lane.</p></aside></div>`;
  const map = mountMap($("#jmap"), { base, places, only: new Set(slugs), onPick: s => { const i = slugs.indexOf(s); if (i >= 0) show(i); } });
  map.fit(new Set(slugs)); map.route(slugs);
  const items = [...box.querySelectorAll("#jstops li")];
  function show(i) { items.forEach((li, k) => li.classList.toggle("on", k === i)); items[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" }); map.mark(slugs[i]); $("#jstep").textContent = `Stop ${i + 1} of ${slugs.length}`; }
  box.querySelectorAll(".jstop").forEach(b => b.addEventListener("click", () => { stop(); show(+b.dataset.i); }));
  const stop = () => { clearInterval(journeyTimer); journeyTimer = null; const b = $("#jplay"); if (b) b.textContent = "Play the journey"; };
  $("#jplay").addEventListener("click", () => {
    if (journeyTimer) return stop();
    let i = 0; show(0); $("#jplay").textContent = "Pause";
    journeyTimer = setInterval(() => { i++; if (i >= slugs.length || !document.contains($("#jmap"))) return stop(); show(i); }, 2200);
  });
  addEventListener("hashchange", stop, { once: true });
}

async function renderTimeline(box) {
  const [events, pm, lm] = await Promise.all([H.events(), H.peopleMap(), H.placeMap()]);
  const groups = ERAS.map(([name, a, b]) => ({ name, items: events.filter(e => e.sort >= a && e.sort < b) })).filter(g => g.items.length);
  box.innerHTML = `<div class="card certlegend"><b>How firm are these dates?</b>
    <div class="legendrow"><span>${certChip(-1500)} ${dateCertainty(-1500).note}</span><span>${certChip(-700)} ${dateCertainty(-700).note}</span><span>${certChip(30)} ${dateCertainty(30).note}</span></div>
    <p class="small">Dates come from the Theographic dataset, which follows a traditional chronology close to Archbishop Ussher's (for example, the Exodus in 1490 BC). Many scholars place the Exodus around 1446 BC or in the 13th century BC, and treat earlier dates as unknowable.</p></div>
    <nav class="eranav" aria-label="Eras">${groups.map((g, i) => `<a class="btn" href="#/history/timeline#era${i}">${g.name}</a>`).join("")}</nav>
    ${groups.map((g, i) => `<section class="era" id="era${i}">${(() => { const slot = ERA_ART[ERAS.findIndex(e => e[0] === g.name)]; return IMAGES[slot] ? `<figure class="eraban">${pic(slot, { sizes: "(max-width: 760px) 100vw, 900px" })}<figcaption>${credit(slot)}</figcaption></figure>` : ""; })()}<h2>${g.name} <span class="small">${yearText(g.items[0].year)} – ${yearText(g.items.at(-1).year)}</span></h2>${(() => { const e = ERAS.find(x => x[0] === g.name), dl = e ? discInEra(DISCOVERIES, e[1], e[2]) : []; return dl.length ? `<div class="dstrip"><span class="eyebrow">Discoveries from this era</span>${dl.map(d => `<a href="#/discoveries/${d.id}">${esc(d.name)} <span class="small">${esc(d.objectDate.text)}</span></a>`).join("")}</div>` : ""; })()}
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
  const portrait = personArt(slug, { cls: "headart", sizes: "(max-width: 720px) 100vw, 62vw", eager: true });
  view.innerHTML = `<div class="pagehead ${portrait ? "art" : ""}">${portrait}<span class="eyebrow">History · Person</span><h1>${esc(p.name)}</h1>
    <p style="margin:0;font-size:1.1rem">${esc(p.desc || "")}${p.also ? ` <span class="small">also called ${esc(p.also)}</span>` : ""}</p>
    <div class="actions">${p.groups.map(g => `<span class="chip ext">${esc(g)}</span>`).join("")}<span class="small">Mentioned in ${p.verses.length.toLocaleString()} verse${p.verses.length === 1 ? "" : "s"}</span><a class="btn" href="#/research/person/${slug}">See connections</a></div></div>
  ${p.note ? `<div class="textnote" style="margin-bottom:16px"><b>Two accounts</b><br>${esc(p.note)}</div>` : ""}
  ${(() => { const dl = discForPerson(DISCOVERIES, slug); return dl.length ? `<section class="shelf" style="margin:0 0 20px"><div class="ribbon-head"><h2>Outside the Bible</h2><p class="small">Inscriptions, records and finds that relate to ${esc(p.name)}.</p></div><div class="dgrid">${dl.map(d => discCard(d)).join("")}</div></section>` : ""; })()}
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
  ${(() => { const dl = discForPlace(DISCOVERIES, slug); return dl.length ? `<section class="shelf" style="margin:0 0 20px"><div class="ribbon-head"><h2>Found here</h2><p class="small">Excavations and finds from this place.</p></div><div class="dgrid">${dl.map(d => discCard(d)).join("")}</div></section>` : ""; })()}
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
  view.innerHTML = `${artHead("era-patriarchs")}<span class="eyebrow">Learn</span><h1>Structured study, from first steps to deeper reading.</h1>
    <p class="small" style="max-width:70ch">Each lesson has goals, Bible readings shown in full, teaching, questions to discuss and a short quiz. Your progress is saved on this device.</p>
    <div class="actions">${familyToggle()}</div></div>
  <div class="textnote" style="margin-bottom:16px"><b>Editorial status</b><br>These first courses are drafts written with AI assistance. They are labelled as drafts until the Scripture Atlas editor has reviewed them. Bible readings are shown from the KJV text itself, never retyped.</div>
  <form class="card guidebuild" id="gb"><div><h2 style="font-size:1.4rem">Build a study guide for any passage</h2><p class="small">Read, background, observe, key Hebrew or Greek words, cross references, interpret and apply, with space for your answers. Download or print it for a group.</p></div>
    <div class="minisearch"><label class="sr" for="gbq">Passage</label><input id="gbq" placeholder="e.g. Psalm 23, John 15:1-17"><button class="btn pri">Build guide</button></div></form>
  <div class="streak card"><div><span class="big">${streak}</span><span class="small">day study streak</span></div><div><span class="big">${days}</span><span class="small">day${days === 1 ? "" : "s"} studied</span></div><div><span class="big">${COURSES.reduce((n, c) => n + store.courseProgress(c.id, c.lessons.map(l => l.id)), 0)}</span><span class="small">lessons completed</span></div></div>
  <div class="coursegrid">${COURSES.map(c => { const done = store.courseProgress(c.id, c.lessons.map(l => l.id)), n = c.lessons.length; const next = c.lessons.find(l => !store.lessonResult(c.id, l.id)) || c.lessons[0];
    return `<article class="card course">${IMAGES[COURSE_ART[c.id]] ? `<span class="cart">${pic(COURSE_ART[c.id], { sizes: "(max-width: 760px) 100vw, 420px" })}</span>` : ""}<div class="actions"><span class="chip ext">${c.level}</span>${statusChip(c)}</div><h2>${c.title}</h2><p class="small">${c.summary}</p>
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
  view.innerHTML = `${artHead("gutenberg")}<span class="eyebrow">Bibles</span><h1>${list.length} complete Bibles in ${langs.size} languages, with the story behind each.</h1>
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
  view.innerHTML = `${artHead("era-exile")}<span class="eyebrow">AI Studio · research assistant</span><h1>Ask a question. See exactly what the answer rests on.</h1>
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

function researchHead(eyebrow, h1, lead = "", slot = "") {
  return `${slot ? artHead(slot) : `<div class="pagehead">`}<span class="eyebrow">Research · ${eyebrow}</span><h1>${h1}</h1>${lead}
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
  view.innerHTML = researchHead("Knowledge graph", "Follow a verse into everything connected to it.", `<p class="small" style="max-width:62ch">Every link comes from a named dataset: Hebrew and Greek word tagging (STEPBible), people, places and events (Theographic) and cross references voted by readers (OpenBible.info). Nothing on these pages is generated by AI.</p>`, "era-revelation") + `
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
  view.innerHTML = `${artHead("isaiah-scroll")}<span class="eyebrow">Library</span><h1>The manuscripts behind the text, and where every source comes from.</h1>
    <p class="small" style="max-width:72ch">Scripture Atlas is self-contained: everything you read here is hosted here. Sources are credited below as their licences require.</p></div>
    <section><h2 style="font-size:1.6rem;margin:0 0 10px">Manuscripts and editions</h2>
      <p class="small" style="max-width:72ch">No original manuscript of any biblical book survives. What we have are copies, and copies of copies, which scholars compare to recover the earliest text. Dates are estimates; where they are debated a range is given.</p>
      <div class="grid3">${MANUSCRIPTS.map(m => `<article class="card mscard">${IMAGES[m.img] ? `<span class="msimg">${pic(m.img, { sizes: "(max-width: 760px) 100vw, 400px" })}</span>` : ""}<span class="eyebrow">${esc(m.lang)}</span><h3 style="font-size:1.3rem;margin:4px 0">${esc(m.name)}</h3>
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
    ${Object.keys(IMAGES).length ? `<section class="card" style="margin-bottom:18px"><h2 style="font-size:1.5rem;margin-bottom:8px">Image credits</h2><p class="small">Artwork, maps and manuscript photographs, via Wikimedia Commons. Each is public domain or openly licensed, as stated.</p>
      <ul class="credits">${Object.entries(IMAGES).map(([k, m]) => `<li><b>${esc(m.title)}</b>, ${esc(m.artist)}${m.date ? `, ${esc(m.date)}` : ""}. ${esc(m.licence)}${m.attribution ? `, ${esc(m.attribution)}` : ""}. <span class="mono">${esc(m.source)}</span></li>`).join("")}</ul></section>` : ""}
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
  view.innerHTML = `${artHead("sinaiticus")}<span class="eyebrow">Bibles · compare</span><h1>${esc(label)} in ${list.length} Bibles</h1>
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

/* ---------- Scripture Lens: one research workspace per verse ---------- */
const LENS_MODES = [["discover", "Discover", "Simple explanations for anyone"], ["study", "Study", "Context, connections and key words"], ["scholar", "Scholar", "Original language, manuscripts, translations"], ["teach", "Teach", "Build a lesson or study"]];
const COLL_KEY = "scripture-atlas:collections";
const collLoad = () => { try { return JSON.parse(localStorage.getItem(COLL_KEY) || "[]"); } catch { return []; } };
const collSave = c => { try { localStorage.setItem(COLL_KEY, JSON.stringify(c)); return true; } catch { return false; } };
const bookIndex = code => BOOKS.findIndex(b => b.osis === code);
async function renderLens(osis, modeArg) {
  setNav("lens");
  await getIndex();
  const r = fromOsis(osis || "") || fromOsis("John.1.1"); const v = r.verse || 1;
  const o = toOsis(r.book, r.chapter, v), label = formatRef(r.book, r.chapter, v);
  const mode = LENS_MODES.some(m => m[0] === modeArg) ? modeArg : store.setting("lensmode", "study");
  store.setSetting("lensmode", mode);
  R.book = r.book; R.chapter = r.chapter; R.verse = v; R.t = "kjv";
  setTitle(`${label} · Scripture Lens`);
  const heb = r.book < 39, nV = INDEX.books[r.book].verses[r.chapter - 1] || 0;
  const [kt, orig, vx, xref, pm, lm, em] = await Promise.all([loadKjvs(r.book, r.chapter).catch(() => null), loadOrig(r.book, r.chapter).catch(() => null), H.vx(r.book), loadXref(r.book), H.peopleMap(), H.placeMap(), H.eventMap()]);
  const toks = kt?.verses[v - 1] || [], words = orig?.verses[v - 1] || [];
  const kjvText = toks.map(t => t[0]).join("");
  const key = r.book * 1e6 + r.chapter * 1e3 + v, tags = vx[key] || [[], [], []];
  const P = tags[0].filter(x => !NO_GRAPH_PEOPLE.has(x)).map(x => pm.get(x)).filter(Boolean), L = tags[1].map(x => lm.get(x)).filter(Boolean), E = tags[2].map(x => em.get(x)).filter(Boolean);
  const lex = await lexMapOf([...new Set(words.map(w => w[3]).filter(k => k && !isGrammaticalStrong(k)))]);
  const keys = keyLemmas(words, lex, 6);
  const X = (xref[key] || []).slice(0, 6);
  const english = allTranslations().filter(t => t.languageEn === "English");
  const par = store.setting("lenspar", ["web", "engBBE"]).filter(id => META[id]);
  const variants = variantsFor(r.book, r.chapter, v, bookIndex), edDiff = heb ? [] : editionDifferences(words), margin = kt?.notes?.[v] || [];
  const ctx = CONTEXT[r.book];
  const chips = `${P.map(p => `<a class="chip" href="#/person/${p[0]}">${esc(p[1])}</a>`).join(" ")} ${L.map(p => `<a class="chip ext" href="#/place/${p[0]}">${esc(p[1])}</a>`).join(" ")}`;
  const renderingsOf = async k => { const rd = await loadRenderings(baseStrong(k)); return rd ? rd.top.slice(0, 5).map(([w, n]) => `${esc(w)} <span class="n">${n}</span>`).join(", ") : ""; };
  const keyRows = await Promise.all(keys.map(async k => `<li><a href="#/word/${k.strong}"><b lang="${heb ? "hbo" : "grc"}" dir="${heb ? "rtl" : "ltr"}">${esc(k.form)}</b></a> <span class="small">${esc(k.translit)}</span>, “${esc(k.gloss)}”<span class="small"> · ${k.total.toLocaleString()} uses</span>${mode !== "discover" ? `<div class="small rendline">KJV: ${await renderingsOf(k.strong)}</div>` : ""}</li>`));
  const xrows = await Promise.all(X.map(async ([to, votes]) => { const u = unpackRef(to); return `<li><a href="#/lens/${toOsis(u.book, u.chapter, u.verse)}/${mode}"><b>${formatRef(u.book, u.chapter, u.verse)}</b></a> <span class="small">${esc(await verseText("kjv", toOsis(u.book, u.chapter, u.verse)).catch(() => ""))}</span></li>`; }));

  let main = "";
  if (mode === "discover") {
    const bbe = await verseText("engBBE", o).catch(() => ""), web = await verseText("web", o).catch(() => "");
    main = `<section class="lcard"><h2>In plain English</h2>${bbe ? `<p class="plain">${esc(bbe)}</p><p class="small">Bible in Basic English, written with a vocabulary of about 1,000 words.</p>` : ""}${web ? `<p class="plain alt">${esc(web)}</p><p class="small">World English Bible.</p>` : ""}</section>
      <section class="lcard"><h2>Where this fits</h2><p>${esc(ctx[4])}</p><p class="small"><b>${NAMES[r.book]}</b> is in the ${groupOf(r.book)}. ${esc(ctx[0])}</p>${P.length || L.length ? `<p>${chips}</p>` : ""}</section>
      ${keys[0] ? `<section class="lcard"><h2>One word to know</h2><ul class="keyw">${keyRows[0]}</ul><p class="small">Tap any underlined word in the verse to see where it comes from.</p></section>` : ""}
      <section class="lcard"><h2>Think about it</h2><ol>${QUESTIONS.slice(0, 3).map(q => `<li>${esc(q.replace(/^[A-Za-z]+: /, ""))}</li>`).join("")}</ol></section>`;
  } else if (mode === "study") {
    const around = await Promise.all([v - 2, v - 1, v + 1, v + 2].filter(n => n >= 1 && n <= nV).map(async n => [n, await verseText("kjv", toOsis(r.book, r.chapter, n)).catch(() => "")]));
    main = `<section class="lcard"><h2>Context</h2><div class="ctxv">${around.filter(([n]) => n < v).map(([n, t]) => `<p class="dim"><sup>${n}</sup>${esc(t)}</p>`).join("")}<p class="focusv"><sup>${v}</sup>${esc(kjvText)}</p>${around.filter(([n]) => n > v).map(([n, t]) => `<p class="dim"><sup>${n}</sup>${esc(t)}</p>`).join("")}</div>
        <p class="small">${esc(ctx[4])}</p></section>
      <section class="lcard"><h2>Key words</h2>${keyRows.length ? `<ul class="keyw">${keyRows.join("")}</ul>` : `<p class="small">No key words found.</p>`}</section>
      <section class="lcard"><h2>Connected passages</h2>${xrows.length ? `<ul class="xl">${xrows.join("")}</ul>` : `<p class="small">None recorded.</p>`}<p class="small">Ranked by reader votes, OpenBible.info. <a href="#/research/${o}">See them as a graph</a>.</p></section>
      ${P.length || L.length || E.length ? `<section class="lcard"><h2>People, places and events</h2><p>${chips}</p>${E.length ? `<ul class="evlist">${E.map(e => `<li><span class="yr">${yearText(e.year)}</span> ${certChip(e.year)} <a href="#/history/timeline#e${e.id}">${esc(e.title)}</a></li>`).join("")}</ul>` : ""}</section>` : ""}
      <section class="lcard"><h2>Questions for study</h2><ol>${interpretQuestions(groupOf(r.book)).map(q => `<li>${esc(q)}</li>`).join("")}</ol><a class="btn" href="#/guide/${BOOKS[r.book].osis}.${r.chapter}">Full study guide for ${formatRef(r.book, r.chapter)}</a></section>`;
  } else if (mode === "scholar") {
    const morph = await loadMorph();
    const comps = await Promise.all(english.map(async t => [t, await verseText(t.id, o).catch(() => "")]));
    main = `<section class="lcard"><h2>${heb ? "Hebrew" : "Greek"} text, word by word</h2>
        <div class="parse" dir="${heb ? "rtl" : "ltr"}">${words.map(w => `<a class="pw ${w[6] ? "flag" : ""}" href="#/word/${w[3]}" dir="ltr"><b lang="${heb ? "hbo" : "grc"}" dir="${heb ? "rtl" : "ltr"}">${esc(w[0])}</b><span>${esc(w[1])}</span><span class="g">${esc(w[2])}</span><span class="m">${esc(describeMorph(w[5], morph).map(x => x.summary).join(" + "))}</span><span class="s">${displayStrong(w[3])}</span></a>`).join("") || `<p class="small">No ${heb ? "Hebrew" : "Greek"} words recorded for this verse.</p>`}</div>
        <p class="small">${heb ? "Leningrad Codex (AD 1008), as tagged by STEPBible TAHOT" : "STEPBible TAGNT: the Greek of the Nestle–Aland and Textus Receptus editions together"}, CC BY 4.0.</p></section>
      <section class="lcard"><h2>Manuscripts and variants</h2>
        ${variants.map(n => `<div class="textnote"><b>Textual question</b><br>${esc(n)}</div>`).join("")}
        ${edDiff.length ? `<div class="textnote"><b>Greek editions differ here</b><ul>${edDiff.map(d => `<li><b lang="grc">${esc(d.form)}</b> “${esc(d.gloss)}”: ${d.flag === "K" ? "in the Textus Receptus (behind the KJV) but not in the NA28 critical text" : "in the NA28 critical text but not in the Textus Receptus"}</li>`).join("")}</ul></div>` : ""}
        ${margin.length ? `<div class="textnote margnote"><b>KJV translators' margin</b><br>${margin.map(esc).join("<br>")}</div>` : ""}
        ${!variants.length && !edDiff.length && !margin.length ? `<p class="small">No significant textual variant is recorded for this verse in the sources used here.</p>` : ""}
        <p class="small">Base text: ${heb ? "the Leningrad Codex, the oldest complete Hebrew Bible" : "printed editions compared from the manuscript tradition"}. <a href="#/library">About the manuscripts</a>.</p></section>
      <section class="lcard"><h2>${english.length} English translations compared</h2><p class="small">Words not in the KJV are highlighted. The percentage is how much of the KJV's wording each keeps.</p>
        <div class="cmpl">${comps.filter(([t, x]) => x && t.id !== "kjv").map(([t, x]) => { const d = wordDiff(kjvText, x); return `<div class="cmpr"><div class="cmph"><a href="#/translation/${t.id}">${esc(t.name)}</a><span class="sim"><i style="width:${Math.round(d.similarity * 100)}%"></i></span><span class="small">${Math.round(d.similarity * 100)}%</span></div><p>${d.parts.map(p => p.same ? esc(p.w) : `<mark>${esc(p.w)}</mark>`).join(" ")}</p></div>`; }).join("")}</div></section>
      <section class="lcard"><h2>Lexicon</h2>${keys.map(k => { const e = lex.get(k.strong); return `<details><summary><b lang="${heb ? "hbo" : "grc"}">${esc(e.lemma)}</b> ${esc(k.translit)}, ${esc(e.gloss)} <span class="small">${displayStrong(k.strong)}</span></summary><div class="lexdef">${e.def || ""}</div></details>`; }).join("") || `<p class="small">No key words.</p>`}<p class="small">STEPBible brief lexicons (${heb ? "TBESH, based on BDB" : "TBESG, based on Abbott-Smith"}), CC BY 4.0.</p></section>`;
  } else {
    const disc = interpretQuestions(groupOf(r.book));
    const xl = await Promise.all(X.slice(0, 4).map(async ([to]) => { const u = unpackRef(to); return `${formatRef(u.book, u.chapter, u.verse)}: ${await verseText("kjv", toOsis(u.book, u.chapter, u.verse)).catch(() => "")}`; }));
    const pick = (name, items) => items.map((x, i) => `<label class="pick"><input type="checkbox" data-sec="${name}" data-i="${i}" checked> <span>${esc(x)}</span></label>`).join("");
    const kw = keys.map(k => `${k.form} (${k.translit}), “${k.gloss}”`);
    main = `<section class="lcard teach"><h2>Lesson builder</h2>
        <label class="fld">Title<input id="ltitle" value="${esc(label)}"></label>
        <label class="fld">Big idea, in one sentence<textarea id="lbig" rows="2" placeholder="What should people remember from this passage?"></textarea></label>
        <h3>Observe</h3>${pick("observe", OBSERVE)}
        <h3>Key words</h3>${pick("words", kw) || `<p class="small">None for this verse.</p>`}
        <h3>Connect</h3>${pick("refs", xl) || `<p class="small">No cross references.</p>`}
        <h3>Discuss</h3>${pick("discuss", disc)}
        <h3>Apply</h3>${pick("apply", APPLY)}
        <label class="fld">Your notes<textarea id="lnotes" rows="4"></textarea></label>
        <div class="actions"><button class="btn pri" type="button" id="ldl">Download the lesson</button><button class="btn" type="button" id="lcp">Copy</button><button class="btn" type="button" id="lpr">Print</button><a class="btn" href="#/guide/${BOOKS[r.book].osis}.${r.chapter}">Chapter study guide</a></div>
        <p class="small">Untick anything you don't need. Use AI below for a draft outline; it is labelled as AI and its claims are checked against the sources.</p></section>`;
  }

  const colls = collLoad();
  view.innerHTML = `<div class="lens" data-mode="${mode}">
    <header class="lenshead">
      <div><span class="eyebrow">Scripture Lens</span><h1>${esc(label)}</h1></div>
      <nav class="lensnav"><a class="btn" href="#/lens/${v > 1 ? toOsis(r.book, r.chapter, v - 1) : toOsis(r.book, r.chapter, 1)}/${mode}" ${v > 1 ? "" : 'aria-disabled="true"'}>‹</a><a class="btn" href="${readUrl("kjv", r.book, r.chapter, v)}">Reader</a><a class="btn" href="#/lens/${v < nV ? toOsis(r.book, r.chapter, v + 1) : o}/${mode}">›</a></nav>
      <div class="modes" role="tablist">${LENS_MODES.map(([k, l, d]) => `<a role="tab" aria-selected="${k === mode}" href="#/lens/${o}/${k}" title="${d}">${l}</a>`).join("")}</div>
    </header>
    <div class="lensgrid">
      <aside class="lensside">
        <div class="lverse text origins" id="lverse"><span class="v sel" data-v="${v}" data-t="kjv">${tokensHtml(toks) || esc(kjvText)}</span></div>
        <p class="small">King James Version. Tap an underlined word for its ${heb ? "Hebrew" : "Greek"} source.</p>
        <div id="lorigin"></div>
        ${discMini(discForVerse(DISCOVERIES, r.book, r.chapter, v, bIdx)) || (() => { const ch = discForChapter(DISCOVERIES, r.book, r.chapter, bIdx); return ch.length ? discMini(ch, `Discoveries linked to ${formatRef(r.book, r.chapter)}`) : ""; })()}
        <div class="lpar">${par.map(id => `<figure><figcaption>${esc(META[id].name)}</figcaption><p dir="${dirOf(id)}" lang="${langOf(id)}" data-par="${id}">…</p></figure>`).join("")}
          <label class="small">Add a translation <select id="lparsel"><option value="">Choose…</option>${allTranslations().filter(t => t.id !== "kjv" && !par.includes(t.id)).map(t => `<option value="${t.id}">${esc(t.name)}${t.languageEn !== "English" ? ` (${esc(t.languageEn)})` : ""}</option>`).join("")}</select></label>
          ${par.length ? `<button class="linkbtn small" type="button" id="lparclr">Reset translations</button>` : ""}</div>
        <div class="lnote"><label for="lnote"><b>Your note</b></label><textarea id="lnote" rows="4" placeholder="What do you notice?">${esc(store.note(o))}</textarea>
          <div class="actions"><button class="btn ${store.isBookmarked(o) ? "on" : ""}" id="lbm" type="button">${store.isBookmarked(o) ? "Bookmarked" : "Bookmark"}</button>
          <select id="lcoll" aria-label="Add to a collection"><option value="">Add to a collection…</option>${colls.map((c, i) => `<option value="${i}">${esc(c.name)} (${c.items.length})</option>`).join("")}<option value="new">New collection…</option></select></div></div>
      </aside>
      <div class="lensmain">${main}
        <section class="lcard lask"><h2>Ask about ${esc(label)}</h2><form id="lask"><textarea id="lq" rows="2" maxlength="600" placeholder="${mode === "discover" ? "What does this verse mean?" : mode === "scholar" ? "How do the manuscripts and translations differ here?" : mode === "teach" ? "Suggest an outline for teaching this passage" : "How does this verse fit its context?"}"></textarea><button class="btn pri">Ask</button><span class="small" id="lst"></span></form>
          <p class="small">Answers use only numbered sources (this verse, other translations, cross references, background) and every statement must cite one. Level: ${mode === "discover" ? "beginner" : mode === "scholar" ? "academic" : "intermediate"}.</p><div id="lout"></div></section>
      </div>
    </div></div>`;

  // parallel translations
  view.querySelectorAll("[data-par]").forEach(async el => { const t = await verseText(el.dataset.par, o).catch(() => ""); el.textContent = t || "Not in this translation at this reference."; });
  $("#lparsel").addEventListener("change", e => { if (!e.target.value) return; store.setSetting("lenspar", [...par, e.target.value].slice(-4)); renderLens(o, mode); });
  $("#lparclr")?.addEventListener("click", () => { store.setSetting("lenspar", ["web", "engBBE"]); renderLens(o, mode); });
  // word origins
  $("#lverse").addEventListener("click", async e => {
    const ew = e.target.closest(".ew"); if (!ew) return;
    view.querySelectorAll("#lverse .ew.on").forEach(x => x.classList.remove("on")); ew.classList.add("on");
    $("#lorigin").innerHTML = `<p class="loading small">Tracing the word…</p>`;
    $("#lorigin").innerHTML = await originCard(v, +ew.dataset.k, words);
  });
  // notes, bookmarks, collections
  let nt; $("#lnote").addEventListener("input", e => { clearTimeout(nt); nt = setTimeout(() => store.setNote(o, e.target.value), 300); });
  $("#lbm").addEventListener("click", e => { const on = store.toggleBookmark(o); e.currentTarget.textContent = on ? "Bookmarked" : "Bookmark"; e.currentTarget.classList.toggle("on", on); toast(on ? "Bookmarked" : "Bookmark removed"); });
  $("#lcoll").addEventListener("change", e => {
    const val = e.target.value; if (!val) return;
    const list = collLoad(); let c;
    if (val === "new") { const name = (prompt("Name the collection", "My study") || "").trim(); if (!name) { e.target.value = ""; return; } c = { name, items: [] }; list.push(c); } else c = list[+val];
    if (!c.items.includes(o)) c.items.push(o);
    toast(collSave(list) ? `Added to ${c.name}` : "This browser blocked saving"); renderLens(o, mode);
  });
  // AI
  $("#lask").addEventListener("submit", async e => {
    e.preventDefault(); const q = $("#lq").value.trim() || $("#lq").placeholder;
    $("#lst").textContent = "Gathering sources and checking the answer…";
    try {
      const res = await (await fetch("api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, ref: label, level: mode === "discover" ? "beginner" : mode === "scholar" ? "academic" : "intermediate" }) })).json();
      $("#lout").innerHTML = res.error ? `<p class="empty">${esc(res.error)}</p>` : renderAnswer(res); if (!res.error) { wireAnswer($("#lout")); store.saveAnswer({ question: q, ref: label, result: res }); }
    } catch { $("#lout").innerHTML = `<p class="empty">Could not reach the assistant. Check your connection and try again.</p>`; }
    $("#lst").textContent = "";
  });
  // teach mode
  if (mode === "teach") {
    const lesson = () => {
      const sel = name => [...view.querySelectorAll(`[data-sec="${name}"]`)].filter(x => x.checked).map(x => x.nextElementSibling.textContent);
      return lessonMarkdown({ title: $("#ltitle").value.trim() || label, ref: label, translation: "King James Version", text: kjvText, bigIdea: $("#lbig").value.trim(), observe: sel("observe"), words: sel("words"), refs: sel("refs"), discuss: sel("discuss"), apply: sel("apply"), notes: $("#lnotes").value.trim() });
    };
    $("#ldl").addEventListener("click", () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lesson()], { type: "text/markdown" })); a.download = `lesson-${o.toLowerCase()}.md`; document.body.appendChild(a); a.click(); a.remove(); });
    $("#lcp").addEventListener("click", () => copyText(lesson()));
    $("#lpr").addEventListener("click", () => print());
  }
}

/* ---------- sermon studio: transcribe, find scriptures, outline ---------- */
const SERMON_KEY = "scripture-atlas:sermons";
const sermonsLoad = () => { try { return JSON.parse(localStorage.getItem(SERMON_KEY) || "[]"); } catch { return []; } };
const sermonsSave = list => { try { localStorage.setItem(SERMON_KEY, JSON.stringify(list)); return true; } catch { return false; } };
const LANGS = [["en-GB", "English (UK)"], ["en-US", "English (US)"], ["en-AU", "English (Australia)"], ["en-ZA", "English (South Africa)"], ["en-NG", "English (Nigeria)"], ["en-KE", "English (Kenya)"], ["sw-KE", "Kiswahili"], ["zu-ZA", "isiZulu"], ["af-ZA", "Afrikaans"], ["fr-FR", "Français"], ["pt-BR", "Português"], ["es-ES", "Español"], ["de-DE", "Deutsch"]];
let sermonRec = null;
async function renderSermon(openId) {
  setNav("sermon"); setTitle("Sermon studio");
  await getIndex();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const saved = sermonsLoad();
  const cur = (openId && saved.find(x => x.id === openId)) || { id: Date.now().toString(36), title: "", speaker: "", date: new Date().toISOString().slice(0, 10), transcript: "", outline: null };
  view.innerHTML = `${artHead("era-gospels")}<span class="eyebrow">Sermon studio</span><h1>Record a sermon. Keep every word and every verse.</h1>
      <p>Transcribe live from your microphone, catch each Bible reference as it is spoken, and turn the message into study notes for your small group.</p></div>
    <div class="sermon">
      <section class="card recorder">
        <div class="recrow">
          <button class="recbtn" id="rec" type="button" aria-pressed="false" ${SR ? "" : "disabled"}><span class="dot"></span><span id="reclabel">Start recording</span></button>
          <div class="recinfo"><b id="rectime">0:00</b><span class="small" id="recstate">${SR ? "Ready. Your browser will ask to use the microphone." : "Live transcription needs Chrome, Edge or Safari. You can paste or upload a transcript instead."}</span></div>
          <label class="sr" for="reclang">Language</label><select id="reclang">${LANGS.map(([c, l]) => `<option value="${c}" ${c === store.setting("reclang", "en-GB") ? "selected" : ""}>${l}</option>`).join("")}</select>
        </div>
        <canvas id="wave" height="70" aria-hidden="true"></canvas>
        <div class="meta3"><label>Title<input id="stitle" value="${esc(cur.title)}" placeholder="Sermon title"></label><label>Speaker<input id="sspk" value="${esc(cur.speaker)}" placeholder="Speaker"></label><label>Date<input id="sdate" type="date" value="${esc(cur.date)}"></label></div>
        <label class="sr" for="stext">Transcript</label>
        <div class="transcript"><textarea id="stext" placeholder="The transcript appears here as you speak. You can also paste one, or edit it.">${esc(cur.transcript)}</textarea><p class="interim" id="interim" aria-live="polite"></p></div>
        <div class="actions"><label class="btn" for="sfile">Upload a transcript<input id="sfile" type="file" accept=".txt,.vtt,.srt,text/plain" hidden></label>
          <button class="btn" type="button" id="ssave">Save on this device</button><button class="btn" type="button" id="sdl">Download as Markdown</button><a class="btn" id="saudio" hidden download>Download the audio</a></div>
        <p class="small">Speech is transcribed by your browser's own speech service; on some browsers that runs on the device, on others it is sent to the browser maker. Audio is kept on this device unless you download it.</p>
      </section>
      <aside class="sside">
        <section class="card"><h2>Scriptures mentioned</h2><div id="srefs" class="srefs"><p class="small">Bible references appear here as they are spoken, for example “John chapter three verse sixteen”.</p></div></section>
        <section class="card"><h2>Study notes</h2><p class="small">Make an outline, big idea, discussion questions and application from the transcript.</p>
          <button class="btn pri" type="button" id="souts">Make study notes with AI</button><div id="sout"></div></section>
        <section class="card"><h2>Words that recur</h2><div id="swords" class="small">None yet.</div><p class="small" id="scount"></p></section>
        ${saved.length ? `<section class="card"><h2>Saved sermons</h2><ul class="linklist">${saved.slice().reverse().map(x => `<li><a href="#/sermon/${x.id}"><span><span class="t">${esc(x.title || "Untitled sermon")}</span><span class="d">${esc([x.speaker, x.date].filter(Boolean).join(", "))}</span></span><span class="arr">›</span></a></li>`).join("")}</ul></section>` : ""}
      </aside>
    </div>`;
  const ta = $("#stext");
  let outline = cur.outline;
  const refresh = () => {
    const text = ta.value;
    const refs = sermonRefs(text, chapterCount);
    $("#srefs").innerHTML = refs.length ? refs.map(r => `<a class="sref" href="${readUrl("kjv", r.book, r.chapter, r.verse)}" data-o="${toOsis(r.book, r.chapter, r.verse || 1)}"><b>${formatRef(r.book, r.chapter, r.verse, r.verseEnd)}</b><span class="small"></span></a>`).join("") : `<p class="small">No references yet.</p>`;
    $("#srefs").querySelectorAll(".sref").forEach(async a => { const t = await verseText("kjv", a.dataset.o).catch(() => ""); a.querySelector("span").textContent = t; });
    const rw = repeatedWords([text], 12);
    $("#swords").innerHTML = rw.length ? `<div class="wcloud">${rw.map(([w, n]) => `<span style="font-size:${(0.85 + Math.min(n, 12) * .08).toFixed(2)}rem">${esc(w)}<sup>${n}</sup></span>`).join(" ")}</div>` : "None yet.";
    const wc = (text.match(/\S+/g) || []).length;
    $("#scount").textContent = wc ? `${wc.toLocaleString()} words, about ${Math.max(1, Math.round(wc / 130))} minute${wc > 195 ? "s" : ""} of speaking.` : "";
  };
  const draw = o => {
    if (!o) return;
    $("#sout").innerHTML = `<div class="aiout"><span class="chip ai">AI-generated from the transcript. Check it against the recording.</span>
      <h3>${esc(o.title)}</h3><p><b>Big idea:</b> ${esc(o.bigIdea)}</p><p>${esc(o.summary)}</p>
      <ol class="spoints">${o.points.map(p => `<li><b>${esc(p.heading)}</b><br>${esc(p.summary)}${p.quote ? `<blockquote>“${esc(p.quote)}”</blockquote>` : ""}</li>`).join("")}</ol>
      ${o.questions.length ? `<h4>Discussion questions</h4><ul>${o.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : ""}
      ${o.application.length ? `<h4>Application</h4><ul>${o.application.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : ""}</div>`;
  };
  draw(outline); refresh();
  let t; ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(refresh, 400); });
  $("#reclang").addEventListener("change", e => store.setSetting("reclang", e.target.value));
  $("#sfile").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    const raw = await f.text();
    ta.value = raw.replace(/^WEBVTT.*$/m, "").replace(/^\d+\s*$/gm, "").replace(/^[\d:.,]+\s*-->\s*[\d:.,]+.*$/gm, "").replace(/<[^>]+>/g, "").replace(/\n{2,}/g, "\n").trim();
    refresh(); toast("Transcript loaded");
  });
  const current = () => ({ ...cur, title: $("#stitle").value.trim(), speaker: $("#sspk").value.trim(), date: $("#sdate").value, transcript: ta.value.trim(), outline, refs: sermonRefs(ta.value, chapterCount).map(r => formatRef(r.book, r.chapter, r.verse, r.verseEnd)) });
  $("#ssave").addEventListener("click", () => {
    const list = sermonsLoad().filter(x => x.id !== cur.id); list.push(current());
    toast(sermonsSave(list) ? "Saved on this device" : "This browser blocked saving; download it instead");
  });
  $("#sdl").addEventListener("click", () => {
    const blob = new Blob([sermonMarkdown(current())], { type: "text/markdown" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `sermon-${(current().title || "notes").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`; document.body.appendChild(a); a.click(); a.remove();
  });
  $("#souts").addEventListener("click", async () => {
    const b = $("#souts"); b.disabled = true; b.textContent = "Reading the sermon…"; $("#sout").innerHTML = `<p class="loading">This takes about half a minute.</p>`;
    try {
      const r = await fetch("api/sermon", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript: ta.value, title: $("#stitle").value }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "The notes could not be made.");
      outline = j.outline; draw(outline);
      if (j.dropped?.length) $("#sout").insertAdjacentHTML("beforeend", `<details class="small"><summary>${j.dropped.length} item${j.dropped.length > 1 ? "s" : ""} removed by the check</summary><ul>${j.dropped.map(d => `<li>${esc(d)}</li>`).join("")}</ul></details>`);
      if (!$("#stitle").value && outline.title) $("#stitle").value = outline.title;
    } catch (e) { $("#sout").innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
    b.disabled = false; b.textContent = "Make study notes with AI";
  });

  // live recording: speech recognition + waveform + optional audio file
  if (!SR) return;
  let rec = null, stream = null, raf = 0, mr = null, chunks = [], started = 0, tick = 0, wanted = false;
  const canvas = $("#wave"), ctx = canvas.getContext("2d");
  const setUi = on => { $("#rec").setAttribute("aria-pressed", on); $("#reclabel").textContent = on ? "Stop recording" : "Start recording"; $("#rec").classList.toggle("on", on); };
  async function start() {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { $("#recstate").textContent = "The microphone was not allowed. Check the browser's permission for this site."; return; }
    wanted = true; setUi(true); started = Date.now(); $("#recstate").textContent = "Listening…";
    const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const paint = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = 70 * devicePixelRatio;
      an.getByteTimeDomainData(buf); ctx.clearRect(0, 0, canvas.width, canvas.height);
      const g = ctx.createLinearGradient(0, 0, canvas.width, 0); g.addColorStop(0, "#F2C14E"); g.addColorStop(1, "#BA3420");
      ctx.strokeStyle = g; ctx.lineWidth = 2 * devicePixelRatio; ctx.beginPath();
      for (let k = 0; k < buf.length; k++) { const x = k / buf.length * canvas.width, y = (buf[k] / 255) * canvas.height; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); raf = requestAnimationFrame(paint);
    };
    paint();
    tick = setInterval(() => { const s = Math.floor((Date.now() - started) / 1000); $("#rectime").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, 500);
    if (window.MediaRecorder) { chunks = []; mr = new MediaRecorder(stream); mr.ondataavailable = e => chunks.push(e.data); mr.onstop = () => { const blob = new Blob(chunks, { type: mr.mimeType }); const a = $("#saudio"); if (a) { a.href = URL.createObjectURL(blob); a.download = `sermon-${$("#sdate").value}.${/mp4/.test(mr.mimeType) ? "m4a" : "webm"}`; a.hidden = false; } }; mr.start(); }
    const listen = () => {
      rec = new SR(); rec.lang = $("#reclang").value; rec.continuous = true; rec.interimResults = true;
      rec.onresult = e => {
        let interim = "";
        for (let k = e.resultIndex; k < e.results.length; k++) {
          const r = e.results[k];
          if (r.isFinal) { const txt = r[0].transcript.trim(); ta.value = (ta.value ? ta.value.replace(/\s+$/, "") + " " : "") + txt.charAt(0).toUpperCase() + txt.slice(1) + (/[.?!]$/.test(txt) ? "" : "."); ta.scrollTop = ta.scrollHeight; refresh(); }
          else interim += r[0].transcript;
        }
        $("#interim").textContent = interim;
      };
      rec.onerror = e => { if (e.error === "not-allowed") { wanted = false; $("#recstate").textContent = "Speech recognition was not allowed."; } };
      rec.onend = () => { if (wanted) try { rec.start(); } catch {} }; // browsers stop after a pause; keep going until the user stops
      rec.start();
    };
    listen(); sermonRec = { stop };
  }
  function stop() {
    wanted = false; setUi(false); $("#recstate") && ($("#recstate").textContent = "Stopped. Edit the transcript, then make study notes.");
    try { rec?.stop(); } catch {} cancelAnimationFrame(raf); clearInterval(tick);
    try { mr?.state === "recording" && mr.stop(); } catch {} stream?.getTracks().forEach(t => t.stop());
    if ($("#interim")) $("#interim").textContent = "";
  }
  $("#rec").addEventListener("click", () => ($("#rec").getAttribute("aria-pressed") === "true" ? stop() : start()));
  addEventListener("hashchange", () => sermonRec?.stop(), { once: true });
}

/* ---------- kids: animated Bible stories ---------- */
// Extra illustrated pages per story (Magnific, AI illustrations): page index -> img/kids/<id>-<page>.webp
const KID_SCENES = { creation: [2, 3], noah: [2, 4], joseph: [3, 4], moses: [1, 3], david: [1, 2], daniel: [2, 3], jonah: [1, 2], storm: [2, 3] };
const sceneArt = (id, page) => { const k = (KID_SCENES[id] || []).filter(n => n <= page).pop(); return k == null ? id : `${id}-${k}`; };
const kidImg = (id, cls = "") => `<img class="${cls}" src="img/kids/${id}-sm.webp" srcset="img/kids/${id}-sm.webp 720w, img/kids/${id}.webp 1600w" sizes="(max-width: 760px) 100vw, 60vw" alt="" decoding="async">`;
function renderKids() {
  setNav("kids"); setTitle("Kids");
  document.body.classList.add("kidsmode");
  view.innerHTML = `<section class="kidshero">${kidImg("hero", "kh-art")}
      <div class="kh-copy"><h1>Bible stories, told and drawn for you.</h1><p>Pick a story. Tap the arrows to turn the page, or press <b>Read to me</b> and listen.</p></div></section>
    <div class="shelf">${KID_STORIES.map((s, i) => `<a class="book" href="#/kids/${s.id}" style="--c:${s.colour};--tilt:${[-2, 1.5, -1, 2, -1.5, 1, -2, 1.5][i % 8]}deg">
      <span class="cover">${kidImg(s.id)}</span><span class="spine"><b>${esc(s.title)}</b><span>${esc(s.range)} · ${s.scenes.length} pages</span></span></a>`).join("")}</div>
    <p class="small kidsnote">Stories retold for children by Scripture Atlas, keeping close to the Bible text; each page shows where to read it. Pictures made for Scripture Atlas with an AI image tool. <a href="#/learn">Family mode</a> in Courses has more for parents and children together.</p>`;
}

let storyTimer = null;
function renderStory(id) {
  const s = KID_STORIES.find(x => x.id === id); if (!s) return renderKids();
  setNav("kids"); setTitle(s.title);
  document.body.classList.add("kidsmode");
  const N = s.scenes.length; let i = 0, speaking = false;
  const origins = ["30% 40%", "70% 35%", "50% 70%", "25% 60%", "65% 55%"];
  const fx = kind => Array.from({ length: kind === "rain" ? 40 : 22 }, (_, k) => `<i style="--x:${(k * 37) % 100}%;--y:${(k * 53) % 100}%;--d:${(k % 7) * .45}s;--s:${.6 + (k % 5) * .2}"></i>`).join("");
  view.innerHTML = `<div class="story" style="--c:${s.colour}">
    <div class="storybar"><a class="btn" href="#/kids">‹ All stories</a><h1>${esc(s.title)}</h1><span class="small">${esc(s.range)}</span></div>
    <div class="stage" id="stage">${kidImg(s.id, "st-art")}<div class="fx fx-${s.fx}" aria-hidden="true">${fx(s.fx)}</div>
      <button class="turn prev" id="sprev" type="button" aria-label="Previous page">‹</button><button class="turn next" id="snext" type="button" aria-label="Next page">›</button></div>
    <div class="pagecard" id="pagecard" aria-live="polite"></div>
    <div class="storyctl"><div class="dots" id="dots">${s.scenes.map((_, k) => `<button type="button" data-k="${k}" aria-label="Page ${k + 1}"></button>`).join("")}<button type="button" data-k="${N}" aria-label="Quiz" class="qdot">?</button></div>
      <button class="btn gold" type="button" id="readme">Read to me</button></div>
    <p class="small kidsnote">${s.note ? `<b>For grown-ups:</b> ${esc(s.note)} ` : ""}Pictures are illustrations made for Scripture Atlas with an AI image tool, not historical images.</p>
  </div>`;
  const art = $(".st-art"), card = $("#pagecard");
  const synth = window.speechSynthesis;
  const stop = () => { if (synth) synth.cancel(); speaking = false; $("#readme").textContent = "Read to me"; };
  const say = text => {
    if (!synth) { toast("Reading aloud is not available in this browser"); return; }
    stop(); const u = new SpeechSynthesisUtterance(text); u.rate = .92; u.pitch = 1.05;
    const words = [...card.querySelectorAll(".sw")];
    u.onboundary = e => { if (e.name !== "word") return; let n = 0; words.forEach(w => { const a = +w.dataset.o; w.classList.toggle("now", a <= e.charIndex && e.charIndex < a + w.textContent.length); }); };
    u.onend = () => { words.forEach(w => w.classList.remove("now")); speaking = false; $("#readme").textContent = "Read to me"; if (store.setting("kidsauto", false) && i < N) { clearTimeout(storyTimer); storyTimer = setTimeout(() => go(i + 1, true), 900); } };
    speaking = true; $("#readme").textContent = "Stop reading"; synth.speak(u);
  };
  const wrapWords = t => { let o = 0; return t.split(/(\s+)/).map(p => { const html = /\s/.test(p) ? p : `<span class="sw" data-o="${o}">${esc(p)}</span>`; o += p.length; return html; }).join(""); };
  function go(k, auto = false) {
    i = Math.max(0, Math.min(N, k)); clearTimeout(storyTimer);
    if (!auto) stop();
    view.querySelectorAll("#dots button").forEach(b => b.classList.toggle("on", +b.dataset.k === i));
    $("#sprev").disabled = i === 0; $("#snext").disabled = i === N;
    const want = sceneArt(s.id, Math.min(i, N - 1));
    if (art.dataset.k !== want) { art.dataset.k = want; art.src = `img/kids/${want}-sm.webp`; art.srcset = `img/kids/${want}-sm.webp 720w, img/kids/${want}.webp 1600w`; }
    const nxt = sceneArt(s.id, Math.min(i + 1, N - 1)); if (nxt !== want) { const pre = new Image(); pre.src = `img/kids/${nxt}-sm.webp`; }
    art.style.transformOrigin = origins[i % origins.length];
    art.classList.remove("kb"); void art.offsetWidth; art.classList.add("kb");
    if (i < N) {
      const [text, ref] = s.scenes[i];
      card.innerHTML = `<p class="pt">${wrapWords(text)}</p><div class="pmeta"><span>Page ${i + 1} of ${N}</span><a href="${readUrl("kjv", fromOsis(ref).book, fromOsis(ref).chapter, fromOsis(ref).verse)}">Read it in the Bible: ${labelOf(ref)}</a></div>`;
      card.classList.remove("flip"); void card.offsetWidth; card.classList.add("flip");
      if (auto || speaking) say(text);
    } else {
      let score = 0, answered = 0;
      card.innerHTML = `<h2 class="qh">Quiz time!</h2>${s.quiz.map(([q, opts, a], qi) => { const order = opts.map((o, oi) => [o, oi]).sort((x, y) => ((x[1] * 7 + qi * 3) % 5) - ((y[1] * 7 + qi * 3) % 5)); return `<div class="q"><p>${esc(q)}</p><div class="opts">${order.map(([o, oi]) => `<button type="button" data-q="${qi}" data-ok="${oi === a}">${esc(o)}</button>`).join("")}</div></div>`; }).join("")}
        <p class="think"><b>Think about it:</b> ${esc(s.think)}</p><p id="score" class="small"></p>`;
      card.querySelectorAll(".opts button").forEach(b => b.addEventListener("click", () => {
        const q = b.closest(".q"); if (q.dataset.done) return; q.dataset.done = 1; answered++;
        const ok = b.dataset.ok === "true"; if (ok) score++;
        b.classList.add(ok ? "right" : "wrong"); if (!ok) q.querySelector('[data-ok="true"]').classList.add("right");
        if (ok) burst(b);
        if (answered === s.quiz.length) { $("#score").textContent = score === s.quiz.length ? `All ${score} right. Well done!` : `${score} out of ${s.quiz.length}. Try the story again to find the answers.`; if (score === s.quiz.length) store.completeLesson?.("kids", s.id); }
      }));
    }
  }
  function burst(el) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect(), box = document.createElement("div"); box.className = "burst"; box.style.left = r.left + r.width / 2 + "px"; box.style.top = r.top + r.height / 2 + "px";
    box.innerHTML = Array.from({ length: 18 }, (_, k) => `<i style="--a:${k * 20}deg;--h:${(k * 47) % 360}"></i>`).join(""); document.body.appendChild(box); setTimeout(() => box.remove(), 900);
  }
  $("#sprev").addEventListener("click", () => go(i - 1)); $("#snext").addEventListener("click", () => go(i + 1));
  $("#dots").addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) go(+b.dataset.k); });
  $("#readme").addEventListener("click", () => { if (speaking) return stop(); if (i < N) say(s.scenes[i][0]); });
  const keys = e => { if (!document.contains($("#stage"))) return removeEventListener("keydown", keys); if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); };
  addEventListener("keydown", keys);
  let sx = null; $("#stage").addEventListener("touchstart", e => (sx = e.touches[0].clientX), { passive: true });
  $("#stage").addEventListener("touchend", e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); sx = null; });
  addEventListener("hashchange", stop, { once: true });
  go(0);
}

/* ---------- router ---------- */
async function route() {
  await Promise.all([imagesReady, artReady]);
  closeMore();
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, "").split("#")[0]);
  const [head, ...rest] = h.split("/");
  document.body.classList.remove("focus", "kidsmode"); window.speechSynthesis?.cancel(); document.querySelector(".exitfocus")?.remove();
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
    else if (head === "history") await renderHistory(rest[0] || "map", rest[1]);
    else if (head === "learn") { if (rest[1]) await renderLesson(rest[0], rest[1]); else if (rest[0]) renderCourse(rest[0]); else renderLearn(); }
    else if (head === "person") await renderPerson(rest[0]);
    else if (head === "place") await renderPlace(rest[0]);
    else if (head === "study") await renderStudy();
    else if (head === "library") { await getIndex(); renderLibrary(); }
    else if (head === "research") await renderResearch(rest);
    else if (head === "lens") await renderLens(rest[0], rest[1]);
    else if (head === "sermon") await renderSermon(rest[0]);
    else if (head === "kids") await (rest[0] ? renderStory(rest[0]) : renderKids());
    else if (head === "soon") renderSoon(rest[0]);
    else if (head === "books") { await getIndex(); renderBooks(); }
    else if (head === "discoveries") { await getIndex(); await renderDiscoveries(rest[0]); }
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
