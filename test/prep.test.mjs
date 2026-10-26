import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPrep, newPrep, outlineDoc, slides, doneCount, STEPS } from "../public/js/prep-core.js";

test("cleanPrep tolerates damaged records and drops unsafe links", () => {
  const p = cleanPrep({ steps: { read: { done: 1, notes: 5 }, bogus: {} }, idea: 7, points: [{ text: "One", blocks: [{ kind: "evil", text: "x", href: "javascript:alert(1)" }, null] }], inbox: "no" }, "John.1.1-18", "John 1:1–18");
  assert.equal(p.steps.read.done, true);
  assert.equal(p.steps.read.notes, "");
  assert.ok(!("bogus" in p.steps));
  assert.equal(p.idea, "");
  assert.equal(p.points[0].blocks.length, 1);
  assert.equal(p.points[0].blocks[0].kind, "note");
  assert.equal(p.points[0].blocks[0].href, "");
  assert.deepEqual(p.inbox, []);
});

test("outlineDoc lists sources once and keeps study notes out of handouts", () => {
  const p = newPrep("John.1.1-18", "John 1:1–18");
  p.idea = "The Word became flesh";
  p.points = [{ id: "a", text: "The Word was God", blocks: [{ kind: "verse", text: "In the beginning was the Word", cite: "John 1:1 (KJV)" }, { kind: "commentary", text: "He who is to God…", cite: "JFB, on John 1:1" }] },
    { id: "b", text: "The Word became flesh", blocks: [{ kind: "verse", text: "And the Word was made flesh", cite: "John 1:14 (KJV)" }, { kind: "verse", text: "x", cite: "John 1:1 (KJV)" }] }];
  p.steps.observe = { done: true, notes: "Light and darkness repeat" };
  const full = outlineDoc(p, { translation: "KJV" }), hand = outlineDoc(p, { translation: "KJV", forHandout: true });
  assert.ok(full.some(b => b.text === "Light and darkness repeat"));
  assert.ok(!hand.some(b => b.text === "Light and darkness repeat"));
  assert.equal(full.filter(b => b.type === "bullet" && b.text === "John 1:1 (KJV)").length, 1);
  assert.equal(doneCount(p), 1);
  const s = slides(p, "John 1:1–18");
  assert.equal(s.length, 3);
  assert.equal(s[1].scripture.length, 1);
  assert.equal(s[1].notes[0].kind, "commentary");
  assert.equal(STEPS.length, 8);
});
