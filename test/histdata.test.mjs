import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const L = p => JSON.parse(readFileSync(new URL(`../public/data/hist/${p}`, import.meta.url), "utf8"));
const person = slug => L(`people/${slug[0]}.json`)[slug];

test("Abraham's family links match Genesis", () => {
  const a = person("abraham_58");
  assert.deepEqual(a.father, ["terah_2841"]);
  assert.ok(a.children.includes("isaac_616") && a.children.includes("ishmael_630"));
  assert.ok(a.partners.includes("sarah_2473") && a.partners.includes("hagar_1348"));
  assert.equal(a.desc, "son of Terah");
  assert.ok(a.verses.includes(12001), "Genesis 12:1");
});

test("family links are two-way where both people exist", () => {
  const isaac = person("isaac_616");
  assert.ok(isaac.father.includes("abraham_58"));
});

test("people index is sorted by how often each person is mentioned", () => {
  const idx = L("people.json");
  assert.equal(idx.length, 3067);
  for (let i = 1; i < 50; i++) assert.ok(idx[i - 1][5] >= idx[i][5]);
});

test("differing genealogies carry an explicit note instead of being harmonised", () => {
  assert.match(person("joseph_1715").note, /Matthew 1:16.*Luke 3:23/);
  assert.match(person("jesus_905").note, /two different genealogies/);
});

test("places carry coordinates and an honest precision class", () => {
  const pl = L("places.json");
  const jer = pl.find(p => p[0] === "jerusalem_636");
  assert.ok(Math.abs(jer[2] - 31.78) < 0.05 && Math.abs(jer[3] - 35.23) < 0.05);
  assert.equal(jer[5], "located");
  assert.ok(pl.every(p => (p[5] === "unknown") === (p[2] === null)), "unknown places are never plotted");
  assert.equal(pl.find(p => p[0] === "egypt_362")[5], "related");
});

test("events are in order with years; the Exodus uses the dataset's traditional date", () => {
  const ev = L("events.json");
  assert.equal(ev.length, 450);
  assert.ok(ev.every(e => typeof e.year === "number"));
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i - 1].sort <= ev[i].sort);
  assert.equal(ev.find(e => e.title === "Exodus from Egypt").year, -1490);
  assert.equal(ev.find(e => /Crucifixion/.test(e.title)).year, 30);
});

test("verses link to the people, places and events in them", () => {
  const [ppl, , evs] = L("vx/01.json")["12001"];
  assert.ok(ppl.includes("abraham_58"));
  assert.ok(evs.length > 0);
});

test("base map is clipped to the biblical world", () => {
  const m = L("basemap.json");
  assert.ok(m.land.length > 10 && m.rivers.length > 10);
  const [x0, y0, x1, y1] = m.box;
  for (const ring of m.land) for (const [x, y] of ring) assert.ok(x >= x0 - 0.01 && x <= x1 + 0.01 && y >= y0 - 0.01 && y <= y1 + 0.01);
});

test("alternate place names are names, never internal record IDs", () => {
  for (const ch of "abcdefghijklmnopqrstuvwxyz") {
    let shard; try { shard = L(`places/${ch}.json`); } catch { continue; }
    for (const p of Object.values(shard)) assert.ok(!/rec[A-Za-z0-9]{10,}/.test(p.other), p.name);
  }
});
