# Galaxy OS Web

Galaxy OS running as a website. Same desktop, taskbar, themes, widgets, Terminal, Jarvis and Settings as the
Electron version, plus a **built-in web proxy** (no npm packages needed).

## Run it on your PC
1. Install Node.js 18 or newer (https://nodejs.org).
2. In this folder run: `node server.js`
3. Open http://localhost:8080

## What goes through the proxy
- **Browser app**: every tab, and the address bar. Typing a word or phrase searches with the engine chosen in
  Settings > Proxy (DuckDuckGo by default; Bing, Brave, Google and Mojeek are also there). Typing a site opens it.
- **App links**: TikTok, Roblox, ChatGPT, GeForce NOW, Spotify, and any app you add yourself with "+ Add app".
- **Game links**: Fortnite, Terraria, Cyberpunk, NSMB Wii, Super Mario 64, Game Hub, and any game link you add.
- Links a site tries to open in a new window open as a new Browser tab inside the OS.

Proxied addresses look like `/p/https/example.com/page`. Cookies, localStorage and IndexedDB are kept separate per
site, WebSockets are tunnelled (needed by many multiplayer games), and frame-blocking headers (X-Frame-Options,
CSP) are removed so sites can open inside windows.

## Put it online (so your PC does not need to be on)
Any host that runs Node works. Example with Render (free tier available, it sleeps when idle):
1. Make a GitHub repository and upload everything in this folder.
2. On render.com: New > Web Service > connect the repository.
3. Runtime: Node. Build command: leave empty. Start command: `node server.js`.
4. Deploy. Render gives you an https link: that is your Galaxy OS website.

A `Dockerfile` is included for hosts that prefer Docker (Railway, Fly.io, a VPS, ...).
Check the host's rules first: some free hosts do not allow proxy sites.

## Options (environment variables)
| Name | Default | Meaning |
|------|---------|---------|
| `PORT` | 8080 | Port to listen on (hosts usually set this for you) |
| `ISOLATE` | off | `1` sends COOP/COEP headers so threaded WebAssembly games (SharedArrayBuffer) can run |
| `ALLOW_PRIVATE` | off | `1` lets the proxy open localhost / LAN addresses. Keep it off on a public site |
| `MAX_BODY_MB` | 25 | Largest page or stylesheet the proxy will rewrite |

## Known limits (please read)
- This is a server-side rewriting proxy. Simple sites and HTML5 game pages usually work. Heavy web apps
  (YouTube, Discord, TikTok, ChatGPT, Roblox, Spotify, GeForce NOW, Google sign-in) often break or refuse to run
  through any proxy of this kind, and some sites block data-center addresses. If you need those, a service-worker
  proxy such as Ultraviolet or Scramjet is the usual upgrade.
- Search engines may show a captcha when reached from a hosting provider. Switch engine in Settings > Proxy.
- Proxied sites share your site's origin (needed for the iframe windows). Do not log in to important accounts
  through a public copy, and do not put secrets in this site's own localStorage.
- A public proxy gets abused quickly. Consider putting the site behind a password or your host's access controls.
- Not carried over from the desktop version: Electron proxy rules, taskbar thumbnails of websites, Now Playing for
  the Spotify web player, and the Dev Console's "Open DevTools" (use F12 instead).
