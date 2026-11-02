#!/usr/bin/env node
'use strict';
/*
 * Galaxy OS Web - static host + built-in web proxy. No npm dependencies (Node 18+).
 *
 *   /                -> the OS (public/)
 *   /p/<scheme>/<host>/<path>?<query>
 *                    -> proxied website (every browser tab, app and game link uses this)
 *   /gx/client.js    -> script injected into proxied pages (patches fetch, XHR, WebSocket, cookies, ...)
 *   /health          -> {"ok":true}
 *
 * Env: PORT (8080), ALLOW_PRIVATE=1 (allow proxying localhost / LAN, off by default),
 *      ISOLATE=1 (send COOP/COEP headers so threaded WebAssembly games can use SharedArrayBuffer),
 *      MAX_BODY_MB (25, cap for pages that get rewritten).
 */
const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = +process.env.PORT || 8080;
const PUBLIC = path.join(__dirname, 'public');
const ALLOW_PRIVATE = process.env.ALLOW_PRIVATE === '1';
const ISOLATE = process.env.ISOLATE === '1';
const MAX_BODY = (+process.env.MAX_BODY_MB || 25) * 1024 * 1024;
const FALLBACK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4'
};

/* ------------------------------------------------------------------ safety: never let the proxy reach private networks */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const l = ip.toLowerCase();
  if (l === '::1' || l === '::') return true;
  if (l.startsWith('::ffff:')) return isPrivateIp(l.slice(7));
  return /^(fc|fd|fe[89ab])/.test(l);
}
function safeLookup(hostname, opts, cb) {
  dns.lookup(hostname, opts, (err, address, family) => {
    if (err) return cb(err);
    const list = Array.isArray(address) ? address : [{ address, family }];
    if (!ALLOW_PRIVATE && list.some((a) => isPrivateIp(a.address))) return cb(new Error('Blocked: private network address'));
    cb(null, address, family);
  });
}
function hostBlocked(hostname) {
  if (ALLOW_PRIVATE) return false;
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  return net.isIP(h) ? isPrivateIp(h) : false;
}

/* ------------------------------------------------------------------ url helpers */
const PROXY_RE = /^\/p\/(https?)\/([^/?#]+)(\/[^?#]*)?(\?[^#]*)?/;
function parseProxyPath(u) {
  const m = PROXY_RE.exec(u);
  return m ? { proto: m[1], host: m[2], path: m[3] || '/', search: m[4] || '' } : null;
}
function proxify(abs) {
  let u;
  try { u = abs instanceof URL ? abs : new URL(abs); } catch (e) { return String(abs); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return u.href;
  return '/p/' + u.protocol.slice(0, -1) + '/' + u.host + u.pathname + u.search + u.hash;
}
const SKIP_URL = /^(data|blob|javascript|about|mailto|tel|sms|file|ws|wss):/i;
function rewriteUrl(val, base) {
  const v = String(val).trim();
  if (!v || v[0] === '#' || SKIP_URL.test(v) || /^\/p\/https?\//.test(v)) return val;
  try { return proxify(new URL(v, base)); } catch (e) { return val; }
}
function decodeEntities(s) {
  return s.replace(/&(amp|quot|lt|gt|apos|#39|#x2f|#47);/gi, (m, e) => ({ amp: '&', quot: '"', lt: '<', gt: '>', apos: "'", '#39': "'", '#x2f': '/', '#47': '/' }[e.toLowerCase()]));
}
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ rewriting */
function rewriteCss(css, base) {
  return css
    .replace(/url\(\s*(["']?)([^"')]+?)\1\s*\)/gi, (m, q, u) => `url(${q}${rewriteUrl(u, base)}${q})`)
    .replace(/@import\s+(["'])([^"']+)\1/gi, (m, q, u) => `@import ${q}${rewriteUrl(u, base)}${q}`);
}

const URL_ATTRS = new Set(['src', 'href', 'action', 'formaction', 'poster', 'background', 'manifest', 'data-src', 'data-href', 'data-original', 'xlink:href']);
const TAG_RE = /<([a-zA-Z][^\s/>]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const ATTR_RE = /([^\s"'<>\/=]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function rewriteSrcset(v, base) {
  if (/data:/i.test(v)) return v;
  return v.split(',').map((part) => {
    const t = part.trim();
    if (!t) return t;
    const i = t.search(/\s/);
    return i < 0 ? rewriteUrl(t, base) : rewriteUrl(t.slice(0, i), base) + t.slice(i);
  }).join(', ');
}

function rewriteHtml(html, pageUrl, inject) {
  let base = pageUrl;
  html = html.replace(/<base\b[^>]*>/i, (m) => {
    const h = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m);
    if (h) { try { base = new URL(decodeEntities(h[1] ?? h[2] ?? h[3]), pageUrl); } catch (e) { /* ignore */ } }
    return '';
  });
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy[^>]*>/gi, '');
  html = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, c, b) => a + rewriteCss(c, base) + b);
  html = html.replace(TAG_RE, (m, name, attrs, close) => {
    if (!attrs) return m;
    const tag = name.toLowerCase();
    const isRefresh = tag === 'meta' && /http-equiv\s*=\s*["']?refresh/i.test(attrs);
    const out = attrs.replace(ATTR_RE, (am, an, eq, dq, sq, bare) => {
      const ln = an.toLowerCase();
      const raw = dq ?? sq ?? bare;
      const val = decodeEntities(raw);
      if (ln === 'integrity') return '';
      if (ln === 'target' && /^_(top|parent)$/i.test(val)) return `${an}="_self"`;
      let nv = null;
      if (URL_ATTRS.has(ln) || (ln === 'data' && tag === 'object')) nv = rewriteUrl(val, base);
      else if (ln === 'srcset' || ln === 'imagesrcset') nv = rewriteSrcset(val, base);
      else if (ln === 'style') nv = rewriteCss(val, base);
      else if (isRefresh && ln === 'content') nv = val.replace(/(url\s*=\s*)(['"]?)([^'"]+)\2/i, (x, p, q, u) => p + q + rewriteUrl(u, base) + q);
      if (nv === null || nv === val) return am;
      return `${an}${eq.trim() === '=' ? '=' : eq}"${escAttr(nv)}"`;
    });
    return `<${name}${out}${close ? ' /' : ''}>`;
  });
  if (inject) {
    const tagStr = '<script src="/gx/client.js"></script>';
    let done = false;
    html = html.replace(/<head\b[^>]*>/i, (m) => { done = true; return m + tagStr; });
    if (!done) html = html.replace(/<html\b[^>]*>/i, (m) => { done = true; return m + tagStr; });
    if (!done) html = html.replace(/^(\s*<!doctype[^>]*>)?/i, (m) => { done = true; return m + tagStr; });
  }
  return html;
}

/* ------------------------------------------------------------------ cookies: kept in the browser as gxc_<hex(domain)>_<name> */
const hex = (s) => Buffer.from(s, 'utf8').toString('hex');
function cookiesFor(reqCookie, host) {
  if (!reqCookie) return '';
  const hostname = host.replace(/:\d+$/, '').toLowerCase();
  const out = [];
  reqCookie.split(/;\s*/).forEach((c) => {
    const eq = c.indexOf('=');
    if (eq < 1) return;
    const k = c.slice(0, eq);
    const m = /^gxc_([0-9a-f]+)_(.+)$/.exec(k);
    if (!m) return;
    const dom = Buffer.from(m[1], 'hex').toString('utf8');
    if (hostname === dom || hostname.endsWith('.' + dom)) out.push(m[2] + c.slice(eq));
  });
  return out.join('; ');
}
function rewriteSetCookie(sc, hostname, secure) {
  const parts = sc.split(';');
  const nv = parts.shift();
  const eq = nv.indexOf('=');
  if (eq < 1) return null;
  const name = nv.slice(0, eq).trim();
  const value = nv.slice(eq + 1);
  let domain = hostname.toLowerCase(), maxAge = null, expires = null;
  parts.forEach((p) => {
    const i = p.indexOf('=');
    const k = (i < 0 ? p : p.slice(0, i)).trim().toLowerCase();
    const v = i < 0 ? '' : p.slice(i + 1).trim();
    if (k === 'domain') { const d = v.replace(/^\./, '').toLowerCase(); if (d && (hostname === d || hostname.endsWith('.' + d))) domain = d; }
    else if (k === 'max-age') maxAge = v;
    else if (k === 'expires') expires = v;
  });
  return `gxc_${hex(domain)}_${name}=${value}; Path=/; SameSite=Lax` + (maxAge !== null ? `; Max-Age=${maxAge}` : '') + (expires ? `; Expires=${expires}` : '') + (secure ? '; Secure' : '');
}

/* ------------------------------------------------------------------ responses */
function send(res, code, body, type) {
  res.writeHead(code, { 'content-type': type || 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}
function errorPage(res, code, title, detail) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  send(res, code, `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><body style="font:15px system-ui;background:#120b1f;color:#e3deed;display:grid;place-items:center;height:100vh;margin:0"><div style="max-width:460px;text-align:center"><h2 style="margin:0 0 8px">${esc(title)}</h2><p style="opacity:.75;word-break:break-word">${esc(detail)}</p><button onclick="location.reload()" style="background:#8b5cdb;color:#fff;border:0;border-radius:8px;padding:9px 18px;font-size:14px;cursor:pointer">Try again</button></div></body>`, 'text/html; charset=utf-8');
}
function addIsolation(h) {
  if (ISOLATE) { h['cross-origin-opener-policy'] = 'same-origin'; h['cross-origin-embedder-policy'] = 'credentialless'; }
}

function serveStatic(req, res) {
  return new Promise((resolve) => {
    let p;
    try { p = decodeURIComponent(req.url.split('?')[0].split('#')[0]); } catch (e) { return resolve(false); }
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(PUBLIC, p));
    if (!file.startsWith(PUBLIC + path.sep)) return resolve(false);
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return resolve(false);
      const ext = path.extname(file).toLowerCase();
      const h = { 'content-type': MIME[ext] || 'application/octet-stream', 'content-length': st.size, 'cache-control': /\.(png|jpe?g|woff2?|svg|ico)$/.test(ext) ? 'public, max-age=86400' : 'no-cache' };
      addIsolation(h);
      res.writeHead(200, h);
      if (req.method === 'HEAD') return res.end(), resolve(true);
      fs.createReadStream(file).pipe(res);
      resolve(true);
    });
  });
}

function targetFromReferer(req) {
  const ref = req.headers.referer;
  if (!ref) return null;
  let r;
  try { r = new URL(ref); } catch (e) { return null; }
  if (r.host !== req.headers.host) return null;
  const m = PROXY_RE.exec(r.pathname);
  if (!m) return null;
  const i = req.url.indexOf('?');
  return { proto: m[1], host: m[2], path: (i < 0 ? req.url : req.url.slice(0, i)) || '/', search: i < 0 ? '' : req.url.slice(i), viaReferer: true };
}

function unproxyReferer(ref, fallbackOrigin) {
  try {
    const r = new URL(ref);
    const m = PROXY_RE.exec(r.pathname + r.search);
    if (m) return `${m[1]}://${m[2]}${m[3] || '/'}${m[4] || ''}`;
  } catch (e) { /* ignore */ }
  return fallbackOrigin + '/';
}

function decompress(upRes) {
  const enc = (upRes.headers['content-encoding'] || '').toLowerCase();
  if (enc === 'gzip' || enc === 'x-gzip') return upRes.pipe(zlib.createGunzip());
  if (enc === 'deflate') return upRes.pipe(zlib.createInflate());
  if (enc === 'br') return upRes.pipe(zlib.createBrotliDecompress());
  return upRes;
}
function decodeBody(buf, ct) {
  let cs = (/charset=["']?([\w-]+)/i.exec(ct || '') || [])[1];
  if (!cs) cs = (/<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 2048).toString('latin1')) || [])[1];
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch (e) { return buf.toString('utf8'); }
}

const STRIP = ['content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'strict-transport-security',
  'referrer-policy', 'cross-origin-opener-policy', 'cross-origin-embedder-policy', 'cross-origin-resource-policy', 'permissions-policy',
  'report-to', 'nel', 'public-key-pins', 'alt-svc', 'x-content-type-options'];

function proxyRequest(req, res, t) {
  let target;
  try { target = new URL(`${t.proto}://${t.host}${t.path}${t.search}`); } catch (e) { return errorPage(res, 400, 'Bad address', 'That address could not be understood.'); }
  if (hostBlocked(target.hostname)) return errorPage(res, 403, 'Blocked', 'The proxy does not open local or private network addresses.');

  const secureOut = !!(req.socket.encrypted || /https/i.test(req.headers['x-forwarded-proto'] || ''));
  const h = {};
  ['accept', 'accept-language', 'range', 'content-type', 'content-length', 'user-agent', 'x-requested-with', 'sec-fetch-dest'].forEach((k) => { if (req.headers[k]) h[k] = req.headers[k]; });
  h['user-agent'] = req.headers['user-agent'] || FALLBACK_UA;
  h['accept-encoding'] = 'gzip, deflate, br';
  h.host = target.host;
  if (req.headers.origin) h.origin = target.origin;
  h.referer = unproxyReferer(req.headers.referer || '', target.origin);
  const ck = cookiesFor(req.headers.cookie, target.hostname);
  if (ck) h.cookie = ck;
  delete h['sec-fetch-dest']; // not forwarded; used only locally below

  const dest = req.headers['sec-fetch-dest'] || '';
  const lib = target.protocol === 'https:' ? https : http;
  const up = lib.request({
    protocol: target.protocol, hostname: target.hostname, port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search, method: req.method, headers: h, lookup: safeLookup
  }, (upRes) => {
    const status = upRes.statusCode;
    const headers = Object.assign({}, upRes.headers);
    STRIP.forEach((k) => delete headers[k]);
    if (headers.location && status >= 300 && status < 400) {
      try { headers.location = proxify(new URL(headers.location, target)); } catch (e) { /* keep */ }
    }
    if (headers['set-cookie']) {
      headers['set-cookie'] = [].concat(headers['set-cookie']).map((c) => rewriteSetCookie(c, target.hostname, secureOut)).filter(Boolean);
    }
    delete headers.link;
    addIsolation(headers);

    const ct = (headers['content-type'] || '').toLowerCase();
    const isHtml = /text\/html|application\/xhtml/.test(ct);
    const isCss = /text\/css/.test(ct);
    const noBody = req.method === 'HEAD' || status === 204 || status === 304;

    if ((isHtml || isCss) && !noBody) {
      const chunks = [];
      let size = 0, dead = false;
      const stream = decompress(upRes);
      stream.on('data', (c) => { size += c.length; if (size > MAX_BODY) { dead = true; up.destroy(); stream.destroy(); if (!res.headersSent) errorPage(res, 502, 'Too large', 'That page is too big to proxy.'); } else chunks.push(c); });
      stream.on('error', () => { if (!res.headersSent) errorPage(res, 502, 'Could not read page', 'The site sent data the proxy could not decode.'); });
      stream.on('end', () => {
        if (dead) return;
        const text = decodeBody(Buffer.concat(chunks), ct);
        const isFrameDoc = !dest || /^(document|iframe|frame|embed|object)$/.test(dest);
        const out = Buffer.from(isHtml ? rewriteHtml(text, target, isFrameDoc) : rewriteCss(text, target), 'utf8');
        delete headers['content-encoding']; delete headers['transfer-encoding']; delete headers.etag; delete headers['content-md5'];
        headers['content-length'] = out.length;
        headers['content-type'] = (isHtml ? 'text/html' : 'text/css') + '; charset=utf-8';
        if (isHtml) headers['cache-control'] = 'no-cache';
        res.writeHead(status, headers);
        res.end(out);
      });
      return;
    }
    res.writeHead(status, headers);
    if (noBody) return res.end();
    upRes.pipe(res);
  });
  up.setTimeout(45000, () => up.destroy(new Error('Timed out')));
  up.on('error', (e) => {
    if (res.headersSent) return res.destroy();
    const msg = e.code === 'ENOTFOUND' ? `Could not find ${target.hostname}.` : e.message;
    errorPage(res, 502, 'Could not load that site', msg);
  });
  res.on('close', () => up.destroy());
  if (req.method === 'GET' || req.method === 'HEAD') up.end(); else req.pipe(up);
}

/* ------------------------------------------------------------------ websockets (raw tunnel) */
function proxyUpgrade(req, socket, head) {
  const t = parseProxyPath(req.url) || targetFromReferer(req);
  if (!t) return socket.destroy();
  let target;
  try { target = new URL(`${t.proto}://${t.host}${t.path}${t.search}`); } catch (e) { return socket.destroy(); }
  if (hostBlocked(target.hostname)) return socket.destroy();
  const secure = target.protocol === 'https:';
  const port = +target.port || (secure ? 443 : 80);
  const up = secure
    ? tls.connect({ host: target.hostname, port, servername: target.hostname, lookup: safeLookup })
    : net.connect({ host: target.hostname, port, lookup: safeLookup });
  const lines = [`${req.method} ${target.pathname}${target.search} HTTP/1.1`, `Host: ${target.host}`];
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const k = req.rawHeaders[i], lk = k.toLowerCase();
    if (lk === 'host' || lk === 'origin' || lk === 'cookie' || lk === 'referer') continue;
    lines.push(`${k}: ${req.rawHeaders[i + 1]}`);
  }
  lines.push(`Origin: ${target.origin}`);
  const ck = cookiesFor(req.headers.cookie, target.hostname);
  if (ck) lines.push(`Cookie: ${ck}`);
  up.on(secure ? 'secureConnect' : 'connect', () => {
    up.write(lines.join('\r\n') + '\r\n\r\n');
    if (head && head.length) up.write(head);
    up.pipe(socket);
    socket.pipe(up);
  });
  const kill = () => { up.destroy(); socket.destroy(); };
  up.on('error', kill); socket.on('error', kill); up.on('close', kill); socket.on('close', kill);
}

/* ------------------------------------------------------------------ server */
const server = http.createServer(async (req, res) => {
  try {
    const u = req.url;
    if (u === '/health') return send(res, 200, '{"ok":true}', 'application/json');
    if (u.startsWith('/p/')) {
      const t = parseProxyPath(u);
      return t ? proxyRequest(req, res, t) : errorPage(res, 400, 'Bad address', 'That proxy address is not valid.');
    }
    if (!u.startsWith('/gx/')) {
      // a proxied page asked for something outside /p/ (root-relative URL built by its JavaScript): send it to that site
      const t = targetFromReferer(req);
      if (t) {
        const d = req.headers['sec-fetch-dest'] || '';
        if (req.method === 'GET' && /^(document|iframe|frame)$/.test(d)) { res.writeHead(302, { location: `/p/${t.proto}/${t.host}${t.path}${t.search}` }); return res.end(); }
        return proxyRequest(req, res, t);
      }
    }
    if (await serveStatic(req, res)) return;
    send(res, 404, 'Not found');
  } catch (e) {
    if (!res.headersSent) send(res, 500, 'Server error');
    else res.destroy();
  }
});
server.on('upgrade', proxyUpgrade);
server.keepAliveTimeout = 65000;
process.on('uncaughtException', (e) => console.error('uncaught:', e && e.message));
server.listen(PORT, () => console.log(`Galaxy OS Web running on http://localhost:${PORT}`));
