import { test } from "node:test";
import assert from "node:assert/strict";
import { precisionClass, cleanDict, describePerson, clipRing, clipLine, simplify } from "../scripts/hist-parse.mjs";
import { yearText, dateCertainty, project, MAP_SIZE, inMapBox } from "../public/js/history.js";

test("place precision classes; unlocated or missing coordinates are never plotted", () => {
  assert.equal(precisionClass(undefined, true), "located");
  assert.equal(precisionClass("Rough", true), "approximate");
  assert.equal(precisionClass("Related-Within", true), "related");
  assert.equal(precisionClass("Unlocated", true), "unknown");
  assert.equal(precisionClass(undefined, false), "unknown");
});

test("dictionary text keeps link labels and tidies spacing", () => {
  assert.equal(cleanDict("the river ([2 Kings 5:12](/2kgs#2Kgs.5.12)) of 1�Chronicles"), "the river (2 Kings 5:12) of 1 Chronicles");
});

test("person descriptors use parentage first, then the dataset's note", () => {
  const names = { f1: "Terah" };
  assert.equal(describePerson({ father: ["f1"], gender: "Male" }, id => names[id]), "son of Terah");
  assert.equal(describePerson({ mother: ["f1"], gender: "Female" }, id => names[id]), "daughter of Terah");
  assert.equal(describePerson({ "Disambiguation (temp)": "Abdi (descendent of Elam)" }, () => null), "descendent of Elam");
  assert.equal(describePerson({}, () => null), "");
});

test("dates and certainty bands", () => {
  assert.equal(yearText(-1490), "1490 BC");
  assert.equal(yearText(30), "AD 30");
  assert.equal(dateCertainty(-1490).level, "traditional");
  assert.equal(dateCertainty(-722).level, "approximate");
  assert.equal(dateCertainty(30).level, "close");
  assert.equal(dateCertainty(null).level, "none");
});

test("polygon clipping keeps the part inside the box", () => {
  const sq = [[-5, -5], [5, -5], [5, 5], [-5, 5]];
  const c = clipRing(sq, [0, 0, 10, 10]);
  const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
  assert.equal(Math.min(...xs), 0); assert.equal(Math.max(...xs), 5);
  assert.equal(Math.min(...ys), 0); assert.equal(Math.max(...ys), 5);
  assert.deepEqual(clipRing([[20, 20], [21, 20], [21, 21]], [0, 0, 10, 10]), []);
});

test("line clipping splits at the box edge", () => {
  const runs = clipLine([[1, 1], [2, 2], [20, 20], [3, 3], [4, 4]], [0, 0, 10, 10]);
  assert.deepEqual(runs, [[[1, 1], [2, 2]], [[3, 3], [4, 4]]]);
});

test("simplify rounds and thins points", () => {
  assert.deepEqual(simplify([[1.001, 1.001], [1.002, 1.003], [2, 2]]), [[1, 1], [2, 2]]);
});

test("projection puts Jerusalem inside the map and north up", () => {
  const [x, y] = project(35.23, 31.78);
  assert.ok(x > 0 && x < MAP_SIZE[0] && y > 0 && y < MAP_SIZE[1]);
  assert.ok(project(35, 40)[1] < y, "north is up");
  assert.ok(inMapBox(12.5, 41.9), "Rome is on the map");
  assert.ok(!inMapBox(77, 22), "India is off the map");
});
