// Ereunia's offline helper. It is installed only when someone asks to make a sermon available offline.
// It always tries the network first, so pages are never stale; it answers from its store only when the network fails.
// It keeps just the files it was asked to keep (and refreshes them when it sees newer copies).
const STORE = "ereunia-offline-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("message", e => {
  if (e.data?.type !== "keep" || !Array.isArray(e.data.urls)) return;
  const port = e.ports[0];
  e.waitUntil((async () => {
    try {
      const c = await caches.open(STORE);
      const urls = e.data.urls.filter(u => { try { return typeof u === "string" && new URL(u, location.origin).origin === location.origin; } catch { return false; } }).map(u => new URL(u, location.origin).pathname).slice(0, 400);
      await Promise.all(urls.map(async u => { try { const r = await fetch(u, { cache: "no-cache" }); if (r.ok) await c.put(u, r); } catch { /* skip files that cannot be fetched now */ } }));
      port?.postMessage({ ok: true, kept: urls.length });
    } catch (err) { port?.postMessage({ ok: false, error: String(err?.message || err) }); }
  })());
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(STORE);
    try {
      const r = await fetch(req);
      if (r.ok && (await c.match(url.pathname))) c.put(url.pathname, r.clone()).catch(() => {}); // refresh kept files under one key, whatever the query string
      return r;
    } catch (err) {
      const hit = await c.match(url.pathname) || (req.mode === "navigate" ? (await c.match(url.pathname) || await c.match("/index.html") || await c.match("/")) : null);
      if (hit) return hit;
      throw err;
    }
  })());
});
