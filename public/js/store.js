// Personal study data kept on this device (Phase 1). One versioned JSON record,
// so it can be migrated to user accounts in Phase 3 without changing its shape.
// Keys are OSIS references, e.g. "John.3.16".

const KEY = "scripture-atlas:v1";
const blank = () => ({ version: 1, notes: {}, bookmarks: {}, highlights: {}, history: [], position: null, settings: {}, progress: {}, days: [], ai: [], guides: {} });

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Length of the run of consecutive dates (YYYY-MM-DD) ending on `day` or the day before. */
export function streakFrom(days, day) {
  const set = new Set(days);
  const prev = d => { const t = new Date(d + "T12:00:00"); t.setDate(t.getDate() - 1); return today(t); };
  let d = set.has(day) ? day : prev(day);
  let n = 0;
  while (set.has(d)) { n++; d = prev(d); }
  return n;
}

export function createStore(storage) {
  let data = blank();
  try {
    const raw = storage?.getItem(KEY);
    if (raw) data = { ...blank(), ...JSON.parse(raw) };
  } catch { data = blank(); }

  const markDay = d => { if (!data.days.includes(d)) { data.days.push(d); data.days.sort(); if (data.days.length > 400) data.days = data.days.slice(-400); } };
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; } };
  const now = () => new Date().toISOString();

  return {
    raw: () => structuredClone(data),
    setting: (k, fallback) => (k in data.settings ? data.settings[k] : fallback),
    setSetting(k, v) { data.settings[k] = v; save(); },

    note: osis => data.notes[osis]?.text ?? "",
    setNote(osis, text) {
      if (text && text.trim()) data.notes[osis] = { text, updated: now() };
      else delete data.notes[osis];
      save();
    },
    notes: () => Object.entries(data.notes).map(([osis, n]) => ({ osis, ...n })),

    isBookmarked: osis => osis in data.bookmarks,
    toggleBookmark(osis) {
      if (osis in data.bookmarks) delete data.bookmarks[osis];
      else data.bookmarks[osis] = { added: now() };
      save();
      return osis in data.bookmarks;
    },
    bookmarks: () => Object.entries(data.bookmarks).map(([osis, b]) => ({ osis, ...b })),

    highlight: osis => data.highlights[osis]?.color ?? null,
    setHighlight(osis, color) {
      if (color) data.highlights[osis] = { color, added: now() };
      else delete data.highlights[osis];
      save();
    },
    highlights: () => Object.entries(data.highlights).map(([osis, h]) => ({ osis, ...h })),

    /** Record a finished lesson; keeps the best score. */
    completeLesson(course, lesson, score, total, day = today()) {
      data.progress[course] ??= {};
      const prev = data.progress[course][lesson];
      if (!prev || score >= prev.score) data.progress[course][lesson] = { score, total, at: now() };
      markDay(day); save();
    },
    lessonResult: (course, lesson) => data.progress[course]?.[lesson] ?? null,
    courseProgress: (course, lessonIds) => lessonIds.filter(id => data.progress[course]?.[id]).length,
    /** Consecutive study days ending today (or yesterday, so a streak survives until the day ends). */
    streak(day = today()) { return streakFrom(data.days, day); },
    studyDays: () => data.days.length,

    /** Study-guide answers by passage key. */
    guideAnswers: key => ({ ...(data.guides[key]?.answers || {}) }),
    setGuideAnswer(key, field, value) {
      data.guides[key] ??= { answers: {} };
      if (value && value.trim()) data.guides[key].answers[field] = value; else delete data.guides[key].answers[field];
      data.guides[key].updated = now(); markDay(today()); save();
    },
    guides: () => Object.entries(data.guides).map(([key, g]) => ({ key, ...g })),

    /** Saved research-assistant answers, newest first, max 25. */
    saveAnswer(entry) { data.ai = [{ ...entry, at: now() }, ...data.ai].slice(0, 25); save(); },
    answers: () => data.ai.slice(),
    clearAnswers() { data.ai = []; save(); },

    /** Record a chapter visit; newest first, one entry per chapter, max 30. */
    visit(chapterOsis, translation) {
      markDay(today());
      data.history = [{ osis: chapterOsis, translation, at: now() }, ...data.history.filter(h => h.osis !== chapterOsis)].slice(0, 30);
      data.position = { osis: chapterOsis, translation, at: now() };
      save();
    },
    history: () => data.history.slice(),
    position: () => data.position,
    setPositionVerse(osis) { if (data.position) { data.position.verse = osis; save(); } },

    clearAll() { data = blank(); save(); }
  };
}

/**
 * Export notes, bookmarks and highlights as Markdown, in canonical order.
 * order(osis) gives a sortable number; label(osis) gives "John 3:16"; text(osis) gives the verse or "".
 */
export function exportMarkdown(store, { order, label, text, date = new Date().toISOString().slice(0, 10) }) {
  const sort = arr => arr.slice().sort((a, b) => order(a.osis) - order(b.osis));
  const quote = osis => { const t = text(osis); return t ? `> ${t.replace(/\n/g, " ")}\n` : ""; };
  let md = `# My Ereunia study notes\n\nExported ${date}\n`;
  const notes = sort(store.notes());
  md += `\n## Notes (${notes.length})\n`;
  notes.forEach(n => { md += `\n### ${label(n.osis)}\n\n${quote(n.osis)}\n${n.text.trim()}\n`; });
  const bms = sort(store.bookmarks());
  md += `\n## Bookmarks (${bms.length})\n\n`;
  bms.forEach(b => { md += `- ${label(b.osis)}\n`; });
  const hls = sort(store.highlights());
  md += `\n## Highlights (${hls.length})\n\n`;
  hls.forEach(h => { md += `- ${label(h.osis)} (${h.color})\n`; });
  return md;
}
