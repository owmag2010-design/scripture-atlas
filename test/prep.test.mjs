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

import { clauses, linkCounts, seriesIcs, addDays } from "../public/js/prep-core.js";
test("clauses split at strong punctuation and before linking words", () => {
  const c = clauses([[16, "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."]]);
  assert.equal(c[0].verse, 16);
  assert.equal(c[0].link, "for");
  assert.ok(c.some(x => x.link === "that" && x.indent === 1));
  assert.ok(c.some(x => x.link === "but"));
  assert.deepEqual(linkCounts(c).map(x => x[0]).slice(0, 1), ["that"]);
});
test("seriesIcs writes one all-day event per week and escapes text", () => {
  const ics = seriesIcs("Gospel; of John", [{ date: "2026-11-01", label: "John 1:1–18", title: "The Word", url: "https://ereunia.com/prepare/John.1.1-18" }, { date: addDays("2026-11-01", 7), label: "John 1:19–34" }], "20261027T000000Z");
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(ics, /DTSTART;VALUE=DATE:20261101/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261108/);
  assert.ok(ics.includes("SUMMARY:Gospel\\; of John: The Word"));
  assert.match(ics, /\r\n$/);
});

import { cleanSeries, weekDates, preachedLog } from "../public/js/prep-core.js";
test("cleanSeries drops bad ids, bad passages and odd intervals; weekDates steps by the interval", () => {
  assert.equal(cleanSeries({ id: "../x" }), null);
  const s = cleanSeries({ id: "abc123", title: "", start: "2026-11-01", every: 3, weeks: [{ spec: "John.1.1-18", title: "The Word" }, { spec: "javascript:x" }] });
  assert.equal(s.title, "Untitled series"); assert.equal(s.every, 7);
  assert.equal(s.weeks[1].spec, "");
  assert.deepEqual(weekDates(s), ["2026-11-01", "2026-11-08"]);
  assert.deepEqual(weekDates({ ...s, start: "" }), ["", ""]);
});
test("preachedLog lists every occasion newest first", () => {
  const log = preachedLog([{ key: "a", title: "A", preached: [{ date: "2025-01-05", where: "" }] }, { key: "b", title: "B", preached: [{ date: "2026-02-01", where: "Evening" }, { date: "2024-03-03", where: "" }] }]);
  assert.deepEqual(log.map(x => x.date), ["2026-02-01", "2025-01-05", "2024-03-03"]);
  assert.equal(log[0].title, "B");
});
