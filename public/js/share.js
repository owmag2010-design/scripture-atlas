// Ereunia share cards: draws a branded image of a Bible verse or a documented discovery onto a canvas.
// Text always comes from the site's own data (never typed in), and every card carries its source and credits.

export const SIZES = {
  square: { w: 1080, h: 1080, label: "Square", hint: "Instagram, Facebook" },
  story: { w: 1080, h: 1920, label: "Story", hint: "Stories, WhatsApp status" },
  wide: { w: 1200, h: 630, label: "Wide", hint: "X, LinkedIn, links" }
};

export const STYLES = {
  night: { label: "Night", bg: "#15120E", ink: "#F5EFE6", soft: "rgba(245,239,230,.66)", accent: "#F2C14E", logo: "dark" },
  parchment: { label: "Parchment", bg: "#F5EFE6", ink: "#15120E", soft: "rgba(21,18,14,.62)", accent: "#8A6408", logo: "light" },
  picture: { label: "Picture", bg: "#15120E", ink: "#FFFDF8", soft: "rgba(255,253,248,.78)", accent: "#F2C14E", logo: "dark" }
};

const SERIF = '"EB Garamond", Georgia, serif';
const SANS = '"Schibsted Grotesk", system-ui, sans-serif';

const cache = new Map();
export function loadImage(src) {
  if (!cache.has(src)) cache.set(src, new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }));
  return cache.get(src);
}

// Greedy word wrap. Returns lines that fit maxWidth with the current ctx.font.
function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean), lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width <= maxWidth || !line) line = t; else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

// Largest font size (between max and min) at which text fits the box. Returns null if it cannot fit.
function fit(ctx, text, family, weight, box, max, min, lh) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, box.w);
    if (lines.length * size * lh <= box.h) return { size, lines };
  }
  return null;
}

function cover(ctx, im, w, h, focus = "50% 40%") {
  const [fx, fy] = focus.split(/\s+/).map(v => parseFloat(v) / 100);
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.drawImage(im, (w - dw) * (isNaN(fx) ? .5 : fx), (h - dh) * (isNaN(fy) ? .4 : fy), dw, dh);
}

/**
 * Draws a card. card = { kind: "verse"|"discovery", text, title, ref, source, eyebrow, credit, image, focus, dir }
 * Returns { ok, reason } — ok is false when the text is too long to be readable at this size.
 */
export async function drawCard(canvas, card, { size = "square", style = "night" } = {}) {
  const S = SIZES[size] || SIZES.square, T = STYLES[style] || STYLES.night;
  const W = S.w, H = S.h, k = size === "wide" ? 0.82 : size === "story" ? 1.18 : 1;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  await document.fonts?.ready;

  // Background
  ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
  let usedPicture = false;
  if (style === "picture" && card.image) {
    try {
      const im = await loadImage(card.image);
      cover(ctx, im, W, H, card.focus);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(11,9,7,.55)"); g.addColorStop(.35, "rgba(11,9,7,.45)"); g.addColorStop(1, "rgba(11,9,7,.92)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      usedPicture = true;
    } catch { /* fall back to plain background */ }
  }
  if (!usedPicture) {
    // quiet brand texture: a soft amber glow and a thin frame
    const g = ctx.createRadialGradient(W * .85, H * .1, 0, W * .85, H * .1, Math.max(W, H) * .8);
    g.addColorStop(0, style === "parchment" ? "rgba(242,193,78,.22)" : "rgba(242,193,78,.14)"); g.addColorStop(1, "rgba(242,193,78,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.strokeStyle = style === "parchment" ? "rgba(21,18,14,.14)" : "rgba(242,193,78,.28)"; ctx.lineWidth = 2 * k;
  const inset = 36 * k; ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

  const pad = (size === "wide" ? 70 : 92) * k;
  // Logo, top left
  try {
    const logo = await loadImage(`brand/ereunia-logo-for-${T.logo === "dark" ? "dark" : "light"}-bg.svg`);
    const lh = (size === "wide" ? 50 : 62) * k, lw = lh * 4;
    ctx.drawImage(logo, pad, pad, lw, lh);
  } catch { ctx.fillStyle = T.ink; ctx.font = `700 ${40 * k}px ${SANS}`; ctx.textBaseline = "top"; ctx.fillText("ereunia", pad, pad); }

  // Footer: site and credit
  const footY = H - pad;
  ctx.textBaseline = "alphabetic"; ctx.direction = "ltr"; ctx.textAlign = "left";
  ctx.fillStyle = T.accent; ctx.font = `700 ${26 * k}px ${SANS}`;
  ctx.fillText("ereunia.com", pad, footY);
  const siteW = ctx.measureText("ereunia.com").width;
  ctx.fillStyle = T.soft; ctx.font = `500 ${22 * k}px ${SANS}`;
  ctx.fillText("  ·  Search the Scriptures", pad + siteW, footY);
  if (card.credit) {
    ctx.font = `400 ${17 * k}px ${SANS}`; ctx.fillStyle = T.soft;
    const lines = wrap(ctx, card.credit, W - pad * 2).slice(0, 2);
    lines.forEach((l, i) => ctx.fillText(l, pad, footY - (42 + (lines.length - 1 - i) * 22) * k));
  }

  // Body box
  const top = pad + (size === "wide" ? 90 : 130) * k;
  const bottom = footY - (card.credit ? 110 : 70) * k;
  const metaH = (card.kind === "discovery" ? 120 : 96) * k;
  const box = { x: pad, w: W - pad * 2, h: bottom - top - metaH };

  // Eyebrow
  let y = top;
  if (card.eyebrow) {
    ctx.fillStyle = T.accent; ctx.font = `700 ${22 * k}px ${SANS}`;
    ctx.fillText(card.eyebrow.toUpperCase().split("").join(String.fromCharCode(8202)), pad, y + 20 * k);
    y += 48 * k; box.h -= 48 * k;
  }
  if (card.kind === "discovery" && card.title) {
    const t = fit(ctx, card.title, SANS, 700, { w: box.w, h: 150 * k }, Math.round(64 * k), Math.round(34 * k), 1.08);
    ctx.fillStyle = T.ink; ctx.font = `700 ${t.size}px ${SANS}`;
    t.lines.forEach((l, i) => ctx.fillText(l, pad, y + t.size * (i + .9)));
    y += t.lines.length * t.size * 1.08 + 22 * k; box.h -= t.lines.length * t.size * 1.08 + 22 * k;
  }

  // Main text, sized to fill the space it has
  const isVerse = card.kind === "verse";
  const family = isVerse ? SERIF : SANS, weight = isVerse ? 500 : 400;
  const maxSize = Math.round((isVerse ? (size === "wide" ? 62 : size === "story" ? 84 : 74) : (size === "story" ? 46 : 40)) * k), minSize = Math.round((isVerse ? 28 : 24) * k);
  const lh = isVerse ? 1.28 : 1.4;
  const shown = isVerse ? `“${card.text}”` : card.text;
  ctx.direction = card.dir === "rtl" ? "rtl" : "ltr";
  const f = fit(ctx, shown, family, weight, { w: box.w, h: box.h }, maxSize, minSize, lh);
  if (!f) return { ok: false, reason: "This text is too long to fit a readable card at this size. Try the Story size, or a shorter passage." };
  ctx.fillStyle = T.ink; ctx.font = `${weight} ${f.size}px ${family}`;
  const blockH = f.lines.length * f.size * lh;
  const startY = y + Math.max(0, (box.h - blockH) / (isVerse ? 2 : 6));
  ctx.textAlign = card.dir === "rtl" ? "right" : "left";
  const x = card.dir === "rtl" ? W - pad : pad;
  f.lines.forEach((l, i) => ctx.fillText(l, x, startY + f.size * (i + .95) * lh - f.size * (lh - 1) * .5));
  ctx.textAlign = "left"; ctx.direction = "ltr";

  // Reference / status line under the text
  let my = startY + blockH + 46 * k;
  ctx.fillStyle = T.accent; ctx.fillRect(pad, my - 30 * k, 56 * k, 4 * k);
  ctx.font = `700 ${30 * k}px ${SANS}`; ctx.fillStyle = T.ink;
  ctx.fillText(card.ref || "", pad, my + 14 * k);
  if (card.source) { ctx.font = `500 ${22 * k}px ${SANS}`; ctx.fillStyle = T.soft; ctx.fillText(card.source, pad, my + 48 * k); }
  return { ok: true };
}

export function canvasBlob(canvas) {
  return new Promise(res => canvas.toBlob(b => res(b), "image/png"));
}
