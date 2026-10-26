// Pre-renders crawlable HTML for Ereunia's public pages and writes sitemap.xml and robots.txt.
// Each page is a copy of index.html with its own title, description, canonical URL, sharing tags and a readable
// version of the content inside <main>; the app replaces that content when it starts.
// Files are written as <path>.html, which Netlify serves at <path> without a redirect.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { BOOKS, NAMES } from "../public/js/books.js";
import { formatRef } from "../public/js/ref.js";
import { DISCOVERIES } from "../public/js/discoveries-data.js";
import { STATUS, KINDS } from "../public/js/discoveries.js";
import { CONTEXT } from "../public/js/context.js";

const SITE = "https://ereunia.com";
const PUB = new URL("../public/", import.meta.url);
const tpl = readFileSync(new URL("index.html", PUB), "utf8");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fileId = i => String(i + 1).padStart(2, "0");
const urls = [];
let count = 0;

function page(path, { title, description, body, image }) {
  path = path.toLowerCase();   // Netlify serves files at lower-cased paths
  const url = SITE + path, full = title ? `${title} · Ereunia` : "Ereunia · Search the Scriptures", desc = description.slice(0, 300);
  let html = tpl
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(full)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title || "Ereunia")}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(full)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`)
    .replace(/<main id="view" tabindex="-1">[\s\S]*?<\/main>/, `<main id="view" tabindex="-1"><div class="prerender">${body}</div></main>`);
  if (image) html = html.replace(/(<meta property="og:image" content=")[^"]*(">)/, `$1${esc(image)}$2`).replace(/(<meta name="twitter:image" content=")[^"]*(">)/, `$1${esc(image)}$2`);
  const file = new URL(path === "/" ? "index.html" : path.slice(1) + ".html", PUB);
  if (path !== "/") { mkdirSync(dirname(file.pathname), { recursive: true }); writeFileSync(file, html); count++; }
  urls.push(url);
}

// Sections
const SECTIONS = [
  ["/read", "Bible reader", "Read and research any passage: original words, translations, connections, history and manuscripts beside the text."],
  ["/books", "Books of the Bible", "All 66 books of the Bible with their background, dating views and themes."],
  ["/bibles", "Bibles and translations", "54 complete, openly licensed Bibles in 38 languages, each with the story of its translation."],
  ["/discoveries", "Discoveries", `${DISCOVERIES.length} documented archaeological, manuscript and scientific finds, each with what it shows, what it doesn't and its sources.`],
  ["/atlas", "Atlas", "An interactive atlas of 1,267 places from Scripture, with journeys, historical periods and archaeological sites."],
  ["/history/timeline", "Timeline", "Events of the Bible on a timeline, with how firm each date is."],
  ["/history/journeys", "Journeys", "Follow Abraham, the Exodus and Paul's journeys stop by stop."],
  ["/history/people", "People of the Bible", "More than 3,000 people of the Bible, with family trees and every verse that names them."],
  ["/languages", "Hebrew and Greek", "Interlinear Hebrew and Greek for every verse, with grammar and lexicon entries."],
  ["/library", "Library", "The manuscripts behind the Bible text, from the Dead Sea Scrolls to modern critical editions."],
  ["/credits", "Credits and licences", "Every dataset, image and font used by Ereunia, with its owner and licence."],
  ["/learn", "Courses", "Structured Bible study courses with readings, questions and quizzes."],
  ["/sermon", "Sermon studio", "Record a sermon, catch every Bible reference and turn it into study notes."],
  ["/kids", "Bible stories for children", "Eight illustrated Bible stories to read and hear, each showing where to find it in the Bible."],
  ["/ai", "Research assistant", "Ask a question and see exactly which sources the answer rests on."],
  ["/search", "Search", "Search passages, original words, people, places, discoveries and manuscripts."],
  ["/share", "Share cards", "Make a branded card of any Bible verse or documented discovery to share."],
  ["/about", "About Ereunia", "What Ereunia is, how its pages are written and sourced, and how to send a correction."],
  ["/privacy", "Privacy and your data", "What Ereunia stores on your device and what is sent when you use a feature."]
];
page("/", { title: "", description: "Ancient Scripture. A new depth of discovery. Every word of the Bible, traced to its source.", body: "<h1>Ereunia: every word of the Bible, traced to its source</h1>" });
for (const [p, t, d] of SECTIONS) page(p, { title: t, description: d, body: `<h1>${esc(t)}</h1><p>${esc(d)}</p>` });

// KJV chapters with their text
const index = JSON.parse(readFileSync(new URL("data/index.json", PUB), "utf8"));
for (let b = 0; b < 66; b++) {
  const f = new URL(`data/kjv/${fileId(b)}.json`, PUB); if (!existsSync(f)) continue;
  const chs = JSON.parse(readFileSync(f, "utf8")).chapters;
  chs.forEach((vs, c) => {
    const ref = formatRef(b, c + 1), first = (vs.find(Boolean) || "").replace(/\s+/g, " ");
    page(`/read/kjv/${BOOKS[b].osis}.${c + 1}`, {
      title: `${ref} (KJV)`,
      description: `${ref} in the King James Version: ${first.slice(0, 200)}${first.length > 200 ? "…" : ""} Read it with the ${b < 39 ? "Hebrew" : "Greek"}, cross references and background.`,
      body: `<article><h1>${esc(ref)}</h1><p>King James Version</p>${vs.map((v, i) => v ? `<p><sup>${i + 1}</sup> ${esc(v)}</p>` : "").join("")}<p>${esc(NAMES[b])}: ${esc(CONTEXT[b]?.[5] || "")}</p></article>`
    });
  });
}

// Discoveries
for (const d of DISCOVERIES) {
  page(`/discoveries/${d.id}`, {
    title: d.name,
    description: `${d.summary} Evidence status: ${STATUS[d.status]?.label}.`,
    image: d.image?.local ? `${SITE}/img/disc/${d.id}.webp` : null,
    body: `<article><h1>${esc(d.name)}</h1><p>${esc(KINDS[d.kind] || "")} · ${esc(STATUS[d.status]?.label || "")}</p><p>${esc(d.summary)}</p><h2>What it is</h2><p>${esc(d.description)}</p><h2>What it establishes</h2><p>${esc(d.establishes)}</p><h2>Limits and debate</h2><p>${esc(d.limits)}</p><h2>Sources</h2><ul>${(d.sources || []).map(s => `<li><a href="${esc(s.url)}">${esc(s.title)}</a>, ${esc(s.publisher)}</li>`).join("")}</ul></article>`
  });
}

// Translations
const cat = existsSync(new URL("data/bible/catalogue.json", PUB)) ? JSON.parse(readFileSync(new URL("data/bible/catalogue.json", PUB), "utf8")) : [];
for (const t of [...index.translations.map(t => ({ id: t.id, name: t.name || t.short, language: "English", licence: "Public domain" })), ...cat]) {
  if (!t?.id) continue;
  page(`/translation/${t.id}`, { title: t.name, description: `${t.name}${t.languageEn || t.language ? ` (${t.languageEn || t.language})` : ""}: read it on Ereunia, with its history and licence (${t.licence || "open licence"}).`, body: `<h1>${esc(t.name)}</h1><p>${esc(t.description || "")}</p>` });
}

// People and places are rendered by the app; list them in the sitemap.
const hist = n => existsSync(new URL(`data/hist/${n}.json`, PUB)) ? JSON.parse(readFileSync(new URL(`data/hist/${n}.json`, PUB), "utf8")) : [];
for (const r of hist("people")) urls.push(`${SITE}/person/${r[0]}`);
for (const r of hist("places")) urls.push(`${SITE}/place/${r[0]}`);

const today = new Date().toISOString().slice(0, 10);
writeFileSync(new URL("sitemap.xml", PUB), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(new URL("robots.txt", PUB), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`pages: ${count} pre-rendered, sitemap: ${urls.length} URLs`);
