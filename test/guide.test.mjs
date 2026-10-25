import { test } from "node:test";
import assert from "node:assert/strict";
import { repeatedWords, keyLemmas, mergeCrossRefs, interpretQuestions, guideMarkdown, OBSERVE, APPLY } from "../public/js/guide.js";

test("repeated words skip common words and archaic pronouns", () => {
  const r = repeatedWords(["The LORD is my shepherd; I shall not want.", "He leadeth me; the LORD restoreth my soul.", "Surely goodness and mercy shall follow me: the LORD's house."]);
  assert.deepEqual(r[0], ["lord", 3]);
  assert.ok(!r.some(([w]) => ["the", "shall", "thy", "my"].includes(w)));
  assert.deepEqual(repeatedWords(["one word only"]), []);
});

test("key lemmas: prefixes, pronouns and very common words are left out; repeats and rare words rank first", () => {
  const lex = new Map([["H7462", { n: 170, pos: "H:V" }], ["H3068G", { n: 6500, pos: "H:N-M" }], ["H5315", { n: 750, pos: "H:N-F" }], ["H9003", { n: 15000 }], ["H0589", { n: 870, pos: "H:P" }]]);
  const words = [["אֲנִי", "ani", "I", "H0589"], ["רֹעִי", "ro'i", "my shepherd", "H7462"], ["יְהוָה", "YHWH", "LORD", "H3068G"], ["נַפְשִׁי", "nafshi", "my soul", "H5315"], ["נַפְשׁ", "nefesh", "soul", "H5315"], ["בְּ", "be", "in", "H9003"]];
  assert.deepEqual(keyLemmas(words, lex).map(k => k.strong), ["H5315", "H7462"]);
  assert.equal(keyLemmas(words, lex)[0].inPassage, 2);
});

test("cross references merge across verses, skip the passage itself, and rank by votes", () => {
  const inPassage = n => n >= 42003014 && n <= 42003018;
  const m = mergeCrossRefs([[[45005008, 400], [42003015, 300]], [[45005008, 120], [61004009, 200, 61004010]]], inPassage);
  assert.deepEqual(m, [[45005008, 400, undefined], [61004009, 200, 61004010]]);
});

test("interpretation questions depend on the kind of book", () => {
  assert.match(interpretQuestions("Wisdom and Poetry")[0], /images/);
  assert.match(interpretQuestions("Pauline Letters")[1], /argument/);
  assert.equal(interpretQuestions("Unknown").length, 4);
});

test("markdown export includes the passage, answers and sources", () => {
  const md = guideMarkdown({
    title: "Psalm 23", translation: "King James Version", date: "2026-10-25",
    verses: [[1, "The LORD is my shepherd; I shall not want."]], background: "Psalms: songs of Israel.",
    repeated: [["lord", 2]], keyWords: [{ form: "רֹעִי", translit: "ro'i", gloss: "my shepherd", strong: "H7462", total: 170 }],
    crossRefs: [["John 10:11", "I am the good shepherd"]], interpret: interpretQuestions("Wisdom and Poetry"),
    answers: { o0: "David, to God", a0: "God cares like a shepherd" }, sources: "KJV; STEPBible"
  });
  assert.match(md, /^# Study guide: Psalm 23/);
  assert.match(md, /\*\*1\*\* The LORD is my shepherd/);
  assert.match(md, /David, to God/);
  assert.match(md, /_\(not answered\)_/);
  assert.match(md, /John 10:11/);
  assert.equal((md.match(/\*\*Who is speaking/g) || []).length, 1);
  assert.ok(OBSERVE.length === 4 && APPLY.length === 4);
});
