// Turn a typed atlas query into a map view without AI when the intent is clear.
// "Where was Babylon?" → place; "Where did Abraham travel?" → journey; "Places in Daniel" → book;
// "Romans 16" → passage; "Discoveries at Lachish" → place (discoveries); anything else → { type: "ask" }.
// Pure; tested in test/atlas-query.test.mjs.

// People whose travels have a drawn journey. Slugs are Theographic.
export const PERSON_JOURNEYS = {
  abraham_58: ["abraham"], moses_2108: ["exodus"], jesus_905: ["jesus"], paul_2479: ["paul1", "paul2", "paul3", "rome"],
  zedekiah_1950: ["exile"], ezra_1245: ["return"], philip_2347: ["philip"], peter_2745: ["peter"]
};
// Everyday names for people whose dataset name differs ("Jesus Christ", "Simon Peter").
export const PERSON_ALIASES = { jesus: "jesus_905", christ: "jesus_905", peter: "peter_2745", "simon peter": "peter_2745", "saint paul": "paul_2479", "philip the evangelist": "philip_2347", nebuchadnezzar: "nebuchadnezzar_2167" };

const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const hasWord = (text, name) => (" " + text + " ").includes(" " + name + " ");

/**
 * ctx: { people: rows [slug, name, aliases, desc, sex, verses], places: rows [slug, name, lat, lon, type, cls, verses],
 *        journeys, names (book names), books (BOOKS), discoveries, periods, parseRef(text) → ref|null }
 */
export function resolveQuery(q, ctx) {
  const t = norm(q);
  if (!t) return { type: "none" };
  // 1. A Bible reference: "Acts 13", "Genesis 12:1-9".
  if (/\d/.test(q)) { const ref = ctx.parseRef(q.trim()); if (ref) return { type: "passage", ref }; }
  // 2. A journey by id or title words.
  const j = ctx.journeys.find(x => t === x.id || t === norm(x.title) || (t.length > 5 && norm(x.title).includes(t)));
  if (j) return { type: "journey", id: j.id };
  // 3. A period by name.
  const per = (ctx.periods || []).find(p => t === norm(p.name) || (t.length > 5 && norm(p.name).includes(t)));
  if (per) return { type: "period", id: per.id };
  // 4. A discovery by name (when not phrased as a question about a place).
  const disc = (ctx.discoveries || []).find(d => t.includes(norm(d.name)) && norm(d.name).length > 6);
  if (disc && !/\b(at|in|near|from)\b/.test(t)) return { type: "discovery", id: disc.id };

  const wantsTravel = /\b(travel|travelled|traveled|journey|journeys|go|went|visit|visited|walk|walked|preach|preached|ministry)\b/.test(t);
  const wantsDiscoveries = /\b(archaeolog\w*|discover\w*|excavat\w*|inscription\w*|finds?)\b/.test(t);
  const wantsPlace = /\b(where (is|was)|located|location of|events? (happened|took place)|happened in|at|in)\b/.test(t) || wantsDiscoveries;

  // Reasoning questions ("why…", "how…", "explain…") need the AI assistant, not a lookup.
  if (/^(why|how|explain|what does|what did|what is the meaning|what was the purpose)\b/.test(t) && !wantsTravel && !/\bwhere\b/.test(t)) return { type: "ask" };
  // 5. A book of the Bible: "places in Daniel", "kingdoms mentioned in Daniel", or just "Daniel" when no person matches better.
  const bookHit = ctx.names.map((n, i) => [norm(n), i]).filter(([n]) => hasWord(t, n)).sort((a, b) => b[0].length - a[0].length)[0];
  const bookAsked = bookHit && /\b(places|kingdoms|nations|cities|map|geography|mentioned|book of)\b/.test(t);
  if (bookAsked) return { type: "book", osis: ctx.books[bookHit[1]].osis };

  // 6. Best person and best place named in the query (longest name, then most verses).
  const best = (rows, ok = () => true) => rows.filter(r => r[1] && r[1].length > 2 && ok(r)).map(r => [norm(r[1]), r]).filter(([n]) => hasWord(t, n))
    .sort((a, b) => b[0].length - a[0].length || b[1].at(-1) - a[1].at(-1))[0]?.[1];
  const alias = Object.keys(PERSON_ALIASES).filter(a => hasWord(t, a)).sort((a, b) => b.length - a.length)[0];
  const person = (alias && ctx.people.find(r => r[0] === PERSON_ALIASES[alias])) || best(ctx.people, r => r[5] >= 3 && r[0] !== "god_1324");
  const place = best(ctx.places, r => r[2] != null);

  if (person && (wantsTravel || !place) && !(place && wantsPlace && !wantsTravel)) {
    const js = PERSON_JOURNEYS[person[0]];
    if (js && wantsTravel && js.length === 1) return { type: "journey", id: js[0] };
    return { type: "person", slug: person[0] };
  }
  if (place) return { type: "place", slug: place[0], focus: wantsDiscoveries ? "discoveries" : "" };
  if (bookHit) return { type: "book", osis: ctx.books[bookHit[1]].osis };
  return { type: "ask" };
}
