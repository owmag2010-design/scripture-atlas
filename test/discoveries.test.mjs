import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRange, forVerse, forChapter, forBook, forPerson, inEra, related, filterList, validate } from "../public/js/discoveries.js";
import { DISCOVERIES } from "../public/js/discoveries-data.js";
import { BOOKS } from "../public/js/books.js";

const bi = code => BOOKS.findIndex(b => b.osis === code);
const fx = [
  { id: "a", name: "Alpha stele", kind: "inscription", status: "corroborates", summary: "s", description: "d", connection: "c", establishes: "e", limits: "l", objectDate: { sort: -840 }, passages: ["2Kgs.9.14-9.29", "2Chr.22.5"], people: ["jehu"], sources: [{ title: "t", publisher: "p", url: "https://x.org/a" }, { title: "t", publisher: "p", url: "https://x.org/b" }] },
  { id: "b", name: "Beta prism", kind: "royal-record", status: "consistent", summary: "s", description: "Mentions Hezekiah", connection: "c", establishes: "e", limits: "l", objectDate: { sort: -690 }, passages: ["2Kgs.18.13-19.37"], people: ["hezekiah"], sources: [] },
  { id: "c", name: "Gamma method", kind: "method", status: "method", summary: "s", description: "d", establishes: "e", limits: "l", passages: [], sources: [] }
];

test("ranges parse single verses, verse spans, cross-chapter spans and whole chapters", () => {
  const g = bi("2Kgs");
  assert.deepEqual(parseRange("2Kgs.9.14-9.29", bi), { b: g, from: g * 1e6 + 9014, to: g * 1e6 + 9029 });
  assert.deepEqual(parseRange("2Kgs.9.14-29", bi), { b: g, from: g * 1e6 + 9014, to: g * 1e6 + 9029 });
  assert.equal(parseRange("2Kgs.18", bi).to, g * 1e6 + 18999);
  assert.equal(parseRange("Nope.1.1", bi), null);
});

test("discoveries are found by verse, chapter, book, person and era", () => {
  const g = bi("2Kgs");
  assert.deepEqual(forVerse(fx, g, 9, 20, bi).map(d => d.id), ["a"]);
  assert.deepEqual(forVerse(fx, g, 19, 35, bi).map(d => d.id), ["b"]);
  assert.deepEqual(forVerse(fx, g, 9, 30, bi).map(d => d.id), []);
  assert.deepEqual(forChapter(fx, g, 19, bi).map(d => d.id), ["b"]);
  assert.deepEqual(forBook(fx, bi("2Chr"), bi).map(d => d.id), ["a"]);
  assert.deepEqual(forPerson(fx, "hezekiah").map(d => d.id), ["b"]);
  assert.deepEqual(inEra(fx, -900, -700).map(d => d.id), ["a"]);
  assert.deepEqual(filterList(fx, { q: "hezekiah" }).map(d => d.id), ["b"]);
  assert.deepEqual(filterList(fx, { kind: "method" }).map(d => d.id), ["c"]);
  assert.deepEqual(related(fx, fx[0], bi).map(d => d.id), ["b"]);
});

test("validation catches missing sources, bad passages, unknown people and 'proves'", () => {
  const ctx = { bookIndex: bi, people: new Set(["jehu"]), places: new Set() };
  assert.deepEqual(validate(fx[0], ctx), []);
  const bad = { ...fx[0], summary: "This proves the Bible", passages: ["Xyz.1.1"], people: ["nobody"], sources: [{ title: "t", publisher: "p", url: "https://en.wikipedia.org/wiki/X" }] };
  const errs = validate(bad, ctx).join(" | ");
  for (const m of ["at least two sources", "bad passage", "unknown person", "Wikipedia", "prove"]) assert.match(errs, new RegExp(m));
});

test("every published discovery meets the research rules", () => {
  const people = new Set(JSON.parse(readFileSync(new URL("../public/data/hist/people.json", import.meta.url))).map(p => p[0]));
  const places = new Set(JSON.parse(readFileSync(new URL("../public/data/hist/places.json", import.meta.url))).map(p => p[0]));
  const ids = new Set();
  for (const d of DISCOVERIES) {
    assert.ok(!ids.has(d.id), `duplicate id ${d.id}`); ids.add(d.id);
    assert.deepEqual(validate(d, { bookIndex: bi, people, places }), [], d.id);
  }
});
