// Discoveries: archaeology, inscriptions, manuscripts and scientific methods that bear on the Bible.
// Entries live in discoveries-data.js; every entry is researched from museum, excavation or peer-reviewed sources.
// Pure helpers (no DOM, no network), tested in test/discoveries.test.mjs.

export const KINDS = {
  inscription: "Inscription", "royal-record": "Royal record", seal: "Seal or bulla", site: "Excavated site",
  artefact: "Artefact", manuscript: "Manuscript", method: "Scientific method"
};

// What each evidence status means. Shown on every card so a reader never mistakes "fits" for "proves".
export const STATUS = {
  corroborates: { label: "Corroborates", note: "Names or matches a biblical person, place or event, and most specialists accept the reading and date." },
  consistent: { label: "Consistent", note: "Fits the biblical account, but the link is indirect or partial." },
  debated: { label: "Debated", note: "Specialists disagree about its reading, date, authenticity or relevance. Both sides are given." },
  method: { label: "Method", note: "A scientific technique used to date or read evidence, with its precision and limits." }
};

export const DATING = {
  radiocarbon: "Radiocarbon", stratigraphy: "Stratigraphy", palaeography: "Palaeography", "ceramic-typology": "Pottery typology",
  dendrochronology: "Tree rings", "historical-synchronism": "Historical synchronism", numismatics: "Coins", astronomical: "Astronomy",
  archaeomagnetism: "Archaeomagnetism"
};

const ord = (b, c, v) => b * 1e6 + c * 1e3 + v;

/** Parse "Book.c.v", "Book.c.v-v2", "Book.c.v-c2.v2" or "Book.c" into { b, from, to } (orders), or null. */
export function parseRange(range, bookIndex) {
  const [from, to] = String(range).split("-");
  const [fb, fc, fv] = from.split("."), b = bookIndex(fb);
  if (b < 0 || !+fc) return null;
  const sv = fv ? +fv : 1;
  let tc = +fc, tv = fv ? +fv : 999;
  if (to) { const p = to.split("."); if (p.length >= 2) { tc = +p[p.length - 2]; tv = +p[p.length - 1]; } else tv = +p[0]; }
  return { b, from: ord(b, +fc, sv), to: ord(b, tc, tv) };
}

const touches = (d, test, bookIndex) => (d.passages || []).some(r => { const p = parseRange(r, bookIndex); return p && test(p); });

/** Discoveries linked to one verse. book is the 0-based index. */
export const forVerse = (list, book, chapter, verse, bookIndex) =>
  list.filter(d => touches(d, p => { const o = ord(book, chapter, verse); return o >= p.from && o <= p.to; }, bookIndex));

/** Discoveries linked to any verse of a chapter. */
export const forChapter = (list, book, chapter, bookIndex) =>
  list.filter(d => touches(d, p => p.from <= ord(book, chapter, 999) && p.to >= ord(book, chapter, 1), bookIndex));

/** Discoveries linked to any verse of a book. */
export const forBook = (list, book, bookIndex) => list.filter(d => touches(d, p => p.b === book, bookIndex));

export const forPerson = (list, slug) => list.filter(d => (d.people || []).includes(slug));
export const forPlace = (list, slug) => list.filter(d => d.location?.placeSlug === slug);

/** Discoveries whose object date falls in [a, b). */
export const inEra = (list, a, b) => list.filter(d => d.kind !== "method" && d.objectDate && d.objectDate.sort >= a && d.objectDate.sort < b).sort((x, y) => x.objectDate.sort - y.objectDate.sort);

/** Related entries: shared people, overlapping passages' books, or within 150 years. Best first. */
export function related(list, d, bookIndex, n = 4) {
  const books = new Set((d.passages || []).map(r => parseRange(r, bookIndex)?.b).filter(b => b != null));
  return list.filter(x => x.id !== d.id).map(x => {
    let s = (x.people || []).filter(p => (d.people || []).includes(p)).length * 3;
    s += (x.passages || []).filter(r => books.has(parseRange(r, bookIndex)?.b)).length ? 2 : 0;
    if (x.objectDate && d.objectDate && Math.abs(x.objectDate.sort - d.objectDate.sort) < 150) s += 1;
    if (x.kind === d.kind) s += 0.5;
    return [s, x];
  }).filter(([s]) => s > 1).sort((a, b) => b[0] - a[0]).slice(0, n).map(([, x]) => x);
}

/** Filter by kind, status and free text. */
export function filterList(list, { kind = "", status = "", q = "" } = {}) {
  const t = q.trim().toLowerCase();
  return list.filter(d => (!kind || d.kind === kind) && (!status || d.status === status) &&
    (!t || [d.name, d.summary, d.description, d.connection, d.found?.where, d.heldAt?.institution].join(" ").toLowerCase().includes(t)));
}

/**
 * Check an entry against the research rules. Returns a list of problems (empty when fine).
 * ctx: { bookIndex, people: Set of slugs, places: Set of slugs }
 */
export function validate(d, ctx) {
  const e = [];
  for (const k of ["id", "name", "kind", "summary", "description", "establishes", "limits", "status"]) if (!d[k]) e.push(`missing ${k}`);
  if (d.kind !== "method" && !d.connection) e.push("missing connection");
  if (d.id && !/^[a-z0-9-]+$/.test(d.id)) e.push("id must be kebab-case");
  if (d.kind && !KINDS[d.kind]) e.push(`unknown kind ${d.kind}`);
  if (d.status && !STATUS[d.status]) e.push(`unknown status ${d.status}`);
  if ((d.kind === "method") !== (d.status === "method")) e.push("methods, and only methods, have status method");
  if (!Array.isArray(d.sources) || d.sources.length < 2) e.push("needs at least two sources");
  (d.sources || []).forEach(s => { if (!/^https:\/\/[^\s]+$/.test(s.url || "")) e.push(`bad source url ${s.url}`); if (!s.title || !s.publisher) e.push("source needs title and publisher"); if (/wikipedia\.org/.test(s.url || "")) e.push("Wikipedia is not a citable source"); });
  if (d.image?.local) { for (const k of ["licenceUrl", "source"]) if (d.image[k] && !/^https:\/\/[^\s]+$/.test(d.image[k])) e.push(`bad image ${k} ${d.image[k]}`); if (!d.image.licence || !d.image.author) e.push("image needs licence and author"); }
  (d.passages || []).forEach(r => { if (!parseRange(r, ctx.bookIndex)) e.push(`bad passage ${r}`); });
  if (ctx.people) (d.people || []).forEach(p => { if (!ctx.people.has(p)) e.push(`unknown person ${p}`); });
  if (ctx.places && d.location?.placeSlug && !ctx.places.has(d.location.placeSlug)) e.push(`unknown place ${d.location.placeSlug}`);
  if (d.location && (Math.abs(d.location.lat) > 90 || Math.abs(d.location.lon) > 180)) e.push("bad coordinates");
  const words = [d.summary, d.description, d.connection, d.establishes].join(" ");
  if (/\bprove[sdn]?\b|\bproof\b/i.test(words)) e.push('uses "prove"; say what it establishes instead');
  return e;
}
