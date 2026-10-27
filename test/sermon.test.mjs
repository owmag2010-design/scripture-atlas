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

import { createStore } from "../public/js/store.js";
import { trimVersions } from "../public/js/prep-core.js";
const memStore = () => { const m = new Map(); return createStore({ getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }); };
test("restoring a backup never replaces a sermon already here, and cleans what it adds", () => {
  const st = memStore();
  st.savePrep({ id: "John.1.1-18", key: "John.1.1-18", title: "John 1:1–18", name: "Mine", manuscript: [{ type: "para", text: "my words" }] });
  const r = st.restore({ app: "ereunia", kind: "backup", data: { version: 1, preps: {
    "John.1.1-18": { key: "John.1.1-18", name: "Theirs" },
    '"><img src=x onerror=alert(1)>': { key: "John.3.16", name: "Bad id" },
    "Rom.8": { key: "not a passage" } } } });
  assert.equal(r.saved, true);
  const all = st.preps();
  assert.equal(st.prep("John.1.1-18").name, "Mine", "the existing sermon is untouched");
  assert.ok(all.some(p => p.name === "Theirs" && /^s-/.test(p.id)), "the clashing sermon is added under a new id");
  assert.ok(all.every(p => /^(s-[a-z0-9]+|[1-3]?[A-Za-z]+\.\d+(\.\d+(-\d+)?)?)$/.test(p.id)), "no unsafe ids are stored");
  assert.ok(!all.some(p => p.key === "not a passage"));
});
test("saving never deletes other sermons", () => {
  const st = memStore();
  for (let i = 1; i <= 320; i++) st.savePrep({ id: `Ps.${i % 150 + 1}.${i}`, key: `Ps.${i % 150 + 1}`, title: "Psalm" });
  assert.equal(st.preps().length, 320);
});
test("named versions survive any number of automatic ones", () => {
  const vs = [{ label: "First draft" }, ...Array.from({ length: 90 }, (_, i) => ({ label: `Autosaved ${i}` })), { label: "As preached on Sunday" }];
  const out = trimVersions(vs);
  assert.ok(out.some(v => v.label === "First draft") && out.some(v => v.label === "As preached on Sunday"));
  assert.equal(out.filter(v => v.label.startsWith("Autosaved")).length, 40);
});
test("a line beginning with a Bible reference is not read as a timestamp", () => {
  assert.deepEqual(parseTranscript("3:16 For God so loved the world"), [{ t: 0, text: "3:16 For God so loved the world" }]);
  assert.equal(parseTranscript("WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\n316\n")[0].text, "316");
});
