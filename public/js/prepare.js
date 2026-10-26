// Prepare: a guided sermon and lesson preparation workspace, the "For pastors" page, and the outline's
// Present, handout and Word exports. Everything is kept on this device. No AI is used here.
import { STEPS, KIND_LABEL, cleanPrep, newPrep, doneCount, outlineDoc, slides, blockId } from "./prep-core.js";
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
  <section class="prepstart"><h2>Your preparations</h2>${prepList()}</section>`;
  wireStart("pf0");
}

export async function renderPrepare(ctx, spec, sub) {
  C = ctx; C.setNav("pastors"); await C.getIndex();
  if (!spec) {
    C.setTitle("Prepare");
    C.view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="/pastors">For pastors and teachers</a></span><h1>Prepare a sermon or lesson</h1><p class="small">Choose a passage. Ereunia walks you through it in eight steps and keeps your work on this device.</p>${startForm()}</div><section class="prepstart"><h2>Your preparations</h2>${prepList()}</section>`;
    wireStart(); return;
  }
  const g = passageOf(spec);
  if (!g) { C.view.innerHTML = `<div class="pagehead"><h1>Passage not found</h1><p class="small">Try a passage such as John 1:1-18.</p>${startForm()}</div>`; wireStart(); return; }
  if (sub === "present") return present(g);
  if (sub === "handout" || sub === "group") return handout(g, sub);
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
      <a class="btn" href="/prepare/${g.key}/handout">Handout</a>
      <a class="btn" href="/prepare/${g.key}/group">Small-group guide</a>
      <button class="btn" type="button" id="pdocx">Word document</button></div></div>
  <div class="prep">
    <nav class="prepsteps" aria-label="Preparation steps"><ol>${STEPS.map(([k, l, d], i) => `<li><a href="/prepare/${g.key}?step=${k}" data-step="${k}" ${k === step ? 'aria-current="step"' : ""} class="${p.steps[k]?.done ? "done" : ""}"><span class="pn" aria-hidden="true">${p.steps[k]?.done ? "✓" : i + 1}</span><span><b>${l}</b><span class="small">${d}</span></span></a></li>`).join("")}</ol></nav>
    <section class="prepmain" id="prepmain" aria-live="polite"><p class="loading">Opening ${esc(STEPS.find(s => s[0] === step)[1])}…</p></section>
  </div>`;
  document.getElementById("ptr").addEventListener("change", e => { C.store.setSetting("prepT", e.target.value); workspace(g); });
  document.getElementById("pdocx").addEventListener("click", async () => {
    const pp = loadPrep(g); const { verses } = await passageVerses(g, translation());
    download(`${g.key.replace(/\./g, "-")}-sermon.docx`, buildDocx(outlineDoc(pp, { passageText: verses, translation: C.META[translation()].name }), { title: g.title }), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
  await renderStep(g, step);
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
    return `${rep.length ? `<p><b>Repeated words</b> (KJV): ${rep.map(([w, n]) => `<span class="chip">${esc(w)} × ${n}</span>`).join(" ")}</p>` : ""}
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
    const disc = C.discForChapter(C.DISCOVERIES, g.book, g.chapter, C.bIdx);
    const bg = `${C.NAMES[g.book]}. Author: ${c[0]} Date: ${c[1]}. Setting: ${c[4]}`;
    return `<dl class="facts"><dt>Book</dt><dd>${C.NAMES[g.book]} · ${C.testamentOf(g.book)} · ${C.groupOf(g.book)}</dd><dt>Author</dt><dd>${esc(c[0])}</dd><dt>Date</dt><dd>${esc(c[1])}</dd><dt>Setting</dt><dd>${esc(c[4])}</dd><dt>Themes</dt><dd>${esc(c[5])}</dd></dl>
      <div class="actions">${addButton({ kind: "context", text: bg, cite: "Ereunia book notes", href: `/books` }, "Add background")}</div>
      ${E.length ? `<p><b>Events:</b> ${E.map(e => `${esc(e.title)} (${C.yearText(e.year)})`).join("; ")}</p>` : ""}
      ${P.length ? `<p><b>People:</b> ${P.map(r => `<a href="/person/${esc(r[0])}">${esc(r[1])}</a>`).join(", ")}</p>` : ""}
      ${L.length ? `<p><b>Places:</b> ${L.map(r => `<a href="/place/${esc(r[0])}">${esc(r[1])}</a>`).join(", ")}</p>` : ""}
      ${disc.length ? `<h3>Discoveries linked to ${C.formatRef(g.book, g.chapter)}</h3><ul class="linklist">${disc.slice(0, 6).map(d => `<li><a href="/discoveries/${d.id}"><span><span class="t">${esc(d.name)}</span><span class="d">${esc(d.summary)}</span></span></a>${addButton({ kind: "discovery", text: `${d.name}: ${d.summary}`, cite: `Ereunia, Discoveries: ${d.name} (with its museum and study sources)`, href: `/discoveries/${d.id}` })}</li>`).join("")}</ul><p class="small">Each discovery page says what the find shows and what it does not. Use them as illustrations only with that in view.</p>` : ""}
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
      <div class="actions"><a class="btn pri" href="/prepare/${g.key}/present">Present or preach from it</a><a class="btn" href="/prepare/${g.key}/handout">Print a handout</a><a class="btn" href="/prepare/${g.key}/group">Print a small-group guide</a></div>`;
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
