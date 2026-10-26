// Path-based navigation for Ereunia.
// Pages live at real paths (/read/kjv/John.1, /discoveries/tel-dan-stele). Old "#/..." links still work:
// on load they are moved to the matching path, and templates may keep writing "#/..." hrefs because
// every such link is rewritten to its path as soon as it enters the page.

const NOT_APP = /^\/(api|data|press|img|brand|fonts|atlas\/relief|js|og\.jpg|favicon|apple-touch|site\.webmanifest|robots|sitemap)/;

export const toPath = target => {
  if (!target) return "/";
  if (target.startsWith("#/")) return target.slice(1);
  if (target === "#" || target === "#/") return "/";
  return target;
};

// The route as a string without the leading slash, e.g. "read/kjv/John.1"
export function currentRoute() {
  let p = location.pathname.replace(/^\/+/, "");
  try { p = decodeURIComponent(p); } catch { /* keep raw */ }
  return p;
}

let onRoute = () => {};
export function setRouter(fn) { onRoute = fn; }

export function go(target, { replace = false } = {}) {
  const path = toPath(target);
  if (path === location.pathname + location.search && !replace) { onRoute(); return; }
  history[replace ? "replaceState" : "pushState"]({ y: 0 }, "", path);
  onRoute();
}

// Update the address bar without re-rendering (e.g. selecting a verse).
export function setPath(target) {
  const path = toPath(target);
  if (path !== location.pathname) history.replaceState(history.state, "", path);
}

function rewrite(root) {
  if (root.nodeType !== 1) return;
  if (root.matches?.('a[href^="#/"]')) root.setAttribute("href", root.getAttribute("href").slice(1));
  root.querySelectorAll?.('a[href^="#/"]').forEach(a => a.setAttribute("href", a.getAttribute("href").slice(1)));
}

export function startNavigation() {
  // Old shared links: https://ereunia.com/#/discoveries/x → /discoveries/x
  if (location.hash.startsWith("#/")) history.replaceState(null, "", location.hash.slice(1));
  rewrite(document.body);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(rewrite))).observe(document.body, { childList: true, subtree: true });

  document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]"); if (!a) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    const href = a.getAttribute("href");
    if (href.startsWith("#") && !href.startsWith("#/")) {
      // In-page anchor (e.g. "Skip to content"): stay on this page.
      const el = document.getElementById(decodeURIComponent(href.slice(1)));
      if (el) { e.preventDefault(); el.scrollIntoView({ block: "start" }); if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
      return;
    }
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || NOT_APP.test(url.pathname)) return;
    e.preventDefault();
    if (url.hash && url.pathname === location.pathname) { const el = document.getElementById(url.hash.slice(1)); if (el) { el.scrollIntoView(); return; } }
    go(url.pathname + url.search);
  });
  addEventListener("popstate", () => onRoute());
}
