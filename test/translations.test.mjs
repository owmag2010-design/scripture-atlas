import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parseVpl, SELECTED, LICENCES } from "../scripts/build-trans.mjs";
import { HISTORY, NOT_HOSTED } from "../public/js/translations-info.js";
import { fileId } from "../public/js/books.js";

const L = p => JSON.parse(readFileSync(new URL(`../public/data/bible/${p}`, import.meta.url), "utf8"));
const B = (id, n) => JSON.parse(gunzipSync(readFileSync(new URL(`../public/data/bible/${id}/${n}.bin`, import.meta.url))).toString("utf8"));
const cat = L("catalogue.json");

test("VPL parser maps eBible book codes and keeps each translation's numbering", () => {
  const { books, other } = parseVpl("GEN 1:1 In the beginning\nJOH 3:16 For God\nTOB 1:1 Tobit\nPSA 23:1  The LORD   is my shepherd\n");
  assert.equal(books[0][0][0], "In the beginning");
  assert.equal(books[42][2][15], "For God");
  assert.equal(books[18][22][0], "The LORD is my shepherd");
  assert.equal(other, 1);
  assert.equal(books[42][2][0], "");
});

test("every selected translation is built with all 66 books", () => {
  assert.equal(cat.length, Object.keys(SELECTED).length);
  for (const t of cat) for (let i = 0; i < 66; i++) assert.ok(existsSync(new URL(`../public/data/bible/${t.id}/${fileId(i)}.bin`, import.meta.url)), `${t.id} book ${i}`);
});

test("Genesis 1:1 and John 3:16 are present in every translation", () => {
  for (const t of cat) {
    assert.ok(B(t.id, "01").chapters[0][0], `${t.id} Genesis 1:1`);
    assert.ok(B(t.id, "43").chapters[2][15], `${t.id} John 3:16`);
    assert.ok(t.verses > 30000, `${t.id} has ${t.verses} verses`);
  }
});

test("only redistributable licences that allow commercial use", () => {
  const allowed = new Set(Object.values(LICENCES));
  for (const t of cat) {
    assert.ok(allowed.has(t.licence), `${t.id}: ${t.licence}`);
    assert.ok(!/non-?commercial|\bNC\b/i.test(t.licence + t.copyright), t.id);
  }
});

test("right-to-left scripts are marked", () => {
  for (const id of ["arb-vd", "heb", "pesOPV"]) assert.equal(cat.find(t => t.id === id).dir, "rtl", id);
  assert.equal(cat.find(t => t.id === "fraLSG").dir, "ltr");
});

test("every hosted translation has a history note, and copyrighted ones are described not hosted", () => {
  for (const t of [{ id: "kjv" }, { id: "web" }, ...cat]) {
    const h = HISTORY[t.id];
    assert.ok(h && h.year && h.base && h.history.length > 60, `history for ${t.id}`);
  }
  for (const n of NOT_HOSTED) assert.ok(!cat.some(t => t.name.includes(n.code)), n.code);
});
