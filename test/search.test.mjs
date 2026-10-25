import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuery, searchCorpus, highlightTerms } from "../public/js/search.js";

const corpus = [
  { book: 0, chapters: [["In the beginning God created the heaven and the earth.", "And the earth was without form, and void."]] },
  { book: 42, chapters: [["In the beginning was the Word.", "God’s love is beloved; a glove is not."], ["For God so loved the world."]] }
];

test("words match whole words or word starts, any order", () => {
  const hits = searchCorpus(corpus, "love");
  assert.deepEqual(hits.map(h => [h.book, h.chapter, h.verse]), [[42, 1, 2], [42, 2, 1]]);
});

test("glove does not match love, beloved does not match love", () => {
  const hits = searchCorpus(corpus, "love");
  assert.ok(hits.every(h => !/glove/.test(h.text) || /\blove/.test(h.text.toLowerCase())));
});

test("all words must be present", () => {
  assert.equal(searchCorpus(corpus, "beginning word").length, 1);
  assert.equal(searchCorpus(corpus, "earth heaven").length, 1);
});

test("quoted text is an exact phrase", () => {
  assert.equal(searchCorpus(corpus, '"in the beginning"').length, 2);
  assert.equal(searchCorpus(corpus, '"the beginning was"').length, 1);
  assert.deepEqual(parseQuery('"so loved" world'), { phrases: ["so loved"], words: ["world"] });
});

test("curly apostrophes and case are ignored", () => {
  assert.equal(searchCorpus(corpus, "god's").length, 1);
  assert.equal(searchCorpus(corpus, "GOD").length, 3);
});

test("limit caps results and reports the total", () => {
  const hits = searchCorpus(corpus, "the", { limit: 2 });
  assert.equal(hits.length, 2);
  assert.equal(hits.total, 4);
});

test("empty or stopword-free blank queries return nothing", () => {
  assert.equal(searchCorpus(corpus, "   ").length, 0);
});

test("highlight escapes HTML and marks matches", () => {
  const html = highlightTerms("God <is> love", parseQuery("love"));
  assert.equal(html, "God &lt;is&gt; <mark>love</mark>");
});

test("Chinese, Korean and Thai search match inside words", () => {
  const zh = [{ book: 42, chapters: [["", "", "神爱世人，甚至将他的独生子赐给他们"]] }];
  assert.equal(searchCorpus(zh, "独生子").length, 1);
  assert.equal(highlightTerms("神爱世人", parseQuery("爱世")), "神<mark>爱世</mark>人");
  const ko = [{ book: 18, chapters: [["여호와는 나의 목자시니"]] }];
  assert.equal(searchCorpus(ko, "목자").length, 1);
});

test("accented and Cyrillic words match on word starts", () => {
  const c = [{ book: 0, chapters: [["Au commencement, Dieu créa les cieux", "В начале сотворил Бог небо"]] }];
  assert.equal(searchCorpus(c, "créa").length, 1);
  assert.equal(searchCorpus(c, "Бог").length, 1);
  assert.equal(searchCorpus(c, "реа").length, 0);
});

test("Arabic and Hebrew match with or without vowel points", () => {
  const c = [{ book: 18, chapters: [["ٱلرَّبُّ رَاعِيَّ فَلَا يُعْوِزُنِي شَيْءٌ", "יְהוָה רֹעִי לֹא אֶחְסָר"]] }];
  assert.equal(searchCorpus(c, "راعي").length, 1);
  assert.equal(searchCorpus(c, "רעי").length, 1);
});
