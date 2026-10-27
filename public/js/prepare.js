// Prepare: a guided sermon and lesson preparation workspace, the "For pastors" page, and the outline's
// Present, handout and Word exports. Everything is kept on this device. No AI is used here.
import { STEPS, KIND_LABEL, cleanPrep, newPrep, doneCount, outlineDoc, slides, blockId, clauses, linkCounts, cleanSeries, weekDates, seriesIcs, preachedLog } from "./prep-core.js";
import { buildDocx } from "./docx.js";

let C; // context from app.js
const esc = s => C.esc(s);

/* ---------- shared ---------- */
function passageOf(spec) {
  const g = C.parseGuideSpec(spec);
  if (!g) return null;
  const n = C.chapterCount(g.book);
  if (g.chapter < 1 || g.chapter > n) return null;
  return { ...g, key: C.guideSpec(g.book, g.chapter, g.from, g.to), title: C.formatRef(g.book, g.chapter, g.from, g.to) };
}
// Edits are written after a short pause; until then the newest copy lives in `pending`, so every read sees it.
let saveTimer = null, pending = null;
const loadPrep = g => pending?.key === g.key ? structuredClone(pending) : cleanPrep(C.store.prep(g.key), g.key, g.title);
function flush() { clearTimeout(saveTimer); if (!pending) return; const p = pending; pending = null; C.store.savePrep(p); C.store.setSetting("activePrep", p.key); const s = document.getElementById("prepsaved"); if (s) s.textContent = "Saved on this device"; }
function savePrep(p, { now = false } = {}) {
  pending = structuredClone(p); clearTimeout(saveTimer);
  const s = document.getElementById("prepsaved"); if (s && !now) s.textContent = "Saving…";
  if (now) flush(); else saveTimer = setTimeout(flush, 400);
}
addEventListener("pagehide", flush);
addEventListener("routechange", flush);
const translation = () => { const t = C.store.setting("prepT", C.store.setting("translation", "kjv")); return C.TR[t] ? t : "kjv"; };
async function passageVerses(g, t) {
  const book = await C.loadBook(t, g.book);
  const all = book.chapters[g.chapter - 1] || [];
  const from = g.from || 1, to = Math.min(g.to || all.length, all.length);
  return { from, to, verses: all.slice(from - 1, to).map((v, i) => [from + i, v || ""]) };
}
function download(name, bytes, type) {
  const blob = new Blob([bytes], { type }); const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
const addButton = (data, label = "Add") => `<button type="button" class="btn addbtn" data-add='${esc(JSON.stringify(data))}' aria-label="${esc(label)} to collected material">+ ${esc(label)}</button>`;

/* ---------- start page ---------- */
function startForm(id = "pf", placeholder = "A passage, e.g. John 1:1-18 or Psalm 23") {
  return `<form class="bigsearch prepform" id="${id}"><label class="sr" for="${id}q">Passage to prepare</label><input id="${id}q" placeholder="${esc(placeholder)}" autocomplete="off"><button>Start preparing</button></form>`;
}
function wireStart(id = "pf") {
  document.getElementById(id)?.addEventListener("submit", e => {
    e.preventDefault();
    const r = C.parseReference(document.getElementById(id + "q").value, C.chapterCount);
    if (!r) return C.toast("Enter a passage such as John 1:1-18 or Psalm 23");
    C.go(`/prepare/${C.guideSpec(r.book, r.chapter, r.verse, r.verseEnd)}`);
  });
}
const planLinks = () => `<div class="actions planlinks"><a class="btn" href="/prepare/series">Plan a sermon series</a><a class="btn" href="/prepare/preached">Passages you have preached (${preachedLog(C.store.preps()).length})</a></div>`;
const fmtDate = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
function prepList() {
  const list = C.store.preps();
  if (!list.length) return `<p class="small">Your preparations will be listed here. They are kept on this device.</p>`;
  return `<ul class="preplist">${list.map(raw => { const p = cleanPrep(raw, raw.key, raw.title || raw.key); const n = doneCount(p); return `<li><a href="/prepare/${esc(p.key)}"><b>${esc(p.title)}</b><span class="small">${p.idea ? esc(p.idea) + " · " : ""}${n} of ${STEPS.length} steps · ${p.points.length} ${p.points.length === 1 ? "point" : "points"}${p.updated ? " · " + new Date(p.updated).toLocaleDateString(undefined, { dateStyle: "medium" }) : ""}</span></a></li>`; }).join("")}</ul>`;
}

export function renderPastors(ctx) {
  C = ctx; C.setNav("pastors"); C.setTitle("For pastors and teachers");
  C.view.innerHTML = `<div class="pagehead"><span class="eyebrow">For pastors and teachers</span><h1>Prepare to preach from the text, with every source in view.</h1>
    <p class="lead">Ereunia takes you from the passage to an outline in eight steps: the original words, the background, classic commentaries and connected Scripture, then a handout, slides and a view to preach from. Free, with no account; your work stays on your device.</p>
    ${startForm("pf0")}</div>
  <section class="pastorsteps" aria-labelledby="psh"><h2 id="psh">The eight steps</h2>
    <ol class="stepgrid">${STEPS.map(([k, l, d]) => `<li><b>${esc(l)}</b><span>${esc(d)}</span></li>`).join("")}</ol></section>
  <section class="pastorgrid">
    <div><h3>Classic commentaries beside the verse</h3><p>Matthew Henry, Jamieson–Fausset–Brown, Barnes, Clarke, Keil and Delitzsch, and Spurgeon's <i>Treasury of David</i>, each labelled with its date and tradition. Open them from the Commentaries tab in the Research Desk.</p><a class="btn" href="/read/kjv/John.1.1?panel=cm">See them on John 1:1</a></div>
    <div><h3>An outline that keeps its sources</h3><p>Collect verses, word studies, commentary quotes and cross references as you study; each keeps its citation when you place it in a point.</p><a class="btn" href="/prepare/John.1.1-18?step=outline">See an outline</a></div>
    <div><h3>Ready for Sunday</h3><p>Download a Word document, print a handout or a small-group guide, or present slides and preach from a large-type view on a phone or tablet.</p><a class="btn" href="/prepare/John.1.1-18">Open the worked example</a></div>
  </section>
  <section class="prepstart"><h2>Your preparations</h2>${prepList()}${planLinks()}</section>`;
  wireStart("pf0");
}

export async function renderPrepare(ctx, spec, sub) {
  C = ctx; C.setNav("pastors"); await C.getIndex();
  if (!spec) {
    C.setTitle("Prepare");
    C.view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="/pastors">For pastors and teachers</a></span><h1>Prepare a sermon or lesson</h1><p class="small">Choose a passage. Ereunia walks you through it in eight steps and keeps your work on this device.</p>${startForm()}</div><section class="prepstart"><h2>Your preparations</h2>${prepList()}${planLinks()}</section>`;
    wireStart(); return;
  }
  if (spec === "series") return sub ? seriesPage(sub) : seriesIndex();
  if (spec === "preached") return preachedPage();
  const g = passageOf(spec);
  if (!g) { C.view.innerHTML = `<div class="pagehead"><h1>Passage not found</h1><p class="small">Try a passage such as John 1:1-18.</p>${startForm()}</div>`; wireStart(); return; }
  if (sub === "present") return present(g);
  if (sub === "handout" || sub === "group") return handout(g, sub);
  if (sub === "sheet") return passageSheet(g);
  if (sub === "family") return familySheet(g);
  return workspace(g);
}

/* ---------- workspace ---------- */
async function workspace(g) {
  const p = loadPrep(g);
  const qp = new URLSearchParams(location.search);
  const step = STEPS.some(([k]) => k === qp.get("step")) ? qp.get("step") : (STEPS.find(([k]) => !p.steps[k]?.done) || STEPS[0])[0];
  const t = translation();
  C.setTitle(`Prepare ${g.title}`);
  C.store.setSetting("activePrep", g.key);
  const n = doneCount(p);
  C.view.innerHTML = `<div class="pagehead prephead"><span class="eyebrow"><a href="/pastors">For pastors and teachers</a> · Preparation</span><h1>${esc(g.title)}</h1>
    <div class="prepbar"><div class="progress" role="progressbar" aria-label="Steps done" aria-valuemin="0" aria-valuemax="${STEPS.length}" aria-valuenow="${n}"><i style="width:${Math.round(n / STEPS.length * 100)}%"></i></div><span class="small"><span id="prepcount">${n} of ${STEPS.length} steps done</span> · <span id="prepsaved">Saved on this device</span></span></div>
    <div class="actions prepacts"><label class="sr" for="ptr">Translation</label><select id="ptr" class="trsel">${C.translationOptions(t)}</select>
      <a class="btn" href="${C.readUrl(t, g.book, g.chapter, g.from)}">Open in the Research Desk</a>
      <a class="btn pri" href="/prepare/${g.key}/present">Present</a>
      <details class="pmenu"><summary class="btn">Print</summary><div role="list"><a role="listitem" href="/prepare/${g.key}/handout">Handout with the outline</a><a role="listitem" href="/prepare/${g.key}/group">Small-group guide</a><a role="listitem" href="/prepare/${g.key}/sheet">Passage study sheet</a><a role="listitem" href="/prepare/${g.key}/family">Family take-home sheet</a></div></details>
      <button class="btn" type="button" id="pdocx">Word document</button></div>
    <div class="preached" id="preached">${preachedHtml(p)}</div></div>
  <div class="prep">
    <nav class="prepsteps" aria-label="Preparation steps"><ol>${STEPS.map(([k, l, d], i) => `<li><a href="/prepare/${g.key}?step=${k}" data-step="${k}" ${k === step ? 'aria-current="step"' : ""} class="${p.steps[k]?.done ? "done" : ""}"><span class="pn" aria-hidden="true">${p.steps[k]?.done ? "✓" : i + 1}</span><span><b>${l}</b><span class="small">${d}</span></span></a></li>`).join("")}</ol></nav>
    <section class="prepmain" id="prepmain" aria-live="polite"><p class="loading">Opening ${esc(STEPS.find(s => s[0] === step)[1])}…</p></section>
  </div>`;
  document.getElementById("ptr").addEventListener("change", e => { C.store.setSetting("prepT", e.target.value); workspace(g); });
  document.getElementById("pdocx").addEventListener("click", async () => {
    const pp = loadPrep(g); const { verses } = await passageVerses(g, translation());
    download(`${g.key.replace(/\./g, "-")}-sermon.docx`, buildDocx(outlineDoc(pp, { passageText: verses, translation: C.META[translation()].name }), { title: g.title }), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
  wirePreached(g);
  await renderStep(g, step);
}

/* ---------- preached record ---------- */
function preachedHtml(p) {
  const list = [...p.preached].sort((a, b) => b.date.localeCompare(a.date));
  return `${list.length ? `<p class="small"><b>Preached</b> ${list.map((r, i) => `<span class="pchip">${esc(fmtDate(r.date))}${r.where ? ", " + esc(r.where) : ""}<button type="button" class="ib" data-unpreach="${esc(r.date)}|${esc(r.where)}" aria-label="Remove ${esc(fmtDate(r.date))}">×</button></span>`).join(" ")}</p>` : ""}
    <details class="preachform"><summary class="small linkbtn">${list.length ? "Add another date" : "Mark as preached"}</summary>
      <form id="preachf" class="actions"><label><span class="small">Date</span> <input type="date" id="prd" value="${today()}" required></label><label><span class="small">Where or which service (optional)</span> <input id="prw" maxlength="80" placeholder="e.g. Morning service"></label><button class="btn">Save</button></form></details>`;
}
function wirePreached(g) {
  const box = document.getElementById("preached"); if (!box) return;
  const redraw = () => { box.innerHTML = preachedHtml(loadPrep(g)); wirePreached(g); };
  box.querySelector("#preachf")?.addEventListener("submit", e => {
    e.preventDefault(); const date = box.querySelector("#prd").value, where = box.querySelector("#prw").value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return C.toast("Choose a date");
    const q = loadPrep(g); if (!q.preached.some(r => r.date === date && r.where === where)) q.preached.push({ date, where }); savePrep(q, { now: true }); redraw(); C.toast("Saved to your preached passages");
  });
  box.querySelectorAll("[data-unpreach]").forEach(b => b.addEventListener("click", () => {
    const [date, ...w] = b.dataset.unpreach.split("|"), where = w.join("|"); const q = loadPrep(g);
    q.preached = q.preached.filter(r => !(r.date === date && r.where === where)); savePrep(q, { now: true }); redraw();
  }));
}
function preachedPage() {
  C.setTitle("Passages you have preached");
  const preps = C.store.preps().map(r => cleanPrep(r, r.key, r.title || r.key)), log = preachedLog(preps);
  const byBook = new Map(); for (const r of log) { const g = C.parseGuideSpec(r.key); if (!g) continue; const k = g.book; if (!byBook.has(k)) byBook.set(k, new Set()); byBook.get(k).add(r.key); }
  C.view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="/pastors">For pastors and teachers</a></span><h1>Passages you have preached</h1><p class="small">A record kept on this device. Mark a passage as preached from its preparation page. Use it to see what your church has heard and what it has not.</p></div>
    ${log.length ? `<section><h2>By date</h2><ul class="preplist">${log.map(r => `<li><a href="/prepare/${esc(r.key)}"><b>${esc(r.title)}</b><span class="small">${esc(fmtDate(r.date))}${r.where ? " · " + esc(r.where) : ""}</span></a></li>`).join("")}</ul></section>
      <section><h2>By book</h2><ul class="bookcov">${C.BOOKS.map((b, i) => `<li class="${byBook.has(i) ? "on" : ""}" title="${esc(C.NAMES[i])}${byBook.has(i) ? `: ${byBook.get(i).size} ${byBook.get(i).size === 1 ? "passage" : "passages"}` : ""}"><span>${esc(C.NAMES[i])}</span>${byBook.has(i) ? `<b>${byBook.get(i).size}</b>` : ""}</li>`).join("")}</ul><p class="small">Books with a number are ones you have preached from; the number counts passages.</p></section>`
      : `<p class="empty">Nothing recorded yet. Open a preparation and use “Mark as preached” under its title.</p>`}
    <div class="actions">${log.length ? `<button class="btn" type="button" id="prcsv">Download as a spreadsheet (CSV)</button>` : ""}<a class="btn" href="/prepare">Your preparations</a></div>`;
  document.getElementById("prcsv")?.addEventListener("click", () => {
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    download("preached-passages.csv", "\ufeff" + ["Date,Passage,Where", ...log.map(r => [r.date, r.title, r.where].map(q).join(","))].join("\r\n"), "text/csv");
  });
}

async function renderStep(g, step) {
  const main = document.getElementById("prepmain"); if (!main) return;
  const p = loadPrep(g), t = translation();
  const [k, label, desc] = STEPS.find(s => s[0] === step);
  const i = STEPS.findIndex(s => s[0] === step), next = STEPS[i + 1];
  let body = "";
  try { body = await STEP_BODY[k](g, p, t); } catch (e) { console.error(e); body = `<p class="small">This step could not load. Check your connection and try again.</p>`; }
  const notes = p.steps[k]?.notes || "", done = !!p.steps[k]?.done;
  main.innerHTML = `<h2>${i + 1}. ${label}</h2><p class="small stepdesc">${desc}</p>${body}
    ${k === "outline" ? "" : `<div class="stepnotes"><label for="snotes"><b>Your notes</b></label><textarea id="snotes" rows="6" placeholder="What you see in ${esc(g.title)}…">${esc(notes)}</textarea></div>`}
    <div class="actions stepnav"><button class="btn ${done ? "on" : ""}" type="button" id="sdone" aria-pressed="${done}">${done ? "Step done" : "Mark step done"}</button>${next ? `<a class="btn pri" href="/prepare/${g.key}?step=${next[0]}">Next: ${next[1]}</a>` : `<a class="btn pri" href="/prepare/${g.key}/present">Present</a>`}</div>`;
  document.querySelectorAll(".prepsteps a").forEach(a => { if (a.dataset.step === k) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current"); });
  const pp = () => loadPrep(g);
  document.getElementById("snotes")?.addEventListener("input", e => { const q = pp(); q.steps[k] = { ...(q.steps[k] || {}), notes: e.target.value }; savePrep(q); });
  document.getElementById("sdone").addEventListener("click", e => {
    const q = pp(); const on = !q.steps[k]?.done; q.steps[k] = { ...(q.steps[k] || {}), done: on }; savePrep(q, { now: true });
    e.currentTarget.classList.toggle("on", on); e.currentTarget.setAttribute("aria-pressed", on); e.currentTarget.textContent = on ? "Step done" : "Mark step done";
    const a = document.querySelector(`.prepsteps a[data-step="${k}"]`); a?.classList.toggle("done", on); if (a) a.querySelector(".pn").textContent = on ? "✓" : i + 1;
    const n = doneCount(q); document.getElementById("prepcount").textContent = `${n} of ${STEPS.length} steps done`;
    const bar = document.querySelector(".prepbar .progress"); bar?.setAttribute("aria-valuenow", n); bar?.querySelector("i")?.style.setProperty("width", `${Math.round(n / STEPS.length * 100)}%`);
  });
  main.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => {
    let d; try { d = JSON.parse(b.dataset.add); } catch { return; }
    const q = pp(); q.inbox.push({ id: blockId(), kind: d.kind, text: d.text, cite: d.cite, href: d.href || "" }); savePrep(q, { now: true });
    b.textContent = "Added"; b.disabled = true; C.toast("Added to collected material. Place it in a point in the Outline step.");
  }));
  if (k === "outline") wireOutline(g);
  if (k === "commentaries") main.querySelectorAll("[data-cm]").forEach(b => b.addEventListener("click", () => { C.store.setSetting("commentary", b.dataset.cm); renderStep(g, "commentaries"); }));
  if (k === "read") wireRead(g);
}

/* ---------- step bodies ---------- */
const STEP_BODY = {
  async read(g, p, t) {
    const other = t === "web" ? "kjv" : "web";
    const [a, b] = await Promise.all([passageVerses(g, t), passageVerses(g, other)]);
    const rtl = C.dirOf(t) === "rtl";
    return `<p>Read it slowly, twice. Tap verses to select them, then add them to your collected material.</p>
      <div class="readpair"><div><span class="chip scripture">Scripture · ${esc(C.META[t].name)}</span><div class="text lines ptext" dir="${rtl ? "rtl" : "ltr"}" lang="${C.langOf(t)}">${a.verses.map(([n, v]) => `<span class="v" data-v="${n}" tabindex="0" role="button" aria-pressed="false"><sup class="vn">${n}</sup>${esc(v)}</span>`).join(" ")}</div></div>
      <div><span class="chip scripture">Translation · ${esc(C.META[other].name)}</span><div class="text lines ptext muted" lang="${C.langOf(other)}">${b.verses.map(([n, v]) => `<span class="v"><sup class="vn">${n}</sup>${esc(v)}</span>`).join(" ")}</div></div></div>
      <div class="actions"><button class="btn" type="button" id="addsel" disabled>Add selected verses</button><span class="small" id="selcount"></span></div>`;
  },
  async observe(g, p, t) {
    const { verses } = await passageVerses(g, "kjv");
    const rep = C.repeatedWords(verses.map(v => v[1]));
    const st = C.langOf(t) === "en" ? t : "kjv", sv = st === "kjv" ? verses : (await passageVerses(g, st)).verses;
    return `${structureHtml(sv, st)}${rep.length ? `<p><b>Repeated words</b> (KJV): ${rep.map(([w, n]) => `<span class="chip">${esc(w)} × ${n}</span>`).join(" ")}</p>` : ""}
      <ul class="prompts">${C.OBSERVE.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
      <p class="small">Questions suited to ${esc(C.groupOf(g.book).toLowerCase())}:</p><ul class="prompts">${C.interpretQuestions(C.groupOf(g.book)).map(q => `<li>${esc(q)}</li>`).join("")}</ul>`;
  },
  async words(g, p, t) {
    const orig = await C.loadOrig(g.book, g.chapter).catch(() => null);
    if (!orig) return `<p class="small">No original-language data for this passage.</p>`;
    const { from, to } = await passageVerses(g, "kjv");
    const words = orig.verses.slice(from - 1, to).flat();
    const strongs = [...new Set(words.map(w => w[3]).filter(k => k && !/^H90\d\d/.test(k)))];
    const lex = new Map((await Promise.all(strongs.map(async k => [k, await C.loadLex(k).catch(() => null)]))).filter(([, e]) => e));
    const keys = C.keyLemmas(words, lex, 8);
    const heb = g.book < 39;
    return keys.length ? `<p>Words that repeat here or are rare in the Bible, so they may carry weight. Open one for its full entry and every other use.</p>
      <div class="kwgrid">${keys.map(k => `<div class="kw"><a href="/word/${esc(k.strong)}"><span class="big" lang="${heb ? "hbo" : "grc"}" dir="${heb ? "rtl" : "ltr"}">${esc(k.form)}</span><span class="small">${esc(k.translit)}</span><b>“${esc(k.gloss)}”</b><span class="small">${k.inPassage > 1 ? `${k.inPassage} times here · ` : ""}${k.total.toLocaleString()} in the Bible · ${esc(C.displayStrong(k.strong))}</span></a>${addButton({ kind: "word", text: `${k.form.replace(/[,.;:·]+$/, "")} (${k.translit}), “${k.gloss.replace(/[,.;:]+$/, "")}”: used ${k.total.toLocaleString()} times in the Bible.`, cite: `${C.displayStrong(k.strong)}, STEPBible lexicon (CC BY 4.0)`, href: `/word/${k.strong}` })}</div>`).join("")}</div>
      <p class="small">Data: STEPBible.org (Tyndale House, Cambridge), CC BY 4.0.</p>` : `<p class="small">No key words found for this passage.</p>`;
  },
  async context(g, p, t) {
    const c = C.CONTEXT[g.book];
    const [vx, pm, lm, em] = await Promise.all([C.H.vx(g.book), C.H.peopleMap(), C.H.placeMap(), C.H.eventMap()]).catch(() => [{}, new Map(), new Map(), new Map()]);
    const { from, to } = await passageVerses(g, "kjv");
    const pk = v => g.book * 1e6 + g.chapter * 1e3 + v, ppl = new Set(), pls = new Set(), evs = new Set();
    for (let v = from; v <= to; v++) { const r = vx?.[pk(v)]; if (r) { r[0].forEach(x => ppl.add(x)); r[1].forEach(x => pls.add(x)); r[2].forEach(x => evs.add(x)); } }
    const P = [...ppl].filter(x => x !== "god_1324").map(x => pm.get(x)).filter(Boolean).slice(0, 10), L = [...pls].map(x => lm.get(x)).filter(Boolean).slice(0, 8), E = [...evs].map(x => em.get(x)).filter(Boolean).slice(0, 6);
    const il = await C.illustrationsFor(g.book, g.chapter, g.from, g.to).catch(() => []);
    const bg = `${C.NAMES[g.book]}. Author: ${c[0]} Date: ${c[1]}. Setting: ${c[4]}`;
    return `<dl class="facts"><dt>Book</dt><dd>${C.NAMES[g.book]} · ${C.testamentOf(g.book)} · ${C.groupOf(g.book)}</dd><dt>Author</dt><dd>${esc(c[0])}</dd><dt>Date</dt><dd>${esc(c[1])}</dd><dt>Setting</dt><dd>${esc(c[4])}</dd><dt>Themes</dt><dd>${esc(c[5])}</dd></dl>
      <div class="actions">${addButton({ kind: "context", text: bg, cite: "Ereunia book notes", href: `/books` }, "Add background")}</div>
      ${E.length ? `<p><b>Events:</b> ${E.map(e => `${esc(e.title)} (${C.yearText(e.year)})`).join("; ")}</p>` : ""}
      ${P.length ? `<p><b>People:</b> ${P.map(r => `<a href="/person/${esc(r[0])}">${esc(r[1])}</a>`).join(", ")}</p>` : ""}
      ${L.length ? `<p><b>Places:</b> ${L.map(r => `<a href="/place/${esc(r[0])}">${esc(r[1])}</a>`).join(", ")}</p>` : ""}
      ${il.length ? `<h3>Sourced illustrations</h3><p class="small">True, checkable material from Ereunia's records: discoveries, dated events, places with archaeology and manuscripts. Each says where it comes from and, for discoveries, what it does not show. Open its page before you use it.</p><ul class="illist">${C.ilList(il.slice(0, 8), it => `<div class="actions">${addButton({ kind: it.kind, text: it.text, cite: it.cite, href: it.href })}</div>`)}</ul>` : ""}
      <p class="small">Book notes give traditional and academic views side by side. People, places and events: Theographic (CC BY-SA 4.0).</p>`;
  },
  async commentaries(g, p, t) {
    const { avail, cm } = await C.commentaryChoice(g.book);
    if (!cm) return `<p class="small">No commentary covers ${C.NAMES[g.book]} yet.</p>`;
    const data = await C.loadComm(cm.id, g.book, g.chapter).catch(() => null);
    const { from, to } = await passageVerses(g, "kjv");
    const entries = (data?.e || []).filter(([a, z]) => z >= from && a <= to);
    const near = !entries.length ? C.commentFor(data, from) : null;
    const list = entries.length ? entries : near ? [near.entry] : [];
    return `<p>Commentaries are interpretation. Read them after your own study, weigh them against the text, and note where they disagree.</p>
      <div class="cmpick" role="group" aria-label="Choose a commentary">${avail.map(c => `<button type="button" data-cm="${c.id}" aria-pressed="${c.id === cm.id}">${esc(C.CM_SHORT[c.id] || c.author)}</button>`).join("")}</div>
      <p class="cmmeta"><b>${esc(cm.name)}</b><br><span class="small">${esc(cm.author)}, ${esc(cm.date)}. ${esc(cm.tradition)}. Public domain.</span></p>
      ${list.length ? list.map(en => { const txt = C.plainText(en[2]), short = txt.length > 700 ? txt.slice(0, 700).replace(/\s\S*$/, "") + " …" : txt; return `<section class="cmentry"><h3 class="cmon">On ${C.cmOn(g.book, g.chapter, en)}</h3><details class="cmfold"><summary>${esc(short.slice(0, 220))}${short.length > 220 ? "…" : ""}</summary><div class="cmtext">${en[2]}</div></details><div class="actions">${addButton({ kind: "commentary", text: short, cite: `${cm.author}, ${cm.name} (${cm.date}), on ${C.cmOn(g.book, g.chapter, en)}`, href: `/read/kjv/${C.toOsis(g.book, g.chapter, en[0])}?panel=cm` }, "Add quote")}</div></section>`; }).join("") : `<p class="small">${esc(cm.author)} has no comment on this passage.</p>`}
      <p class="small">To quote a different sentence, open the Commentaries tab in the Research Desk, select the words and use “Add to preparation”.</p>`;
  },
  async connections(g, p, t) {
    const { from, to } = await passageVerses(g, "kjv");
    const xref = await C.loadXref(g.book);
    const pk = v => g.book * 1e6 + g.chapter * 1e3 + v;
    const xr = C.mergeCrossRefs(Array.from({ length: to - from + 1 }, (_, i) => xref[pk(from + i)] || []), n => n >= pk(from) && n <= pk(to), 10);
    const rows = await Promise.all(xr.map(async ([n]) => { const r = C.unpackRef(n); return [C.formatRef(r.book, r.chapter, r.verse), await C.verseText(t, C.toOsis(r.book, r.chapter, r.verse)).catch(() => ""), r]; }));
    return rows.length ? `<p>The passages readers most often link to this one (OpenBible.info). Add the ones you will use.</p>
      <ul class="xrlist">${rows.map(([ref, txt, r]) => `<li><a href="${C.readUrl(t, r.book, r.chapter, r.verse)}"><b>${esc(ref)}</b> <span>${esc(txt)}</span></a>${addButton({ kind: "xref", text: txt, cite: `${ref} (${C.TR[t]})`, href: C.readUrl(t, r.book, r.chapter, r.verse).replace(/^#/, "") })}</li>`).join("")}</ul>` : `<p class="small">No cross references recorded for this passage.</p>`;
  },
  async outline(g, p) {
    const kindChip = b => `<span class="kchip k-${esc(b.kind)}">${esc(KIND_LABEL[b.kind] || "Note")}</span>`;
    const blockHtml = (b, pi, bi, n) => `<li class="oblock" data-pi="${pi}" data-bi="${bi}">${kindChip(b)}<div class="obtext">${b.kind === "note" ? `<textarea data-note aria-label="Note">${esc(b.text)}</textarea>` : `<p>${esc(b.text)}</p>${b.cite ? `<p class="small cite">${b.href ? `<a href="${esc(b.href)}">${esc(b.cite)}</a>` : esc(b.cite)}</p>` : ""}`}</div>
      <div class="obact"><button type="button" class="ib" data-bmove="-1" ${bi === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button type="button" class="ib" data-bmove="1" ${bi === n - 1 ? "disabled" : ""} aria-label="Move down">↓</button><button type="button" class="ib" data-bdel aria-label="Remove">×</button></div></li>`;
    return `<div class="outline">
      <label class="oidea"><span>Main idea, in one sentence</span><input id="oidea" value="${esc(p.idea)}" placeholder="What is this passage saying?"></label>
      <ol class="opoints">${p.points.map((pt, pi) => `<li class="opoint" data-pi="${pi}"><div class="ophead"><span class="pnum">${pi + 1}</span><input data-ptext value="${esc(pt.text)}" placeholder="Point ${pi + 1}" aria-label="Point ${pi + 1}">
        <div class="obact"><button type="button" class="ib" data-pmove="-1" ${pi === 0 ? "disabled" : ""} aria-label="Move point up">↑</button><button type="button" class="ib" data-pmove="1" ${pi === p.points.length - 1 ? "disabled" : ""} aria-label="Move point down">↓</button><button type="button" class="ib" data-pdel aria-label="Remove point">×</button></div></div>
        <ul class="oblocks">${pt.blocks.map((b, bi) => blockHtml(b, pi, bi, pt.blocks.length)).join("")}</ul>
        <button type="button" class="btn" data-addnote>Add a note</button></li>`).join("")}</ol>
      <button type="button" class="btn pri" id="addpoint">Add a point</button>
      <aside class="inbox"><h3>Collected material <span class="small">(${p.inbox.length})</span></h3>
        ${p.inbox.length ? `<ul>${p.inbox.map((b, ii) => `<li data-ii="${ii}">${kindChip(b)}<p>${esc(b.text.length > 260 ? b.text.slice(0, 260) + "…" : b.text)}</p>${b.cite ? `<p class="small cite">${esc(b.cite)}</p>` : ""}
          <div class="actions">${p.points.length ? `<label class="sr" for="to${ii}">Place in</label><select id="to${ii}" data-to>${p.points.map((pt, pi) => `<option value="${pi}">Point ${pi + 1}${pt.text ? ": " + esc(pt.text.slice(0, 30)) : ""}</option>`).join("")}</select><button type="button" class="btn" data-place>Place</button>` : `<span class="small">Add a point first.</span>`}<button type="button" class="ib" data-idel aria-label="Remove from collected material">×</button></div></li>`).join("")}</ul>`
          : `<p class="small">Use “Add” in the other steps, or “Add to preparation” in the Research Desk, to collect verses, words, commentary quotes and cross references here.</p>`}</aside>
    </div>`;
  },
  async apply(g, p) {
    return `<ul class="prompts">${C.APPLY.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
      <p>When the outline is ready, prepare for Sunday and after:</p>
      <div class="actions"><a class="btn pri" href="/prepare/${g.key}/present">Present or preach from it</a><a class="btn" href="/prepare/${g.key}/handout">Print a handout</a><a class="btn" href="/prepare/${g.key}/group">Print a small-group guide</a><a class="btn" href="/prepare/${g.key}/family">Print a family take-home sheet</a></div>`;
  }
};

function wireRead(g) {
  const sel = new Set();
  const btn = document.getElementById("addsel"), cnt = document.getElementById("selcount");
  const toggle = el => { const v = +el.dataset.v; if (sel.has(v)) sel.delete(v); else sel.add(v); el.classList.toggle("sel", sel.has(v)); el.setAttribute("aria-pressed", sel.has(v)); btn.disabled = !sel.size; cnt.textContent = sel.size ? `${sel.size} selected` : ""; };
  document.querySelectorAll(".ptext .v[data-v]").forEach(el => { el.addEventListener("click", () => toggle(el)); el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(el); } }); });
  btn?.addEventListener("click", async () => {
    const t = translation(), { verses } = await passageVerses(g, t), vs = [...sel].sort((a, b) => a - b);
    const groups = []; for (const v of vs) { const last = groups.at(-1); if (last && last.at(-1) === v - 1) last.push(v); else groups.push([v]); }
    const q = loadPrep(g);
    for (const grp of groups) {
      const text = grp.map(v => verses.find(x => x[0] === v)?.[1] || "").join(" ");
      const ref = C.formatRef(g.book, g.chapter, grp[0], grp.at(-1));
      q.inbox.push({ id: blockId(), kind: "verse", text, cite: `${ref} (${C.TR[t]})`, href: C.readUrl(t, g.book, g.chapter, grp[0]).replace(/^#/, "") });
    }
    savePrep(q, { now: true }); sel.clear(); document.querySelectorAll(".ptext .v.sel").forEach(el => { el.classList.remove("sel"); el.setAttribute("aria-pressed", "false"); });
    btn.disabled = true; cnt.textContent = ""; C.toast(`${groups.length === 1 ? "Passage" : groups.length + " passages"} added to collected material`);
  });
}

function wireOutline(g) {
  const main = document.getElementById("prepmain");
  const rerender = () => renderStep(g, "outline");
  const mutate = (fn, { redraw = true } = {}) => { const q = loadPrep(g); fn(q); savePrep(q, { now: true }); if (redraw) rerender(); };
  document.getElementById("oidea").addEventListener("input", e => { const q = loadPrep(g); q.idea = e.target.value; savePrep(q); });
  document.getElementById("addpoint").addEventListener("click", () => mutate(q => q.points.push({ id: blockId(), text: "", blocks: [] })));
  main.querySelectorAll(".opoint").forEach(li => {
    const pi = +li.dataset.pi;
    li.querySelector("[data-ptext]").addEventListener("input", e => { const q = loadPrep(g); if (q.points[pi]) q.points[pi].text = e.target.value; savePrep(q); });
    li.querySelector("[data-pdel]").addEventListener("click", () => { if (loadPrep(g).points[pi].blocks.length && !confirmRemove()) return; mutate(q => { const [pt] = q.points.splice(pi, 1); q.inbox.push(...pt.blocks.filter(b => b.kind !== "note")); }); });
    li.querySelectorAll("[data-pmove]").forEach(b => b.addEventListener("click", () => mutate(q => { const j = pi + +b.dataset.pmove; [q.points[pi], q.points[j]] = [q.points[j], q.points[pi]]; })));
    li.querySelector("[data-addnote]").addEventListener("click", () => mutate(q => q.points[pi].blocks.push({ id: blockId(), kind: "note", text: "", cite: "", href: "" })));
    li.querySelectorAll(".oblock").forEach(bl => {
      const bi = +bl.dataset.bi;
      bl.querySelector("[data-note]")?.addEventListener("input", e => { const q = loadPrep(g); if (q.points[pi]?.blocks[bi]) q.points[pi].blocks[bi].text = e.target.value; savePrep(q); });
      bl.querySelectorAll("[data-bmove]").forEach(b => b.addEventListener("click", () => mutate(q => { const arr = q.points[pi].blocks, j = bi + +b.dataset.bmove; [arr[bi], arr[j]] = [arr[j], arr[bi]]; })));
      bl.querySelector("[data-bdel]").addEventListener("click", () => mutate(q => { const [b] = q.points[pi].blocks.splice(bi, 1); if (b.kind !== "note") q.inbox.push(b); }));
    });
  });
  main.querySelectorAll(".inbox li[data-ii]").forEach(li => {
    const ii = +li.dataset.ii;
    li.querySelector("[data-place]")?.addEventListener("click", () => { const to = +li.querySelector("[data-to]").value; mutate(q => { const [b] = q.inbox.splice(ii, 1); q.points[to]?.blocks.push(b); }); });
    li.querySelector("[data-idel]").addEventListener("click", () => mutate(q => q.inbox.splice(ii, 1)));
  });
}
// Removing a point returns its material to the collection, so nothing is lost; notes typed in it are the only loss.
const confirmRemove = () => true;

/* ---------- present: slides and preaching view ---------- */
async function present(g) {
  const p = loadPrep(g), S = slides(p, g.title);
  C.setTitle(`Present ${g.title}`);
  let i = 0, mode = C.store.setting("presentMode", "preach"), started = Date.now(), lock = null, tick = null;
  const host = document.createElement("div"); host.className = "present"; host.setAttribute("role", "dialog"); host.setAttribute("aria-label", `Present ${g.title}`);
  document.body.appendChild(host); document.body.classList.add("presenting");
  try { lock = await navigator.wakeLock?.request("screen"); } catch { lock = null; }
  const fmt = ms => { const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60; return `${m}:${String(s).padStart(2, "0")}`; };
  const draw = () => {
    const s = S[i];
    const slide = s.kind === "title" ? `<h1>${esc(s.title)}</h1>${s.body ? `<p class="prbig">${esc(s.body)}</p>` : ""}`
      : `<p class="prn">${s.n} of ${S.length - 1}</p><h1>${esc(s.title)}</h1>${s.scripture.map(x => `<blockquote>${esc(x.text)}<cite>${esc(x.cite)}</cite></blockquote>`).join("")}
         ${mode === "preach" ? s.notes.map(x => `<div class="prnote"><span class="kchip k-${esc(x.kind)}">${esc(KIND_LABEL[x.kind] || "Note")}</span><p>${esc(x.text)}</p>${x.cite ? `<p class="small">${esc(x.cite)}</p>` : ""}</div>`).join("") : ""}`;
    host.className = `present ${mode}`;
    host.innerHTML = `<div class="prbar"><button type="button" data-x aria-label="Close">×</button><div class="prseg" role="group" aria-label="View"><button type="button" data-m="preach" aria-pressed="${mode === "preach"}">Preaching notes</button><button type="button" data-m="slides" aria-pressed="${mode === "slides"}">Slides</button></div><span class="prtime" aria-label="Time since start">${fmt(Date.now() - started)}</span><button type="button" data-r aria-label="Restart the timer">↺</button></div>
      <div class="prstage" aria-live="polite">${slide || `<h1>Add points in the Outline step first.</h1>`}</div>
      <div class="prnav"><button type="button" data-p ${i === 0 ? "disabled" : ""}>‹ Back</button><span>${i + 1} / ${S.length}</span><button type="button" data-n ${i === S.length - 1 ? "disabled" : ""}>Next ›</button></div>`;
    host.querySelector("[data-x]").addEventListener("click", close);
    host.querySelector("[data-p]").addEventListener("click", () => { if (i > 0) { i--; draw(); } });
    host.querySelector("[data-n]").addEventListener("click", () => { if (i < S.length - 1) { i++; draw(); } });
    host.querySelector("[data-r]").addEventListener("click", () => { started = Date.now(); draw(); });
    host.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => { mode = b.dataset.m; C.store.setSetting("presentMode", mode); draw(); }));
    host.querySelector("[data-n]")?.focus({ preventScroll: true });
  };
  const key = e => { if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { if (i < S.length - 1) { i++; draw(); } e.preventDefault(); } else if (e.key === "ArrowLeft" || e.key === "PageUp") { if (i > 0) { i--; draw(); } e.preventDefault(); } else if (e.key === "Escape") close(); };
  let x0 = null; const ts = e => { x0 = e.touches[0].clientX; }, te = e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) { if (dx < 0 && i < S.length - 1) i++; else if (dx > 0 && i > 0) i--; draw(); } };
  function close() { document.removeEventListener("keydown", key); host.removeEventListener("touchstart", ts); host.removeEventListener("touchend", te); clearInterval(tick); lock?.release?.().catch(() => {}); host.remove(); document.body.classList.remove("presenting"); C.go(`/prepare/${g.key}?step=outline`, { replace: true }); }
  document.addEventListener("keydown", key); host.addEventListener("touchstart", ts, { passive: true }); host.addEventListener("touchend", te);
  tick = setInterval(() => { const t = host.querySelector(".prtime"); if (t) t.textContent = fmt(Date.now() - started); }, 1000);
  addEventListener("routechange", () => { if (host.isConnected) { document.removeEventListener("keydown", key); clearInterval(tick); lock?.release?.().catch(() => {}); host.remove(); document.body.classList.remove("presenting"); } }, { once: true });
  C.view.innerHTML = `<p class="small">Presenting ${esc(g.title)}. <a href="/prepare/${g.key}?step=outline">Back to the outline</a></p>`;
  draw();
}

/* ---------- printable handout and small-group guide ---------- */
async function handout(g, kind) {
  const p = loadPrep(g), t = translation(), { verses } = await passageVerses(g, t);
  const group = kind === "group";
  C.setTitle(`${group ? "Small-group guide" : "Handout"}: ${g.title}`);
  const sources = [...new Set(p.points.flatMap(pt => pt.blocks.map(b => b.cite).filter(Boolean)))];
  const qs = [...C.OBSERVE.slice(0, 3), ...C.interpretQuestions(C.groupOf(g.book)).slice(0, 2), ...C.APPLY.slice(0, 3)];
  C.view.innerHTML = `<div class="actions noprint handoutbar"><a class="btn" href="/prepare/${g.key}?step=${group ? "apply" : "outline"}">‹ Back to preparation</a><button class="btn pri" type="button" id="hprint">Print or save as PDF</button><span class="small">Choose “Save as PDF” in the print window for a PDF.</span></div>
  <article class="handout">
    <header><p class="small">${group ? "Small-group guide" : "Sermon notes"} · ${esc(C.META[t].name)}</p><h1>${esc(g.title)}</h1>${p.idea ? `<p class="hidea">${esc(p.idea)}</p>` : ""}</header>
    <section><h2>The passage</h2><p class="htext">${verses.map(([n, v]) => `<sup>${n}</sup>${esc(v)}`).join(" ")}</p></section>
    ${p.points.length ? `<section><h2>${group ? "Sunday's points" : "Outline"}</h2><ol class="hpoints">${p.points.map(pt => `<li><b>${esc(pt.text || "")}</b>${pt.blocks.filter(b => group ? b.kind === "verse" || b.kind === "xref" : b.kind !== "note").map(b => `<p>${esc(b.text)} <span class="small">${esc(b.cite)}</span></p>`).join("")}${group ? "" : `<div class="hlines" aria-hidden="true"></div>`}</li>`).join("")}</ol></section>` : ""}
    ${group ? `<section><h2>Questions for discussion</h2><ol class="hq">${qs.map(q => `<li>${esc(q)}<div class="hlines" aria-hidden="true"></div></li>`).join("")}</ol></section>` : ""}
    ${sources.length && !group ? `<section class="hsrc"><h2>Sources</h2><ul>${sources.map(s => `<li>${esc(s)}</li>`).join("")}</ul></section>` : ""}
    <footer class="small">Prepared with Ereunia · ereunia.com. ${esc(C.META[t].name)}: ${esc(C.META[t].licence)}.</footer>
  </article>`;
  document.getElementById("hprint").addEventListener("click", () => window.print());
}

/* ---------- passage structure ---------- */
function structureHtml(verses, t) {
  const cl = clauses(verses), lc = linkCounts(cl);
  const mark = x => x.link ? `<b class="lw">${esc(x.text.slice(0, x.link.length))}</b>${esc(x.text.slice(x.link.length))}` : esc(x.text);
  return `<details class="structure" open><summary><b>Structure</b> <span class="small">(${esc(C.META[t].name)})</span></summary>
    <p class="small">The passage set out phrase by phrase. Linking words are in bold and the phrases they introduce are indented, so the flow of thought is easier to follow. This is a reading aid based on English punctuation, not a grammatical analysis of the original.</p>
    ${lc.length ? `<p class="small">Linking words: ${lc.map(([w, n]) => `<span class="chip">${esc(w)} × ${n}</span>`).join(" ")}</p>` : ""}
    <div class="struct">${cl.map(x => `<p class="cl i${x.indent}">${x.verse ? `<sup class="vn">${x.verse}</sup>` : ""}${mark(x)}</p>`).join("")}</div></details>`;
}

/* ---------- printable passage study sheet ---------- */
async function passageSheet(g) {
  const p = loadPrep(g), t0 = translation(), t = C.langOf(t0) === "en" ? t0 : "kjv", { verses } = await passageVerses(g, t);
  C.setTitle(`Study sheet: ${g.title}`);
  const rep = C.repeatedWords(verses.map(v => v[1])).slice(0, 8);
  C.view.innerHTML = `<div class="actions noprint handoutbar"><a class="btn" href="/prepare/${g.key}?step=observe">‹ Back to preparation</a><button class="btn pri" type="button" id="hprint">Print or save as PDF</button><span class="small">The wide margin is for your own marks and notes.</span></div>
  <article class="handout studysheet">
    <header><p class="small">Passage study sheet · ${esc(C.META[t].name)}</p><h1>${esc(g.title)}</h1></header>
    <div class="sheetgrid"><div class="struct">${clauses(verses).map(x => `<p class="cl i${x.indent}">${x.verse ? `<sup>${x.verse}</sup>` : ""}${esc(x.text)}</p>`).join("")}</div><div class="smargin" aria-hidden="true"></div></div>
    ${rep.length ? `<p class="small"><b>Repeated words:</b> ${rep.map(([w, n]) => `${esc(w)} (${n})`).join(", ")}</p>` : ""}
    <section><h2>Questions to ask</h2><ol class="hq">${C.OBSERVE.slice(0, 5).map(q => `<li>${esc(q)}<div class="hlines short" aria-hidden="true"></div></li>`).join("")}</ol></section>
    <section><h2>Main idea</h2><div class="hlines" aria-hidden="true">${p.idea ? `<p>${esc(p.idea)}</p>` : ""}</div></section>
    <footer class="small">Prepared with Ereunia · ereunia.com. ${esc(C.META[t].name)}: ${esc(C.META[t].licence)}. Phrases are set out by English punctuation as a reading aid.</footer>
  </article>`;
  document.getElementById("hprint").addEventListener("click", () => window.print());
}

/* ---------- family and children's take-home sheet ---------- */
function storyFor(g) {
  return C.KID_STORIES.find(s => {
    const refs = [s.ref, ...s.scenes.map(x => x[1])].map(C.fromOsis).filter(r => r && r.book === g.book);
    if (!refs.length) return false;
    const lo = Math.min(...refs.map(r => r.chapter)), hi = Math.max(...refs.map(r => r.chapter));
    return g.chapter >= lo && g.chapter <= hi;
  }) || null;
}
async function familySheet(g) {
  const p = loadPrep(g), t0 = translation(), t = t0 === "kjv" && C.TR.web ? "web" : t0, { verses } = await passageVerses(g, t), s = storyFor(g); // modern English reads more easily at home
  C.setTitle(`Family sheet: ${g.title}`);
  const short = verses.length > 12;
  const qs = ["What happens in this passage? Tell it in your own words.", "What does it show us about God?", "Is there someone in the passage you would like to be like? Why?", "What is one thing we could do this week because of it?", "What could we thank God for, or ask him for, after reading it?"];
  C.view.innerHTML = `<div class="actions noprint handoutbar"><a class="btn" href="/prepare/${g.key}?step=apply">‹ Back to preparation</a><button class="btn pri" type="button" id="hprint">Print or save as PDF</button><span class="small">For families to take home after the service.</span></div>
  <article class="handout family">
    <header><p class="small">To read together at home · ${esc(C.META[t].name)}</p><h1>${esc(g.title)}</h1>${p.idea ? `<p class="hidea">${esc(p.idea)}</p>` : ""}</header>
    <section><h2>Read it together</h2><p class="htext">${(short ? verses.slice(0, 12) : verses).map(([n, v]) => `<sup>${n}</sup>${esc(v)}`).join(" ")}${short ? ` <i>Read on to the end of ${esc(g.title)} in your Bible.</i>` : ""}</p></section>
    <section><h2>Talk about it</h2><ol class="hq">${qs.map(q => `<li>${esc(q)}<div class="hlines short" aria-hidden="true"></div></li>`).join("")}</ol></section>
    ${s ? `<section class="fstory"><h2>A story to read with children</h2><p><b>${esc(s.title)}</b> (${esc(s.range)}) is an illustrated, read-aloud retelling on Ereunia: <b>ereunia.com/kids/${esc(s.id)}</b></p>${s.think ? `<p>${esc(s.think)}</p>` : ""}</section>` : ""}
    <section><h2>Draw it</h2><p class="small">Draw a picture of something in the passage.</p><div class="drawbox" aria-hidden="true"></div></section>
    <section><h2>Pray</h2><div class="hlines short" aria-hidden="true"></div></section>
    <footer class="small">Prepared with Ereunia · ereunia.com. ${esc(C.META[t].name)}: ${esc(C.META[t].licence)}.</footer>
  </article>`;
  document.getElementById("hprint").addEventListener("click", () => window.print());
}

/* ---------- sermon series planner ---------- */
const newId = () => Math.random().toString(36).slice(2, 10).padEnd(6, "0");
function prepStatus(spec) {
  if (!spec) return "";
  const raw = C.store.prep(spec); if (!raw) return `<span class="small">Not started</span>`;
  const p = cleanPrep(raw, spec, spec), n = doneCount(p);
  return `<span class="small">${n} of ${STEPS.length} steps${p.preached.length ? " · preached" : ""}</span>`;
}
const LECTIONARY_NOTE = `<p class="small">Following a lectionary? Type each week's reading into the plan. Ereunia does not include the Revised Common Lectionary tables: they belong to the Consultation on Common Texts, and they will be added only with its permission.</p>`;

function seriesIndex() {
  C.setTitle("Plan a sermon series");
  const list = C.store.seriesList().map(cleanSeries).filter(Boolean);
  C.view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="/pastors">For pastors and teachers</a></span><h1>Plan a sermon series</h1><p class="small">Give the series a name and a first Sunday, then a passage for each week. Each passage opens its own preparation. Plans are kept on this device and can go into your calendar.</p>
    <form class="seriesnew" id="snew"><label><span>Series name</span><input id="snt" maxlength="120" required placeholder="e.g. The Gospel of Mark"></label>
      <label><span>First Sunday</span><input type="date" id="sns"></label>
      <label><span>Fill with the chapters of a book (optional)</span><select id="snb"><option value="">No, I will add passages</option>${C.BOOKS.map((b, i) => `<option value="${i}">${esc(C.NAMES[i])} (${C.chapterCount(i)})</option>`).join("")}</select></label>
      <button class="btn pri">Create the series</button></form></div>
    <section class="prepstart"><h2>Your series</h2>${list.length ? `<ul class="preplist">${list.map(x => { const d = weekDates(x); return `<li><a href="/prepare/series/${x.id}"><b>${esc(x.title)}</b><span class="small">${x.weeks.length} ${x.weeks.length === 1 ? "week" : "weeks"}${d[0] ? ` · ${esc(fmtDate(d[0]))} to ${esc(fmtDate(d.at(-1)))}` : ""}</span></a></li>`; }).join("")}</ul>` : `<p class="small">No series yet.</p>`}</section>
    ${LECTIONARY_NOTE}`;
  document.getElementById("snew").addEventListener("submit", e => {
    e.preventDefault();
    const b = document.getElementById("snb").value, weeks = [];
    if (b !== "") { const bi = +b; for (let c = 1; c <= C.chapterCount(bi); c++) weeks.push({ spec: C.guideSpec(bi, c), label: C.formatRef(bi, c), title: "" }); }
    const x = cleanSeries({ id: newId(), title: document.getElementById("snt").value.trim(), start: document.getElementById("sns").value, every: 7, weeks: weeks.slice(0, 60) });
    C.store.saveSeries(x); C.go(`/prepare/series/${x.id}`);
  });
}

function seriesPage(id) {
  let x = cleanSeries(C.store.seriesGet(id));
  if (!x) { C.setTitle("Series not found"); C.view.innerHTML = `<div class="pagehead"><h1>Series not found</h1><p class="small">It may have been made on another device. <a href="/prepare/series">See your series</a>.</p></div>`; return; }
  C.setTitle(x.title);
  const save = () => C.store.saveSeries(x);
  const draw = () => {
    const d = weekDates(x);
    C.view.innerHTML = `<div class="pagehead noprint"><span class="eyebrow"><a href="/prepare/series">Sermon series</a></span>
      <label class="stitle"><span class="sr">Series name</span><input id="st" value="${esc(x.title)}" maxlength="120"></label>
      <div class="actions"><label><span class="small">First Sunday</span> <input type="date" id="ss" value="${esc(x.start)}"></label>
        <label><span class="small">Every</span> <select id="se"><option value="7" ${x.every === 7 ? "selected" : ""}>week</option><option value="14" ${x.every === 14 ? "selected" : ""}>two weeks</option></select></label></div></div>
    <ol class="weeks noprint">${x.weeks.map((w, i) => `<li class="week" data-i="${i}"><div class="wdate"><b>Week ${i + 1}</b><span class="small">${esc(fmtDate(d[i])) || "No date"}</span></div>
        <div class="wfields"><label><span class="sr">Passage for week ${i + 1}</span><input data-pass value="${esc(w.label)}" placeholder="Passage, e.g. Mark 1:1-15"></label><label><span class="sr">Sermon title for week ${i + 1}</span><input data-title value="${esc(w.title)}" maxlength="120" placeholder="Sermon title (optional)"></label></div>
        <div class="wact">${w.spec ? `<a class="btn" href="/prepare/${esc(w.spec)}">Prepare</a>${prepStatus(w.spec)}` : `<span class="small">Add a passage</span>`}
          <span class="obact"><button type="button" class="ib" data-mv="-1" ${i === 0 ? "disabled" : ""} aria-label="Move week ${i + 1} up">↑</button><button type="button" class="ib" data-mv="1" ${i === x.weeks.length - 1 ? "disabled" : ""} aria-label="Move week ${i + 1} down">↓</button><button type="button" class="ib" data-del aria-label="Remove week ${i + 1}">×</button></span></div></li>`).join("")}</ol>
    <div class="actions noprint"><button type="button" class="btn" id="addw">Add a week</button><button type="button" class="btn pri" id="ics" ${x.start && x.weeks.length ? "" : "disabled"}>Add to calendar (.ics)</button><button type="button" class="btn" id="sprint">Print the plan</button><button type="button" class="btn" id="sdel">Delete this series</button></div>
    ${x.start ? "" : `<p class="small noprint">Choose a first Sunday to date each week and add the series to your calendar.</p>`}
    <div class="noprint"><label class="stepnotes"><b>Notes on the series</b><textarea id="sn" rows="4" placeholder="Aim, audience, themes to carry through…">${esc(x.notes)}</textarea></label>${LECTIONARY_NOTE}</div>
    <article class="handout printonly"><header><p class="small">Sermon series</p><h1>${esc(x.title)}</h1></header><table class="ptable"><thead><tr><th>Date</th><th>Passage</th><th>Title</th></tr></thead><tbody>${x.weeks.map((w, i) => `<tr><td>${esc(fmtDate(d[i]))}</td><td>${esc(w.label)}</td><td>${esc(w.title)}</td></tr>`).join("")}</tbody></table>${x.notes ? `<p>${esc(x.notes)}</p>` : ""}<footer class="small">Planned with Ereunia · ereunia.com</footer></article>`;
    const $ = q => document.querySelector(q);
    $("#st").addEventListener("change", e => { x.title = e.target.value.trim() || "Untitled series"; C.setTitle(x.title); save(); });
    $("#ss").addEventListener("change", e => { x.start = e.target.value; save(); draw(); });
    $("#se").addEventListener("change", e => { x.every = +e.target.value; save(); draw(); });
    $("#sn").addEventListener("change", e => { x.notes = e.target.value; save(); });
    $("#addw").addEventListener("click", () => { if (x.weeks.length >= 60) return C.toast("A series can have up to 60 weeks"); x.weeks.push({ spec: "", label: "", title: "" }); save(); draw(); document.querySelector(".week:last-child [data-pass]")?.focus(); });
    $("#sprint").addEventListener("click", () => window.print());
    $("#sdel").addEventListener("click", e => {
      const btn = e.currentTarget;
      if (!btn.dataset.armed) { btn.dataset.armed = "1"; btn.textContent = "Select again to delete the plan (preparations are kept)"; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = "Delete this series"; } }, 5000); return; }
      C.store.removeSeries(x.id); C.toast("Series deleted. Its preparations are kept."); C.go("/prepare/series");
    });
    $("#ics").addEventListener("click", () => {
      const weeks = x.weeks.map((w, i) => ({ date: d[i], label: w.label, title: w.title, url: w.spec ? `https://ereunia.com/prepare/${w.spec}` : "" })).filter(w => w.date);
      download(`${x.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "series"}.ics`, seriesIcs(x.title, weeks), "text/calendar");
    });
    document.querySelectorAll(".week").forEach(li => {
      const i = +li.dataset.i;
      li.querySelector("[data-pass]").addEventListener("change", e => {
        const v = e.target.value.trim();
        if (!v) { x.weeks[i] = { ...x.weeks[i], spec: "", label: "" }; save(); draw(); return; }
        const r = C.parseReference(v, C.chapterCount);
        if (!r) { C.toast("Enter a passage such as Mark 1:1-15"); return; }
        x.weeks[i] = { ...x.weeks[i], spec: C.guideSpec(r.book, r.chapter, r.verse, r.verseEnd), label: C.formatRef(r.book, r.chapter, r.verse, r.verseEnd) }; save(); draw();
      });
      li.querySelector("[data-title]").addEventListener("change", e => { x.weeks[i].title = e.target.value.trim(); save(); });
      li.querySelectorAll("[data-mv]").forEach(b => b.addEventListener("click", () => { const j = i + +b.dataset.mv; [x.weeks[i], x.weeks[j]] = [x.weeks[j], x.weeks[i]]; save(); draw(); }));
      li.querySelector("[data-del]").addEventListener("click", () => { x.weeks.splice(i, 1); save(); draw(); });
    });
  };
  draw();
}
