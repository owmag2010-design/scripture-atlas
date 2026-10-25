# Scripture Atlas: Discoveries research brief (shared by all researchers)

Scripture Atlas (repo /home/claude/scripture-atlas, web root public/) is a Bible study site with strict rules:
no invented citations, artefacts, scholars, dates, museum numbers or quotes; sources visible; interpretation kept apart from fact.
You are adding entries to a new "Discoveries" section: archaeology, inscriptions, manuscripts and scientific methods
that bear on the Bible. Accuracy beats quantity. A short list of solid entries is far better than a long list with one error.

## Hard rules
1. Only documented, verifiable finds supported by museums, excavation reports, universities, antiquities authorities,
   or peer-reviewed scholarship. No pseudo-archaeology (e.g. Ron Wyatt claims, "Noah's Ark found", chariot wheels in the
   Red Sea, Ark of the Covenant claims), no fringe dating, no forgeries presented as genuine.
2. Known or suspected forgeries/unprovenanced items (James ossuary inscription, Jehoash tablet, Museum of the Bible
   "Dead Sea Scroll" fragments, Baruch bulla) are either left out or entered only with status "debated" and an explicit,
   sourced explanation of the authenticity problem.
3. Never claim evidence "proves" the Bible. State exactly what the object establishes (e.g. "a 9th-century BC Aramean
   king referred to a 'House of David'") and what it does not.
4. Every entry needs at least 2 sources, at least one from an institution (museum collection page, antiquities
   authority, university/excavation project, encyclopaedia of a scholarly society) or a peer-reviewed publication.
   You must open each URL with WebFetch and confirm it loads AND supports the facts you cite from it. Do not cite a URL
   you have not fetched. Prefer stable pages: British Museum collection (britishmuseum.org/collection/object/...),
   Louvre (collections.louvre.fr), Israel Museum (imj.org.il), Israel Antiquities Authority, Oriental Institute /
   ISAC Chicago, Metropolitan Museum, Penn Museum, Biblical Archaeology Society pages only as a secondary source.
   Wikipedia may help you find things but must NOT be a cited source.
5. Museum accession/registration numbers only if a fetched source states them.
6. Write in plain British English, short sentences, no hype words ("stunning", "amazing", "proves").
7. Do not modify any file in the repo. Write only your output file.

## Output: a JSON array written to the file path you are given. Each entry:
{
  "id": "tel-dan-stele",                     // kebab-case, unique
  "name": "Tel Dan Stele",
  "kind": "inscription",                     // one of: inscription, royal-record, seal, site, artefact, manuscript, method
  "summary": "One sentence, under 30 words.",
  "objectDate": { "text": "Late 9th century BC", "sort": -840 },   // sort = approximate year, negative = BC
  "found": { "year": 1993, "by": "Excavation team led by Avraham Biran", "where": "Tel Dan, northern Israel" },
  "location": { "lat": 33.249, "lon": 35.652, "placeSlug": "dan_xxx" },  // placeSlug only if it exists in public/data/hist/places.json (rows: [slug, name, lat, lon, type, cls, verses]); else omit placeSlug. lat/lon = find site.
  "heldAt": { "institution": "Israel Museum, Jerusalem", "ref": "" },   // ref only if a fetched source states it
  "language": "Old Aramaic",                 // or "" for sites/methods
  "description": "2–4 sentences: what the object/site is and what it says or shows.",
  "connection": "2–4 sentences: the biblical people, places or events it relates to, and how.",
  "establishes": "1–2 sentences: what it firmly shows.",
  "limits": "1–3 sentences: what it does not show; any scholarly disagreement on reading, dating or interpretation.",
  "status": "corroborates",                  // corroborates = names/matches a biblical person, place or event and this is widely accepted;
                                             // consistent = fits the biblical account but indirectly or partially;
                                             // debated = significant scholarly dispute on reading, date, authenticity or relevance;
                                             // method = for scientific methods only
  "passages": ["2Kgs.8.28-8.29", "2Kgs.9.14-9.29"],   // OSIS: Book.c.v or Book.c.v-c2.v2 (always give chapter in the end part). Book codes are BOOKS[i][1] in public/js/books.js (Gen, Exod, 1Sam, 2Kgs, 2Chr, Ezra, Isa, Jer, Dan, Matt, John, Acts, Rom ...). Check the verses really say what you claim (KJV text: public/data/kjv/<NN>.json if useful).
  "people": ["david_994"],                   // Theographic slugs from public/data/hist/people.json (rows [slug, name, aliases, desc, sex, verses]); verify each exists and is the right person (most verses usually wins for kings).
  "dating": ["stratigraphy", "palaeography"], // methods used to date it: radiocarbon, stratigraphy, palaeography, ceramic-typology, dendrochronology, historical-synchronism, numismatics, astronomical
  "sources": [ { "title": "Page title", "publisher": "British Museum", "url": "https://..." } ],
  "image": { "commons": "File:Exact Commons file name.jpg", "licence": "Public domain / CC BY-SA 4.0", "author": "..." }  // optional; only if you saw the Commons file page via WebFetch. Do not call the Commons API (another job is using it).
}

Quality bar: before finishing, re-read every entry and ask "could a museum curator object to any sentence?" Fix or cut.
Report back: the count, any entries you deliberately left out and why, and anything you are unsure of.
