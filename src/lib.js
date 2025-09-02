// Pure helpers duplicated from runtime for unit testing without DOM.

export function escapeHtml(str) {
  return (str ?? "").toString().replace(/[&<>"']/g, (s) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]
  ));
}

export function linkify(str) {
  // Basic URL detection; keeps it consistent with runtime implementation
  return (str ?? "").toString().replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

export function timeAgo(d) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  const units = [ [60, "s"], [60, "m"], [24, "h"], [7, "d"], [4.348, "w"], [12, "mo"] ];
  let n = s, l = "s";
  for (const [k, t] of units) { if (n < k) break; n = n / k; l = t; }
  return Math.floor(n) + l + " ago";
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// Spatial index used by placement; operates on normalized points ({x,y} in [0,1]).
export function buildSpatialIndex(points, minSepPx, canvasWidth = 1, canvasHeight = 1) {
  const w = Math.max(1e-9, canvasWidth);
  const h = Math.max(1e-9, canvasHeight);
  const cellW = Math.max(1e-9, minSepPx / w);
  const cellH = Math.max(1e-9, minSepPx / h);
  const map = new Map();
  const key = (i, j) => i + "," + j;
  for (const p of points) {
    if (!p) continue;
    const ci = Math.floor(p.x / cellW);
    const cj = Math.floor(p.y / cellH);
    const k = key(ci, cj);
    let arr = map.get(k);
    if (!arr) { arr = []; map.set(k, arr); }
    arr.push(p);
  }
  return { cellW, cellH, map };
}

export function spatialNearby(index, nx, ny) {
  if (!index) return [];
  const { cellW, cellH, map } = index;
  const ci = Math.floor(nx / cellW);
  const cj = Math.floor(ny / cellH);
  const out = [];
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const k = ci + di + "," + (cj + dj);
      const arr = map.get(k);
      if (arr) out.push(...arr);
    }
  }
  return out;
}

