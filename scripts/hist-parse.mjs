// Helpers for the history build (people, places, events, base map). Pure and unit-tested.

/** Theographic precision → display class. Unlocated places are never plotted. */
export function precisionClass(p, hasCoords) {
  if (!hasCoords || p === "Unlocated") return "unknown";
  if (p === "Rough") return "approximate";
  if (p === "Related-Surrounding" || p === "Related-Within") return "related";
  return "located";
}

/** Clean Easton's dictionary markdown: keep link labels, drop odd characters, tidy spaces. */
export function cleanDict(s) {
  return String(s || "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/�/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(").replace(/\s+\)/g, ")")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

/** Short descriptor for a person: parent link first, else the dataset's disambiguation in parentheses. */
export function describePerson(f, nameOf) {
  const father = (f.father || [])[0], mother = (f.mother || [])[0];
  const parent = father || mother;
  if (parent && nameOf(parent)) return `${f.gender === "Female" ? "daughter" : "son"} of ${nameOf(parent)}`;
  const d = f["Disambiguation (temp)"] || "";
  const m = d.match(/\(([^)]+)\)/);
  if (m && m[1].trim().length > 2) return m[1].trim().replace(/^the\s+/i, "");
  return "";
}

/** Year as text: -1490 → "1490 BC", 30 → "AD 30". */
export const yearText = y => (y == null || isNaN(y) ? "" : y < 0 ? `${-y} BC` : `AD ${y}`);

/** Clip a ring (array of [lon,lat]) to a rectangle (Sutherland–Hodgman). */
export function clipRing(ring, [x0, y0, x1, y1]) {
  const edges = [
    [p => p[0] >= x0, (a, b) => { const t = (x0 - a[0]) / (b[0] - a[0]); return [x0, a[1] + t * (b[1] - a[1])]; }],
    [p => p[0] <= x1, (a, b) => { const t = (x1 - a[0]) / (b[0] - a[0]); return [x1, a[1] + t * (b[1] - a[1])]; }],
    [p => p[1] >= y0, (a, b) => { const t = (y0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y0]; }],
    [p => p[1] <= y1, (a, b) => { const t = (y1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y1]; }]
  ];
  let out = ring;
  for (const [inside, cross] of edges) {
    const input = out; out = [];
    if (!input.length) break;
    let prev = input[input.length - 1];
    for (const cur of input) {
      if (inside(cur)) { if (!inside(prev)) out.push(cross(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cross(prev, cur));
      prev = cur;
    }
  }
  return out;
}

/** Split a line into the runs that lie inside the rectangle. */
export function clipLine(line, [x0, y0, x1, y1]) {
  const inside = p => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
  const runs = []; let cur = [];
  for (const p of line) {
    if (inside(p)) cur.push(p);
    else { if (cur.length > 1) runs.push(cur); cur = []; }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}

/** Drop points closer than tol to the last kept point; round to 2 decimals. */
export function simplify(pts, tol = 0.04) {
  const out = [];
  for (const p of pts) {
    const q = [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
    const last = out[out.length - 1];
    if (!last || Math.abs(last[0] - q[0]) + Math.abs(last[1] - q[1]) >= tol) out.push(q);
  }
  return out;
}
