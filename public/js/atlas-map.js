// Interactive SVG map of the biblical world: Natural Earth base map + Theographic/OpenBible places.
// Pan by dragging, zoom with the wheel, pinch or the buttons. No tile server, no third-party script.
import { project, MAP_SIZE } from "./history.js";

const NS = "http://www.w3.org/2000/svg";
const ringPath = ring => ring.map(([lon, lat], i) => { const [x, y] = project(lon, lat); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join("");

/**
 * mount(el, { base, places, focus, onPick, height })
 * places: index rows [slug, name, lat, lon, type, cls, verseCount]
 */
export function mountMap(el, { base, places, focus = null, onPick = () => {}, showApprox = true, only = null, relief = false, regionLabels = false, credit = "", fill = false }) {
  const [W, H] = MAP_SIZE;
  el.innerHTML = `<div class="mapwrap${relief ? " relief" : ""}"><svg class="atlas" viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of the biblical world">
    <rect class="sea" x="-2000" y="-2000" width="${W + 4000}" height="${H + 4000}"/>
    ${relief ? `<image class="reliefimg" href="atlas/relief-lo.webp" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>` : ""}
    <g class="land"><path d="${base.land.map(r => ringPath(r) + "Z").join("")}"/></g>
    <g class="lakes"><path d="${base.lakes.map(r => ringPath(r) + "Z").join("")}"/></g>
    <g class="rivers"><path d="${base.rivers.map(ringPath).join("")}"/></g>
    <g class="periods"></g><g class="rlabels"></g><g class="route"></g><g class="marks"></g><g class="dmarks"></g><g class="labels"></g></svg>
    <div class="mapctl"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="reset" aria-label="Show the whole map">⤢</button></div>
    <p class="mapcredit">${relief ? "Relief and base map" : "Base map"}: Natural Earth. Places: Theographic / OpenBible.info.${credit ? " " + credit : ""}</p></div>`;
  const svg = el.querySelector("svg"), marks = el.querySelector(".marks"), labels = el.querySelector(".labels");
  let vb = { x: 0, y: 0, w: W, h: H };
  const isRegion = p => regionLabels && (p[4] === "Region" || p[4] === "Water");
  let hot = null; // Set of slugs to emphasise, or null
  let visible = places.filter(p => p[2] != null && (showApprox || p[5] === "located") && (!only || only.has(p[0])));
  const pts = new Map(visible.map(p => [p[0], project(p[3], p[2])]));
  let drows = [], dpts = new Map(), insets = { top: 0, right: 0, bottom: 0, left: 0 };

  const reliefImg = el.querySelector(".reliefimg");
  const pickRelief = () => { if (!reliefImg) return; const s = W / vb.w, want = s >= 2.2 ? "hi" : s >= 1.1 ? "md" : "lo"; const href = `atlas/relief-${want}.webp`; if (reliefImg.getAttribute("href") !== href) reliefImg.setAttribute("href", href); };
  // fill: the map fills its box (any shape); the view keeps the box's aspect so nothing is stretched or letterboxed.
  const fixAspect = v => { if (!fill) return v; const b = svg.getBoundingClientRect(); if (!b.width || !b.height) return v; const h = v.w * b.height / b.width, cy = v.y + v.h / 2; return { x: v.x, y: cy - h / 2, w: v.w, h }; };
  // In fill mode the view never shows more than the relief covers, and never drifts off it.
  const constrain = v => {
    if (!fill) return v;
    const b = svg.getBoundingClientRect(); if (!b.width || !b.height) return v;
    const maxW = Math.min(W * 1.02, H * 1.06 * b.width / b.height);
    let { x, y, w, h } = v;
    if (w > maxW) { const cx = x + w / 2, cy = y + h / 2; h = h * maxW / w; w = maxW; x = cx - w / 2; y = cy - h / 2; }
    const cl = (a, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(a, lo), hi));
    return { x: cl(x, -W * 0.01, W * 1.01 - w), y: cl(y, -H * 0.03, H * 1.03 - h), w, h };
  };
  const apply = () => { vb = constrain(fixAspect(vb)); svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); pickRelief(); draw(); };
  if (fill && "ResizeObserver" in window) new ResizeObserver(() => apply()).observe(svg);
  const scale = () => W / vb.w;
  function draw() {
    const s = scale();
    // u = map units per screen pixel. Full-screen maps size marks and labels in screen pixels; small maps keep their old sizing.
    const u = fill ? vb.w / (svg.clientWidth || W) : 1 / s;
    const r = fill ? 4.2 * u : 2.6 / s, show = fill ? Math.round((svg.clientWidth * svg.clientHeight) / 12000) : Math.round(28 * s);
    marks.innerHTML = ""; labels.innerHTML = "";
    svg.style.setProperty("--s", (fill ? 1 / u : s).toFixed(4));
    const dm = el.querySelector(".dmarks"); dm.innerHTML = "";
    for (const [id, name] of drows) {
      const [x, y] = dpts.get(id); const k = fill ? 7 * u : 3.4 / s;
      const g = document.createElementNS(NS, "path");
      g.setAttribute("d", `M${x} ${y - k}L${x + k} ${y}L${x} ${y + k}L${x - k} ${y}Z`);
      g.setAttribute("class", `dm${hot ? (hot.has(id) ? " hot" : " dim") : ""}`); g.setAttribute("data-slug", id); g.setAttribute("tabindex", "0");
      g.setAttribute("aria-label", `${name}, archaeological discovery`);
      const t = document.createElementNS(NS, "title"); t.textContent = `${name} (discovery)`; g.appendChild(t); dm.appendChild(g);
    }
    const placed = [];
    const fits = (x, y, w, h) => { for (const b of placed) if (x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1]) return false; return true; };
    const rl = el.querySelector(".rlabels"); if (rl) rl.innerHTML = "";
    const pts0 = visible.filter(p => !isRegion(p));
    const rank = p => (p[0] === focus ? 2 : 0) + (hot && hot.has(p[0]) ? 1 : 0);
    const order = focus || hot ? pts0.slice().sort((a, b) => rank(b) - rank(a)) : pts0;
    // Regions, seas and rivers: italic labels without a dot, biggest names first.
    if (regionLabels) {
      const regs = visible.filter(isRegion).filter(p => !hot || hot.has(p[0]) || p[6] > 40).sort((a, b) => b[6] - a[6]).slice(0, fill ? 14 : Math.round(8 * s));
      for (const p of regs) {
        const [x, y] = pts.get(p[0]); if (x < vb.x || x > vb.x + vb.w || y < vb.y || y > vb.y + vb.h) continue;
        const fs = Math.min(15, 9 + Math.log10(1 + p[6]) * 2) * (fill ? u : 1 / s), w = p[1].length * fs * 0.62;
        if (!fits(x - w / 2, y - fs, w, fs * 1.3)) continue;
        placed.push([x - w / 2, y - fs, w, fs * 1.3]);
        const t = document.createElementNS(NS, "text"); t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("font-size", fs.toFixed(2));
        t.setAttribute("class", `rl ${p[4] === "Water" ? "water" : "region"}${hot && hot.has(p[0]) ? " hot" : ""}`); t.setAttribute("data-slug", p[0]); t.setAttribute("text-anchor", "middle");
        t.textContent = p[1]; rl.appendChild(t);
      }
    }
    let labelled = 0;
    order.forEach(p => {
      const [x, y] = pts.get(p[0]);
      if (x < vb.x - 10 || x > vb.x + vb.w + 10 || y < vb.y - 10 || y > vb.y + vb.h + 10) return;
      const c = document.createElementNS(NS, "circle");
      const big = fill ? Math.min(1.5, .8 + Math.log10(1 + p[6]) / 4) : Math.min(2.2, 1 + Math.log10(1 + p[6]) / 2.2);
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", (r * big).toFixed(2));
      c.setAttribute("class", `pm ${p[5]}${focus === p[0] ? " focus" : ""}${hot ? (hot.has(p[0]) ? " hot" : " dim") : ""}`);
      c.setAttribute("data-slug", p[0]); c.setAttribute("tabindex", "0");
      c.setAttribute("aria-label", `${p[1]}, ${p[5] === "located" ? "identified site" : "approximate location"}`);
      const t = document.createElementNS(NS, "title"); t.textContent = p[1]; c.appendChild(t);
      marks.appendChild(c);
      if (hot && !hot.has(p[0]) && focus !== p[0]) return;
      if (labelled >= show && focus !== p[0]) return;
      const fs = fill ? 12.5 * u : 11 / s, w = p[1].length * fs * 0.56, h = fs * 1.2, lx = x + r * 2.2, ly = y + r * 1.1;
      if (!fits(lx - fs * 0.2, ly - fs, w + fs * 0.4, h) && focus !== p[0]) return;
      placed.push([lx - fs * 0.2, ly - fs, w + fs * 0.4, h]); labelled++;
      const l = document.createElementNS(NS, "text");
      l.setAttribute("x", lx); l.setAttribute("y", ly);
      l.setAttribute("font-size", fs.toFixed(2));
      l.setAttribute("class", focus === p[0] ? "focus" : "");
      l.textContent = p[1]; labels.appendChild(l);
    });
  }
  function zoomAt(f, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2) {
    const nw = Math.min(W * 1.2, Math.max(W / 40, vb.w / f));
    const k = nw / vb.w;
    vb = { x: cx - (cx - vb.x) * k, y: cy - (cy - vb.y) * k, w: nw, h: vb.h * k };
    apply();
  }
  const toSvg = (clientX, clientY) => { const b = svg.getBoundingClientRect(); return [vb.x + (clientX - b.left) / b.width * vb.w, vb.y + (clientY - b.top) / b.height * vb.h]; };

  svg.addEventListener("wheel", e => { e.preventDefault(); const [x, y] = toSvg(e.clientX, e.clientY); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, x, y); }, { passive: false });
  const ptrs = new Map(); let last = null, moved = false, pinch = null;
  svg.addEventListener("pointerdown", e => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); svg.setPointerCapture(e.pointerId); last = [e.clientX, e.clientY]; moved = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  svg.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const [x, y] = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); zoomAt(d / pinch, x, y); pinch = d; moved = true; return;
    }
    const b = svg.getBoundingClientRect();
    const dx = (e.clientX - last[0]) / b.width * vb.w, dy = (e.clientY - last[1]) / b.height * vb.h;
    if (Math.abs(e.clientX - last[0]) + Math.abs(e.clientY - last[1]) > 2) moved = true;
    vb.x -= dx; vb.y -= dy; last = [e.clientX, e.clientY];
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (moved) apply(); };
  svg.addEventListener("pointerup", e => {
    const target = e.target.closest?.(".pm, .rl, .dm");
    up(e);
    if (!moved && target) onPick(target.dataset.slug);
  });
  svg.addEventListener("pointercancel", up);
  svg.addEventListener("keydown", e => { const t = e.target.closest?.(".pm, .dm"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(t.dataset.slug); } });
  el.querySelector(".mapctl").addEventListener("click", e => {
    const z = e.target.closest("[data-z]")?.dataset.z;
    if (z === "in") zoomAt(1.6); else if (z === "out") zoomAt(0.625); else if (z === "reset") { vb = { x: 0, y: 0, w: W, h: H }; apply(); }
  });

  const api = {
    focusOn(slug, zoom = 6) {
      focus = slug; const p = pts.get(slug);
      if (!p) { apply(); return; }
      const w = W / zoom, h = H / zoom; vb = { x: p[0] - w / 2, y: p[1] - h / 2, w, h }; apply();
    },
    setFilter(showA, onlySet) {
      visible = places.filter(p => p[2] != null && (showA || p[5] === "located") && (!onlySet || onlySet.has(p[0])));
      visible.forEach(p => { if (!pts.has(p[0])) pts.set(p[0], project(p[3], p[2])); });
      draw();
    },
    /** Draw a journey through the given places in order; returns the stops' map points. */
    route(slugs, { animate = true } = {}) {
      const g = el.querySelector(".route");
      const P = slugs.map(s => pts.get(s)).filter(Boolean);
      if (P.length < 2) { g.innerHTML = ""; return P; }
      // gently curved legs: each a quadratic bend to one side, proportional to its length
      const d = P.map((p, i) => { if (!i) return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`; const q = P[i - 1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = p[0] - q[0], dy = p[1] - q[1]; return `Q${(mx - dy * 0.12).toFixed(1)} ${(my + dx * 0.12).toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }).join(" ");
      // pathLength="1" keeps the draw-on animation exact at any zoom; width is set in CSS from --s.
      g.innerHTML = `<path class="routeline${animate ? " anim" : ""}" d="${d}" pathLength="1" style="--len:1"/>`;
      return P;
    },
    /** Highlight one stop of a route. */
    mark(slug) {
      const g = el.querySelector(".route"); g.querySelector(".here")?.remove();
      const p = pts.get(slug); if (!p) return;
      const c = document.createElementNS(NS, "circle"); c.setAttribute("class", "here"); c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", (fill ? 9 * vb.w / (svg.clientWidth || W) : 5.5 / scale()).toFixed(2)); c.setAttribute("vector-effect", "non-scaling-stroke"); g.appendChild(c);
    },
    /** Animate the view to a box {x, y, w, h} in map units. */
    flyBox(to, ms = 900) {
      to = constrain(fixAspect(to));
      const from = { ...vb }, t0 = performance.now(), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || ms <= 0) { vb = to; apply(); return; }
      const lw0 = Math.log(from.w), lw1 = Math.log(to.w), ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      cancelAnimationFrame(api._raf);
      const step = now => {
        const k = ease(Math.min(1, (now - t0) / ms)), w = Math.exp(lw0 + (lw1 - lw0) * k), h = w * H / W;
        const cx = from.x + from.w / 2 + (to.x + to.w / 2 - from.x - from.w / 2) * k, cy = from.y + from.h / 2 + (to.y + to.h / 2 - from.y - from.h / 2) * k;
        vb = fixAspect({ x: cx - w / 2, y: cy - h / 2, w, h });
        svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
        if (k < 1) api._raf = requestAnimationFrame(step); else apply();
      };
      api._raf = requestAnimationFrame(step);
    },
    /** Screen areas covered by panels, in px: { top, right, bottom, left }. Framing keeps content in the free area. */
    setInsets(v) { insets = { top: 0, right: 0, bottom: 0, left: 0, ...v }; },
    /** Glide so that the map-unit box [x0, y0, x1, y1] fills the free area. */
    flyFitBox(x0, y0, x1, y1, ms, minW = W / 24) {
      const b = svg.getBoundingClientRect(), bw = b.width || W, bh = b.height || H;
      const fw = Math.max(80, bw - insets.left - insets.right), fh = Math.max(80, bh - insets.top - insets.bottom);
      const u = Math.min(W * 1.2 / bw, Math.max((x1 - x0) / fw, (y1 - y0) / fh, minW / bw));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      api.flyBox({ x: cx - (insets.left + fw / 2) * u, y: cy - (insets.top + fh / 2) * u, w: bw * u, h: bh * u }, ms);
    },
    /** Glide to one place. zoom = how many times closer than the whole map. */
    flyTo(slug, zoom = 8, ms) {
      focus = slug; const p = pts.get(slug) || dpts.get(slug); if (!p) { apply(); return; }
      const half = W / zoom / 2; api.flyFitBox(p[0] - half, p[1] - half * H / W, p[0] + half, p[1] + half * H / W, ms, 0);
    },
    /** Glide to fit a set of slugs (places or discovery markers). */
    flyFit(slugs, ms, pad = 14) {
      const xs = [], ys = [];
      slugs.forEach(s => { const p = pts.get(s) || dpts.get(s); if (p) { xs.push(p[0]); ys.push(p[1]); } });
      if (!xs.length) return;
      api.flyFitBox(Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad, ms);
    },
    /** Emphasise a set of slugs (others are dimmed); null clears. */
    highlight(set) { hot = set && set.size ? set : null; draw(); },
    setFocus(slug) { focus = slug; draw(); },
    /** Replace the place rows (e.g. to add or remove layers). */
    setPlaces(rows) { places = rows; visible = places.filter(p => p[2] != null && (showApprox || p[5] === "located") && (!only || only.has(p[0]))); visible.forEach(p => { if (!pts.has(p[0])) pts.set(p[0], project(p[3], p[2])); }); draw(); },
    /** Discovery markers: rows [id, name, lat, lon]. */
    setDiscoveries(rows) { drows = rows || []; dpts = new Map(drows.map(r => [r[0], project(r[3], r[2])])); draw(); },
    /** Draw a period layer: { powers: [{ name, colour, precision, polygon, label, capital }] } or null. */
    setPeriod(period) {
      const g = el.querySelector(".periods");
      g.innerHTML = period ? period.powers.map(pw => {
        const poly = pw.polygon ? `<path class="pw ${pw.precision || ""}" style="--pc:${pw.colour}" d="${pw.polygon.map(([lo, la], i) => { const [x, y] = project(lo, la); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join("")}Z"/>` : "";
        const [lx, ly] = pw.label ? project(pw.label[0], pw.label[1]) : [0, 0];
        const cap = pw.capital ? (() => { const [cx, cy] = project(pw.capital.lon, pw.capital.lat); return `<g class="cap"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}"/><text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" dx="0.5em" dy="0.35em">${pw.capital.name}</text></g>`; })() : "";
        return `${poly}${pw.label ? `<text class="pwl" style="--pc:${pw.colour}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${pw.name}</text>` : ""}${cap}`;
      }).join("") : "";
    },
    get view() { return { ...vb }; },
    point: slug => pts.get(slug) || dpts.get(slug),
    fit(slugsSet) {
      const xs = [], ys = [];
      slugsSet.forEach(s => { const p = pts.get(s); if (p) { xs.push(p[0]); ys.push(p[1]); } });
      if (!xs.length) return;
      const pad = 30, x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
      const w = Math.max(x1 - x0, (y1 - y0) * W / H, W / 20); const h = w * H / W;
      vb = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }; apply();
    }
  };
  if (focus) api.focusOn(focus); else apply();
  return api;
}
