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
  { name: "King James Version", type: "Scripture · translation", owner: "Public domain", licence: "Public domain (Crown patent in the United Kingdom)", use: "Full text", url: "https://github.com/thiagobodruk/bible" },
  { name: "World English Bible", type: "Scripture · translation", owner: "eBible.org", licence: "Public domain", use: "Full text with paragraphs and poetry lines", url: "https://ebible.org/web/" },
  { name: "Book background notes", type: "Scripture Atlas editorial", owner: "Scripture Atlas", licence: "Original work", use: "Authorship, dating, setting and themes for 66 books, with traditional and critical views", url: null },
  { name: "Bible Hub", type: "External link", owner: "Bible Hub", licence: "Linked, not copied", use: "Interlinear, commentaries, cross references", url: "https://biblehub.com/" },
  { name: "Blue Letter Bible", type: "External link", owner: "Blue Letter Bible", licence: "Linked, not copied", use: "Strong's lexicon and concordance", url: "https://www.blueletterbible.org/" },
  { name: "NET Bible", type: "External link", owner: "Biblical Studies Press", licence: "Linked, not copied", use: "Translators' and text-critical notes", url: "https://netbible.org/" },
  { name: "Sefaria", type: "External link", owner: "Sefaria", licence: "Linked, not copied", use: "Hebrew text and Jewish commentary", url: "https://www.sefaria.org/" }
];

export const LIBRARY = [
  ["Dead Sea Scrolls Digital Library", "Israel Antiquities Authority images of the Qumran scrolls", "https://www.deadseascrolls.org.il/"],
  ["Codex Sinaiticus", "4th-century Greek Bible, the oldest complete New Testament", "https://codexsinaiticus.org/"],
  ["CSNTM Manuscript Library", "Digitised Greek New Testament manuscripts", "https://www.csntm.org/"],
  ["STEP Bible", "Tyndale House, Cambridge: original-language tools", "https://www.stepbible.org/"],
  ["Bible Odyssey", "Society of Biblical Literature articles by academic scholars", "https://www.bibleodyssey.org/"],
  ["Biblical Archaeology Society", "Archaeology articles and discoveries", "https://www.biblicalarchaeology.org/"],
  ["Perseus Digital Library", "Greek and Latin classics, including Josephus", "https://www.perseus.tufts.edu/"],
  ["Early Christian Writings", "Church fathers and early texts in translation", "https://www.earlychristianwritings.com/"],
  ["Christian Classics Ethereal Library", "Church fathers, Reformers, classic commentaries", "https://www.ccel.org/"],
  ["BibleProject", "Book overview videos and theme studies", "https://bibleproject.com/"]
];

export const SOON = {
  research: { title: "Research", phase: 4, lead: "Follow a verse into everything connected to it.", items: ["Cross references are live now: open any verse and choose Cross refs", "People, places and events linked to each passage", "A knowledge graph from passage to word, person, place and theme"] },
  languages: { title: "Languages", phase: 2, lead: "Read the Hebrew, Aramaic and Greek beneath the English.", items: ["Interlinear Hebrew (Open Scriptures Hebrew Bible) and Greek (MorphGNT)", "Word explorer: lemma, parsing, transliteration, other occurrences", "STEPBible lexicons, with Strong's numbers shown as an index, not a definition"] },
  history: { title: "History", phase: 4, lead: "See where and when the story happened, and how sure we are.", items: ["Ancient-world maps from the Pleiades gazetteer", "A timeline by century, kingdom and ruler", "Established, traditional and disputed dates shown differently"] },
  learn: { title: "Learn", phase: 5, lead: "Structured study, from first steps to academic depth.", items: ["Courses such as Understanding Genesis and The historical Paul", "Quizzes, discussion questions and progress", "Family mode with age-appropriate explanations"] },
  ai: { title: "AI Studio", phase: 3, lead: "A research assistant that shows its sources.", items: ["Every answer split into Scripture, Translation, Historical evidence, Interpretation and Uncertainty", "Citations checked automatically before an answer is shown", "Study and sermon outlines marked as AI-generated until reviewed"] }
};
