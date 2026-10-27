// Personal study data kept in this browser on this device. One versioned JSON record, so it can be
// backed up, restored, and later synchronised to an account without changing its shape.
// Keys are OSIS references, e.g. "John.3.16".

import { cleanPrep, cleanSeries, SERMON_ID, newSermonId } from "./prep-core.js";

const KEY = "scripture-atlas:v1";
const PASSAGE = /^[1-3]?[A-Za-z]+\.\d+(?:\.\d+(?:-\d+)?)?$/;
/** Cleans one sermon or series from a backup; returns null for anything that is not a valid record. */
function defaultClean(kind, id, rec) {
  if (!rec || typeof rec !== "object") return null;
  if (kind === "preps") {
    const key = typeof rec.key === "string" && PASSAGE.test(rec.key) ? rec.key : (PASSAGE.test(id) ? id : null); if (!key) return null;
    // Recording ids are kept so audio already on this device stays linked; audio is deleted only when no sermon refers to it.
    const p = cleanPrep({ ...rec, id }, key, typeof rec.title === "string" ? rec.title.slice(0, 80) : key);
    return { id: SERMON_ID.test(id) ? id : newSermonId(), rec: { ...p, updated: rec.updated || null, created: rec.created || null }, newId: newSermonId };
  }
  const x = cleanSeries({ ...rec, id: /^[a-z0-9]{4,24}$/.test(id) ? id : (rec.id || "") });
  return x ? { id: x.id, rec: x, newId: () => Math.random().toString(36).slice(2, 10) } : null;
}
const blank = () => ({ version: 1, notes: {}, bookmarks: {}, highlights: {}, history: [], position: null, settings: {}, progress: {}, days: [], ai: [], guides: {}, trail: { started: null, steps: [] }, trails: [], preps: {}, series: {}, illus: {} });

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

    /** Research trail: the path taken through passages, words and sources in this session of study. */
    trailAdd(step) {
      if (!step?.href || !step?.label) return;
      const steps = data.trail.steps, last = steps[steps.length - 1];
      if (last && last.href === step.href) return;
      if (!data.trail.started) data.trail.started = now();
      steps.push({ kind: step.kind || "page", label: String(step.label).slice(0, 140), href: step.href, detail: step.detail ? String(step.detail).slice(0, 400) : "", at: now() });
      if (steps.length > 80) steps.splice(0, steps.length - 80);
      save();
    },
    trailSteps: () => data.trail.steps.slice(),
    trailClear() { data.trail = { started: null, steps: [] }; save(); },
    saveTrail(title) {
      if (!data.trail.steps.length) return null;
      const t = { id: "t" + Date.now().toString(36), title: (title || "Research trail").slice(0, 120), steps: data.trail.steps.slice(), started: data.trail.started, saved: now() };
      data.trails = [t, ...data.trails].slice(0, 50); save(); return t;
    },
    trails: () => data.trails.slice(),
    trail: id => data.trails.find(t => t.id === id) || null,
    removeTrail(id) { data.trails = data.trails.filter(t => t.id !== id); save(); },

    /** Sermons and lesson preparations, keyed by sermon id. The first sermon on a passage uses the passage as its id. */
    prep: id => (data.preps[id] ? structuredClone(data.preps[id]) : null),
    savePrep(p) {
      const id = p?.id || p?.key; if (!id) return;
      // Never drops other sermons: when storage is full the save fails and the page says so.
      data.preps[id] = { ...structuredClone(p), id, updated: now(), created: p.created || now() };
      markDay(today()); save();
    },
    preps: () => Object.entries(data.preps).map(([k, x]) => ({ ...structuredClone(x), id: k })).sort((a, b) => (b.updated || "").localeCompare(a.updated || "")),
    sermonsFor: key => Object.entries(data.preps).filter(([, x]) => x.key === key).map(([k, x]) => ({ ...structuredClone(x), id: k })).sort((a, b) => (b.updated || "").localeCompare(a.updated || "")),
    removePrep(id) { delete data.preps[id]; save(); },
    /** True when any sermon still lists this recording (so its audio must be kept). */
    recordingInUse: rid => Object.values(data.preps).some(x => (x.recordings || []).some(r => r.id === rid)),

    /** Reusable illustrations, with their source, how far they have been checked, themes and where they were used. */
    illustrations: () => Object.values(data.illus || {}).map(x => structuredClone(x)).sort((a, b) => (b.updated || "").localeCompare(a.updated || "")),
    illustration: id => (data.illus?.[id] ? structuredClone(data.illus[id]) : null),
    saveIllustration(x) { if (!x?.id) return; data.illus = data.illus || {}; data.illus[x.id] = { ...structuredClone(x), updated: now(), created: x.created || now() }; save(); },
    removeIllustration(id) { if (data.illus) delete data.illus[id]; save(); },
    /** Free space left for this site's local storage, as far as the browser reports it. */
    usedBytes: () => { try { return (localStorage.getItem(KEY) || "").length * 2; } catch { return 0; } },

    /** Sermon series plans: a title, a first Sunday and a passage per week. */
    seriesList: () => Object.values(data.series).map(x => structuredClone(x)).sort((a, b) => (b.updated || "").localeCompare(a.updated || "")),
    seriesGet: id => (data.series[id] ? structuredClone(data.series[id]) : null),
    saveSeries(x) { if (!x?.id) return; data.series[x.id] = { ...structuredClone(x), updated: now() }; save(); },
    removeSeries(id) { delete data.series[id]; save(); },

    /** Full backup of everything kept on this device, and restore from such a backup. */
    backup: () => ({ app: "ereunia", kind: "backup", exported: now(), data: structuredClone(data) }),
    restore(obj, { merge = true, cleanRecord = null } = {}) {
      const src = obj?.app === "ereunia" && obj?.data ? obj.data : null;
      if (!src || typeof src !== "object" || src.version !== 1) throw new Error("This file is not an Ereunia backup.");
      const clean = v => JSON.parse(JSON.stringify(v ?? null));            // drops functions and prototypes
      const plain = o => (o && typeof o === "object" && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).filter(([k]) => !["__proto__", "constructor", "prototype"].includes(k))) : {});
      const next = merge ? data : blank();
      for (const k of ["notes", "bookmarks", "highlights", "settings", "progress", "guides", "illus"]) next[k] = { ...(merge ? next[k] : {}), ...plain(clean(src[k])) };
      // Sermons and series: never replace a record already here; clean each one and give clashing ids a new id.
      for (const k of ["preps", "series"]) {
        const incoming = plain(clean(src[k]));
        next[k] = merge ? { ...next[k] } : {};
        for (const [id, rec] of Object.entries(incoming)) {
          const ok = (cleanRecord || defaultClean)(k, id, rec); if (!ok) continue;
          let nid = ok.id;
          if (next[k][nid]) { if (JSON.stringify(next[k][nid]) === JSON.stringify(ok.rec)) continue; nid = ok.newId(); }
          next[k][nid] = { ...ok.rec, id: nid };
        }
      }
      for (const k of ["history", "days", "ai", "trails"]) if (Array.isArray(src[k])) next[k] = merge ? [...clean(src[k]), ...next[k]].filter((x, i, a) => a.findIndex(y => JSON.stringify(y) === JSON.stringify(x)) === i) : clean(src[k]);
      if (!merge && src.position) next.position = clean(src.position);
      if (src.trail?.steps && Array.isArray(src.trail.steps) && !next.trail.steps.length) next.trail = clean(src.trail);
      data = { ...blank(), ...next }; const saved = save();
      return { saved: saved !== false, notes: Object.keys(data.notes).length, bookmarks: Object.keys(data.bookmarks).length, highlights: Object.keys(data.highlights).length, trails: data.trails.length };
    },
    savedOk: () => save(),

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
