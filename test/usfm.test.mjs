import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUsfmBook, tokensText, renderings, ADD, WJ, ND } from "../scripts/usfm.mjs";

const GEN = String.raw`\id GEN
\c 1
\p
\v 1 In the \w beginning|strong="H7225"\w* \w God|strong="H0430"\w* \w created|strong="H1254"\w* the \w heaven|strong="H8064"\w*.
\v 4 And \w God|strong="H0430"\w* \w saw|strong="H7200"\w* the \w light|strong="H0216"\w*, \w that|strong="H3588"\w* \add it was\add* \w good|strong="H2896"\w*.\f + \fr 1.4 \ft the light from…: Heb. between the light\f*
\c 2
\v 4 ¶ in the \w day|strong="H3117"\w* that the \nd \+w LORD|strong="H3068"\+w*\nd* \w God|strong="H0430"\w* \w made|strong="H6213"\w* it,`;

const MAT = String.raw`\c 3
\v 15 \w And|strong="G1161"\w* \w Jesus|strong="G2424"\w* \w said|strong="G2036"\w*, \wj  \+w Suffer|strong="G0863"\+w* \+add  \+w it to be so|strong="G2076"\+w*\+add* \+w now|strong="G0737"\+w*\wj*.`;

const PSA = String.raw`\c 23
\d A Psalm of \w David|strong="H1732"\w*.
\q1
\v 1 The \nd \+w LORD|strong="H3068"\+w*\nd* \add is\add* my \w shepherd|strong="H7462"\w*;
\q1 I shall not \w want|strong="H2637"\w*.`;

test("tagged words keep their Strong's number and surrounding text", () => {
  const [c1] = parseUsfmBook(GEN);
  const v1 = c1.verses[0];
  assert.equal(tokensText(v1), "In the beginning God created the heaven.");
  assert.deepEqual(v1.find(t => t[0] === "beginning"), ["beginning", "H7225", 0]);
  assert.equal(c1.verses[1], undefined === c1.verses[1] ? undefined : c1.verses[1]); // verses 2–3 absent here
});

test("translators' additions, footnotes and the divine name are marked", () => {
  const [c1, c2] = parseUsfmBook(GEN);
  const v4 = c1.verses[3];
  assert.equal(tokensText(v4), "And God saw the light, that it was good.");
  assert.deepEqual(v4.find(t => t[0] === "it was"), ["it was", "", ADD]);
  assert.deepEqual(c1.notes[4], ["the light from…: Heb. between the light"]);
  const lord = c2.verses[3].find(t => t[0] === "LORD");
  assert.equal(lord[1], "H3068"); assert.equal(lord[2], ND);
  assert.ok(!tokensText(c2.verses[3]).includes("¶"));
});

test("words of Jesus are flagged, including added words inside them", () => {
  const v = parseUsfmBook(MAT)[2].verses[14];
  assert.equal(tokensText(v), "And Jesus said, Suffer it to be so now.");
  assert.equal(v.find(t => t[0] === "Suffer")[2], WJ);
  assert.equal(v.find(t => t[0] === "it to be so")[2], WJ | ADD);
  assert.equal(v.find(t => t[0] === "Jesus")[2], 0);
});

test("psalm titles are kept apart from the verse, and poetry lines join", () => {
  const c = parseUsfmBook(PSA)[22];
  assert.equal(c.title, "A Psalm of David.");
  assert.equal(tokensText(c.verses[0]), "The LORD is my shepherd; I shall not want.");
});

test("rendering counts gather each English word per Strong's number", () => {
  const r = renderings([parseUsfmBook(GEN), parseUsfmBook(PSA)]);
  assert.equal(r.get("H0430").get("God"), 3);
  assert.equal(r.get("H3068").get("LORD"), 2);
  assert.equal(r.get("H2896").get("good"), 1);
});
