import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReference, formatRef, toOsis, fromOsis, findBook } from "../public/js/ref.js";

// chapters per book (KJV) for range checks
const CH = { 18: 150, 42: 21, 64: 1, 56: 1, 30: 1 };
const chapters = i => CH[i] ?? 50;

const r = (q) => parseReference(q, chapters);

test("full names with chapter and verse", () => {
  assert.deepEqual(r("John 3:16"), { book: 42, chapter: 3, verse: 16, verseEnd: null });
  assert.deepEqual(r("Genesis 1"), { book: 0, chapter: 1, verse: null, verseEnd: null });
  assert.deepEqual(r("Song of Solomon 2:4"), { book: 21, chapter: 2, verse: 4, verseEnd: null });
});

test("abbreviations, periods and spacing", () => {
  assert.equal(r("jn 3 16").book, 42);
  assert.equal(r("Gen. 1:1").book, 0);
  assert.equal(r("1 cor 13").book, 45);
  assert.equal(r("1Cor 13:4").book, 45);
  assert.equal(r("Ps 23").book, 18);
  assert.equal(r("psalm 23").book, 18);
  assert.equal(r("Rev 21:4").book, 65);
  assert.equal(r("Phil 2:5").book, 49);
  assert.equal(r("Phlm 1:16").book, 56);
});

test("numbered books written with roman numerals or words", () => {
  assert.equal(r("II Kings 2").book, 11);
  assert.equal(r("first john 4:8").book, 61);
  assert.equal(r("III John 4").book, 63);
});

test("verse ranges", () => {
  assert.deepEqual(r("Gen 1:1-5"), { book: 0, chapter: 1, verse: 1, verseEnd: 5 });
  assert.deepEqual(r("Mat 5:3–12"), { book: 39, chapter: 5, verse: 3, verseEnd: 12 });
});

test("single-chapter books treat a lone number as a verse", () => {
  assert.deepEqual(r("Jude 3"), { book: 64, chapter: 1, verse: 3, verseEnd: null });
  assert.deepEqual(r("Philemon 16"), { book: 56, chapter: 1, verse: 16, verseEnd: null });
});

test("a bare book name opens chapter 1", () => {
  assert.deepEqual(r("Romans"), { book: 44, chapter: 1, verse: null, verseEnd: null });
});

test("rejects things that are not references", () => {
  assert.equal(r("faith"), null);
  assert.equal(r("love one another"), null);
  assert.equal(r("John 99"), null);
  assert.equal(r("Psalm 151"), null);
  assert.equal(r(""), null);
  assert.equal(r("in the beginning"), null);
});

test("ambiguous prefixes are not guessed", () => {
  assert.equal(findBook("j"), -1);
  assert.equal(findBook("ph"), -1);
  assert.equal(findBook("joh"), 42);
});

test("OSIS round trip and display format", () => {
  assert.equal(toOsis(42, 3, 16), "John.3.16");
  assert.deepEqual(fromOsis("1Cor.13.4"), { book: 45, chapter: 13, verse: 4 });
  assert.equal(fromOsis("Nope.1.1"), null);
  assert.equal(formatRef(18, 23), "Psalm 23");
  assert.equal(formatRef(42, 3, 16), "John 3:16");
  assert.equal(formatRef(0, 1, 1, 5), "Genesis 1:1–5");
});
