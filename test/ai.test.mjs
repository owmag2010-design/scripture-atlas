import { test } from "node:test";
import assert from "node:assert/strict";
import { findRefs, quotesIn, parseModelJson, verifyAnswer, isEmpty } from "../public/js/ai-core.js";

const chapters = i => ({ 42: 21, 61: 5, 0: 50, 44: 16 }[i] ?? 30);
const sources = [
  { id: "S1", type: "scripture", label: "John 3:16 (KJV)", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { id: "S2", type: "translation", label: "John 3:16 (WEB)", text: "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life." },
  { id: "S3", type: "editorial", label: "Book background: John", text: "Traditionally John son of Zebedee; c. AD 90–100." }
];

test("finds references inside a question", () => {
  const r = findRefs("What does John 3:16 mean, and how does 1 John 4:8 relate?", chapters);
  assert.deepEqual(r.map(x => [x.book, x.chapter, x.verse]), [[42, 3, 16], [61, 4, 8]]);
  assert.deepEqual(findRefs("Explain Romans 8 to a beginner", chapters).map(x => [x.book, x.chapter]), [[44, 8]]);
  assert.deepEqual(findRefs("What is grace?", chapters), []);
});

test("extracts quotations of three or more words", () => {
  assert.deepEqual(quotesIn('Jesus says “God so loved the world” and "yes".'), ["God so loved the world"]);
});

test("parses JSON from a model reply with stray text", () => {
  assert.deepEqual(parseModelJson('Here you go:\n{"scripture":[]}\nThanks'), { scripture: [] });
  assert.equal(parseModelJson("no json"), null);
});

test("keeps cited statements and exact quotations", () => {
  const { sections, dropped } = verifyAnswer({
    scripture: [{ text: "John says “God so loved the world” and gave his Son.", cites: ["S1"] }],
    translation: [{ text: "The WEB renders monogenēs as “one and only Son”.", cites: ["S2"] }],
    interpretation: [{ text: "One reading of the text is that God's love is the reason for the gift of the Son.", cites: ["S1"], kind: "inference" }],
    uncertainty: [{ text: "These sources do not settle the exact date of writing.", cites: [] }]
  }, sources);
  assert.equal(dropped.length, 0);
  assert.equal(sections.scripture.length, 1);
  assert.equal(sections.uncertainty.length, 1);
});

test("drops invented quotations, missing or unknown citations", () => {
  const { sections, dropped } = verifyAnswer({
    scripture: [
      { text: "John writes “God loved only the righteous”.", cites: ["S1"] },
      { text: "John says God loves the world.", cites: [] },
      { text: "John says God loves the world.", cites: ["S9"] },
      { text: "The author is traditionally John.", cites: ["S3"] }
    ],
    evidence: [{ text: "A papyrus proves this.", cites: [] }]
  }, sources);
  assert.equal(sections.scripture.length, 0);
  assert.deepEqual(dropped.map(d => d.reason.split(":")[0]), ["quotation not found in the cited source", "no source cited", "cites a source that does not exist", "not tied to a Bible text", "no source cited"]);
});

test("an answer with nothing verifiable is reported as empty", () => {
  assert.ok(isEmpty(verifyAnswer({ scripture: [{ text: "x y z", cites: [] }] }, sources).sections));
  assert.ok(isEmpty(verifyAnswer(null, sources).sections));
});
