// Pastor tools beyond a single sermon: the illustration collection, opening shared sermon files and restoring
// backups, and the editable passage-structure board used in the Observe step.
import { cleanPrep, cleanBlock, newSermonId, sermonName, clauses, RELATIONS, SERMON_ID } from "./prep-core.js";

let A, C, esc;
const setup = api => { A = api; C = api.C; esc = api.esc; };
export const VERIFY = { personal: "Personal story", unchecked: "Source not yet checked", checked: "Source checked", disputed: "Disputed or doubtful" };

/* ---------- illustration collection ---------- */
const cleanIll = x => ({ id: String(x.id || "i" + Date.now().toString(36)).slice(0, 30), title: String(x.title || "").slice(0, 120), text: String(x.text || "").slice(0, 6000), source: String(x.source || "").slice(0, 300), href: /^\/[a-z]/i.test(x.href || "") ? x.href : "", verified: VERIFY[x.verified] ? x.verified : "unchecked", themes: (Array.isArray(x.themes) ? x.themes : []).map(t => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 12), passages: (Array.isArray(x.passages) ? x.passages : []).map(t => String(t).slice(0, 60)).slice(0, 12), uses: (Array.isArray(x.uses) ? x.uses : []).slice(-50).map(u => ({ sermonId: String(u?.sermonId || "").slice(0, 40), name: String(u?.name || "").slice(0, 160), date: String(u?.date || "").slice(0, 10) })), created: x.created, updated: x.updated });
export function illustrationsPage(api) {
  setup(api);
  const sermons = C.store.preps().filter(p => p.key).slice(0, 40);
  C.setTitle("Illustration collection");
  C.view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="/pastors">For pastors and teachers</a> · <a href="/prepare">Sermon library</a></span><h1>Illustration collection</h1>
      <p class="small">Stories, examples and quotations worth reusing, each with its source, how far you have checked it, its themes and where you have already used it. Kept on this device and included in your backups.</p></div>
    <div class="illtools"><form id="ilf" role="search"><label><span class="sr">Search illustrations</span><input id="ilq" type="search" placeholder="Search by words, theme or passage"></label><label><span class="sr">Checked</span><select id="ilv"><option value="">Any status</option>${Object.entries(VERIFY).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label></form>
      <details class="illnew"><summary class="btn pri">Add an illustration</summary><form id="iladd" class="dgrid">
        <label><span>Title</span><input id="iat" required maxlength="120"></label>
        <label><span>Source (book, article, news report, person)</span><input id="ias" maxlength="300"></label>
        <label><span>How far checked</span><select id="iav">${Object.entries(VERIFY).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
        <label><span>Themes (comma separated)</span><input id="iah" maxlength="300"></label>
        <label class="wide"><span>The illustration</span><textarea id="iax" rows="4" required></textarea></label>
        <button class="btn pri">Save</button></form></details></div>
    <p class="small" id="ilc" aria-live="polite"></p><ul class="illcoll" id="ill"></ul>
    <p class="small">For checkable material tied to a passage (discoveries, dated events, manuscripts), open the Illustrations tab in the <a href="/read/kjv/John.1.1?panel=il">Research Desk</a>.</p>`;
  const $ = id => document.getElementById(id);
  const draw = () => {
    const q = $("ilq").value.toLowerCase(), v = $("ilv").value, all = C.store.illustrations().map(cleanIll);
    const list = all.filter(x => (!v || x.verified === v) && (!q || [x.title, x.text, x.source, x.themes.join(" "), x.passages.join(" ")].join(" ").toLowerCase().includes(q)));
    $("ilc").textContent = all.length ? `${list.length} of ${all.length}` : "";
    $("ill").innerHTML = list.length ? list.map(x => `<li class="illcard v-${x.verified}" data-id="${esc(x.id)}">
        <div class="ilhead"><label class="sr" for="it${esc(x.id)}">Title</label><input id="it${esc(x.id)}" data-f="title" value="${esc(x.title)}"><label class="sr" for="iv${esc(x.id)}">How far checked</label><select id="iv${esc(x.id)}" data-f="verified">${Object.entries(VERIFY).map(([k, l]) => `<option value="${k}" ${k === x.verified ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
        <label class="sr" for="ix${esc(x.id)}">Text</label><textarea id="ix${esc(x.id)}" data-f="text" rows="3">${esc(x.text)}</textarea>
        <div class="ilmeta"><label><span class="small">Source</span><input data-f="source" value="${esc(x.source)}" placeholder="Where it comes from"></label><label><span class="small">Themes</span><input data-f="themes" value="${esc(x.themes.join(", "))}" placeholder="e.g. grace, courage"></label></div>
        <p class="small">${x.passages.length ? `Passages: ${x.passages.map(esc).join(", ")}. ` : ""}${x.uses.length ? `<b>Used ${x.uses.length} ${x.uses.length === 1 ? "time" : "times"}</b>: ${x.uses.slice(-4).reverse().map(u => `<a href="/prepare/${esc(u.sermonId)}">${esc(u.name)}</a>${u.date ? ` (${esc(A.fmtDate(u.date))})` : ""}`).join(", ")}` : "Not used yet."}</p>
        <div class="actions"><label class="sr" for="iu${esc(x.id)}">Use in a sermon</label><select id="iu${esc(x.id)}" data-use><option value="">Use in a sermon…</option>${sermons.map(s => `<option value="${esc(s.id)}">${esc(s.name || s.title)}</option>`).join("")}</select><button type="button" class="btn small" data-del>Delete</button></div></li>`).join("")
      : `<li class="empty">${all.length ? "No illustration matches." : "Your collection is empty. Add one here, or use “Save to illustration collection” on an illustration note in a sermon's notebook."}</li>`;
    $("ill").querySelectorAll(".illcard").forEach(li => {
      const id = li.dataset.id, get = () => cleanIll(C.store.illustration(id) || {});
      li.querySelectorAll("[data-f]").forEach(el => el.addEventListener("change", () => { const x = get(); x[el.dataset.f] = el.dataset.f === "themes" ? el.value.split(",").map(t => t.trim()).filter(Boolean) : el.value; C.store.saveIllustration(cleanIll(x)); if (el.dataset.f === "verified") li.className = `illcard v-${el.value}`; }));
      li.querySelector("[data-use]").addEventListener("change", e => {
        const sid = e.target.value; if (!sid) return; A.flush();
        const raw = C.store.prep(sid); if (!raw) return; const p = cleanPrep(raw, raw.key, raw.title); p.id = sid; const x = get();
        p.manuscript.push(cleanBlock({ type: "illus", text: x.text, cite: x.source, href: x.href, origin: x.verified === "personal" ? "mine" : "quote" }));
        C.store.savePrep(p); x.uses.push({ sermonId: sid, name: sermonName(p), date: p.date || A.today() }); C.store.saveIllustration(cleanIll(x));
        C.toast(`Added to the end of the manuscript of ${sermonName(p)}`); draw();
      });
      li.querySelector("[data-del]").addEventListener("click", e => { const b = e.currentTarget; if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Select again to delete"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Delete"; } }, 4000); return; } C.store.removeIllustration(id); draw(); });
    });
  };
  $("ilf").addEventListener("input", draw); $("ilf").addEventListener("submit", e => e.preventDefault());
  $("iladd").addEventListener("submit", e => { e.preventDefault(); C.store.saveIllustration(cleanIll({ id: "i" + Date.now().toString(36), title: $("iat").value.trim(), text: $("iax").value.trim(), source: $("ias").value.trim(), verified: $("iav").value, themes: $("iah").value.split(",").map(t => t.trim()).filter(Boolean), uses: [] })); e.currentTarget.reset(); e.currentTarget.closest("details").open = false; draw(); });
  draw();
}

/* ---------- open a sermon file, restore a backup ---------- */
export function importPage(api) {
  setup(api);
  C.setTitle("Open a sermon file");
  C.view.innerHTML = `<div class="pagehead"><span class="eyebrow"><a href="/prepare">Sermon library</a></span><h1>Open a sermon file or restore a backup</h1>
    <p class="small">Open a <b>.ereunia.json</b> sermon file a colleague shared with you, or restore a backup you downloaded. Sermons already on this device are kept: an imported sermon is added beside them.</p></div>
    <div class="actions"><label class="btn pri filebtn"><input type="file" id="impf" accept=".json,application/json" class="sr">Choose a file</label></div><div id="impr" aria-live="polite"></div>`;
  document.getElementById("impf").addEventListener("change", async e => {
    const f = e.target.files[0], out = document.getElementById("impr"); if (!f) return;
    if (f.size > 20 * 1048576) { out.innerHTML = `<p class="empty">That file is too large to be an Ereunia sermon or backup.</p>`; return; }
    let obj; try { obj = JSON.parse(await f.text()); } catch { out.innerHTML = `<p class="empty">That file could not be read. Choose an Ereunia sermon (.ereunia.json) or backup (.json).</p>`; return; }
    try {
      if (obj?.app === "ereunia" && obj.kind === "sermon" && obj.sermon?.key) {
        const s = obj.sermon, g = A.gOf(s.key); if (!g) throw new Error("The sermon's passage is not recognised.");
        const id = SERMON_ID.test(s.id || "") && !C.store.prep(s.id) ? s.id : newSermonId();
        const p = cleanPrep(s, g.key, g.title); p.id = id; // audio is never inside a sermon file; its recordings keep their transcripts
        if (C.store.prep(s.id)) p.name = `${sermonName(p)} (imported)`;
        C.store.savePrep(p);
        if (C.store.savedOk() === false) throw new Error("This browser's storage is full, so the sermon could not be saved. Download a backup and free some space.");
        out.innerHTML = `<p>Opened <b>${esc(sermonName(p))}</b> (${esc(g.title)}). Recordings are not inside sermon files, so any listed have no audio on this device.</p><div class="actions"><a class="btn pri" href="/prepare/${esc(id)}">Open the sermon</a></div>`;
      } else if (obj?.app === "ereunia" && obj.kind === "backup") {
        const r = C.store.restore(obj, { merge: true });
        if (!r.saved) throw new Error("This browser's storage is full, so the backup could not be saved. Free some space and try again.");
        out.innerHTML = `<p>Backup restored beside what was already here (nothing on this device was replaced): ${C.store.preps().length} sermons, ${r.notes} notes, ${r.bookmarks} bookmarks and ${r.highlights} highlights are now on this device.</p><div class="actions"><a class="btn pri" href="/prepare">Sermon library</a></div>`;
      } else throw new Error("That file is not an Ereunia sermon or backup.");
    } catch (err) { out.innerHTML = `<p class="empty">${esc(err.message || "That file is not an Ereunia sermon or backup.")}</p>`; }
  });
}

/* ---------- editable passage structure ---------- */
const REL_FROM_LINK = { because: "reason", for: "reason", since: "reason", but: "contrast", yet: "contrast", nevertheless: "contrast", "so that": "purpose", "in order that": "purpose", lest: "purpose", that: "purpose", therefore: "conclusion", wherefore: "conclusion", so: "result", then: "result", if: "condition", unless: "condition", when: "time", as: "comparison", "even as": "comparison" };
export function structureBoard(api, g, el, verses, t) {
  setup(api); if (!el) return;
  const draw = (focus = null, sel = "[data-text]") => {
    const p = A.loadPrep(g), st = p.structure;
    if (!st) { el.innerHTML = `<div class="sbstart"><p><b>Make the structure your own.</b> Copy the reading aid into an editable board, then indent phrases, label how each relates to the main line (reason, contrast, purpose, promise, conclusion…) and add notes. Your board is labelled as your analysis wherever it appears.</p><button type="button" class="btn" id="sbmake">Make an editable copy</button></div>`;
      el.querySelector("#sbmake").addEventListener("click", () => { const q = A.loadPrep(g); q.structure = { t, rows: clauses(verses).map(c => ({ text: c.text, verse: c.verse, indent: c.indent, rel: REL_FROM_LINK[c.link] || (c.verse ? "statement" : ""), note: "" })) }; A.savePrep(q, { now: true }); draw(); }); return; }
    el.innerHTML = `<div class="sboard"><div class="sbtop"><h3>Your structure <span class="schip">Your analysis</span></h3><span class="small">${esc(C.META[st.t]?.name || "")}. Indent with the arrows; split a phrase at the cursor; label each relation.</span><button type="button" class="btn small" id="sbreset">Start again from the reading aid</button></div>
      <ol class="sbrows">${st.rows.map((r, i) => `<li class="sbrow rel-${esc(r.rel || "none")}" style="--in:${r.indent}" data-i="${i}">
        <span class="sbv">${r.verse || ""}</span>
        <label class="sr" for="sbr${i}">Relation</label><select id="sbr${i}" data-rel>${RELATIONS.map(x => `<option value="${x}" ${x === r.rel ? "selected" : ""}>${x || "—"}</option>`).join("")}</select>
        <label class="sr" for="sbt${i}">Phrase</label><textarea id="sbt${i}" data-text rows="1">${esc(r.text)}</textarea>
        <span class="obact"><button type="button" class="ib" data-in="-1" ${r.indent ? "" : "disabled"} aria-label="Outdent phrase ${i + 1}">←</button><button type="button" class="ib" data-in="1" ${r.indent >= 5 ? "disabled" : ""} aria-label="Indent phrase ${i + 1}">→</button><button type="button" class="ib" data-split aria-label="Split at the cursor">⤶</button><button type="button" class="ib" data-merge ${i ? "" : "disabled"} aria-label="Join with the phrase above">⤴</button><button type="button" class="ib" data-mv="-1" ${i ? "" : "disabled"} aria-label="Move up">↑</button><button type="button" class="ib" data-mv="1" ${i < st.rows.length - 1 ? "" : "disabled"} aria-label="Move down">↓</button></span>
        <label class="sr" for="sbn${i}">Note</label><input id="sbn${i}" data-note value="${esc(r.note)}" placeholder="Note">
      </li>`).join("")}</ol></div>`;
    const mut = (fn, f, sel) => { const q = A.loadPrep(g); fn(q.structure.rows); A.savePrep(q, { now: true }); draw(f, sel); };
    el.querySelectorAll(".sbrow").forEach(li => {
      const i = +li.dataset.i, ta = li.querySelector("[data-text]");
      const grow = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; }; requestAnimationFrame(grow);
      ta.addEventListener("input", () => { grow(); const q = A.loadPrep(g); q.structure.rows[i].text = ta.value; A.savePrep(q); });
      li.querySelector("[data-note]").addEventListener("input", e => { const q = A.loadPrep(g); q.structure.rows[i].note = e.target.value; A.savePrep(q); });
      li.querySelector("[data-rel]").addEventListener("change", e => mut(rows => { rows[i].rel = e.target.value; }, i, "[data-rel]"));
      li.querySelectorAll("[data-in]").forEach(b => b.addEventListener("click", () => mut(rows => { rows[i].indent = Math.max(0, Math.min(5, rows[i].indent + +b.dataset.in)); }, i)));
      li.querySelectorAll("[data-mv]").forEach(b => b.addEventListener("click", () => mut(rows => { const j = i + +b.dataset.mv; [rows[i], rows[j]] = [rows[j], rows[i]]; }, i + +b.dataset.mv)));
      li.querySelector("[data-split]").addEventListener("click", () => { const at = ta.selectionStart || 0; if (at <= 0 || at >= ta.value.length) return C.toast("Place the cursor inside the phrase where it should split"); mut(rows => { const r = rows[i]; rows.splice(i + 1, 0, { ...r, text: r.text.slice(at).trim(), verse: null, note: "", indent: Math.min(5, r.indent + 1), rel: "" }); r.text = r.text.slice(0, at).trim(); }, i + 1); });
      li.querySelector("[data-merge]").addEventListener("click", () => mut(rows => { if (rows[i - 1].verse == null) rows[i - 1].verse = rows[i].verse; rows[i - 1].text = `${rows[i - 1].text} ${rows[i].text}`.trim(); rows[i - 1].note = [rows[i - 1].note, rows[i].note].filter(Boolean).join(" "); rows.splice(i, 1); }, i - 1));
    });
    el.querySelector("#sbreset").addEventListener("click", e => { const b = e.currentTarget; if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Select again: your board will be replaced"; return; } const q = A.loadPrep(g); q.structure = null; A.savePrep(q, { now: true }); draw(); });
    if (focus != null) el.querySelector(`.sbrow[data-i="${focus}"] ${sel}`)?.focus();
  };
  draw();
}
