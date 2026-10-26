# Ereunia baseline (verified 26 October 2026, before the upgrade)

## Project
- Repository: `owmag2010-design/scripture-atlas`, branch `main` (production). Upgrade work is on `ereunia-upgrade`.
- Netlify project: `scripture-atlas-om` (id f11048f9-a631-4d51-9fd6-320a9eca21e9). Production: https://ereunia.com (public). ereunia.org and both www hosts redirect to it. Deploy previews and branch deploys require Netlify team login.
- Build: `node scripts/fetch-sources.mjs && node scripts/fetch-ebible.mjs && npm run build` downloads every open dataset and builds `public/data` on Netlify.
- Functions: `/api/ask` (source-grounded research assistant) and `/api/sermon` (sermon outline), Anthropic model through the Netlify AI Gateway. Guarded by an Origin check, a JSON-only rule, a per-IP rate limit and a daily site-wide cap held in Netlify Blobs.
- Tests: `npm test`, 128 passing.

## Application
- Static single-page app with hash routes (`#/read/...`). Main code is `public/js/app.js` (about 2,100 lines), plus modules for the atlas, discoveries, search, store, lens, kids, share and more.
- Routes: home, read, search, word, languages, ai, bibles, guide, translation, compare, history (map, journeys, timeline, people), learn and its courses, person, place, study, library, credits, research, lens, sermon, kids, books, atlas, discoveries, share.
- Data: 54 Bibles in 38 languages (eBible.org); KJV with Strong's numbers; STEPBible TAHOT, TAGNT and lexicons; OpenBible cross references; Theographic people, places and events; Easton's dictionary; 66 curated discoveries (`content/discoveries`); Natural Earth relief.
- Personal data: `localStorage` only (notes, highlights, bookmarks, collections, history, saved answers, sermons). There is a Markdown export but no import or restore.

## Measured performance (live site, phone viewport, from the build container through its proxy)
| Page | Load event | Largest paint | Requests | Transferred |
|---|---|---|---|---|
| Home | 4.9 s | 3.2 s | 84 | 2.1 MB |
| Reader, John 1 | 4.0 s | 1.8 s | 49 | 570 KB |
| Lens, John 1:1 | 3.8 s | 3.7 s | 67 | 913 KB |
| Atlas | 3.8 s | 3.1 s | 52 | 1.3 MB |
| Discoveries | 3.8 s | 1.6 s | 49 | 760 KB |

Every page loads `discoveries-data.js` (169 KB), `courses.js`, the atlas modules and all art metadata before the first render, because `app.js` imports them eagerly, and the router waits for image and art manifests before drawing anything.

## Known issues found in the audit
1. **AI attribution.** Asked "What does John 1:1 mean?", the assistant wrote three interpretation statements beginning "Many (Christian) interpreters…" whose only citations were Bible verses and a dataset tag. Nothing in the sources names those interpreters. The validator checks that citations exist and that quotations match, not that a source supports an attribution.
2. **AI retrieval.** The same answer said the sources "do not cover the Greek text or the term logos", although Ereunia holds STEPBible lexicon data for every word of John 1:1. A question about David's father failed to retrieve 1 Samuel 16 or the Jesse genealogy.
3. **Internal phase language** shown to users: "accounts that sync across devices arrive in Phase 3" (My study).
4. **Catalogue text:** language "German, Standard"; Young's Literal Translation's language shown as "ENGLISH"; Bengali IRV name has native-script text appended.
5. **Hash URLs:** there are no crawlable paths, so every page shares one title and description and there is no sitemap.
6. **Library page** mixes manuscript browsing with the credits register.
7. **Navigation:** 13 top-level links on desktop. Learn, Sermons and Kids sit beside core research tools.
8. **No backup or restore** of personal research. No research trail.
