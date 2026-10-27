import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPrep, manuscriptFromOutline, reviewFlags, tracePoint, searchSermons, sections, wordCount, SERMON_ID } from "../public/js/prep-core.js";
import { parseTranscript } from "../public/js/prepare-record.js";

const base = () => cleanPrep({ id: "s-abc123def", name: "Light", idea: "The Word became flesh", tags: ["christmas"], venue: "Evening",
  points: [{ id: "p1", text: "The Word was God", blocks: [{ id: "b1", kind: "verse", text: "In the beginning was the Word", cite: "John 1:1 (KJV)" }, { id: "b2", kind: "commentary", text: "A person, not a speech", cite: "Matthew Henry on John 1:1" }] }],
  notes: [{ id: "n1", type: "obs", text: "Light and darkness", pointId: "p1" }, { id: "n2", type: "apply", text: "Come to the light", pointId: "p1" }] }, "John.1.1-18", "John 1:1–18");

test("old passage-keyed preparations still load, and ids are validated", () => {
  const p = cleanPrep({ key: "John.1.1-18", idea: "x" }, "John.1.1-18", "John 1:1–18");
  assert.equal(p.id, "John.1.1-18"); assert.equal(p.status, "draft"); assert.deepEqual(p.manuscript, []);
  assert.equal(cleanPrep({ id: "../../etc" }, "John.1.1", "John 1:1").id, "John.1.1");
  assert.ok(SERMON_ID.test("s-abc123def") && SERMON_ID.test("1Cor.13.1-13") && !SERMON_ID.test("javascript:x"));
});
test("a manuscript drafted from the outline keeps sources and point links", () => {
  const p = base(); const ms = manuscriptFromOutline(p);
  assert.equal(ms[0].text, "The Word became flesh");
  assert.equal(ms[1].type, "heading"); assert.equal(ms[1].pointId, "p1");
  assert.equal(ms[2].type, "scripture"); assert.equal(ms[2].cite, "John 1:1 (KJV)");
  assert.equal(ms[3].origin, "interp"); assert.equal(ms.at(-1).type, "concl");
  assert.equal(sections(ms).length, 2);
});
test("review flags quotations without sources, mismatched Scripture and AI text", () => {
  const ms = cleanPrep({ manuscript: [{ type: "quote", text: "No source here" }, { type: "scripture", text: "In the beginning was the Ward", cite: "John 1:1 (KJV)" }, { type: "para", text: "Generated", origin: "ai" }, { type: "scripture", text: "In the beginning was the Word", cite: "John 1:1 (KJV)" }] }, "John.1.1", "John 1:1").manuscript;
  const f = reviewFlags(ms, cite => (cite === "John 1:1 (KJV)" ? "In the beginning was the Word, and the Word was with God" : null));
  assert.equal(f.length, 3);
  assert.match(f[0].msg, /without a citation/); assert.match(f[1].msg, /does not match/); assert.equal(f[2].level, "info");
});
test("tracing a point gathers passage, observations, sources, interpretation and application", () => {
  const p = base(); p.manuscript = manuscriptFromOutline(p);
  const tr = tracePoint(p, p.manuscript[1].id);
  assert.equal(tr.passage[0].cite, "John 1:1 (KJV)");
  assert.equal(tr.observations[0].text, "Light and darkness");
  assert.equal(tr.interpretation[0].text, "A person, not a speech");
  assert.equal(tr.sources.length, 0, "commentary counts as interpretation, not as a supporting source");
  assert.ok(tr.application.some(a => a.text === "Come to the light"));
});
test("sermon search matches title, topic, venue and passage", () => {
  const p = base(), q = cleanPrep({ id: "Rom.8", key: "Rom.8", name: "More than conquerors", status: "final" }, "Rom.8", "Romans 8");
  assert.equal(searchSermons([p, q], "christmas").length, 1);
  assert.equal(searchSermons([p, q], "evening light").length, 1);
  assert.equal(searchSermons([p, q], "", { status: "final" })[0].name, "More than conquerors");
  assert.equal(searchSermons([p, q], "", { book: "Rom" }).length, 1);
  assert.equal(wordCount([{ type: "para", text: "one two three" }, { type: "cue", text: "pause here" }]), 3);
});
test("transcripts import from WebVTT, SRT and timed text", () => {
  const v = parseTranscript("WEBVTT\n\n1\n00:00:01.500 --> 00:00:03.000\nHello <b>church</b>\n\n2\n00:01:02.000 --> 00:01:05.000\nJohn 3:16\n");
  assert.deepEqual(v, [{ t: 1.5, text: "Hello church" }, { t: 62, text: "John 3:16" }]);
  assert.equal(parseTranscript("1\n00:00:02,000 --> 00:00:04,000\nGrace\n")[0].t, 2);
  assert.deepEqual(parseTranscript("[1:05] Turn to Romans 8\nand read on"), [{ t: 65, text: "Turn to Romans 8" }, { t: 65, text: "and read on" }]);
});
