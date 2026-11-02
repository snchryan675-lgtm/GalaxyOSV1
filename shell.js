(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const params = new URLSearchParams(location.search);
  const TIKTOK_URL = 'https://www.tiktok.com';
  const MUSIC_URL = 'https://spotify.com'; // opened by the Spotify app
  const ROBLOX_URL = 'https://tru.ss'; // opened when the Roblox app launches
  const ICON = (n) => `../assets/icons/${n}.png`;

  /* ---------------- settings ---------------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ZONES = ['left', 'center', 'right'];
  const DEFAULT_PINNED = ['browser', 'gfn', 'tiktok', 'roblox', 'cyberpunk', 'terraria', 'fortnite', 'chatgpt', 'nsmbw', 'sm64', 'games', 'notes', 'music', 'terminal', 'apps', 'settings'];
  const LOCKED = ['apps', 'settings']; // Start (Apps) and Settings can never be unpinned
  const DEFAULT_SHORTCUTS = { devconsole: { key: 'j', ctrl: true, alt: false, shift: true, meta: false }, settings: { key: 's', ctrl: false, alt: true, shift: false, meta: false }, apps: { key: 'a', ctrl: false, alt: true, shift: false, meta: false } };
  const DEFAULTS = {
    theme: 'violet', bg: 'train', customBg: '', engine: 'duckduckgo', proxy: '', antiClose: false, autoAB: false, autoBlob: false,
    dynTheme: false, // take the accent colour from the wallpaper
    brightness: 100, // 20-100, dims the whole desktop
    night: { mode: 'off', from: '21:00', to: '07:00', warmth: 55, dim: 10 }, // night light: off | on | schedule
    batteryToast: true, batteryLevel: 20, // low battery alert on/off and the % it starts at
    appData: {}, // localStorage of the custom HTML apps: {appId: {ls}}
    browserStyle: 'glass', dockPos: 'bottom', dockSize: 'md', anim: true,
    // taskbar layout: three zones (left / middle / right); an item is an app id or a folder {id, name, items:[appIds]}
    dock: { left: [], center: DEFAULT_PINNED.slice(), right: [] },
    // apps the user added: {id, name, url, iconUrl, useFavicon, key}
    customApps: [],
    // per-app shortcut keys {appId: {key, ctrl, alt, shift, meta}}
    shortcuts: clone(DEFAULT_SHORTCUTS),
    dockVer: 8,
    customTheme: { bg: '#09060f', accent: '#8b5cdb', text: '#e3deed', window: '#6e40bf' }, // Theme maker colors (theme id: custom)
    tabCloak: { id: '', title: '', domain: '' },                                       // window title + icon disguise
    boot: { text: 'Galaxy OS', image: '', sub: null },                                  // startup / shutdown logo
    jarvis: { enabled: true, name: 'Jarvis', voice: true, engine: 'auto' }, // voice assistant (Ctrl+H)
    intro: true, // startup animation
    profile: { name: 'Galaxy User', bio: '', avatar: '', status: 'online', banner: { mode: 'theme', color: '#8b5cdb', image: '' }, idleMin: 5 }, // your profile card (top bar)
    // desktop widgets: {id, type: clock|weather|note|todo, x, y, w?, h?, data}
    widgets: [], widgetsHidden: false, widgetStyle: 'glass',
    // press this key (outside text boxes) to open a site in the Browser
    quickKey: { on: true, key: ',', ctrl: false, alt: false, shift: false, meta: false, url: 'https://html.duckduckgo.com/html/' }
  };
  let S = clone(DEFAULTS);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('galaxy.settings') || '{}') || {}; } catch (e) {}
  Object.assign(S, saved);
  if (!saved.dock && Array.isArray(saved.pinned)) {
    S.dock = { left: [], center: saved.pinned.map((x) => (x === 'ripple' || x === 'spotify' ? 'music' : x)), right: [] };
  }
  if ((saved.dockVer || 1) < 2) {
    // first run of this version: add the new built-in apps and shortcuts to an existing taskbar
    ['cyberpunk', 'terraria', 'fortnite'].forEach((id) => { if (S.dock && Array.isArray(S.dock.center)) S.dock.center.splice(Math.max(0, S.dock.center.indexOf('games')), 0, id); });
    S.dockVer = 2;
  }
  if ((saved.dockVer || 1) < 3) {
    if (S.dock && Array.isArray(S.dock.center) && !S.dock.center.includes('chatgpt')) S.dock.center.splice(Math.max(0, S.dock.center.indexOf('games')), 0, 'chatgpt');
    S.dockVer = 3;
    if (!saved.shortcuts) S.shortcuts = clone(DEFAULT_SHORTCUTS);
  }
  if ((saved.dockVer || 1) < 4) {
    // new built-in apps: NSMB Wii + Super Mario 64 go in front of Game Hub
    if (S.dock && Array.isArray(S.dock.center)) {
      ['nsmbw', 'sm64'].forEach((id) => {
        if (JSON.stringify(S.dock).includes('"' + id + '"')) return;
        const at = S.dock.center.indexOf('games');
        if (at < 0) S.dock.center.push(id); else S.dock.center.splice(at, 0, id);
      });
    }
    S.dockVer = 4;
  }
  if ((saved.dockVer || 1) < 5) {
    // Dev Console opens with Ctrl+Shift+J (unless that key is already used)
    if (S.shortcuts && !S.shortcuts.devconsole && !Object.values(S.shortcuts).some((k) => k && k.key && String(k.key).toLowerCase() === 'j' && k.ctrl && k.shift)) {
      S.shortcuts.devconsole = { key: 'j', ctrl: true, alt: false, shift: true, meta: false };
    }
    S.dockVer = 5;
  }
  if ((saved.dockVer || 1) < 6) {
    // new built-in Terminal app goes in front of Apps
    if (S.dock && Array.isArray(S.dock.center) && !JSON.stringify(S.dock).includes('"terminal"')) {
      const at = S.dock.center.indexOf('apps');
      if (at < 0) S.dock.center.push('terminal'); else S.dock.center.splice(at, 0, 'terminal');
    }
    if (S.intro === undefined) S.intro = true;
    S.dockVer = 6;
  }
  if ((saved.dockVer || 1) < 7) {
    S.jarvis = Object.assign({ enabled: true, name: 'Jarvis', voice: true, engine: 'auto' }, saved.jarvis || {});
    S.dockVer = 7;
  }
  if ((saved.dockVer || 1) < 8) {
    ['customTheme', 'tabCloak', 'boot'].forEach((k) => { if (!saved[k]) S[k] = clone(DEFAULTS[k]); });
    S.dockVer = 8;
  }
  const save = () => { try { localStorage.setItem('galaxy.settings', JSON.stringify(S)); } catch (e) {} };

  /* ---------------- apps (built-in + user added) ---------------- */
  const BASE_APPS = [
    { id: 'browser', name: 'Browser', icon: 'earth', size: [1000, 640] },
    { id: 'gfn', name: 'GeForce NOW', icon: 'nvidia', size: [1100, 680] },
    { id: 'tiktok', name: 'TikTok', icon: 'tiktok', url: TIKTOK_URL, size: [1000, 700] },
    { id: 'roblox', name: 'Roblox', icon: 'roblox', url: ROBLOX_URL, size: [1100, 680] },
    { id: 'cyberpunk', name: 'Cyberpunk', icon: 'cyberpunk', url: 'https://cyberpunk2077.lol/', size: [1100, 680] },
    { id: 'terraria', name: 'Terraria', icon: 'terraria', url: 'https://playterraria.lol/', size: [1100, 680] },
    { id: 'fortnite', name: 'Fortnite', icon: 'fortnite', url: 'https://fortniteog.lol/', size: [1100, 680] },
    { id: 'chatgpt', name: 'ChatGPT', icon: 'chatgpt', url: 'https://chatgpt.com/', size: [1100, 700] },
    { id: 'nsmbw', name: 'NSMB Wii', icon: 'nsmbw', url: 'https://teaserlua.github.io/nsmbw-web-port/', size: [1100, 680] },
    { id: 'sm64', name: 'Super Mario 64', icon: 'sm64', url: 'https://notan127.github.io/SM64-PC-Port-WebGL/', size: [1100, 680] },
    { id: 'games', name: 'Game Hub', icon: 'controller', url: 'https://galxy.it.com/books', size: [1100, 680] },
    { id: 'notes', name: 'Notes', icon: 'pyrite', file: 'apps/notes.html', size: [640, 480] },
    { id: 'music', name: 'Spotify', icon: 'music', url: MUSIC_URL, size: [1200, 720] },
    { id: 'player', name: 'Player', icon: 'music', file: 'apps/music.html', size: [1080, 680] },
    { id: 'apps', name: 'Apps', icon: 'apps', file: 'apps/launcher.html', size: [560, 420] },
    { id: 'settings', name: 'Settings', icon: 'settings', file: 'apps/settings.html', size: [1000, 640] },
    { id: 'terminal', name: 'Terminal', icon: 'terminal', file: 'apps/terminal.html', size: [760, 480] },
    { id: 'devconsole', name: 'Dev Console', icon: 'devconsole', file: 'apps/devconsole.html', size: [980, 620] }
  ];
  let APPS = BASE_APPS.slice();
  const hostIcon = (u) => { try { return 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(new URL(u).hostname); } catch (e) { return ''; } };
  const iconSrc = (a) => a.iconUrl || ICON(a.icon);
  // icon for an app built in the app builder: the chosen emoji on a dark tile
  function emojiIcon(e) {
    const g = Array.from(String(e || '🧩')).slice(0, 2).join('').replace(/[<>&"']/g, '') || '🧩';
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#2a1f45"/><text x="32" y="46" font-size="36" text-anchor="middle">${g}</text></svg>`);
  }
  function rebuildApps() {
    const custom = (Array.isArray(S.customApps) ? S.customApps : [])
      .filter((c) => c && typeof c.id === 'string' && (c.kind === 'html' || (typeof c.url === 'string' && /^https?:\/\//i.test(c.url))))
      .map((c) => (c.kind === 'html'
        ? { id: c.id, name: String(c.name || 'My app').slice(0, 40), icon: '', iconUrl: c.iconUrl || emojiIcon(c.emoji), html: true, size: [920, 620], custom: true }
        : { id: c.id, name: String(c.name || c.url).slice(0, 40), icon: '', iconUrl: c.iconUrl || hostIcon(c.url), url: c.url, size: [1100, 700], custom: true }));
    APPS = BASE_APPS.concat(custom);
  }
  // <img> for an app icon; falls back to a coloured letter tile if the image can't load
  function makeIcon(a, cls) {
    const im = document.createElement('img');
    im.className = cls || 'navIcon';
    im.alt = a.name;
    im.draggable = false;
    im.src = iconSrc(a);
    im.addEventListener('error', () => {
      const f = document.createElement('span');
      f.className = (cls || 'navIcon') + ' fb';
      let h = 0; for (const ch of a.name) h = (h * 31 + ch.charCodeAt(0)) % 360;
      f.style.background = `hsl(${h} 55% 45%)`;
      f.textContent = (a.name || '?').trim().charAt(0).toUpperCase();
      im.replaceWith(f);
    }, { once: true });
    return im;
  }

  /* ---------------- taskbar layout data ---------------- */
  const itemId = (it) => (typeof it === 'string' ? it : it.id);
  const isFolderId = (id) => typeof id === 'string' && id.startsWith('f_');
  function normalizeDock() {
    const known = new Set(APPS.map((a) => a.id));
    const seen = new Set();
    const D = S.dock && typeof S.dock === 'object' ? S.dock : {};
    const out = { left: [], center: [], right: [] };
    ZONES.forEach((z) => {
      (Array.isArray(D[z]) ? D[z] : []).forEach((it) => {
        if (typeof it === 'string') {
          if (known.has(it) && !seen.has(it)) { seen.add(it); out[z].push(it); }
        } else if (it && typeof it === 'object' && Array.isArray(it.items)) {
          const items = [];
          it.items.forEach((x) => { if (typeof x === 'string' && known.has(x) && !seen.has(x)) { seen.add(x); items.push(x); } });
          if (items.length === 1) out[z].push(items[0]);
          else if (items.length > 1) out[z].push({ id: isFolderId(it.id) ? it.id : 'f_' + Math.random().toString(36).slice(2, 8), name: String(it.name || 'Folder').slice(0, 24), items });
        }
      });
    });
    // Apps (start) and Settings are always pinned and never inside a folder
    LOCKED.forEach((id) => {
      ZONES.forEach((z) => out[z].forEach((it) => { if (typeof it !== 'string' && it.items.includes(id)) { it.items = it.items.filter((x) => x !== id); } }));
    });
    ZONES.forEach((z) => { out[z] = out[z].flatMap((it) => (typeof it !== 'string' && it.items.length < 2 ? it.items : [it])); });
    LOCKED.forEach((id) => { if (!ZONES.some((z) => out[z].includes(id))) out[id === 'apps' ? 'left' : 'right'].push(id); });
    S.dock = out;
    // flat list of everything pinned (used by the Apps window)
    S.pinned = [];
    ZONES.forEach((z) => out[z].forEach((it) => { if (typeof it === 'string') S.pinned.push(it); else S.pinned.push(...it.items); }));
  }
  function findLoc(id) {
    for (const z of ZONES) {
      const arr = S.dock[z];
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (itemId(it) === id) return { zone: z, arr, idx: i, item: it };
        if (typeof it !== 'string' && it.items.includes(id)) return { zone: z, arr: it.items, idx: it.items.indexOf(id), item: id, folder: it };
      }
    }
    return null;
  }
  const findFolder = (id) => { const l = findLoc(id); return l && typeof l.item !== 'string' ? l.item : null; };
  function detach(id) { const l = findLoc(id); if (!l) return null; l.arr.splice(l.idx, 1); return l.item; }
  // t: {merge:id} | {folderId, before} | {zone, before}
  function applyDrop(dragId, t) {
    if (!dragId || t.before === dragId) return;
    const dragFolder = isFolderId(dragId);
    if ((t.merge && (LOCKED.includes(dragId) || LOCKED.includes(t.merge))) || (t.folderId && LOCKED.includes(dragId))) { toast('Start and Settings stay on the taskbar'); return; }
    if (t.merge) {
      if (dragFolder || t.merge === dragId) return;
      const tl = findLoc(t.merge);
      if (!tl || tl.folder) return;
      if (typeof tl.item !== 'string') { detach(dragId); tl.item.items.push(dragId); }
      else {
        detach(dragId);
        const l2 = findLoc(t.merge);
        l2.arr[l2.idx] = { id: 'f_' + Math.random().toString(36).slice(2, 8), name: 'Folder', items: [t.merge, dragId] };
      }
    } else if (t.folderId) {
      const f = findFolder(t.folderId);
      if (!f || dragFolder) return;
      detach(dragId);
      const i = t.before ? f.items.indexOf(t.before) : -1;
      if (i < 0) f.items.push(dragId); else f.items.splice(i, 0, dragId);
    } else {
      const item = detach(dragId) || dragId;
      const arr = S.dock[t.zone];
      const i = t.before ? arr.findIndex((x) => itemId(x) === t.before) : -1;
      if (i < 0) arr.push(item); else arr.splice(i, 0, item);
    }
    save();
    applySettings();
  }

  const BGS = {
    'train': 'url("../assets/wallpapers/train-bridge.jpg")',
    'peak': 'url("../assets/wallpapers/misty-peak.jpg")',
    'rail': 'url("../assets/wallpapers/rail-sea.jpg")',
    'powerlines': 'url("../assets/wallpapers/powerlines.jpg")',
    'hydra': 'url("../assets/wallpapers/hydra.jpg")',
    'nsx': 'url("../assets/wallpapers/nsx.jpg")',
    'f1': 'url("../assets/wallpapers/f1.jpg")',
    'rain': 'url("../assets/wallpapers/rain.jpg")',
    'greenroom': 'url("../assets/wallpapers/greenroom.jpg")',
    'aurora': 'url("../assets/wallpapers/aurora-teal.jpg")',
    'cliff': 'url("../assets/wallpapers/cliff-cat.jpg")',
    'live-stars': 'radial-gradient(circle at 70% 35%, #4b2a96 0%, #0a1030 55%, #04050f 100%)',
    'live-aurora': 'linear-gradient(160deg, #04101c 0%, #0f8a6a 45%, #5b2fa0 75%, #07182a 100%)',
    'live-galaxy': 'radial-gradient(ellipse at center, #ffd9a8 0%, #c24be0 22%, #2a0f55 55%, #03020a 100%)'
  };
  const ENGINES = {
    google: 'https://www.google.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    brave: 'https://search.brave.com/search?q=',
    duckduckgo: 'https://html.duckduckgo.com/html/?q=',
    mojeek: 'https://www.mojeek.com/search?q='
  };
  const toUrl = (input) => {
    const t = (input || '').trim();
    if (!t) return '';
    if (/^https?:\/\//i.test(t)) return t;
    if (!/\s/.test(t) && (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(t) || /^localhost(:\d+)?(\/.*)?$/.test(t))) return 'https://' + t;
    return (ENGINES[S.engine] || ENGINES.google) + encodeURIComponent(t);
  };

  const animOn = () => S.anim !== false;

  /* ---------------- dynamic theme: accent colour taken from the wallpaper ---------------- */
  const GA = window.GalaxyAccent;
  const ACC_VARS = ['--color-pin', '--overlay-active', '--overlay-indicator', '--color-text-dark'];
  let dynAccent = null, accKey = '', accReq = 0, hashSrc = null, hashVal = '';
  const accCache = new Map(), accFail = new Set();
  try { Object.entries(JSON.parse(localStorage.getItem('galaxy.accent') || '{}')).forEach(([k, v]) => { if (v && typeof v.h === 'number') accCache.set(k, v); }); } catch (e) {}
  const saveAccCache = () => { try { localStorage.setItem('galaxy.accent', JSON.stringify(Object.fromEntries([...accCache].slice(-12)))); } catch (e) {} };
  // which image is the wallpaper: a cache key, what to ask the main process for, and a url for the canvas fallback
  function wallRef() {
    if (S.customBg) {
      if (hashSrc !== S.customBg) { hashSrc = S.customBg; let h = 5381; for (let i = 0; i < hashSrc.length; i++) h = ((h << 5) + h + hashSrc.charCodeAt(i)) | 0; hashVal = hashSrc.length + ':' + (h >>> 0).toString(36); }
      return { key: 'c:' + hashVal, ref: S.customBg, url: S.customBg };
    }
    if (!S.customBg && /^live-/.test(S.bg)) return { key: 'live:' + S.bg, ref: '', url: '', live: S.bg };
    const m = /wallpapers\/([^"')]+)/.exec(BGS[S.bg] || BGS.train);
    const f = m ? m[1] : 'train-bridge.jpg';
    return { key: 'b:' + f, ref: 'wallpaper:' + f, url: '../assets/wallpapers/' + f };
  }
  function canvasColor(url) {
    return new Promise((res) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => {
        try {
          const k = Math.min(1, 64 / Math.max(im.naturalWidth, im.naturalHeight, 1)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
          const x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(im, 0, 0, c.width, c.height);
          res(GA.dominant(x.getImageData(0, 0, c.width, c.height).data, 'rgba'));
        } catch (e) { res(null); }
      };
      im.onerror = () => res(null);
      im.src = url;
    });
  }
  // dominant colour of an image: the main process fetches/decodes it into a tiny PNG (no CORS limits); a canvas
  // on the original is the fallback (e.g. webp, which the main process can't decode)
  async function imageColor(ref, url) {
    try {
      const thumb = window.galaxy.imageThumb ? await window.galaxy.imageThumb(ref) : null;
      const r = thumb ? await canvasColor(thumb) : null;
      if (r) return r;
    } catch (e) {}
    return canvasColor(url || ref);
  }
  function paintAccent() {
    const st = document.documentElement.style;
    if (!S.dynTheme || !dynAccent) { ACC_VARS.forEach((v) => st.removeProperty(v)); return; }
    const [r, g, b] = dynAccent.rgb;
    st.setProperty('--color-pin', dynAccent.hex);
    st.setProperty('--overlay-active', `rgba(${r}, ${g}, ${b}, .42)`);
    st.setProperty('--overlay-indicator', `rgba(${r}, ${g}, ${b}, .55)`);
    st.setProperty('--color-text-dark', '#101010');
  }
  function setAccent(raw) {
    dynAccent = GA.accentFor(raw);
    paintAccent();
    broadcast();
  }
  function updateAccent() {
    if (!S.dynTheme) { accReq++; accKey = ''; if (dynAccent) { dynAccent = null; paintAccent(); broadcast(); } return; }
    const w = wallRef();
    if (w.key === accKey && (dynAccent || accFail.has(w.key))) return;
    accKey = w.key;
    if (w.live) { setAccent(window.GalaxyLive.accentOf(w.live)); return; }   // animated wallpapers have a fixed accent
    const hit = accCache.get(w.key);
    if (hit) { setAccent(hit); return; }
    const req = ++accReq;
    imageColor(w.ref, w.url).then((raw) => {
      if (req !== accReq) return; // the wallpaper changed again meanwhile
      if (!raw) { accFail.add(w.key); toast("Couldn't read colors from this wallpaper"); return; }
      accCache.set(w.key, raw); saveAccCache();
      setAccent(raw);
    });
  }

  // what the built-in apps get to see: the settings without the code and saved data of custom apps
  const pubS = () => {
    const o = Object.assign({}, S);
    delete o.appData;
    o.customApps = (S.customApps || []).map((c) => (c.kind === 'html' ? { id: c.id, name: c.name, kind: 'html', iconUrl: c.iconUrl, emoji: c.emoji, key: c.key } : c));
    return o;
  };
  const settingsMsg = () => ({ type: 'settings', S: pubS(), accent: S.dynTheme && dynAccent ? { hex: dynAccent.hex, rgb: dynAccent.rgb } : null });
  function broadcast() {
    document.querySelectorAll('iframe.app').forEach((f) => {
      try { f.contentWindow.postMessage(settingsMsg(), '*'); } catch (e) {}
    });
  }
  let lastCloak = null;
  function applySettings() {
    rebuildApps();
    if (window.Jarvis) window.Jarvis.update(S.jarvis);
    if (window.GalaxyCustomTheme) window.GalaxyCustomTheme.apply(document, S.customTheme);
    if (window.GalaxyIntro) window.GalaxyIntro.config(S.boot);
    // tab cloak: window title + icon
    { const tc = S.tabCloak || {}, title = tc.title || 'Galaxy OS', key = title + '|' + (tc.domain || '');
      if (document.title !== title) document.title = title;
      if (key !== lastCloak) {
        const first = lastCloak === null; lastCloak = key;
        if (!(first && !tc.domain) && window.galaxy.setCloak) window.galaxy.setCloak({ title, icon: tc.domain ? 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(tc.domain) : '' });
      } }
    normalizeDock();
    document.documentElement.dataset.theme = S.theme;
    if (window.GalaxyLive) window.GalaxyLive.set(!S.customBg && /^live-/.test(S.bg) ? S.bg : null);
    $('#bg').style.backgroundImage = S.customBg ? `url("${S.customBg.replace(/"/g, '%22')}")` : (BGS[S.bg] || BGS.train);
    document.documentElement.dataset.dock = ['left', 'right'].includes(S.dockPos) ? S.dockPos : 'bottom';
    document.documentElement.dataset.dsize = ['sm', 'lg'].includes(S.dockSize) ? S.dockSize : 'md';
    document.documentElement.dataset.anim = animOn() ? 'on' : 'off';
    document.documentElement.dataset.bstyle = S.browserStyle === 'theme' ? 'theme' : 'glass';
    if (browserCtl) browserCtl.setWallpaper();
    updateAccent();
    renderDock();
    renderWidgets();
    paintDisplay();
    batRefresh();
    window.onbeforeunload = S.antiClose ? (e) => { e.preventDefault(); e.returnValue = ''; } : null;
    broadcast();
  }

  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.h);
    toast.h = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }

  /* ---------------- window manager ---------------- */
  let zTop = 100;
  const wins = {};      // key -> window object
  let focused = null;
  let webCount = 0;

  let dockSig = '';
  const tempIds = () => APPS.filter((a) => wins[a.id] && !findLoc(a.id)).map((a) => a.id);
  const dockSigNow = () => JSON.stringify(S.dock) + '|' + tempIds().join();
  function updateDock() {
    if (dockSigNow() !== dockSig) { renderDock(); return; }
    document.querySelectorAll('#dock .navButton').forEach((b) => {
      const ids = b.dataset.items ? b.dataset.items.split(' ') : [b.dataset.id];
      b.classList.toggle('open', ids.some((id) => !!wins[id]));
      b.classList.toggle('active', ids.some((id) => wins[id] && wins[id] === focused && !wins[id].min));
    });
  }
  function focusWin(w) {
    if (!w) return;
    Object.values(wins).forEach((x) => x.el.classList.remove('active'));
    w.el.style.zIndex = ++zTop;
    w.el.classList.add('active');
    focused = w;
    updateDock();
  }
  /* thumbnails for the taskbar preview */
  function webviewOf(w) {
    if (w.key === 'browser' && browserCtl) return browserCtl.currentWebview();
    return w.body.querySelector('gx-webview');
  }
  async function captureThumb(w) {
    try {
      const wv = webviewOf(w);
      if (!wv || w.min) { if (!wv) w.thumb = ''; return; }
      const img = await Promise.race([wv.capturePage(), new Promise((_r, rej) => setTimeout(() => rej(new Error('timeout')), 900))]);
      w.thumb = img.resize({ width: 360 }).toDataURL();
    } catch (e) {}
  }

  /* minimize / restore fly to and from the taskbar icon */
  function dockTransform(w) {
    const btn = document.querySelector(`#dock .navButton[data-id="${w.key}"]`) || [...document.querySelectorAll('#dock .navButton[data-items]')].find((b) => b.dataset.items.split(' ').includes(w.key));
    if (!btn) return 'scale(.85)';
    const r = w.el.getBoundingClientRect(), t = btn.getBoundingClientRect();
    const dx = (t.left + t.width / 2) - (r.left + r.width / 2);
    const dy = (t.top + t.height / 2) - (r.top + r.height / 2);
    return `translate(${dx}px, ${dy}px) scale(.06)`;
  }
  function minimize(w) {
    if (w.noMin) return;
    captureThumb(w);
    w.min = true;
    if (focused === w) focused = null;
    updateDock();
    clearTimeout(w.animT);
    if (!animOn()) { w.el.classList.add('minimized'); return; }
    const el = w.el;
    const tf = dockTransform(w);
    el.style.transition = 'transform .22s cubic-bezier(.5, 0, .75, 0), opacity .2s ease-in';
    el.style.transform = tf;
    el.style.opacity = '0';
    w.animT = setTimeout(() => {
      el.classList.add('minimized');
      el.style.transition = el.style.transform = el.style.opacity = '';
    }, 230);
  }
  function restore(w) {
    w.min = false;
    clearTimeout(w.animT);
    const el = w.el;
    const wasHidden = el.classList.contains('minimized');
    el.classList.remove('minimized');
    if (animOn() && wasHidden) {
      const tf = dockTransform(w);
        el.style.transition = 'none';
      el.style.transform = tf;
      el.style.opacity = '0';
      void el.offsetWidth;
      el.style.transition = 'transform .24s cubic-bezier(.2, .8, .2, 1), opacity .2s ease-out';
      el.style.transform = '';
      el.style.opacity = '';
      w.animT = setTimeout(() => { el.style.transition = ''; }, 260);
    } else {
      el.style.transform = el.style.opacity = el.style.transition = '';
    }
    focusWin(w);
  }

  /* ---------------- split screen / snapping ---------------- */
  const SNAP_LAYOUTS = [
    [[0, 0, .5, 1], [.5, 0, .5, 1]],
    [[0, 0, 2 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
    [[0, 0, 1 / 3, 1], [1 / 3, 0, 2 / 3, 1]],
    [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
    [[0, 0, .5, 1], [.5, 0, .5, .5], [.5, .5, .5, .5]],
    [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]]
  ];
  function workArea() {
    const r = $('.nav').getBoundingClientRect(), pos = S.dockPos || 'bottom';
    const l = pos === 'left' ? r.width : 0, rt = pos === 'right' ? r.width : 0, b = pos === 'bottom' ? r.height : 0;
    return { x: l, y: 25, w: innerWidth - l - rt, h: innerHeight - 25 - b };
  }
  const prevBox = $('#snapPrev') || (() => { const d = document.createElement('div'); d.id = 'snapPrev'; document.body.appendChild(d); return d; })();
  function frameOf(f) {
    const A = workArea(), g = 3;
    return { left: A.x + f[0] * A.w + g, top: A.y + f[1] * A.h + g, width: f[2] * A.w - g * 2, height: f[3] * A.h - g * 2 };
  }
  function snapWin(w, f) {
    if (!f) { w.el.classList.add('maxed'); return; }       // null = maximize
    if (w.noSnap) return;
    const el = w.el;
    if (!w.snapped && !el.classList.contains('maxed')) w.prev = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    el.classList.remove('maxed');
    const r = frameOf(f);
    if (animOn()) { el.style.transition = 'left .16s, top .16s, width .16s, height .16s'; setTimeout(() => { el.style.transition = ''; }, 190); }
    el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
    w.snapped = true;
    if (w.min) restore(w); else focusWin(w);
  }
  function snapDragged(w, f) { w.snapped = false; w.prev = w.prev || null; snapWin(w, f); }
  // cursor position -> snap zone while dragging a window
  function snapZone(x, y) {
    const A = workArea(), e = 6, c = 70;
    const L = x <= A.x + e, R = x >= A.x + A.w - e, T = y <= 30;
    const B = y >= A.y + A.h - e;
    if (L || R) {
      const nearTop = y <= A.y + c, nearBot = y >= A.y + A.h - c;
      const xx = L ? 0 : .5;
      if (nearTop) return [xx, 0, .5, .5];
      if (nearBot) return [xx, .5, .5, .5];
      return [xx, 0, .5, 1];
    }
    if (T) return 'max';
    return null;
  }
  // Windows-11 style layout picker when hovering the maximize button
  const snapMenu = document.createElement('div');
  snapMenu.id = 'snapMenu';
  document.body.appendChild(snapMenu);
  let snapMenuWin = null, snapT = null;
  SNAP_LAYOUTS.forEach((lay) => {
    const box = document.createElement('div');
    box.className = 'snapLay';
    lay.forEach((f) => {
      const z = document.createElement('button');
      z.className = 'snapZ';
      z.style.cssText = `left:${f[0] * 100}%;top:${f[1] * 100}%;width:${f[2] * 100}%;height:${f[3] * 100}%`;
      z.addEventListener('click', () => { const w = snapMenuWin; hideSnapMenu(); if (w) snapWin(w, f); });
      box.appendChild(z);
    });
    snapMenu.appendChild(box);
  });
  function hideSnapMenu() { clearTimeout(snapT); snapMenu.style.display = 'none'; snapMenuWin = null; }
  snapMenu.addEventListener('mouseenter', () => clearTimeout(snapT));
  snapMenu.addEventListener('mouseleave', () => { snapT = setTimeout(hideSnapMenu, 200); });
  function showSnapMenu(w, btn) {
    clearTimeout(snapT);
    snapT = setTimeout(() => {
      snapMenuWin = w;
      snapMenu.style.display = 'grid';
      const r = btn.getBoundingClientRect(), m = snapMenu.getBoundingClientRect();
      snapMenu.style.left = Math.max(6, Math.min(r.right - m.width, innerWidth - m.width - 6)) + 'px';
      snapMenu.style.top = (r.bottom + 4) + 'px';
    }, 380);
  }
  function snapKey(dir) {
    const w = focused;
    if (!w || w.noSnap) return false;
    const el = w.el;
    const fr = (f) => snapWin(w, f);
    if (dir === 'Up') { fr(null); return true; }
    if (dir === 'Down') { if (el.classList.contains('maxed')) { el.classList.remove('maxed'); } else if (w.snapped && w.prev) { Object.assign(el.style, { left: w.prev.left + 'px', top: w.prev.top + 'px', width: w.prev.width + 'px', height: w.prev.height + 'px' }); w.snapped = false; } else minimize(w); return true; }
    fr(dir === 'Left' ? [0, 0, .5, 1] : [.5, 0, .5, 1]);
    return true;
  }

  function makeWindow(key, title, opts = {}) {
    const { w = 900, h = 560, noMin = false } = opts;
    const n = Object.keys(wins).length;
    const W = Math.min(w, innerWidth - 40);
    const H = Math.min(h, innerHeight - 110);
    const el = document.createElement('div');
    el.className = 'window opening';
    setTimeout(() => el.classList.remove('opening'), 260);
    el.style.width = W + 'px';
    el.style.height = H + 'px';
    el.style.left = Math.max(8, (innerWidth - W) / 2 + (n % 6) * 26 - 60) + 'px';
    el.style.top = Math.max(30, (innerHeight - H) / 2 + (n % 6) * 26 - 30) + 'px';
    el.innerHTML = `
      <div class="bar noSelect">
        <div class="bar-left"><span class="window-title"></span></div>
        <div class="bar-middle"></div>
        <div class="bar-right">
          ${noMin ? '<span style="flex:1"></span>' : '<button class="navControl min" title="Minimize">&#8211;</button>'}
          <button class="navControl max" title="Maximize">&#9633;</button>
          <button class="navControl close" title="Close">&#10005;</button>
        </div>
      </div>
      <div class="wbody"></div>
      <div class="rz rz-r"></div><div class="rz rz-b"></div><div class="rz rz-br"></div>`;
    $('.window-title', el).textContent = title;
    $('#desktop').appendChild(el);

    const win = { key, el, min: false, noMin, body: $('.wbody', el), setTitle: (t) => { $('.window-title', el).textContent = t; } };
    wins[key] = win;

    el.addEventListener('mousedown', () => focusWin(win), true);

    // drag
    $('.bar', el).addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || el.classList.contains('maxed')) return;
      let ox = e.clientX - el.offsetLeft, oy = e.clientY - el.offsetTop, zone = null, moved = false;
      document.body.classList.add('dragging');
      const move = (ev) => {
        if (!moved && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) < 4) return;
        if (!moved) {
          moved = true;
          if (win.snapped && win.prev) {   // dragging a snapped window pulls it back out to its old size
            const ratio = (e.clientX - el.offsetLeft) / el.offsetWidth;
            el.style.width = win.prev.width + 'px'; el.style.height = win.prev.height + 'px';
            el.style.left = (e.clientX - ratio * win.prev.width) + 'px';
            win.snapped = false;
            ox = e.clientX - el.offsetLeft; oy = e.clientY - el.offsetTop;
          }
        }
        el.style.left = Math.min(Math.max(-el.offsetWidth + 80, ev.clientX - ox), innerWidth - 80) + 'px';
        el.style.top = Math.min(Math.max(25, ev.clientY - oy), innerHeight - 60) + 'px';
        zone = snapZone(ev.clientX, ev.clientY);
        if (zone) {
          const r = zone === 'max' ? { left: workArea().x, top: 25, width: workArea().w, height: workArea().h } : frameOf(zone);
          Object.assign(prevBox.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
        } else prevBox.style.display = 'none';
      };
      const up = () => {
        document.body.classList.remove('dragging'); removeEventListener('mousemove', move); removeEventListener('mouseup', up);
        prevBox.style.display = 'none';
        if (moved && zone) { if (zone === 'max') { win.snapped = false; el.classList.add('maxed'); } else { snapDragged(win, zone); } }
      };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    });

    // resize
    const startResize = (mode) => (e) => {
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, sw = el.offsetWidth, sh = el.offsetHeight;
      document.body.classList.add('dragging');
      const move = (ev) => {
        if (mode !== 'b') el.style.width = Math.max(320, sw + ev.clientX - sx) + 'px';
        if (mode !== 'r') el.style.height = Math.max(220, sh + ev.clientY - sy) + 'px';
      };
      const up = () => { document.body.classList.remove('dragging'); removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    };
    $('.rz-r', el).addEventListener('mousedown', startResize('r'));
    $('.rz-b', el).addEventListener('mousedown', startResize('b'));
    $('.rz-br', el).addEventListener('mousedown', startResize('br'));

    const toggleMax = () => el.classList.toggle('maxed');
    $('.max', el).addEventListener('click', () => { hideSnapMenu(); toggleMax(); });
    $('.max', el).addEventListener('mouseenter', (ev) => showSnapMenu(win, ev.currentTarget));
    $('.max', el).addEventListener('mouseleave', () => { clearTimeout(snapT); snapT = setTimeout(hideSnapMenu, 250); });
    $('.bar-middle', el).addEventListener('dblclick', toggleMax);
    const minBtn = $('.min', el);
    if (minBtn) minBtn.addEventListener('click', () => minimize(win));
    win.close = () => {
      delete wins[key];
      if (focused === win) focused = null;
      updateDock();
      if (animOn()) { el.classList.add('closing'); setTimeout(() => el.remove(), 180); }
      else el.remove();
    };
    $('.close', el).addEventListener('click', win.close);

    focusWin(win);
    return win;
  }

  /* ---------------- generic web view window (GeForce NOW, games) ---------------- */
  function buildWebView(body, url, app) {
    body.innerHTML = '<div class="webwrap"></div>';
    const wv = document.createElement('gx-webview');
    wv.setAttribute('partition', 'persist:galaxy');
    wv.setAttribute('allowpopups', '');
    wv.src = url;
    $('.webwrap', body).appendChild(wv);
    if (app) {
      // warnings and errors of a website app go to the Dev Console (plain logs only while the console is open)
      wv.addEventListener('console-message', (ev) => {
        const L = ev.level, lv = (L === 3 || L === 'error') ? 'error' : (L === 2 || L === 'warning') ? 'warn' : (L === 1 || L === 'info') ? 'info' : 'log';
        if ((lv === 'log' || lv === 'info') && !devFrame()) return;
        const line = ev.line || ev.lineNumber, src = ev.sourceId ? String(ev.sourceId).split('/').pop().slice(0, 60) : '';
        pushLog(app.id, lv, String(ev.message) + (src && line ? `  (${src}:${line})` : ''));
      });
      wv.addEventListener('did-fail-load', (ev) => { if (ev.isMainFrame && ev.errorCode !== -3) pushLog(app.id, 'error', `Failed to load ${ev.validatedURL || url} (${ev.errorDescription || ev.errorCode})`); });
    }
    return wv;
  }

  function openWebWindow(url, title) {
    const key = 'web' + (++webCount);
    const w = makeWindow(key, title || url, { w: 1000, h: 640, noMin: true });
    buildWebView(w.body, url);
  }

  /* ---------------- browser app ---------------- */
  let browserCtl = null;

  function buildBrowser(body) {
    const IC = {
      back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
      fwd: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
      reload: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>',
      stop: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h4v-6h4v6h4V10"/></svg>',
      search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/></svg>',
      lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
      globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
      plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
    };
    const TILES = [
      { n: 'YouTube', u: 'https://www.youtube.com', c: '#e0392d', img: 'youtube' },
      { n: 'Discord', u: 'https://discord.com/app', c: '#5865f2', img: 'discord' },
      { n: 'Reddit', u: 'https://www.reddit.com', c: '#ff5a1f', img: 'reddit' },
      { n: 'GitHub', u: 'https://github.com', c: '#6e7681', img: 'github' },
      { n: 'Twitch', u: 'https://www.twitch.tv', c: '#9146ff', img: 'twitch' },
      { n: 'GeForce NOW', app: 'gfn', img: 'nvidia' },
      { n: 'Roblox', app: 'roblox', img: 'roblox' },
      { n: 'TikTok', app: 'tiktok', img: 'tiktok' },
      { n: 'Spotify', app: 'music', img: 'music' }
    ];
    body.innerHTML = `
      <div class="browser">
        <div class="tabs noSelect"><div class="tablist"></div><button class="plus" title="New tab (Ctrl+T)">${IC.plus}</button></div>
        <div class="toolbar">
          <button class="tb" data-a="back" title="Back">${IC.back}</button>
          <button class="tb" data-a="fwd" title="Forward">${IC.fwd}</button>
          <button class="tb" data-a="reload" title="Reload">${IC.reload}</button>
          <div class="omni"><span class="omniIc">${IC.search}</span><input class="addr" placeholder="Search or enter address" spellcheck="false"></div>
          <button class="tb" data-a="home" title="Home">${IC.home}</button>
        </div>
        <div class="views">
          <div class="newtab" style="display:flex">
            <div class="ntIn">
              <h2 class="greet"></h2>
              <div class="ntBox"><span class="omniIc">${IC.search}</span><input class="ntSearch" placeholder="Search or enter address" spellcheck="false"></div>
              <div class="shortcuts"></div>
            </div>
          </div>
        </div>
      </div>`;
    const root = $('.browser', body);
    const tabsEl = $('.tablist', body), plus = $('.plus', body), addr = $('.addr', body), omniIc = $('.omni .omniIc', body);
    const views = $('.views', body), nt = $('.newtab', body), ntSearch = $('.ntSearch', body);
    const tabs = [];
    let cur = null;

    // shortcut tiles
    const sc = $('.shortcuts', body);
    TILES.forEach((t) => {
      const b = document.createElement('button');
      b.className = 'tile';
      if (t.u) b.dataset.u = t.u;
      if (t.app) b.dataset.app = t.app;
      const ic = document.createElement('span');
      ic.className = 'tileIc';
      ic.innerHTML = `<img src="${ICON(t.img)}" alt="">`;
      if (t.c) { ic.style.background = t.c; ic.classList.add('badge'); }
      const lb = document.createElement('span');
      lb.className = 'tileLb';
      lb.textContent = t.n;
      b.append(ic, lb);
      sc.appendChild(b);
    });

    const greet = () => {
      const d = new Date(), h = d.getHours();
      $('.greet', body).textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'} - ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    };
    greet();

    function setWallpaper() {
      const glass = S.browserStyle !== 'theme';
      const img = S.customBg ? `url("${S.customBg.replace(/"/g, '%22')}")` : (BGS[S.bg] || BGS.train);
      nt.style.backgroundImage = glass ? img : '';
    }

    function updateNav() {
      const t = cur;
      let b = false, f = false;
      try { if (t && t.wv && !t.home && t.ready) { b = t.wv.canGoBack(); f = t.wv.canGoForward(); } } catch (e) {}
      $('[data-a=back]', body).disabled = !b;
      $('[data-a=fwd]', body).disabled = !f;
      const rl = $('[data-a=reload]', body);
      const loading = !!(t && t.loading && !t.home);
      rl.innerHTML = loading ? IC.stop : IC.reload;
      rl.title = loading ? 'Stop' : 'Reload';
      const secure = !!(t && !t.home && /^https:/i.test(t.url || ''));
      omniIc.innerHTML = secure ? IC.lock : IC.search;
      omniIc.classList.toggle('secure', secure);
    }

    function renderTabs() {
      tabsEl.textContent = '';
      tabs.forEach((t) => {
        const el = document.createElement('div');
        el.className = 'tab' + (t === cur ? ' sel' : '');
        el.title = t.title;
        const fav = document.createElement('span');
        fav.className = 'fav' + (t.loading && !t.home ? ' spin' : '');
        if (t.loading && !t.home) fav.innerHTML = '<b></b>';
        else if (t.icon) { const im = document.createElement('img'); im.src = t.icon; im.onerror = () => { fav.innerHTML = IC.globe; }; fav.appendChild(im); }
        else fav.innerHTML = IC.globe;
        const ttl = document.createElement('span');
        ttl.className = 'ttl';
        ttl.textContent = t.title;
        const x = document.createElement('i');
        x.title = 'Close tab';
        x.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>';
        el.append(fav, ttl, x);
        el.addEventListener('mousedown', (e) => { if (!e.target.closest('i') && e.button === 0) select(t); if (e.button === 1) { e.preventDefault(); closeTab(t); } });
        x.addEventListener('click', (e) => { e.stopPropagation(); closeTab(t); });
        tabsEl.appendChild(el);
      });
    }
    function select(t) {
      cur = t;
      tabs.forEach((x) => { if (x.wv) x.wv.style.display = (x === t && !x.home) ? '' : 'none'; });
      nt.style.display = (!t.wv || t.home) ? 'flex' : 'none';
      addr.value = t.home ? '' : t.url;
      if (nt.style.display === 'flex') greet();
      renderTabs();
      updateNav();
    }
    function ensureWv(t) {
      if (t.wv) return;
      const wv = document.createElement('gx-webview');
      wv.setAttribute('partition', 'persist:galaxy');
      wv.setAttribute('allowpopups', '');
      views.appendChild(wv);
      wv.addEventListener('dom-ready', () => { t.ready = true; if (t === cur) updateNav(); });
      wv.addEventListener('page-title-updated', (e) => { t.title = e.title || t.title; renderTabs(); });
      wv.addEventListener('page-favicon-updated', (e) => { t.icon = (e.favicons || [])[0] || ''; renderTabs(); });
      wv.addEventListener('did-start-loading', () => { t.loading = true; renderTabs(); if (t === cur) updateNav(); });
      wv.addEventListener('did-stop-loading', () => { t.loading = false; renderTabs(); if (t === cur) updateNav(); });
      const nav = (e) => { if (e.isMainFrame === false) return; t.url = e.url; if (t === cur && !t.home) { addr.value = e.url; updateNav(); } };
      wv.addEventListener('did-navigate', nav);
      wv.addEventListener('did-navigate-in-page', nav);
      t.wv = wv;
    }
    function navigate(t, input) {
      const u = toUrl(input);
      if (!u) return;
      ensureWv(t);
      t.home = false;
      t.url = u;
      t.icon = '';
      t.title = u.replace(/^https?:\/\//, '').slice(0, 40);
      t.wv.src = u;
      select(t);
    }
    function newTab(url) {
      const t = { wv: null, title: 'New Tab', url: '', home: true, icon: '', loading: false, ready: false };
      tabs.push(t);
      select(t);
      if (url) navigate(t, url);
      return t;
    }
    function closeTab(t) {
      const i = tabs.indexOf(t);
      if (t.wv) t.wv.remove();
      tabs.splice(i, 1);
      if (!tabs.length) newTab();
      else if (cur === t) select(tabs[Math.max(0, i - 1)]);
      else renderTabs();
    }

    plus.addEventListener('click', () => { newTab(); addr.focus(); });
    addr.addEventListener('keydown', (e) => { if (e.key === 'Enter') { navigate(cur, addr.value); addr.blur(); } });
    addr.addEventListener('focus', () => addr.select());
    ntSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') { navigate(cur, ntSearch.value); ntSearch.value = ''; } });
    nt.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.u) navigate(cur, b.dataset.u);
      if (b.dataset.app) openApp(b.dataset.app);
    });
    $('.toolbar', body).addEventListener('click', (e) => {
      const a = e.target.closest('button')?.dataset.a;
      if (!a) return;
      try {
        if (a === 'back') cur.wv.goBack();
        else if (a === 'fwd') cur.wv.goForward();
        else if (a === 'reload') { if (cur.loading) cur.wv.stop(); else cur.wv.reload(); }
        else if (a === 'home') { cur.home = true; select(cur); }
      } catch (err) {}
    });
    root.addEventListener('keydown', (e) => {
      if (!e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === 't') { e.preventDefault(); newTab(); addr.focus(); }
      else if (k === 'w') { e.preventDefault(); closeTab(cur); }
      else if (k === 'l') { e.preventDefault(); addr.focus(); }
    });

    newTab();
    setWallpaper();
    browserCtl = { newTab, setWallpaper, currentWebview: () => (cur && cur.wv && !cur.home ? cur.wv : null) };
  }

  /* ---------------- apps ---------------- */
  function openApp(id) {
    const app = APPS.find((a) => a.id === id);
    if (!app) return;
    const existing = wins[id];
    if (existing) { if (existing.min) restore(existing); else focusWin(existing); return existing; }
    const w = makeWindow(id, app.name, { w: app.size[0], h: app.size[1] });
    if (id === 'browser') { w.el.classList.add('browserwin'); buildBrowser(w.body); }
    else if (id === 'gfn') buildWebView(w.body, 'https://play.geforcenow.com', app);
    else if (app.html) buildCustomApp(w, app);
    else if (app.url) buildWebView(w.body, app.url, app);
    else {
      const f = document.createElement('iframe');
      f.className = 'app';
      f.src = app.file;
      w.body.appendChild(f);
    }
    return w;
  }

  // dock: three zones (left / middle / right) holding apps and folders
  const dock = $('#dock');
  const zoneNames = { left: 'left', center: 'middle', right: 'right' };
  const isPinned = (id) => !!findLoc(id);
  let drag = null;           // {id, isFolder}
  let openFolderId = null;

  function clearDndMarks() {
    document.querySelectorAll('.merge, .ins-before, .ins-after, .over').forEach((x) => x.classList.remove('merge', 'ins-before', 'ins-after', 'over'));
  }
  function bindDrag(el, id) {
    el.draggable = true;
    el.addEventListener('dragstart', (e) => {
      hidePeek(); hideMenu();
      drag = { id, isFolder: isFolderId(id) };
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', id); } catch (err) {}
      setTimeout(() => { dock.classList.add('dnd'); el.classList.add('dragging'); }, 0);
    });
    el.addEventListener('dragend', () => {
      drag = null;
      dock.classList.remove('dnd');
      el.classList.remove('dragging');
      clearDndMarks();
    });
  }
  // where would a drop at this mouse position land in this zone?
  function zoneTarget(zoneEl, ev) {
    const horiz = (S.dockPos || 'bottom') === 'bottom';
    const btns = [...zoneEl.querySelectorAll(':scope > .navButton')];
    const p = horiz ? ev.clientX : ev.clientY;
    const zone = zoneEl.dataset.zone;
    const nextOf = (i) => (btns[i + 1] ? btns[i + 1].dataset.id : null);
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i], r = b.getBoundingClientRect();
      const st = horiz ? r.left : r.top, sz = horiz ? r.width : r.height;
      if (p < st - 4 || p > st + sz + 4) continue;
      if (b.dataset.id === drag.id) return { noop: true };
      const ratio = (p - st) / sz;
      if (ratio > 0.28 && ratio < 0.72 && !drag.isFolder && !b.dataset.temp && !LOCKED.includes(drag.id) && !LOCKED.includes(b.dataset.id)) return { merge: b.dataset.id, btn: b };
      return ratio <= 0.5 ? { zone, before: b.dataset.id, btn: b, side: 'before' } : { zone, before: nextOf(i), btn: b, side: 'after' };
    }
    let before = null, ref = null, side = 'after';
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const c = horiz ? r.left + r.width / 2 : r.top + r.height / 2;
      if (p < c) { before = b.dataset.id; ref = b; side = 'before'; break; }
      ref = b;
    }
    return { zone, before, btn: ref, side };
  }
  function bindZone(zoneEl) {
    zoneEl.addEventListener('dragover', (e) => {
      if (!drag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearDndMarks();
      zoneEl.classList.add('over');
      const t = zoneTarget(zoneEl, e);
      if (t.noop) return;
      if (t.merge) t.btn.classList.add('merge');
      else if (t.btn) t.btn.classList.add(t.side === 'before' ? 'ins-before' : 'ins-after');
    });
    zoneEl.addEventListener('dragleave', (e) => { if (!zoneEl.contains(e.relatedTarget)) clearDndMarks(); });
    zoneEl.addEventListener('drop', (e) => {
      if (!drag) return;
      e.preventDefault();
      const id = drag.id, t = zoneTarget(zoneEl, e);
      drag = null; dock.classList.remove('dnd'); clearDndMarks();
      if (t.noop) return;
      applyDrop(id, t.merge ? { merge: t.merge } : { zone: t.zone, before: t.before });
    });
  }

  function appButton(id, temp) {
    const a = APPS.find((x) => x.id === id);
    const b = document.createElement('button');
    b.className = 'navButton';
    b.dataset.id = a.id;
    if (temp) b.dataset.temp = '1';
    b.appendChild(makeIcon(a));
    bindDrag(b, a.id);
    b.addEventListener('click', () => {
      const w = wins[a.id];
      if (!w) openApp(a.id);
      else if (w.min) restore(w);
      else if (focused === w) minimize(w);
      else focusWin(w);
    });
    b.addEventListener('mouseenter', () => { if (!drag) { clearTimeout(peekT); peekT = setTimeout(() => showPeek(b, a), 280); } });
    b.addEventListener('mouseleave', hidePeek);
    b.addEventListener('mousedown', hidePeek);
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      hidePeek();
      appMenu(e.clientX, e.clientY, a, { above: (S.dockPos || 'bottom') === 'bottom' });
    });
    return b;
  }
  function folderButton(f) {
    const b = document.createElement('button');
    b.className = 'navButton folder';
    b.dataset.id = f.id;
    b.dataset.items = f.items.join(' ');
    b.title = f.name + ' (' + f.items.length + ')';
    const g = document.createElement('div');
    g.className = 'fgrid';
    f.items.slice(0, 4).forEach((id) => { const a = APPS.find((x) => x.id === id); if (a) g.appendChild(makeIcon(a, 'fi')); });
    const n = document.createElement('span');
    n.className = 'fcount';
    n.textContent = f.items.length;
    b.append(g, n);
    bindDrag(b, f.id);
    b.addEventListener('click', () => { hidePeek(); if (openFolderId === f.id) closeFolder(); else openFolder(f.id); });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      hidePeek();
      showMenu(e.clientX, e.clientY, [
        { label: 'Rename folder', run: () => askText('Rename folder', f.name, (v) => { f.name = v || 'Folder'; save(); applySettings(); }) },
        { label: 'Ungroup', run: () => ungroup(f.id) },
        ...moveItems(f.id)
      ], (S.dockPos || 'bottom') === 'bottom');
    });
    return b;
  }
  function moveItems(id) {
    const l = findLoc(id);
    return ZONES.filter((z) => !l || l.folder || z !== l.zone).map((z) => ({ label: 'Move to ' + zoneNames[z], run: () => applyDrop(id, { zone: z, before: null }) }));
  }
  function ungroup(fid) {
    const l = findLoc(fid);
    if (!l) return;
    l.arr.splice(l.idx, 1, ...l.item.items);
    save(); applySettings();
  }
  function appMenu(x, y, a, opts = {}) {
    const w = wins[a.id], l = findLoc(a.id);
    const items = [w ? { label: 'Close', run: () => w.close() } : { label: 'Open', run: () => openApp(a.id) }];
    if (!l) items.push({ label: 'Pin to taskbar', run: () => setPinned(a.id, true) });
    else {
      if (l.folder) items.push({ label: 'Remove from folder', run: () => applyDrop(a.id, { zone: l.zone, before: null }) });
      else items.push(...moveItems(a.id));
      if (!LOCKED.includes(a.id)) items.push({ label: 'Unpin from taskbar', run: () => setPinned(a.id, false) });
    }
    if (a.custom) {
      items.push({ label: 'Edit app', run: () => (a.html ? showAppBuilder(a.id) : showAddApp(a.id)) });
      items.push({ label: 'Remove app from OS', run: () => removeCustomApp(a.id) });
    }
    showMenu(x, y, items, !!opts.above);
  }

  function renderDock() {
    dock.textContent = '';
    dockSig = dockSigNow();
    const tmp = tempIds();
    ZONES.forEach((z) => {
      const zone = document.createElement('div');
      zone.className = 'zone';
      zone.dataset.zone = z;
      S.dock[z].forEach((it) => zone.appendChild(typeof it === 'string' ? appButton(it, false) : folderButton(it)));
      if (z === 'center') tmp.forEach((id) => zone.appendChild(appButton(id, true)));
      bindZone(zone);
      dock.appendChild(zone);
    });
    if (openFolderId) { const f = findFolder(openFolderId); if (f) fillFolder(f); else closeFolder(); }
    updateDock();
  }
  function setPinned(id, on) {
    if (on) { if (!findLoc(id)) S.dock.center.push(id); }
    else { if (LOCKED.includes(id)) { toast('This app can\'t be unpinned'); return; } detach(id); }
    save();
    applySettings();
    const a = APPS.find((x) => x.id === id);
    if (a) toast(on ? `Pinned ${a.name} to taskbar` : `Unpinned ${a.name} from taskbar`);
  }

  // folder pop-up (shown above/beside the taskbar)
  const fpop = document.createElement('div');
  fpop.id = 'fpop';
  document.body.appendChild(fpop);
  function closeFolder() { openFolderId = null; fpop.style.display = 'none'; clearDndMarks(); }
  function fillFolder(f) {
    fpop.textContent = '';
    const hd = document.createElement('div');
    hd.className = 'fpName';
    hd.textContent = f.name;
    hd.title = 'Double-click to rename';
    hd.addEventListener('dblclick', () => askText('Rename folder', f.name, (v) => { f.name = v || 'Folder'; save(); applySettings(); }));
    const grid = document.createElement('div');
    grid.className = 'fpGrid';
    f.items.forEach((id) => {
      const a = APPS.find((x) => x.id === id);
      if (!a) return;
      const it = document.createElement('button');
      it.className = 'fpItem';
      it.dataset.id = id;
      it.appendChild(makeIcon(a, 'fpIc'));
      const lb = document.createElement('span');
      lb.textContent = a.name;
      it.appendChild(lb);
      bindDrag(it, id);
      it.addEventListener('click', () => { closeFolder(); openApp(id); });
      it.addEventListener('contextmenu', (e) => { e.preventDefault(); appMenu(e.clientX, e.clientY, a); });
      grid.appendChild(it);
    });
    // drop inside the folder: reorder, or drag an app in from the taskbar
    grid.addEventListener('dragover', (e) => {
      if (!drag || drag.isFolder) return;
      e.preventDefault();
      clearDndMarks();
      const t = folderTarget(grid, e);
      if (t.btn) t.btn.classList.add(t.side === 'before' ? 'ins-before' : 'ins-after');
    });
    grid.addEventListener('drop', (e) => {
      if (!drag || drag.isFolder) return;
      e.preventDefault();
      const id = drag.id, t = folderTarget(grid, e);
      drag = null; dock.classList.remove('dnd'); clearDndMarks();
      applyDrop(id, { folderId: f.id, before: t.before });
    });
    const hint = document.createElement('div');
    hint.className = 'fpHint';
    hint.textContent = 'Drag an app out onto the taskbar to remove it';
    fpop.append(hd, grid, hint);
  }
  function folderTarget(grid, ev) {
    const items = [...grid.children];
    let best = null, bd = 1e9;
    items.forEach((b) => {
      const r = b.getBoundingClientRect();
      const d = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
      if (d < bd) { bd = d; best = b; }
    });
    if (!best) return { before: null };
    const r = best.getBoundingClientRect();
    if (ev.clientX < r.left + r.width / 2) return { before: best.dataset.id, btn: best, side: 'before' };
    const i = items.indexOf(best);
    return { before: items[i + 1] ? items[i + 1].dataset.id : null, btn: best, side: 'after' };
  }
  function openFolder(fid) {
    const f = findFolder(fid), btn = dock.querySelector(`.navButton[data-id="${fid}"]`);
    if (!f || !btn) return;
    openFolderId = fid;
    fillFolder(f);
    fpop.style.display = 'flex';
    const r = btn.getBoundingClientRect(), p = fpop.getBoundingClientRect(), pos = S.dockPos || 'bottom';
    let x, y;
    if (pos === 'bottom') { x = r.left + r.width / 2 - p.width / 2; y = r.top - p.height - 12; }
    else if (pos === 'left') { x = r.right + 12; y = r.top + r.height / 2 - p.height / 2; }
    else { x = r.left - p.width - 12; y = r.top + r.height / 2 - p.height / 2; }
    fpop.style.left = Math.max(6, Math.min(x, innerWidth - p.width - 6)) + 'px';
    fpop.style.top = Math.max(30, Math.min(y, innerHeight - p.height - 6)) + 'px';
  }
  addEventListener('mousedown', (e) => { if (openFolderId && !e.target.closest('#fpop') && !e.target.closest('#dock .folder') && !e.target.closest('#ctx')) closeFolder(); }, true);

  // right-click on empty taskbar space
  dock.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.navButton')) return;
    e.preventDefault();
    hidePeek();
    showMenu(e.clientX, e.clientY, [
      { label: 'Add app to OS', run: () => showAddApp() },
      { label: 'Reset taskbar layout', run: resetDock }
    ], (S.dockPos || 'bottom') === 'bottom');
  });
  function resetDock() {
    S.dock = { left: [], center: DEFAULT_PINNED.concat((S.customApps || []).map((c) => c.id)), right: [] };
    save(); applySettings(); toast('Taskbar layout reset');
  }

  // taskbar hover preview
  const peek = document.createElement('div');
  peek.id = 'peek';
  document.body.appendChild(peek);
  let peekT = null, peekFor = null;
  function hidePeek() { clearTimeout(peekT); peekFor = null; peek.style.display = 'none'; }
  function fillPeek(a) {
    const w = wins[a.id];
    peek.textContent = '';
    const hd = document.createElement('div');
    hd.className = 'pkHd';
    hd.append(makeIcon(a, 'pkIc'), document.createElement('span'));
    hd.querySelector('span').textContent = w ? `${a.name} - ${$('.window-title', w.el).textContent}`.replace(`${a.name} - ${a.name}`, a.name) : a.name;
    const body = document.createElement('div');
    body.className = 'pkBody';
    if (w && w.thumb) { const im = document.createElement('img'); im.className = 'thumb'; im.src = w.thumb; body.appendChild(im); }
    else {
      body.append(makeIcon(a, 'big'), document.createElement('span'));
      body.querySelector('span').textContent = w ? (w.min ? 'Minimized' : 'Running') : 'Click to open';
    }
    peek.append(hd, body);
  }
  function placePeek(btn) {
    const r = btn.getBoundingClientRect(), p = peek.getBoundingClientRect();
    const pos = S.dockPos || 'bottom';
    let x, y;
    if (pos === 'bottom') { x = r.left + r.width / 2 - p.width / 2; y = r.top - p.height - 10; }
    else if (pos === 'left') { x = r.right + 10; y = r.top + r.height / 2 - p.height / 2; }
    else { x = r.left - p.width - 10; y = r.top + r.height / 2 - p.height / 2; }
    peek.style.left = Math.max(6, Math.min(x, innerWidth - p.width - 6)) + 'px';
    peek.style.top = Math.max(30, Math.min(y, innerHeight - p.height - 6)) + 'px';
  }
  async function showPeek(btn, a) {
    peekFor = a.id;
    fillPeek(a);
    peek.style.display = 'flex';
    placePeek(btn);
    const w = wins[a.id];
    if (w && !w.min) {
      await captureThumb(w);
      if (peekFor === a.id && w.thumb) { fillPeek(a); placePeek(btn); }
    }
  }

  // context menu
  const ctx = document.createElement('div');
  ctx.id = 'ctx';
  document.body.appendChild(ctx);
  function showMenu(x, y, items, above) {
    hideDesk();
    ctx.textContent = '';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.textContent = it.label;
      b.addEventListener('click', () => { hideMenu(); it.run(); });
      ctx.appendChild(b);
    });
    ctx.style.display = 'flex';
    const r = ctx.getBoundingClientRect();
    ctx.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
    ctx.style.top = Math.max(30, above ? y - r.height - 6 : Math.min(y, innerHeight - r.height - 4)) + 'px';
  }
  function hideMenu() { ctx.style.display = 'none'; }
  addEventListener('mousedown', (e) => { if (!e.target.closest('#ctx')) hideMenu(); }, true);
  addEventListener('blur', hideMenu);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideMenu(); closeFolder(); } });
  document.addEventListener('contextmenu', (e) => { if (!e.target.closest('#dock, #fpop')) hideMenu(); });

  /* ---------------- modal dialogs ---------------- */
  let modalEl = null;
  function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } capturing = false; }
  function openModal(html) {
    closeModal();
    modalEl = document.createElement('div');
    modalEl.id = 'modal';
    modalEl.innerHTML = `<div class="mbox">${html}</div>`;
    modalEl.addEventListener('mousedown', (e) => { if (e.target === modalEl) closeModal(); });
    document.body.appendChild(modalEl);
    return modalEl.firstChild;
  }
  function askText(title, value, cb) {
    const box = openModal(`<h2 class="mt"></h2><input class="mfield" id="askIn" spellcheck="false" maxlength="24" style="width:100%"><div class="mbtns"><button class="mbtn" data-a="x">Cancel</button><button class="mbtn pri" data-a="ok">Save</button></div>`);
    box.querySelector('.mt').textContent = title;
    const inp = box.querySelector('#askIn');
    inp.value = value || '';
    inp.focus(); inp.select();
    const done = () => { const v = inp.value.trim(); closeModal(); cb(v); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); if (e.key === 'Escape') closeModal(); });
    box.querySelector('[data-a=ok]').addEventListener('click', done);
    box.querySelector('[data-a=x]').addEventListener('click', closeModal);
  }

  /* ---------------- key bindings ---------------- */
  let capturing = false;
  const fmtKey = (k) => {
    if (!k || !k.key) return '';
    const key = k.key === ' ' ? 'Space' : k.key.length === 1 ? k.key.toUpperCase() : k.key;
    return [k.ctrl && 'Ctrl', k.alt && 'Alt', k.shift && 'Shift', k.meta && 'Meta', key].filter(Boolean).join(' + ');
  };
  const specOf = (e) => ({ key: e.key, ctrl: !!e.ctrlKey, alt: !!e.altKey, shift: !!e.shiftKey, meta: !!e.metaKey });
  const sameKey = (a, b) => !!a && !!b && !!a.key && a.key.toLowerCase() === String(b.key).toLowerCase() && !!a.ctrl === !!b.ctrl && !!a.alt === !!b.alt && !!a.shift === !!b.shift && !!a.meta === !!b.meta;
  // turns a readonly <input> into a "press a key" box
  function keyCapture(input, initial, onChange) {
    let cur = initial || null;
    input.readOnly = true;
    const show = () => { input.value = fmtKey(cur); input.placeholder = 'Click, then press a key'; };
    show();
    input.addEventListener('focus', () => { capturing = true; input.value = ''; input.placeholder = 'Press a key... (Backspace clears)'; });
    input.addEventListener('blur', () => { capturing = false; show(); });
    input.addEventListener('keydown', (e) => {
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { input.blur(); return; }
      cur = (e.key === 'Backspace' || e.key === 'Delete') ? null : specOf(e);
      onChange(cur);
      input.blur();
    });
  }
  function runKey(spec) {
    if (spec.alt && !spec.ctrl && !spec.shift && !spec.meta && /^Arrow(Left|Right|Up|Down)$/.test(spec.key)) return snapKey(spec.key.slice(5));
    const q = S.quickKey;
    if (q && q.on && sameKey(q, spec) && q.url) { quickOpen(q.url); return true; }
    const sc = Object.keys(S.shortcuts || {}).find((id) => sameKey(S.shortcuts[id], spec) && APPS.some((a) => a.id === id));
    if (sc) { openApp(sc); return true; }
    const c = (S.customApps || []).find((x) => x.key && sameKey(x.key, spec));
    if (c) { openApp(c.id); return true; }
    return false;
  }
  function quickOpen(url) {
    openApp('browser');
    if (browserCtl) browserCtl.newTab(toUrl(url));
  }
  addEventListener('keydown', (e) => {
    if (capturing || e.repeat || ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    const t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (typing && !(e.ctrlKey || e.altKey || e.metaKey)) return;
    if (modalEl) return;
    if (runKey(specOf(e))) e.preventDefault();
  });
  // keys pressed while a website (webview) has focus: only combos with Ctrl/Alt/Meta are forwarded
  window.galaxy.onWebviewKey((spec) => { if (!capturing && !modalEl) runKey(spec); });

  /* ---------------- add / edit app ---------------- */
  const PRESETS = [
    { n: 'Canva', u: 'https://www.canva.com' },
    { n: 'Classroom', u: 'https://classroom.google.com' },
    { n: 'Classlink', u: 'https://myapps.classlink.com' },
    { n: 'Clever', u: 'https://clever.com' },
    { n: 'Drive', u: 'https://drive.google.com' },
    { n: 'Google', u: 'https://www.google.com' },
    { n: 'Gmail', u: 'https://mail.google.com' },
    { n: 'YouTube', u: 'https://www.youtube.com' },
    { n: 'Discord', u: 'https://discord.com/app' }
  ];
  const normUrl = (v) => {
    let t = (v || '').trim();
    if (!t) return '';
    if (!/^https?:\/\//i.test(t)) t = 'https://' + t;
    try { const u = new URL(t); return /\./.test(u.hostname) || u.hostname === 'localhost' ? u.href.replace(/\/$/, u.pathname === '/' && !u.search && !u.hash ? '' : '/') : ''; } catch (e) { return ''; }
  };
  function showAddApp(editId) {
    const ex = editId ? (S.customApps || []).find((c) => c.id === editId) : null;
    const box = openModal(`
      <h2 class="mt">${ex ? 'Edit app' : 'Add an app to Galaxy OS'}</h2>
      <div class="mh">Tab Presets</div>
      <div class="chips" id="adPre"></div>
      <div class="mh">Custom Tab</div>
      <div class="mgrid">
        <input class="mfield" id="adName" placeholder="Name (e.g. Canva)" spellcheck="false" maxlength="40">
        <input class="mfield" id="adUrl" placeholder="Website link (e.g. https://canva.com)" spellcheck="false">
        <input class="mfield" id="adIcon" placeholder="Icon URL" spellcheck="false">
        <input class="mfield" id="adKey">
      </div>
      <label class="mchk"><input type="checkbox" id="adFav"> Use the website's icon</label>
      ${ex ? '' : '<label class="mchk"><input type="checkbox" id="adPin" checked> Pin to the taskbar</label>'}
      <div class="mnote">Quick key (optional): press it anywhere in Galaxy OS to open this app. Use Ctrl/Alt + a key if you want it to also work while a website is focused.</div>
      <div class="mprev"><span id="adPrev"></span><b id="adPrevName"></b></div>
      <div class="mbtns"><button class="mbtn" data-a="x">Cancel</button><button class="mbtn pri" data-a="ok">${ex ? 'Save' : 'Add app'}</button></div>`);
    const $$ = (id) => box.querySelector(id);
    const name = $$('#adName'), url = $$('#adUrl'), icon = $$('#adIcon'), fav = $$('#adFav');
    let keySpec = ex && ex.key ? ex.key : null;
    keyCapture($$('#adKey'), keySpec, (k) => { keySpec = k; });
    PRESETS.forEach((p) => {
      const c = document.createElement('button');
      c.className = 'chip';
      const im = document.createElement('img');
      im.src = hostIcon(p.u); im.alt = ''; im.addEventListener('error', () => { im.style.visibility = 'hidden'; });
      c.append(im, document.createTextNode(p.n));
      c.addEventListener('click', () => { name.value = p.n; url.value = p.u; icon.value = ''; fav.checked = true; sync(); });
      $$('#adPre').appendChild(c);
    });
    if (ex) { name.value = ex.name; url.value = ex.url; fav.checked = ex.useFavicon !== false; icon.value = ex.useFavicon === false ? ex.iconUrl : ''; }
    else fav.checked = true;
    function iconFor() {
      const u = normUrl(url.value);
      if (!fav.checked && icon.value.trim()) return icon.value.trim();
      return u ? hostIcon(u) : '';
    }
    function sync() {
      icon.disabled = fav.checked;
      icon.style.opacity = fav.checked ? '.45' : '';
      const prev = $$('#adPrev');
      prev.textContent = '';
      const nm = name.value.trim() || (normUrl(url.value) ? new URL(normUrl(url.value)).hostname.replace(/^www\./, '') : 'App');
      prev.appendChild(makeIcon({ name: nm, iconUrl: iconFor(), icon: 'apps' }, 'pvIc'));
      $$('#adPrevName').textContent = nm;
    }
    [name, url, icon].forEach((i) => i.addEventListener('input', sync));
    fav.addEventListener('change', () => { if (!fav.checked) icon.focus(); sync(); });
    sync();
    url.focus();
    const submit = () => {
      const u = normUrl(url.value);
      if (!u) { toast('Enter a valid website link'); url.focus(); return; }
      const host = new URL(u).hostname.replace(/^www\./, '');
      const useFav = fav.checked || !icon.value.trim();
      const entry = { id: ex ? ex.id : 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name.value.trim() || host, url: u, useFavicon: useFav, iconUrl: useFav ? hostIcon(u) : icon.value.trim(), key: keySpec };
      if (!Array.isArray(S.customApps)) S.customApps = [];
      if (ex) { S.customApps = S.customApps.map((c) => (c.id === ex.id ? entry : c)); }
      else {
        S.customApps.push(entry);
        const pin = $$('#adPin');
        if (!pin || pin.checked) S.dock.center.push(entry.id);
      }
      closeModal();
      save(); applySettings();
      toast(ex ? `Saved ${entry.name}` : `Added ${entry.name}`);
    };
    $$('[data-a=ok]').addEventListener('click', submit);
    $$('[data-a=x]').addEventListener('click', closeModal);
    [name, url, icon].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); }));
  }
  function removeCustomApp(id) {
    const a = APPS.find((x) => x.id === id);
    if (wins[id]) wins[id].close();
    S.customApps = (S.customApps || []).filter((c) => c.id !== id);
    if (S.appData) delete S.appData[id];
    save(); applySettings();
    if (a) toast(`Removed ${a.name}`);
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl && !capturing) closeModal(); });

  /* ---------------- desktop: right-click menu, arrange windows, widgets ---------------- */
  const WALLS = [['train', 'Train bridge'], ['peak', 'Misty peak'], ['rail', 'Rail by the sea'], ['powerlines', 'Powerlines'], ['hydra', 'Hydra'], ['nsx', 'NSX'], ['f1', 'F1'], ['rain', 'Rain'], ['greenroom', 'Green room'], ['aurora', 'Aurora'], ['cliff', 'Cliff cat'], ['live-stars', 'Live: Starfield'], ['live-aurora', 'Live: Aurora'], ['live-galaxy', 'Live: Galaxy']];
  const WTYPES = { clock: 'Clock', weather: 'Weather', battery: 'Battery', nowplaying: 'Now Playing', note: 'Sticky note', todo: 'To-do list' };
  const WSIZE = { note: [220, 200], todo: [250, 290] };
  const NOTE_COLORS = [['yellow', '#f7e58a'], ['pink', '#f6b3cc'], ['blue', '#a5d0f6'], ['green', '#b0e3a6'], ['violet', '#cdb3f6']];
  const clamp = (v, a, b) => Math.max(a, Math.min(v, Math.max(a, b)));
  const mkEl = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ----- widgets ----- */
  const wlayer = mkEl('div');
  wlayer.id = 'widgets';
  document.body.insertBefore(wlayer, $('#desktop'));
  let wSig = null, wz = 10;
  const widgetList = () => (S.widgets = Array.isArray(S.widgets) ? S.widgets.filter((w) => w && WTYPES[w.type] && typeof w.id === 'string') : []);
  const wSigNow = () => JSON.stringify(S.widgets || []) + (S.widgetsHidden ? 'h' : '');
  function saveWidgets() { save(); wSig = wSigNow(); }
  function fitWidget(el, wd) {
    const A = workArea();
    el.style.left = clamp(+wd.x || 0, A.x, A.x + A.w - el.offsetWidth) + 'px';
    el.style.top = clamp(+wd.y || 0, A.y, A.y + A.h - el.offsetHeight) + 'px';
  }
  function renderWidgets(force) {
    const list = widgetList();
    wlayer.style.display = S.widgetsHidden ? 'none' : '';
    wlayer.dataset.style = ['theme', 'clear'].includes(S.widgetStyle) ? S.widgetStyle : 'glass';
    if (!force && wSigNow() === wSig) { wlayer.querySelectorAll('.widget').forEach((el) => fitWidget(el, el._wd)); return; }
    wSig = wSigNow();
    wlayer.textContent = '';
    list.forEach((wd) => { const el = buildWidget(wd); wlayer.appendChild(el); fitWidget(el, wd); });
  }
  const widgetEl = (wd) => wlayer.querySelector(`.widget[data-id="${wd.id}"]`);
  function removeWidget(id) {
    S.widgets = widgetList().filter((w) => w.id !== id);
    saveWidgets();
    const el = wlayer.querySelector(`.widget[data-id="${id}"]`);
    if (el) el.remove();
  }
  function addWidget(type, x, y) {
    const list = widgetList(), sz = WSIZE[type];
    const wd = { id: 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type, x: x - 20, y: y - 10, data: {} };
    if (sz) { wd.w = sz[0]; wd.h = sz[1]; }
    if (type === 'weather') wd.data = { unit: /-(US|LR|MM)\b/i.test(navigator.language || '') ? 'f' : 'c', city: null };
    if (type === 'todo') wd.data = { title: 'To-do', items: [] };
    if (type === 'nowplaying') wd.data = { source: 'auto' };
    if (type === 'note') wd.data = { color: NOTE_COLORS[list.filter((w) => w.type === 'note').length % NOTE_COLORS.length][0], text: '' };
    list.push(wd);
    S.widgetsHidden = false;
    saveWidgets();
    renderWidgets(true);
    const el = widgetEl(wd);
    if (el) el.classList.add('pop');
    if (type === 'weather') weatherModal(wd);
    else if (type === 'note' && el) el.querySelector('textarea').focus();
    else if (type === 'todo' && el) el.querySelector('.td-add').focus();
  }

  function paintClock(el, wd) {
    const d = new Date(), h24 = !!wd.data.h24, an = !!wd.data.analog;
    el.classList.toggle('analog', an);
    el.querySelector('.ck-date').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    if (an) {
      const sec = d.getSeconds(), min = d.getMinutes(), hr = d.getHours() % 12;
      const set = (c, deg) => el.querySelector(c).setAttribute('transform', `rotate(${deg} 50 50)`);
      set('.hh', hr * 30 + min * .5); set('.mh', min * 6 + sec * .1); set('.sh', sec * 6);
      el.querySelector('.sh').style.display = wd.data.sec === false ? 'none' : '';
    } else {
      el.querySelector('.ck-time').textContent = d.toLocaleTimeString([], { hour: h24 ? '2-digit' : 'numeric', minute: '2-digit', second: wd.data.sec ? '2-digit' : undefined, hour12: !h24 });
    }
  }

  // weather: Open-Meteo (free, no API key)
  const WX = (c, day) => c === 0 ? [day ? '☀️' : '🌙', 'Clear'] : c === 1 ? [day ? '🌤️' : '🌙', 'Mostly clear'] : c === 2 ? ['⛅', 'Partly cloudy'] : c === 3 ? ['☁️', 'Overcast']
    : (c === 45 || c === 48) ? ['🌫️', 'Fog'] : (c >= 51 && c <= 57) ? ['🌦️', 'Drizzle'] : (c >= 61 && c <= 67) ? ['🌧️', 'Rain'] : (c >= 71 && c <= 77) ? ['❄️', 'Snow']
    : (c >= 80 && c <= 82) ? ['🌧️', 'Rain showers'] : (c === 85 || c === 86) ? ['🌨️', 'Snow showers'] : c >= 95 ? ['⛈️', 'Thunderstorm'] : ['🌡️', 'Weather'];
  function paintWeather(el, wd) {
    const city = wd.data.city, c = wd.data.cache, f = wd.data.unit !== 'c';
    const q = (x) => el.querySelector(x);
    q('.wx-body').style.display = city ? '' : 'none';
    q('.wx-set').style.display = city ? 'none' : '';
    if (!city) return;
    q('.wx-city').textContent = city.name;
    const hrs = q('.wx-hrs');
    hrs.textContent = '';
    if (c && c.unit === wd.data.unit) {
      const [ic, txt] = WX(c.code, c.day);
      q('.wx-ic').textContent = ic;
      q('.wx-temp').textContent = c.temp + '°';
      q('.wx-desc').textContent = txt;
      q('.wx-meta').textContent = `H ${c.hi}°  ·  L ${c.lo}°  ·  Feels ${c.feels}°  ·  ${c.wind} ${f ? 'mph' : 'km/h'}`;
      (c.hrs || []).forEach((h) => { const col = mkEl('div', 'wx-h'); col.append(mkEl('span', '', h.l), mkEl('i', '', h.i), mkEl('b', '', h.t + '°')); hrs.appendChild(col); });
    } else {
      q('.wx-ic').textContent = '⏳'; q('.wx-temp').textContent = '--°'; q('.wx-desc').textContent = 'Loading…'; q('.wx-meta').textContent = '';
    }
  }
  async function loadWeather(el, wd) {
    const city = wd.data.city;
    if (!city || el._busy) return;
    el._busy = true;
    const f = wd.data.unit !== 'c';
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,weather_code&forecast_hours=6&daily=temperature_2m_max,temperature_2m_min&temperature_unit=${f ? 'fahrenheit' : 'celsius'}&wind_speed_unit=${f ? 'mph' : 'kmh'}&timezone=auto&forecast_days=1`;
      const j = await (await fetch(url)).json();
      const cur = j.current;
      const hrs = [];
      for (let i = 1; i < Math.min(6, (j.hourly.time || []).length); i++) {
        const hh = +(/T(\d\d)/.exec(j.hourly.time[i]) || [0, 0])[1];
        hrs.push({ l: (hh % 12 || 12) + (hh < 12 ? ' AM' : ' PM'), t: Math.round(j.hourly.temperature_2m[i]), i: WX(j.hourly.weather_code[i], hh >= 6 && hh < 19)[0] });
      }
      wd.data.cache = { hrs, ts: Date.now(), unit: wd.data.unit, temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature), code: cur.weather_code, day: cur.is_day, wind: Math.round(cur.wind_speed_10m), hi: Math.round(j.daily.temperature_2m_max[0]), lo: Math.round(j.daily.temperature_2m_min[0]) };
      saveWidgets();
    } catch (e) {
      if (!wd.data.cache || wd.data.cache.unit !== wd.data.unit) { el.querySelector('.wx-desc').textContent = 'Weather unavailable'; el.querySelector('.wx-ic').textContent = '⚠️'; el._busy = false; return; }
    }
    el._busy = false;
    if (el.isConnected) paintWeather(el, wd);
  }
  const US_ST = { AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california', CO: 'colorado', CT: 'connecticut', DE: 'delaware', FL: 'florida', GA: 'georgia', HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa', KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland', MA: 'massachusetts', MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri', MT: 'montana', NE: 'nebraska', NV: 'nevada', NH: 'new hampshire', NJ: 'new jersey', NM: 'new mexico', NY: 'new york', NC: 'north carolina', ND: 'north dakota', OH: 'ohio', OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', RI: 'rhode island', SC: 'south carolina', SD: 'south dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont', VA: 'virginia', WA: 'washington', WV: 'west virginia', WI: 'wisconsin', WY: 'wyoming', DC: 'district of columbia' };
  async function geocode(q) {
    const parts = q.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return [];
    let rest = parts.slice(1).join(' ').toLowerCase();
    if (US_ST[rest.toUpperCase()]) rest = US_ST[rest.toUpperCase()];
    const j = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=' + encodeURIComponent(parts[0]))).json();
    let res = j.results || [];
    if (rest) { const f = res.filter((x) => [x.admin1, x.admin2, x.country, x.country_code].filter(Boolean).join(' ').toLowerCase().includes(rest)); if (f.length) res = f; }
    return res;
  }
  function weatherModal(wd) {
    const box = openModal(`<h2 class="mt">Weather location</h2>
      <div style="display:grid;grid-template-columns:1fr auto;gap:10px"><input class="mfield" id="wxQ" placeholder="City (e.g. Brownsville, TX)" spellcheck="false"><button class="mbtn pri" data-a="go">Search</button></div>
      <div class="wxRes" id="wxRes"></div>
      <div class="mbtns"><button class="mbtn" data-a="x">Cancel</button></div>`);
    const inp = box.querySelector('#wxQ'), out = box.querySelector('#wxRes');
    inp.focus();
    const go = async () => {
      const q = inp.value.trim();
      if (!q) return;
      out.textContent = 'Searching…';
      try {
        const res = await geocode(q);
        out.textContent = '';
        if (!res.length) { out.textContent = 'No places found. Try just the city name.'; return; }
        res.slice(0, 8).forEach((r) => {
          const b = mkEl('button', 'wxPick', [r.name, r.admin1, r.country].filter(Boolean).join(', '));
          b.addEventListener('click', () => {
            wd.data.city = { name: r.name + (r.admin1 && r.country_code === 'US' ? ', ' + r.admin1 : r.country ? ', ' + r.country : ''), lat: r.latitude, lon: r.longitude };
            wd.data.cache = null;
            closeModal(); saveWidgets();
            const el = widgetEl(wd);
            if (el) { paintWeather(el, wd); loadWeather(el, wd); }
          });
          out.appendChild(b);
        });
      } catch (e) { out.textContent = 'Could not reach the weather service. Check your connection.'; }
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    box.querySelector('[data-a=go]').addEventListener('click', go);
    box.querySelector('[data-a=x]').addEventListener('click', closeModal);
  }

  /* ----- Now Playing: the Player app reports its track by message; the Spotify window is read from its page ----- */
  const NP = { player: null, music: null }; // latest {title, artist, art, playing, pos, dur, ts, since} per source
  const NP_NAME = { player: 'Player', music: 'Spotify' };
  const npStr = (v, n) => String(v == null ? '' : v).slice(0, n);
  const npArt = (v) => (typeof v === 'string' && v.length < 3000 && /^(https?:\/\/|data:image\/)/i.test(v) ? v : '');
  const npNum = (v) => (isFinite(+v) && +v > 0 ? +v : 0);
  const fmtT = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function setNP(key, st) {
    const old = NP[key];
    if (st) {
      st.ts = Date.now();
      st.since = old && old.title === st.title && old.artist === st.artist && old.playing === st.playing ? old.since : st.ts;
    }
    NP[key] = st;
    npRefresh();
  }
  // which source the widget shows: its chosen one, or (auto) whatever is playing / was active most recently
  function npPick(pref) {
    let keys = ['player', 'music'].filter((k) => wins[k] && NP[k]);
    if (pref === 'player' || pref === 'music') keys = keys.filter((k) => k === pref);
    keys.sort((a, b) => (NP[b].playing - NP[a].playing) || (NP[b].since - NP[a].since));
    return keys[0] || null;
  }
  const npPos = (st) => (st.playing ? Math.min(st.dur || Infinity, st.pos + (Date.now() - st.ts) / 1000) : st.pos);
  const npColors = new Map();
  function npColor(url) {
    if (!npColors.has(url)) {
      if (npColors.size > 40) npColors.delete(npColors.keys().next().value);
      npColors.set(url, imageColor(url, url));
    }
    return npColors.get(url);
  }
  const cssUrl = (u) => `url("${u.replace(/["\\\r\n]/g, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))}")`;
  const IC_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>', IC_PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h3.500v14H7zM13.500 5H17v14h-3.500z"/></svg>';
  function npTint(el, raw) {
    if (!raw) { el.style.removeProperty('--np'); el.style.removeProperty('--npbg'); return; }
    el.style.setProperty('--np', GA.accentFor(raw).hex);
    el.style.setProperty('--npbg', GA.tintFor(raw, .9));
  }
  function paintNP(el, wd) {
    const r = el._r, key = npPick(wd.data.source), st = key ? NP[key] : null;
    el.classList.toggle('empty', !st);
    el._key = key;
    if (!st) {
      r.title.textContent = 'Nothing playing';
      r.artist.textContent = 'Play something in Player or Spotify';
      if (el._art !== null) { el._art = null; r.art.style.backgroundImage = ''; r.art.classList.remove('has'); npTint(el, null); }
      return;
    }
    r.src.textContent = NP_NAME[key];
    r.src.title = 'Open ' + NP_NAME[key];
    r.title.textContent = st.title;
    r.artist.textContent = st.artist;
    r.title.title = st.title + (st.artist ? ' - ' + st.artist : '');
    if (el._playing !== st.playing) { el._playing = st.playing; r.pp.innerHTML = st.playing ? IC_PAUSE : IC_PLAY; r.pp.title = st.playing ? 'Pause' : 'Play'; }
    const pos = npPos(st);
    r.fill.style.width = (st.dur ? Math.min(100, pos / st.dur * 100) : 0) + '%';
    r.cur.textContent = fmtT(pos);
    r.dur.textContent = st.dur ? fmtT(st.dur) : '';
    if (el._art !== st.art) {
      el._art = st.art;
      r.art.style.backgroundImage = st.art ? cssUrl(st.art) : '';
      r.art.classList.toggle('has', !!st.art);
      if (!st.art) npTint(el, null);
      else npColor(st.art).then((raw) => { if (el._art === st.art && el.isConnected) npTint(el, raw); });
    }
  }
  const npRefresh = () => wlayer.querySelectorAll('.w-nowplaying').forEach((el) => paintNP(el, el._wd));
  function npControl(key, act) {
    if (!key) return;
    const st = NP[key];
    if (key === 'player') {
      const w = wins.player, f = w && w.body.querySelector('iframe');
      if (f) { try { f.contentWindow.postMessage({ type: 'media-control', action: act }, '*'); } catch (e) {} }
    } else {
      const w = wins.music, wv = w && w.body.querySelector('gx-webview');
      const sel = act === 'next' ? 'control-button-skip-forward' : act === 'prev' ? 'control-button-skip-back' : 'control-button-playpause';
      try { wv.executeJavaScript(`(() => { const b = document.querySelector('[data-testid="${sel}"]'); if (b) b.click(); })()`).catch(() => {}); } catch (e) {}
      setTimeout(npPollSpotify, 400);
    }
    if (st && act === 'toggle') { st.pos = npPos(st); st.ts = Date.now(); st.playing = !st.playing; npRefresh(); } // instant feedback; the app confirms next
  }
  // Spotify's web player has no API we can reach from here, so read what its page shows
  const SPOT_JS = `(() => { try {
    const q = (s, r) => (r || document).querySelector(s);
    const t = (e) => ((e && e.textContent) || '').trim();
    const secs = (s) => { const m = /(\\d+):(\\d+)(?::(\\d+))?/.exec(s || ''); return m ? (m[3] ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2]) : 0; };
    const w = q('[data-testid="now-playing-widget"]');
    let title = w ? t(q('[data-testid="context-item-link"]', w)) : '', artist = w ? (t(q('[data-testid="context-item-info-subtitles"]', w)) || t(q('[data-testid="context-item-info-artist"]', w))) : '';
    if (!title) { const p = (document.title || '').split(' \\u2022 '); if (p.length > 1 && !/spotify/i.test(p[0])) { title = p[0]; artist = p[1]; } }
    if (!title) return null;
    const im = w && q('img[data-testid="cover-art-image"], img', w), pp = q('[data-testid="control-button-playpause"]');
    return { title, artist, art: im ? im.src : '', playing: !!pp && /pause/i.test(pp.getAttribute('aria-label') || ''), pos: secs(t(q('[data-testid="playback-position"]'))), dur: secs(t(q('[data-testid="playback-duration"]'))) };
  } catch (e) { return null; } })()`;
  let spotBusy = false;
  async function npPollSpotify() {
    const w = wins.music, wv = w && w.body.querySelector('gx-webview');
    if (!wv || spotBusy) return;
    spotBusy = true;
    try {
      const r = await Promise.race([wv.executeJavaScript(SPOT_JS), new Promise((_res, rej) => setTimeout(rej, 1500))]);
      setNP('music', r && r.title ? { title: npStr(r.title, 200), artist: npStr(r.artist, 200), art: npArt(r.art), playing: !!r.playing, pos: npNum(r.pos), dur: npNum(r.dur) } : null);
    } catch (e) { /* page not ready yet */ } finally { spotBusy = false; }
  }
  setInterval(() => {
    if (!wins.music) { if (NP.music) NP.music = null; return; }
    if (!S.widgetsHidden && wlayer.querySelector('.w-nowplaying')) npPollSpotify();
  }, 1500);

  const BUILD = {
    battery(el, wd) {
      const bar = mkEl('div', 'bt-bar');
      bar.appendChild(mkEl('i'));
      const top = mkEl('div', 'bt-top');
      top.append(mkEl('span', 'bt-pct'), mkEl('span', 'bt-bolt', '⚡'));
      el.append(top, mkEl('div', 'bt-state'), bar);
      paintBattery(el, wd);
      return () => [
        { label: wd.data.time === false ? 'Show time estimate' : 'Hide time estimate', run: () => { wd.data.time = wd.data.time === false; saveWidgets(); paintBattery(el, wd); } },
        { label: S.batteryToast === false ? 'Turn on low battery alerts' : 'Turn off low battery alerts', run: () => { S.batteryToast = S.batteryToast === false; save(); toast(S.batteryToast ? 'Low battery alerts on' : 'Low battery alerts off'); broadcast(); } }
      ];
    },
    clock(el, wd) {
      const face = mkEl('div', 'ck-face');
      face.innerHTML = '<svg viewBox="0 0 100 100"><circle class="rim" cx="50" cy="50" r="47"/>' + Array.from({ length: 12 }, (_, i) => `<line class="tk${i % 3 ? '' : ' big'}" x1="50" y1="${i % 3 ? 6 : 5}" x2="50" y2="${i % 3 ? 10 : 12}" transform="rotate(${i * 30} 50 50)"/>`).join('') + '<line class="hh" x1="50" y1="50" x2="50" y2="27"/><line class="mh" x1="50" y1="50" x2="50" y2="15"/><line class="sh" x1="50" y1="56" x2="50" y2="12"/><circle class="hub" cx="50" cy="50" r="2.6"/></svg>';
      el.append(face, mkEl('div', 'ck-time'), mkEl('div', 'ck-date'));
      paintClock(el, wd);
      return () => [
        { label: wd.data.analog ? 'Digital clock' : 'Analog clock', run: () => { wd.data.analog = !wd.data.analog; if (wd.data.analog && wd.data.sec == null) wd.data.sec = true; saveWidgets(); paintClock(el, wd); } },
        { label: wd.data.h24 ? 'Use 12-hour time' : 'Use 24-hour time', run: () => { wd.data.h24 = !wd.data.h24; saveWidgets(); paintClock(el, wd); } },
        { label: (wd.data.analog ? wd.data.sec !== false : wd.data.sec) ? 'Hide seconds' : 'Show seconds', run: () => { wd.data.sec = !(wd.data.analog ? wd.data.sec !== false : wd.data.sec); saveWidgets(); paintClock(el, wd); } }
      ];
    },
    weather(el, wd) {
      const body = mkEl('div', 'wx-body');
      const main = mkEl('div', 'wx-main');
      main.append(mkEl('span', 'wx-ic'), mkEl('span', 'wx-temp'));
      const side = mkEl('div', 'wx-side');
      side.append(mkEl('div', 'wx-desc'), mkEl('div', 'wx-city'));
      main.append(side);
      body.append(main, mkEl('div', 'wx-meta'), mkEl('div', 'wx-hrs'));
      const set = mkEl('button', 'wx-set', 'Set city');
      set.addEventListener('click', () => weatherModal(wd));
      el.append(body, set);
      paintWeather(el, wd);
      if (wd.data.city && (!wd.data.cache || Date.now() - wd.data.cache.ts > 15 * 60 * 1000 || wd.data.cache.unit !== wd.data.unit || !wd.data.cache.hrs)) loadWeather(el, wd);
      return () => [
        { label: 'Change city…', run: () => weatherModal(wd) },
        { label: wd.data.unit === 'c' ? 'Show °F / mph' : 'Show °C / km/h', run: () => { wd.data.unit = wd.data.unit === 'c' ? 'f' : 'c'; saveWidgets(); paintWeather(el, wd); loadWeather(el, wd); } },
        { label: 'Refresh', run: () => loadWeather(el, wd) }
      ];
    },
    nowplaying(el, wd) {
      if (!['auto', 'player', 'music'].includes(wd.data.source)) wd.data.source = 'auto';
      el.innerHTML = `<div class="np-top">
          <div class="np-art"><svg viewBox="0 0 24 24"><path d="M12 3v10.600A4 4 0 1 0 14 17V7h4V3z"/></svg></div>
          <div class="np-meta"><button class="np-src"></button><div class="np-title"></div><div class="np-artist"></div></div>
          <div class="np-ctl"><button class="np-pp"></button><button class="np-next" title="Next"><svg viewBox="0 0 24 24"><path d="M6 5v14l9.500-7zM16.500 5H19v14h-2.500z"/></svg></button></div>
        </div>
        <div class="np-bar"><i></i></div>
        <div class="np-times"><span class="np-cur"></span><span class="np-dur"></span></div>
        <div class="np-open"><button data-k="player">Open Player</button><button data-k="music">Open Spotify</button></div>`;
      const q = (c) => el.querySelector(c);
      el._r = { art: q('.np-art'), src: q('.np-src'), title: q('.np-title'), artist: q('.np-artist'), pp: q('.np-pp'), fill: q('.np-bar i'), cur: q('.np-cur'), dur: q('.np-dur') };
      el._art = undefined; el._playing = undefined;
      q('.np-src').addEventListener('click', () => { if (el._key) openApp(el._key === 'music' ? 'music' : 'player'); });
      q('.np-pp').addEventListener('click', () => npControl(el._key, 'toggle'));
      q('.np-next').addEventListener('click', () => npControl(el._key, 'next'));
      el.querySelectorAll('.np-open button').forEach((b) => b.addEventListener('click', () => openApp(b.dataset.k === 'music' ? 'music' : 'player')));
      paintNP(el, wd);
      return () => [['auto', 'Show whatever is playing'], ['player', 'Only the Player app'], ['music', 'Only Spotify']].map(([k, n]) => ({ label: (wd.data.source === k ? '✓  ' : '      ') + n, run: () => { wd.data.source = k; saveWidgets(); paintNP(el, wd); } }));
    },
    note(el, wd) {
      const ta = mkEl('textarea', 'nt-text');
      ta.placeholder = 'Write something…';
      ta.spellcheck = false;
      ta.value = wd.data.text || '';
      el.append(mkEl('div', 'nt-bar'), ta);
      const paint = () => { el.style.background = (NOTE_COLORS.find((c) => c[0] === wd.data.color) || NOTE_COLORS[0])[1]; };
      paint();
      let t = null;
      ta.addEventListener('input', () => { wd.data.text = ta.value; clearTimeout(t); t = setTimeout(saveWidgets, 400); });
      ta.addEventListener('blur', () => { clearTimeout(t); if (wd.data.text !== ta.value) wd.data.text = ta.value; saveWidgets(); });
      return () => NOTE_COLORS.map(([n]) => ({ label: 'Color: ' + n[0].toUpperCase() + n.slice(1), run: () => { wd.data.color = n; saveWidgets(); paint(); } }));
    },
    todo(el, wd) {
      if (!Array.isArray(wd.data.items)) wd.data.items = [];
      const head = mkEl('div', 'td-h'), title = mkEl('b'), count = mkEl('span');
      head.append(title, count);
      const prog = mkEl('div', 'td-prog'), fill = mkEl('i');
      prog.appendChild(fill);
      const list = mkEl('div', 'td-list');
      const add = mkEl('input', 'td-add');
      add.placeholder = 'Add a task and press Enter';
      add.maxLength = 200;
      add.spellcheck = false;
      el.append(head, prog, list, add);
      const paint = () => {
        const items = wd.data.items, done = items.filter((i) => i.d).length;
        title.textContent = wd.data.title || 'To-do';
        count.textContent = items.length ? `${done}/${items.length}` : '';
        fill.style.width = (items.length ? Math.round(done / items.length * 100) : 0) + '%';
        list.textContent = '';
        if (!items.length) list.appendChild(mkEl('div', 'td-empty', 'Nothing to do'));
        items.forEach((it) => {
          const row = mkEl('label', 'td-row' + (it.d ? ' done' : ''));
          const cb = mkEl('input'); cb.type = 'checkbox'; cb.checked = !!it.d;
          const x = mkEl('button', 'td-x', '×'); x.title = 'Delete';
          cb.addEventListener('change', () => { it.d = cb.checked; saveWidgets(); paint(); });
          x.addEventListener('click', (e) => { e.preventDefault(); wd.data.items.splice(wd.data.items.indexOf(it), 1); saveWidgets(); paint(); });
          row.append(cb, mkEl('span', 'td-t', it.t), x);
          list.appendChild(row);
        });
      };
      add.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const t = add.value.trim();
        if (!t) return;
        if (wd.data.items.length >= 100) { toast('This list is full'); return; }
        wd.data.items.push({ t, d: false });
        add.value = '';
        saveWidgets(); paint();
        list.scrollTop = list.scrollHeight;
      });
      paint();
      return () => [
        { label: 'Rename list…', run: () => askText('Rename list', wd.data.title || 'To-do', (v) => { wd.data.title = v || 'To-do'; saveWidgets(); paint(); }) },
        { label: 'Clear completed', run: () => { wd.data.items = wd.data.items.filter((i) => !i.d); saveWidgets(); paint(); } }
      ];
    }
  };

  function buildWidget(wd) {
    const el = mkEl('div', 'widget w-' + wd.type);
    el.dataset.id = wd.id;
    el._wd = wd;
    wd.data = wd.data && typeof wd.data === 'object' ? wd.data : {};
    if (wd.w) el.style.width = wd.w + 'px';
    if (wd.h) el.style.height = wd.h + 'px';
    const extra = BUILD[wd.type](el, wd);
    const cl = mkEl('button', 'wclose', '×');
    cl.title = 'Remove widget';
    cl.addEventListener('click', () => removeWidget(wd.id));
    el.appendChild(cl);
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      hideDesk(); hidePeek();
      showMenu(e.clientX, e.clientY, [...extra(), { label: 'Remove widget', run: () => removeWidget(wd.id) }], false);
    });
    el.addEventListener('mousedown', (e) => {
      el.style.zIndex = ++wz;
      if (e.button !== 0 || e.target.closest('input, textarea, button, .td-row')) return;
      const r = el.getBoundingClientRect();
      if ((wd.type === 'note' || wd.type === 'todo') && e.clientX > r.right - 18 && e.clientY > r.bottom - 18) return; // native resize grip
      e.preventDefault();
      const ox = e.clientX - el.offsetLeft, oy = e.clientY - el.offsetTop;
      let moved = false;
      document.body.classList.add('dragging');
      const move = (ev) => {
        const A = workArea();
        if (!moved && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) < 3) return;
        moved = true; el.classList.add('moving');
        el.style.left = clamp(ev.clientX - ox, A.x, A.x + A.w - el.offsetWidth) + 'px';
        el.style.top = clamp(ev.clientY - oy, A.y, A.y + A.h - el.offsetHeight) + 'px';
      };
      const up = () => {
        document.body.classList.remove('dragging'); el.classList.remove('moving');
        removeEventListener('mousemove', move); removeEventListener('mouseup', up);
        if (moved) { wd.x = el.offsetLeft; wd.y = el.offsetTop; saveWidgets(); }
      };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    });
    if ((wd.type === 'note' || wd.type === 'todo') && typeof ResizeObserver !== 'undefined') {
      let first = true, t = null;
      new ResizeObserver(() => {
        if (first) { first = false; return; }
        if (!el.isConnected) return;
        clearTimeout(t);
        t = setTimeout(() => { if (!el.isConnected) return; wd.w = el.offsetWidth; wd.h = el.offsetHeight; saveWidgets(); }, 300);
      }).observe(el);
    }
    return el;
  }
  let wtick = 0;
  setInterval(() => {
    wlayer.querySelectorAll('.w-clock').forEach((el) => paintClock(el, el._wd));
    npRefresh();
    if (++wtick % 60 === 0) wlayer.querySelectorAll('.w-weather').forEach((el) => { const c = el._wd.data.cache; if (el._wd.data.city && (!c || Date.now() - c.ts > 15 * 60 * 1000)) loadWeather(el, el._wd); });
  }, 1000);
  addEventListener('resize', () => wlayer.querySelectorAll('.widget').forEach((el) => fitWidget(el, el._wd)));

  /* ----- arrange windows ----- */
  const visWins = () => Object.values(wins).filter((w) => !w.min).sort((a, b) => (+a.el.style.zIndex || 0) - (+b.el.style.zIndex || 0));
  function arrange(mode) {
    const list = visWins(), n = list.length;
    if (!n) { toast('No open windows to arrange'); return; }
    if (mode === 'cascade') {
      const A = workArea();
      list.forEach((w, i) => {
        const el = w.el, wasMax = el.classList.contains('maxed');
        const size = w.snapped && w.prev ? w.prev : wasMax ? { width: 900, height: 560 } : { width: el.offsetWidth, height: el.offsetHeight };
        const W = Math.min(size.width, A.w * .8), H = Math.min(size.height, A.h * .8);
        const step = 34, maxSteps = Math.max(1, Math.floor(Math.min(A.w - W, A.h - H) / step));
        const k = i % (maxSteps + 1);
        el.classList.remove('maxed');
        w.snapped = false;
        if (animOn()) { el.style.transition = 'left .2s, top .2s, width .2s, height .2s'; setTimeout(() => { el.style.transition = ''; }, 230); }
        el.style.width = W + 'px'; el.style.height = H + 'px';
        el.style.left = (A.x + 14 + k * step) + 'px'; el.style.top = (A.y + 10 + k * step) + 'px';
        focusWin(w);
      });
      return;
    }
    let frames = [];
    if (mode === 'cols') for (let i = 0; i < n; i++) frames.push([i / n, 0, 1 / n, 1]);
    else if (mode === 'rows') for (let i = 0; i < n; i++) frames.push([0, i / n, 1, 1 / n]);
    else {
      const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
      for (let r = 0; r < rows; r++) {
        const inRow = r < rows - 1 ? cols : n - cols * (rows - 1);
        for (let c = 0; c < inRow; c++) frames.push([c / inRow, r / rows, 1 / inRow, 1 / rows]);
      }
    }
    list.forEach((w, i) => snapWin(w, frames[i]));
  }
  function toggleDesktop() {
    const list = Object.values(wins).filter((w) => !w.noMin);
    const anyVisible = list.some((w) => !w.min);
    list.forEach((w) => (anyVisible ? minimize(w) : restore(w)));
  }

  /* ----- wallpaper helpers ----- */
  function applyCustomBg(url) {
    const before = S.customBg;
    S.customBg = url;
    try { localStorage.setItem('galaxy.settings', JSON.stringify(S)); } catch (e) { S.customBg = before; toast('That image is too large to save as a wallpaper'); return; }
    applySettings();
  }
  function pickWallpaperFile() {
    const fi = document.createElement('input');
    fi.type = 'file'; fi.accept = 'image/*';
    fi.addEventListener('change', () => {
      const f = fi.files && fi.files[0];
      if (!f) return;
      const u = URL.createObjectURL(f), im = new Image();
      im.onload = () => {
        const sc = Math.min(1, 1920 / im.naturalWidth), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        applyCustomBg(c.toDataURL('image/jpeg', .85));
      };
      im.onerror = () => { URL.revokeObjectURL(u); toast('Could not read that image'); };
      im.src = u;
    });
    fi.click();
  }
  function wallLinkModal() {
    const box = openModal(`<h2 class="mt">Wallpaper from a link</h2><input class="mfield" id="wlIn" placeholder="https://example.com/wallpaper.jpg" spellcheck="false" style="width:100%"><div class="mbtns"><button class="mbtn" data-a="x">Cancel</button><button class="mbtn pri" data-a="ok">Use image</button></div>`);
    const inp = box.querySelector('#wlIn');
    inp.focus();
    const go = () => { const v = inp.value.trim(); if (!/^https?:\/\//i.test(v)) { toast('Enter an image link starting with https://'); return; } closeModal(); applyCustomBg(v); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    box.querySelector('[data-a=ok]').addEventListener('click', go);
    box.querySelector('[data-a=x]').addEventListener('click', closeModal);
  }

  /* ----- the desktop menu (supports sub menus) ----- */
  const dmenu = mkEl('div');
  dmenu.id = 'dctx';
  document.body.appendChild(dmenu);
  function hideDesk() { dmenu.style.display = 'none'; dmenu.textContent = ''; }
  function placeSub(sub) {
    sub.style.display = 'block'; sub.style.left = 'calc(100% - 2px)'; sub.style.right = 'auto'; sub.style.top = '-6px';
    const r = sub.getBoundingClientRect();
    if (r.right > innerWidth - 4) { sub.style.left = 'auto'; sub.style.right = 'calc(100% - 2px)'; }
    if (r.bottom > innerHeight - 4) sub.style.top = (-6 - (r.bottom - innerHeight + 8)) + 'px';
  }
  function buildPanel(items, panel) {
    items.forEach((it) => {
      if (it.sep) { panel.appendChild(mkEl('div', 'dsep')); return; }
      const row = mkEl('div', 'drow' + (it.disabled ? ' off' : ''));
      row.appendChild(mkEl('span', 'dl', it.label));
      if (it.sub || it.custom) {
        row.appendChild(mkEl('span', 'arr', '›'));
        const sub = mkEl('div', 'dsub');
        if (it.sub) buildPanel(it.sub, sub); else it.custom(sub);
        row.appendChild(sub);
        row.addEventListener('mouseenter', () => placeSub(sub));
        row.addEventListener('mouseleave', () => { sub.style.display = 'none'; });
      } else if (!it.disabled) row.addEventListener('click', (e) => { e.stopPropagation(); hideDesk(); it.run(); });
      panel.appendChild(row);
    });
  }
  function wallPanel(sub) {
    const g = mkEl('div', 'dwalls');
    WALLS.forEach(([k, n]) => {
      const b = mkEl('button', 'dwall' + (!S.customBg && S.bg === k ? ' on' : ''));
      b.title = n;
      b.style.backgroundImage = BGS[k];
      b.addEventListener('click', () => { hideDesk(); S.bg = k; S.customBg = ''; save(); applySettings(); });
      g.appendChild(b);
    });
    const mk = (label, fn) => { const r = mkEl('div', 'drow', label); r.addEventListener('click', (e) => { e.stopPropagation(); hideDesk(); fn(); }); return r; };
    sub.append(g, mkEl('div', 'dsep'), mk('Choose image from computer…', pickWallpaperFile), mk('Use an image link…', wallLinkModal));
  }
  function showDesk(x, y) {
    hideDesk(); hideMenu(); hidePeek();
    const wl = widgetList(), anyVisible = Object.values(wins).some((w) => !w.noMin && !w.min), hasWins = Object.keys(wins).length > 0;
    const widgetItems = Object.keys(WTYPES).map((t) => ({ label: WTYPES[t], run: () => addWidget(t, x, y) }));
    widgetItems.push({ sep: true }, { label: 'Widget style', sub: [['glass', 'Glass (matches taskbar)'], ['theme', 'Theme (solid colors)'], ['clear', 'Clear (see-through)']].map(([k, n]) => ({ label: (S.widgetStyle === k || (!S.widgetStyle && k === 'glass') ? '✓  ' : '      ') + n, run: () => { S.widgetStyle = k; save(); renderWidgets(); } })) });
    if (wl.length) widgetItems.push({ sep: true }, { label: S.widgetsHidden ? 'Show widgets' : 'Hide widgets', run: () => { S.widgetsHidden = !S.widgetsHidden; saveWidgets(); renderWidgets(true); } }, { label: 'Remove all widgets', run: () => { S.widgets = []; saveWidgets(); renderWidgets(true); toast('Widgets removed'); } });
    buildPanel([
      { label: 'Change wallpaper', custom: wallPanel },
      { label: (S.dynTheme ? '✓  ' : '      ') + 'Dynamic theme (accent from wallpaper)', run: () => { S.dynTheme = !S.dynTheme; save(); applySettings(); toast(S.dynTheme ? 'Dynamic theme on' : 'Dynamic theme off'); } },
      { label: 'Add an app…', run: () => showAddApp() },
      { label: 'Build a custom app…', run: () => showAppBuilder() },
      { label: 'Display & night light…', run: openDisplay },
      { label: 'Dev Console', run: () => openApp('devconsole') },
      { label: 'Arrange windows', sub: [
        { label: 'Tile windows (grid)', run: () => arrange('grid') },
        { label: 'Side by side', run: () => arrange('cols') },
        { label: 'Stacked', run: () => arrange('rows') },
        { label: 'Cascade', run: () => arrange('cascade') },
        { sep: true },
        { label: anyVisible || !hasWins ? 'Show desktop' : 'Restore windows', disabled: !hasWins, run: toggleDesktop }
      ] },
      { label: 'Widgets', sub: widgetItems },
      { sep: true },
      { label: 'Settings', run: () => openApp('settings') },
      { label: 'Restart…', run: () => powerOff('restart') },
      { label: 'Shut down…', run: () => powerOff('shutdown') }
    ], dmenu);
    dmenu.style.display = 'block';
    const r = dmenu.getBoundingClientRect();
    dmenu.style.left = clamp(x, 4, innerWidth - r.width - 4) + 'px';
    dmenu.style.top = clamp(y, 30, innerHeight - r.height - 4) + 'px';
  }
  document.addEventListener('contextmenu', (e) => {
    if (modalEl || e.target.closest('.window, .nav, .topNav, .widget, #fpop, #peek, #snapMenu, #ctx, #dctx, #toast')) return;
    e.preventDefault();
    showDesk(e.clientX, e.clientY);
  });
  addEventListener('mousedown', (e) => { if (!e.target.closest('#dctx')) hideDesk(); }, true);
  addEventListener('blur', hideDesk);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') hideDesk(); });

  // "Galaxy OS" in the top bar always opens the Apps (start menu) window
  $('.topNavText').addEventListener('click', () => openApp('apps'));

  $('#showDesktop').addEventListener('click', () => {
    const list = Object.values(wins).filter((w) => !w.noMin);
    const anyVisible = list.some((w) => !w.min);
    list.forEach((w) => (anyVisible ? minimize(w) : restore(w)));
  });

  /* ---------------- display: brightness + night light ---------------- */
  const NIGHT_DEF = { mode: 'off', from: '21:00', to: '07:00', warmth: 55, dim: 10 };
  const nightCfg = () => Object.assign({}, NIGHT_DEF, S.night && typeof S.night === 'object' ? S.night : {});
  const warmEl = mkEl('div'), dimEl = mkEl('div');
  warmEl.id = 'warmLayer'; dimEl.id = 'dimLayer';
  document.body.append(warmEl, dimEl);
  const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]) : 0; };
  function nightActive() {
    const N = nightCfg();
    if (N.mode === 'on') return true;
    if (N.mode !== 'schedule') return false;
    const f = toMin(N.from), t = toMin(N.to), d = new Date(), n = d.getHours() * 60 + d.getMinutes();
    if (f === t) return false;
    return f < t ? (n >= f && n < t) : (n >= f || n < t); // an overnight range such as 21:00 - 07:00 wraps past midnight
  }
  let nightWas = null, dispRaf = 0;
  function paintDisplay(announce) {
    const N = nightCfg();
    const b = clamp(+S.brightness || 100, 20, 100);
    const on = nightActive();
    const warm = on ? clamp(+N.warmth, 0, 100) / 100 : 0;
    const extra = on ? clamp(+N.dim, 0, 40) / 100 : 0;
    const base = (100 - b) / 100 * 0.8;
    dimEl.style.opacity = (1 - (1 - base) * (1 - extra)).toFixed(3);
    warmEl.style.opacity = (warm * 0.36).toFixed(3);
    warmEl.style.background = `rgb(255, ${Math.round(150 - warm * 55)}, ${Math.round(55 - warm * 35)})`;
    if (announce && nightWas !== null && on !== nightWas) toast(on ? 'Night light on' : 'Night light off');
    nightWas = on;
    if (dpop.style.display === 'block') syncDisp();
  }
  function commitDisplay() { save(); paintDisplay(true); cancelAnimationFrame(dispRaf); dispRaf = requestAnimationFrame(broadcast); }

  const dpop = mkEl('div');
  dpop.id = 'dpop';
  dpop.innerHTML = `
    <div class="dp-h">Display</div>
    <label class="dp-l"><span>Brightness</span><b id="dpBv"></b></label>
    <input type="range" id="dpB" min="20" max="100" step="1">
    <div class="dp-h" style="margin-top:16px">Night light</div>
    <div class="dp-seg" id="dpMode"><button data-m="off">Off</button><button data-m="on">On</button><button data-m="schedule">Schedule</button></div>
    <div class="dp-row" id="dpSched"><label>From <input type="time" id="dpFrom"></label><label>To <input type="time" id="dpTo"></label></div>
    <label class="dp-l"><span>Warmth</span><b id="dpWv"></b></label>
    <input type="range" id="dpW" min="0" max="100" step="1">
    <label class="dp-l"><span>Extra dimming at night</span><b id="dpDv"></b></label>
    <input type="range" id="dpD" min="0" max="40" step="1">
    <div class="dp-note" id="dpState"></div>`;
  document.body.appendChild(dpop);
  const dq = (s) => dpop.querySelector(s);
  function syncDisp() {
    const N = nightCfg(), B = clamp(+S.brightness || 100, 20, 100);
    const setV = (e, v) => { if (document.activeElement !== e) e.value = v; };
    setV(dq('#dpB'), B); setV(dq('#dpW'), N.warmth); setV(dq('#dpD'), N.dim); setV(dq('#dpFrom'), N.from); setV(dq('#dpTo'), N.to);
    dq('#dpBv').textContent = B + '%'; dq('#dpWv').textContent = N.warmth + '%'; dq('#dpDv').textContent = N.dim + '%';
    dpop.querySelectorAll('#dpMode button').forEach((b) => b.classList.toggle('on', b.dataset.m === N.mode));
    dq('#dpSched').classList.toggle('off', N.mode !== 'schedule');
    dq('#dpState').textContent = nightActive() ? 'Night light is active right now.' : N.mode === 'schedule' ? `Night light turns on at ${N.from} and off at ${N.to}.` : '';
  }
  const setNight = (p) => { S.night = Object.assign(nightCfg(), p); commitDisplay(); };
  dq('#dpB').addEventListener('input', (e) => { S.brightness = +e.target.value; commitDisplay(); });
  dq('#dpMode').addEventListener('click', (e) => { if (e.target.dataset.m) setNight({ mode: e.target.dataset.m }); });
  dq('#dpFrom').addEventListener('change', (e) => setNight({ from: e.target.value || NIGHT_DEF.from }));
  dq('#dpTo').addEventListener('change', (e) => setNight({ to: e.target.value || NIGHT_DEF.to }));
  dq('#dpW').addEventListener('input', (e) => setNight({ warmth: +e.target.value }));
  dq('#dpD').addEventListener('input', (e) => setNight({ dim: +e.target.value }));
  function closeDisplay() { dpop.style.display = 'none'; }
  function openDisplay() {
    if (dpop.style.display === 'block') { closeDisplay(); return; }
    hideDesk(); hideMenu(); hidePeek(); closeProfile();
    dpop.style.display = 'block';
    syncDisp();
  }
  $('#dispBtn').addEventListener('click', (e) => { e.stopPropagation(); openDisplay(); });
  addEventListener('mousedown', (e) => { if (!e.target.closest('#dpop, #dispBtn')) closeDisplay(); }, true);
  addEventListener('blur', closeDisplay);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDisplay(); });
  setInterval(() => paintDisplay(true), 20000); // the night light schedule is checked every 20 seconds


  /* ---------------- profile: name, bio, picture, banner, status ---------------- */
  const PSTAT = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' };
  const BANNER_DEF = { mode: 'theme', color: '#8b5cdb', image: '' };
  const IDLE_CHOICES = [0, 2, 5, 10, 15, 30];
  const profCfg = () => {
    const sp = S.profile && typeof S.profile === 'object' ? S.profile : {};
    const p = Object.assign({ name: 'Galaxy User', bio: '', avatar: '', status: 'online', idleMin: 5 }, sp);
    p.banner = Object.assign({}, BANNER_DEF, sp.banner && typeof sp.banner === 'object' ? sp.banner : {});
    if (!PSTAT[p.status]) p.status = 'online';
    p.idleMin = IDLE_CHOICES.includes(+p.idleMin) ? +p.idleMin : 5;
    return p;
  };
  let autoIdle = false; // true while you are away: an Online status then shows as Idle
  const effStatus = (p) => (autoIdle && p.status === 'online' ? 'idle' : p.status);
  const ppop = mkEl('div');
  ppop.id = 'ppop';
  ppop.innerHTML = `
    <div class="pp-banner" id="ppBan"></div>
    <div class="pp-avwrap"><span class="pAv pp-av" id="ppAv"></span><i class="pDot pp-dot" id="ppDot"></i></div>
    <div class="pp-body">
      <div id="ppView">
        <div class="pp-name" id="ppName"></div>
        <div class="pp-state" id="ppState"></div>
        <div class="pp-sec">About me</div>
        <div class="pp-bio" id="ppBio"></div>
        <div class="pp-sec">Status</div>
        <div class="dp-seg pp-seg" id="ppSeg">
          <button data-s="online"><i class="pDot s-online"></i>Online</button>
          <button data-s="idle"><i class="pDot s-idle"></i>Idle</button>
          <button data-s="dnd"><i class="pDot s-dnd"></i>Do Not Disturb</button>
          <button data-s="offline"><i class="pDot s-offline"></i>Offline</button>
        </div>
        <div class="pp-hint" id="ppDndNote" style="display:none;margin:-4px 0 12px">Battery alerts are silenced while you are on Do Not Disturb.</div>
        <button class="pp-btn" id="ppEdit">Edit profile</button>
      </div>
      <div id="ppEditBox" style="display:none">
        <div class="pp-sec" style="margin-top:0">Profile picture</div>
        <div class="pp-picrow">
          <span class="pAv pp-av-s" id="ppAvE"></span>
          <button class="pp-btn sm" id="ppUpload">Upload</button>
          <button class="pp-btn sm ghost" id="ppRemove">Remove</button>
          <input type="file" id="ppFile" accept="image/*" hidden>
        </div>
        <div class="pp-sec">Banner</div>
        <div class="dp-seg pp-seg3" id="ppBanSeg"><button data-b="theme">Theme</button><button data-b="color">Color</button><button data-b="image">Image</button></div>
        <div class="pp-hint" id="ppBanTheme">Follows your current theme and accent color.</div>
        <div class="pp-banopt" id="ppBanColor"><input type="color" id="ppBanCol"><span class="pp-hint">Pick any banner color</span></div>
        <div class="pp-banopt" id="ppBanImg"><button class="pp-btn sm" id="ppBanUp">Upload banner</button><button class="pp-btn sm ghost" id="ppBanRm">Remove</button><input type="file" id="ppBanFile" accept="image/*" hidden></div>
        <div class="pp-sec">Display name</div>
        <input class="pp-in" id="ppNameIn" maxlength="32" placeholder="Your name">
        <div class="pp-sec">About me <span class="pp-cnt" id="ppCnt"></span></div>
        <textarea class="pp-in" id="ppBioIn" maxlength="190" rows="3" placeholder="Tell people about yourself"></textarea>
        <div class="pp-sec">Auto idle</div>
        <select class="pp-in" id="ppIdle">
          <option value="0">Off</option><option value="2">After 2 minutes</option><option value="5">After 5 minutes</option>
          <option value="10">After 10 minutes</option><option value="15">After 15 minutes</option><option value="30">After 30 minutes</option>
        </select>
        <div class="pp-hint" style="margin-top:6px">Online switches to Idle when you step away. Do Not Disturb and Offline stay as you set them.</div>
        <div class="pp-actions"><button class="pp-btn ghost" id="ppCancel">Cancel</button><button class="pp-btn" id="ppSave">Save</button></div>
      </div>
    </div>`;
  document.body.appendChild(ppop);
  const pq = (s) => ppop.querySelector(s);
  let pDraftAv = '', pDraftBan = null, pEditing = false;
  function paintAv(el, p, avatar) {
    const url = avatar !== undefined ? avatar : p.avatar;
    el.textContent = '';
    el.style.backgroundImage = url ? `url("${url}")` : '';
    el.classList.toggle('has', !!url);
    if (!url) el.textContent = (p.name.trim()[0] || '?').toUpperCase();
  }
  function paintDot(el, st) { el.className = el.className.replace(/\bs-(online|idle|dnd|offline)\b/g, '').trim() + ' s-' + st; }
  function paintBanner(b) {
    const el = pq('#ppBan');
    el.style.background = '';
    if (b.mode === 'image' && b.image) el.style.background = `center / cover no-repeat url("${b.image}")`;
    else if (b.mode === 'color') el.style.background = b.color; // theme mode keeps the CSS gradient made from the theme colors
  }
  function paintProfile() {
    const p = profCfg(), eff = effStatus(p);
    paintAv($('#profBtnAv'), p); paintDot($('#profBtnDot'), eff);
    $('#profBtn').title = `${p.name} - ${PSTAT[eff]}`;
    paintAv(pq('#ppAv'), p); paintDot(pq('#ppDot'), eff);
    pq('#ppName').textContent = p.name;
    pq('#ppState').textContent = eff !== p.status ? 'Idle (away)' : PSTAT[eff];
    const bio = pq('#ppBio');
    bio.textContent = p.bio || 'No bio yet. Click Edit profile to add one.';
    bio.classList.toggle('empty', !p.bio);
    pq('#ppSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.s === p.status));
    pq('#ppDndNote').style.display = p.status === 'dnd' ? '' : 'none';
    if (!pEditing) paintBanner(p.banner);
  }
  function paintBanSeg() {
    const m = pDraftBan.mode;
    pq('#ppBanSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.b === m));
    pq('#ppBanTheme').style.display = m === 'theme' ? '' : 'none';
    pq('#ppBanColor').style.display = m === 'color' ? '' : 'none';
    pq('#ppBanImg').style.display = m === 'image' ? '' : 'none';
    paintBanner(pDraftBan);
  }
  function setPEdit(on) {
    pEditing = on;
    pq('#ppView').style.display = on ? 'none' : '';
    pq('#ppEditBox').style.display = on ? '' : 'none';
    if (on) {
      const p = profCfg();
      pDraftAv = p.avatar; pDraftBan = Object.assign({}, p.banner);
      pq('#ppNameIn').value = p.name; pq('#ppBioIn').value = p.bio;
      pq('#ppBanCol').value = /^#[0-9a-f]{6}$/i.test(pDraftBan.color) ? pDraftBan.color : BANNER_DEF.color;
      pq('#ppIdle').value = String(p.idleMin);
      paintAv(pq('#ppAvE'), p, pDraftAv); countBio(); paintBanSeg();
      pq('#ppNameIn').focus();
    } else paintProfile();
  }
  function countBio() { pq('#ppCnt').textContent = `${pq('#ppBioIn').value.length}/190`; }
  function closeProfile() { ppop.style.display = 'none'; if (pEditing) { pEditing = false; paintProfile(); } }
  function openProfile() {
    if (ppop.style.display === 'block') { closeProfile(); return; }
    hideDesk(); hideMenu(); hidePeek(); closeDisplay();
    setPEdit(false); paintProfile();
    ppop.style.display = 'block';
  }
  function setStatus(st) {
    const p = profCfg(); delete p.restore; p.status = st;
    S.profile = p; save(); paintProfile();
  }
  function saveProfile() {
    const name = pq('#ppNameIn').value.trim().slice(0, 32) || 'Galaxy User';
    const ban = Object.assign({}, pDraftBan);
    if (ban.mode === 'image' && !ban.image) ban.mode = 'theme';
    const idle = IDLE_CHOICES.includes(+pq('#ppIdle').value) ? +pq('#ppIdle').value : 5;
    const next = Object.assign(profCfg(), { name, bio: pq('#ppBioIn').value.trim().slice(0, 190), avatar: pDraftAv, banner: ban, idleMin: idle });
    const before = S.profile;
    S.profile = next;
    try { localStorage.setItem('galaxy.settings', JSON.stringify(S)); } catch (e) { S.profile = before; toast('Not enough storage to save that. Try a smaller image.'); return; }
    pEditing = false; setPEdit(false); idleTick(); toast('Profile saved');
  }
  // crop the chosen picture to w x h (centered, cover) so it stays small in storage
  function readImage(file, w, h, cb) {
    if (!file || !/^image\//.test(file.type)) { toast('Pick an image file'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k;
        c.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => toast('Could not read that image');
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  pq('#ppSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setStatus(b.dataset.s); });
  pq('#ppEdit').addEventListener('click', () => setPEdit(true));
  pq('#ppCancel').addEventListener('click', () => setPEdit(false));
  pq('#ppSave').addEventListener('click', saveProfile);
  pq('#ppUpload').addEventListener('click', () => pq('#ppFile').click());
  pq('#ppFile').addEventListener('change', (e) => { readImage(e.target.files[0], 128, 128, (u) => { pDraftAv = u; paintAv(pq('#ppAvE'), { name: pq('#ppNameIn').value || 'G' }, u); }); e.target.value = ''; });
  pq('#ppRemove').addEventListener('click', () => { pDraftAv = ''; paintAv(pq('#ppAvE'), { name: pq('#ppNameIn').value || 'G' }, ''); });
  pq('#ppBanSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && pDraftBan) { pDraftBan.mode = b.dataset.b; paintBanSeg(); } });
  pq('#ppBanCol').addEventListener('input', (e) => { pDraftBan.color = e.target.value; paintBanner(pDraftBan); });
  pq('#ppBanUp').addEventListener('click', () => pq('#ppBanFile').click());
  pq('#ppBanFile').addEventListener('change', (e) => { readImage(e.target.files[0], 720, 168, (u) => { pDraftBan.image = u; pDraftBan.mode = 'image'; paintBanSeg(); }); e.target.value = ''; });
  pq('#ppBanRm').addEventListener('click', () => { pDraftBan.image = ''; paintBanSeg(); });
  pq('#ppBioIn').addEventListener('input', countBio);
  pq('#ppNameIn').addEventListener('input', () => { if (!pDraftAv) paintAv(pq('#ppAvE'), { name: pq('#ppNameIn').value || 'G' }, ''); });
  pq('#ppNameIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveProfile(); });
  $('#profBtn').addEventListener('click', (e) => { e.stopPropagation(); openProfile(); });
  addEventListener('mousedown', (e) => { if (!e.target.closest('#ppop, #profBtn')) closeProfile(); }, true);
  addEventListener('blur', closeProfile);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProfile(); });

  // auto idle: the main process reports how long the whole PC has been untouched (also counts typing/mouse inside web apps);
  // without it (plain browser) only input on the desktop itself is counted
  let lastAct = Date.now();
  function setAuto(v) { if (v === autoIdle) return; autoIdle = v; paintProfile(); }
  ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, () => { lastAct = Date.now(); if (autoIdle) setAuto(false); }, { capture: true, passive: true }));
  async function idleTick() {
    const lim = profCfg().idleMin * 60;
    if (!lim) { setAuto(false); return; }
    let idle = (Date.now() - lastAct) / 1000;
    try { if (window.galaxy && window.galaxy.idleTime) { const s = await window.galaxy.idleTime(); if (typeof s === 'number' && s >= 0) idle = s; } } catch (e) {}
    setAuto(idle >= lim);
  }
  setInterval(idleTick, 10000);

  // shutting down or restarting from the power menu sets you Offline; the next start puts back what you had before
  function profileOffline() {
    const p = profCfg();
    autoIdle = false;
    if (p.status !== 'offline') { p.restore = p.status; p.status = 'offline'; S.profile = p; save(); }
    paintProfile();
  }
  function profileBack() {
    const p = profCfg();
    if (!p.restore) return;
    p.status = PSTAT[p.restore] && p.restore !== 'offline' ? p.restore : 'online';
    delete p.restore;
    S.profile = p; save(); paintProfile();
  }
  profileBack();
  paintProfile();

  /* ---------------- battery: widget + low battery toast ---------------- */
  const BAT = { ok: false, level: 1, charging: true, ct: 0, dt: Infinity, warned: 0 };
  const fmtDur = (s) => { if (!isFinite(s) || s <= 0) return ''; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`; };
  const batLimit = () => clamp(+S.batteryLevel || 20, 5, 50);
  function batAlert(pct, crit, force) { if (!force && profCfg().status === 'dnd') return; toast(crit ? `Battery critical: ${pct}%. Plug in now.` : `Battery low: ${pct}%. Plug in your charger.`, crit ? 7000 : 5000); }
  function batCheck() {
    if (!BAT.ok) return;
    const pct = Math.round(BAT.level * 100), lim = batLimit(), crit = Math.max(3, Math.round(lim / 2));
    if (BAT.charging || pct > lim + 3) { BAT.warned = 0; return; } // charging, or back above the limit (with a little margin)
    if (S.batteryToast === false) return;
    if (pct <= crit && BAT.warned < 2) { BAT.warned = 2; batAlert(pct, true); }
    else if (pct <= lim && BAT.warned < 1) { BAT.warned = 1; batAlert(pct, false); }
  }
  function paintBattery(el, wd) {
    const q = (s) => el.querySelector(s), time = wd.data.time !== false;
    if (!BAT.ok) { q('.bt-pct').textContent = '--'; q('.bt-state').textContent = 'No battery information'; q('.bt-bar i').style.width = '0'; return; }
    const pct = Math.round(BAT.level * 100), low = !BAT.charging && pct <= batLimit(), crit = !BAT.charging && pct <= Math.max(3, Math.round(batLimit() / 2));
    el.classList.toggle('charging', BAT.charging); el.classList.toggle('low', low); el.classList.toggle('crit', crit);
    q('.bt-pct').textContent = pct + '%';
    q('.bt-bar i').style.width = pct + '%';
    let st;
    if (BAT.charging) st = pct >= 100 ? 'Fully charged · plugged in' : 'Charging' + (time && isFinite(BAT.ct) && BAT.ct > 0 ? ` · ${fmtDur(BAT.ct)} to full` : '');
    else st = 'On battery' + (time && isFinite(BAT.dt) && BAT.dt > 0 ? ` · ${fmtDur(BAT.dt)} left` : '');
    q('.bt-state').textContent = st;
  }
  const batRefresh = () => wlayer.querySelectorAll('.w-battery').forEach((el) => paintBattery(el, el._wd));
  if (navigator.getBattery) {
    navigator.getBattery().then((b) => {
      const upd = () => { BAT.ok = true; BAT.level = b.level; BAT.charging = b.charging; BAT.ct = b.chargingTime; BAT.dt = b.dischargingTime; batCheck(); batRefresh(); };
      ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((ev) => b.addEventListener(ev, upd));
      upd();
    }).catch(() => {});
  }

  /* ---------------- dev console: log buffer ---------------- */
  const DEVLOG = [];
  let devSeq = 0;
  const devRate = {};
  const devFrame = () => { const w = wins.devconsole; return w ? w.body.querySelector('iframe') : null; };
  const toDev = (m) => { const f = devFrame(); if (f && f.contentWindow) { try { f.contentWindow.postMessage(m, '*'); } catch (e) {} } };
  function pushLog(appId, level, text) {
    const now = Date.now(), r = devRate[appId] || (devRate[appId] = { t: now, n: 0 });
    if (now - r.t > 3000) { r.t = now; r.n = 0; }   // at most 400 lines per app every 3 seconds, so one noisy page can't bury the rest
    r.n++;
    if (r.n > 401) return;
    if (r.n === 401) { level = 'warn'; text = 'Too many messages. Some are being skipped for a moment.'; }
    const a = APPS.find((x) => x.id === appId);
    const e = { n: ++devSeq, t: now, app: appId, name: appId === 'galaxy' ? 'Galaxy OS' : a ? a.name : String(appId).slice(0, 30), level, text: String(text).slice(0, 4000) };
    DEVLOG.push(e);
    if (DEVLOG.length > 1500) DEVLOG.splice(0, DEVLOG.length - 1500);
    toDev({ type: 'dev-log', e });
  }
  addEventListener('error', (e) => pushLog('galaxy', 'error', `${e.message || 'Error'}${e.lineno ? `  (shell.js:${e.lineno})` : ''}`));
  addEventListener('unhandledrejection', (e) => pushLog('galaxy', 'error', 'Unhandled promise rejection: ' + String((e.reason && e.reason.message) || e.reason)));

  /* ---------------- custom HTML apps (sandboxed) ---------------- */
  // This function is turned into text and runs INSIDE the sandboxed app page, so it must not use anything from the shell.
  function bootApp(ID, DATA, OFF) {
    var post = function (m) { try { m.galaxyApp = ID; parent.postMessage(m, '*'); } catch (e) {} };
    var show = function (v, d) {
      d = d || 0;
      try {
        if (typeof v === 'string') return d ? JSON.stringify(v) : v;
        if (v === undefined) return 'undefined';
        if (v === null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
        if (typeof v === 'function') return 'ƒ ' + (v.name || '(anonymous)') + '()';
        if (typeof v === 'symbol') return v.toString();
        if (v instanceof Error) return v.stack || (v.name + ': ' + v.message);
        if (v instanceof Element) return '<' + v.tagName.toLowerCase() + (v.id ? '#' + v.id : '') + (typeof v.className === 'string' && v.className.trim() ? '.' + v.className.trim().split(/\s+/).join('.') : '') + '>';
        if (d > 2) return Array.isArray(v) ? '[…]' : '{…}';
        if (Array.isArray(v)) return '[' + v.slice(0, 50).map(function (x) { return show(x, d + 1); }).join(', ') + (v.length > 50 ? ', … ' + (v.length - 50) + ' more' : '') + ']';
        var keys = Object.keys(v).slice(0, 40);
        return (v.constructor && v.constructor !== Object && v.constructor.name ? v.constructor.name + ' ' : '') + '{' + keys.map(function (k) { return k + ': ' + show(v[k], d + 1); }).join(', ') + '}';
      } catch (e) { return String(v); }
    };
    ['log', 'info', 'warn', 'error', 'debug'].forEach(function (k) {
      var orig = console[k];
      console[k] = function () {
        var a = Array.prototype.slice.call(arguments);
        post({ type: 'dev-log', level: k, text: a.map(function (x) { return show(x); }).join(' ') });
        try { return orig.apply(console, arguments); } catch (e) {}
      };
    });
    addEventListener('error', function (e) {
      var mine = !e.filename || e.filename === location.href || /^about:/.test(e.filename);
      var line = e.lineno && mine && e.lineno > OFF ? '  (your JS, line ' + (e.lineno - OFF) + ')' : '';
      post({ type: 'dev-log', level: 'error', text: (e.message || 'Script error') + line });
    });
    addEventListener('unhandledrejection', function (e) { post({ type: 'dev-log', level: 'error', text: 'Unhandled promise rejection: ' + show(e.reason) }); });
    addEventListener('load', function () { post({ type: 'dev-log', level: 'info', text: 'Page loaded' }); });
    if (window.fetch) {
      var realFetch = window.fetch;
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '', method = (init && init.method) || (input && input.method) || 'GET', t0 = Date.now();
        return realFetch.apply(this, arguments).then(function (r) {
          post({ type: 'dev-log', level: r.ok ? 'net' : 'warn', text: method + ' ' + url + '  →  ' + r.status + '  (' + (Date.now() - t0) + ' ms)' });
          return r;
        }, function (err) {
          post({ type: 'dev-log', level: 'error', text: method + ' ' + url + '  →  failed: ' + show(err) });
          throw err;
        });
      };
    }
    // localStorage works inside the sandbox: it is kept in memory here and saved by Galaxy OS per app
    var ls = {};
    if (DATA && DATA.ls && typeof DATA.ls === 'object') Object.keys(DATA.ls).forEach(function (k) { ls[k] = String(DATA.ls[k]); });
    var timer = null;
    var flush = function () { timer = null; post({ type: 'dev-store', ls: ls }); };
    var changed = function () { clearTimeout(timer); timer = setTimeout(flush, 250); };
    var makeStore = function (store, persist) {
      var has = function (k) { return Object.prototype.hasOwnProperty.call(store, k); };
      var api = {
        getItem: function (k) { k = String(k); return has(k) ? store[k] : null; },
        setItem: function (k, v) { store[String(k)] = String(v); if (persist) changed(); },
        removeItem: function (k) { delete store[String(k)]; if (persist) changed(); },
        clear: function () { Object.keys(store).forEach(function (k) { delete store[k]; }); if (persist) changed(); },
        key: function (i) { var ks = Object.keys(store); return i >= 0 && i < ks.length ? ks[i] : null; }
      };
      return new Proxy(api, {
        get: function (t, p) { if (p === 'length') return Object.keys(store).length; if (typeof p === 'symbol' || p in t) return t[p]; return has(p) ? store[p] : undefined; },
        set: function (t, p, v) { t.setItem(p, v); return true; },
        deleteProperty: function (t, p) { t.removeItem(p); return true; },
        has: function (t, p) { return p in t || has(p); },
        ownKeys: function () { return Object.keys(store); },
        getOwnPropertyDescriptor: function (t, p) { return has(p) ? { value: store[p], writable: true, enumerable: true, configurable: true } : undefined; }
      });
    };
    var lsApi = makeStore(ls, true), ssApi = makeStore({}, false);
    try { Object.defineProperty(window, 'localStorage', { value: lsApi, configurable: true }); } catch (e) {}
    try { Object.defineProperty(window, 'sessionStorage', { value: ssApi, configurable: true }); } catch (e) {}
    // commands from the Dev Console (inspector, eval, storage)
    var NODES = [], hl = null;
    var ser = function (el, d) {
      var n = { id: NODES.push(el) - 1, tag: el.tagName.toLowerCase(), attr: el.id ? '#' + el.id : '', cls: typeof el.className === 'string' ? el.className.trim() : '', kids: [] };
      var ch = el.children;
      if (d < 14) {
        for (var i = 0; i < ch.length && n.kids.length < 80; i++) if (ch[i].id !== '__gx_hl') n.kids.push(ser(ch[i], d + 1));
        if (ch.length > 80) n.more = ch.length - 80;
        if (!ch.length && el.textContent) n.text = el.textContent.trim().slice(0, 60);
      } else if (ch.length) n.more = ch.length;
      return n;
    };
    var light = function (id) {
      if (!hl) {
        hl = document.createElement('div');
        hl.id = '__gx_hl';
        hl.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;background:rgba(80,160,255,.28);outline:2px solid rgba(80,160,255,.9);display:none';
        (document.body || document.documentElement).appendChild(hl);
      }
      var el = NODES[id];
      if (!el || !el.getBoundingClientRect) { hl.style.display = 'none'; return; }
      var r = el.getBoundingClientRect();
      hl.style.left = r.left + 'px'; hl.style.top = r.top + 'px'; hl.style.width = r.width + 'px'; hl.style.height = r.height + 'px'; hl.style.display = 'block';
    };
    var info = function (id) {
      var el = NODES[id];
      if (!el) return null;
      var cs = getComputedStyle(el), r = el.getBoundingClientRect(), attrs = [], i;
      for (i = 0; i < el.attributes.length; i++) attrs.push([el.attributes[i].name, String(el.attributes[i].value).slice(0, 200)]);
      return {
        tag: el.tagName.toLowerCase(), attrs: attrs,
        box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        css: ['display', 'position', 'width', 'height', 'margin', 'padding', 'color', 'background-color', 'font-size', 'font-family', 'z-index', 'opacity', 'overflow'].map(function (p) { return [p, cs.getPropertyValue(p)]; }),
        html: el.outerHTML.slice(0, 1500)
      };
    };
    var runEval = function (m) {
      var done = function (ok, v) { post({ type: 'dev-res', req: m.req, cmd: 'eval', r: { ok: ok, out: typeof v === 'string' && ok ? JSON.stringify(v) : show(v) } }); };
      try {
        var v = (0, eval)(m.code);
        if (v && typeof v.then === 'function') v.then(function (x) { done(true, x); }, function (x) { done(false, x); });
        else done(true, v);
      } catch (err) { done(false, err); }
    };
    addEventListener('message', function (e) {
      var m = e.data;
      if (e.source !== parent || !m || !m.galaxyDev) return;
      var r = {};
      try {
        if (m.cmd === 'tree') { NODES = []; r = { tree: ser(document.documentElement, 0) }; }
        else if (m.cmd === 'info') r = { info: info(m.node) };
        else if (m.cmd === 'light') { light(m.node); return; }
        else if (m.cmd === 'storage') r = { ls: ls };
        else if (m.cmd === 'storage-del') { lsApi.removeItem(m.key); r = { ls: ls }; }
        else if (m.cmd === 'storage-clear') { lsApi.clear(); r = { ls: ls }; }
        else if (m.cmd === 'eval') { runEval(m); return; }
      } catch (err) { r = { error: String(err) }; }
      post({ type: 'dev-res', req: m.req, cmd: m.cmd, r: r });
    });
  }

  const safeJSON = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const JS_MARK = '/*__GX_JS__*/';
  // turns the HTML / CSS / JS the user pasted into one page, with the logger and storage shim in front
  function appDoc(c, id, data) {
    const html = String(c.html || ''), css = String(c.css || ''), js = String(c.js || '');
    const boot = `<script>(${bootApp.toString()})(${JSON.stringify(id)}, ${safeJSON(data || {})}, %%OFF%%);</script>`;
    const style = css ? `<style>\n${css}\n</style>` : '';
    const script = js ? `<script>${JS_MARK}\n${js}\n</script>` : '';
    let doc;
    if (/<html[\s>]/i.test(html) || /<!doctype/i.test(html)) {
      // a whole page was pasted: keep it as it is and slip our parts in
      doc = html;
      const inj = boot + style;
      if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head[^>]*>/i, (m) => m + inj);
      else if (/<html[^>]*>/i.test(doc)) doc = doc.replace(/<html[^>]*>/i, (m) => m + '<head>' + inj + '</head>');
      else doc = inj + doc;
      doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, () => script + '</body>') : doc + script;
    } else {
      const base = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{color-scheme:dark}html,body{margin:0}body{font-family:"Segoe UI",system-ui,sans-serif;color:#eee;background:#14101f}</style>';
      doc = `<!DOCTYPE html><html><head>${base}${boot}${style}</head><body>\n${html}\n${script}</body></html>`;
    }
    const off = doc.split(JS_MARK)[0].split('\n').length; // the line the user's JS starts on, so error lines can be shown relative to it
    return doc.replace('%%OFF%%', String(off));
  }
  const SANDBOX = 'allow-scripts allow-forms allow-modals allow-pointer-lock allow-downloads';
  const customFrame = (id) => { const w = wins[id]; return w ? w.body.querySelector('iframe.capp') : null; };
  function buildCustomApp(w, a) {
    const c = (S.customApps || []).find((x) => x.id === a.id);
    if (!c) return;
    const f = document.createElement('iframe');
    f.className = 'capp';
    f.setAttribute('sandbox', SANDBOX);
    f.srcdoc = appDoc(c, c.id, S.appData && S.appData[c.id]);
    w.body.appendChild(f);
    pushLog(c.id, 'info', 'Started');
  }
  function reloadCustom(id) {
    const c = (S.customApps || []).find((x) => x.id === id), f = customFrame(id);
    if (!c || !f) return;
    f.srcdoc = appDoc(c, id, S.appData && S.appData[id]);
    pushLog(id, 'info', 'Reloaded');
  }
  // messages posted by the custom app pages themselves
  let prevHook = null;
  function appMsg(e, d) {
    const id = String(d.galaxyApp);
    if (id === '__preview') { if (prevHook && prevHook.frame.isConnected && e.source === prevHook.frame.contentWindow) prevHook.cb(d); return; }
    const f = customFrame(id);
    if (!f || e.source !== f.contentWindow) return;
    if (d.type === 'dev-log') pushLog(id, ['log', 'info', 'warn', 'error', 'debug', 'net'].includes(d.level) ? d.level : 'log', d.text);
    else if (d.type === 'dev-store' && d.ls && typeof d.ls === 'object') {
      const ls = {};
      Object.keys(d.ls).slice(0, 2000).forEach((k) => { ls[k.slice(0, 300)] = String(d.ls[k]); });
      if (JSON.stringify(ls).length > 300000) { pushLog(id, 'error', 'localStorage is full (300 KB per app). The last change was not saved.'); return; }
      if (!S.appData || typeof S.appData !== 'object') S.appData = {};
      S.appData[id] = { ls };
      save();
    } else if (d.type === 'dev-res') toDev({ type: 'dev-res', app: id, req: d.req, cmd: d.cmd, r: d.r });
  }
  // requests from the Dev Console window
  const devApps = () => Object.keys(wins).map((k) => {
    const a = APPS.find((x) => x.id === k);
    return !a || k === 'devconsole' ? null : { id: k, name: a.name, kind: a.html ? 'html' : (a.url || k === 'gfn' || k === 'browser') ? 'web' : 'app' };
  }).filter(Boolean);
  function devMsg(e, d) {
    const f = devFrame();
    if (!f || e.source !== f.contentWindow) return false;
    const id = typeof d.app === 'string' ? d.app : '';
    switch (d.type) {
      case 'dev-get': e.source.postMessage({ type: 'dev-init', logs: DEVLOG.slice(-700), apps: devApps() }, '*'); break;
      case 'dev-apps': e.source.postMessage({ type: 'dev-apps', apps: devApps() }, '*'); break;
      case 'dev-clear': for (let i = DEVLOG.length - 1; i >= 0; i--) if (!id || DEVLOG[i].app === id) DEVLOG.splice(i, 1); break;
      case 'dev-cmd': {
        const cf = customFrame(id), m = d.msg && typeof d.msg === 'object' ? d.msg : {};
        if (!cf || !['tree', 'info', 'light', 'storage', 'storage-del', 'storage-clear', 'eval'].includes(m.cmd)) {
          if (m.req) e.source.postMessage({ type: 'dev-res', app: id, req: m.req, cmd: m.cmd, r: { error: 'That app is not running.' } }, '*');
          break;
        }
        cf.contentWindow.postMessage({ galaxyDev: true, cmd: m.cmd, req: +m.req || 0, node: +m.node || 0, key: String(m.key || '').slice(0, 300), code: String(m.code || '').slice(0, 20000) }, '*');
        break;
      }
      case 'dev-devtools': { const w = wins[id], wv = w && webviewOf(w); if (wv && wv.openDevTools) { try { wv.openDevTools(); } catch (err) { toast('Could not open DevTools'); } } break; }
      case 'dev-reload': {
        const w = wins[id], a = APPS.find((x) => x.id === id);
        if (!w || !a) break;
        if (a.html) reloadCustom(id); else { const wv = webviewOf(w); if (wv && wv.reload) { try { wv.reload(); } catch (err) {} } }
        break;
      }
      case 'dev-edit': if (APPS.some((a) => a.id === id && a.html)) showAppBuilder(id); break;
      default: return false;
    }
    return true;
  }

  /* ---------------- app builder: paste HTML, CSS and JS and it becomes an app ---------------- */
  const BUILD_TPL = {
    Counter: {
      name: 'Counter', emoji: '🔢',
      html: '<main>\n  <h1 id="n">0</h1>\n  <div>\n    <button id="up">+1</button>\n    <button id="rs">Reset</button>\n  </div>\n  <p>The count is saved with localStorage.</p>\n</main>',
      css: 'main { height: 100vh; display: grid; place-content: center; text-align: center; gap: 14px; }\nh1 { font-size: 80px; margin: 0; background: linear-gradient(90deg, #8b5cdb, #33bdcc); -webkit-background-clip: text; color: transparent; }\nbutton { padding: 10px 24px; margin: 0 4px; border: 0; border-radius: 10px; background: #8b5cdb; color: #fff; font-size: 15px; cursor: pointer; }\nbutton:hover { filter: brightness(1.15); }\np { margin: 0; opacity: .55; font-size: 13px; }',
      js: "let n = +(localStorage.getItem('n') || 0);\nconst out = document.getElementById('n');\nconst show = () => { out.textContent = n; localStorage.setItem('n', n); };\ndocument.getElementById('up').onclick = () => { n++; show(); console.log('count is', n); };\ndocument.getElementById('rs').onclick = () => { n = 0; show(); console.warn('count reset'); };\nshow();"
    },
    Stopwatch: {
      name: 'Stopwatch', emoji: '⏱️',
      html: '<main>\n  <div id="t">0:00.0</div>\n  <div>\n    <button id="go">Start</button>\n    <button id="rs">Reset</button>\n  </div>\n</main>',
      css: 'main { height: 100vh; display: grid; place-content: center; text-align: center; gap: 18px; }\n#t { font-size: 64px; font-weight: 200; font-variant-numeric: tabular-nums; }\nbutton { padding: 10px 24px; margin: 0 4px; border: 0; border-radius: 10px; background: #33bdcc; color: #06171a; font-weight: 700; cursor: pointer; }',
      js: "let t0 = 0, acc = 0, timer = null;\nconst out = document.getElementById('t'), go = document.getElementById('go');\nconst fmt = (ms) => Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') + '.' + Math.floor(ms / 100) % 10;\nconst tick = () => { out.textContent = fmt(acc + Date.now() - t0); };\ngo.onclick = () => {\n  if (timer) { acc += Date.now() - t0; clearInterval(timer); timer = null; go.textContent = 'Start'; return; }\n  t0 = Date.now(); timer = setInterval(tick, 100); go.textContent = 'Stop';\n};\ndocument.getElementById('rs').onclick = () => { clearInterval(timer); timer = null; acc = 0; go.textContent = 'Start'; out.textContent = fmt(0); };"
    },
    Blank: { name: '', emoji: '🧩', html: '', css: '', js: '' }
  };
  function showAppBuilder(editId) {
    const ex = editId ? (S.customApps || []).find((c) => c.id === editId && c.kind === 'html') : null;
    const start = ex || BUILD_TPL.Counter;
    const code = { html: start.html || '', css: start.css || '', js: start.js || '' };
    const box = openModal(`
      <h2 class="mt">${ex ? 'Edit app' : 'Build a custom app'}</h2>
      <div class="bld-top">
        <input class="mfield" id="bdName" placeholder="App name" spellcheck="false" maxlength="40" style="flex:1;min-width:170px">
        <input class="mfield" id="bdEmoji" placeholder="🧩" maxlength="4" title="Icon (an emoji)" style="width:64px;text-align:center;font-size:18px">
        <input class="mfield" id="bdKey" style="width:190px">
        <div class="chips" id="bdTpl"></div>
      </div>
      <div class="bld-main">
        <div class="bld-left">
          <div class="bld-tabs" id="bdTabs"><button data-t="html" class="on">HTML</button><button data-t="css">CSS</button><button data-t="js">JavaScript</button></div>
          <textarea class="bld-code" id="bdCode" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
        </div>
        <div class="bld-right">
          <div class="bld-ph"><span>Live preview</span><button class="mbtn" id="bdRun">Run</button></div>
          <iframe id="bdPrev" sandbox="${SANDBOX}"></iframe>
          <div class="bld-log" id="bdLog"></div>
        </div>
      </div>
      ${ex ? '' : '<label class="mchk"><input type="checkbox" id="bdPin" checked> Pin to the taskbar</label>'}
      <div class="mnote">Your app runs in its own sandbox. console.log and errors show up in the Dev Console (Ctrl + Shift + J), and localStorage works and is saved for this app. Quick key (optional): press it anywhere in Galaxy OS to open the app.</div>
      <div class="mbtns"><button class="mbtn" data-a="x">Cancel</button><button class="mbtn pri" data-a="ok">${ex ? 'Save' : 'Add app'}</button></div>`);
    box.style.width = 'min(1060px, 95vw)';
    modalEl.addEventListener('mousedown', (e) => { if (e.target === modalEl) e.stopImmediatePropagation(); }, true); // clicking outside must not throw away your code
    const $$ = (s) => box.querySelector(s);
    const name = $$('#bdName'), emo = $$('#bdEmoji'), ta = $$('#bdCode'), pv = $$('#bdPrev'), logEl = $$('#bdLog');
    name.value = ex ? ex.name : start.name;
    emo.value = ex ? (ex.emoji || '🧩') : start.emoji;
    let keySpec = ex && ex.key ? ex.key : null, cur = 'html', dirty = false, pt = 0;
    keyCapture($$('#bdKey'), keySpec, (k) => { keySpec = k; });
    ta.value = code.html;
    const saveTab = () => { code[cur] = ta.value; };
    $$('#bdTabs').addEventListener('click', (e) => {
      const t = e.target.dataset.t;
      if (!t) return;
      saveTab(); cur = t; ta.value = code[t];
      $$('#bdTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      ta.focus();
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') e.stopPropagation();
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.setRangeText('  ', s, en, 'end');
        ta.dispatchEvent(new Event('input'));
      }
    });
    const run = () => {
      saveTab();
      logEl.textContent = '';
      prevHook = { frame: pv, cb: (d) => {
        if (d.type !== 'dev-log') return;
        const l = mkEl('div', 'bl-' + d.level, d.text);
        logEl.appendChild(l);
        while (logEl.children.length > 60) logEl.firstChild.remove();
        logEl.scrollTop = logEl.scrollHeight;
      } };
      pv.srcdoc = appDoc(code, '__preview', {});
    };
    ta.addEventListener('input', () => { dirty = true; clearTimeout(pt); pt = setTimeout(run, 650); });
    $$('#bdRun').addEventListener('click', run);
    Object.keys(BUILD_TPL).forEach((k) => {
      const b = mkEl('button', 'chip', k);
      b.addEventListener('click', () => {
        if (dirty && !window.confirm('Replace your code with the ' + k + ' template?')) return;
        const t = BUILD_TPL[k];
        code.html = t.html; code.css = t.css; code.js = t.js; ta.value = code[cur]; dirty = false;
        if (!ex) { name.value = t.name; emo.value = t.emoji; }
        run();
      });
      $$('#bdTpl').appendChild(b);
    });
    const submit = () => {
      saveTab();
      if (code.html.length + code.css.length + code.js.length > 400000) { toast('That app is too big (400 KB max)'); return; }
      const emoji = Array.from(emo.value.trim()).slice(0, 2).join('') || '🧩';
      const entry = {
        id: ex ? ex.id : 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        kind: 'html', name: name.value.trim() || 'My app', emoji, iconUrl: emojiIcon(emoji),
        html: code.html, css: code.css, js: code.js, key: keySpec
      };
      if (!Array.isArray(S.customApps)) S.customApps = [];
      if (ex) S.customApps = S.customApps.map((c) => (c.id === ex.id ? entry : c));
      else { S.customApps.push(entry); const pin = $$('#bdPin'); if (!pin || pin.checked) S.dock.center.push(entry.id); }
      prevHook = null;
      closeModal();
      save(); applySettings();
      if (ex && wins[ex.id]) reloadCustom(ex.id);
      toast(ex ? `Saved ${entry.name}` : `Added ${entry.name}`);
      if (!ex) openApp(entry.id);
    };
    $$('[data-a=ok]').addEventListener('click', submit);
    $$('[data-a=x]').addEventListener('click', () => { prevHook = null; closeModal(); });
    run();
    name.focus(); name.select();
  }

  /* ---------------- shutdown / restart ---------------- */
  let powering = false;
  function powerOff(mode) {
    if (powering) return;
    powering = true;
    closeModal();
    profileOffline();
    const restart = mode === 'restart';
    const go = () => { if (restart) location.reload(); else if (window.galaxy.quit) window.galaxy.quit(); else { powering = false; profileBack(); } };
    if (window.GalaxyIntro) window.GalaxyIntro.play({ mode: 'out', label: restart ? 'Restarting' : 'Shutting down' }, go); else go();
  }
  function powerModal() {
    const box = openModal('<h2 class="mt">Power</h2><div class="mbtns" style="justify-content:flex-start;gap:10px"><button class="mbtn pri" data-a="off">Shut down</button><button class="mbtn" data-a="re">Restart</button><button class="mbtn" data-a="x">Cancel</button></div>');
    box.querySelector('[data-a=off]').addEventListener('click', () => powerOff('shutdown'));
    box.querySelector('[data-a=re]').addEventListener('click', () => powerOff('restart'));
    box.querySelector('[data-a=x]').addEventListener('click', closeModal);
  }
  $('#powerBtn').addEventListener('click', powerModal);

  /* ---------------- Terminal app: commands that control the OS ---------------- */
  function termMsg(e, d) {
    const reply = (data) => { try { e.source.postMessage({ type: 'term-reply', id: d.id, data }, '*'); } catch (x) {} };
    const own = () => Object.values(wins).find((w) => { const f = w.body.querySelector('iframe'); return f && f.contentWindow === e.source; }) || null;
    const pick = (target) => (target ? wins[target] : (own() || focused)) || null;
    const nameOf = (w) => { const a = APPS.find((x) => x.id === w.key); return a ? a.name : w.key; };
    switch (d.cmd) {
      case 'apps': reply({ list: APPS.filter((a) => a.id !== 'apps' || true).map((a) => ({ id: a.id, name: a.name, open: !!wins[a.id] })) }); break;
      case 'windows': reply({ list: Object.values(wins).map((w) => ({ id: w.key, name: nameOf(w), min: !!w.min, focused: w === focused })) }); break;
      case 'bgs': reply({ list: Object.keys(BGS), current: S.bg, custom: !!S.customBg }); break;
      case 'info': reply({ version: '1.7.0', windows: Object.keys(wins).length, apps: APPS.length }); break;
      case 'intro': reply(true); if (window.GalaxyIntro) window.GalaxyIntro.play(); break;
      case 'power': reply(true); setTimeout(() => powerOff(d.mode === 'restart' ? 'restart' : 'shutdown'), 150); break;
      case 'close': {
        if (d.target === '*') { Object.values(wins).forEach((w) => { const b = w.el.querySelector('.close'); if (b) b.click(); }); reply({ ok: true }); break; }
        const w = pick(d.target);
        if (!w) { reply({ ok: false, msg: 'no such window' }); break; }
        const name = nameOf(w), b = w.el.querySelector('.close');
        if (b) b.click();
        reply({ ok: true, name });
        break;
      }
      case 'snap': {
        const w = pick(d.target);
        if (!w) { reply({ ok: false }); break; }
        if (w.noSnap) { reply({ ok: false, msg: nameOf(w) + ' cannot be snapped' }); break; }
        snapWin(w, Array.isArray(d.frame) && d.frame.length === 4 && d.frame.every((n) => typeof n === 'number') ? d.frame : null);
        reply({ ok: true, name: nameOf(w) });
        break;
      }
      case 'restore': {
        const w = pick(d.target);
        if (!w) { reply({ ok: false }); break; }
        if (w.el.classList.contains('maxed')) { w.el.classList.remove('maxed'); reply({ ok: true, name: nameOf(w) }); break; }
        if (w.snapped && w.prev) { Object.assign(w.el.style, { left: w.prev.left + 'px', top: w.prev.top + 'px', width: w.prev.width + 'px', height: w.prev.height + 'px' }); w.snapped = false; reply({ ok: true, name: nameOf(w) }); break; }
        reply({ ok: false, msg: 'that window is not snapped' });
        break;
      }
      case 'arrange': {
        const m = { grid: 'grid', side: 'cols', stack: 'rows', cascade: 'cascade' }[d.mode];
        const n = Object.values(wins).filter((w) => !w.min).length;
        if (!m || !n) { reply({ ok: false }); break; }
        arrange(m); reply({ ok: true, n });
        break;
      }
      default: reply(null);
    }
  }

  /* ---------------- messages from app iframes ---------------- */
  addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.galaxyApp) { appMsg(e, d); return; }                                        // a custom app page
    if (typeof d.type === 'string' && d.type.slice(0, 4) === 'dev-' && devMsg(e, d)) return; // the Dev Console window
    switch (d.type) {
      case 'get-settings': if (e.source) e.source.postMessage(settingsMsg(), '*'); break;
      case 'set-settings': {
        const patch = d.patch || {};
        // partial updates of these objects are merged, so two quick edits can't overwrite each other
        ['boot', 'customTheme'].forEach((k) => { if (patch[k] && typeof patch[k] === 'object') patch[k] = Object.assign({}, S[k] || {}, patch[k]); });
        Object.assign(S, patch);
        save();
        applySettings();
        if ('proxy' in (d.patch || {})) window.galaxy.setProxy(S.proxy).then(() => toast(S.proxy ? 'Proxy applied' : 'Proxy disabled'));
        break;
      }
      case 'now-playing': {
        const w = wins.player, f = w && w.body.querySelector('iframe');
        if (!f || e.source !== f.contentWindow) break; // only the Player window may report
        const t = d.t && typeof d.t === 'object' && d.t.title ? d.t : null;
        setNP('player', t ? { title: npStr(t.title, 200), artist: npStr(t.artist, 200), art: npArt(t.art), playing: !!d.playing, pos: npNum(d.pos), dur: npNum(d.dur) } : null);
        break;
      }
      case 'term': termMsg(e, d); break;
      case 'intro-preview': if (window.GalaxyIntro) window.GalaxyIntro.play(); break;
      case 'jarvis-open': if (window.Jarvis) window.Jarvis.start(); break;
      case 'open-app': openApp(d.id); break;
      case 'pin-app': setPinned(d.id, !!d.on); break;
      case 'add-app-dialog': showAddApp(); break;
      case 'build-app-dialog': showAppBuilder(); break;
      case 'edit-app': { const c = (S.customApps || []).find((x) => x.id === d.id); if (c && c.kind === 'html') showAppBuilder(d.id); else showAddApp(d.id); break; }
      case 'open-display': openDisplay(); break;
      case 'battery-test': batAlert(BAT.ok ? Math.round(BAT.level * 100) : 15, false, true); break;
      case 'remove-app': removeCustomApp(d.id); break;
      case 'reset-dock': resetDock(); break;
      case 'open-url': openWebWindow(d.url, d.title); break;
      case 'cloak': window.galaxy.openCloak(d.mode); break;
      case 'clear-data': window.galaxy.clearData().then(() => toast('Browsing data cleared')); break;
      case 'reset-settings':
        { const keep = S.customApps || [], keepData = S.appData || {}; S = clone(DEFAULTS); S.customApps = keep; S.appData = keepData; S.dock.center = DEFAULT_PINNED.concat(keep.map((c) => c.id)); }
        save(); applySettings(); window.galaxy.setProxy(''); toast('Settings reset'); break;
      case 'toast': toast(d.msg); break;
      case 'export-settings': {
        const blob = new Blob([JSON.stringify({ app: 'galaxy-os', version: 1, settings: S }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'galaxy-os-settings.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('Settings exported');
        break;
      }
      case 'import-settings': {
        try {
          const obj = JSON.parse(d.text);
          const src = obj && obj.settings && typeof obj.settings === 'object' ? obj.settings : obj;
          const patch = {};
          Object.keys(DEFAULTS).forEach((k) => {
            if (k in src && typeof src[k] === typeof DEFAULTS[k] && Array.isArray(src[k]) === Array.isArray(DEFAULTS[k])) patch[k] = src[k];
          });
          if (!Object.keys(patch).length) throw new Error('empty');
          Object.assign(S, patch);
          save();
          applySettings();
          window.galaxy.setProxy(S.proxy);
          toast('Settings imported');
        } catch (err) { toast('That file is not a valid settings export'); }
        break;
      }
    }
  });

  /* ---------------- Jarvis (voice assistant, Ctrl+H) ---------------- */
  if (window.Jarvis) {
    const winName = (w) => { const a = APPS.find((x) => x.id === w.key); return a ? a.name : w.key; };
    window.Jarvis.init({
      S: () => S,
      apps: () => APPS.map((a) => ({ id: a.id, name: a.name })),
      themes: () => ['glass','crimson','ember-dusk','terracotta','tangerine','amber-haze','marigold','citron','olive-grove','clover','fern-hollow','emerald','eucalyptus','aqua','glacier','azure','indigo-veil','violet','amethyst-smoke','plum-velvet','fuchsia','orchid-smoke','rosewood','default','custom'],
      bgs: () => Object.keys(BGS),
      set: (patch) => { Object.assign(S, patch); save(); applySettings(); },
      open: (id) => openApp(id),
      url: (u) => quickOpen(u),
      toast: (m) => toast(m),
      desktop: () => { const b = $('#showDesktop'); if (b) b.click(); },
      power: (m) => powerOff(m),
      closeWin: (id) => {
        if (id === '*') { Object.values(wins).forEach((w) => { const b = w.el.querySelector('.close'); if (b) b.click(); }); return true; }
        const w = id ? wins[id] : focused;
        if (!w) return false;
        const b = w.el.querySelector('.close'); if (b) b.click(); return true;
      },
      snap: (frame) => { const w = focused; if (!w || w.min || w.noSnap) return false; snapWin(w, frame); return true; },
      arrange: (m) => { if (!Object.values(wins).some((w) => !w.min)) return false; arrange(m); return true; }
    });
    window.Jarvis.update(S.jarvis);
  }

  // links that a page tries to open in a new window become browser tabs
  window.galaxy.onOpenUrl((url) => {
    openApp('browser');
    if (browserCtl) browserCtl.newTab(url);
  });

  /* ---------------- clock + start ---------------- */
  const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString(); };
  tick(); setInterval(tick, 1000);

  applySettings();
  window.galaxy.setProxy(S.proxy);
  openApp('browser');
  if (S.intro !== false && window.GalaxyIntro && !params.has('cloak')) window.GalaxyIntro.play();

  if (!params.has('cloak')) {
    if (S.autoAB) window.galaxy.openCloak('ab');
    else if (S.autoBlob) window.galaxy.openCloak('blob');
  }
})();
