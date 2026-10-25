// Interactive SVG map of the biblical world: Natural Earth base map + Theographic/OpenBible places.
// Pan by dragging, zoom with the wheel, pinch or the buttons. No tile server, no third-party script.
import { project, MAP_SIZE } from "./history.js";

const NS = "http://www.w3.org/2000/svg";
const ringPath = ring => ring.map(([lon, lat], i) => { const [x, y] = project(lon, lat); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join("");

/**
 * mount(el, { base, places, focus, onPick, height })
 * places: index rows [slug, name, lat, lon, type, cls, verseCount]
 */
export function mountMap(el, { base, places, focus = null, onPick = () => {}, showApprox = true, only = null }) {
  const [W, H] = MAP_SIZE;
  el.innerHTML = `<div class="mapwrap"><svg class="atlas" viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of the biblical world">
    <rect class="sea" x="-2000" y="-2000" width="${W + 4000}" height="${H + 4000}"/>
    <g class="land"><path d="${base.land.map(r => ringPath(r) + "Z").join("")}"/></g>
    <g class="lakes"><path d="${base.lakes.map(r => ringPath(r) + "Z").join("")}"/></g>
    <g class="rivers"><path d="${base.rivers.map(ringPath).join("")}"/></g>
    <g class="marks"></g><g class="labels"></g></svg>
    <div class="mapctl"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="reset" aria-label="Show the whole map">⤢</button></div>
    <p class="mapcredit">Base map: Natural Earth. Places: Theographic / OpenBible.info.</p></div>`;
  const svg = el.querySelector("svg"), marks = el.querySelector(".marks"), labels = el.querySelector(".labels");
  let vb = { x: 0, y: 0, w: W, h: H };
  let visible = places.filter(p => p[2] != null && (showApprox || p[5] === "located") && (!only || only.has(p[0])));
  const pts = new Map(visible.map(p => [p[0], project(p[3], p[2])]));

  const apply = () => { svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); draw(); };
  const scale = () => W / vb.w;
  function draw() {
    const s = scale(), r = 2.6 / s, show = Math.round(28 * s);
    marks.innerHTML = ""; labels.innerHTML = "";
    const placed = [];
    const fits = (x, y, w, h) => { for (const b of placed) if (x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1]) return false; return true; };
    const order = focus ? [...visible.filter(p => p[0] === focus), ...visible.filter(p => p[0] !== focus)] : visible;
    let labelled = 0;
    order.forEach(p => {
      const [x, y] = pts.get(p[0]);
      if (x < vb.x - 10 || x > vb.x + vb.w + 10 || y < vb.y - 10 || y > vb.y + vb.h + 10) return;
      const c = document.createElementNS(NS, "circle");
      const big = Math.min(2.2, 1 + Math.log10(1 + p[6]) / 2.2);
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", (r * big).toFixed(2));
      c.setAttribute("class", `pm ${p[5]}${focus === p[0] ? " focus" : ""}`);
      c.setAttribute("data-slug", p[0]); c.setAttribute("tabindex", "0");
      c.setAttribute("aria-label", `${p[1]}, ${p[5] === "located" ? "identified site" : "approximate location"}`);
      const t = document.createElementNS(NS, "title"); t.textContent = p[1]; c.appendChild(t);
      marks.appendChild(c);
      if (labelled >= show && focus !== p[0]) return;
      const fs = 11 / s, w = p[1].length * fs * 0.56, h = fs * 1.2, lx = x + r * 2.2, ly = y + r * 1.1;
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
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (moved) draw(); };
  svg.addEventListener("pointerup", e => {
    const target = e.target.closest?.(".pm");
    up(e);
    if (!moved && target) onPick(target.dataset.slug);
  });
  svg.addEventListener("pointercancel", up);
  svg.addEventListener("keydown", e => { const t = e.target.closest?.(".pm"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(t.dataset.slug); } });
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
