// Write: the sermon manuscript editor, with the passage and research on one side and the notebook on the other.
// Also the Notebook tab and "Trace this point". Text is saved as you type; structural edits can be undone, and named
// versions can be restored. No AI is used here; anything pasted from an AI tool can be labelled as such.
import { BLOCK_TYPES, ORIGINS, NOTE_TYPES, KIND_LABEL, trimVersions, cleanBlock, cleanNote, blockId, manuscriptFromOutline, reviewFlags, tracePoint, sections, wordCount, minutesAt, sermonName } from "./prep-core.js";

let A, C, esc;
const TYPE_LABEL = Object.fromEntries(BLOCK_TYPES);
const CITED = new Set(["scripture", "quote", "illus"]);
const hist = new Map(), fut = new Map(); // undo and redo stacks per sermon
let focusIdx = -1, editing = false, review = false;
const setup = api => { A = api; C = api.C; esc = api.esc; };

/* ---------- conversions ---------- */
function fromMaterial(b) {
  const k = b.kind;
  if (k === "verse" || k === "xref") return cleanBlock({ type: "scripture", text: b.text, cite: b.cite, href: b.href });
  if (k === "commentary") return cleanBlock({ type: "quote", text: b.text, cite: b.cite, href: b.href, origin: "interp" });
  if (k === "discovery" || k === "context") return cleanBlock({ type: "illus", text: b.text, cite: b.cite, href: b.href, origin: "quote" });
  if (k === "word") return cleanBlock({ type: "para", text: b.text, cite: b.cite, href: b.href, origin: "quote" });
  return cleanBlock({ type: "para", text: b.text, origin: "mine" });
}
function fromNote(n) {
  const map = { obs: ["para", "mine"], question: ["para", "mine"], quote: ["quote", "quote"], illus: ["illus", n.cite ? "quote" : "mine"], apply: ["para", "mine"], interp: ["para", "interp"] };
  const [type, origin] = map[n.type] || ["para", "mine"];
  return cleanBlock({ type, origin, text: n.text, cite: n.cite, href: n.href });
}
/** "John 1:1–3 (KJV)" → { ref, t } for checking Scripture blocks against the translation. */
function parseCite(cite) {
  const m = String(cite).match(/^(.+?)\s*\(([^)]+)\)\s*$/); if (!m) return null;
  const t = Object.keys(C.TR).find(k => C.TR[k] === m[2].trim() || k === m[2].trim().toLowerCase()); if (!t) return null;
  const r = C.parseReference(m[1].replace(/[–—]/g, "-"), C.chapterCount); if (!r) return null;
  return { r, t };
}
async function verseLookup(ms) {
  const map = new Map();
  await Promise.all(ms.filter(b => b.type === "scripture" && b.cite).map(async b => {
    const pc = parseCite(b.cite); if (!pc) return;
    try { const book = await C.loadBook(pc.t, pc.r.book); const ch = book.chapters[pc.r.chapter - 1] || []; const a = pc.r.verse || 1, z = pc.r.verseEnd || pc.r.verse || ch.length; map.set(b.cite, ch.slice(a - 1, z).join(" ")); } catch { /* offline: cannot check */ }
  }));
  return cite => (map.has(cite) ? map.get(cite) : null);
}

/* ---------- undo, versions ---------- */
const snap = p => JSON.stringify(p.manuscript);
function pushUndo(p) { const h = hist.get(p.id) || []; h.push(snap(p)); if (h.length > 80) h.shift(); hist.set(p.id, h); fut.set(p.id, []); }
function undo(g, redo = false) {
  const p = A.loadPrep(g), from = redo ? fut : hist, to = redo ? hist : fut;
  const st = from.get(p.id) || []; if (!st.length) return C.toast(redo ? "Nothing to redo" : "Nothing to undo");
  (to.get(p.id) || to.set(p.id, []).get(p.id)).push(snap(p));
  p.manuscript = JSON.parse(st.pop()).map(cleanBlock).filter(Boolean); A.savePrep(p, { now: true }); drawEditor(g);
}
function saveVersion(p, label) {
  if (!p.manuscript.length) return p;
  const last = p.versions.at(-1);
  if (last && JSON.stringify(last.manuscript) === snap(p) && !label) return p;
  p.versions.push({ at: new Date().toISOString(), label: label || "Saved", idea: p.idea, manuscript: structuredClone(p.manuscript) });
  p.versions = trimVersions(p.versions);
  return p;
}
// Leaving the editor keeps a recoverable version when the manuscript changed and the last version is more than ten minutes old.
let autoFor = null;
addEventListener("routechange", () => {
  if (!autoFor || !A) return; const g = autoFor; autoFor = null;
  const p = A.loadPrep(g), last = p.versions.at(-1);
  if (p.manuscript.length && (!last || (JSON.stringify(last.manuscript) !== snap(p) && Date.now() - Date.parse(last.at) > 6e5))) { saveVersion(p, "Autosaved on leaving the editor"); A.savePrep(p, { now: true }); }
});

/* ---------- the Write tab ---------- */
export async function writeTab(api, g, body) {
  setup(api); autoFor = g; review = false; focusIdx = -1;
  hist.delete(g.id); fut.delete(g.id); // the manuscript may have changed elsewhere (e.g. an illustration added), so undo starts fresh
  const p = A.loadPrep(g), wide = matchMedia("(min-width: 1100px)").matches;
  body.innerHTML = `<div class="writebar" role="toolbar" aria-label="Manuscript tools">
      <button class="btn" type="button" id="wundo" title="Undo (Ctrl+Z outside a text box)">Undo</button><button class="btn" type="button" id="wredo">Redo</button>
      <button class="btn" type="button" id="wfromo">${p.manuscript.length ? "Rebuild from outline" : "Start from the outline"}</button>
      <details class="pmenu vmenu" id="vmenu"><summary class="btn">Versions</summary><div id="vlist"></div></details>
      <button class="btn" type="button" id="wreview" aria-pressed="false">Review sources</button>
      <span class="small wstats" id="wstats" aria-live="polite"></span></div>
    <div class="wgrid">
      <details class="wpane wres" ${wide ? "open" : ""}><summary><b>Passage and research</b></summary><div id="wres"></div></details>
      <section class="wms" aria-label="Manuscript"><ol class="mlist" id="mlist"></ol>
        <div class="actions maddrow"><span class="small">Add:</span>${BLOCK_TYPES.map(([k, l]) => `<button type="button" class="btn addb" data-newtype="${k}">${esc(l.replace(" (private)", ""))}</button>`).join("")}</div>
        <div id="wflags"></div></section>
      <details class="wpane wnb" ${wide ? "open" : ""}><summary><b>Notebook</b></summary><div id="wnb"></div></details>
    </div>
    <p class="small wfoot">Delivery cues are private: they appear in your pulpit copy and preaching view, never in handouts. Mark anything you took from an AI tool as an “AI suggestion” so it is flagged for review.</p>`;
  const $ = id => document.getElementById(id);
  $("wundo").addEventListener("click", () => undo(g)); $("wredo").addEventListener("click", () => undo(g, true));
  $("wfromo").addEventListener("click", () => {
    const q = A.loadPrep(g);
    if (!q.points.length && !q.idea) return C.toast("Add a main idea and points in the Outline step first");
    pushUndo(q); if (q.manuscript.length) saveVersion(q, "Before rebuilding from the outline");
    q.manuscript = manuscriptFromOutline(q); A.savePrep(q, { now: true }); drawEditor(g); drawVersions(g); C.toast("Manuscript started from your outline. Your earlier draft is saved under Versions.");
  });
  $("wreview").addEventListener("click", e => { review = !review; e.currentTarget.setAttribute("aria-pressed", review); drawFlags(g); });
  body.querySelectorAll("[data-newtype]").forEach(b => b.addEventListener("click", () => insert(g, cleanBlock({ type: b.dataset.newtype, text: "" }), { atEnd: true })));
  document.addEventListener("keydown", keyUndo);
  drawEditor(g); drawVersions(g); drawNotebookPane(g); await drawResearch(g, "passage");
}
function keyUndo(e) {
  if (!document.getElementById("mlist")) return document.removeEventListener("keydown", keyUndo);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !/^(TEXTAREA|INPUT|SELECT)$/.test(document.activeElement?.tagName)) { e.preventDefault(); const g = autoFor; if (g) undo(g, e.shiftKey); }
}
function stats(g) {
  const p = A.loadPrep(g), w = wordCount(p.manuscript), m = minutesAt(w), el = document.getElementById("wstats"); if (!el) return;
  el.innerHTML = `${w.toLocaleString()} words · ${m < 1 ? "under a minute" : `about ${m} min`} at 130 words a minute · planned ${p.target} min${m > p.target * 1.15 ? ` · <b class="over">longer than planned</b>` : ""}`;
}
function insert(g, block, { atEnd = false } = {}) {
  const p = A.loadPrep(g); pushUndo(p);
  const at = atEnd || focusIdx < 0 || focusIdx >= p.manuscript.length ? p.manuscript.length : focusIdx + 1;
  p.manuscript.splice(at, 0, block); A.savePrep(p, { now: true }); focusIdx = at; drawEditor(g, at);
}
function drawEditor(g, focusAt = null, focusSel = "[data-text]") {
  const p = A.loadPrep(g), list = document.getElementById("mlist"); if (!list) return;
  const heads = p.manuscript.filter(b => b.type === "heading");
  list.innerHTML = p.manuscript.length ? p.manuscript.map((b, i) => `<li class="mblock t-${b.type} o-${b.origin}" data-i="${i}">
      <div class="mbhead"><label class="sr" for="mt${i}">Type of block ${i + 1}</label><select id="mt${i}" data-type>${BLOCK_TYPES.map(([k, l]) => `<option value="${k}" ${k === b.type ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
        <label class="sr" for="mo${i}">Whose words, block ${i + 1}</label><select id="mo${i}" data-origin class="osel">${Object.entries(ORIGINS).map(([k, l]) => `<option value="${k}" ${k === b.origin ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
        ${b.type === "heading" ? `<button type="button" class="btn small trace" data-trace>Trace this point</button>` : ""}
        <span class="obact"><button type="button" class="ib" data-mv="-1" ${i === 0 ? "disabled" : ""} aria-label="Move block ${i + 1} up">↑</button><button type="button" class="ib" data-mv="1" ${i === p.manuscript.length - 1 ? "disabled" : ""} aria-label="Move block ${i + 1} down">↓</button><button type="button" class="ib" data-dup aria-label="Duplicate block ${i + 1}">⧉</button><button type="button" class="ib" data-del aria-label="Remove block ${i + 1}">×</button></span></div>
      <label class="sr" for="mx${i}">${esc(TYPE_LABEL[b.type])}</label><textarea id="mx${i}" data-text rows="${b.type === "heading" ? 1 : 3}" placeholder="${esc(placeholder(b.type))}">${esc(b.text)}</textarea>
      ${CITED.has(b.type) || b.cite || b.origin === "quote" || b.origin === "interp" ? `<label class="mcite"><span class="sr">Source for this block</span><input data-cite value="${esc(b.cite)}" placeholder="Source or reference, e.g. John 1:14 (KJV) or Matthew Henry on John 1:14"></label>` : ""}
      <div class="mflag" data-flag></div></li>`).join("")
    : `<li class="mempty"><p><b>The manuscript is empty.</b> Start from your outline, or add a heading or paragraph below. Use the research pane to insert Scripture and quotations with their citations.</p></li>`;
  const grow = ta => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 2, 900) + "px"; };
  list.querySelectorAll(".mblock").forEach(li => {
    const i = +li.dataset.i, ta = li.querySelector("[data-text]");
    requestAnimationFrame(() => grow(ta));
    ta.addEventListener("focus", () => { focusIdx = i; editing = false; });
    li.querySelectorAll("select, input, button").forEach(el => el.addEventListener("focus", () => { focusIdx = i; }));
    ta.addEventListener("input", () => { const q = A.loadPrep(g); if (!q.manuscript[i]) return; if (!editing) { pushUndo(q); editing = true; } q.manuscript[i].text = ta.value; A.savePrep(q); grow(ta); stats(g); });
    li.querySelector("[data-cite]")?.addEventListener("input", e => { const q = A.loadPrep(g); if (q.manuscript[i]) { q.manuscript[i].cite = e.target.value; A.savePrep(q); } });
    li.querySelector("[data-type]").addEventListener("change", e => { const q = A.loadPrep(g); pushUndo(q); const b = q.manuscript[i]; b.type = e.target.value; if (b.type === "scripture") b.origin = "scripture"; else if (b.origin === "scripture") b.origin = "mine"; A.savePrep(q, { now: true }); drawEditor(g, i, "[data-type]"); });
    li.querySelector("[data-origin]").addEventListener("change", e => { const q = A.loadPrep(g); pushUndo(q); q.manuscript[i].origin = e.target.value; A.savePrep(q, { now: true }); drawEditor(g, i, "[data-origin]"); });
    li.querySelectorAll("[data-mv]").forEach(b => b.addEventListener("click", () => { const q = A.loadPrep(g), d = +b.dataset.mv, j = i + d; pushUndo(q); [q.manuscript[i], q.manuscript[j]] = [q.manuscript[j], q.manuscript[i]]; A.savePrep(q, { now: true }); drawEditor(g, j, `[data-mv="${d}"]:not([disabled]), [data-text]`); }));
    li.querySelector("[data-dup]").addEventListener("click", () => { const q = A.loadPrep(g); pushUndo(q); q.manuscript.splice(i + 1, 0, { ...q.manuscript[i], id: blockId() }); A.savePrep(q, { now: true }); drawEditor(g, i + 1); });
    li.querySelector("[data-del]").addEventListener("click", () => { const q = A.loadPrep(g); pushUndo(q); q.manuscript.splice(i, 1); A.savePrep(q, { now: true }); focusIdx = Math.min(i, q.manuscript.length - 1); drawEditor(g, focusIdx >= 0 ? focusIdx : null); if (focusIdx < 0) document.getElementById("wundo")?.focus(); C.toast("Block removed. Undo brings it back."); });
    li.querySelector("[data-trace]")?.addEventListener("click", () => traceDialog(g, A.loadPrep(g).manuscript[i].id));
  });
  if (focusAt != null) list.querySelector(`.mblock[data-i="${focusAt}"]`)?.querySelector(focusSel)?.focus();
  stats(g); if (review) drawFlags(g);
  // keep point headings in the notebook's "link to point" list current
  const sel = document.getElementById("nbpoint"); if (sel) { const cur = sel.value; sel.innerHTML = `<option value="">No point</option>${heads.map(h => `<option value="${esc(h.pointId || h.id)}">${esc(h.text.slice(0, 50) || "Untitled point")}</option>`).join("")}`; sel.value = cur; }
}
const placeholder = t => ({ heading: "Point heading", para: "Write…", scripture: "Scripture text", quote: "Quotation", illus: "Illustration or story", trans: "Transition to the next point", cue: "A private reminder: pause, look up, slow down…", concl: "Conclusion and call to respond" })[t] || "";

async function drawFlags(g) {
  const box = document.getElementById("wflags"); if (!box) return;
  document.querySelectorAll(".mflag").forEach(x => { x.textContent = ""; x.closest(".mblock")?.classList.remove("flagged"); });
  if (!review) { box.innerHTML = ""; return; }
  box.innerHTML = `<p class="loading">Checking citations and Scripture text…</p>`;
  const p = A.loadPrep(g), look = await verseLookup(p.manuscript), flags = reviewFlags(p.manuscript, look);
  for (const f of flags) { const i = p.manuscript.findIndex(b => b.id === f.id); const li = document.querySelector(`.mblock[data-i="${i}"]`); if (li) { li.classList.add("flagged"); const el = li.querySelector("[data-flag]"); el.textContent = (el.textContent ? el.textContent + " " : "") + f.msg; } }
  const counts = Object.entries(p.manuscript.reduce((m, b) => (m[b.origin] = (m[b.origin] || 0) + 1, m), {}));
  box.innerHTML = `<div class="reviewbox"><b>${flags.filter(f => f.level === "warn").length ? `${flags.filter(f => f.level === "warn").length} to check` : "No problems found"}</b>${flags.length ? `: ${flags.map(f => esc(f.msg)).filter((x, i, a) => a.indexOf(x) === i).join(" ")}` : ". Every quotation has a source and every Scripture block matches its translation (where it can be checked on this device)."}
    <p class="small">Blocks by source: ${counts.map(([k, n]) => `${esc(ORIGINS[k])} ${n}`).join(" · ")}.</p></div>`;
}

function drawVersions(g) {
  const p = A.loadPrep(g), box = document.getElementById("vlist"); if (!box) return;
  box.innerHTML = `<form id="vsave" class="vsave"><label><span class="sr">Version name</span><input id="vname" maxlength="80" placeholder="Name this version, e.g. Before trimming"></label><button class="btn">Save version</button></form>
    ${p.versions.length ? `<ul class="vlist">${[...p.versions].reverse().map((v, k) => { const i = p.versions.length - 1 - k; return `<li><span><b>${esc(v.label)}</b><span class="small">${esc(new Date(v.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }))} · ${wordCount(v.manuscript).toLocaleString()} words</span></span><button type="button" class="btn small" data-restore="${i}">Restore</button></li>`; }).join("")}</ul>` : `<p class="small">No saved versions yet. A version is also kept automatically when you leave the editor after changes, and before you rebuild from the outline.</p>`}`;
  box.querySelector("#vsave").addEventListener("submit", e => { e.preventDefault(); const q = A.loadPrep(g); if (!q.manuscript.length) return C.toast("Write something first"); saveVersion(q, box.querySelector("#vname").value.trim() || "Saved"); A.savePrep(q, { now: true }); drawVersions(g); C.toast("Version saved"); });
  box.querySelectorAll("[data-restore]").forEach(b => b.addEventListener("click", () => {
    const q = A.loadPrep(g), v = q.versions[+b.dataset.restore]; if (!v) return;
    pushUndo(q); saveVersion(q, "Before restoring an earlier version"); q.manuscript = structuredClone(v.manuscript); A.savePrep(q, { now: true }); drawEditor(g); drawVersions(g); document.getElementById("vmenu").open = false;
    C.toast(`Restored “${v.label}”. The draft you had is saved as a version.`);
  }));
}

/* ---------- research pane ---------- */
async function drawResearch(g, which) {
  const box = document.getElementById("wres"); if (!box) return;
  const tabs = [["passage", "Passage"], ["collected", "Collected"], ["comm", "Commentary"]];
  box.innerHTML = `<div class="rtabs" role="group" aria-label="Research">${tabs.map(([k, l]) => `<button type="button" data-rt="${k}" aria-pressed="${k === which}">${l}</button>`).join("")}</div><div id="rbody"><p class="loading">Loading…</p></div>`;
  box.querySelectorAll("[data-rt]").forEach(b => b.addEventListener("click", () => drawResearch(g, b.dataset.rt)));
  const rb = box.querySelector("#rbody"), p = A.loadPrep(g), t = A.translation();
  try {
    if (which === "passage") {
      const { verses } = await A.passageVerses(g, t);
      rb.innerHTML = `<p class="small">${esc(C.META[t].name)}. Select verses, then insert them with their reference.</p>
        <div class="rverses" lang="${C.langOf(t)}" dir="${C.dirOf(t)}">${verses.map(([n, v]) => `<button type="button" class="rv" data-v="${n}" aria-pressed="false"><sup>${n}</sup>${esc(v)}</button>`).join("")}</div>
        <div class="actions"><button class="btn" type="button" id="rins" disabled>Insert selected</button><button class="btn" type="button" id="rall">Insert the whole passage</button></div>`;
      const sel = new Set(), btn = rb.querySelector("#rins");
      rb.querySelectorAll(".rv").forEach(el => el.addEventListener("click", () => { const v = +el.dataset.v; sel.has(v) ? sel.delete(v) : sel.add(v); el.setAttribute("aria-pressed", sel.has(v)); btn.disabled = !sel.size; }));
      const ins = vs => {
        const groups = []; for (const v of vs) { const l = groups.at(-1); if (l && l.at(-1) === v - 1) l.push(v); else groups.push([v]); }
        for (const grp of groups) insert(g, cleanBlock({ type: "scripture", text: grp.map(v => verses.find(x => x[0] === v)?.[1] || "").join(" "), cite: `${C.formatRef(g.book, g.chapter, grp[0], grp.length > 1 ? grp.at(-1) : undefined)} (${C.TR[t]})`, href: C.readUrl(t, g.book, g.chapter, grp[0]).replace(/^#/, "") }));
      };
      btn.addEventListener("click", () => { ins([...sel].sort((a, b) => a - b)); sel.clear(); rb.querySelectorAll(".rv").forEach(el => el.setAttribute("aria-pressed", "false")); btn.disabled = true; });
      rb.querySelector("#rall").addEventListener("click", () => ins(verses.map(v => v[0])));
    } else if (which === "collected") {
      const items = p.points.flatMap(pt => pt.blocks.filter(b => b.kind !== "note").map(b => ({ ...b, where: pt.text }))).concat(p.inbox.map(b => ({ ...b, where: "" })));
      rb.innerHTML = items.length ? `<ul class="rlist">${items.map((b, i) => `<li><span class="kchip k-${esc(b.kind)}">${esc(KIND_LABEL[b.kind] || "Note")}</span><p>${esc(b.text.length > 220 ? b.text.slice(0, 220) + "…" : b.text)}</p>${b.cite ? `<p class="small">${esc(b.cite)}</p>` : ""}<button type="button" class="btn small" data-ci="${i}">Insert</button></li>`).join("")}</ul>`
        : `<p class="small">Nothing collected yet. Use “Add” in the Study steps, or “Add to preparation” in the Research Desk.</p>`;
      rb.querySelectorAll("[data-ci]").forEach(b => b.addEventListener("click", () => insert(g, fromMaterial(items[+b.dataset.ci]))));
    } else {
      const { avail, cm } = await C.commentaryChoice(g.book);
      if (!cm) { rb.innerHTML = `<p class="small">No commentary covers ${esc(C.NAMES[g.book])} yet.</p>`; return; }
      const data = await C.loadComm(cm.id, g.book, g.chapter).catch(() => null), from = g.from || 1, to = g.to || 999;
      const list = (data?.e || []).filter(([a, z]) => z >= from && a <= to);
      rb.innerHTML = `<div class="cmpick" role="group" aria-label="Choose a commentary">${avail.map(c => `<button type="button" data-cm="${c.id}" aria-pressed="${c.id === cm.id}">${esc(C.CM_SHORT[c.id] || c.author)}</button>`).join("")}</div>
        <p class="small"><b>${esc(cm.name)}</b>, ${esc(cm.date)}. Interpretation: weigh it against the text. Select words in an entry to insert just those.</p>
        ${list.length ? list.map((en, i) => `<div class="rcm"><p class="small"><b>On ${esc(C.cmOn(g.book, g.chapter, en))}</b></p><div class="cmtext clamp" data-cmt="${i}">${en[2]}</div><button type="button" class="btn small" data-cq="${i}">Insert selection or excerpt</button></div>`).join("") : `<p class="small">${esc(cm.author)} has no comment on this passage.</p>`}`;
      rb.querySelectorAll("[data-cm]").forEach(b => b.addEventListener("click", () => { C.store.setSetting("commentary", b.dataset.cm); drawResearch(g, "comm"); }));
      rb.querySelectorAll("[data-cq]").forEach(b => b.addEventListener("click", () => {
        const en = list[+b.dataset.cq], el = rb.querySelector(`[data-cmt="${b.dataset.cq}"]`), s = getSelection();
        let text = s && el.contains(s.anchorNode) ? String(s).trim() : "";
        if (!text) { const t2 = C.plainText(en[2]); text = t2.length > 700 ? t2.slice(0, 700).replace(/\s\S*$/, "") + " …" : t2; }
        insert(g, cleanBlock({ type: "quote", origin: "interp", text, cite: `${cm.author}, ${cm.name} (${cm.date}), on ${C.cmOn(g.book, g.chapter, en)}`, href: `/read/kjv/${C.toOsis(g.book, g.chapter, en[0])}?panel=cm` }));
      }));
    }
  } catch (e) { rb.innerHTML = `<p class="small">This could not load. Check your connection.</p>`; }
}

/* ---------- notebook ---------- */
const noteForm = (id, heads, compact) => `<form class="nbform" id="${id}">
  <label><span class="sr">Kind of note</span><select data-nt>${Object.entries(NOTE_TYPES).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label>
  <label class="wide"><span class="sr">Note</span><textarea data-nx rows="${compact ? 2 : 3}" required placeholder="An observation, a question, a quotation, an illustration, an application…"></textarea></label>
  <label><span class="sr">Source (optional)</span><input data-nc placeholder="Source (optional)"></label>
  <label><span class="sr">Verse (optional)</span><input data-nv type="number" min="1" placeholder="Verse"></label>
  <label><span class="sr">Link to a point</span><select data-np ${compact ? 'id="nbpoint"' : ""}><option value="">No point</option>${heads.map(h => `<option value="${esc(h.pointId || h.id)}">${esc(h.text.slice(0, 50) || "Untitled point")}</option>`).join("")}</select></label>
  <button class="btn pri">Add note</button></form>`;
function headsOf(p) { const hs = p.manuscript.filter(b => b.type === "heading"); return hs.length ? hs : p.points.map(pt => ({ id: pt.id, pointId: pt.id, text: pt.text })); }
function readForm(form) {
  const v = form.querySelector("[data-nv]").value;
  return cleanNote({ type: form.querySelector("[data-nt]").value, text: form.querySelector("[data-nx]").value.trim(), cite: form.querySelector("[data-nc]").value.trim(), verse: v ? +v : null, pointId: form.querySelector("[data-np]").value, at: new Date().toISOString() });
}
function noteItem(n, heads, full) {
  const h = heads.find(x => (x.pointId || x.id) === n.pointId);
  return `<li class="nbitem nt-${n.type}" data-id="${esc(n.id)}"><div class="nbmeta"><span class="kchip">${esc(NOTE_TYPES[n.type])}</span>${n.verse ? `<span class="small">v. ${n.verse}</span>` : ""}${h ? `<span class="small">· ${esc(h.text.slice(0, 40))}</span>` : ""}</div>
    ${full ? `<label class="sr" for="ne${esc(n.id)}">Edit note</label><textarea id="ne${esc(n.id)}" data-edit rows="2">${esc(n.text)}</textarea>` : `<p>${esc(n.text)}</p>`}${n.cite ? `<p class="small">${esc(n.cite)}</p>` : ""}
    <div class="actions"><button type="button" class="btn small" data-ins>Insert in manuscript</button>${n.type === "illus" ? `<button type="button" class="btn small" data-keep>Save to illustration collection</button>` : ""}<button type="button" class="ib" data-ndel aria-label="Delete note">×</button></div></li>`;
}
function wireNotes(g, root, redraw) {
  root.querySelectorAll(".nbitem").forEach(li => {
    const id = li.dataset.id, find = q => q.notes.find(n => n.id === id);
    li.querySelector("[data-ins]").addEventListener("click", () => { const n = find(A.loadPrep(g)); if (!n) return; if (document.getElementById("mlist")) insert(g, fromNote(n)); else { const q = A.loadPrep(g); q.manuscript.push(fromNote(n)); A.savePrep(q, { now: true }); C.toast("Added to the end of the manuscript"); } });
    li.querySelector("[data-ndel]").addEventListener("click", () => { const q = A.loadPrep(g); q.notes = q.notes.filter(n => n.id !== id); A.savePrep(q, { now: true }); redraw(); });
    li.querySelector("[data-edit]")?.addEventListener("input", e => { const q = A.loadPrep(g), n = find(q); if (n) { n.text = e.target.value; A.savePrep(q); } });
    li.querySelector("[data-keep]")?.addEventListener("click", e => {
      const q = A.loadPrep(g), n = find(q); if (!n) return;
      const ill = { id: "i" + blockId(), title: n.text.split(/[.!?]/)[0].slice(0, 80), text: n.text, source: n.cite, href: n.href, verified: n.cite ? "unchecked" : "personal", themes: q.tags.slice(), passages: [q.title], uses: [] };
      C.store.saveIllustration(ill); e.currentTarget.textContent = "Saved"; e.currentTarget.disabled = true;
    });
  });
}
function drawNotebookPane(g) {
  const box = document.getElementById("wnb"); if (!box) return;
  const p = A.loadPrep(g), heads = headsOf(p);
  box.innerHTML = `${noteForm("nbquick", heads, true)}<ul class="nblist">${[...p.notes].reverse().slice(0, 40).map(n => noteItem(n, heads, false)).join("") || `<li class="small">No notes yet.</li>`}</ul>${p.notes.length > 40 ? `<p class="small"><a href="/prepare/${esc(g.id)}?tab=notes">All ${p.notes.length} notes</a></p>` : ""}`;
  box.querySelector("#nbquick").addEventListener("submit", e => { e.preventDefault(); const n = readForm(e.currentTarget); if (!n.text) return; const q = A.loadPrep(g); q.notes.push(n); A.savePrep(q, { now: true }); drawNotebookPane(g); });
  wireNotes(g, box, () => drawNotebookPane(g));
}
export async function notebookTab(api, g, body) {
  setup(api);
  const draw = () => {
    const p = A.loadPrep(g), heads = headsOf(p), filt = body.querySelector("#nbf")?.value || "", q = (body.querySelector("#nbq")?.value || "").toLowerCase();
    const list = p.notes.filter(n => (!filt || n.type === filt) && (!q || (n.text + " " + n.cite).toLowerCase().includes(q)));
    body.querySelector("#nbl").innerHTML = list.length ? [...list].reverse().map(n => noteItem(n, heads, true)).join("") : `<li class="empty">${p.notes.length ? "No notes match." : "Your notebook is empty. Keep observations, questions, quotations, illustrations and application ideas here, linked to verses and points."}</li>`;
    body.querySelector("#nbcount").textContent = `${p.notes.length} ${p.notes.length === 1 ? "note" : "notes"}`;
    wireNotes(g, body, draw);
  };
  const p = A.loadPrep(g);
  body.innerHTML = `<div class="notebook"><section><h2>Add a note</h2>${noteForm("nbmain", headsOf(p), false)}</section>
    <section><div class="nbtools"><h2>Notes <span class="small" id="nbcount"></span></h2><label><span class="sr">Show</span><select id="nbf"><option value="">All kinds</option>${Object.entries(NOTE_TYPES).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label><label><span class="sr">Search notes</span><input id="nbq" type="search" placeholder="Search notes"></label></div><ul class="nblist full" id="nbl"></ul></section></div>`;
  body.querySelector("#nbmain").addEventListener("submit", e => { e.preventDefault(); const n = readForm(e.currentTarget); if (!n.text) return; const q = A.loadPrep(g); q.notes.push(n); A.savePrep(q, { now: true }); e.currentTarget.reset(); draw(); });
  body.querySelector("#nbf").addEventListener("change", draw); body.querySelector("#nbq").addEventListener("input", draw);
  draw();
}

/* ---------- trace this point ---------- */
function traceDialog(g, headingId) {
  const p = A.loadPrep(g), tr = tracePoint(p, headingId); if (!tr) return;
  document.querySelector(".tracedlg")?.remove();
  const prevId = document.activeElement?.closest(".mblock")?.dataset.i;
  const col = (h, items, empty, render = x => `<p>${esc(x.text.length > 320 ? x.text.slice(0, 320) + "…" : x.text)}</p>${x.cite ? `<p class="small">${esc(x.cite)}</p>` : ""}`) => `<section><h3>${h}</h3>${items.length ? `<ul>${items.map(x => `<li>${render(x)}</li>`).join("")}</ul>` : `<p class="small missing">${empty}</p>`}</section>`;
  const host = document.createElement("div"); host.className = "tracedlg"; host.setAttribute("role", "dialog"); host.setAttribute("aria-modal", "true"); host.setAttribute("aria-labelledby", "trh");
  host.innerHTML = `<div class="trbox"><div class="trtop"><h2 id="trh">Trace: ${esc(tr.point || "Untitled point")}</h2><button type="button" class="ib" data-x aria-label="Close">×</button></div>
    <p class="small">How this point rests on the text. Passage → observation → sources → interpretation → application. Empty steps are worth a second look.</p>
    <div class="trchain">
      ${col("1. Passage", tr.passage, "No Scripture in this section yet.")}
      ${col("2. Observation", tr.observations, "No observations linked to this point. In the notebook, link observations to it.", x => `<p>${esc(x.text)}</p>${x.verse ? `<p class="small">verse ${x.verse}</p>` : ""}`)}
      ${col("3. Supporting sources", tr.sources, "No quoted sources in this section.")}
      ${col("4. Interpretation", tr.interpretation, "No interpretation recorded: commentary quotes and your interpretive notes appear here.")}
      ${col("5. Application", tr.application, "No application yet: add an application note linked to this point, or a conclusion block.")}
    </div>
    ${tr.ai.length ? `<p class="trai"><b>AI suggestions in this section:</b> ${tr.ai.length}. Check each one against the passage and your sources before preaching it.</p>` : ""}
    ${tr.flags.length ? `<ul class="trflags">${tr.flags.map(f => `<li>${esc(f.msg)}</li>`).join("")}</ul>` : ""}
    <p class="small">Your own words in this section: ${tr.mine.length} ${tr.mine.length === 1 ? "block" : "blocks"}. Labels come from the “Whose words” setting on each block.</p></div>`;
  document.body.appendChild(host);
  const behind = [...document.body.children].filter(x => x !== host && !x.inert); behind.forEach(x => { x.inert = true; });
  const close = () => { behind.forEach(x => { x.inert = false; }); host.remove(); document.removeEventListener("keydown", esc_); removeEventListener("routechange", close); document.querySelector(`.mblock[data-i="${prevId}"] [data-trace]`)?.focus(); };
  const esc_ = e => {
    if (e.key === "Escape") return close();
    if (e.key === "Tab") { const f = [...host.querySelectorAll("button, a[href], [tabindex]")]; if (!f.length) return; const first = f[0], last = f.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } else if (!host.contains(document.activeElement)) { e.preventDefault(); first.focus(); } }
  };
  addEventListener("routechange", close, { once: true });
  host.addEventListener("click", e => { if (e.target === host) close(); });
  host.querySelector("[data-x]").addEventListener("click", close); document.addEventListener("keydown", esc_);
  host.querySelector("[data-x]").focus();
}
export { sections, sermonName };
