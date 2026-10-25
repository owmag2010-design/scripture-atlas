// Editorial content: verse of the day, sources register, roadmap sections, study prompts.

export const DAILY = ["Ps.23.1", "John.3.16", "Rom.8.28", "Isa.40.31", "Phil.4.6", "Prov.3.5", "Matt.5.9", "Mic.6.8", "Lam.3.22", "Josh.1.9",
  "Heb.11.1", "1Cor.13.4", "Gal.5.22", "Ps.46.1", "John.1.1", "Gen.1.1", "Rom.12.2", "Eph.2.8", "Jas.1.5", "1John.4.8",
  "Rev.21.4", "Isa.9.6", "Ps.119.105", "Matt.11.28", "2Tim.3.16", "Deut.6.4", "Eccl.3.1", "Ruth.1.16", "Amos.5.24", "Hab.2.4"];

export const QUESTIONS = [
  "Observe: who is speaking, to whom, and what is happening?",
  "Context: how does this verse connect to the verses before and after it?",
  "History: what in the book's setting shapes how the first readers heard this?",
  "Words: which key word would repay a look in the Hebrew or Greek?",
  "Echoes: where else does Scripture say something similar?",
  "Response: what does this ask of the reader today?"
];

// Textual notes shown where the two translations follow different base texts.
export const TEXT_NOTES = {
  "Luke.17.36": "absent",
  "Acts.8.37": "absent",
  "Acts.15.34": "absent",
  "Acts.24.7": "absent",
  "Rom.16.25": "doxology", "Rom.16.26": "doxology", "Rom.16.27": "doxology",
  "Rom.14.24": "doxology", "Rom.14.25": "doxology", "Rom.14.26": "doxology"
};

export const SOURCES = [
  { name: "King James Version, with Strong's numbers", type: "Scripture · translation", owner: "CrossWire Bible Society and eBible.org", licence: "Public domain (Crown patent in the United Kingdom)", use: "Full text, word origins, translators' additions, marginal notes", url: "https://ebible.org/kjv/" },
  { name: "World English Bible", type: "Scripture · translation", owner: "eBible.org", licence: "Public domain", use: "Full text with paragraphs and poetry lines", url: "https://ebible.org/web/" },
  { name: "Book background notes", type: "Scripture Atlas editorial", owner: "Scripture Atlas", licence: "Original work", use: "Authorship, dating, setting and themes for 66 books, with traditional and critical views", url: null },
];

// Key manuscripts and editions behind the text. Dates are scholarly estimates; where they are debated a range is given.
// Each links to a passage inside Scripture Atlas where the manuscript matters.
export const MANUSCRIPTS = [
  { name: "Dead Sea Scrolls", img: "isaiah-scroll", date: "about 250 BC – AD 68", lang: "Hebrew, Aramaic, Greek", where: "Found 1947–1956 in caves near Qumran; mostly in Jerusalem",
    about: "Fragments of every book of the Hebrew Bible except Esther, about a thousand years older than the oldest complete Hebrew manuscripts. The Great Isaiah Scroll contains the whole of Isaiah and is close to the later Masoretic text, with many small differences.",
    see: ["Isa.53.1", "Isaiah 53, a chapter present in the Great Isaiah Scroll"] },
  { name: "Septuagint", img: "alexandrinus", date: "Torah about 3rd century BC; the rest by about 1st century BC", lang: "Greek", where: "Translated by Jewish scholars, traditionally in Alexandria",
    about: "The Greek translation of the Hebrew Scriptures, used by Greek-speaking Jews and the early church. New Testament writers often quote it, which is why some quotations differ from the Hebrew wording.",
    see: ["Heb.10.5", "Hebrews 10:5 quotes Psalm 40 in its Greek wording"] },
  { name: "Rylands Papyrus P52", img: "p52", date: "usually dated AD 125–175; some scholars argue later", lang: "Greek", where: "John Rylands Library, Manchester",
    about: "A palm-sized fragment of John's Gospel, often called the oldest known piece of the New Testament. Its date rests on handwriting style, so it is given as a range.",
    see: ["John.18.31", "John 18:31–33, on the front of the fragment"] },
  { name: "Papyrus P46", img: "p46", date: "about AD 200 (estimates range from about 175 to 250)", lang: "Greek", where: "Chester Beatty Library, Dublin, and the University of Michigan",
    about: "The oldest substantial collection of Paul's letters. It places Hebrews straight after Romans, and puts the closing praise of Romans after chapter 15.",
    see: ["Rom.16.25", "The Romans doxology, which manuscripts place differently"] },
  { name: "Codex Vaticanus", img: "vaticanus", date: "about AD 325–350", lang: "Greek", where: "Vatican Library, Rome",
    about: "One of the two oldest nearly complete Greek Bibles. Its New Testament breaks off at Hebrews 9:14. With Sinaiticus it is a key witness for modern critical editions.",
    see: ["Mark.16.9", "Mark 16:9–20, absent from Vaticanus and Sinaiticus"] },
  { name: "Codex Sinaiticus", img: "sinaiticus", date: "about AD 330–360", lang: "Greek", where: "Mostly British Library, London; parts at St Catherine's Monastery, Sinai, Leipzig and St Petersburg",
    about: "The oldest complete New Testament. Constantin von Tischendorf brought it to Europe from St Catherine's Monastery in the 1840s and 1850s.",
    see: ["John.7.53", "John 7:53–8:11, not in Sinaiticus"] },
  { name: "Latin Vulgate", img: "amiatinus", date: "about AD 382–405", lang: "Latin", where: "Translated by Jerome, mainly in Bethlehem",
    about: "Jerome's Latin translation, much of it from the Hebrew, became the Bible of the Western church for over a thousand years. Scripture Atlas hosts the Clementine edition of 1592.",
    see: ["#/translation/latVUC", "Read the Vulgate here"] },
  { name: "Aleppo Codex", img: "aleppo", date: "about AD 930", lang: "Hebrew", where: "Israel Museum, Jerusalem",
    about: "The most authoritative Masoretic manuscript, with vowels and accents added under Aaron ben Asher in Tiberias. About 40 percent, including most of the Torah, was lost after riots in Aleppo in 1947.",
    see: ["Deut.6.4", "Deuteronomy 6:4, in the section that survives"] },
  { name: "Leningrad Codex", img: "leningrad", date: "AD 1008", lang: "Hebrew", where: "National Library of Russia, St Petersburg",
    about: "The oldest complete manuscript of the Hebrew Bible, copied in Cairo. Modern scholarly editions are based on it, and so is the Hebrew text in Scripture Atlas.",
    see: ["Gen.1.1", "Genesis 1:1 in the Hebrew, word by word"] },
  { name: "Textus Receptus", img: "erasmus", date: "1516 onwards", lang: "Greek", where: "First printed by Erasmus in Basel; later editions by Stephanus and Beza",
    about: "The first printed Greek New Testaments, made from a small number of late medieval manuscripts. They underlie the King James Version's New Testament.",
    see: ["Acts.8.37", "Acts 8:37, in the Textus Receptus but not the oldest manuscripts"] },
  { name: "Critical editions (Nestle–Aland)", img: "", date: "28th edition 2012", lang: "Greek", where: "German Bible Society",
    about: "Editors weigh all known manuscripts, giving most weight to the earliest, and print the reading they judge original with the alternatives noted. Most modern translations follow this kind of text.",
    see: ["#/languages", "How the Greek text here marks these differences"] }
];

export const SOON = {
  research: { title: "Research", phase: 4, lead: "Follow a verse into everything connected to it.", items: ["Cross references are live now: open any verse and choose Cross refs", "People, places and events linked to each passage", "A knowledge graph from passage to word, person, place and theme"] },
  languages: { title: "Languages", phase: 2, lead: "Read the Hebrew, Aramaic and Greek beneath the English.", items: ["Interlinear Hebrew (Open Scriptures Hebrew Bible) and Greek (MorphGNT)", "Word explorer: lemma, parsing, transliteration, other occurrences", "STEPBible lexicons, with Strong's numbers shown as an index, not a definition"] },
  history: { title: "History", phase: 4, lead: "See where and when the story happened, and how sure we are.", items: ["Ancient-world maps from the Pleiades gazetteer", "A timeline by century, kingdom and ruler", "Established, traditional and disputed dates shown differently"] },
  learn: { title: "Learn", phase: 5, lead: "Structured study, from first steps to academic depth.", items: ["Courses such as Understanding Genesis and The historical Paul", "Quizzes, discussion questions and progress", "Family mode with age-appropriate explanations"] },
  ai: { title: "AI Studio", phase: 3, lead: "A research assistant that shows its sources.", items: ["Every answer split into Scripture, Translation, Historical evidence, Interpretation and Uncertainty", "Citations checked automatically before an answer is shown", "Study and sermon outlines marked as AI-generated until reviewed"] }
};
