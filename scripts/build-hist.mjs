// Builds people, places, events, verse links and the base map into public/data/hist.
// Sources: Theographic Bible Metadata (CC BY-SA 4.0, Robert Rouse; place coordinates from OpenBible.info, CC BY;
// dictionary text from Easton's Bible Dictionary, 1897, public domain). Base map: Natural Earth, public domain.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { BOOKS, fileId } from "../public/js/books.js";
import { precisionClass, cleanDict, describePerson, clipRing, clipLine, simplify } from "./hist-parse.mjs";
import { MAP_BOX } from "../public/js/history.js";

const raw = new URL("../raw/", import.meta.url);
const out = new URL("../public/data/hist/", import.meta.url);
const J = p => JSON.parse(readFileSync(new URL(p, raw), "utf8"));
rmSync(out, { recursive: true, force: true });
mkdirSync(new URL("people/", out), { recursive: true });
mkdirSync(new URL("places/", out), { recursive: true });
mkdirSync(new URL("vx/", out), { recursive: true });

const osisIdx = new Map(BOOKS.map(b => [b.osis, b.i]));
const packOsis = o => { const m = o.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/); return m && osisIdx.has(m[1]) ? osisIdx.get(m[1]) * 1e6 + +m[2] * 1e3 + +m[3] : null; };

const verses = J("theo/verses.json");
const verseRef = new Map(verses.map(v => [v.id, packOsis(v.fields.osisRef)]));
const people = J("theo/people.json").filter(p => p.fields.status !== "draft");
const places = J("theo/places.json");
const events = J("theo/events.json");
const groups = J("theo/peopleGroups.json");

const personSlug = new Map(people.map(p => [p.id, p.fields.slug]));
const personName = new Map(people.map(p => [p.id, p.fields.displayTitle || p.fields.name]));
const placeName = new Map(places.map(p => [p.id, p.fields.displayTitle]));
const placeSlug = new Map(places.map(p => [p.id, p.fields.slug]));
const eventId = new Map(events.map(e => [e.id, e.fields.eventID]));
const eventTitle = new Map(events.map(e => [e.fields.title, e.fields.eventID]));
const groupName = new Map(groups.map(g => [g.id, g.fields.groupName]));
const refs = ids => [...new Set((ids || []).map(id => verseRef.get(id)).filter(n => n != null))].sort((a, b) => a - b);
const slugs = (ids, map) => (ids || []).map(id => map.get(id)).filter(Boolean);
const list = v => (Array.isArray(v) ? v : typeof v === "string" ? v.split(/\s*,\s*/).filter(Boolean) : []);
const num = s => (s === undefined || s === null || s === "" || isNaN(+s) ? null : +s);
const shardOf = slug => (slug[0] || "_").toLowerCase().replace(/[^a-z]/, "_");

// Curated notes where Scripture records more than one account (never silently harmonised).
const NOTES = {
  jesus_905: "Matthew and Luke present Joseph as Jesus' legal father while describing his conception by the Holy Spirit (Matthew 1:18–25; Luke 1:26–38; 3:23). Matthew 1 and Luke 3 give two different genealogies.",
  joseph_1715: "Matthew 1:16 names Jacob as Joseph's father; Luke 3:23 names Heli. Interpreters explain the two genealogies differently, for example as Joseph's and Mary's lines, or through a levirate marriage.",
  heli_1527: "Luke 3:23 names Heli in Joseph's line; Matthew 1:16 names Jacob. See the note on Joseph."
};

// ---- people ----
const pIndex = [], pShards = {};
for (const p of people) {
  const f = p.fields;
  const entry = {
    name: f.displayTitle || f.name, also: f.alsoCalled || "", gender: f.gender || "",
    desc: describePerson(f, id => personName.get(id)),
    father: slugs(f.father, personSlug), mother: slugs(f.mother, personSlug),
    siblings: slugs(f.siblings, personSlug), half: slugs([...(f.halfSiblingsSameFather || []), ...(f.halfSiblingsSameMother || [])], personSlug),
    children: slugs(f.children, personSlug), partners: slugs(f.partners, personSlug),
    born: num(f.birthYear), died: num(f.deathYear),
    bornAt: slugs(f.birthPlace, placeSlug)[0] || null, diedAt: slugs(f.deathPlace, placeSlug)[0] || null,
    groups: (f.memberOf || []).map(id => groupName.get(id)).filter(Boolean),
    events: list(f.events).map(id => eventId.get(id) ?? (eventTitle.get(id))).filter(Boolean),
    verses: refs(f.verses),
    dict: cleanDict([].concat(f.dictText || f.dictionaryText || []).join(" ")).slice(0, 4000),
    note: NOTES[f.slug] || ""
  };
  pIndex.push([f.slug, entry.name, entry.also, entry.desc, entry.gender[0] || "", entry.verses.length]);
  (pShards[shardOf(f.slug)] ??= {})[f.slug] = entry;
}
pIndex.sort((a, b) => b[5] - a[5]);
writeFileSync(new URL("people.json", out), JSON.stringify(pIndex));
for (const [k, v] of Object.entries(pShards)) writeFileSync(new URL(`people/${k}.json`, out), JSON.stringify(v));

// ---- places ----
const plIndex = [], plShards = {};
for (const p of places) {
  const f = p.fields;
  const lat = num(f.latitude), lon = num(f.longitude);
  const cls = precisionClass(f.precision, lat != null && lon != null);
  const entry = {
    name: f.displayTitle, kjv: f.kjvName || "", other: list(f.otherNames).map(x => (/^rec[A-Za-z0-9]{10,}$/.test(x) ? placeName.get(x) : x)).filter(Boolean).filter(x => x !== f.displayTitle).join(", "), type: f.featureType || "", sub: f.featureSubType || "",
    lat, lon, cls, comment: f.comment || "",
    verses: refs(f.verses), events: (f.eventsHere || []).map(id => eventId.get(id)).filter(Boolean),
    born: slugs(f.peopleBorn, personSlug), died: slugs(f.peopleDied, personSlug),
    partOf: slugs(f.partOf, placeSlug), dict: cleanDict([].concat(f.dictText || f.dictionaryText || []).join(" ")).slice(0, 3000)
  };
  plIndex.push([f.slug, entry.name, cls === "unknown" ? null : lat, cls === "unknown" ? null : lon, entry.type, cls, entry.verses.length]);
  (plShards[shardOf(f.slug)] ??= {})[f.slug] = entry;
}
plIndex.sort((a, b) => b[6] - a[6]);
writeFileSync(new URL("places.json", out), JSON.stringify(plIndex));
for (const [k, v] of Object.entries(plShards)) writeFileSync(new URL(`places/${k}.json`, out), JSON.stringify(v));

// ---- events ----
const evOut = events.map(e => {
  const f = e.fields, r = refs(f.verses);
  const yr = /^-?\d{1,4}(-\d\d){0,2}$/.test(f.startDate || "") ? parseInt(f.startDate, 10) : null;
  return { id: f.eventID, title: f.title, year: yr, dur: f.duration || "", sort: f.sortKey ?? num(f.startDate),
    people: slugs(f.participants, personSlug), places: slugs(f.locations, placeSlug), first: r[0] ?? null, last: r[r.length - 1] ?? null, n: r.length,
    partOf: (f.partOf || []).map(id => eventId.get(id)).filter(Boolean) };
}).sort((a, b) => a.sort - b.sort);
writeFileSync(new URL("events.json", out), JSON.stringify(evOut));

// ---- verse → people, places, events ----
const vx = BOOKS.map(() => ({}));
let linked = 0;
for (const v of verses) {
  const k = verseRef.get(v.id); if (k == null) continue;
  const f = v.fields;
  const ps = slugs(f.people, personSlug), ls = slugs(f.places, placeSlug), es = (f.event || []).map(id => eventId.get(id)).filter(Boolean);
  if (ps.length || ls.length || es.length) { vx[Math.floor(k / 1e6)][k] = [[...new Set(ps)], [...new Set(ls)], es]; linked++; }
}
vx.forEach((o, i) => writeFileSync(new URL(`vx/${fileId(i)}.json`, out), JSON.stringify(o)));

// ---- base map ----
const box = MAP_BOX;
const land = [], rivers = [], lakes = [];
const polys = g => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const lines = g => (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []);
for (const feat of J("ne/ne_50m_land.geojson").features) for (const poly of polys(feat.geometry)) { const r = simplify(clipRing(poly[0], box)); if (r.length > 3) land.push(r); }
for (const feat of J("ne/ne_50m_lakes.geojson").features) for (const poly of polys(feat.geometry)) { const r = simplify(clipRing(poly[0], box), 0.03); if (r.length > 3) lakes.push(r); }
for (const feat of J("ne/ne_50m_rivers_lake_centerlines.geojson").features) for (const ln of lines(feat.geometry)) for (const run of clipLine(ln, box)) { const r = simplify(run, 0.05); if (r.length > 1) rivers.push(r); }
writeFileSync(new URL("basemap.json", out), JSON.stringify({ box, land, lakes, rivers, source: "Natural Earth, public domain" }));

console.log(`people ${pIndex.length}, places ${plIndex.length} (plotted ${plIndex.filter(p => p[2] != null).length}), events ${evOut.length}, verses linked ${linked}`);
console.log(`basemap: land ${land.length}, lakes ${lakes.length}, rivers ${rivers.length}`);
