// The Atlas: a full-screen map of the biblical world, built on the shared map engine (atlas-map.js) and the
// same data as the rest of Ereunia (Theographic places, people and events; journeys; discoveries; period layers).
// Routes: #/atlas, #/atlas/place/<slug>, #/atlas/journey/<id>, #/atlas/period/<id>, #/atlas/book/<OSIS>,
//         #/atlas/person/<slug>, #/atlas/q/<question>
import { mountMap } from "./atlas-map.js";
import { resolveQuery, PERSON_JOURNEYS } from "./atlas-query.js";

let A = null; // the mounted atlas (kept across sub-routes so the map does not reload)

export async function renderAtlas(ctx, sub = []) {
  const { view } = ctx;
  if (!A || !document.contains(A.root)) A = await mount(ctx);
  await A.go(sub);
}

async function mount(ctx) {
  const { view, H, esc, DISCOVERIES, JOURNEYS, NAMES, BOOKS, ERAS } = ctx;
  view.innerHTML = `<div class="atl" id="atl">
    <div class="atl-map" id="amap"><p class="loading">Opening the atlas…</p></div>
    <div class="atl-top">
      <form class="atl-search" id="asf" role="search"><label class="sr" for="aq">Search the atlas or ask a question</label>
        <input id="aq" type="search" placeholder="A place, person, journey, book or verse, or ask: Where did Paul preach?" autocomplete="off" enterkeyhint="search"><button type="submit">Go</button></form>
      <div class="atl-chips" role="toolbar" aria-label="Atlas tools">
        <button type="button" class="achip" data-open="journeys">Journeys</button>
        <button type="button" class="achip" data-open="periods">Periods</button>
        <label class="achip sel"><span class="sr">Filter by book</span><select id="abook"><option value="">Any book</option>${NAMES.map((n, i) => `<option value="${BOOKS[i].osis}">${esc(n)}</option>`).join("")}</select></label>
        <button type="button" class="achip" id="adisc" aria-pressed="true">◆ Discoveries</button>
        <button type="button" class="achip" id="aapprox" aria-pressed="true">Uncertain sites</button>
        <button type="button" class="achip" id="areset">Whole map</button>
      </div>
    </div>
    <aside class="atl-panel" id="apanel" aria-live="polite"><button type="button" class="atl-grab" id="agrab" aria-label="Expand or collapse the panel"></button><div class="atl-body" id="abody"></div></aside>
    <div class="atl-time" id="atime" role="group" aria-label="Periods"></div>
  </div>`;
  document.body.classList.add("atlasmode");
  const root = view.querySelector("#atl"), $ = s => root.querySelector(s), body = $("#abody");
  const [base, places, events, pm, lm] = await Promise.all([H.base(), H.places(), H.events(), H.peopleMap(), H.placeMap()]);
  const periodsData = await fetch("atlas/periods.json").then(r => (r.ok ? r.json() : null)).catch(() => null);
  const PERIODS = periodsData?.periods?.length ? periodsData.periods : ERAS.map(([name, a, b], i) => ({ id: `era${i}`, name, from: a === -Infinity ? -4000 : a, to: b === Infinity ? 100 : b, powers: [], summary: "" }));
  const evById = new Map(events.map(e => [e.id, e]));
  const drows = DISCOVERIES.filter(d => d.location).map(d => [`d:${d.id}`, d.name, d.location.lat, d.location.lon]);
  let showApprox = true, showDisc = true;
  const map = mountMap($("#amap"), {
    base, places, relief: true, regionLabels: true, fill: true,
    credit: periodsData?.credit ? "Period layers: historical-basemaps (GPL-3.0), Pleiades, Natural Earth; details in the panel." : "",
    onPick: s => { location.hash = s.startsWith("d:") ? `#/discoveries/${s.slice(2)}` : `#/atlas/place/${s}`; }
  });
  map.setDiscoveries(drows);

  // ---------- panel helpers ----------
  const sheet = $("#apanel");
  const open = (html, { expand = false } = {}) => { body.innerHTML = html; body.scrollTop = 0; sheet.classList.remove("min"); sheet.classList.toggle("open", expand); };
  // Phone sheet cycles: middle → full → minimised → middle.
  $("#agrab").addEventListener("click", () => { if (sheet.classList.contains("open")) { sheet.classList.remove("open"); sheet.classList.add("min"); } else if (sheet.classList.contains("min")) sheet.classList.remove("min"); else sheet.classList.add("open"); });
  const refLink = n => { const r = ctx.unpackRef(n); return `<a href="${ctx.readUrl("kjv", r.book, r.chapter, r.verse)}">${ctx.formatRef(r.book, r.chapter, r.verse)}</a>`; };
  const pname = s => esc(lm.get(s)?.[1] || s);
  const precision = cls => ctx.PRECISION[cls] ? `<span class="prec ${cls}" title="${esc(ctx.PRECISION[cls].note)}">${ctx.PRECISION[cls].label}</span>` : "";
  const placeList = (slugs, limit = 40) => `<div class="aplaces">${slugs.slice(0, limit).map(s => lm.get(s) ? `<a href="#/atlas/place/${s}"><b>${pname(s)}</b><span class="small">${esc(lm.get(s)[4] || "Place")} · ${lm.get(s)[6]} verse${lm.get(s)[6] === 1 ? "" : "s"}</span></a>` : "").join("")}</div>${slugs.length > limit ? `<p class="small">and ${slugs.length - limit} more on the map.</p>` : ""}`;
  const mapped = s => { const r = lm.get(s); return r && r[2] != null; };

  function welcome() {
    flyLonLat(12, 23, 50, 41.5, 900);
    map.highlight(null); map.setPeriod(null); map.route([]); setTime(null);
    open(`<span class="eyebrow">Atlas of the biblical world</span><h1>Where it happened</h1>
      <p>${places.filter(p => p[2] != null).length.toLocaleString()} places from Scripture on real terrain, with ${JOURNEYS.length} journeys, ${PERIODS.length} historical periods and ${drows.length} archaeological sites. Tap any marker, or try:</p>
      <div class="atry">${["Where did Abraham travel?", "Show me the places Jesus visited", "Where was Babylon?", "Where did Paul preach?", "Which events happened in Jerusalem?", "Places in Daniel", "Discoveries at Lachish"].map(q => `<a href="#/atlas/q/${encodeURIComponent(q)}">${esc(q)}</a>`).join("")}</div>
      <h3>How sure are the locations?</h3>
      <ul class="alegend"><li><i class="pm located"></i>${ctx.PRECISION.located.label}: ${esc(ctx.PRECISION.located.note)}</li><li><i class="pm approximate"></i>${ctx.PRECISION.approximate.label}: ${esc(ctx.PRECISION.approximate.note)}</li><li><i class="pm related"></i>${ctx.PRECISION.related.label}: ${esc(ctx.PRECISION.related.note)}</li><li><i class="dm"></i>Archaeological discovery with a documented excavation or find.</li></ul>
      <p class="small">Modern borders are not shown: ancient powers did not follow them. Period layers show approximate extents, and the panel for each period says what is debated.</p>
      <p class="small">Relief and base map: Natural Earth (public domain). Places, people and events: Theographic Bible Metadata (CC BY-SA 4.0) with OpenBible.info geodata.${periodsData?.credit ? ` Period layers: ${esc(periodsData.credit)}.` : ""}</p>`);
  }

  async function showPlace(slug) {
    const p = await H.place(slug); if (!p) return open(`<p class="empty">No place found.</p>`);
    const row = lm.get(slug);
    if (row?.[2] != null) map.flyTo(slug, p.type === "Region" ? 7 : p.type === "Water" || p.type === "Mountain" ? 14 : 26); else map.setFocus(null);
    map.highlight(new Set([slug]));
    const here = DISCOVERIES.filter(d => d.location && (d.location.placeSlug === slug || (p.lat != null && Math.hypot(d.location.lat - p.lat, d.location.lon - p.lon) < 0.06)));
    const photo = here.find(d => d.image?.local);
    const evs = p.events.map(i => evById.get(i)).filter(Boolean).sort((a, b) => a.sort - b.sort);
    const firstRef = p.verses[0] != null ? ctx.unpackRef(p.verses[0]) : null;
    const books = [...new Set(p.verses.map(n => Math.floor(n / 1e6)))];
    open(`${photo ? `<figure class="aphoto">${ctx.discImg(photo, { sizes: "380px" })}<figcaption>${esc(photo.name)}. ${ctx.discCredit(photo)}</figcaption></figure>` : ""}
      <span class="eyebrow">${esc([p.type, p.sub].filter(Boolean).join(" · ") || "Place")}</span><h1>${esc(p.name)}</h1>
      <div class="actions">${precision(p.cls)}</div>
      ${p.kjv && p.kjv !== p.name ? `<p class="small">KJV spelling: ${esc(p.kjv)}</p>` : ""}${p.other ? `<p class="small">Also called: ${esc(p.other)}</p>` : ""}
      ${p.comment ? `<p class="amodern"><b>Today:</b> ${esc(p.comment)}</p>` : ""}
      ${p.lat != null ? `<p class="small">${Math.abs(p.lat).toFixed(3)}°${p.lat >= 0 ? "N" : "S"}, ${Math.abs(p.lon).toFixed(3)}°${p.lon >= 0 ? "E" : "W"}. ${esc(ctx.PRECISION[p.cls]?.note || "")}</p>` : `<p class="small">This place cannot be located, so it is not on the map.</p>`}
      <div class="actions">${firstRef ? `<a class="btn pri" href="${ctx.readUrl("kjv", firstRef.book, firstRef.chapter, firstRef.verse)}">Read the first mention</a><a class="btn" href="#/lens/${ctx.toOsis(firstRef.book, firstRef.chapter, firstRef.verse)}/study">Scripture Lens</a>` : ""}<a class="btn" href="#/research/place/${slug}">Connections</a><a class="btn" href="#/place/${slug}">Full page</a></div>
      ${here.length ? `<h3>Archaeology here</h3>${ctx.discMini(here, "")}` : ""}
      ${evs.length ? `<h3>Events here</h3><ol class="aevents">${evs.map(e => `<li><span class="yr">${esc(ctx.yearText(e.year))}</span> ${esc(e.title)}${e.first ? ` · ${refLink(e.first)}` : ""}</li>`).join("")}</ol>` : ""}
      ${p.born.length || p.died.length ? `<h3>People</h3><p>${p.born.length ? `Born here: ${p.born.map(s => `<a href="#/person/${s}">${esc(pm.get(s)?.[1] || s)}</a>`).join(", ")}. ` : ""}${p.died.length ? `Died here: ${p.died.map(s => `<a href="#/person/${s}">${esc(pm.get(s)?.[1] || s)}</a>`).join(", ")}.` : ""}</p>` : ""}
      <h3>In the Bible</h3><p class="small">Named in ${p.verses.length} verse${p.verses.length === 1 ? "" : "s"} across ${books.length} book${books.length === 1 ? "" : "s"}: ${books.slice(0, 12).map(b => esc(NAMES[b])).join(", ")}${books.length > 12 ? "…" : ""}.</p>
      <div class="averses">${p.verses.slice(0, 8).map(n => `<p>${refLink(n)} <span class="tx" data-n="${n}">…</span></p>`).join("")}</div>
      ${p.verses.length > 8 ? `<a class="small" href="#/place/${slug}">All ${p.verses.length} verses ›</a>` : ""}
      ${p.dict ? `<details class="adict"><summary>Bible dictionary entry</summary><p>${esc(p.dict.slice(0, 1400))}${p.dict.length > 1400 ? "…" : ""}</p><p class="small">Easton's Bible Dictionary (1897), public domain, via Theographic. A 19th-century source: identifications may have changed since.</p></details>` : ""}`);
    body.querySelectorAll(".averses .tx").forEach(async el => { const r = ctx.unpackRef(+el.dataset.n); el.textContent = await ctx.verseText("kjv", ctx.toOsis(r.book, r.chapter, r.verse)).catch(() => ""); });
  }

  let jt = null;
  function showJourney(id) {
    const j = JOURNEYS.find(x => x.id === id); if (!j) return welcome();
    const slugs = j.stops.map(s => s[0]).filter(mapped);
    map.highlight(new Set(slugs)); map.setPeriod(null);
    const svgRoute = () => { root.querySelector(".atl-map .route")?.style.setProperty("--c", j.colour); map.route(slugs); };
    map.flyFit(slugs, 900); setTimeout(svgRoute, 950);
    open(`<span class="eyebrow">Journey · ${esc(j.range)}</span><h1>${esc(j.title)}</h1><p class="small">${esc(j.when)}</p>
      ${j.note ? `<div class="textnote"><b>How sure is this?</b><br>${esc(j.note)}</div>` : ""}
      <div class="actions"><button class="btn pri" type="button" id="aplay">Play the journey</button><span class="small" id="astep"></span></div>
      <ol class="jstops" style="--c:${j.colour}">${j.stops.map(([s, o, what], i) => { const r = ctx.fromOsis(o); return `<li data-i="${i}"><button type="button" class="jstop" data-i="${i}"><b>${pname(s)}</b><span>${esc(what)}</span></button><a href="${ctx.readUrl("kjv", r.book, r.chapter, r.verse)}">${ctx.labelOf(o)}</a></li>`; }).join("")}</ol>
      <p class="small">Lines join the stops in order. They do not show the actual road or sea lane, which the Bible rarely records.</p>
      <h3>Other journeys</h3><div class="ajourneys">${JOURNEYS.filter(x => x.id !== j.id).map(x => `<a href="#/atlas/journey/${x.id}" style="--c:${x.colour}">${esc(x.title)}</a>`).join("")}</div>`);
    const items = [...body.querySelectorAll(".jstops li")];
    const show = i => { items.forEach((li, k) => li.classList.toggle("on", k === i)); items[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" }); const s = j.stops[i][0]; if (mapped(s)) { map.mark(s); map.flyTo(s, 7, 700); } $("#astep") && ($("#astep").textContent = `Stop ${i + 1} of ${j.stops.length}`); };
    body.querySelectorAll(".jstop").forEach(b => b.addEventListener("click", () => { stopPlay(); show(+b.dataset.i); }));
    const stopPlay = () => { clearInterval(jt); jt = null; const b = body.querySelector("#aplay"); if (b) b.textContent = "Play the journey"; };
    body.querySelector("#aplay").addEventListener("click", () => {
      if (jt) return stopPlay();
      let i = 0; show(0); body.querySelector("#aplay").textContent = "Pause";
      jt = setInterval(() => { i++; if (i >= j.stops.length || !document.contains(root)) { stopPlay(); map.flyFit(slugs, 900); return; } show(i); }, 2600);
    });
  }

  function showPeriod(id) {
    const per = PERIODS.find(p => p.id === id); if (!per) return welcome();
    setTime(id); map.route([]);
    map.setPeriod(per.powers?.length ? per : null);
    const evs = events.filter(e => e.sort >= per.from && e.sort < per.to);
    const slugs = [...new Set(evs.flatMap(e => e.places))].filter(mapped);
    map.highlight(new Set(slugs));
    const pts = (per.powers || []).flatMap(pw => pw.polygon || (pw.label ? [pw.label] : []));
    if (pts.length) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); flyLonLat(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)); } else if (slugs.length) map.flyFit(slugs, 900);
    const evRows = evs.sort((a, b) => a.sort - b.sort);
    open(`<span class="eyebrow">Period · ${esc(per.range || `${ctx.yearText(per.from)} – ${ctx.yearText(per.to)}`)}</span><h1>${esc(per.name)}</h1>
      ${per.summary ? `<p>${esc(per.summary)}</p>` : ""}
      ${per.debate ? `<div class="textnote"><b>Debated</b><br>${esc(per.debate)}</div>` : ""}
      ${(per.powers || []).length ? `<h3>Powers on the map</h3><ul class="apowers">${per.powers.map(pw => `<li><i style="--pc:${pw.colour}" class="${esc(pw.precision || "")}"></i><div><b>${esc(pw.name)}</b>${pw.capital ? ` · capital ${esc(pw.capital.name)}` : ""}<span class="small">${esc(pw.note || "")}${pw.precision === "schematic" ? " Drawn schematically: the shape follows natural limits named in the sources, not a surveyed border." : pw.precision === "approximate" ? " Approximate extent." : ""}</span></div></li>`).join("")}</ul>` : `<p class="small">Period boundaries are being researched; for now this shows the places of the events dated to this period.</p>`}
      ${(per.passages || []).length ? `<h3>Read</h3><p>${per.passages.map(r => `<a href="${ctx.rangeHref(r)}">${esc(ctx.rangeLabel(r))}</a>`).join(" · ")}</p>` : ""}
      ${evRows.length ? `<h3>${evRows.length} dated event${evRows.length === 1 ? "" : "s"}</h3><ol class="aevents">${evRows.slice(0, 40).map(e => `<li><span class="yr">${esc(ctx.yearText(e.year))}</span> ${esc(e.title)}${e.places[0] && mapped(e.places[0]) ? ` · <a href="#/atlas/place/${e.places[0]}">${pname(e.places[0])}</a>` : ""}</li>`).join("")}</ol><p class="small">Event dates follow the Theographic dataset's traditional chronology; see the timeline for how firm each date is.</p>` : ""}
      ${(per.sources || []).length ? `<h3>Sources</h3><ol class="dsrc">${per.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a> <span class="small">${esc(s.publisher)} · opens in a new tab</span></li>`).join("")}</ol>` : ""}`);
  }
  const flyLonLat = (lo0, la0, lo1, la1, ms = 1000) => { const [x0, y1] = ctx.project(lo0, la0), [x1, y0] = ctx.project(lo1, la1); map.flyFitBox(x0, y0, x1, y1, ms); };
  // Keep framing clear of the search bar, the panel and the period strip.
  const setInsets = () => {
    const box = root.getBoundingClientRect(), phone = innerWidth <= 720, top = $(".atl-top").getBoundingClientRect().bottom - box.top + 8;
    map.setInsets(phone ? { top, bottom: box.bottom - sheet.getBoundingClientRect().top + 8 } : { top, right: box.right - sheet.getBoundingClientRect().left + 8, bottom: box.bottom - $("#atime").getBoundingClientRect().top + 8 });
  };
  setInsets(); addEventListener("resize", setInsets);
  new MutationObserver(() => setTimeout(setInsets, 320)).observe(sheet, { attributes: true, attributeFilter: ["class"] });

  async function placesForVerses(nums) {
    const byBook = new Map(); nums.forEach(n => { const b = Math.floor(n / 1e6); if (!byBook.has(b)) byBook.set(b, []); byBook.get(b).push(n); });
    const count = new Map();
    for (const [b, ns] of byBook) { const vx = await H.vx(b); for (const n of ns) for (const s of vx[n]?.[1] || []) count.set(s, (count.get(s) || 0) + 1); }
    return [...count].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }
  async function showBook(osis) {
    const b = BOOKS.findIndex(x => x.osis === osis); if (b < 0) return welcome();
    $("#abook").value = osis; map.setPeriod(null); map.route([]);
    const vx = await H.vx(b), count = new Map();
    Object.values(vx).forEach(v => (v[1] || []).forEach(s => count.set(s, (count.get(s) || 0) + 1)));
    const slugs = [...count].sort((a, b) => b[1] - a[1]).map(([s]) => s), on = slugs.filter(mapped);
    map.highlight(new Set(on)); map.flyFit(on.slice(0, 60), 900);
    open(`<span class="eyebrow">Book</span><h1>Places in ${esc(NAMES[b])}</h1><p>${slugs.length} places are named in ${esc(NAMES[b])}; ${on.length} can be mapped. Most-mentioned first.</p>
      ${placeList(slugs.filter(mapped), 60)}<div class="actions"><a class="btn" href="#/read/kjv/${osis}.1">Read ${esc(NAMES[b])}</a><a class="btn" href="#/atlas">Clear</a></div>`);
  }
  async function showPerson(slug) {
    const p = await H.person(slug); if (!p) return welcome();
    map.setPeriod(null); map.route([]);
    const evs = (p.events || []).map(i => evById.get(i)).filter(Boolean);
    const fromEvents = evs.flatMap(e => e.places);
    const co = await placesForVerses(p.verses.slice(0, 400));
    const slugs = [...new Set([p.bornAt, p.diedAt, ...fromEvents, ...co].filter(Boolean))].filter(mapped);
    const js = (PERSON_JOURNEYS[slug] || []).map(id => JOURNEYS.find(j => j.id === id)).filter(Boolean);
    map.highlight(new Set(slugs)); map.flyFit(slugs.slice(0, 40), 900);
    open(`<span class="eyebrow">Person</span><h1>${esc(p.name)}</h1><p class="small">${esc(p.desc || "")}</p>
      ${js.length ? `<h3>Journeys</h3><div class="ajourneys">${js.map(j => `<a href="#/atlas/journey/${j.id}" style="--c:${j.colour}">${esc(j.title)}</a>`).join("")}</div>` : ""}
      ${evs.length ? `<h3>Events</h3><ol class="aevents">${evs.sort((a, b) => a.sort - b.sort).map(e => `<li><span class="yr">${esc(ctx.yearText(e.year))}</span> ${esc(e.title)}${e.places[0] && mapped(e.places[0]) ? ` · <a href="#/atlas/place/${e.places[0]}">${pname(e.places[0])}</a>` : ""}</li>`).join("")}</ol>` : ""}
      <h3>Places connected with ${esc(p.name)}</h3><p class="small">From dated events, birth and death places, and places named in the same verses as ${esc(p.name)}.</p>${placeList(slugs, 30)}
      <div class="actions"><a class="btn" href="#/person/${slug}">Full page</a><a class="btn" href="#/research/person/${slug}">Connections</a></div>`);
  }

  async function ask(q) {
    $("#aq").value = q;
    const r = resolveQuery(q, { people: [...pm.values()], places, journeys: JOURNEYS, names: NAMES, books: BOOKS, discoveries: DISCOVERIES, periods: PERIODS, parseRef: ctx.parseRef });
    if (r.type === "place") return r.focus === "discoveries" ? showPlace(r.slug).then(() => body.querySelector("h3")?.scrollIntoView({ block: "start" })) : showPlace(r.slug);
    if (r.type === "journey") return showJourney(r.id);
    if (r.type === "person") return showPerson(r.slug);
    if (r.type === "book") return showBook(r.osis);
    if (r.type === "period") return showPeriod(r.id);
    if (r.type === "discovery") { location.hash = `#/discoveries/${r.id}`; return; }
    if (r.type === "passage") {
      const nums = []; for (let v = r.ref.verse || 1; v <= (r.ref.verseEnd || r.ref.verse || 200); v++) nums.push(r.ref.book * 1e6 + r.ref.chapter * 1e3 + v);
      const slugs = (await placesForVerses(nums)).filter(mapped);
      map.setPeriod(null); map.route([]); map.highlight(new Set(slugs)); if (slugs.length) map.flyFit(slugs, 900);
      return open(`<span class="eyebrow">Passage</span><h1>${esc(ctx.formatRef(r.ref.book, r.ref.chapter, r.ref.verse, r.ref.verseEnd))}</h1>${slugs.length ? `<p>${slugs.length} mapped place${slugs.length === 1 ? "" : "s"} in this passage.</p>${placeList(slugs)}` : `<p>No mappable places are named in this passage.</p>`}<div class="actions"><a class="btn" href="${ctx.readUrl("kjv", r.ref.book, r.ref.chapter, r.ref.verse)}">Read it</a></div>`);
    }
    // Anything else: the AI research assistant, answering only from cited sources; the map shows the places in those sources.
    open(`<span class="eyebrow">Ask the atlas</span><h1>${esc(q)}</h1><p class="loading">Searching the sources…</p>`);
    try {
      const res = await fetch("api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, level: "intermediate" }) });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const nums = (data.sources || []).map(s => ctx.parseRef(s.label.replace(/\s*\(.*$/, ""))).filter(Boolean).map(x => x.book * 1e6 + x.chapter * 1e3 + (x.verse || 1));
      const text = Object.values(data.sections || {}).flat().map(x => x.text).join(" ");
      const named = places.filter(p => p[2] != null && p[6] >= 3 && new RegExp(`\\b${p[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text)).map(p => p[0]);
      const slugs = [...new Set([...named, ...(await placesForVerses(nums))])].filter(mapped);
      map.setPeriod(null); map.route([]); map.highlight(new Set(slugs)); if (slugs.length) map.flyFit(slugs, 900);
      const secs = ctx.SECTIONS.filter(([k]) => data.sections?.[k]?.length);
      open(`<span class="eyebrow">Ask the atlas · AI answer from cited sources</span><h1>${esc(q)}</h1>
        ${secs.map(([k, l]) => `<h3>${l}</h3><ul class="aai">${data.sections[k].map(x => `<li>${esc(x.text)} ${x.cites.map(c => `<sup title="${esc((data.sources.find(s => s.id === c) || {}).label || "")}">${c}</sup>`).join("")}</li>`).join("")}</ul>`).join("") || `<p>No answer survived the source check. Try naming a place, person or passage.</p>`}
        ${slugs.length ? `<h3>On the map</h3>${placeList(slugs, 20)}` : ""}
        <details><summary>Sources (${(data.sources || []).length})</summary><ol class="small">${(data.sources || []).map(s => `<li><b>${s.id}</b> ${esc(s.label)}</li>`).join("")}</ol></details>
        <p class="small">Written by AI from the numbered sources only; statements that failed the citation check were removed. Check the passages yourself.</p>`);
    } catch {
      open(`<span class="eyebrow">Ask the atlas</span><h1>${esc(q)}</h1><p>The AI assistant is not available right now. Try a place, person, journey, book or verse, for example <a href="#/atlas/q/Jerusalem">Jerusalem</a> or <a href="#/atlas/q/Paul">Paul</a>.</p>`);
    }
  }

  // ---------- period strip ----------
  const time = $("#atime");
  time.innerHTML = `<span class="atl-tlabel">Periods</span>${PERIODS.map(p => `<a href="#/atlas/period/${p.id}" data-p="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.range || ctx.yearText(p.from))}</span></a>`).join("")}`;
  function setTime(id) { time.querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.p === id)); time.querySelector(".on")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }

  // ---------- controls ----------
  $("#asf").addEventListener("submit", e => { e.preventDefault(); const q = $("#aq").value.trim(); if (q) location.hash = `#/atlas/q/${encodeURIComponent(q)}`; });
  $("#abook").addEventListener("change", e => { location.hash = e.target.value ? `#/atlas/book/${e.target.value}` : "#/atlas"; });
  $("#adisc").addEventListener("click", e => { showDisc = !showDisc; e.currentTarget.setAttribute("aria-pressed", showDisc); map.setDiscoveries(showDisc ? drows : []); });
  $("#aapprox").addEventListener("click", e => { showApprox = !showApprox; e.currentTarget.setAttribute("aria-pressed", showApprox); map.setPlaces(showApprox ? places : places.filter(p => p[5] === "located" || p[4] === "Region" || p[4] === "Water")); });
  $("#areset").addEventListener("click", () => { location.hash = "#/atlas"; map.flyBox({ x: 0, y: 0, w: ctx.MAP_SIZE[0], h: ctx.MAP_SIZE[1] }, 800); });
  root.querySelector('[data-open="journeys"]').addEventListener("click", () => open(`<span class="eyebrow">Journeys</span><h1>Follow a journey</h1><div class="ajourneys big">${JOURNEYS.map(j => `<a href="#/atlas/journey/${j.id}" style="--c:${j.colour}"><b>${esc(j.title)}</b><span>${esc(j.range)}</span></a>`).join("")}</div>`, { expand: true }));
  root.querySelector('[data-open="periods"]').addEventListener("click", () => open(`<span class="eyebrow">Periods</span><h1>Travel through time</h1><div class="ajourneys big">${PERIODS.map(p => `<a href="#/atlas/period/${p.id}"><b>${esc(p.name)}</b><span>${esc(p.range || ctx.yearText(p.from))}</span></a>`).join("")}</div>`, { expand: true }));
  addEventListener("hashchange", function leave() { if (!location.hash.startsWith("#/atlas")) { document.body.classList.remove("atlasmode"); clearInterval(jt); removeEventListener("hashchange", leave); } });

  return {
    root,
    async go([kind, ...rest]) {
      clearInterval(jt); jt = null;
      const arg = rest.join("/");
      if (kind === "place") return showPlace(arg);
      if (kind === "journey") return showJourney(arg);
      if (kind === "period") return showPeriod(arg);
      if (kind === "book") return showBook(arg);
      if (kind === "person") return showPerson(arg);
      if (kind === "q") return ask(decodeURIComponent(arg));
      $("#abook").value = ""; welcome();
    }
  };
}
