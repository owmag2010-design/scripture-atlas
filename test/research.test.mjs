import { test } from "node:test";
import assert from "node:assert/strict";
import { stem, glossStems, buildEnglishIndex, topStrongs, distribution, sharedStrongs, radialLayout } from "../public/js/research.js";

test("stemming is consistent across word forms", () => {
  assert.equal(stem("love"), stem("loved"));
  assert.equal(stem("loving"), stem("loves"));
  assert.equal(stem("shepherds"), "shepherd");
  assert.equal(stem("Shepherd's"), "shepherd");
  assert.equal(stem("mercies"), stem("mercy"));
  assert.equal(stem("grace"), stem("graces"));
  assert.notEqual(stem("glass"), stem("gla"));
});

test("gloss stems drop bracketed helpers and function words", () => {
  assert.deepEqual(glossStems("[the] shepherds of"), ["shepherd"]);
  assert.deepEqual(glossStems("and he loved"), [stem("loved")]);
});

test("English index counts original words per English stem and skips Hebrew prefixes", () => {
  const idx = buildEnglishIndex([["", "", "my shepherd", "H7462"], ["", "", "shepherds", "H7462"], ["", "", "the shepherd", "G4166"], ["", "", "and", "H9002"], ["", "", "love", "G0026"]]);
  assert.deepEqual([...idx.get("shepherd")], [["H7462", 2], ["G4166", 1]]);
  assert.ok(!idx.has("and"));
  assert.ok([...idx.values()].every(m => !m.has("H9002")));
});

test("top original words keep frequent translations and drop stray ones", () => {
  const m = new Map([["H7462", 80], ["G4166", 18], ["H1234", 1], ["H5555", 2]]);
  assert.deepEqual(topStrongs(m).map(x => x[0]), ["H7462", "G4166"]);
});

test("distribution counts verses per book", () => {
  const d = distribution([0 * 1e6 + 1001, 0 * 1e6 + 2003, 42 * 1e6 + 3016, 65 * 1e6 + 22021]);
  assert.equal(d.length, 66);
  assert.equal(d[0], 2); assert.equal(d[42], 1); assert.equal(d[65], 1); assert.equal(d[1], 0);
});

test("shared words skip prefixes, grammar words and duplicates", () => {
  const a = [["", "", "", "H9003"], ["", "", "", "H7225"], ["", "", "", "H0430G"], ["", "", "", "H7225"], ["", "", "", "H0853"]];
  const b = [["", "", "", "H0430G"], ["", "", "", "H7225"], ["", "", "", "H9003"], ["", "", "", "H0853"]];
  assert.deepEqual(sharedStrongs(a, b, k => k === "H0853"), ["H7225", "H0430G"]);
});

test("radial layout places every node inside the frame, groups in order, labels anchored outward", () => {
  const g = [{ type: "word", nodes: [1, 2, 3, 4, 5, 6].map(i => ({ id: "w" + i, label: "w" })) }, { type: "person", nodes: [{ id: "p", label: "p" }] }, { type: "place", nodes: [] }, { type: "verse", nodes: [1, 2, 3].map(i => ({ id: "v" + i, label: "v" })) }];
  const { centre, nodes } = radialLayout(g, { w: 800, h: 560 });
  assert.equal(nodes.length, 10);
  assert.ok(nodes.every(n => n.x > 0 && n.x < 800 && n.y > 0 && n.y < 560));
  assert.deepEqual([...new Set(nodes.map(n => n.type))], ["word", "person", "verse"]);
  assert.ok(nodes.every(n => n.anchor === (n.x > centre.x + 12 ? "start" : n.x < centre.x - 12 ? "end" : "middle")));
  assert.equal(new Set(nodes.map(n => `${n.x},${n.y}`)).size, 10);
});
