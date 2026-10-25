// Ereunia Kids — the shared character rig.
// One parameterised puppet (skin, hair, beard, robe, sash, head cloth, height) serves every human character in every
// story, so a cast stays consistent across the library. Joints: hips (lean, crouch, lie), neck (tilt), shoulders and
// elbows (both arms), plus a face with blinking eyes, brows and mouth shapes. Motion = an action's target pose, eased,
// plus procedural life (breathing, sway, blinks, wind on the robe) and lip-sync driven by the voice's word timings.

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
const lerp = (a, b, k) => a + (b - a) * k;
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)))); return `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`; };

// Pose: angles in degrees. Arms: [shoulder, elbow]; shoulder 0 = hanging down, + = raised forward/outward.
// lie: 0 standing … 1 lying on the back. crouch: 0 … 1. lean: + = forward. face: brows/mouth/eyes.
const P = (o) => ({ lean: 0, crouch: 0, lie: 0, tilt: 0, l: [8, 10], r: [8, 10], brow: 0, mouth: "smile", eyes: 1, ...o });
const POSES = {
  idle: P({}),
  wave: P({ r: [150, 20], brow: 0.2, mouth: "smile", osc: { r0: 18, rate: 3.2 } }),
  point: P({ r: [78, 0], lean: 4, tilt: -4, mouth: "talk" }),
  teach: P({ l: [42, 40], r: [52, 30], mouth: "talk", osc: { l0: 10, r0: 12, rate: 0.9 } }),
  turn: P({ tilt: 6, r: [20, 30] }),
  row: P({ crouch: 0.35, lean: 14, l: [62, 30], r: [62, 30], mouth: "set", osc: { l0: 24, r0: 24, lean: 9, rate: 1.1 } }),
  sail: P({ r: [160, 10], l: [30, 50], tilt: -8, mouth: "set" }),
  sleep: P({ lie: 1, eyes: 0, mouth: "rest", l: [12, 125], r: [10, 105] }),
  bail: P({ crouch: 0.6, lean: 26, l: [70, 70], r: [70, 70], brow: -0.6, mouth: "grit", osc: { l0: 40, r0: 40, lean: 10, rate: 2.2 } }),
  cling: P({ crouch: 0.55, lean: 8, l: [38, 120], r: [38, 120], brow: -0.9, mouth: "fear", eyes: 1.25, shiver: 1 }),
  shake: P({ crouch: 0.25, lean: 22, l: [80, 15], r: [80, 15], brow: -0.9, mouth: "fear", eyes: 1.25, osc: { l0: 7, r0: 7, rate: 7 } }),
  wake: P({ lie: 0.35, crouch: 0.3, eyes: 1, tilt: 10, mouth: "rest", l: [20, 40], r: [30, 40] }),
  plead: P({ crouch: 0.2, lean: 12, l: [58, 60], r: [58, 60], brow: -1, mouth: "fear", eyes: 1.2 }),
  stand: P({ brow: 0.3, mouth: "set", l: [12, 10], r: [14, 10] }),
  calm: P({ r: [118, 0], l: [26, 20], lean: 4, brow: 0.5, mouth: "set", windRobe: 1 }),
  amazed: P({ lean: -6, l: [34, 50], r: [34, 50], brow: 1, mouth: "o", eyes: 1.3 }),
  ask: P({ r: [46, 54], tilt: 8, brow: 0.6, mouth: "smile" })
};
export const ACTIONS = Object.keys(POSES);

const MOUTHS = {
  // [path drawn around (0,0) mouth centre], open mouths get a dark fill
  smile: ["M-7 0 Q0 6 7 0", false], rest: ["M-5 1 Q0 3 5 1", false], set: ["M-6 1 L6 1", false],
  grit: ["M-7 -1 L7 -1 L6 3 L-6 3 Z", true], fear: ["M-6 3 Q0 -5 6 3 Q0 6 -6 3 Z", true],
  o: ["M0 -5 Q5 -5 5 1 Q5 7 0 7 Q-5 7 -5 1 Q-5 -5 0 -5 Z", true],
  talkA: ["M-7 -1 Q0 9 7 -1 Q0 3 -7 -1 Z", true], talkB: ["M-5 -1 Q0 5 5 -1 Q0 2 -5 -1 Z", true], talkC: ["M-4 0 Q0 7 4 0 Q0 3 -4 0 Z", true]
};

export class Puppet {
  /** rig: { skin, hair, beard, robe, sash, cloth, height }, name for aria. */
  constructor(parent, rig, name = "") {
    this.rig = rig; this.face = 1; this.pose = P({}); this.target = POSES.idle; this.action = "idle";
    this.t0 = Math.random() * 10; this.blinkAt = 1 + Math.random() * 3; this.blinkK = 0; this.speaking = 0; this.mouthOverride = null;
    const R = rig, skinD = shade(R.skin, -0.18), robeD = shade(R.robe, -0.22), robeL = shade(R.robe, 0.12);
    this.g = el("g", { class: "puppet", "aria-label": name }, parent);
    this.flip = el("g", {}, this.g);
    el("ellipse", { cx: 0, cy: 2, rx: 34, ry: 6, fill: "rgba(0,0,0,.18)", class: "pshadow" }, this.flip);
    this.body = el("g", {}, this.flip);                     // rotates about the hips for lean / lie
    // legs and feet (seen below the robe hem when crouching or lying)
    this.feet = el("g", {}, this.body);
    el("ellipse", { cx: -10, cy: -3, rx: 9, ry: 4.5, fill: skinD }, this.feet); el("ellipse", { cx: 11, cy: -3, rx: 9, ry: 4.5, fill: skinD }, this.feet);
    el("path", { d: "M-18 -6 h14 M4 -6 h14", stroke: "#5B3A1E", "stroke-width": 2.5, "stroke-linecap": "round" }, this.feet); // sandal straps
    this.robe = el("path", { fill: R.robe, stroke: robeD, "stroke-width": 1.5 }, this.body);
    this.fold = el("path", { fill: "none", stroke: robeD, "stroke-width": 1.4, opacity: 0.55 }, this.body);
    this.sash = el("path", { fill: R.sash }, this.body);
    if (R.cloth) this.mantle = el("path", { fill: R.cloth, stroke: shade(R.cloth, -0.25), "stroke-width": 1.2 }, this.body);
    // arms: back arm behind the torso detail, front arm in front
    this.armL = this.arm(this.body, -23, R, robeD, true);
    this.chest = el("path", { fill: robeL, opacity: 0.35 }, this.body);
    this.neck = el("rect", { x: -6, y: -138, width: 12, height: 14, rx: 5, fill: skinD }, this.body);
    // head
    this.head = el("g", {}, this.body);
    const H = this.head;
    el("ellipse", { cx: -20, cy: -2, rx: 4, ry: 6, fill: skinD }, H); el("ellipse", { cx: 20, cy: -2, rx: 4, ry: 6, fill: skinD }, H);
    el("ellipse", { cx: 0, cy: 0, rx: 20, ry: 23, fill: R.skin }, H);
    el("path", { d: "M-15 -2 Q-12 14 0 17 Q12 14 15 -2", fill: "none", stroke: skinD, "stroke-width": 0, opacity: 0 }, H);
    if (R.beard === "full") el("path", { d: "M-19 2 Q-20 22 -8 29 Q0 33 8 29 Q20 22 19 2 Q14 13 8 14 Q0 10 -8 14 Q-14 13 -19 2 Z", fill: R.hair }, H);
    if (R.beard === "short") el("path", { d: "M-18 5 Q-17 19 -7 24 Q0 27 7 24 Q17 19 18 5 Q13 13 7 14 Q0 11 -7 14 Q-13 13 -18 5 Z", fill: R.hair }, H);
    // hair (and head cloth when the character wears one)
    el("path", { d: "M-21 -4 Q-23 -27 0 -27 Q23 -27 21 -4 Q18 -15 9 -18 Q0 -14 -9 -18 Q-18 -15 -21 -4 Z", fill: R.hair }, H);
    el("path", { d: "M-21 -6 Q-25 8 -20 16 L-17 2 Z M21 -6 Q25 8 20 16 L17 2 Z", fill: R.hair }, H);
    if (R.cloth) {
      el("path", { d: "M-24 -2 Q-26 -31 0 -31 Q26 -31 24 -2 L27 22 Q20 16 18 0 Q12 -20 0 -20 Q-12 -20 -18 0 Q-20 16 -27 22 Z", fill: R.cloth, stroke: shade(R.cloth, -0.25), "stroke-width": 1.2 }, H);
      el("path", { d: "M-22 -14 Q0 -22 22 -14", fill: "none", stroke: shade(R.cloth, -0.35), "stroke-width": 2.5 }, H);
    }
    // face
    el("ellipse", { cx: -10, cy: 6, rx: 4, ry: 2.4, fill: "#E8826A", opacity: 0.22 }, H); el("ellipse", { cx: 10, cy: 6, rx: 4, ry: 2.4, fill: "#E8826A", opacity: 0.22 }, H);
    el("path", { d: "M0 -2 Q3 5 0 7", fill: "none", stroke: skinD, "stroke-width": 1.6, "stroke-linecap": "round" }, H);
    this.eyes = [-7.5, 7.5].map(x => { const g = el("g", { transform: `translate(${x} -3)` }, H); el("ellipse", { cx: 0, cy: 0, rx: 3.6, ry: 4.6, fill: "#fff" }, g); const p = el("ellipse", { cx: 0.3, cy: 0.6, rx: 2.3, ry: 3, fill: "#2B1B12" }, g); el("circle", { cx: 1.1, cy: -0.6, r: 0.9, fill: "#fff" }, g); const lid = el("rect", { x: -4.5, y: -6, width: 9, height: 0, fill: R.skin }, g); return { g, p, lid }; });
    this.brows = [-7.5, 7.5].map(x => el("path", { d: "M-4.5 0 Q0 -2 4.5 0", fill: "none", stroke: R.hair, "stroke-width": 2.4, "stroke-linecap": "round", transform: `translate(${x} -10)` }, H));
    this.mouth = el("path", { transform: "translate(0 11)", stroke: "#5A2A1E", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, H);
    this.armR = this.arm(this.body, 23, R, robeD, false);
    this.scale = R.height || 1;
  }
  arm(parent, x, R, robeD, back) {
    const s = el("g", {}, parent);
    el("path", { d: "M-7 0 Q-8 22 -6 40 L6 40 Q8 22 7 0 Z", fill: back ? robeD : R.robe, stroke: robeD, "stroke-width": 1.2 }, s);
    const fore = el("g", { transform: "translate(0 38)" }, s);
    el("path", { d: "M-6 0 Q-6 16 -5 30 L5 30 Q6 16 6 0 Z", fill: back ? robeD : R.robe, stroke: robeD, "stroke-width": 1.2 }, fore);
    el("ellipse", { cx: 0, cy: 35, rx: 6, ry: 7, fill: R.skin, stroke: shade(R.skin, -0.18), "stroke-width": 1 }, fore);
    return { s, fore, x, back };
  }
  /** Change action; the pose eases toward it. */
  act(name) { if (POSES[name]) { this.action = name; this.target = POSES[name]; } }
  /** Speaking level 0..1 from the voice (word on = 1). */
  speak(on) { this.speaking = on ? 1 : 0; }
  setFacing(f) { this.face = f; }
  /** Advance the animation to time t (seconds); dt for easing; env: { wind, sway (boat rock in degrees), reduce }. */
  update(t, dt, env = {}) {
    const T = this.target, k = 1 - Math.exp(-dt * 5.5), q = this.pose, tt = t + this.t0, red = env.reduce ? 0.3 : 1;
    for (const key of ["lean", "crouch", "lie", "tilt", "brow", "eyes"]) q[key] = lerp(q[key], T[key], key === "lie" ? 1 - Math.exp(-dt * 2.2) : k);
    const o = T.osc || {}, w = Math.sin(tt * (o.rate || 1) * Math.PI * 2);
    q.l = [lerp(q.l[0], T.l[0] + (o.l0 || 0) * w * red, k), lerp(q.l[1], T.l[1], k)];
    q.r = [lerp(q.r[0], T.r[0] + (o.r0 || 0) * (T.osc?.r0 && this.action === "wave" ? w : w) * red, k), lerp(q.r[1], T.r[1], k)];
    const breathe = Math.sin(tt * 1.6) * (q.lie > 0.5 ? 1.6 : 1.1);
    const shiver = T.shiver ? Math.sin(tt * 38) * 0.9 * red : 0;
    const lean = q.lean + (o.lean || 0) * w * red + (env.sway || 0) * 0.35;
    // body: crouch lowers the hips; lie rotates the body back to horizontal around the hips
    const hipY = -8 - q.crouch * 18, sc = this.scale;
    const lieAng = -q.lie * 84;
    this.flip.setAttribute("transform", `scale(${this.face * sc} ${sc})`);
    this.body.setAttribute("transform", `translate(${shiver} ${q.crouch * 22 + q.lie * 30}) rotate(${lean * (1 - q.lie) + lieAng} 0 ${hipY})`);
    // robe silhouette (hem widens in the wind)
    const wind = (env.wind || 0) * (T.windRobe ? 1.6 : 1), flap = Math.sin(tt * 9) * wind * 4 * red;
    const hemL = -34 - wind * 6 + flap, hemR = 34 + wind * 10 + flap, top = -126 + breathe * 0.4;
    this.robe.setAttribute("d", `M${-24} ${top} Q-30 ${-70} ${hemL} -6 Q0 2 ${hemR} -6 Q30 -70 24 ${top} Q0 ${top - 6} -24 ${top} Z`);
    this.fold.setAttribute("d", `M-6 -64 Q-9 -32 -12 -8 M8 -62 Q10 -30 14 -8`);
    this.sash.setAttribute("d", `M-27 -76 Q0 -70 27 -76 L28 -66 Q0 -60 -28 -66 Z`);
    this.chest.setAttribute("d", `M-14 ${top + 4} Q0 ${top + 18} 14 ${top + 4} Q0 ${top + 10} -14 ${top + 4} Z`);
    if (this.mantle) this.mantle.setAttribute("d", `M-26 ${top + 2} Q-6 ${top + 30} 10 -40 Q22 -10 ${30 + wind * 8 + flap} -18 Q32 -70 22 ${top} Q0 ${top + 10} -26 ${top + 2} Z`);
    // arms (mirrored so + raises both outward/forward)
    const arm = (a, ang) => { a.s.setAttribute("transform", `translate(${a.x} ${top + 8 + breathe * 0.3}) rotate(${a.x < 0 ? ang[0] : -ang[0]})`); a.fore.setAttribute("transform", `translate(0 38) rotate(${a.x < 0 ? ang[1] : -ang[1]})`); };
    arm(this.armL, q.l); arm(this.armR, q.r);
    this.head.setAttribute("transform", `translate(0 ${top - 28 + breathe * 0.5}) rotate(${q.tilt + Math.sin(tt * 0.7) * 1.5 * red})`);
    // eyes: blink every few seconds (closed when asleep)
    this.blinkAt -= dt; if (this.blinkAt < 0) { this.blinkK = 1; this.blinkAt = 2.5 + Math.random() * 3.5; }
    this.blinkK = Math.max(0, this.blinkK - dt * 7);
    const open = Math.max(0, Math.min(1.3, q.eyes)) * (1 - (this.blinkK > 0.5 ? 2 - 2 * this.blinkK : 2 * this.blinkK) * 0.95);
    for (const e of this.eyes) { e.lid.setAttribute("height", (Math.max(0, 1 - Math.min(1, open)) * 11).toFixed(2)); e.g.setAttribute("transform", `${e.g.getAttribute("transform").split(" scale")[0]} scale(1 ${Math.max(0.15, Math.min(1.25, open)).toFixed(2)})`); }
    // brows: + raised (wonder), - knitted (fear/strain)
    this.brows.forEach((b, i) => { const s = i ? 1 : -1; b.setAttribute("transform", `translate(${s * 7.5} ${-10 - q.brow * 2.4}) rotate(${s * q.brow * -9})`); });
    // mouth: lip-sync while speaking, otherwise the pose's shape
    let m = this.mouthOverride || T.mouth;
    if (this.speaking) { const ph = Math.floor(tt * 9) % 3; m = ["talkA", "talkB", "talkC"][ph]; }
    else if (m === "talk") m = "smile";
    const [d, open2] = MOUTHS[m] || MOUTHS.smile;
    this.mouth.setAttribute("d", d); this.mouth.setAttribute("fill", open2 ? "#5A2A1E" : "none");
  }
  place(x, y, s = 1) { this.g.setAttribute("transform", `translate(${x} ${y}) scale(${s})`); }
}
