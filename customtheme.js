// Custom theme engine: four colors (background, accent, text, window) become the whole set of Galaxy OS theme variables.
// Used by the shell and by every app window; the Theme maker in Settings > Themes edits the colors and shares them as a code.
window.GalaxyCustomTheme = (() => {
  const DEF = { bg: '#09060f', accent: '#8b5cdb', text: '#e3deed', window: '#6e40bf' };
  const KEYS = ['bg', 'accent', 'text', 'window'];
  const hex2rgb = (h) => {
    h = String(h || '').trim().replace(/^#/, '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return /^[0-9a-f]{6}$/i.test(h) ? [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] : null;
  };
  const rgb2hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgba = (c, a) => `rgba(${c.map((v) => Math.round(v)).join(', ')}, ${a})`;
  const clean = (c) => { const o = {}; KEYS.forEach((k) => { const r = hex2rgb(c && c[k]); o[k] = r ? rgb2hex(r) : DEF[k]; }); return o; };

  function vars(c) {
    c = clean(c);
    const B = hex2rgb(c.bg), A = hex2rgb(c.accent), T = hex2rgb(c.text), Wn = hex2rgb(c.window);
    const sur = mix(B, T, .035), sur2 = mix(B, T, .07), sur3 = mix(B, T, .12), chrome = mix(mix(B, A, .4), T, .08);
    const dang = [226, 90, 108];
    return {
      '--color-bg': rgb2hex(B), '--color-surface': rgb2hex(sur), '--color-surface-2': rgb2hex(sur2), '--color-surface-3': rgb2hex(sur3),
      '--color-chrome': rgb2hex(chrome), '--color-window': rgb2hex(Wn), '--color-white': '#ffffff', '--color-black': '#000000',
      '--color-scrim': 'rgba(0, 0, 0, .18)', '--color-scrim-medium': 'rgba(0, 0, 0, .5)', '--color-scrim-strong': 'rgba(0, 0, 0, .85)',
      '--color-text': rgb2hex(T), '--color-text-muted': rgb2hex(mix(T, B, .28)), '--color-text-subtle': rgb2hex(mix(T, B, .55)),
      '--color-border': rgba(T, .08), '--color-border-strong': rgba(T, .26), '--color-border-hover': rgb2hex(mix(sur3, A, .3)),
      '--overlay-hover': rgba(T, .07), '--overlay-hover-strong': rgba(T, .14), '--overlay-active': rgba(A, .42), '--overlay-indicator': rgba(A, .55),
      '--overlay-browser-tab': rgb2hex(mix(sur3, T, .06)), '--color-danger': rgb2hex(dang), '--color-danger-hover': rgba(dang, .7), '--color-pin': rgb2hex(A),
      '--color-scrollbar-track': rgb2hex(sur), '--color-scrollbar-thumb': rgb2hex(sur3), '--color-scrollbar-thumb-hover': rgb2hex(mix(sur3, T, .15))
    };
  }
  const css = (c) => { const v = vars(c); return ':root[data-theme=custom],[data-theme=custom]{' + Object.keys(v).map((k) => k + ':' + v[k]).join(';') + '}'; };
  function apply(doc, c) {
    let st = doc.getElementById('gxCustomTheme');
    if (!st) { st = doc.createElement('style'); st.id = 'gxCustomTheme'; doc.head.appendChild(st); }
    const t = css(c);
    if (st.textContent !== t) st.textContent = t;
  }
  // share code: GXT1.<bg>.<accent>.<text>.<window>  (hex without #)
  const encode = (c) => { c = clean(c); return 'GXT1.' + KEYS.map((k) => c[k].slice(1)).join('.'); };
  function decode(code) {
    const m = /^\s*GXT1\.([0-9a-f]{6})\.([0-9a-f]{6})\.([0-9a-f]{6})\.([0-9a-f]{6})\s*$/i.exec(String(code || ''));
    return m ? { bg: '#' + m[1].toLowerCase(), accent: '#' + m[2].toLowerCase(), text: '#' + m[3].toLowerCase(), window: '#' + m[4].toLowerCase() } : null;
  }
  return { DEF, KEYS, clean, vars, css, apply, encode, decode, hex2rgb, rgb2hex };
})();
