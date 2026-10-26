import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../public/js/store.js";

const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test("trail records steps, skips immediate repeats and caps length", () => {
  const s = createStore(mem());
  s.trailAdd({ kind: "verse", label: "John 1:1", href: "/read/kjv/John.1.1" });
  s.trailAdd({ kind: "verse", label: "John 1:1", href: "/read/kjv/John.1.1" });
  s.trailAdd({ kind: "word", label: "logos", href: "/word/G3056" });
  assert.equal(s.trailSteps().length, 2);
  for (let i = 0; i < 100; i++) s.trailAdd({ kind: "page", label: "p" + i, href: "/x/" + i });
  assert.equal(s.trailSteps().length, 80);
  s.trailAdd({ label: "no href" }); assert.equal(s.trailSteps().length, 80);
});

test("saved trails keep a copy, and the current trail can start again", () => {
  const s = createStore(mem());
  s.trailAdd({ kind: "verse", label: "Ps 23:1", href: "/read/kjv/Ps.23.1" });
  const t = s.saveTrail("Shepherd");
  s.trailClear();
  assert.equal(s.trailSteps().length, 0);
  assert.equal(s.trail(t.id).steps.length, 1);
  s.removeTrail(t.id); assert.equal(s.trails().length, 0);
});

test("backup and restore round-trip, merge and replace", () => {
  const a = createStore(mem());
  a.setNote("John.1.1", "Word"); a.toggleBookmark("Gen.1.1");
  const b = createStore(mem()); b.setNote("Ps.23.1", "Shepherd");
  b.restore(a.backup());
  assert.equal(b.note("John.1.1"), "Word"); assert.equal(b.note("Ps.23.1"), "Shepherd");
  const c = createStore(mem()); c.setNote("Ps.23.1", "Shepherd");
  c.restore(a.backup(), { merge: false });
  assert.equal(c.note("Ps.23.1"), ""); assert.ok(c.isBookmarked("Gen.1.1"));
});

test("restore rejects other files and does not pollute prototypes", () => {
  const s = createStore(mem());
  assert.throws(() => s.restore({ hello: 1 }), /not an Ereunia backup/);
  s.restore(JSON.parse('{"app":"ereunia","data":{"version":1,"notes":{"__proto__":{"polluted":1},"John.1.1":{"text":"x"}}}}'));
  assert.equal(({}).polluted, undefined);
  assert.equal(s.note("John.1.1"), "x");
});
