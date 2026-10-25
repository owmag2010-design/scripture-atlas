import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildWebBook } from "../scripts/build-data.mjs";
import { fileId } from "../public/js/books.js";

const load = p => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), "utf8"));
const index = load("index.json");
const book = (t, i) => load(`${t}/${fileId(i)}.json`);

test("index lists 66 books and both translations with licences", () => {
  assert.equal(index.books.length, 66);
  assert.deepEqual(index.translations.map(t => t.id), ["kjv", "web"]);
  index.translations.forEach(t => { assert.ok(t.licence); assert.ok(t.url); assert.ok(t.checksum); });
});

test("KJV has the standard 1,189 chapters and 31,102 verses with no blanks", () => {
  let chapters = 0, verses = 0;
  for (let i = 0; i < 66; i++) {
    const b = book("kjv", i);
    chapters += b.chapters.length;
    b.chapters.forEach(c => c.forEach(v => { verses++; assert.ok(v.length > 0); }));
  }
  assert.equal(chapters, 1189);
  assert.equal(verses, 31102);
});

test("both translations agree on chapter counts for every book", () => {
  for (let i = 0; i < 66; i++) assert.equal(book("web", i).chapters.length, book("kjv", i).chapters.length, `book ${i}`);
});

test("WEB verse-count differences are only the known Romans doxology placement", () => {
  const diffs = [];
  for (let i = 0; i < 66; i++) {
    const k = book("kjv", i).chapters, w = book("web", i).chapters;
    k.forEach((c, ci) => { if (c.length !== w[ci].length) diffs.push(`${i}:${ci + 1}`); });
  }
  assert.deepEqual(diffs, ["44:14", "44:16"]);
});

test("verses absent from the WEB base text are exactly the expected set", () => {
  const empty = [];
  for (let i = 0; i < 66; i++) book("web", i).chapters.forEach((c, ci) => c.forEach((v, vi) => { if (!v) empty.push(`${i}.${ci + 1}.${vi + 1}`); }));
  assert.deepEqual(empty, ["41.17.36", "43.8.37", "43.15.34", "43.24.7", "44.16.25"]);
});

test("spot-check well-known verses against the source text", () => {
  assert.equal(book("kjv", 0).chapters[0][0], "In the beginning God created the heaven and the earth.");
  assert.match(book("kjv", 42).chapters[2][15], /^For God so loved the world/);
  assert.match(book("web", 42).chapters[2][15], /^For God so loved the world, that he gave his one and only Son/);
  assert.match(book("web", 18).chapters[22][0], /^Yahweh is my shepherd/);
});

test("WEB builder keeps paragraphs and poetry lines", () => {
  const out = buildWebBook([
    { type: "paragraph start" },
    { type: "paragraph text", chapterNumber: 1, verseNumber: 1, value: "First verse. " },
    { type: "paragraph text", chapterNumber: 1, verseNumber: 2, value: "Second " },
    { type: "paragraph end" },
    { type: "paragraph start" },
    { type: "paragraph text", chapterNumber: 1, verseNumber: 2, value: "continues." },
    { type: "stanza start" },
    { type: "line text", chapterNumber: 1, verseNumber: 3, value: "Line one" },
    { type: "line break" },
    { type: "line text", chapterNumber: 1, verseNumber: 3, value: "line two" },
    { type: "header", value: "ignored" }
  ]);
  assert.deepEqual(out.chapters, [["First verse.", "Second continues.", "Line one\nline two"]]);
  assert.deepEqual(out.paragraphs, [[0, 2]]);
});
