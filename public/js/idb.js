// Audio for sermon recordings, kept in this browser's IndexedDB. Recordings are saved in segments while
// recording, so an interrupted recording (a closed tab, a flat battery) can be recovered up to the last segment.
const DB = "ereunia-audio", STORE = "segments";
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!("indexedDB" in self)) return rej(new Error("This browser cannot store recordings."));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: ["rec", "n"] }); s.createIndex("rec", "rec"); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error("Could not open storage for recordings."));
  });
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("Storage is full.")); }); };

/** Save one segment (a Blob) of a recording. */
export const putSegment = (rec, n, blob) => tx("readwrite", s => s.put({ rec, n, blob, at: Date.now() }));
/** All segments of a recording, in order. */
export async function segments(rec) {
  const d = await db();
  return new Promise((res, rej) => { const out = []; const t = d.transaction(STORE, "readonly"); const c = t.objectStore(STORE).index("rec").openCursor(IDBKeyRange.only(rec)); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } }; t.oncomplete = () => res(out.sort((a, b) => a.n - b.n)); t.onerror = () => rej(t.error); });
}
/** The recording as one Blob, or null when nothing is stored. */
export async function recordingBlob(rec, type) { const segs = await segments(rec); return segs.length ? new Blob(segs.map(s => s.blob), { type: type || segs[0].blob.type || "audio/webm" }) : null; }
/** Delete every segment of a recording. */
export async function removeRecording(rec) { const segs = await segments(rec); if (!segs.length) return; await tx("readwrite", s => { for (const x of segs) s.delete([x.rec, x.n]); }); }
/** Ids of recordings that have stored audio. */
export async function storedRecordings() {
  const d = await db();
  return new Promise((res, rej) => { const ids = new Set(); const t = d.transaction(STORE, "readonly"); const c = t.objectStore(STORE).openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { ids.add(cur.value.rec); cur.continue(); } }; t.oncomplete = () => res(ids); t.onerror = () => rej(t.error); });
}
/** Ask the browser to keep this site's storage even when space runs low (it may decline). */
export async function persist() { try { if (navigator.storage?.persisted && await navigator.storage.persisted()) return true; return !!(await navigator.storage?.persist?.()); } catch { return false; } }
export async function estimate() { try { return await navigator.storage?.estimate?.() || null; } catch { return null; } }
