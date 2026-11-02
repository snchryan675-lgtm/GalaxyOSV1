// Shared helper for apps running inside Galaxy OS windows (iframes)
window.Galaxy = (() => {
  const listeners = [];
  let S = null;
  // dynamic theme: the shell sends the accent taken from the wallpaper (or null when it is off)
  const ACC = ['--color-pin', '--overlay-active', '--overlay-indicator', '--color-text-dark'];
  function applyAccent(a) {
    const st = document.documentElement.style;
    if (!a || !a.rgb) { ACC.forEach((v) => st.removeProperty(v)); return; }
    const [r, g, b] = a.rgb;
    st.setProperty('--color-pin', a.hex);
    st.setProperty('--overlay-active', `rgba(${r}, ${g}, ${b}, .42)`);
    st.setProperty('--overlay-indicator', `rgba(${r}, ${g}, ${b}, .55)`);
    st.setProperty('--color-text-dark', '#101010');
  }
  // tab cloak presets: what the window title and icon look like (the icon is the site's own favicon, fetched when applied)
  const CLOAKS = [
    { id: 'drive', name: 'Google Drive', title: 'My Drive - Google Drive', domain: 'drive.google.com' },
    { id: 'classroom', name: 'Google Classroom', title: 'Classroom', domain: 'classroom.google.com' },
    { id: 'docs', name: 'Google Docs', title: 'Untitled document - Google Docs', domain: 'docs.google.com' },
    { id: 'slides', name: 'Google Slides', title: 'Untitled presentation - Google Slides', domain: 'slides.google.com' },
    { id: 'sheets', name: 'Google Sheets', title: 'Untitled spreadsheet - Google Sheets', domain: 'sheets.google.com' },
    { id: 'gmail', name: 'Gmail', title: 'Inbox - Gmail', domain: 'mail.google.com' },
    { id: 'google', name: 'Google', title: 'Google', domain: 'google.com' },
    { id: 'canvas', name: 'Canvas', title: 'Dashboard', domain: 'instructure.com' },
    { id: 'clever', name: 'Clever', title: 'Clever | Portal', domain: 'clever.com' },
    { id: 'classlink', name: 'ClassLink', title: 'LaunchPad', domain: 'classlink.com' },
    { id: 'khan', name: 'Khan Academy', title: 'Khan Academy', domain: 'khanacademy.org' },
    { id: 'desmos', name: 'Desmos', title: 'Desmos | Graphing Calculator', domain: 'desmos.com' },
    { id: 'wikipedia', name: 'Wikipedia', title: 'Wikipedia, the free encyclopedia', domain: 'wikipedia.org' }
  ];
  // custom theme colors (Settings > Themes > Theme maker) are loaded on demand
  const ctQueue = []; let ctEl = null;
  function withCT(cb) {
    if (window.GalaxyCustomTheme) return cb();
    ctQueue.push(cb);
    if (!ctEl) { ctEl = document.createElement('script'); ctEl.src = '../customtheme.js'; ctEl.onload = () => { ctQueue.splice(0).forEach((f) => f()); }; document.head.appendChild(ctEl); }
  }
  addEventListener('message', (e) => {
    if (e.data && e.data.type === 'settings') {
      S = e.data.S;
      withCT(() => window.GalaxyCustomTheme.apply(document, S.customTheme));
      document.documentElement.dataset.theme = S.theme;
      applyAccent(e.data.accent);
      listeners.forEach((cb) => cb(S));
    }
  });
  // Ctrl+H (Jarvis) also works while an app window has the keyboard focus
  addEventListener('keydown', (e) => { if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); parent.postMessage({ type: 'jarvis-open' }, '*'); } }, true);
  parent.postMessage({ type: 'get-settings' }, '*');
  return {
    CLOAKS,
    onSettings: (cb) => { listeners.push(cb); if (S) cb(S); },
    set: (patch) => parent.postMessage({ type: 'set-settings', patch }, '*'),
    send: (msg) => parent.postMessage(msg, '*'),
    openApp: (id) => parent.postMessage({ type: 'open-app', id }, '*'),
    openUrl: (url, title) => parent.postMessage({ type: 'open-url', url, title }, '*')
  };
})();
