// History helpers for the browser: date certainty and map projection. Pure, tested in test/history.test.mjs.

export const yearText = y => (y == null || isNaN(y) ? "" : y < 0 ? `${-y} BC` : `AD ${y}`);

/**
 * How firmly a traditional date can be held. The dataset follows a traditional chronology built from
 * biblical genealogies and reign lengths; outside records only begin to anchor dates in the 9th century BC.
 */
export function dateCertainty(year) {
  if (year == null || isNaN(year)) return { level: "none", label: "Undated", note: "" };
  if (year < -1000) return { level: "traditional", label: "Traditional reckoning", note: "Calculated from biblical genealogies and lifespans. Not independently dated; many scholars date these events differently or regard them as undatable." };
  if (year < -539) return { level: "approximate", label: "Approximate", note: "Reigns are cross-checked against Assyrian and Babylonian records from the 9th century BC onward, but scholars' dates differ by several years." };
  return { level: "close", label: "Approximate, within a few years", note: "Persian, Greek and Roman records fix most dates in this period to within a few years." };
}

export const PRECISION = {
  located: { label: "Identified site", note: "Location as identified in the OpenBible.info geodata used by this dataset." },
  approximate: { label: "Approximate location", note: "The general area is known; the exact site is uncertain or debated." },
  related: { label: "Placed by a related site", note: "Shown at a nearby or containing place; the site itself is not identified." },
  unknown: { label: "Location unknown", note: "Not shown on the map." }
};

// Equirectangular projection scaled for the eastern Mediterranean (cos 33°).
export const MAP_BOX = [-10, 8, 62, 48];
const K = Math.cos(33 * Math.PI / 180);
export function project(lon, lat) {
  return [(lon - MAP_BOX[0]) * K * 10, (MAP_BOX[3] - lat) * 10];
}
export const MAP_SIZE = project(MAP_BOX[2], MAP_BOX[1]);
export const inMapBox = (lon, lat) => lon >= MAP_BOX[0] && lon <= MAP_BOX[2] && lat >= MAP_BOX[1] && lat <= MAP_BOX[3];
