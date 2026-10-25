import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STORY } from "../public/js/kids/stories/storm.js";
import { ACTIONS } from "../public/js/kids/puppet.js";
import { DISCOVERIES } from "../public/js/discoveries-data.js";
import { BOOKS, fileId } from "../public/js/books.js";
import { parseRange } from "../public/js/discoveries.js";

const bi = code => BOOKS.findIndex(b => b.osis === code);
const web = new Map();
const bookText = i => { if (!web.has(i)) web.set(i, JSON.parse(readFileSync(new URL(`../public/data/web/${fileId(i)}.json`, import.meta.url)))); return web.get(i); };
/** WEB text of an OSIS range, verses joined by spaces. */
function rangeText(r) {
  const p = parseRange(r, bi); assert.ok(p, `bad reference ${r}`);
  const b = bookText(p.b), out = [];
  for (let n = p.from; n <= p.to; n++) {
    const c = Math.floor(n / 1e3) % 1e3, v = n % 1e3;
    if (v === 0 || v > 200) { n = (Math.floor(n / 1e3) + 1) * 1e3; continue; }
    const t = b.chapters[c - 1]?.[v - 1]; if (t) out.push(t);
  }
  assert.ok(out.length, `no text for ${r}`);
  return out.join(" ");
}
const norm = s => s.replace(/[“”"]/g, "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").replace(/[,:;.]\s*$/, "").trim();
const KINDS = ["scripture", "retold", "background", "imagined", "thought"];

for (const [age, lines] of Object.entries(STORY.versions)) {
  test(`${STORY.id} ${age}: every line is tagged, referenced and quoted exactly`, () => {
    assert.ok(lines.length >= 8, "a version needs at least 8 lines");
    for (const [i, l] of lines.entries()) {
      const at = `${age} line ${i + 1}`;
      assert.ok(KINDS.includes(l.kind), `${at}: unknown kind ${l.kind}`);
      assert.ok(STORY.cast[l.who], `${at}: unknown speaker ${l.who}`);
      assert.ok(STORY.scenes[l.scene], `${at}: unknown scene ${l.scene}`);
      if (l.kind === "scripture" || l.kind === "retold") assert.ok(l.ref, `${at}: ${l.kind} needs a reference`);
      if (l.ref) rangeText(l.ref);
      if (l.kind === "scripture") assert.ok(norm(rangeText(l.ref)).includes(norm(l.text)), `${at}: not word for word in ${l.ref}: ${l.text}`);
      if (l.kind === "background") assert.ok(DISCOVERIES.some(d => d.id === l.source), `${at}: background needs a discovery source`);
      if (l.who !== "narrator" && l.kind === "scripture") assert.ok(l.note || l.who === "jesus", `${at}: a disciple speaking Scripture needs a note saying who really said it`);
      for (const [who, act] of Object.entries(l.act || {})) {
        assert.ok(STORY.cast[who]?.rig, `${at}: ${who} has no rig`);
        assert.ok(ACTIONS.includes(act), `${at}: unknown action ${act}`);
      }
    }
  });
}

test(`${STORY.id}: passages, quiz and parallels resolve`, () => {
  [...STORY.passages, ...STORY.parallels].forEach(rangeText);
  for (const [q, opts, a, ref] of STORY.quiz) { assert.ok(opts[a], q); rangeText(ref); }
  assert.equal(STORY.review.status === "approved" ? !!STORY.review.by : true, true, "an approved story names its reviewer");
});
