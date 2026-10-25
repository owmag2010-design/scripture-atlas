// Canonical book list for Ereunia (Protestant 66-book canon, English versification).
// Index 0–65 is the canonical order used by every data file.

export const BOOKS = [
  ["Genesis", "Gen", ["gn", "ge"]], ["Exodus", "Exod", ["ex", "exo"]], ["Leviticus", "Lev", ["lv", "le"]],
  ["Numbers", "Num", ["nm", "nu"]], ["Deuteronomy", "Deut", ["dt", "deu"]], ["Joshua", "Josh", ["jos", "jsh"]],
  ["Judges", "Judg", ["jdg", "jg", "jdgs"]], ["Ruth", "Ruth", ["rth", "ru"]], ["1 Samuel", "1Sam", ["1sa", "1 sm", "1sm"]],
  ["2 Samuel", "2Sam", ["2sa", "2 sm", "2sm"]], ["1 Kings", "1Kgs", ["1ki", "1kg"]], ["2 Kings", "2Kgs", ["2ki", "2kg"]],
  ["1 Chronicles", "1Chr", ["1ch", "1chron"]], ["2 Chronicles", "2Chr", ["2ch", "2chron"]], ["Ezra", "Ezra", ["ezr"]],
  ["Nehemiah", "Neh", ["ne"]], ["Esther", "Esth", ["est", "es"]], ["Job", "Job", ["jb"]],
  ["Psalms", "Ps", ["psalm", "psa", "pss", "psm"]], ["Proverbs", "Prov", ["pr", "prv", "pro"]],
  ["Ecclesiastes", "Eccl", ["ecc", "ec", "qoh", "qoheleth"]], ["Song of Solomon", "Song", ["song of songs", "sos", "so", "canticles", "sng"]],
  ["Isaiah", "Isa", ["is"]], ["Jeremiah", "Jer", ["je", "jr"]], ["Lamentations", "Lam", ["la"]],
  ["Ezekiel", "Ezek", ["eze", "ezk"]], ["Daniel", "Dan", ["da", "dn"]], ["Hosea", "Hos", ["ho"]],
  ["Joel", "Joel", ["jl"]], ["Amos", "Amos", ["am"]], ["Obadiah", "Obad", ["ob", "oba"]],
  ["Jonah", "Jonah", ["jnh", "jon"]], ["Micah", "Mic", ["mc"]], ["Nahum", "Nah", ["na"]],
  ["Habakkuk", "Hab", ["hb"]], ["Zephaniah", "Zeph", ["zep", "zp"]], ["Haggai", "Hag", ["hg"]],
  ["Zechariah", "Zech", ["zec", "zc"]], ["Malachi", "Mal", ["ml"]], ["Matthew", "Matt", ["mt", "mat"]],
  ["Mark", "Mark", ["mk", "mrk", "mar"]], ["Luke", "Luke", ["lk", "luk"]], ["John", "John", ["jn", "jhn", "joh"]],
  ["Acts", "Acts", ["ac", "act"]], ["Romans", "Rom", ["ro", "rm"]], ["1 Corinthians", "1Cor", ["1co"]],
  ["2 Corinthians", "2Cor", ["2co"]], ["Galatians", "Gal", ["ga"]], ["Ephesians", "Eph", ["ephes"]],
  ["Philippians", "Phil", ["php", "pp"]], ["Colossians", "Col", ["co"]], ["1 Thessalonians", "1Thess", ["1th", "1thes"]],
  ["2 Thessalonians", "2Thess", ["2th", "2thes"]], ["1 Timothy", "1Tim", ["1ti", "1tm"]], ["2 Timothy", "2Tim", ["2ti", "2tm"]],
  ["Titus", "Titus", ["tit", "ti"]], ["Philemon", "Phlm", ["phm", "philem", "pm"]], ["Hebrews", "Heb", ["he"]],
  ["James", "Jas", ["jm", "jam"]], ["1 Peter", "1Pet", ["1pe", "1pt", "1p"]], ["2 Peter", "2Pet", ["2pe", "2pt", "2p"]],
  ["1 John", "1John", ["1jn", "1jo", "1jhn"]], ["2 John", "2John", ["2jn", "2jo", "2jhn"]], ["3 John", "3John", ["3jn", "3jo", "3jhn"]],
  ["Jude", "Jude", ["jud", "jd"]], ["Revelation", "Rev", ["re", "rv", "revelations", "apocalypse"]]
].map(([name, osis, aliases], i) => ({ i, name, osis, aliases }));

export const NAMES = BOOKS.map(b => b.name);

export const GROUPS = [
  ["Law", 0, 4], ["History", 5, 16], ["Wisdom and Poetry", 17, 21], ["Major Prophets", 22, 26],
  ["Minor Prophets", 27, 38], ["Gospels and Acts", 39, 43], ["Pauline Letters", 44, 56],
  ["General Letters", 57, 64], ["Apocalyptic", 65, 65]
];

export const groupOf = i => GROUPS.find(g => i >= g[1] && i <= g[2])[0];
export const testamentOf = i => (i < 39 ? "Old Testament" : "New Testament");
export const fileId = i => String(i + 1).padStart(2, "0");

// Third-party study site slugs (link out only).
const BLB = "gen exo lev num deu jos jdg rut 1sa 2sa 1ki 2ki 1ch 2ch ezr neh est job psa pro ecc sng isa jer lam eze dan hos joe amo oba jon mic nah hab zep hag zec mal mat mar luk jhn act rom 1co 2co gal eph phl col 1th 2th 1ti 2ti tit phm heb jas 1pe 2pe 1jo 2jo 3jo jde rev".split(" ");
export const blbCode = i => BLB[i];
export const bibleHubSlug = i => (i === 21 ? "songs" : NAMES[i].toLowerCase().replace(/ /g, "_"));
export const sefariaName = i => {
  let n = i === 21 ? "Song of Songs" : NAMES[i];
  n = n.replace(/^1 /, "I ").replace(/^2 /, "II ");
  return n.replace(/ /g, "_");
};
