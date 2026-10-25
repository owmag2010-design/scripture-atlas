// Shared protection for the AI endpoints: same-site browser requests only, JSON bodies only,
// and a site-wide daily cap so the AI bill cannot run away even if many IPs are used.
import { getStore } from "@netlify/blobs";

const ALLOWED = [
  /^https:\/\/(www\.)?ereunia\.(com|org)$/,
  /^https:\/\/([a-z0-9-]+--)?scripture-atlas-om\.netlify\.app$/,
  /^http:\/\/localhost(:\d+)?$/
];

export const SAFE_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export const reply = (data, status = 200) => Response.json(data, { status, headers: SAFE_HEADERS });

export function originOk(req) {
  const origin = req.headers.get("origin");
  if (origin) return ALLOWED.some(r => r.test(origin));
  // No Origin header: only accept if the browser says the request came from this site.
  return req.headers.get("sec-fetch-site") === "same-origin";
}

// Returns a Response to send back if the request must be refused, or null if it may proceed.
export function check(req) {
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);
  if (!originOk(req)) return reply({ error: "Requests must come from the Ereunia website." }, 403);
  if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) return reply({ error: "Send JSON." }, 415);
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 200000) return reply({ error: "That request is too large." }, 413);
  return null;
}

export async function readBody(req) {
  try { const b = await req.json(); return b && typeof b === "object" && !Array.isArray(b) ? b : null; } catch { return null; }
}

// Counts calls per UTC day per endpoint. Not strictly atomic, which is fine for a spending ceiling.
export async function withinBudget(name, limit) {
  try {
    const store = getStore("ai-budget");
    const key = `${name}-${new Date().toISOString().slice(0, 10)}`;
    const n = Number(await store.get(key)) || 0;
    if (n >= limit) return false;
    await store.set(key, String(n + 1));
    return true;
  } catch {
    return true; // if the counter store is unavailable, fall back to the per-IP rate limit only
  }
}
