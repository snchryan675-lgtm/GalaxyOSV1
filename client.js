/* Galaxy OS Web - injected into every proxied page. Keeps the page inside the proxy:
   rewrites URLs set from JavaScript, tunnels WebSocket, separates cookies/storage per site,
   and reports title / address / shortcuts back to the OS window. */
(function () {
  'use strict';
  if (window.__gx) return;
  window.__gx = true;

  var loc = window.location;
  var SKIP = /^(data|blob|javascript|about|mailto|tel|sms|file|ws|wss):/i;
  var PRX = /^\/p\/(https?)\/([^/?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/;

  function unproxy(u) {
    try {
      var x = new URL(u, loc.href);
      if (x.origin !== loc.origin) return x.href;
      var m = PRX.exec(x.pathname + x.search + x.hash);
      return m ? m[1] + '://' + m[2] + (m[3] || '/') + (m[4] || '') + (m[5] || '') : x.href;
    } catch (e) { return String(u); }
  }
  function realUrl() {
    var m = PRX.exec(loc.pathname + loc.search + loc.hash);
    try { return m ? new URL(m[1] + '://' + m[2] + (m[3] || '/') + (m[4] || '') + (m[5] || '')) : null; } catch (e) { return null; }
  }
  var REAL0 = realUrl();
  var HOST = REAL0 ? REAL0.host : 'unknown';
  var HOSTNAME = REAL0 ? REAL0.hostname : 'unknown';

  function toProxy(u, base) {
    if (u === null || u === undefined) return u;
    if (u instanceof URL) u = u.href;
    u = String(u);
    var t = u.trim();
    if (!t || t[0] === '#' || SKIP.test(t) || /^\/p\/https?\//.test(t)) return u;
    var abs;
    try { abs = new URL(t, base || realUrl() || loc.href); } catch (e) { return u; }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return u;
    if (abs.origin === loc.origin && /^\/p\/https?\//.test(abs.pathname)) return abs.pathname + abs.search + abs.hash;
    return '/p/' + abs.protocol.slice(0, -1) + '/' + abs.host + abs.pathname + abs.search + abs.hash;
  }

  /* ---- talking to the OS window (only the top frame of a site reports) ---- */
  var isRoot = (function () {
    try { return window.parent !== window && !/^\/p\//.test(window.parent.location.pathname); } catch (e) { return window.parent !== window; }
  })();
  function post(m) {
    if (!isRoot) return;
    m.gx = 1;
    try { window.parent.postMessage(m, '*'); } catch (e) { /* ignore */ }
  }

  /* ---- fetch / XHR / beacon / EventSource / Worker / WebSocket ---- */
  if (window.fetch) {
    var of = window.fetch;
    window.fetch = function (i, init) {
      if (typeof i === 'string' || i instanceof URL) i = toProxy(i);
      else if (window.Request && i instanceof Request) { var u2 = toProxy(i.url); if (u2 !== i.url) i = new Request(u2, i); }
      return of.call(this, i, init);
    };
  }
  if (window.Request) {
    var OR = window.Request;
    var NR = function (i, init) { if (typeof i === 'string' || i instanceof URL) i = toProxy(i); return new OR(i, init); };
    NR.prototype = OR.prototype;
    window.Request = NR;
  }
  var xo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
    var a = [].slice.call(arguments);
    a[1] = toProxy(a[1]);
    return xo.apply(this, a);
  };
  if (navigator.sendBeacon) {
    var sb = navigator.sendBeacon;
    navigator.sendBeacon = function (u, d) { return sb.call(navigator, toProxy(u), d); };
  }
  if (window.EventSource) {
    var OE = window.EventSource;
    var NE = function (u, o) { return new OE(toProxy(u), o); };
    NE.prototype = OE.prototype;
    ['CONNECTING', 'OPEN', 'CLOSED'].forEach(function (k) { NE[k] = OE[k]; });
    window.EventSource = NE;
  }
  ['Worker', 'SharedWorker'].forEach(function (n) {
    var O = window[n];
    if (!O) return;
    var N = function (u, o) { return new O(toProxy(u), o); };
    N.prototype = O.prototype;
    window[n] = N;
  });
  if (window.WebSocket) {
    var OW = window.WebSocket;
    var NW = function (url, protocols) {
      var x;
      try { x = new URL(String(url), realUrl() || loc.href); } catch (e) { return protocols ? new OW(url, protocols) : new OW(url); }
      var sch = (x.protocol === 'wss:' || x.protocol === 'https:') ? 'https' : 'http';
      var p = (loc.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + loc.host + '/p/' + sch + '/' + x.host + x.pathname + x.search;
      return protocols ? new OW(p, protocols) : new OW(p);
    };
    NW.prototype = OW.prototype;
    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { NW[k] = OW[k]; });
    window.WebSocket = NW;
  }
  if (window.ServiceWorkerContainer) {
    ServiceWorkerContainer.prototype.register = function () {
      return Promise.reject(new DOMException('Service workers are turned off inside Galaxy OS', 'SecurityError'));
    };
  }

  /* ---- element URL properties and attributes ---- */
  function hook(proto, prop) {
    if (!proto) return;
    var d = Object.getOwnPropertyDescriptor(proto, prop);
    if (!d || !d.set) return;
    Object.defineProperty(proto, prop, { get: d.get, set: function (v) { d.set.call(this, toProxy(v)); }, configurable: true, enumerable: d.enumerable });
  }
  [['HTMLImageElement', 'src'], ['HTMLScriptElement', 'src'], ['HTMLIFrameElement', 'src'], ['HTMLMediaElement', 'src'],
    ['HTMLSourceElement', 'src'], ['HTMLEmbedElement', 'src'], ['HTMLTrackElement', 'src'], ['HTMLInputElement', 'src'],
    ['HTMLAnchorElement', 'href'], ['HTMLLinkElement', 'href'], ['HTMLAreaElement', 'href'], ['HTMLFormElement', 'action'],
    ['HTMLObjectElement', 'data'], ['HTMLVideoElement', 'poster']].forEach(function (p) { hook(window[p[0]] && window[p[0]].prototype, p[1]); });

  var URLATTR = { src: 1, href: 1, action: 1, formaction: 1, poster: 1 };
  var sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    var l = String(n).toLowerCase();
    if (l === 'integrity') return;
    if (URLATTR[l] || (l === 'data' && this.tagName === 'OBJECT')) v = toProxy(v);
    else if (l === 'srcset' && !/data:/i.test(v)) v = String(v).split(',').map(function (s) { s = s.trim(); var i = s.search(/\s/); return i < 0 ? toProxy(s) : toProxy(s.slice(0, i)) + s.slice(i); }).join(', ');
    else if (l === 'target' && /^_(top|parent)$/i.test(v)) v = '_self';
    return sa.call(this, n, v);
  };

  var HTMLATTR = /(\s(?:src|href|action|poster|data-src)\s*=\s*)(["'])(.*?)\2/gi;
  function fixHtml(s) { return String(s).replace(HTMLATTR, function (m, p, q, v) { return p + q + toProxy(v) + q; }); }
  ['innerHTML', 'outerHTML'].forEach(function (k) {
    var d = Object.getOwnPropertyDescriptor(Element.prototype, k);
    if (d && d.set) Object.defineProperty(Element.prototype, k, { get: d.get, set: function (v) { d.set.call(this, fixHtml(v)); }, configurable: true });
  });
  var iah = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (pos, html) { return iah.call(this, pos, fixHtml(html)); };
  var dw = Document.prototype.write, dwl = Document.prototype.writeln;
  Document.prototype.write = function () { return dw.apply(this, [].map.call(arguments, fixHtml)); };
  Document.prototype.writeln = function () { return dwl.apply(this, [].map.call(arguments, fixHtml)); };

  /* ---- history / window.open ---- */
  ['pushState', 'replaceState'].forEach(function (k) {
    var o = History.prototype[k];
    History.prototype[k] = function (s, t, u) {
      var r = o.call(this, s, t, u == null ? u : toProxy(u));
      setTimeout(report, 0);
      return r;
    };
  });
  var oo = window.open;
  window.open = function (u, n, f) {
    if (!u) return oo.call(window, u, n, f);
    if (isRoot) { post({ t: 'open', url: unproxy(toProxy(u)) }); return null; }
    return oo.call(window, toProxy(u), n, f);
  };
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || !isRoot || !e.target || !e.target.closest) return;
    var a = e.target.closest('a[href]');
    if (!a) return;
    var tg = (a.getAttribute('target') || '').toLowerCase();
    if (tg === '_blank' || tg === '_new') {
      var h = a.getAttribute('href');
      if (!h || h[0] === '#' || /^javascript:/i.test(h)) return;
      e.preventDefault();
      post({ t: 'open', url: unproxy(a.href) });
    }
  }, false);

  /* ---- cookies: one set per site, stored as gxc_<hex(domain)>_<name> ---- */
  function hex(s) { return Array.prototype.map.call(new TextEncoder().encode(s), function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  function unhex(h) { try { return new TextDecoder().decode(new Uint8Array(h.match(/../g).map(function (x) { return parseInt(x, 16); }))); } catch (e) { return ''; } }
  var cd = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  if (cd) {
    Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true,
      get: function () {
        var out = [];
        (cd.get.call(document) || '').split(/;\s*/).forEach(function (c) {
          var eq = c.indexOf('=');
          var m = /^gxc_([0-9a-f]+)_(.+)$/.exec(eq < 0 ? c : c.slice(0, eq));
          if (!m || eq < 0) return;
          var dom = unhex(m[1]);
          if (HOSTNAME === dom || HOSTNAME.endsWith('.' + dom)) out.push(m[2] + c.slice(eq));
        });
        return out.join('; ');
      },
      set: function (str) {
        var parts = String(str).split(';');
        var nv = parts.shift();
        var eq = nv.indexOf('=');
        if (eq < 1) return;
        var name = nv.slice(0, eq).trim(), value = nv.slice(eq + 1);
        var domain = HOSTNAME, extra = '';
        parts.forEach(function (p) {
          var i = p.indexOf('=');
          var k = (i < 0 ? p : p.slice(0, i)).trim().toLowerCase(), v = i < 0 ? '' : p.slice(i + 1).trim();
          if (k === 'domain') { var d = v.replace(/^\./, '').toLowerCase(); if (d && (HOSTNAME === d || HOSTNAME.endsWith('.' + d))) domain = d; }
          else if (k === 'max-age') extra += '; Max-Age=' + v;
          else if (k === 'expires') extra += '; Expires=' + v;
        });
        cd.set.call(document, 'gxc_' + hex(domain) + '_' + name + '=' + value + '; Path=/; SameSite=Lax' + extra);
      }
    });
  }

  /* ---- localStorage / sessionStorage / IndexedDB are kept apart per site ---- */
  function wrapStorage(st) {
    var p = 'gx|' + HOST + '|';
    function keys() { var r = []; for (var i = 0; i < st.length; i++) { var k = st.key(i); if (k && k.indexOf(p) === 0) r.push(k.slice(p.length)); } return r; }
    var api = {
      getItem: function (k) { return st.getItem(p + k); },
      setItem: function (k, v) { st.setItem(p + k, String(v)); },
      removeItem: function (k) { st.removeItem(p + k); },
      clear: function () { keys().forEach(function (k) { st.removeItem(p + k); }); },
      key: function (i) { var k = keys()[i]; return k === undefined ? null : k; }
    };
    return new Proxy(api, {
      get: function (t, k) {
        if (k === 'length') return keys().length;
        if (k in api || typeof k === 'symbol') return api[k];
        var v = st.getItem(p + k);
        return v === null ? undefined : v;
      },
      set: function (t, k, v) { st.setItem(p + k, String(v)); return true; },
      deleteProperty: function (t, k) { st.removeItem(p + k); return true; },
      has: function (t, k) { return k in api || st.getItem(p + String(k)) !== null; },
      ownKeys: function () { return keys(); },
      getOwnPropertyDescriptor: function (t, k) {
        if (typeof k === 'string' && st.getItem(p + k) !== null) return { value: st.getItem(p + k), enumerable: true, configurable: true, writable: true };
        return undefined;
      }
    });
  }
  try {
    var LS = window.localStorage, SS = window.sessionStorage;
    var wl = wrapStorage(LS), ws = wrapStorage(SS);
    Object.defineProperty(window, 'localStorage', { get: function () { return wl; }, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { get: function () { return ws; }, configurable: true });
  } catch (e) { /* storage blocked */ }
  try {
    var DBP = 'gx|' + HOST + '|';
    var io = IDBFactory.prototype.open, id = IDBFactory.prototype.deleteDatabase, idl = IDBFactory.prototype.databases;
    IDBFactory.prototype.open = function (n, v) { return v === undefined ? io.call(this, DBP + n) : io.call(this, DBP + n, v); };
    IDBFactory.prototype.deleteDatabase = function (n) { return id.call(this, DBP + n); };
    if (idl) IDBFactory.prototype.databases = function () {
      return idl.call(this).then(function (a) { return a.filter(function (d) { return d.name.indexOf(DBP) === 0; }).map(function (d) { return { name: d.name.slice(DBP.length), version: d.version }; }); });
    };
  } catch (e) { /* no indexedDB */ }

  /* ---- reporting back to the OS window ---- */
  var lastKey = '';
  function icon() {
    var l = document.querySelector('link[rel~="icon"], link[rel="shortcut icon"]');
    if (l && l.getAttribute('href')) return toProxy(l.getAttribute('href'));
    var r = realUrl();
    return r ? '/p/' + r.protocol.slice(0, -1) + '/' + r.host + '/favicon.ico' : '';
  }
  function report(force) {
    if (!isRoot) return;
    var r = realUrl();
    var key = (r ? r.href : '') + '\n' + document.title;
    if (!force && key === lastKey) return;
    lastKey = key;
    post({ t: 'nav', url: r ? r.href : loc.href, title: document.title || '', icon: icon() });
  }
  document.addEventListener('DOMContentLoaded', function () { report(true); });
  window.addEventListener('load', function () { report(true); });
  window.addEventListener('popstate', function () { setTimeout(report, 0); });
  window.addEventListener('hashchange', function () { setTimeout(report, 0); });
  window.addEventListener('beforeunload', function () { post({ t: 'loading' }); });
  setInterval(report, 1000);
  report(true);

  if (isRoot) {
    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.altKey || e.metaKey) post({ t: 'key', key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey });
    }, true);
    var lastAct = 0;
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
      window.addEventListener(ev, function () { var n = Date.now(); if (n - lastAct > 2000) { lastAct = n; post({ t: 'activity' }); } }, { capture: true, passive: true });
    });
    ['log', 'info', 'warn', 'error'].forEach(function (lv) {
      var o = console[lv];
      console[lv] = function () {
        try { post({ t: 'console', level: lv, message: [].map.call(arguments, function (a) { try { return typeof a === 'string' ? a : JSON.stringify(a); } catch (e) { return String(a); } }).join(' ').slice(0, 2000) }); } catch (e) { /* ignore */ }
        return o.apply(console, arguments);
      };
    });
    window.addEventListener('error', function (e) { post({ t: 'console', level: 'error', message: String(e.message || 'Error') + (e.lineno ? '  (:' + e.lineno + ')' : '') }); });
  }
})();
