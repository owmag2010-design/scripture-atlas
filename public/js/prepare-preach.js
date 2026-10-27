// Preach: the preaching view (manuscript in large type, outline notes, or slides), with a clock and timer, the
// passage one tap away, and your place remembered. A sermon can be made available offline on this device.
import { KIND_LABEL, slides, sections, sermonName, wordCount, minutesAt } from "./prep-core.js";

let A, C, esc;
const setup = api => { A = api; C = api.C; esc = api.esc; };

export async function preachTab(api, g, body) {
  setup(api);
  const p = A.loadPrep(g), w = wordCount(p.manuscript), off = p.offline;
  const mode = C.store.setting("preachMode", p.manuscript.length ? "manuscript" : "preach");
  body.innerHTML = `<div class="preachtab">
    <section><h2>Preach from this sermon</h2>
      <p>${p.manuscript.length ? `The manuscript: ${w.toLocaleString()} words, about ${minutesAt(w)} minutes (planned ${p.target}).` : "No manuscript yet: the preaching view will use your outline."}${p.pos ? ` You last stopped at block ${p.pos.i + 1}; it opens there.` : ""}</p>
      <div class="segpick" role="radiogroup" aria-label="Preaching view">${[["manuscript", "Manuscript", "Your full text in large type, cues included."], ["preach", "Outline notes", "One point at a time, with its Scripture and notes."], ["slides", "Slides", "Points and Scripture for a screen."]].map(([k, l, d]) => `<label class="tpl"><input type="radio" name="pmode" value="${k}" ${k === mode ? "checked" : ""} ${k === "manuscript" && !p.manuscript.length ? "disabled" : ""}><b>${l}</b><span>${d}</span></label>`).join("")}</div>
      <div class="actions"><a class="btn pri big" href="/prepare/${esc(g.id)}/present">Start preaching</a>${p.pos ? `<button class="btn" type="button" id="pfresh">Start from the beginning instead</button>` : ""}</div></section>
    <section><h2>Without a connection</h2>
      <p class="small">Church buildings often have poor signal. Make this sermon available offline and the preaching view, the manuscript and the passage will open on this device without the internet.</p>
      <div class="actions"><button class="btn" type="button" id="poff">${off ? "Update the offline copy" : "Make available offline"}</button><span class="small" id="poffs">${off ? `Offline copy saved ${esc(new Date(off.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }))}.` : ""}</span></div></section>
    <section><h2>On the day</h2><ul class="small tips"><li>Use the arrow keys, Page Down or a presentation clicker to move on; swipe on a phone or tablet.</li><li>The screen stays on while the preaching view is open, where the browser allows it.</li><li>Your text size and place are remembered for next time.</li></ul></section></div>`;
  body.querySelectorAll('[name="pmode"]').forEach(r => r.addEventListener("change", () => C.store.setSetting("preachMode", r.value)));
  body.querySelector("#pfresh")?.addEventListener("click", e => { const q = A.loadPrep(g); q.pos = null; A.savePrep(q, { now: true }); e.currentTarget.remove(); C.toast("The preaching view will start at the beginning"); });
  body.querySelector("#poff").addEventListener("click", async e => {
    const s = body.querySelector("#poffs"), btn = e.currentTarget; btn.disabled = true; s.textContent = "Saving…";
    try { await makeOffline(g); s.textContent = "Saved. The preaching view and passage now open without a connection on this device."; }
    catch (err) { s.textContent = `Could not finish: ${err.message || err}. The passage text is still saved with the sermon.`; }
    btn.disabled = false; btn.textContent = "Update the offline copy";
  });
}

/** Keeps the passage with the sermon, and asks the offline helper to keep the files the preaching view needs. */
async function makeOffline(g) {
  const t = A.translation(), { verses } = await A.passageVerses(g, t);
  const q = A.loadPrep(g); q.offline = { t, verses, at: new Date().toISOString() }; A.savePrep(q, { now: true });
  if (!("serviceWorker" in navigator)) throw new Error("this browser cannot keep pages offline");
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" }); await navigator.serviceWorker.ready;
  const urls = new Set(["/", `/prepare/${g.id}`, `/prepare/${g.id}/present`, "/index.html"]);
  for (const r of performance.getEntriesByType("resource")) { const u = new URL(r.name); if (u.origin === location.origin && /\.(js|css|woff2|json|svg|webp|png)$/.test(u.pathname)) urls.add(u.pathname); }
  for (const f of ["/js/prepare-preach.js", "/js/prepare.js", "/js/prep-core.js", "/js/docx.js", "/styles.css", "/fonts.css"]) urls.add(f);
  const sw = reg.active || navigator.serviceWorker.controller;
  await new Promise((res, rej) => { const ch = new MessageChannel(); ch.port1.onmessage = e => (e.data?.ok ? res() : rej(new Error(e.data?.error || "storage refused"))); sw.postMessage({ type: "keep", urls: [...urls] }, [ch.port2]); setTimeout(() => rej(new Error("timed out")), 30000); });
}

/* ---------- the preaching view ---------- */
export async function present(api, g) {
  setup(api);
  const p = A.loadPrep(g);
  let mode = C.store.setting("preachMode", p.manuscript.length ? "manuscript" : "preach"); if (mode === "manuscript" && !p.manuscript.length) mode = "preach";
  C.setTitle(`Preach ${sermonName(p)}`);
  const S = slides(p, g.title);
  let i = 0, started = null, paused = 0, pausedAt = null, lock = null, tick = null, size = C.store.setting("preachSize", 34), loose = C.store.setting("preachLoose", true);
  const host = document.createElement("div"); host.className = "present"; host.setAttribute("role", "dialog"); host.setAttribute("aria-label", `Preach ${sermonName(p)}`);
  document.body.appendChild(host); document.body.classList.add("presenting");
  try { lock = await navigator.wakeLock?.request("screen"); } catch { lock = null; }
  const fmt = ms => { const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60; return `${m}:${String(s).padStart(2, "0")}`; };
  const elapsed = () => started ? (pausedAt || Date.now()) - started - paused : 0;
  const clock = () => new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  let verses = null; A.passageVerses(g, p.offline?.t || A.translation()).then(v => { verses = v.verses; }).catch(() => { verses = p.offline?.verses || []; });
  const bar = () => `<div class="prbar"><button type="button" data-x aria-label="Close the preaching view">×</button>
      <div class="prseg" role="group" aria-label="View">${p.manuscript.length ? `<button type="button" data-m="manuscript" aria-pressed="${mode === "manuscript"}">Manuscript</button>` : ""}<button type="button" data-m="preach" aria-pressed="${mode === "preach"}">Notes</button><button type="button" data-m="slides" aria-pressed="${mode === "slides"}">Slides</button></div>
      ${mode === "manuscript" ? `<span class="prsize"><button type="button" data-sz="-4" aria-label="Smaller text">A−</button><button type="button" data-sz="4" aria-label="Larger text">A+</button><button type="button" data-ls aria-pressed="${loose}" aria-label="Wider line spacing">↕</button></span>` : ""}
      <button type="button" data-pass>Passage</button>
      <span class="prclock" aria-label="Time now">${clock()}</span>
      <button type="button" data-t class="prtime" aria-label="${started ? (pausedAt ? "Resume the timer" : "Pause the timer") : "Start the timer"}">${started ? fmt(elapsed()) : "Start timer"}</button><span class="prtarget">/ ${p.target}:00</span><button type="button" data-r aria-label="Reset the timer">↺</button></div>`;
  const msHtml = () => {
    let n = 0;
    return `<div class="prms" style="--ps:${size}px;--pl:${loose ? 1.65 : 1.4}">${p.manuscript.map((b, k) => {
      const tx = esc(b.text.replace(/\[([^\]]+)\]/g, "$1")).replace(/\n/g, "<br>");
      if (!b.text.trim() && b.type !== "heading") return "";
      if (b.type === "heading") return `<h2 data-k="${k}" id="pk${k}">${++n}. ${tx}</h2>`;
      if (b.type === "scripture") return `<blockquote data-k="${k}" class="pscr">${tx}${b.cite ? `<cite>${esc(b.cite)}</cite>` : ""}</blockquote>`;
      if (b.type === "quote") return `<blockquote data-k="${k}" class="pq">${tx}${b.cite ? `<cite>${esc(b.cite)}</cite>` : ""}</blockquote>`;
      if (b.type === "cue") return `<p data-k="${k}" class="pcue">${tx}</p>`;
      if (b.type === "trans") return `<p data-k="${k}" class="ptrans">${tx}</p>`;
      if (b.type === "concl") return `<h2 data-k="${k}">Conclusion</h2><p data-k="${k}">${tx}</p>`;
      return `<p data-k="${k}" class="${b.type === "illus" ? "pill" : ""}">${tx}</p>`;
    }).join("")}<p class="pend">End of the manuscript.</p></div>`;
  };
  const slideHtml = () => {
    const s = S[i];
    return s.kind === "title" ? `<h1>${esc(s.title)}</h1>${s.body ? `<p class="prbig">${esc(s.body)}</p>` : ""}`
      : `<p class="prn">${s.n} of ${S.length - 1}</p><h1>${esc(s.title)}</h1>${s.scripture.map(x => `<blockquote>${esc(x.text)}<cite>${esc(x.cite)}</cite></blockquote>`).join("")}
         ${mode === "preach" ? s.notes.map(x => `<div class="prnote"><span class="kchip k-${esc(x.kind)}">${esc(KIND_LABEL[x.kind] || "Note")}</span><p>${esc(x.text)}</p>${x.cite ? `<p class="small">${esc(x.cite)}</p>` : ""}</div>`).join("") : ""}`;
  };
  let scroller = null, saveT = null;
  const savePos = () => { clearTimeout(saveT); saveT = setTimeout(() => {
    if (!scroller) return; const top = scroller.getBoundingClientRect().top + 8;
    const el = [...scroller.querySelectorAll("[data-k]")].find(x => x.getBoundingClientRect().bottom > top); if (!el) return;
    const q = A.loadPrep(g); q.pos = { i: +el.dataset.k, size, at: new Date().toISOString() }; A.savePrep(q);
  }, 600); };
  const draw = (restore = false) => {
    host.className = `present ${mode}`;
    if (mode === "manuscript") {
      host.innerHTML = `${bar()}<div class="prstage prscroll" tabindex="0" aria-label="Manuscript">${msHtml()}</div>
        <div class="prnav"><button type="button" data-up>‹ Up</button><span class="prjump"><label class="sr" for="pjump">Jump to a point</label><select id="pjump"><option value="">Jump to…</option>${p.manuscript.map((b, k) => b.type === "heading" ? `<option value="${k}">${esc(b.text.slice(0, 50))}</option>` : "").join("")}</select></span><button type="button" data-down>Down ›</button></div>`;
      scroller = host.querySelector(".prscroll");
      scroller.addEventListener("scroll", savePos, { passive: true });
      if (restore && p.pos?.i != null) requestAnimationFrame(() => scroller.querySelector(`[data-k="${p.pos.i}"]`)?.scrollIntoView({ block: "start" }));
      host.querySelector("[data-up]").addEventListener("click", () => scroller.scrollBy({ top: -scroller.clientHeight * 0.8, behavior: "smooth" }));
      host.querySelector("[data-down]").addEventListener("click", () => scroller.scrollBy({ top: scroller.clientHeight * 0.8, behavior: "smooth" }));
      host.querySelector("#pjump").addEventListener("change", e => { if (e.target.value !== "") scroller.querySelector(`[data-k="${e.target.value}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }); e.target.value = ""; scroller.focus(); });
      host.querySelectorAll("[data-sz]").forEach(b => b.addEventListener("click", () => { size = Math.max(20, Math.min(64, size + +b.dataset.sz)); C.store.setSetting("preachSize", size); const keep = scroller.querySelector(`[data-k]`); scroller.querySelector(".prms").style.setProperty("--ps", size + "px"); }));
      host.querySelector("[data-ls]")?.addEventListener("click", e => { loose = !loose; C.store.setSetting("preachLoose", loose); e.currentTarget.setAttribute("aria-pressed", loose); scroller.querySelector(".prms").style.setProperty("--pl", loose ? 1.65 : 1.4); });
      scroller.focus({ preventScroll: true });
    } else {
      scroller = null;
      host.innerHTML = `${bar()}<div class="prstage" aria-live="polite">${S.length ? slideHtml() : `<h1>Add points in the Outline step first.</h1>`}</div>
        <div class="prnav"><button type="button" data-p ${i === 0 ? "disabled" : ""}>‹ Back</button><span>${i + 1} / ${S.length}</span><button type="button" data-n ${i === S.length - 1 ? "disabled" : ""}>Next ›</button></div>`;
      host.querySelector("[data-p]").addEventListener("click", () => { if (i > 0) { i--; draw(); } });
      host.querySelector("[data-n]").addEventListener("click", () => { if (i < S.length - 1) { i++; draw(); } });
      host.querySelector("[data-n]")?.focus({ preventScroll: true });
    }
    host.querySelector("[data-x]").addEventListener("click", close);
    host.querySelector("[data-t]").addEventListener("click", () => { if (!started) started = Date.now(); else if (pausedAt) { paused += Date.now() - pausedAt; pausedAt = null; } else pausedAt = Date.now(); tickNow(); });
    host.querySelector("[data-r]").addEventListener("click", () => { started = null; paused = 0; pausedAt = null; tickNow(); });
    host.querySelector("[data-pass]").addEventListener("click", passage);
    host.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => { mode = b.dataset.m; C.store.setSetting("preachMode", mode); draw(mode === "manuscript"); }));
  };
  const tickNow = () => {
    const t = host.querySelector(".prtime"), c = host.querySelector(".prclock"); if (c) c.textContent = clock();
    if (!t) return; t.textContent = started ? fmt(elapsed()) + (pausedAt ? " (paused)" : "") : "Start timer";
    t.classList.toggle("over", started && elapsed() > p.target * 60000);
    t.setAttribute("aria-label", started ? (pausedAt ? "Resume the timer" : "Pause the timer") : "Start the timer");
  };
  function passage() {
    const ov = document.createElement("div"); ov.className = "prpass"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", g.title);
    const vs = verses || p.offline?.verses || [];
    ov.innerHTML = `<div class="prpbox"><div class="trtop"><h2>${esc(g.title)}</h2><button type="button" data-cx aria-label="Close the passage">×</button></div><div class="prptext">${vs.length ? vs.map(([n, v]) => `<sup>${n}</sup>${esc(v)}`).join(" ") : "The passage has not loaded. Make the sermon available offline from the Preach tab next time."}</div></div>`;
    host.appendChild(ov); const x = ov.querySelector("[data-cx]"); x.focus();
    const shut = () => { ov.remove(); host.querySelector("[data-pass]")?.focus(); };
    x.addEventListener("click", shut); ov.addEventListener("click", e => { if (e.target === ov) shut(); }); ov.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); shut(); } });
  }
  const key = e => {
    if (host.querySelector(".prpass")) return;
    if (/^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (mode === "manuscript" && scroller) {
      if (["ArrowDown", "PageDown", " ", "ArrowRight"].includes(e.key)) { scroller.scrollBy({ top: scroller.clientHeight * (e.key === "ArrowDown" ? 0.25 : 0.8), behavior: "smooth" }); e.preventDefault(); }
      else if (["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key)) { scroller.scrollBy({ top: -scroller.clientHeight * (e.key === "ArrowUp" ? 0.25 : 0.8), behavior: "smooth" }); e.preventDefault(); }
    } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { if (i < S.length - 1) { i++; draw(); } e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { if (i > 0) { i--; draw(); } e.preventDefault(); }
    if (e.key === "Escape") close();
  };
  let x0 = null; const ts = e => { x0 = e.touches[0].clientX; }, te = e => { if (x0 == null || mode === "manuscript") return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) { if (dx < 0 && i < S.length - 1) i++; else if (dx > 0 && i > 0) i--; draw(); } };
  const cleanup = () => { document.removeEventListener("keydown", key); host.removeEventListener("touchstart", ts); host.removeEventListener("touchend", te); clearInterval(tick); A.flush(); lock?.release?.().catch(() => {}); host.remove(); document.body.classList.remove("presenting"); };
  function close() { cleanup(); C.go(`/prepare/${g.id}?tab=preach`, { replace: true }); }
  document.addEventListener("keydown", key); host.addEventListener("touchstart", ts, { passive: true }); host.addEventListener("touchend", te);
  tick = setInterval(tickNow, 1000);
  document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible" && host.isConnected && !lock) { try { lock = await navigator.wakeLock?.request("screen"); } catch {} } });
  addEventListener("routechange", () => { if (host.isConnected) cleanup(); }, { once: true });
  C.view.innerHTML = `<p class="small">Preaching ${esc(sermonName(p))}. <a href="/prepare/${esc(g.id)}?tab=preach">Back to the sermon</a></p>`;
  draw(true);
}
