// Record: rehearsals and sermons recorded (or imported) and kept with the sermon. Audio is saved in segments while
// recording, so an interrupted recording can be recovered. Recording does not depend on speech recognition; a live
// transcript is optional, and transcripts can be typed, corrected or imported, with timestamps and Bible references.
import { sermonName, wordCount, minutesAt } from "./prep-core.js";
import { sermonRefs } from "./sermon.js";
import * as idb from "./idb.js";

let A, C, esc, rec = null, currentRedraw = null;
const fmt = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${h ? h + ":" + String(m).padStart(2, "0") : m}:${String(x).padStart(2, "0")}`; };
const newRecId = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const vtt = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = (s % 60).toFixed(3).padStart(6, "0"); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${x}`; };

/** Transcript text from a .vtt, .srt or plain-text file → [{ t, text }]. Plain lines may start with [mm:ss] or mm:ss. */
export function parseTranscript(raw) {
  const s = String(raw || "").replace(/\r/g, ""), out = [];
  const ts = x => { const p = x.trim().replace(",", ".").split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : +p[0] || 0; };
  if (/-->/.test(s)) {
    for (const block of s.split(/\n\s*\n/)) {
      const lines = block.split("\n").filter(l => l.trim() && !/^WEBVTT/.test(l));
      const cue = lines.findIndex(l => l.includes("-->")); if (cue < 0) continue; // lines before the timing (a cue number) are ignored
      const text = lines.slice(cue + 1).join(" ").replace(/<[^>]+>/g, "").trim(); if (text) out.push({ t: ts(lines[cue].split("-->")[0]), text });
    }
    return out;
  }
  for (const line of s.split("\n")) { const m = line.match(/^\s*(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]|(\d{2}:\d{2}(?::\d{2})?))\s+(.*)$/); if (m) out.push({ t: ts(m[1] || m[2]), text: m[3].trim() }); else if (line.trim()) out.push({ t: out.at(-1)?.t || 0, text: line.trim() }); }
  return out;
}

export async function recordTab(api, g, body) {
  A = api; C = api.C; esc = api.esc;
  const draw = async () => {
    if (!body.isConnected) return;
    const p = A.loadPrep(g), stored = await idb.storedRecordings().catch(() => new Set());
    const orphans = [...stored].filter(id => !C.store.recordingInUse(id) && !(rec && rec.id === id));
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    body.innerHTML = `<div class="recordtab">
      <section class="recnew"><h2>Record</h2>
        ${rec ? `<div class="reclive" role="status"><b>${rec.gid === g.id ? "Recording this sermon" : "Another sermon is being recorded"}</b> <span class="recclock" id="rlclock">${fmt(rec.elapsed())}</span>
          ${rec.gid === g.id ? `<div class="actions"><button class="btn" type="button" id="rlpause">${rec.mr.state === "paused" ? "Resume" : "Pause"}</button><button class="btn" type="button" id="rlmark">Mark this moment</button><button class="btn pri" type="button" id="rlstop">Stop and save</button></div>` : `<p class="small"><a href="/prepare/${esc(rec.gid)}?tab=record">Go to that sermon to stop it</a>.</p>`}</div>`
        : navigator.mediaDevices?.getUserMedia && window.MediaRecorder ? `<form id="rform" class="recform">
          <label><span>What is it?</span><select id="rkind"><option value="rehearsal">A rehearsal</option><option value="sermon">The sermon as preached</option></select></label>
          <label><span>Name (optional)</span><input id="rname" maxlength="120" placeholder="e.g. Sunday 9:30"></label>
          ${SR ? `<label class="chk"><input type="checkbox" id="rlive"> Also make a live transcript (your browser sends the audio to its speech service)</label>` : `<p class="small">This browser cannot make a live transcript; you can add or import one afterwards.</p>`}
          <div class="actions"><button class="btn pri" type="button" id="rstart">Start recording</button><button class="btn" type="button" id="rpause" disabled>Pause</button><button class="btn" type="button" id="rmark" disabled>Mark this moment</button><button class="btn" type="button" id="rstop" disabled>Stop and save</button>
            <span class="recclock" id="rclock" aria-live="off">0:00</span><span class="meter" aria-hidden="true"><i id="rlevel"></i></span></div>
          <p class="small" id="rstat" aria-live="polite">Audio is saved to this device every few seconds while you record.</p>
          <div class="livetx" id="rlivetx" hidden></div></form>` : `<p class="empty">This browser cannot record audio. You can still import a recording.</p>`}
        <div class="actions"><label class="btn filebtn"><input type="file" id="rimport" accept="audio/*,video/mp4,video/webm" class="sr">Import a recording</label><span class="small">An audio file from your phone or the church sound desk, kept on this device with the sermon.</span></div></section>
      <section><h2>Recordings <span class="small">(${p.recordings.length})</span></h2>
        ${p.recordings.length ? `<ul class="reclist">${[...p.recordings].reverse().map(r => recCard(p, r, stored.has(r.id))).join("")}</ul>` : `<p class="small">No recordings yet. Record a rehearsal to check your timing, or record the sermon on the day.</p>`}</section>
      ${orphans.length ? `<section><h2>Audio not linked to a sermon</h2><p class="small">${orphans.length} ${orphans.length === 1 ? "recording is" : "recordings are"} stored on this device without a sermon (for example after storage filled up during recording).</p><button class="btn" type="button" id="rorph">Add ${orphans.length === 1 ? "it" : "them"} to this sermon</button></section>` : ""}
      <p class="small">Recordings stay in this browser's storage and are not part of the backup file: download any you want to keep. Planned length: ${p.target} minutes; the manuscript reads at about ${minutesAt(wordCount(p.manuscript))} minutes.</p></div>`;
    wire(g, draw);
    if (rec && rec.gid === g.id) {
      const tickEl = () => { const c = document.getElementById("rlclock"); if (!c) return clearInterval(liveT); c.textContent = fmt(rec ? rec.elapsed() : 0); };
      const liveT = setInterval(tickEl, 1000);
      body.querySelector("#rlpause")?.addEventListener("click", e => { const st = rec.pause(); e.currentTarget.textContent = st === "paused" ? "Resume" : "Pause"; });
      body.querySelector("#rlmark")?.addEventListener("click", () => rec.mark());
      body.querySelector("#rlstop")?.addEventListener("click", e => { e.currentTarget.disabled = true; rec.stop(); });
    }
    body.querySelector("#rorph")?.addEventListener("click", async () => {
      const q = A.loadPrep(g);
      for (const id of orphans) { const segs = await idb.segments(id).catch(() => []); q.recordings.push({ id, at: new Date(segs[0]?.at || Date.now()).toISOString(), name: "Recovered recording", mime: segs[0]?.blob?.type || "", dur: 0, kind: "sermon", segs: segs.length, complete: false, transcript: [], marks: [] }); }
      A.savePrep(q, { now: true }); draw();
    });
  };
  currentRedraw = draw;
  await draw();
}

function recCard(p, r, has) {
  const diff = r.dur ? Math.round(r.dur / 60 - p.target) : 0;
  const refs = [];
  const seen = new Set();
  for (const line of r.transcript) for (const x of sermonRefs(line.text, C.chapterCount)) { const k = `${x.book}.${x.chapter}.${x.verse}`; if (!seen.has(k)) { seen.add(k); refs.push({ t: line.t, ref: C.formatRef(x.book, x.chapter, x.verse, x.verseEnd), href: C.readUrl("kjv", x.book, x.chapter, x.verse) }); } }
  return `<li class="reccard" data-id="${esc(r.id)}">
    <div class="rchead"><b>${esc(r.name || (r.kind === "rehearsal" ? "Rehearsal" : "Sermon"))}</b> <span class="schip">${r.kind === "rehearsal" ? "Rehearsal" : "As preached"}</span> <span class="small">${esc(new Date(r.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }))} · ${fmt(r.dur)}${r.dur ? ` · ${diff === 0 ? "on time" : diff > 0 ? `${diff} min over the planned ${p.target}` : `${-diff} min under the planned ${p.target}`}` : ""}</span></div>
    ${has ? `<audio controls preload="none" data-audio></audio>` : `<p class="small missing">The audio is not on this device${r.complete ? "" : " (the recording was interrupted before any audio was saved)"}.</p>`}
    ${!r.complete && has ? `<p class="small">This recording was interrupted. Everything saved up to ${fmt(r.dur)} is here; use “Mark as complete” to keep it.</p>` : ""}
    ${r.marks.length ? `<p class="small marks"><b>Marks:</b> ${r.marks.map(m => `<button type="button" class="linkbtn" data-seek="${m.t}">${fmt(m.t)}${m.label ? " " + esc(m.label) : ""}</button>`).join(" · ")}</p>` : ""}
    ${refs.length ? `<p class="small"><b>Passages mentioned:</b> ${refs.map(x => `<button type="button" class="linkbtn" data-seek="${x.t}">${fmt(x.t)}</button> <a href="${x.href}">${esc(x.ref)}</a>`).join(" · ")}</p>` : ""}
    <details class="txed" ${r.transcript.length && r.transcript.length < 60 ? "" : ""}><summary>Transcript (${r.transcript.length} ${r.transcript.length === 1 ? "line" : "lines"})</summary>
      <ol class="txlines">${r.transcript.map((x, i) => `<li><button type="button" class="linkbtn tts" data-seek="${x.t}" aria-label="Play from ${fmt(x.t)}">${fmt(x.t)}</button><label class="sr" for="tx${esc(r.id)}${i}">Transcript line ${i + 1}</label><textarea id="tx${esc(r.id)}${i}" data-tx="${i}" rows="1">${esc(x.text)}</textarea><button type="button" class="ib" data-txdel="${i}" aria-label="Delete line">×</button></li>`).join("")}</ol>
      <div class="actions"><button type="button" class="btn small" data-txadd>Add a line at the current time</button><label class="btn small filebtn"><input type="file" data-tximp accept=".vtt,.srt,.txt,text/plain,text/vtt" class="sr">Import a transcript</label></div>
      <form class="txfix" data-fix><span class="small">Correct a name, term or reference everywhere:</span><label><span class="sr">Find</span><input data-from placeholder="Find, e.g. Habakuk"></label><label><span class="sr">Replace with</span><input data-to placeholder="Replace with, e.g. Habakkuk"></label><button class="btn small">Replace all</button></form></details>
    <div class="actions">${has ? `<button type="button" class="btn small" data-dl>Download the audio</button>` : ""}${r.transcript.length ? `<button type="button" class="btn small" data-dltx="vtt">Transcript (.vtt)</button><button type="button" class="btn small" data-dltx="txt">Transcript (.txt)</button>` : ""}
      ${!r.complete && has ? `<button type="button" class="btn small" data-complete>Mark as complete</button>` : ""}
      ${r.kind === "sermon" ? `<button type="button" class="btn small" data-preached>Keep the manuscript as preached</button>` : ""}
      <button type="button" class="btn small" data-rdel>Delete</button></div></li>`;
}

function wire(g, redraw) {
  const body = document.querySelector(".recordtab"); if (!body) return;
  const $ = s => body.querySelector(s);
  const upd = (id, fn) => { const q = A.loadPrep(g), r = q.recordings.find(x => x.id === id); if (!r) return null; fn(r, q); A.savePrep(q, { now: true }); return r; };
  // live recording
  $("#rstart")?.addEventListener("click", () => startRecording(g, redraw));
  // import
  $("#rimport")?.addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 400 * 1048576) return C.toast("That file is larger than 400 MB; trim it first.");
    const id = newRecId(), dur = await durationOf(f).catch(() => 0);
    try { await idb.putSegment(id, 0, f); } catch (err) { return C.toast(`Could not store it: ${err.message || "storage is full"}`); }
    const q = A.loadPrep(g); q.recordings.push({ id, at: new Date().toISOString(), name: f.name.replace(/\.[^.]+$/, ""), mime: f.type, dur, kind: "sermon", segs: 1, complete: true, transcript: [], marks: [] }); A.savePrep(q, { now: true }); redraw();
  });
  body.querySelectorAll(".reccard").forEach(li => {
    const id = li.dataset.id, audio = li.querySelector("[data-audio]");
    let url = null;
    const ensure = async () => { if (url || !audio) return; const r = A.loadPrep(g).recordings.find(x => x.id === id); const blob = await idb.recordingBlob(id, r?.mime); if (blob) { url = URL.createObjectURL(blob); audio.src = url; } };
    audio?.addEventListener("play", ensure, { once: true }); audio?.addEventListener("pointerdown", ensure, { once: true });
    if (audio) ensure();
    li.querySelectorAll("[data-seek]").forEach(b => b.addEventListener("click", async () => { if (!audio) return; await ensure(); audio.currentTime = +b.dataset.seek; audio.play().catch(() => {}); }));
    li.querySelectorAll("[data-tx]").forEach(ta => { const grow = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; }; requestAnimationFrame(grow); ta.addEventListener("input", () => { grow(); const q = A.loadPrep(g), r = q.recordings.find(x => x.id === id); if (r?.transcript[+ta.dataset.tx]) { r.transcript[+ta.dataset.tx].text = ta.value; A.savePrep(q); } }); });
    li.querySelectorAll("[data-txdel]").forEach(b => b.addEventListener("click", () => { upd(id, r => r.transcript.splice(+b.dataset.txdel, 1)); redraw(); }));
    li.querySelector("[data-txadd]")?.addEventListener("click", () => { const t = audio?.currentTime || 0; upd(id, r => { r.transcript.push({ t, text: "" }); r.transcript.sort((a, b) => a.t - b.t); }); redraw().then(() => document.querySelector(`.reccard[data-id="${id}"] details`)?.setAttribute("open", "")); });
    li.querySelector("[data-tximp]")?.addEventListener("change", async e => { const f = e.target.files[0]; if (!f) return; const lines = parseTranscript(await f.text()); if (!lines.length) return C.toast("No transcript lines found in that file"); upd(id, r => { r.transcript = lines.slice(0, 4000); }); C.toast(`${lines.length} lines imported`); redraw(); });
    li.querySelector("[data-fix]")?.addEventListener("submit", e => { e.preventDefault(); const from = li.querySelector("[data-from]").value, to = li.querySelector("[data-to]").value; if (!from) return; let n = 0; const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); upd(id, r => r.transcript.forEach(x => { x.text = x.text.replace(re, () => (n++, to)); })); C.toast(`${n} ${n === 1 ? "change" : "changes"} made`); redraw(); });
    li.querySelector("[data-dl]")?.addEventListener("click", async () => { const r = A.loadPrep(g).recordings.find(x => x.id === id), blob = await idb.recordingBlob(id, r?.mime); if (!blob) return C.toast("The audio is not on this device"); A.download(`${A.slug(sermonName(A.loadPrep(g)))}-${A.slug(r.name || r.kind)}.${/mp4|m4a|aac/.test(blob.type) ? "m4a" : /mpeg|mp3/.test(blob.type) ? "mp3" : /wav/.test(blob.type) ? "wav" : /ogg/.test(blob.type) ? "ogg" : "webm"}`, blob); });
    li.querySelectorAll("[data-dltx]").forEach(b => b.addEventListener("click", () => {
      const r = A.loadPrep(g).recordings.find(x => x.id === id), lines = r.transcript;
      const txt = b.dataset.dltx === "vtt" ? "WEBVTT\n\n" + lines.map((x, i) => `${i + 1}\n${vtt(x.t)} --> ${vtt(Math.max(x.t + 1, lines[i + 1]?.t ?? x.t + 5))}\n${x.text}\n`).join("\n") : lines.map(x => `[${fmt(x.t)}] ${x.text}`).join("\n");
      A.download(`${A.slug(sermonName(A.loadPrep(g)))}-transcript.${b.dataset.dltx}`, txt, b.dataset.dltx === "vtt" ? "text/vtt" : "text/plain");
    }));
    li.querySelector("[data-complete]")?.addEventListener("click", () => { upd(id, r => { r.complete = true; }); redraw(); });
    li.querySelector("[data-preached]")?.addEventListener("click", () => {
      const q = A.loadPrep(g), r = q.recordings.find(x => x.id === id); if (!r) return;
      const date = r.at.slice(0, 10);
      if (q.manuscript.length) q.versions.push({ at: new Date().toISOString(), label: `As preached on ${A.fmtDate(date)}`, idea: q.idea, manuscript: structuredClone(q.manuscript) });
      if (!q.preached.some(x => x.date === date)) q.preached.push({ date, where: q.venue || r.name || "" });
      q.status = "preached"; A.savePrep(q, { now: true }); C.toast("Saved: the manuscript is kept as a version, and the sermon is marked as preached"); redraw();
    });
    li.querySelector("[data-rdel]").addEventListener("click", async e => {
      const b = e.currentTarget; if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Select again to delete the audio and transcript"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Delete"; } }, 5000); return; }
      const q = A.loadPrep(g); q.recordings = q.recordings.filter(x => x.id !== id); A.savePrep(q, { now: true });
      if (!C.store.recordingInUse(id)) await idb.removeRecording(id).catch(() => {}); // another copy of this sermon may still use the audio
      if (url) URL.revokeObjectURL(url); redraw();
    });
  });
}
const durationOf = f => new Promise((res, rej) => { const a = new Audio(); a.preload = "metadata"; a.onloadedmetadata = () => { const d = a.duration; URL.revokeObjectURL(a.src); res(Number.isFinite(d) ? d : 0); }; a.onerror = rej; a.src = URL.createObjectURL(f); });

async function startRecording(g, redraw) {
  const $ = id => document.getElementById(id), stat = $("rstat");
  if (rec) return;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { stat.textContent = "The microphone could not be used. Allow microphone access for this site and try again."; return; }
  const id = newRecId(), mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find(t => MediaRecorder.isTypeSupported?.(t)) || "";
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : {});
  const q0 = A.loadPrep(g);
  q0.recordings.push({ id, at: new Date().toISOString(), name: $("rname").value.trim(), mime: mr.mimeType || mime, dur: 0, kind: $("rkind").value, segs: 0, complete: false, transcript: [], marks: [] });
  A.savePrep(q0, { now: true });
  let n = 0, t0 = Date.now(), pausedMs = 0, pauseAt = null, failed = false;
  const elapsed = () => ((pauseAt || Date.now()) - t0 - pausedMs) / 1000;
  const meta = fn => { const q = A.loadPrep(g), r = q.recordings.find(x => x.id === id); if (r) { fn(r); A.savePrep(q, { now: true }); } };
  mr.ondataavailable = async e => { if (!e.data?.size) return; const k = n++; try { await idb.putSegment(id, k, e.data); meta(r => { r.segs = n; r.dur = elapsed(); }); } catch (err) { failed = true; stat.textContent = "Storage is full: recording can't be saved on this device. Stop and download what you have."; } };
  // level meter
  let ac = null, raf = 0;
  try { ac = new AudioContext(); const an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.fftSize);
    const loop = () => { an.getByteTimeDomainData(buf); let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128)); const el = $("rlevel"); if (el) el.style.width = Math.min(100, peak / 1.28) + "%"; const c = $("rclock"); if (c) c.textContent = fmt(elapsed()); raf = requestAnimationFrame(loop); }; loop(); } catch { /* no meter */ }
  // optional live transcript
  let sr = null; const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if ($("rlive")?.checked && SR) {
    sr = new SR(); sr.continuous = true; sr.interimResults = true; sr.lang = navigator.language || "en-GB";
    const box = $("rlivetx"); box.hidden = false; let interim = "";
    sr.onresult = ev => { interim = ""; for (let k = ev.resultIndex; k < ev.results.length; k++) { const res = ev.results[k]; if (res.isFinal) { const text = res[0].transcript.trim(); if (text) meta(r => r.transcript.push({ t: Math.max(0, elapsed() - 3), text })); } else interim += res[0].transcript; } const r = A.loadPrep(g).recordings.find(x => x.id === id); box.innerHTML = `${(r?.transcript || []).slice(-4).map(x => `<p>${esc(x.text)}</p>`).join("")}${interim ? `<p class="interim">${esc(interim)}</p>` : ""}`; };
    sr.onend = () => { if (rec && !pauseAt) try { sr.start(); } catch {} };
    try { sr.start(); } catch { sr = null; }
  }
  rec = { mr, stream, sr, gid: g.id, elapsed: () => elapsed(), mark: () => { const t = elapsed(); meta(r => r.marks.push({ t, label: "" })); C.toast(`Marked ${fmt(t)}`); }, stop: () => { if (mr.state !== "inactive") mr.stop(); }, pause: () => { if (mr.state === "recording") { mr.pause(); pauseAt = Date.now(); sr?.stop(); } else if (mr.state === "paused") { mr.resume(); pausedMs += Date.now() - pauseAt; pauseAt = null; try { sr?.start(); } catch {} } return mr.state; } };
  mr.start(5000); rec.id = id; document.body.dataset.recording = "1";
  const lockP = navigator.wakeLock?.request("screen").catch(() => null);
  ["rstart"].forEach(k => $(k).disabled = true); ["rpause", "rmark", "rstop"].forEach(k => $(k).disabled = false);
  stat.textContent = "Recording. Audio is being saved every five seconds.";
  addEventListener("beforeunload", warn);
  $("rpause").addEventListener("click", e => {
    if (mr.state === "recording") { mr.pause(); pauseAt = Date.now(); sr?.stop(); e.currentTarget.textContent = "Resume"; stat.textContent = "Paused."; }
    else { mr.resume(); pausedMs += Date.now() - pauseAt; pauseAt = null; try { sr?.start(); } catch {} e.currentTarget.textContent = "Pause"; stat.textContent = "Recording."; }
  });
  $("rmark").addEventListener("click", () => { const t = elapsed(); meta(r => r.marks.push({ t, label: "" })); C.toast(`Marked ${fmt(t)}`); });
  mr.onstop = async () => {
    const end = elapsed();
    cancelAnimationFrame(raf); ac?.close?.(); stream.getTracks().forEach(t => t.stop()); try { sr?.stop(); } catch {} (await lockP)?.release?.().catch(() => {});
    removeEventListener("beforeunload", warn); removeEventListener("routechange", leave); rec = null;
    delete document.body.dataset.recording;
    setTimeout(() => { meta(r => { r.complete = !failed; r.dur = end; r.segs = n; }); currentRedraw?.(); C.toast("Recording saved with the sermon"); }, 400);
  };
  // Moving around this sermon (into the preaching view, say) keeps recording; leaving the sermon stops and saves it.
  const leave = () => setTimeout(() => { if (mr.state !== "inactive" && !location.pathname.startsWith(`/prepare/${g.id}`)) mr.stop(); }, 0);
  addEventListener("routechange", leave);
  $("rstop").addEventListener("click", () => { $("rstop").disabled = true; stat.textContent = "Saving…"; mr.stop(); });
}
function warn(e) { e.preventDefault(); e.returnValue = "A recording is in progress."; }
