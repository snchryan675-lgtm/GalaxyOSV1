/* Picks a "dominant vivid colour" from image pixels and shapes it into UI colours.
   Used by the main process (wallpaper / album art decoded with nativeImage) and by the
   renderer (canvas fallback). Pure functions, no DOM or Electron needed. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GalaxyAccent = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d > 1e-6) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h, s: clamp(s, 0, 1), l };
  }
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  const hex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  // WCAG relative luminance
  function lum(rgb) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  }

  /* data: Uint8Array/Buffer of 4-byte pixels. order 'rgba' (canvas) or 'bgra' (Electron nativeImage).
     Returns {h, s, l, gray} - the most prominent *colourful* hue - or null when there are no pixels. */
  function dominant(data, order) {
    const bgra = order === 'bgra';
    const BINS = 36, sum = new Float64Array(BINS), sr = new Float64Array(BINS), sg = new Float64Array(BINS), sb = new Float64Array(BINS);
    let n = 0, ar = 0, ag = 0, ab = 0, tw = 0;
    for (let i = 0; i + 3 < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = bgra ? data[i + 2] : data[i], g = data[i + 1], b = bgra ? data[i] : data[i + 2];
      n++; ar += r; ag += g; ab += b;
      const c = rgb2hsl(r, g, b);
      // colourfulness: saturated mid-tones count most, near-black / near-white / grey count little
      const lw = clamp((c.l - 0.05) / 0.15, 0, 1) * clamp((0.95 - c.l) / 0.2, 0, 1);
      const w = Math.pow(c.s, 1.6) * lw;
      if (w < 0.01) continue;
      const bin = Math.min(BINS - 1, Math.floor(c.h / (360 / BINS)));
      sum[bin] += w; sr[bin] += r * w; sg[bin] += g * w; sb[bin] += b * w; tw += w;
    }
    if (!n) return null;
    // a wallpaper that is (nearly) colourless: use its average tone as a soft neutral
    if (tw / n < 0.02) {
      const c = rgb2hsl(ar / n, ag / n, ab / n);
      return { h: c.h, s: Math.min(c.s, 0.15), l: c.l, gray: true, vivid: tw / n };
    }
    // smooth the hue histogram so one colour is not split across two bins
    let best = 0, bestV = -1;
    for (let k = 0; k < BINS; k++) {
      const v = sum[k] + 0.5 * (sum[(k + 1) % BINS] + sum[(k + BINS - 1) % BINS]);
      if (v > bestV) { bestV = v; best = k; }
    }
    let R = 0, G = 0, B = 0, W = 0;
    [(best + BINS - 1) % BINS, best, (best + 1) % BINS].forEach((k, j) => {
      const m = j === 1 ? 1 : 0.5;
      R += sr[k] * m; G += sg[k] * m; B += sb[k] * m; W += sum[k] * m;
    });
    const c = rgb2hsl(R / W, G / W, B / W);
    return { h: c.h, s: c.s, l: c.l, gray: false, vivid: tw / n };
  }

  /* Shape a raw colour into an accent that reads well on the dark UI (buttons, indicators, progress). */
  function accentFor(raw) {
    if (!raw) return null;
    let s = raw.gray ? Math.min(raw.s, 0.12) : clamp(raw.s, 0.5, 0.9);
    let l = raw.gray ? 0.74 : clamp(raw.l, 0.58, 0.72);
    let rgb = hsl2rgb(raw.h, s, l);
    // keep dark text on top of the accent readable
    for (let i = 0; i < 12 && lum(rgb) < 0.27 && l < 0.86; i++) { l += 0.03; rgb = hsl2rgb(raw.h, s, l); }
    return { h: raw.h, s, l, rgb, hex: hex(rgb) };
  }
  /* A deep version of the colour used to tint a widget background (white text stays readable on it). */
  function tintFor(raw, alpha) {
    if (!raw) return null;
    const s = raw.gray ? Math.min(raw.s, 0.1) : clamp(raw.s, 0.4, 0.72);
    const rgb = hsl2rgb(raw.h, s, raw.gray ? 0.3 : 0.3);
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha == null ? 0.88 : alpha})`;
  }

  return { dominant, accentFor, tintFor, rgb2hsl, hsl2rgb, hex, lum };
});
