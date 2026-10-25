// Scripture Atlas Kids — the stage: sky, weather, water, boats, shore, characters and camera, all animated every frame.
// Built from reusable parts: the water and weather engine serves every lake and sea story (Noah, the Red Sea, Jonah,
// the storm); the boat, shore and crowd are shared scenery. Scenes are named presets; changing scene blends every
// colour and level over about two seconds, so the picture evolves rather than cutting between stills.
import { Puppet } from "./puppet.js";

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
const lerp = (a, b, k) => a + (b - a) * k;
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(",")})`; };
const rgbToHex = s => { const m = s.match(/\d+/g); return m ? "#" + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, "0")).join("") : s; };
// Seeded random so a scene looks the same on every play.
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export const W = 1600, H = 900, SEA = 610; // world size and still-water level

// Sky and light presets: sky top, middle, horizon; far hills; water top, water deep; light level for characters.
const SKY = {
  sunset: { s: ["#3B2A5A", "#C8607A", "#F7B267"], hill: "#5A4466", w: ["#C47A6E", "#3E3A64"], light: 1, star: 0, cloud: "#F2A97E", cloudA: 0.55, dark: 0 },
  dusk: { s: ["#232A5C", "#6B5A92", "#D79A7C"], hill: "#3C3760", w: ["#7C6E9A", "#2A2C55"], light: 0.85, star: 0.25, cloud: "#B48AA0", cloudA: 0.45, dark: 0.1 },
  night: { s: ["#0A1030", "#1B2A58", "#34507E"], hill: "#121A38", w: ["#2E4670", "#0F1A36"], light: 0.6, star: 1, cloud: "#3A4A72", cloudA: 0.35, dark: 0.3 },
  storm: { s: ["#12161E", "#262E3A", "#3E4856"], hill: "#141922", w: ["#3C4D5E", "#151D27"], light: 0.55, star: 0, cloud: "#2A313C", cloudA: 0.95, dark: 0.35 },
  clearing: { s: ["#121D3D", "#2B4370", "#6F8DB0"], hill: "#1B2847", w: ["#4E6C94", "#1A2A4C"], light: 0.75, star: 0.5, cloud: "#5A6E92", cloudA: 0.3, dark: 0.18 },
  moon: { s: ["#0C1838", "#203560", "#4F6E96"], hill: "#14213F", w: ["#4C6A96", "#13213F"], light: 0.8, star: 0.9, cloud: "#4A5C84", cloudA: 0.2, dark: 0.15 }
};
// Camera shots: centre x, y and zoom (1 = whole world).
const SHOTS = {
  wide: { x: 760, y: 470, z: 1 }, follow: { x: 820, y: 500, z: 1.18 }, stern: { x: 980, y: 520, z: 1.9 },
  shake: { x: 800, y: 500, z: 1.15, shake: 1 }, close: { x: 860, y: 480, z: 1.6, shake: 0.35 },
  rise: { x: 820, y: 470, z: 1.25 }, away: { x: 800, y: 430, z: 0.92 }
};
// Where each character stands in the boat (x from the boat's centre).
const SLOTS = { andrew: -228, john: -158, peter: -88, james: -18, jesus: 120 };

export class Stage {
  constructor(svg, story, { reduce = false } = {}) {
    this.svg = svg; this.story = story; this.reduce = reduce; seed = 7;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.innerHTML = "";
    const defs = el("defs", {}, svg);
    this.skyGrad = el("linearGradient", { id: "kSky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    this.skyStops = [0, 0.55, 1].map(o => el("stop", { offset: o }, this.skyGrad));
    this.waterGrad = el("linearGradient", { id: "kWater", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    this.waterStops = [0, 1].map(o => el("stop", { offset: o }, this.waterGrad));
    const glow = el("radialGradient", { id: "kGlow" }, defs); el("stop", { offset: 0, "stop-color": "#FFF6D8", "stop-opacity": 0.9 }, glow); el("stop", { offset: 1, "stop-color": "#FFF6D8", "stop-opacity": 0 }, glow);
    const vig = el("radialGradient", { id: "kVig", cx: 0.5, cy: 0.5, r: 0.75 }, defs); el("stop", { offset: 0.55, "stop-color": "#000", "stop-opacity": 0 }, vig); el("stop", { offset: 1, "stop-color": "#000", "stop-opacity": 0.55 }, vig);
    const blur = el("filter", { id: "kSoft", x: "-20%", y: "-50%", width: "140%", height: "200%" }, defs); el("feGaussianBlur", { stdDeviation: 6 }, blur);
    // sky (fixed to the screen) then the camera-moved world
    this.sky = el("rect", { x: -400, y: -400, width: W + 800, height: H + 800, fill: "url(#kSky)" }, svg);
    this.world = el("g", {}, svg);
    const Wd = this.world;
    this.stars = el("g", {}, Wd);
    for (let i = 0; i < 90; i++) el("circle", { cx: rnd() * 2400 - 400, cy: rnd() * 420 - 200, r: 0.6 + rnd() * 1.6, fill: "#fff", opacity: 0.4 + rnd() * 0.6 }, this.stars);
    this.moon = el("g", { transform: "translate(1240 150)" }, Wd);
    el("circle", { r: 120, fill: "url(#kGlow)" }, this.moon); el("circle", { r: 38, fill: "#FFF4D6" }, this.moon); el("circle", { cx: -10, cy: -8, r: 7, fill: "#EFE2BE" }, this.moon); el("circle", { cx: 12, cy: 10, r: 5, fill: "#EFE2BE" }, this.moon);
    this.sun = el("g", { transform: "translate(1180 520)" }, Wd); el("circle", { r: 160, fill: "url(#kGlow)" }, this.sun); el("circle", { r: 54, fill: "#FFD08A" }, this.sun);
    this.clouds = el("g", { filter: "url(#kSoft)" }, Wd);
    this.cloudList = Array.from({ length: 11 }, (_, i) => { const g = el("g", {}, this.clouds); const n = 4 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) el("ellipse", { cx: k * 46 - n * 23 + rnd() * 20, cy: rnd() * 16 - 8, rx: 50 + rnd() * 40, ry: 22 + rnd() * 18 }, g); return { g, x: rnd() * 2200 - 300, y: 40 + rnd() * 260, sp: 6 + rnd() * 10, s: 0.8 + rnd() * 0.9 }; });
    // far hills around the lake (the Galilee is ringed by hills)
    this.hills = [el("path", { opacity: 0.85 }, Wd), el("path", {}, Wd)];
    this.hills[0].setAttribute("d", this.ridge(520, 70, 3)); this.hills[1].setAttribute("d", this.ridge(560, 46, 11));
    // shore with houses, palms and the crowd (scene "shore")
    this.shore = el("g", {}, Wd); this.shoreIn = el("g", { transform: "translate(720 0)" }, this.shore); this.buildShore();
    // water: back layer, other boats, main boat with cast, front layer and foam
    this.waterBack = el("path", { fill: "url(#kWater)" }, Wd);
    this.others = el("g", {}, Wd); this.otherBoats = [240, 1500, 620].map((x, i) => ({ g: this.smallBoat(this.others), x, y: SEA - 18 - i * 6, s: 0.42 - i * 0.06, ph: i * 1.7 }));
    this.boat = el("g", {}, Wd); this.buildBoat();
    this.waterFront = el("path", { fill: "url(#kWater)", opacity: 0.82 }, Wd);
    this.glints = el("g", { stroke: "#FFF2C8", "stroke-linecap": "round" }, Wd);
    this.glintList = Array.from({ length: 26 }, (_, i) => ({ e: el("line", { "stroke-width": 3 }, this.glints), y: SEA + 50 + i * 9 + rnd() * 6, w: 20 + rnd() * 60 * (1 - i / 30), ph: rnd() * 6 }));
    this.foam = el("path", { fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", opacity: 0 }, Wd);
    this.spray = el("g", {}, Wd); this.drops = Array.from({ length: 70 }, () => ({ e: el("circle", { r: 1.2 + rnd() * 2.2, fill: "#E8F3FF", opacity: 0 }, this.spray), x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
    this.rain = el("g", { stroke: "#C9D8E8", "stroke-width": 2, "stroke-linecap": "round", opacity: 0 }, svg);
    this.rainDrops = Array.from({ length: 150 }, () => ({ e: el("line", {}, this.rain), x: rnd() * (W + 400) - 200, y: rnd() * H, l: 18 + rnd() * 26, v: 900 + rnd() * 500 }));
    this.bolt = el("path", { fill: "none", stroke: "#F5F9FF", "stroke-width": 5, "stroke-linejoin": "round", opacity: 0 }, svg);
    this.flash = el("rect", { x: 0, y: 0, width: W, height: H, fill: "#EAF2FF", opacity: 0, "pointer-events": "none" }, svg);
    this.grade = el("rect", { x: 0, y: 0, width: W, height: H, fill: "#0B0A1E", opacity: 0, "pointer-events": "none" }, svg);
    this.vignette = el("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#kVig)", opacity: 0.5, "pointer-events": "none" }, svg);
    // state
    this.cur = { ...SKY.sunset, water: 0.05 }; this.from = this.cur; this.to = this.cur; this.k = 1;
    this.cam = { ...SHOTS.wide }; this.shot = SHOTS.wide; this.flashT = 0; this.nextBolt = 3; this.scene = null; this.boatX = 0; this.boatTarget = 0; this.bedtime = 0; this.tapCalm = 0;
    this.lightning = false; this.rainOn = 0; this.crowdOn = 1; this.othersOn = 1;
  }
  ridge(base, amp, s) { let d = `M-600 ${H + 200} L-600 ${base}`; seed = s; for (let x = -600; x <= 2200; x += 80) d += ` L${x} ${base - amp * (0.4 + 0.6 * Math.abs(Math.sin(x / 260 + s))) - rnd() * amp * 0.25}`; return d + ` L2200 ${H + 200} Z`; }
  buildShore() {
    const S = this.shoreIn;
    el("path", { d: `M-700 ${SEA + 6} L-700 520 Q-420 500 -180 548 Q20 580 120 ${SEA - 4} L160 ${SEA + 6} Z`, fill: "#7A6A4E" }, S);
    el("path", { d: `M-700 ${SEA + 6} L-700 560 Q-400 548 -120 572 Q60 590 160 ${SEA + 6} Z`, fill: "#A58C62" }, S);
    // flat-roofed houses and palms on the slope
    [[-600, 470, 90, 60], [-480, 488, 70, 52], [-380, 478, 110, 66], [-560, 430, 60, 46]].forEach(([x, y, w, h]) => { el("rect", { x, y, width: w, height: h, fill: "#D9C29A", stroke: "#9C8458", "stroke-width": 2 }, S); el("rect", { x: x - 4, y: y - 6, width: w + 8, height: 8, fill: "#B59A6A" }, S); el("rect", { x: x + w / 2 - 8, y: y + h - 26, width: 16, height: 26, fill: "#6B5434" }, S); });
    const palm = (x, y, s) => { const g = el("g", { transform: `translate(${x} ${y}) scale(${s})` }, S); el("path", { d: "M0 0 Q6 -60 -4 -120", fill: "none", stroke: "#6B4F2E", "stroke-width": 9, "stroke-linecap": "round" }, g); for (const a of [-70, -30, 10, 50, 100, 150]) el("path", { d: "M-4 -120 q40 -20 70 10", fill: "none", stroke: "#3F6B3A", "stroke-width": 7, "stroke-linecap": "round", transform: `rotate(${a} -4 -120)` }, g); };
    palm(-250, 560, 1); palm(-650, 540, 0.9); palm(-60, 584, 0.75);
    // the crowd: small puppets from the same rig with varied clothing
    const robes = ["#C8B48A", "#7E8F6A", "#9C5B47", "#6E7F95", "#B88A5A", "#8E6F98", "#D7C6A0", "#5F7A6E"], skins = ["#8F5E3C", "#A8734B", "#B88358", "#9A6643", "#7E5234"];
    this.crowd = [];
    for (let i = 0; i < 14; i++) { const rig = { skin: skins[i % 5], hair: "#1E1510", beard: i % 3 === 0 ? "short" : "none", robe: robes[i % 8], sash: "#5B4A32", cloth: i % 2 ? robes[(i + 3) % 8] : null, height: 0.85 + (i % 4) * 0.06 }; const p = new Puppet(S, rig, "Crowd"); p.place(-640 + i * 52 + (i % 2) * 14, 562 + (i % 3) * 14, 0.55); p.act(i % 4 === 0 ? "amazed" : "idle"); this.crowd.push(p); }
  }
  smallBoat(parent) { const g = el("g", {}, parent); el("path", { d: "M-150 0 Q-130 40 0 44 Q130 40 160 -6 Q0 12 -150 0 Z", fill: "#5A3B24" }, g); el("path", { d: "M0 -170 L0 6", stroke: "#4A321E", "stroke-width": 5 }, g); el("path", { d: "M3 -160 Q70 -100 4 -40 Z", fill: "#E8DCC0", opacity: 0.9 }, g); return g; }
  buildBoat() {
    const B = this.boat;
    // a Galilee fishing boat: about 8 m long, raised stern, mast and furled sail (after the 1st-century boat found in 1986)
    this.mast = el("g", {}, B);
    el("path", { d: "M-30 -330 L-30 -20", stroke: "#4A321E", "stroke-width": 9, "stroke-linecap": "round" }, this.mast);
    el("path", { d: "M-120 -300 L60 -300", stroke: "#4A321E", "stroke-width": 6, "stroke-linecap": "round" }, this.mast);
    this.sail = el("path", { fill: "#F0E6CC", stroke: "#B8A47C", "stroke-width": 2 }, this.mast);
    this.rope = el("path", { fill: "none", stroke: "#8A7350", "stroke-width": 2 }, this.mast);
    el("path", { d: "M-280 -36 Q-250 -6 -230 -2 L250 -2 Q300 -20 318 -70 Q260 -40 230 -44 L-250 -44 Z", fill: "#3E2A18" }, B); // inside, back rim
    el("rect", { x: 104, y: -66, width: 66, height: 18, rx: 9, fill: "#8C3A2C" }, B);       // the cushion at the stern
    this.crew = el("g", {}, B);
    this.cast = {};
    for (const [id, c] of Object.entries(this.story.cast)) { if (!c.rig) continue; const p = new Puppet(this.crew, c.rig, c.name); p.home = SLOTS[id] ?? 0; this.cast[id] = p; }
    this.hull = el("g", {}, B);
    el("path", { d: "M-300 -40 Q-282 30 -160 52 Q0 66 180 50 Q290 36 330 -78 Q300 -52 250 -46 Q0 -30 -300 -40 Z", fill: "#7A4E2C", stroke: "#4A2F18", "stroke-width": 3 }, this.hull);
    for (const y of [-22, -4, 14, 32]) el("path", { d: `M-294 ${y - 12} Q0 ${y + 18} 300 ${y - 34}`, fill: "none", stroke: "#5C3A20", "stroke-width": 2, opacity: 0.7 }, this.hull);
    el("path", { d: "M-302 -42 Q0 -26 252 -46 Q300 -52 332 -80", fill: "none", stroke: "#A97A4E", "stroke-width": 6, "stroke-linecap": "round" }, this.hull);
    el("circle", { cx: -246, cy: -14, r: 6, fill: "#2B1B10" }, this.hull);
  }
  /** Water surface height offset at x, for the current storm level. */
  wave(x, t, lv) {
    const a = 3 + lv * 34, b = 2 + lv * 22, c = 1 + lv * 10, r = this.reduce ? 0.4 : 1;
    return r * (a * Math.sin(x / 230 - t * (0.8 + lv * 1.2)) + b * Math.sin(x / 97 + t * (1.3 + lv * 1.8) + 1.3) + c * Math.sin(x / 41 - t * (2.2 + lv * 2) + 0.7));
  }
  surface(t, lv, off, step = 25) { let d = `M-700 ${H + 300}`; for (let x = -700; x <= 2300; x += step) d += ` L${x} ${(SEA + off + this.wave(x + off * 7, t, lv)).toFixed(1)}`; return d + ` L2300 ${H + 300} Z`; }
  /** Switch to a named scene from story.scenes; colours, water, weather and camera blend over ~2 s. */
  setScene(name, { instant = false } = {}) {
    const sc = this.story.scenes[name]; if (!sc || name === this.scene) return; this.scene = name;
    const sky = SKY[sc.sky] || SKY.sunset;
    this.from = { ...this.cur }; this.to = { ...sky, water: sc.water ?? 0.1 }; this.k = instant ? 1 : 0;
    this.shot = SHOTS[sc.camera] || SHOTS.wide;
    this.lightning = !!sc.lightning; this.rainTarget = sc.rain ? 1 : 0; this.crowdOn = sc.crowd ? 1 : 0; this.othersTarget = sc.boats ? 1 : 0;
    this.moonTarget = sc.moon ? 1 : 0; this.boatTarget = name === "shore" ? 220 : name === "end" ? 140 : 0; this.tapCalm = 0;
    if (instant) { this.cur = { ...this.to }; this.cam = { ...this.shot }; this.rainOn = this.rainTarget; this.boatX = this.boatTarget; this.othersOn = this.othersTarget; this.moonOn = this.moonTarget; }
  }
  /** One frame. t = story time in seconds, dt = frame time. */
  update(t, dt) {
    if (!this.moonOn) this.moonOn = 0;
    this.k = Math.min(1, this.k + dt / 2.2);
    const k = this.k * this.k * (3 - 2 * this.k), F = this.from, T = this.to, C = this.cur;
    C.s = F.s.map((c, i) => mix(c, T.s[i], k)); C.hill = mix(F.hill, T.hill, k); C.w = F.w.map((c, i) => mix(c, T.w[i], k)); C.cloud = mix(F.cloud, T.cloud, k);
    for (const key of ["light", "star", "cloudA", "dark"]) C[key] = lerp(F[key], T[key], k);
    // calm arrives quickly once Jesus speaks (tapCalm lets the child "see" it happen)
    const lvTarget = T.water; C.water = lerp(C.water ?? lvTarget, lvTarget, 1 - Math.exp(-dt * (lvTarget < 0.1 ? 1.4 : 0.6)));
    const lv = C.water;
    this.skyStops.forEach((s, i) => s.setAttribute("stop-color", C.s[i]));
    // repaint helpers need hex for mixing next time: store as rgb strings, convert lazily
    this.cur.s = this.cur.s.map(rgbToHex); this.cur.hill = rgbToHex(C.hill); this.cur.w = C.w.map(rgbToHex); this.cur.cloud = rgbToHex(C.cloud);
    this.waterStops[0].setAttribute("stop-color", C.w[0]); this.waterStops[1].setAttribute("stop-color", C.w[1]);
    this.hills[0].setAttribute("fill", mix(C.hill, "#000000", 0.0)); this.hills[1].setAttribute("fill", mix(C.hill, "#000000", 0.25));
    this.stars.setAttribute("opacity", C.star.toFixed(2));
    this.moonOn = lerp(this.moonOn, this.moonTarget, 1 - Math.exp(-dt * 0.8)); this.moon.setAttribute("opacity", this.moonOn.toFixed(2));
    this.sun.setAttribute("opacity", Math.max(0, 1 - C.star * 2 - C.dark * 3).toFixed(2));
    for (const c of this.cloudList) { c.x += c.sp * dt * (1 + lv * 6); if (c.x > 2300) c.x = -500; c.g.setAttribute("transform", `translate(${c.x} ${c.y + lv * 40}) scale(${c.s * (1 + lv * 0.6)})`); }
    this.clouds.setAttribute("fill", C.cloud); this.clouds.setAttribute("opacity", C.cloudA.toFixed(2));
    // shore slides away as the boat leaves; other boats fade with the storm
    this.boatX = lerp(this.boatX, this.boatTarget, 1 - Math.exp(-dt * 0.5));
    this.shore.setAttribute("transform", `translate(${(this.boatX - 220) * 2.6} 0)`); this.shore.setAttribute("opacity", Math.max(0, Math.min(1, 1 + (this.boatX - 220) / 140)).toFixed(2));
    this.crowd.forEach(p => p.update(t, dt, { wind: 0.1, reduce: this.reduce }));
    this.othersOn = lerp(this.othersOn ?? 0, this.othersTarget, 1 - Math.exp(-dt * 0.7)); this.others.setAttribute("opacity", this.othersOn.toFixed(2));
    for (const b of this.otherBoats) { b.x += dt * 14; if (b.x > 2300) b.x = -500; const y = b.y + this.wave(b.x, t, lv) * 0.6; b.g.setAttribute("transform", `translate(${b.x} ${y}) rotate(${Math.sin(t + b.ph) * 3}) scale(${b.s})`); }
    // water and the boat riding it
    this.waterBack.setAttribute("d", this.surface(t, lv, -14, 40));
    const bx = 860 + this.boatX, h1 = this.wave(bx - 220, t, lv), h2 = this.wave(bx + 220, t, lv), hm = this.wave(bx, t, lv);
    const ang = Math.atan2(h2 - h1, 440) * 180 / Math.PI * 0.9;
    this.boatAng = ang;
    this.boat.setAttribute("transform", `translate(${bx} ${SEA + 8 + hm * 0.8}) rotate(${ang})`);
    this.waterFront.setAttribute("d", this.surface(t, lv, 34, 25));
    if (lv > 0.4) { let d = ""; for (let x = -200; x < 2000; x += 160) { const y = SEA + 34 + this.wave(x + 238, t, lv); d += `M${x - 30} ${y + 6} q30 -14 60 0 `; } this.foam.setAttribute("d", d); }
    this.foam.setAttribute("opacity", Math.max(0, (lv - 0.4) * 1.4).toFixed(2));
    // light on the water under the moon (or the setting sun)
    const sunA = Math.max(0, 1 - C.star * 2 - C.dark * 3), lx = this.moonOn > 0.3 ? 1240 : 1180, glA = Math.max(this.moonOn * 0.8, sunA * 0.6) * (1 - lv);
    this.glints.setAttribute("opacity", glA.toFixed(2)); this.glints.setAttribute("stroke", this.moonOn > 0.3 ? "#E9F1FF" : "#FFD9A0");
    for (const g of this.glintList) { const w = g.w * (0.6 + 0.4 * Math.sin(t * 1.7 + g.ph)), x = lx + Math.sin(t * 0.6 + g.ph) * 18; g.e.setAttribute("x1", (x - w / 2).toFixed(1)); g.e.setAttribute("x2", (x + w / 2).toFixed(1)); g.e.setAttribute("y1", g.y); g.e.setAttribute("y2", g.y); }
    // sail: full in light wind, straining and furled in the storm
    const sw = lv > 0.5 ? 0.25 : 1, belly = 40 + lv * 30 + Math.sin(t * 3) * 6 * lv;
    this.sail.setAttribute("d", `M-112 -296 Q${-30 + belly} ${-210 * sw - 90 * (1 - sw)} -40 ${-300 + 270 * sw} L-112 ${-300 + 260 * sw} Z`);
    this.rope.setAttribute("d", `M-112 ${-300 + 260 * sw} Q-150 -120 -200 -40`);
    // characters
    for (const [id, p] of Object.entries(this.cast)) {
      const lying = p.pose.lie > 0.55, sitting = p.pose.lie > 0.2 && !lying;
      // Jesus sleeps on the cushion at the stern, head towards the bow; he sits up there when woken
      p.place(id === "jesus" && (lying || sitting) ? 262 : p.home, lying ? -52 : sitting ? -30 : -8, 0.95);
      p.update(t, dt, { wind: 0.15 + lv * 0.9, sway: ang, reduce: this.reduce });
    }
    // spray when big waves hit the bow
    for (const d of this.drops) {
      if (d.life <= 0 && lv > 0.6 && rnd() < dt * 22 * lv) { d.x = bx - 330 + rnd() * 60; d.y = SEA + hm; d.vx = -120 + rnd() * 340; d.vy = -300 - rnd() * 280; d.life = 1; }
      if (d.life > 0) { d.life -= dt * 1.1; d.vy += 700 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
      d.e.setAttribute("cx", d.x.toFixed(1)); d.e.setAttribute("cy", d.y.toFixed(1)); d.e.setAttribute("opacity", Math.max(0, d.life * 0.9).toFixed(2));
    }
    // rain
    this.rainOn = lerp(this.rainOn, this.rainTarget || 0, 1 - Math.exp(-dt * 1.2)); this.rain.setAttribute("opacity", (this.rainOn * 0.75).toFixed(2));
    if (this.rainOn > 0.02) for (const r of this.rainDrops) { r.y += r.v * dt; r.x -= r.v * 0.32 * dt; if (r.y > H + 40) { r.y = -40 - rnd() * 100; r.x = rnd() * (W + 500) - 100; } r.e.setAttribute("x1", r.x.toFixed(1)); r.e.setAttribute("y1", r.y.toFixed(1)); r.e.setAttribute("x2", (r.x - r.l * 0.32).toFixed(1)); r.e.setAttribute("y2", (r.y + r.l).toFixed(1)); }
    // lightning
    if (this.lightning && !this.reduce) { this.nextBolt -= dt; if (this.nextBolt < 0) this.strike(); }
    this.flashT = Math.max(0, this.flashT - dt * (this.bedtime ? 6 : 3.2));
    this.flash.setAttribute("opacity", (this.flashT * (this.bedtime ? 0.15 : 0.55)).toFixed(2)); this.bolt.setAttribute("opacity", (this.flashT > 0.5 ? 1 : this.flashT * 2).toFixed(2));
    // camera: ease toward the shot; shake in the storm
    const S = this.shot, ck = 1 - Math.exp(-dt * 1.1), cam = this.cam;
    cam.x = lerp(cam.x, S.x + this.boatX * 0.6, ck); cam.y = lerp(cam.y, S.y, ck); cam.z = lerp(cam.z, S.z, ck);
    const sh = (S.shake || 0) * lv * (this.reduce ? 0 : 1);
    const jx = sh * (Math.sin(t * 13.1) * 6 + Math.sin(t * 7.3) * 4), jy = sh * (Math.sin(t * 11.7) * 5), jr = sh * Math.sin(t * 5.1) * 0.8;
    this.world.setAttribute("transform", `translate(${W / 2 + jx} ${H / 2 + jy}) rotate(${jr}) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`);
    // lighting grade: night, storm and bedtime darken the frame
    this.grade.setAttribute("opacity", Math.min(0.6, C.dark * 0.6 + this.bedtime * 0.28).toFixed(2));
    this.vignette.setAttribute("opacity", (0.35 + C.dark * 0.6 + this.bedtime * 0.3).toFixed(2));
  }
  strike() {
    this.nextBolt = 2.5 + rnd() * 4.5; this.flashT = 1;
    let x = 200 + rnd() * 1200, y = -20, d = `M${x} ${y}`; while (y < 420) { y += 40 + rnd() * 50; x += rnd() * 90 - 45; d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; }
    this.bolt.setAttribute("d", d);
    this.onThunder?.();
  }
  /** Characters for the player (lip-sync and actions). */
  get puppets() { return this.cast; }
}
