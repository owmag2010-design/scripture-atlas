import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStepRef, parseHebrewLine, parseGreekLine, sanitizeDefinition, parseLexiconLine, parseMorphLine, morphSegments, pack, unpack, parseCrossRef, cleanTranslit } from "../scripts/lang-parse.mjs";
import { BOOKS } from "../public/js/books.js";

const T = (...c) => c.join("\t");

test("STEP references use English versification and canonical book index", () => {
  assert.deepEqual(parseStepRef("Gen.1.1#01=L"), { book: 0, chapter: 1, verse: 1, word: 1, type: "L" });
  assert.deepEqual(parseStepRef("Mal.4.1(3.19)#02=L"), { book: 38, chapter: 4, verse: 1, word: 2, type: "L" });
  assert.equal(parseStepRef("Jhn.3.16#03=NKO").book, 42);
  assert.equal(parseStepRef("Xyz.1.1#01=L"), null);
  assert.deepEqual(parseStepRef("2Co.13.13[13.14]#01=NKO"), { book: 46, chapter: 13, verse: 14, word: 1, type: "NKO" });
  assert.equal(parseStepRef("Jhn.7.53{8.1}#01=KO").verse, 53);
  assert.equal(parseStepRef("Rom.16.25{14.24}#01=NKO").chapter, 16);
  assert.equal(parseStepRef("# Gen.1.1"), null);
});

test("Hebrew line: text, transliteration, gloss, main Strong's, prefixes, morphology", () => {
  const w = parseHebrewLine(T("Gen.1.1#01=L", "בְּ/רֵאשִׁ֖ית", "be./re.Shit", "in/ beginning", "H9003/{H7225G}", "HR/Ncfsa", "", "", "H7225G"));
  assert.deepEqual(w.word, ["בְּרֵאשִׁ֖ית", "bereshit", "in beginning", "H7225G", "H9003/H7225G", "HR/Ncfsa", ""]);
  const end = parseHebrewLine(T("Gen.1.1#07=L", "הָ/אָֽרֶץ\\׃", "ha./'A.retz", "the/ earth", "H9009/{H0776G}\\H9016", "HTd/Ncfsa"));
  assert.equal(end.word[0], "הָאָֽרֶץ׃");
  assert.equal(end.word[3], "H0776G");
  assert.equal(end.word[4], "H9009/H0776G");
});

test("Hebrew: Qere readings kept and flagged, other witnesses skipped", () => {
  assert.equal(parseHebrewLine(T("Gen.8.17#05=Q(K)", "הַיְצֵא", "hay.tze'", "bring out", "{H3318G}", "HVhv2ms")).word[6], "Q");
  assert.equal(parseHebrewLine(T("Gen.1.1#09=X", "x", "x", "x", "{H1}", "HX")), null);
});

test("Greek line: NA28/TR edition flags", () => {
  const both = parseGreekLine(T("Jhn.3.16#03=NKO", "ἠγάπησεν (ēgapēsen)", "loved", "G0025=V-AAI-3S", "ἀγαπάω=to love", "NA28+TR"));
  assert.deepEqual(both.word, ["ἠγάπησεν", "ēgapēsen", "loved", "G0025", "G0025", "V-AAI-3S", ""]);
  assert.equal(parseGreekLine(T("Act.8.37#01=K", "εἶπε (eipe)", "said", "G2036=V-2AAI-3S")).word[6], "K");
  assert.equal(parseGreekLine(T("Mrk.1.1#05=N", "υἱοῦ (huiou)", "son", "G5207=N-GSM")).word[6], "N");
  assert.equal(parseGreekLine(T("Mrk.1.1#05=O", "x (x)", "x", "G1=X")), null);
  const pa = parseGreekLine(T("Jhn.7.53{8.1}#01=KO", "[[Καὶ (Kai)", "{8.1} And", "G2532=CONJ", "καί=and", "NA28+NA27+Tyn+WH+TR+Byz"));
  assert.deepEqual(pa.word.slice(0, 3), ["Καὶ", "Kai", "And"]);
  assert.equal(pa.word[6], "", "editions column shows NA28 and TR");
  const crasis = parseGreekLine(T("Act.5.39#10=NKO", "μήποτε (mēpote)", "otherwise", "G3361=PRT-N + G4218=PRT", "μήποτε=lest", "NA28+TR"));
  assert.equal(crasis.word[3], "G3361"); assert.equal(crasis.word[4], "G3361/G4218"); assert.equal(crasis.word[5], "PRT-N+PRT");
  assert.deepEqual(morphSegments("PRT-N+PRT"), ["PRT-N", "PRT"]);
});

test("lexicon definitions are sanitised to safe HTML", () => {
  const d = sanitizeDefinition("<b>love</b> <ref='Mat.5.43'>Mat.5:43</ref><BR />__1. <script>x</script><a href=x>link</a>");
  assert.equal(d, "<b>love</b> Mat.5:43<br>1. xlink");
  assert.ok(!/script|href/.test(d));
  const long = sanitizeDefinition("<b>" + "word ".repeat(1000), 50);
  assert.ok(long.endsWith("</b>") && long.length < 70);
});

test("lexicon and morphology lines", () => {
  const [k, e] = parseLexiconLine(T("H7225", "H7225G =", "H7225G", "רֵאשִׁית", "re.shit", "H:N-F", "first: beginning", ": beginning<br>1) first"));
  assert.equal(k, "H7225G"); assert.equal(e.gloss, "first: beginning"); assert.equal(e.def, ": beginning<br>1) first");
  assert.equal(parseLexiconLine(T("Strong numbers", "explanation")), null);
  assert.deepEqual(parseMorphLine(T("HVqp3ms", "Function=Verb ; Stem=Qal")), ["HVqp3ms", "Function=Verb; Stem=Qal"]);
  assert.deepEqual(morphSegments("HR/Ncfsa"), ["HR", "HNcfsa"]);
  assert.deepEqual(morphSegments("V-AAI-3S"), ["V-AAI-3S"]);
});

test("transliteration cleanup", () => {
  assert.equal(cleanTranslit("'E.lo.Him"), "'elohim");
});

test("packed references round-trip", () => {
  assert.equal(pack(42, 3, 16), 42003016);
  assert.deepEqual(unpack(42003016), { book: 42, chapter: 3, verse: 16 });
});

test("cross references parse single verses and ranges", () => {
  const idx = new Map(BOOKS.map(b => [b.osis, b.i]));
  assert.deepEqual(parseCrossRef("Gen.1.1\tRev.14.7\t82", idx), { from: 1001, to: 65014007, toEnd: 65014007, votes: 82 });
  assert.deepEqual(parseCrossRef("Gen.1.1\tPs.134.3-Ps.134.4\t60", idx), { from: 1001, to: 18134003, toEnd: 18134004, votes: 60 });
  assert.equal(parseCrossRef("From Verse\tTo Verse\tVotes", idx), null);
});
