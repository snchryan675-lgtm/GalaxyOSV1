/* Galaxy OS Web bridge. Replaces the Electron pieces of the desktop version:
   - window.galaxy (preload API)
   - <gx-webview>, a stand-in for Electron's <webview> that loads every site through the built-in proxy */
(function () {
  'use strict';

  /* ---------- proxy URL helper ---------- */
  function proxify(u) {
    try {
      var x = new URL(u, location.href);
      if (x.protocol !== 'http:' && x.protocol !== 'https:') return String(u);
      if (x.origin === location.origin && /^\/p\/https?\//.test(x.pathname)) return x.pathname + x.search + x.hash;
      return '/p/' + x.protocol.slice(0, -1) + '/' + x.host + x.pathname + x.search + x.hash;
    } catch (e) { return String(u); }
  }
  window.galaxyProxify = proxify;

  /* ---------- window.galaxy ---------- */
  var openCbs = [], keyCbs = [], lastActive = Date.now();
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, function () { lastActive = Date.now(); }, { capture: true, passive: true });
  });

  function setIcon(href) {
    var l = document.querySelector('link[rel~="icon"]');
    if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    l.href = href || 'assets/icon.png';
  }

  function cloakPage(mode) {
    var url = location.origin + location.pathname + '?cloak=' + encodeURIComponent(mode);
    var frame = '<iframe src="' + url + '" allow="autoplay; fullscreen; microphone; camera; gamepad; clipboard-write" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';
    if (mode === 'blob') {
      var html = '<!doctype html><title>Google</title><body style="margin:0;background:#09060f">' + frame;
      var w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })));
      return !!w;
    }
    var w2 = window.open('about:blank');
    if (!w2) return false;
    w2.document.write('<!doctype html><title>about:blank</title><body style="margin:0;background:#09060f">' + frame);
    w2.document.close();
    return true;
  }

  function clearSiteData() {
    try {
      document.cookie.split(/;\s*/).forEach(function (c) {
        var n = c.split('=')[0];
        if (n.indexOf('gxc_') === 0) document.cookie = n + '=; Path=/; Max-Age=0';
      });
      [localStorage, sessionStorage].forEach(function (st) {
        var del = [];
        for (var i = 0; i < st.length; i++) { var k = st.key(i); if (k && k.indexOf('gx|') === 0) del.push(k); }
        del.forEach(function (k) { st.removeItem(k); });
      });
      if (indexedDB && indexedDB.databases) {
        indexedDB.databases().then(function (dbs) { dbs.forEach(function (d) { if (d.name && d.name.indexOf('gx|') === 0) indexedDB.deleteDatabase(d.name); }); });
      }
    } catch (e) { /* ignore */ }
  }

  window.galaxy = {
    setProxy: function () { return Promise.resolve(true); }, // the web version always uses its built-in proxy
    clearData: function () { clearSiteData(); return Promise.resolve(true); },
    setCloak: function (o) {
      o = o || {};
      if (o.title) document.title = String(o.title).slice(0, 120);
      setIcon(/^https:\/\//i.test(o.icon || '') ? o.icon : '');
      return Promise.resolve(true);
    },
    quit: function () { location.replace('about:blank'); return Promise.resolve(true); },
    idleTime: function () { return Promise.resolve(Math.floor((Date.now() - lastActive) / 1000)); },
    openCloak: function (mode) { return Promise.resolve(cloakPage(mode)); },
    imageThumb: function (src) {
      return new Promise(function (resolve) {
        if (typeof src !== 'string') return resolve(null);
        var url = src;
        if (src.indexOf('wallpaper:') === 0) url = 'assets/wallpapers/' + src.slice(10);
        else if (/^https?:\/\//i.test(src)) url = proxify(src);
        else if (src.indexOf('data:image/') !== 0) return resolve(null);
        var img = new Image();
        img.onload = function () {
          try {
            var w = Math.min(64, img.naturalWidth || 64), h = Math.max(1, Math.round(w * (img.naturalHeight || 1) / (img.naturalWidth || 1)));
            var c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL());
          } catch (e) { resolve(null); }
        };
        img.onerror = function () { resolve(null); };
        img.src = url;
      });
    },
    versions: function () {
      var m = /Chrome\/([\d.]+)/.exec(navigator.userAgent);
      return Promise.resolve({ electron: 'web', chrome: m ? m[1] : 'unknown', node: 'server', app: '1.7.0-web' });
    },
    onOpenUrl: function (cb) { openCbs.push(cb); },
    onWebviewKey: function (cb) { keyCbs.push(cb); }
  };

  window.addEventListener('message', function (ev) {
    var m = ev.data;
    if (m && m.gx && m.t === 'activity') lastActive = Date.now();
  });

  /* ---------- <gx-webview> ---------- */
  var style = document.createElement('style');
  style.textContent = 'gx-webview{display:flex;position:relative}gx-webview>iframe{flex:1 1 auto;width:100%;min-width:0;min-height:0;border:0;background:#000}';
  document.head.appendChild(style);

  var SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock allow-presentation allow-downloads allow-orientation-lock';
  var ALLOW = 'autoplay; fullscreen; microphone; camera; gamepad; clipboard-read; clipboard-write; encrypted-media; picture-in-picture; accelerometer; gyroscope; cross-origin-isolated; web-share; display-capture';

  function GXWebview() { return Reflect.construct(HTMLElement, [], GXWebview); }
  GXWebview.prototype = Object.create(HTMLElement.prototype);
  GXWebview.prototype.constructor = GXWebview;
  Object.setPrototypeOf(GXWebview, HTMLElement);
  GXWebview.observedAttributes = ['src'];

  var P = GXWebview.prototype;
  P._emit = function (type, props) {
    var e = new Event(type);
    if (props) Object.keys(props).forEach(function (k) { e[k] = props[k]; });
    this.dispatchEvent(e);
  };
  P._init = function () {
    if (this._f) return;
    this._hist = []; this._idx = -1; this._real = ''; this._title = ''; this._domReady = false;
    var self = this;
    var f = document.createElement('iframe');
    f.setAttribute('sandbox', SANDBOX);
    f.setAttribute('allow', ALLOW);
    f.setAttribute('allowfullscreen', '');
    f.addEventListener('load', function () { self._emit('did-stop-loading'); });
    this._f = f;
    this.appendChild(f);
    this._onMsg = function (ev) { if (ev.source === f.contentWindow) self._message(ev.data); };
    window.addEventListener('message', this._onMsg);
  };
  P.connectedCallback = function () {
    this._init();
    if (this._pending) { var p = this._pending; this._pending = null; this._load(p); }
  };
  P.disconnectedCallback = function () { if (this._onMsg) window.removeEventListener('message', this._onMsg); this._onMsg = null; };
  P.attributeChangedCallback = function (name, _o, v) { if (name === 'src' && v && v !== this._real) this.src = v; };
  P._load = function (url) {
    this._real = url; this._domReady = false;
    this._emit('did-start-loading');
    this._f.src = /^https?:/i.test(url) ? proxify(url) : url;
  };
  Object.defineProperty(P, 'src', {
    get: function () { return this._real || ''; },
    set: function (v) {
      v = String(v || '');
      if (!this._f) { this._init(); }
      if (this.isConnected) this._load(v); else this._pending = v;
    }
  });
  P._message = function (m) {
    if (!m || !m.gx) return;
    if (m.t === 'nav') {
      var changed = m.url !== this._real;
      this._real = m.url;
      var h = this._hist;
      if (h[this._idx] === m.url) { /* same page */ }
      else if (this._idx > 0 && h[this._idx - 1] === m.url) this._idx--;
      else if (this._idx < h.length - 1 && h[this._idx + 1] === m.url) this._idx++;
      else { h.splice(this._idx + 1); h.push(m.url); this._idx = h.length - 1; }
      if (!this._domReady) { this._domReady = true; this._emit('dom-ready'); }
      if (changed) this._emit('did-navigate', { url: m.url, isMainFrame: true });
      if (m.title && m.title !== this._title) { this._title = m.title; this._emit('page-title-updated', { title: m.title }); }
      if (m.icon) this._emit('page-favicon-updated', { favicons: [m.icon] });
    } else if (m.t === 'loading') {
      this._emit('did-start-loading');
    } else if (m.t === 'open') {
      openCbs.forEach(function (cb) { cb(m.url); });
    } else if (m.t === 'key') {
      keyCbs.forEach(function (cb) { cb({ key: m.key, ctrl: m.ctrl, alt: m.alt, shift: m.shift, meta: m.meta }); });
    } else if (m.t === 'console') {
      this._emit('console-message', { level: ({ error: 3, warn: 2, info: 1, log: 0 })[m.level] || 0, message: m.message, line: 0, sourceId: '' });
    }
  };
  P.reload = function () { try { this._f.contentWindow.location.reload(); } catch (e) { this._f.src = this._f.src; } };
  P.stop = function () { try { this._f.contentWindow.stop(); } catch (e) { /* ignore */ } this._emit('did-stop-loading'); };
  P.goBack = function () { try { this._f.contentWindow.history.back(); } catch (e) { /* ignore */ } };
  P.goForward = function () { try { this._f.contentWindow.history.forward(); } catch (e) { /* ignore */ } };
  P.canGoBack = function () { return this._idx > 0; };
  P.canGoForward = function () { return this._idx < this._hist.length - 1; };
  P.getURL = function () { return this._real || ''; };
  P.getTitle = function () { return this._title || ''; };
  P.executeJavaScript = function (code) {
    var self = this;
    return new Promise(function (res, rej) { try { res(self._f.contentWindow.eval(code)); } catch (e) { rej(e); } });
  };
  P.openDevTools = function () { alert('Press F12 in your browser and pick this app\u2019s frame in the Console / Elements panel.'); };
  P.capturePage = function () { return Promise.reject(new Error('Not available in the web version')); };

  customElements.define('gx-webview', GXWebview);
})();
