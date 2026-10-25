// POST /api/sermon — turn a sermon transcript into a study outline.
// The model may only quote the transcript word for word (checked) and may only list real Bible references
// (checked). Everything returned is labelled as AI-generated in the interface. Model access: Netlify AI Gateway.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseReference, formatRef } from "../../public/js/ref.js";
import { parseModelJson } from "../../public/js/ai-core.js";
import { sermonRefs, checkOutline } from "../../public/js/sermon.js";

const MODEL = process.env.ATLAS_MODEL || "claude-sonnet-5-5";
const base = [process.cwd(), process.env.LAMBDA_TASK_ROOT || "", "/var/task"].map(b => join(b, "public/data")).find(d => d && existsSync(join(d, "index.json")));
let index = null;
const chapters = i => (index ??= JSON.parse(readFileSync(join(base, "index.json"), "utf8"))).books[i].verses.length;

const SYSTEM = `You prepare study notes from a sermon transcript for a Bible study website.
Rules:
- Work only from the transcript. Do not add teaching the speaker did not give.
- "quote" fields must be copied word for word from the transcript (a short phrase or sentence), or left empty.
- "scriptures" lists Bible references the speaker used, written like "Romans 8:28" or "Psalm 23". Do not add others.
- Plain, warm language. No headings inside fields. No markdown.
Reply with one JSON object only:
{"title": "", "bigIdea": "one sentence", "summary": "3-5 sentences", "points": [{"heading": "", "summary": "1-3 sentences", "quote": ""}], "scriptures": [""], "questions": ["discussion questions for a small group, 3-5"], "application": ["practical responses the speaker urged, 2-4"]}`;

export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Send JSON with a transcript." }, { status: 400 }); }
  const transcript = String(body.transcript || "").replace(/\s+/g, " ").trim().slice(0, 60000);
  if (transcript.split(" ").length < 60) return Response.json({ error: "The transcript is too short to outline. Record or paste at least a few paragraphs." }, { status: 400 });
  if (!base) return Response.json({ error: "Bible data is not available." }, { status: 500 });
  if (!process.env.ANTHROPIC_BASE_URL && !process.env.ANTHROPIC_API_KEY) return Response.json({ error: "The AI Gateway is not active for this site yet." }, { status: 503 });

  const found = sermonRefs(transcript, chapters).map(r => formatRef(r.book, r.chapter, r.verse, r.verseEnd));
  const client = new Anthropic();
  let reply;
  try {
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 1800, system: SYSTEM,
      messages: [{ role: "user", content: `${body.title ? `TITLE GIVEN BY THE USER: ${String(body.title).slice(0, 120)}\n` : ""}REFERENCES DETECTED IN THE TRANSCRIPT: ${found.join("; ") || "none"}\n\nTRANSCRIPT:\n${transcript}` }]
    });
    reply = msg.content.map(c => c.text || "").join("");
  } catch (e) {
    return Response.json({ error: "The outline could not be made just now. Try again in a minute.", detail: String(e?.status || "") }, { status: 502 });
  }
  const { outline, dropped } = checkOutline(parseModelJson(reply), transcript, r => !!parseReference(r, chapters));
  if (!outline) return Response.json({ error: "The outline could not be read. Try again." }, { status: 502 });
  return Response.json({ outline, dropped, refs: found, model: MODEL });
};

export const config = { path: "/api/sermon", rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ["ip", "domain"] } };
