import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, zipStore, buildDocx } from "../public/js/docx.js";

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xCBF43926);
});

test("zipStore output unzips with the system unzip", () => {
  const dir = mkdtempSync(join(tmpdir(), "zip-"));
  const f = join(dir, "t.zip");
  writeFileSync(f, zipStore([{ name: "a.txt", data: "hello" }, { name: "b/c.txt", data: "wörld" }]));
  const list = execFileSync("unzip", ["-l", f]).toString();
  assert.match(list, /a\.txt/); assert.match(list, /b\/c\.txt/);
  assert.equal(execFileSync("unzip", ["-p", f, "b/c.txt"]).toString(), "wörld");
  execFileSync("unzip", ["-tq", f]);
});

test("buildDocx escapes text and keeps every block", () => {
  const bytes = buildDocx([{ type: "title", text: "John 1 & <you>" }, { type: "quote", text: "In the beginning" }, { type: "bullet", text: "Point" }], { title: "T" });
  const dir = mkdtempSync(join(tmpdir(), "docx-"));
  const f = join(dir, "t.docx"); writeFileSync(f, bytes);
  const doc = execFileSync("unzip", ["-p", f, "word/document.xml"]).toString();
  assert.match(doc, /John 1 &amp; &lt;you&gt;/);
  assert.match(doc, /In the beginning/);
  assert.match(doc, /• Point/);
  assert.doesNotMatch(doc, /<you>/);
});
