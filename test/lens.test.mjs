import { test } from "node:test";
import assert from "node:assert/strict";
import { wordDiff, variantsFor, editionDifferences, lessonMarkdown, TEXT_VARIANTS } from "../public/js/lens.js";
import { BOOKS } from "../public/js/books.js";

const bi = code => BOOKS.findIndex(b => b.osis === code);

test("word diff marks the words a translation shares with the base text", () => {
  const kjv = "For God so loved the world, that he gave his only begotten Son";
  const web = "For God so loved the world, that he gave his one and only Son";
  const d = wordDiff(kjv, web);
  assert.deepEqual(d.parts.filter(p => !p.same).map(p => p.w), ["one", "and"]);
  assert.ok(d.similarity > 0.8 && d.similarity < 1);
  assert.equal(wordDiff(kjv, kjv).similarity, 1);
  assert.equal(wordDiff("", "x").similarity, 0);
});

test("variant notes find verses inside ranges, across chapters, and nothing elsewhere", () => {
  assert.equal(variantsFor(bi("Mark"), 16, 12, bi).length, 1);
  assert.equal(variantsFor(bi("John"), 8, 3, bi).length, 1);
  assert.equal(variantsFor(bi("John"), 7, 52, bi).length, 0);
  assert.equal(variantsFor(bi("1John"), 5, 7, bi).length, 1);
  assert.equal(variantsFor(bi("Gen"), 1, 1, bi).length, 0);
  assert.ok(TEXT_VARIANTS.every(([r]) => bi(r.split(".")[0]) >= 0), "every range names a real book");
});

test("edition differences pick out Textus Receptus and NA28-only words", () => {
  const w = [["ὁ", "ho", "the", "G3588", "G3588", "T-NSM", ""], ["καὶ", "kai", "and", "G2532", "G2532", "CONJ", "K"], ["αὐτός", "autos", "he", "G0846", "G0846", "P-NSM", "N"]];
  assert.deepEqual(editionDifferences(w).map(x => [x.i, x.flag]), [[1, "K"], [2, "N"]]);
});

test("lesson markdown includes only sections with content", () => {
  const md = lessonMarkdown({ title: "John 3:16", ref: "John 3:16", translation: "KJV", text: "For God so loved the world", bigIdea: "God gives", observe: ["Who loves?"], words: [], refs: ["Rom 5:8"], discuss: [], apply: ["Thank God"], notes: "" });
  assert.match(md, /^# John 3:16/);
  assert.match(md, /## Observe\n\n- Who loves\?/);
  assert.ok(!md.includes("## Key words"));
  assert.match(md, /\*\*Big idea:\*\* God gives/);
});
