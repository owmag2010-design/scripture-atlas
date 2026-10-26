// Writes docs/rights-inventory.csv: every image Ereunia publishes, with its source, licence and the changes made to it.
import { writeFileSync, readdirSync, existsSync } from "node:fs";
import { IMAGES } from "../public/js/images.js";
import { BOOK_ART, PEOPLE_ART } from "../public/js/art.js";
import { DISCOVERIES } from "../public/js/discoveries-data.js";

const rows = [["file", "subject", "creator", "licence", "source", "what it shows", "modifications"]];
const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
for (const [k, m] of Object.entries(IMAGES)) rows.push([`img/${k}.webp`, m.title, m.artist, m.licence || "Public domain", m.source || "", "Artwork or manuscript image", "Cropped, resized, converted to WebP"]);
for (const [k, m] of Object.entries(BOOK_ART)) rows.push([`img/books/${k}.webp`, m.title, "Gustave Doré (1866)", "Public domain", m.source, m.related ? "Related engraving, not this book's own scene" : "Engraving", "Resized, converted to WebP"]);
for (const [k, m] of Object.entries(PEOPLE_ART)) rows.push([`img/people/${k}.webp`, m.title, "Gustave Doré (1866)", "Public domain", m.source, "Engraving", "Resized, converted to WebP"]);
for (const d of DISCOVERIES.filter(d => d.image?.local)) rows.push([`img/disc/${d.id}.webp`, d.name, d.image.author, d.image.licence, d.image.source, { object: "The object itself", site: "The site, not an artefact", "site-replica": "The site, with replicas of objects", replica: "A replica" }[d.image.depicts] || "", "Resized to 1400 px, converted to WebP; licence unchanged"]);
const kids = existsSync("public/img/kids") ? readdirSync("public/img/kids").filter(f => f.endsWith(".webp") && !f.includes("-sm")) : [];
for (const f of kids) rows.push([`img/kids/${f}`, f.replace(/\.webp$/, ""), "Made for Ereunia with an AI image tool", "Ereunia", "", "Illustration, not documentary evidence", "Generated; resized"]);
writeFileSync("docs/rights-inventory.csv", rows.map(r => r.map(q).join(",")).join("\n") + "\n");
console.log(`${rows.length - 1} images listed in docs/rights-inventory.csv`);
