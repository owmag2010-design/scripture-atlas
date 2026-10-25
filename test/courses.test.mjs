import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COURSES, STATUS } from "../public/js/courses.js";
import { parseReference } from "../public/js/ref.js";
import { createStore, streakFrom } from "../public/js/store.js";

const index = JSON.parse(readFileSync(new URL("../public/data/index.json", import.meta.url), "utf8"));
const chapters = i => index.books[i].verses.length;
const verses = (b, c) => index.books[b].verses[c - 1];
const valid = s => {
  const r = parseReference(s, chapters);
  if (!r) return false;
  if (r.verse && r.verse > verses(r.book, r.chapter)) return false;
  if (r.verseEnd && r.verseEnd > verses(r.book, r.chapter)) return false;
  return true;
};

test("course and lesson ids are unique", () => {
  const ids = COURSES.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  COURSES.forEach(c => { const l = c.lessons.map(x => x.id); assert.equal(new Set(l).size, l.length, c.id); });
});

test("every course is labelled with a known editorial status", () => {
  COURSES.forEach(c => assert.ok(STATUS[c.status], c.id));
});

test("every lesson has objectives, readings, teaching, family text, discussion and a quiz", () => {
  for (const c of COURSES) for (const l of c.lessons) {
    const where = `${c.id}/${l.id}`;
    assert.ok(l.objectives.length >= 2, where);
    assert.ok(l.readings.length >= 1, where);
    assert.ok(l.body.length >= 2, where);
    assert.ok(l.family.length > 40, where);
    assert.ok(l.familyQuestions.length >= 1 && l.questions.length >= 1, where);
    assert.ok(l.quiz.length >= 3, where);
  }
});

test("every reading and quiz reference points at a real verse", () => {
  for (const c of COURSES) for (const l of c.lessons) {
    l.readings.forEach(r => assert.ok(valid(r), `${c.id}/${l.id} reading ${r}`));
    l.quiz.filter(q => q.ref).forEach(q => assert.ok(valid(q.ref), `${c.id}/${l.id} quiz ref ${q.ref}`));
  }
});

test("every quiz question has 3+ distinct options and a valid answer", () => {
  for (const c of COURSES) for (const l of c.lessons) for (const q of l.quiz) {
    assert.ok(q.options.length >= 3, q.q);
    assert.equal(new Set(q.options).size, q.options.length, q.q);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, q.q);
    assert.ok(q.explain, q.q);
  }
});

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test("lesson progress keeps the best score", () => {
  const s = createStore(memory());
  s.completeLesson("genesis", "creation", 2, 3, "2026-10-20");
  s.completeLesson("genesis", "creation", 1, 3, "2026-10-21");
  assert.equal(s.lessonResult("genesis", "creation").score, 2);
  s.completeLesson("genesis", "creation", 3, 3, "2026-10-22");
  assert.equal(s.lessonResult("genesis", "creation").score, 3);
  assert.equal(s.courseProgress("genesis", ["creation", "fall"]), 1);
});

test("study streak counts consecutive days, surviving until the day ends", () => {
  assert.equal(streakFrom(["2026-10-23", "2026-10-24", "2026-10-25"], "2026-10-25"), 3);
  assert.equal(streakFrom(["2026-10-23", "2026-10-24"], "2026-10-25"), 2);
  assert.equal(streakFrom(["2026-10-21", "2026-10-24"], "2026-10-25"), 1);
  assert.equal(streakFrom(["2026-10-20"], "2026-10-25"), 0);
  assert.equal(streakFrom(["2026-02-28", "2026-03-01"], "2026-03-01"), 2);
});
