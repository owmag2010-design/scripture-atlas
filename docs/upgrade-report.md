# Ereunia upgrade: handover (26 October 2026)

Preview: https://deploy-preview-1--scripture-atlas-om.netlify.app (Netlify team login required). Pull request #1, branch `ereunia-upgrade`. Production (ereunia.com, branch `main`) is unchanged until the pull request is merged. The starting point is recorded in `docs/baseline.md`.

## Implemented and verified

### Journeys run on the deploy preview, in Chrome
1. Searching "John 1:1" from the homepage opens the Research Desk at John 1:1.
2. The passage reads with KJV and WEB side by side in the Passage panel.
3. λόγος opens in the Greek panel with grammar and its lexicon entry, which names its source ("Translators Brief Lexicon (TBESG, based on Abbott-Smith)").
4. Following the Genesis 1:1 cross reference opens Genesis 1:1 with the Connections panel still open.
5. Going back returns to John 1:1 with the same panel and verse selected.
6. The research trail recorded the verse, the passage and the word. It was saved as a named trail and reopened from My study.
7. Searching "Lachish" on the atlas opens the place, lists its linked discoveries (Lachish Letters, Tel Lachish) and opens the discovery page.
8. A live question on John 1:1 to the research assistant returned an answer that:
   - cited the Greek lexicon;
   - marked all three interpretation statements as "Editorial inference";
   - removed two statements that credited "scholars" without a source naming them, and one misquotation, each with a stated reason.
9. Pre-rendered pages for discoveries, translations, sections and KJV chapters are served with their own title and canonical URL. sitemap.xml (5,693 URLs) and robots.txt are served.

### Verified locally (Chromium, Firefox and WebKit engines)
- **Page crawl:** 150 pages on phone and desktop. There is no horizontal overflow, no broken images and no script errors.
- **Accessibility:** axe (WCAG 2.0/2.1/2.2 A and AA) on 12 page and theme combinations reports 0 violations, after fixing gold text contrast and the language tags.
- **Keyboard:** menus open with the arrow keys, close with Escape and return focus. Desk tabs support arrow, Home and End keys. The zoom viewer supports + / − / 0 / Escape.
- **Research export:** trails export to Markdown with absolute citation links and verse text. Teaching outlines are built from a trail, with no AI. Backup downloads and restores in merge or replace mode. A crafted backup containing `__proto__` and HTML was rejected safely: no prototype pollution and no HTML injected.
- **Rendering:** Hebrew right to left with vowel points, and Greek, in light and dark modes, on phone, tablet and desktop.
- **Tests:** `npm test` passes 147, up from 128.

## Implemented but not verified
- **Exports in Chrome on the preview:** these download a file, so they were checked locally in Playwright instead.
- **AI accuracy in general:** the checks remove unsupported group attributions and misquotations. They cannot confirm that every claim is true, and the interface says so.
- **Real search engine indexing:** the pages, sitemap and canonical URLs are in place, but no crawler has seen them yet.
- **Speed on slow networks:** largest paint improved locally on every page measured (home 880 → 568 ms, reader 444 → 356 ms, atlas 960 → 860 ms). Real-device field data is not available.

## External dependencies
- **Corrections address:** info@ereunia.com is published on About and Credits. The domain has no mail (MX) records yet, so a mailbox or forwarding must be set up before mail is delivered.
- **Accounts and sync:** optional accounts, cross-device sync, entitlements and usage metering need an auth and database provider and a decision on one. Storage is versioned and has backup and restore, ready for migration, but no account system has been simulated.
- **IIIF deep zoom:** this needs partner institutions' IIIF endpoints and permission, plus changes to the security policy to allow them. A local zoom viewer is used for Ereunia's own images.

## Deferred
- **People and place pages:** these are in the sitemap but render in the browser rather than being pre-rendered (there are about 4,300 of them).
- **Manuscript coverage:** shown at book level from published descriptions, not verse by verse.
- **Map alternatives:** the atlas and maps offer searchable text panels and place lists. A full text alternative for every map view is a further step.
- **Data note:** a curated note for Heli is keyed to `heli_1527`, but the data uses `heli_1484`, so the note never shows.

## Notes for production
- Netlify serves pre-rendered files at lower-cased paths (`/read/kjv/john.1`). The app accepts any case, and canonical URLs use the lower-cased form.
- The function bundle now includes the Hebrew and Greek data (`data/orig`, `data/lex`), which is needed for lexicon retrieval. The preview build and live AI call succeeded with it.
- Merging the pull request deploys everything to ereunia.com. Old `/#/` links keep working.

## Design pass (26 October 2026)
- **Labels:** labels read as margin notes, in small italic Garamond and gilt, instead of tracked capitals. Status chips use sentence case.
- **Surfaces:** three kinds. Prose sits open on the page. Panels are kept for tools and facts. Image wells are kept for objects. Discovery records no longer box every paragraph.
- **Hover:** cards no longer lift on hover. Borders and colour answer instead.
- **Motion:** pages arrive with one short fade, and menus open from their button. Both are switched off for reduced motion.
- **Home:**
  - The three starting paths form one strip.
  - The verse for today opens with a rubric initial.
  - The evidence standards are one band with a heading.
- **Fixes and consistency:**
  - "Back to …" sits at the top of the page instead of floating over the content.
  - Discoveries without a licensed photo show a quiet hatched plate instead of a black block.
  - One search control everywhere: amber button, rounded field.
  - The search page explains what can be searched.
  - Header, page and footer share one width (1,320 px), so the Research Desk has more room for the text.
- **Checked after the pass:**
  - axe reports 0 violations on 15 page and theme combinations.
  - A crawl of 152 routes on phone and desktop, light and dark, found no overflow, broken images or script errors.
  - 147 tests pass.

## Pastor tools (27 October 2026, branch `pastors`)
- **Commentaries tab** in the Research Desk, from public-domain SWORD modules (CrossWire Bible Society): Matthew Henry (concise and complete), Jamieson–Fausset–Brown, Barnes (NT), Clarke, Keil and Delitzsch (OT) and Spurgeon's Treasury of David (Psalms). Each is labelled with its author, date and tradition, and marked as interpretation. Built at deploy time by `scripts/build-commentaries.mjs` (about 6,150 chapter files, 131 MB). Its output is limited to p, h4, i, b, br and links to Bible references; the build fails on anything else.
- **Prepare** (`/prepare/<passage>`): eight steps (Read, Observe, Words, Context, Commentaries, Connections, Outline, Apply), with notes, done ticks and collected material that keeps its citation. The outline exports to Word (.docx, written in the browser), prints as a handout or small-group guide, and opens in a Present view with slides and preaching notes, a timer and keeping the screen awake. Everything stays on the device and is included in backups.
- **For pastors** page (`/pastors`), an "Add to preparation" action on verses and commentary in the desk, and a "Prepare a sermon on it" link in study guides.
- **AI kept in the background:** the homepage block about AI is replaced by one about preparing to teach. "AI Studio" is renamed "Ask a question" and moved to the end of the Research menu. No AI is used in the pastor tools.
- **Checked:**
  - The full journey (desk commentary, Prepare steps, outline, Word, Present, handout, group guide) passes with no script errors.
  - The Word file opens in python-docx with the expected styles.
  - axe reports no new violations on the new pages.
  - 152 tests pass.

## Pastor tools, stage 2

- **Sermon series planner** (`/prepare/series`): name, first Sunday, weekly or fortnightly; fill from the chapters of a book or type passages; each week links to its preparation and shows progress. Exports an `.ics` calendar and prints a plan. Deleting a plan keeps its preparations.
- **Lectionary:** not included. The Revised Common Lectionary tables belong to the Consultation on Common Texts; they will be added only with its permission. Pastors can type readings into a plan.
- **Preached record:** "Mark as preached" (date and service) on each preparation; `/prepare/preached` lists every occasion by date and shows coverage by book, with CSV download.
- **Passage structure** in the Observe step: phrases set out with linking words marked and indented. Labelled as an English reading aid, not a grammatical analysis.
- **Sourced illustrations:** a new Illustrations tab in the Research Desk and a section in the Context step: discoveries (with what they do not show), dated events, places with archaeology and manuscripts, each with its source and an "Add" button.
- **Print menu:** handout, small-group guide, a passage study sheet (phrase layout with a ruled margin) and a family take-home sheet (reading in modern English, questions, the matching Ereunia Kids story, a drawing box).
- No AI is used in any of these tools.

## Sermon workspace (all four stages of the pastor plan)

**Foundation**
- Each sermon is its own record. Several sermons can share a passage. The first sermon on a passage keeps the passage as its id, so older links and saved preparations open unchanged.
- Workspace tabs: Study, Write, Notebook, Documents, Preach, Record and Details.
- Write: a manuscript editor with eight block types (heading, paragraph, Scripture, quotation, illustration, transition, private delivery cue, conclusion), between a research pane (passage, collected material, commentary) and the notebook.
  - Inserted material keeps its citation.
  - Undo and redo; autosave; named versions with restore. A version is also kept automatically before rebuilding and on leaving after changes.
  - Word count against the planned length.
- Notebook: observations, questions, quotations, illustrations, applications and interpretation, linked to verses and points.
- Details: title, date, venue, occasion, audience, series, status, topics, readings and notes for the service team.
  - Backups of everything, single-sermon files, duplicate and delete.
  - A request for persistent storage, with usage and the last-backup date shown.

**Sunday essentials**
- PDF studio, made in the browser with pdf-lib and fontkit (MIT), embedding EB Garamond and Schibsted Grotesk (OFL, trimmed copies in /fonts/pdf). Six templates:
  - study dossier;
  - full manuscript with page footnotes;
  - pulpit copy;
  - congregation handout with optional fill-in blanks;
  - small-group guide with editable questions;
  - family sheet.
- A4 or US Letter, page numbers, translation credits. Private notes and cues only when ticked.
- Word export of the manuscript.
- Preaching view:
  - manuscript mode in adjustable large type, with line spacing, a clock, a pausable timer against the planned length, a passage overlay and jump-to-point;
  - the reading position is saved;
  - Notes and Slides modes are kept.
- Opt-in offline copy: the passage is saved with the sermon, and a network-first service worker (/sw.js) keeps the files the preaching view needs.

**Recording and archive**
- Recording with MediaRecorder, independent of speech recognition. Audio is saved to IndexedDB every five seconds, so an interrupted recording is recoverable.
- Other recording tools:
  - pause, and marks during recording;
  - level meter;
  - optional live transcript;
  - import of audio and of .vtt, .srt or timed-text transcripts;
  - editable transcript with timestamps that seek the audio;
  - detection of the passages mentioned;
  - find-and-replace corrections;
  - downloads of audio and transcripts;
  - planned against actual length;
  - "Keep the manuscript as preached".
- Sermon library at /prepare: search by title, passage, topic, occasion, venue and date, with book, series and status filters.

**Deeper capabilities**
- "Trace this point": passage → observations → supporting sources → interpretation → application. Missing steps, quotations without citations, Scripture that does not match its cited translation, and AI-labelled text are flagged. Every block carries a "whose words" label.
- An editable structure board in the Observe step (indent, split, join, relation labels, notes), labelled as the pastor's analysis and kept distinct from the automatic reading aid.
- Series weeks create and link their own sermons, carry supporting readings and link to service materials.
- Illustration collection (/prepare/illustrations): source, how far checked, themes, passages and every use.
- Service pack: a zip of the chosen PDFs, 16:9 slides and a service brief.
- Sermon files can be shared and opened at /prepare/import.

**Not built:** account sync and live team collaboration need a server and accounts; sharing is by file for now. No AI is used anywhere in the workspace.
