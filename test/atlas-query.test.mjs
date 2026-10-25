import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveQuery, PERSON_JOURNEYS, PERSON_ALIASES } from "../public/js/atlas-query.js";
import { JOURNEYS } from "../public/js/journeys.js";
import { BOOKS, NAMES } from "../public/js/books.js";
import { parseReference } from "../public/js/ref.js";

const J = f => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url)));
const people = J("hist/people.json"), places = J("hist/places.json"), index = J("index.json");
const ctx = { people, places, journeys: JOURNEYS, names: NAMES, books: BOOKS, discoveries: [{ id: "tel-dan-stele", name: "Tel Dan Stele" }], periods: [{ id: "assyria", name: "Assyrian Empire" }], parseRef: q => parseReference(q, i => index.books[i].verses.length) };
const r = q => resolveQuery(q, ctx);

test("the brief's example questions resolve to map views", () => {
  assert.deepEqual(r("Where did Abraham travel?"), { type: "journey", id: "abraham" });
  assert.deepEqual(r("Show me the places Jesus visited"), { type: "journey", id: "jesus" });
  assert.equal(r("Where was Babylon?").slug, "babylon_151");
  assert.deepEqual(r("Where did Paul preach?"), { type: "person", slug: "paul_2479" });
  assert.equal(r("Which biblical events happened in Jerusalem?").slug, "jerusalem_636");
  assert.deepEqual(r("Show the kingdoms mentioned in Daniel"), { type: "book", osis: "Dan" });
  assert.deepEqual(r("What archaeological discoveries are associated with Jericho?"), { type: "place", slug: "jericho_634", focus: "discoveries" });
});

test("references, journeys, periods and discoveries are recognised; unclear questions go to the AI", () => {
  assert.equal(r("Acts 13").type, "passage");
  assert.deepEqual(r("The Exodus"), { type: "journey", id: "exodus" });
  assert.deepEqual(r("assyrian empire"), { type: "period", id: "assyria" });
  assert.deepEqual(r("tel dan stele"), { type: "discovery", id: "tel-dan-stele" });
  assert.equal(r("Why did God choose Israel?").type, "ask");
});

test("journey and alias tables point at real people and journeys", () => {
  const slugs = new Set(people.map(p => p[0]));
  for (const [s, js] of Object.entries(PERSON_JOURNEYS)) { assert.ok(slugs.has(s), s); js.forEach(j => assert.ok(JOURNEYS.some(x => x.id === j), j)); }
  for (const s of Object.values(PERSON_ALIASES)) assert.ok(slugs.has(s), s);
});
