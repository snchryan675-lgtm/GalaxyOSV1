// Jarvis: a voice assistant for Galaxy OS. Press Ctrl+H, talk ("open TikTok" or "Jarvis, open TikTok"), and it does it.
// Speech-to-text: the browser engine when it works, otherwise an offline-style Whisper model (downloads once from the internet).
window.Jarvis = (() => {
  let api = null, cfg = { enabled: true, name: 'Jarvis', voice: true, engine: 'auto' };
  let root = null, active = false, session = 0, hideT = null;
  let stream = null, actx = null, raf = 0;
  let whisperP = null;

  const CSS = `
  #jv{position:fixed;left:50%;bottom:96px;transform:translate(-50%,24px);z-index:9000;display:flex;flex-direction:column;align-items:center;gap:8px;
    opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;font-family:'Segoe UI',system-ui,sans-serif;--lv:0;--c:#5ad7ff}
  #jv.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
  #jv .orb{position:relative;width:132px;height:132px;display:flex;align-items:center;justify-content:center;cursor:pointer}
  #jv .orb i{position:absolute;border-radius:50%;border:2px solid var(--c);box-shadow:0 0 18px var(--c),inset 0 0 14px rgba(90,215,255,.45)}
  #jv .r1{inset:0;border-style:dashed;opacity:.8;animation:jvSpin 9s linear infinite}
  #jv .r2{inset:14px;border-top-color:transparent;border-bottom-color:transparent;animation:jvSpin 3.2s linear infinite reverse}
  #jv .r3{inset:30px;opacity:.9;transform:scale(calc(1 + var(--lv) * .35));transition:transform .06s}
  #jv .core{position:relative;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#eaffff;
    background:radial-gradient(circle,rgba(190,245,255,.95),rgba(90,215,255,.55) 60%,rgba(90,215,255,.15));box-shadow:0 0 calc(18px + var(--lv) * 40px) var(--c);transition:box-shadow .06s}
  #jv.think .r2{animation-duration:.9s}
  #jv.speak .core{animation:jvBeat .5s ease-in-out infinite alternate}
  #jv.err{--c:#ff7b8a}
  @keyframes jvSpin{to{transform:rotate(360deg)}}
  @keyframes jvBeat{to{transform:scale(1.18)}}
  #jv .box{min-width:240px;max-width:min(560px,86vw);padding:10px 18px;border-radius:14px;text-align:center;color:#eaffff;
    background:rgba(6,14,24,.82);border:1px solid rgba(90,215,255,.45);box-shadow:0 0 26px rgba(90,215,255,.25);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
  #jv .nm{font-size:11px;letter-spacing:.42em;color:var(--c);font-weight:700;text-transform:uppercase}
  #jv .st{font-size:13px;color:rgba(234,255,255,.7);margin-top:2px}
  #jv .sd{font-size:16px;margin-top:4px;min-height:1.2em}
  `;

  /* ---------- helpers ---------- */
  const $ = (s) => root.querySelector(s);
  function ensureUI() {
    if (root) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'jv';
    root.innerHTML = '<div class="orb" title="Click to stop"><i class="r1"></i><i class="r2"></i><i class="r3"></i><div class="core"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v4"/></svg></div></div><div class="box"><div class="nm"></div><div class="st"></div><div class="sd"></div></div>';
    document.body.appendChild(root);
    root.querySelector('.orb').addEventListener('click', () => stop());
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && active) stop(); }, true);
  }
  function ui(state, status, said) {
    ensureUI();
    clearTimeout(hideT);
    root.classList.add('on');
    root.classList.remove('think', 'speak', 'err');
    if (state) root.classList.add(state);
    $('.nm').textContent = cfg.name;
    if (status !== undefined) $('.st').textContent = status;
    if (said !== undefined) $('.sd').textContent = said;
  }
  function hideSoon(ms) { clearTimeout(hideT); hideT = setTimeout(() => { if (root) root.classList.remove('on'); }, ms); }
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function speak(text, then) {
    if (!cfg.voice || !('speechSynthesis' in window)) { if (then) then(); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const vs = speechSynthesis.getVoices();
      const v = vs.find((x) => /en-GB/i.test(x.lang) && /(daniel|george|ryan|male)/i.test(x.name)) || vs.find((x) => /en-GB/i.test(x.lang)) || vs.find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      u.rate = 1.02; u.pitch = .9;
      u.onend = u.onerror = () => { if (then) then(); };
      speechSynthesis.speak(u);
    } catch (e) { if (then) then(); }
  }
  function reply(text, isErr) {
    active = false; stopMeter(); releaseMic();
    ui(isErr ? 'err' : 'speak', isErr ? 'Sorry' : 'Done', text);
    speak(text, () => { if (root) root.classList.remove('speak'); hideSoon(1400); });
    hideSoon(Math.max(2600, text.length * 90));
  }

  /* ---------- microphone level meter ---------- */
  async function getMic() {
    if (stream && stream.active) return stream;
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    return stream;
  }
  function releaseMic() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } if (actx) { try { actx.close(); } catch (e) {} actx = null; } }
  function startMeter(s) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const an = actx.createAnalyser(); an.fftSize = 512;
      actx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128));
        if (root) root.style.setProperty('--lv', Math.min(1, m / 60).toFixed(2));
        raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {}
  }
  function stopMeter() { cancelAnimationFrame(raf); if (root) root.style.setProperty('--lv', 0); }

  /* ---------- speech to text ---------- */
  function listenBrowser(id) {
    return new Promise((resolve, reject) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return reject({ code: 'unsupported' });
      const r = new SR();
      r.lang = 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      let finalText = '', done = false;
      const end = (fn) => { if (done) return; done = true; try { r.stop(); } catch (e) {} fn(); };
      r.onresult = (e) => {
        let t = '';
        for (let i = 0; i < e.results.length; i++) { t += e.results[i][0].transcript; if (e.results[i].isFinal) finalText = t; }
        if (id === session) ui(undefined, 'Listening…', t);
      };
      r.onerror = (e) => end(() => reject({ code: e.error }));
      r.onend = () => end(() => resolve(finalText.trim()));
      listenBrowser.cancel = () => end(() => resolve(''));
      try { r.start(); } catch (e) { reject({ code: 'start' }); }
    });
  }

  function resample(f32, from, to) {
    if (from === to) return f32;
    const n = Math.round(f32.length * to / from), out = new Float32Array(n), k = from / to;
    for (let i = 0; i < n; i++) { const p = i * k, a = Math.floor(p), b = Math.min(f32.length - 1, a + 1), t = p - a; out[i] = f32[a] * (1 - t) + f32[b] * t; }
    return out;
  }
  // record until the person stops talking (simple energy detector)
  function recordUtterance(s, id) {
    return new Promise((resolve) => {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaStreamSource(s), proc = actx.createScriptProcessor(4096, 1, 1);
      const chunks = []; let spoke = false, quiet = 0, total = 0, floor = 0, n = 0, finished = false;
      const secs = (len) => len / actx.sampleRate;
      const finish = () => {
        if (finished) return; finished = true;
        try { proc.disconnect(); src.disconnect(); } catch (e) {}
        const all = new Float32Array(chunks.reduce((a, c) => a + c.length, 0)); let o = 0; chunks.forEach((c) => { all.set(c, o); o += c.length; });
        resolve(spoke ? resample(all, actx.sampleRate, 16000) : null);
      };
      recordUtterance.cancel = finish;
      proc.onaudioprocess = (e) => {
        if (id !== session) return finish();
        const d = new Float32Array(e.inputBuffer.getChannelData(0));
        let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
        const rms = Math.sqrt(sum / d.length);
        total += secs(d.length); chunks.push(d);
        if (n < 4) { floor = Math.max(floor, rms); n++; return; }          // measure the room noise first
        const thr = Math.max(0.015, floor * 2.6);
        if (rms > thr) { spoke = true; quiet = 0; } else if (spoke) quiet += secs(d.length);
        if (spoke && quiet > 1.0) finish();
        else if (!spoke && total > 6) finish();
        else if (total > 12) finish();
      };
      src.connect(proc); proc.connect(actx.destination);
    });
  }
  async function loadWhisper() {
    if (!whisperP) {
      whisperP = (async () => {
        const tf = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        tf.env.allowLocalModels = false;
        return tf.pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
      })().catch((e) => { whisperP = null; throw e; });
    }
    return whisperP;
  }
  async function listenWhisper(id) {
    const s = await getMic();
    ui(undefined, 'Listening…', '');
    const audio = await recordUtterance(s, id);
    if (id !== session) return '';
    if (!audio) return '';
    stopMeter();
    ui('think', whisperP ? 'Thinking…' : 'Loading the voice model (first time only, about 40 MB)…', '');
    const asr = await loadWhisper();
    if (id !== session) return '';
    ui('think', 'Thinking…', '');
    const out = await asr(audio);
    return String((out && out.text) || '').trim();
  }

  /* ---------- understanding what was said ---------- */
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  const norm = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9./: -]+/g, ' ').replace(/\s+/g, ' ').trim();
  function stripName(t) {
    const nm = norm(cfg.name);
    let w = t.split(' ');
    // allow "hey jarvis", "ok jarvis", "jarvis," and small mis-hearings of the name
    if (/^(hey|hi|hello|ok|okay|yo)$/.test(w[0]) && w.length > 1) { const x = w.slice(1); if (x[0] === nm || (nm.length > 3 && lev(x[0], nm) <= 2)) w = x; }
    if (w[0] === nm || (nm.length > 3 && lev(w[0], nm) <= (nm.length > 5 ? 2 : 1))) w = w.slice(1);
    return w.join(' ');
  }
  const SITES = { youtube: 'youtube.com', google: 'google.com', gmail: 'mail.google.com', drive: 'drive.google.com', 'google drive': 'drive.google.com', classroom: 'classroom.google.com', 'google classroom': 'classroom.google.com', canva: 'canva.com', discord: 'discord.com/app', reddit: 'reddit.com', github: 'github.com', twitch: 'twitch.tv', netflix: 'netflix.com', amazon: 'amazon.com', wikipedia: 'wikipedia.org', twitter: 'x.com', instagram: 'instagram.com', facebook: 'facebook.com', maps: 'maps.google.com', 'google maps': 'maps.google.com' };
  const ALIAS = { 'spotify': 'music', 'music': 'player', 'game': 'games', 'gaming': 'games', 'game hub': 'games', 'games': 'games', 'geforce now': 'gfn', 'geforce': 'gfn', 'nvidia': 'gfn', 'tik tok': 'tiktok', 'chat gpt': 'chatgpt', 'gpt': 'chatgpt', 'chat': 'chatgpt', 'console': 'devconsole', 'dev console': 'devconsole', 'dev tools': 'devconsole', 'developer console': 'devconsole', 'command line': 'terminal', 'shell': 'terminal', 'internet': 'browser', 'web': 'browser', 'web browser': 'browser', 'mario': 'sm64', 'super mario': 'sm64', 'mario 64': 'sm64', 'note': 'notes', 'notepad': 'notes', 'preferences': 'settings', 'options': 'settings', 'start': 'apps', 'app list': 'apps', 'all apps': 'apps' };
  function findApp(q) {
    q = norm(q).replace(/^(the|my|a|an)\s+/, '').replace(/\s+(app|application|window|please)$/, '');
    if (!q) return null;
    const apps = api.apps(), flat = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const f = flat(q);
    if (ALIAS[q]) { const a = apps.find((x) => x.id === ALIAS[q]); if (a) return a; }
    return apps.find((a) => flat(a.name) === f || a.id === f) || apps.find((a) => flat(a.name).startsWith(f) && f.length > 2) || apps.find((a) => f.length > 3 && flat(a.name).includes(f)) || null;
  }
  const SNAP = { left: [0, 0, .5, 1], right: [.5, 0, .5, 1], top: [0, 0, 1, .5], bottom: [0, .5, 1, .5], 'top left': [0, 0, .5, .5], 'top right': [.5, 0, .5, .5], 'bottom left': [0, .5, .5, .5], 'bottom right': [.5, .5, .5, .5], center: [1 / 6, 1 / 6, 2 / 3, 2 / 3], middle: [1 / 6, 1 / 6, 2 / 3, 2 / 3] };

  // returns {say, err} for what was heard
  function interpret(raw) {
    let t = stripName(norm(raw));
    t = t.replace(/\b(please|for me|right now|now|thanks|thank you)\b/g, ' ').replace(/^(can|could|would|will) you\s+/, '').replace(/^(i want you to|i need you to|i want to|i wanna|i would like to|lets|let us)\s+/, '').replace(/\s+/g, ' ').trim();
    if (!t) return { say: 'Yes? I am listening.' };
    let m;

    if (/^(hi|hello|hey|good (morning|afternoon|evening)|sup|yo)$/.test(t)) return { say: 'At your service.' };
    if (/^(thank|thanks|thank you|nice|great|cool|awesome)/.test(t)) return { say: 'Anytime.' };
    if (/^(who are you|what are you)/.test(t)) return { say: 'I am ' + cfg.name + ', the voice assistant built into Galaxy OS.' };
    if (/^(help|what can you do|what do you do)/.test(t)) return { say: 'Try: open TikTok, close the browser, search for cats, change theme to violet, next wallpaper, snap left, or what time is it.' };

    if ((m = /^(what time|whats the time|what is the time|tell me the time|time)/.exec(t))) return { say: 'It is ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.' };
    if (/^(what|whats|what is|tell me)( the)? (date|day)|^(date|today)$/.test(t)) return { say: 'Today is ' + new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + '.' };

    if (/^(shut ?down|power off|turn off|switch off)( the)?( computer| system| os| galaxy os| galaxy)?$/.test(t)) { setTimeout(() => api.power('shutdown'), 1200); return { say: 'Shutting down. Goodbye.' }; }
    if (/^(restart|reboot|reload)( the)?( computer| system| os| galaxy os| galaxy)?$/.test(t)) { setTimeout(() => api.power('restart'), 1200); return { say: 'Restarting.' }; }

    // windows
    if (/^(show|go to|go) (the )?desktop$|^(minimi[sz]e|hide) (all|everything|all windows|windows)$|^show desktop$/.test(t)) { api.desktop(); return { say: 'Showing the desktop.' }; }
    if (/^(close|quit|exit|kill|shut) (all|everything|all windows|every window)$/.test(t)) { api.closeWin('*'); return { say: 'Closing everything.' }; }
    if (/^(close|quit|exit) (this|that|it|the window|this window|current window|window)?$/.test(t)) { return api.closeWin(null) ? { say: 'Closed.' } : { say: 'There is no window to close.', err: true }; }
    if ((m = /^(close|quit|exit|kill|shut down|shut) (.+)$/.exec(t))) { const a = findApp(m[2]); if (!a) return { say: 'I could not find an app called ' + m[2] + '.', err: true }; return api.closeWin(a.id) ? { say: 'Closing ' + a.name + '.' } : { say: a.name + ' is not open.', err: true }; }
    if (/^(tile|arrange|organi[sz]e|tidy)( all| the)?( windows)?( in a grid)?$/.test(t)) { return api.arrange('grid') ? { say: 'Tiling your windows.' } : { say: 'There are no windows to arrange.', err: true }; }
    if ((m = /^(snap|put|move|dock)( this| it| the window| window)?( to| on| at)?( the)? (top left|top right|bottom left|bottom right|left|right|top|bottom|center|middle)( side| half)?$/.exec(t))) { return api.snap(SNAP[m[5]]) ? { say: 'Snapped ' + m[5] + '.' } : { say: 'There is no window to snap.', err: true }; }
    if (/^(maximi[sz]e|full ?screen|make it big)( this| it| the window| window)?$/.test(t)) { return api.snap(null) ? { say: 'Maximized.' } : { say: 'There is no window to maximize.', err: true }; }

    // look and feel
    if (/^(next|new|another|change|switch|random)( the)?( desktop)?( wallpaper| background)$|^(wallpaper|background)( next)?$/.test(t)) { const l = api.bgs(), i = l.indexOf(api.S().bg), n = l[(i + 1) % l.length]; api.set({ bg: n, customBg: '' }); return { say: 'Wallpaper changed.' }; }
    if ((m = /^(set |change |switch |use )?(the )?(wallpaper|background) (to )?(.+)$/.exec(t))) { const q = m[5].replace(/\s+/g, '-'), n = api.bgs().find((x) => x === q) || api.bgs().find((x) => x.startsWith(q)); if (!n) return { say: 'I do not have a wallpaper called ' + m[5] + '.', err: true }; api.set({ bg: n, customBg: '' }); return { say: 'Wallpaper set to ' + n + '.' }; }
    if ((m = /^(set |change |switch |use |make it )?(the )?(theme|color|colour)( to)? (.+)$/.exec(t)) || (m = /^(make it|switch to|change to|go) (.+) (mode|theme)$/.exec(t))) {
      const q = (m[5] || m[2]).replace(/\s+/g, '-'), l = api.themes(), n = l.find((x) => x === q) || l.find((x) => x.startsWith(q)) || l.find((x) => x.includes(q));
      if (!n) return { say: 'I do not have a theme called ' + (m[5] || m[2]) + '.', err: true };
      api.set({ theme: n }); return { say: 'Theme set to ' + n.replace(/-/g, ' ') + '.' };
    }
    if ((m = /^(turn |switch )?(the )?dynamic (theme|color|colour)( on| off)?$/.exec(t)) || (m = /^(turn )?(on|off) (the )?dynamic (theme|color|colour)$/.exec(t))) { const off = /off/.test(t); api.set({ dynTheme: !off }); return { say: 'Dynamic theme ' + (off ? 'off' : 'on') + '.' }; }

    // search / websites / apps
    if ((m = /^(search|google|look up|lookup|find|search for|search google for|look for)( for)? (.+)$/.exec(t))) { api.url(m[3]); return { say: 'Searching for ' + m[3] + '.' }; }
    if ((m = /^(open|launch|start|run|go to|show me|show|pull up|bring up|load|play|switch to|take me to|visit)( up)? (.+)$/.exec(t))) {
      const what = m[3].replace(/^(the|my|a)\s+/, '');
      const a = findApp(what);
      if (a) { api.open(a.id); return { say: 'Opening ' + a.name + '.' }; }
      const k = what.replace(/\s+(website|site|page|com)$/, '');
      if (SITES[k]) { api.url('https://' + SITES[k]); return { say: 'Opening ' + k + '.' }; }
      if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/.test(what.replace(/\s+dot\s+/g, '.').replace(/\s/g, ''))) { api.url(what.replace(/\s+dot\s+/g, '.').replace(/\s/g, '')); return { say: 'Opening ' + what + '.' }; }
      api.url(what); return { say: 'I could not find an app called ' + what + ', so I searched for it.' };
    }
    // just an app name ("tiktok")
    const only = findApp(t);
    if (only && t.length > 2) { api.open(only.id); return { say: 'Opening ' + only.name + '.' }; }
    return { say: 'Sorry, I did not catch that. Say help for ideas.', err: true };
  }

  /* ---------- session ---------- */
  function handle(text) {
    const r = interpret(text);
    ui(undefined, undefined, '“' + text + '”');
    reply(r.say, !!r.err);
    return r;
  }
  async function start() {
    if (!api) return;
    if (!cfg.enabled) { api.toast(cfg.name + ' is turned off (Settings > Jarvis)'); return; }
    if (active) { stop(); return; }
    ensureUI();
    active = true;
    const id = ++session;
    try { speechSynthesis.cancel(); } catch (e) {}
    ui(undefined, 'Starting microphone…', '');
    let s;
    try { s = await getMic(); }
    catch (e) { active = false; ui('err', 'Microphone blocked', 'Allow microphone access for Galaxy OS in Windows Settings > Privacy > Microphone.'); hideSoon(5000); return; }
    if (id !== session) return;
    startMeter(s);
    ui(undefined, 'Listening…', '');
    let text = '';
    try {
      const broken = (() => { try { return sessionStorage.getItem('jv.sr') === 'bad'; } catch (e) { return false; } })();
      const useBrowser = cfg.engine === 'browser' || (cfg.engine === 'auto' && !broken && (window.SpeechRecognition || window.webkitSpeechRecognition));
      if (useBrowser) {
        try { text = await listenBrowser(id); }
        catch (er) {
          if (cfg.engine === 'auto' && (er.code === 'network' || er.code === 'unsupported' || er.code === 'service-not-allowed' || er.code === 'start')) {
            try { sessionStorage.setItem('jv.sr', 'bad'); } catch (x) {}
            text = await listenWhisper(id);
          } else throw er;
        }
      } else text = await listenWhisper(id);
    } catch (er) {
      if (id !== session) return;
      active = false; stopMeter(); releaseMic();
      const code = er && (er.code || er.message);
      const msg = code === 'not-allowed' ? 'Microphone permission was denied.' : code === 'network' ? 'The browser speech service is unavailable. Set the engine to Whisper in Settings > Jarvis.' : 'Voice recognition failed. Check your internet connection (the voice model downloads the first time).';
      ui('err', 'Sorry', msg); hideSoon(6000);
      return;
    }
    if (id !== session) return;
    if (!text) { reply('I did not hear anything.', true); return; }
    handle(text);
  }
  function stop() {
    session++; active = false;
    try { if (listenBrowser.cancel) listenBrowser.cancel(); } catch (e) {}
    try { speechSynthesis.cancel(); } catch (e) {}
    stopMeter(); releaseMic();
    if (root) root.classList.remove('on');
  }

  return {
    init(a) {
      api = a;
      // Ctrl+H opens Jarvis (also when a website window has focus: the shell forwards Ctrl/Alt combos)
      addEventListener('keydown', (e) => { if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); e.stopPropagation(); start(); } }, true);
      if (window.galaxy && window.galaxy.onWebviewKey) window.galaxy.onWebviewKey((k) => { if (k && k.ctrl && !k.alt && !k.shift && !k.meta && String(k.key).toLowerCase() === 'h') start(); });
    },
    update(c) { if (c && typeof c === 'object') { cfg = Object.assign({ enabled: true, name: 'Jarvis', voice: true, engine: 'auto' }, c); cfg.name = String(cfg.name || 'Jarvis').trim().slice(0, 20) || 'Jarvis'; if (!cfg.enabled && active) stop(); } },
    start, stop, handle, interpret
  };
})();
