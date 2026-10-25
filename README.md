# Scripture Atlas — Phase 1

Bible study and research app for owenmagocha.org/scripture.
Scripture first. Sources visible. Interpretation distinguished from fact.

## What is here
- Reader: KJV and WEB, parallel mode, paragraphs and poetry (WEB), focus mode, text sizes, light/dark.
- Study margin: book background (traditional and critical dating), verse comparison, textual notes, research links.
- Search: words, exact "phrases" and references (John 3:16, 1 cor 13, Jude 3).
- My study: notes, bookmarks, highlights, reading history, resume position, Markdown export. Stored on the device (Phase 3 adds accounts).
- Library: source register with licences.

## Phase 2 (original languages)
- Interlinear mode: Hebrew (Leningrad Codex) or Greek under each verse, word by word.
- Word explorer: form, transliteration, gloss, grammar decoded, dictionary form, Strong's (as an index), lexicon entry, every occurrence.
- Text-critical flags: Greek words only in the TR or only in NA28; Hebrew Qere readings; Aramaic identified.
- Cross references: top 15 per verse from OpenBible.info, ranked by votes.
- Word study pages at #/word/<Strong's>, and a Languages page.
Data: STEPBible TAHOT, TAGNT, TBESH, TBESG, TEHMC, TEGMC (CC BY 4.0, Tyndale House Cambridge); OpenBible.info cross references (CC BY).

## Phase 4 (history)
- Map of the biblical world (Natural Earth base map, no tile server): 1,267 places, styled by how certain the location is.
- Timeline of 450 events in nine eras, each date labelled Traditional reckoning, Approximate, or Approximate within a few years.
- 3,067 people with family trees, father's line, events, Easton's dictionary entries and every verse.
- Reader "People" tab: people, places and events in each verse or chapter.
- Differing genealogies (e.g. Joseph in Matthew 1 and Luke 3) carry explicit notes rather than being harmonised.
Data: Theographic Bible Metadata (CC BY-SA 4.0; derived data shared alike), OpenBible.info coordinates (CC BY), Easton's Bible Dictionary 1897 (public domain), Natural Earth (public domain).

## Phase 5 (learn)
- Four courses, 16 lessons: Bible foundations, Understanding Genesis, The life of Jesus, Biblical Hebrew first steps.
- Each lesson: objectives, Bible readings rendered from the data (never retyped), teaching, discussion, quiz with explanations and verse links.
- Family mode with child-friendly explanations and questions. Progress, best scores and a study streak saved on the device.
- All courses are labelled "AI-assisted draft" until reviewed; change `status` to "reviewed" in public/js/courses.js after editorial review.
- test/courses.test.mjs checks every reading and quiz reference is a real verse and every quiz is well formed.

## Phase 3 (AI Studio)
- netlify/functions/ask.mjs at /api/ask, using the Netlify AI Gateway (Claude Sonnet 5.5; set ATLAS_MODEL to change). Billed as Netlify credits; rate-limited to 12 questions a minute per visitor.
- Retrieves numbered sources (passage in KJV and WEB, cross references, tagged people/events, book background), then answers in five sections: Scripture, Translation, Historical evidence, Interpretation, Uncertainty.
- public/js/ai-core.js drops any statement without a valid citation, and any quotation not found word for word in its cited source.
- Accounts (Supabase) still to come; answers are kept on the device.

## Bibles (54 translations, 38 languages)
- scripts/build-trans.mjs builds 52 eBible.org translations plus KJV and WEB. Only public domain, CC BY, CC BY-SA and CC BY-ND (shown unchanged) — no non-commercial licences.
- public/js/translations-info.js: history and origin of each, plus copyrighted translations (NIV, ESV, ...) described and linked, not hosted.
- Reader: any translation, compare with any other, right-to-left scripts, each translation's own verse numbering noted.
- Search works in every script (accents and vowel points ignored; Chinese, Korean, Thai matched inside words).

## Study guide
- #/guide/<passage>, e.g. #/guide/John.15.1-17: read, background, observe (repeated words), key Hebrew/Greek words, cross references, interpret (questions by genre), apply. Answers saved on the device; download as Markdown or print.

## Commands
- `npm test` runs the test suite (reference parsing, search, study store, Bible and language data integrity, morphology).
- `npm run build` rebuilds all of `public/data` from `raw/` (Bible texts first, then language data) and reports versification differences.

## Data
- KJV: public domain (Crown patent in the UK). Source: github.com/thiagobodruk/bible.
- WEB: public domain. Source: eBible.org via github.com/TehShrike/world-english-bible.
Known differences kept as published: Romans doxology at 14:24–26 in WEB; Luke 17:36, Acts 8:37, 15:34, 24:7 absent from WEB's base text.

## Rebuilding from scratch
`npm run fetch` downloads every source (STEPBible, OpenBible, Theographic, Natural Earth, KJV, WEB, eBible.org) into raw/, then `npm run build` regenerates public/data. Netlify runs both on every deploy, so only source code is uploaded.

## Deploy
Static site, publish directory `public`, no build command. Routing is hash-based, so it works at a site root or behind a proxy at /scripture/.
