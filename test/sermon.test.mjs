import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normaliseSpoken, sermonRefs, checkOutline, sermonMarkdown } from "../public/js/sermon.js";
import { formatRef, parseReference } from "../public/js/ref.js";

const index = JSON.parse(readFileSync(new URL("../public/data/index.json", import.meta.url)));
const cc = i => index.books[i].verses.length;
const labels = t => sermonRefs(t, cc).map(r => formatRef(r.book, r.chapter, r.verse, r.verseEnd));

test("spoken references become written ones", () => {
  assert.equal(normaliseSpoken("turn with me to John chapter three verse sixteen"), "turn with me to John 3:16");
  assert.equal(normaliseSpoken("first Corinthians chapter thirteen verses four to seven"), "1 Corinthians 13:4-7");
  assert.equal(normaliseSpoken("Psalm one hundred and nineteen verse one hundred and five"), "Psalm 119:105");
  assert.equal(normaliseSpoken("Romans eight verse twenty-eight"), "Romans 8:28");
  assert.equal(normaliseSpoken("Psalm one hundred and nineteen verse one hundred and five, thy word"), "Psalm 119:105, thy word");
});

test("references are found in a natural transcript, in order", () => {
  const t = "Good morning church. Our text today is Romans chapter eight, verse twenty eight. Paul also writes in Philippians 4:13 that we can do all things. Later, first John chapter four verse eight reminds us God is love.";
  assert.deepEqual(labels(t), ["Romans 8:28", "Philippians 4:13", "1 John 4:8"]);
});

test("ordinary numbers in speech are not mistaken for references", () => {
  assert.deepEqual(labels("We had twenty three people at the picnic and three cakes."), []);
});

test("the outline check keeps verbatim quotes and real references only", () => {
  const transcript = "God works all things together for good, even the hard days.";
  const real = r => !!parseReference(r, cc);
  const { outline, dropped } = checkOutline({ title: "Good", points: [{ heading: "All things", summary: "s", quote: "works all things together for good" }, { heading: "Made up", summary: "s", quote: "a sentence nobody said" }], scriptures: ["Romans 8:28", "Hezekiah 3:1"], questions: ["Q?"], application: ["A"] }, transcript, real);
  assert.equal(outline.points[0].quote, "works all things together for good");
  assert.equal(outline.points[1].quote, "");
  assert.deepEqual(outline.scriptures, ["Romans 8:28"]);
  assert.equal(dropped.length, 2);
  const md = sermonMarkdown({ title: "Good", transcript, refs: ["Romans 8:28"], outline });
  assert.match(md, /AI-generated outline/);
  assert.match(md, /## Transcript\nGod works/);
});
