import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseMorph, describeMorph, languageOf, normaliseStrong, shardOf, displayStrong, isGrammaticalStrong, editionNote } from "../public/js/lang.js";

const table = JSON.parse(readFileSync(new URL("../public/data/morph.json", import.meta.url), "utf8"));

test("morph descriptions split into fields, keeping implied values as notes", () => {
  const f = parseMorph(table.HVqp3ms);
  assert.deepEqual(f.slice(0, 3).map(x => [x.k, x.v]), [["Function", "Verb"], ["Stem", "Qal"], ["Form", "Perfect"]]);
  assert.equal(f[1].note, "Action: Simple; Voice: Active");
  assert.equal(f.at(-1).v, "Singular");
});

test("Hebrew prefixed words describe each part", () => {
  const d = describeMorph("HR/Ncfsa", table);
  assert.deepEqual(d.map(x => x.code), ["HR", "HNcfsa"]);
  assert.equal(d[0].summary, "Preposition");
  assert.match(d[1].summary, /^Noun · Common · Feminine · Singular · Absolute$/);
});

test("Greek codes, including combined words", () => {
  assert.equal(describeMorph("V-AAI-3S", table)[0].summary, "Verb · Aorist · Active · Indicative · 3rd · Singular");
  assert.equal(describeMorph("PRT-N+PRT", table).length, 2);
  assert.equal(describeMorph("ZZZ", table)[0].summary, "ZZZ");
});

test("Aramaic is identified from the morphology code", () => {
  assert.equal(languageOf("AVqp3ms", 26), "Aramaic");
  assert.equal(languageOf("HVqp3ms", 0), "Hebrew");
  assert.equal(languageOf("V-AAI-3S", 42), "Greek");
});

test("Strong's numbers normalise, shard and display", () => {
  assert.equal(normaliseStrong("g26"), "G0026");
  assert.equal(normaliseStrong("H7225g"), "H7225G");
  assert.equal(normaliseStrong("love"), null);
  assert.equal(shardOf("H7225G"), "H072");
  assert.equal(displayStrong("G0026"), "G26");
  assert.ok(isGrammaticalStrong("H9003"));
  assert.ok(!isGrammaticalStrong("H7225G"));
});

test("edition notes explain text-critical flags", () => {
  assert.match(editionNote("K"), /Textus Receptus/);
  assert.match(editionNote("N"), /NA28/);
  assert.equal(editionNote(""), "");
});
