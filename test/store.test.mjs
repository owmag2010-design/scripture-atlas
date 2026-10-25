import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore, exportMarkdown } from "../public/js/store.js";
import { fromOsis, formatRef } from "../public/js/ref.js";

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test("notes save, persist across instances and delete when emptied", () => {
  const s = memory();
  const a = createStore(s);
  a.setNote("John.3.16", "God's love is the motive.");
  assert.equal(createStore(s).note("John.3.16"), "God's love is the motive.");
  a.setNote("John.3.16", "   ");
  assert.equal(createStore(s).notes().length, 0);
});

test("bookmarks toggle", () => {
  const st = createStore(memory());
  assert.equal(st.toggleBookmark("Ps.23.1"), true);
  assert.equal(st.isBookmarked("Ps.23.1"), true);
  assert.equal(st.toggleBookmark("Ps.23.1"), false);
});

test("highlights set and clear", () => {
  const st = createStore(memory());
  st.setHighlight("Gen.1.1", "gold");
  assert.equal(st.highlight("Gen.1.1"), "gold");
  st.setHighlight("Gen.1.1", null);
  assert.equal(st.highlight("Gen.1.1"), null);
});

test("history keeps one entry per chapter, newest first, and sets the resume position", () => {
  const st = createStore(memory());
  st.visit("Gen.1", "kjv"); st.visit("John.3", "web"); st.visit("Gen.1", "kjv");
  assert.deepEqual(st.history().map(h => h.osis), ["Gen.1", "John.3"]);
  assert.equal(st.position().osis, "Gen.1");
});

test("corrupt or missing storage never breaks the app", () => {
  const bad = { getItem: () => "{not json", setItem: () => { throw new Error("full"); } };
  const st = createStore(bad);
  st.setNote("Gen.1.1", "still works in memory");
  assert.equal(st.note("Gen.1.1"), "still works in memory");
  assert.doesNotThrow(() => createStore(null).setNote("Gen.1.1", "x"));
});

test("markdown export lists notes in canonical order with verse text", () => {
  const st = createStore(memory());
  st.setNote("John.3.16", "Second");
  st.setNote("Gen.1.1", "First");
  st.toggleBookmark("Ps.23.1");
  const order = osis => { const r = fromOsis(osis); return r.book * 1e6 + r.chapter * 1e3 + r.verse; };
  const label = osis => { const r = fromOsis(osis); return formatRef(r.book, r.chapter, r.verse); };
  const md = exportMarkdown(st, { order, label, text: o => (o === "Gen.1.1" ? "In the beginning" : ""), date: "2026-10-25" });
  assert.ok(md.indexOf("### Genesis 1:1") < md.indexOf("### John 3:16"));
  assert.match(md, /> In the beginning/);
  assert.match(md, /- Psalm 23:1/);
  assert.match(md, /Exported 2026-10-25/);
});
