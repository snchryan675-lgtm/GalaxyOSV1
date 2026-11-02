// Galaxy OS startup / shutdown animation.
//   GalaxyIntro.play(done)                          startup: neon streaks, the letters bounce in, the logo glows, fade out
//   GalaxyIntro.play({ mode: 'out', label }, done)  shutdown / restart: the same logo plays in reverse, then fades to black
// Click or press any key to skip. Turn the startup one off with `intro off` in the Terminal.
window.GalaxyIntro = (() => {
  let running = false;
  let boot = { text: 'Galaxy OS', image: '', sub: null };   // Settings > Boot logo

  const CSS = `
  @font-face{font-family:'Fredoka One';src:url('fonts/fredoka-one.woff2') format('woff2');font-weight:400;font-style:normal;font-display:block}
  #gxIntro{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;
    background:radial-gradient(ellipse at 50% 45%,#2a0f45 0%,#12071f 55%,#07030d 100%);opacity:1;transition:opacity .8s ease}
  #gxIntro.fadein{opacity:0}
  #gxIntro.out{opacity:0;pointer-events:none}
  #gxIntro .blk{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .9s ease;pointer-events:none}
  #gxIntro .blk.go{opacity:1}
  #gxIntro::before{content:"";position:absolute;inset:0;opacity:.35;
    background-image:linear-gradient(rgba(190,90,255,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(190,90,255,.10) 1px,transparent 1px);
    background-size:46px 46px;-webkit-mask-image:radial-gradient(ellipse at center,#000 10%,transparent 70%);mask-image:radial-gradient(ellipse at center,#000 10%,transparent 70%)}
  #gxIntro .stage{position:relative;width:min(94vw,1100px);height:min(44vh,340px);display:flex;align-items:center;justify-content:center}
  #gxIntro .word{display:flex;gap:.01em;font:400 1em/1 'Fredoka One','Baloo 2','Comic Sans MS','Segoe UI Black',sans-serif;font-size:clamp(46px,min(14vw,calc(88vw / (var(--n,9) * .6))),200px);
    transform:rotate(-3deg);filter:drop-shadow(0 0 12px rgba(255,90,255,.7)) drop-shadow(0 0 38px rgba(190,60,255,.6))}
  #gxIntro .word.pulse{animation:gxPulse 1.3s ease-in-out infinite alternate}
  @keyframes gxPulse{from{filter:drop-shadow(0 0 8px rgba(255,90,255,.55)) drop-shadow(0 0 24px rgba(190,60,255,.45))}to{filter:drop-shadow(0 0 18px rgba(255,150,255,.95)) drop-shadow(0 0 56px rgba(200,70,255,.85))}}
  /* each letter: white cartoon outline (the wrapper's own text) + a hard purple drop + a smooth pink gradient on top */
  #gxIntro .ch{position:relative;display:inline-block;white-space:pre;color:#fff;-webkit-text-stroke:.085em #fff;opacity:0;
    filter:drop-shadow(0 .035em 0 #7a25b8) drop-shadow(0 .07em 0 #4b157c);
    animation:gxBounce .8s cubic-bezier(.3,.7,.4,1) forwards,gxBob 1.5s ease-in-out infinite alternate;
    animation-delay:var(--d),calc(var(--d) + .9s)}
  #gxIntro .ch b{position:absolute;left:0;top:0;font-weight:400;-webkit-text-stroke:0;color:transparent;-webkit-text-fill-color:transparent;
    background:linear-gradient(180deg,#fff2ff 0%,#ff9cf5 38%,#e24bf0 70%,#a73be0 100%);-webkit-background-clip:text;background-clip:text}
  #gxIntro .ch.pic{display:block;max-height:min(38vh,300px);max-width:80vw;-webkit-text-stroke:0;filter:drop-shadow(0 0 16px rgba(255,120,255,.75))}
  #gxIntro .ch.stay{opacity:1;animation:gxBob 1.5s ease-in-out infinite alternate;animation-delay:var(--b)}
  #gxIntro .ch.leave{opacity:1;animation:gxLeave .75s cubic-bezier(.5,0,.8,.4) forwards;animation-delay:var(--o)}
  @keyframes gxBounce{
    0%{opacity:0;transform:translate(var(--x),-170px) scale(.35) rotate(var(--r))}
    45%{opacity:1;transform:translate(0,12px) scale(1.18,.82) rotate(0)}
    62%{transform:translateY(-14px) scale(.93,1.1)}
    80%{transform:translateY(3px) scale(1.04,.97)}
    100%{opacity:1;transform:none}}
  @keyframes gxBob{from{transform:translateY(0) rotate(-1.2deg)}to{transform:translateY(-.045em) rotate(1.2deg)}}
  @keyframes gxLeave{
    0%{opacity:1;transform:none}
    28%{transform:translateY(8px) scale(1.14,.84)}
    100%{opacity:0;transform:translate(var(--x),-190px) scale(.3) rotate(var(--r))}}
  #gxIntro .streak{position:absolute;height:12px;border-radius:8px;opacity:0;
    background:linear-gradient(90deg,transparent,#fff 35%,#ff9bff 70%,transparent);box-shadow:0 0 14px 3px rgba(255,120,255,.9),0 0 40px 8px rgba(190,60,255,.6);
    animation:gxStreak .75s ease-out forwards;animation-delay:var(--d)}
  @keyframes gxStreak{0%{opacity:0;transform:translateX(var(--sx)) rotate(var(--rot)) scaleX(.2)}25%{opacity:1}100%{opacity:0;transform:translateX(var(--ex)) rotate(var(--rot)) scaleX(1.3)}}
  #gxIntro .spark{position:absolute;width:var(--s);height:var(--s);opacity:0;pointer-events:none;
    background:#fff;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);filter:drop-shadow(0 0 6px #ff9bff);
    animation:gxSpark 1.6s ease-in-out infinite;animation-delay:var(--d)}
  @keyframes gxSpark{0%,100%{opacity:0;transform:scale(.2) rotate(0)}50%{opacity:1;transform:scale(1) rotate(90deg)}}
  #gxIntro .shine{position:absolute;top:0;bottom:0;width:18%;left:-30%;pointer-events:none;mix-blend-mode:screen;
    background:linear-gradient(100deg,transparent,rgba(255,255,255,.7),transparent);transform:skewX(-18deg);opacity:0}
  #gxIntro .shine.go{animation:gxShine .9s ease-in-out forwards}
  @keyframes gxShine{0%{left:-30%;opacity:0}15%{opacity:1}100%{left:120%;opacity:0}}
  #gxIntro .flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(255,200,255,.85),rgba(190,60,255,0) 55%);opacity:0;pointer-events:none}
  #gxIntro .flash.go{animation:gxFlash .5s ease-out forwards}
  @keyframes gxFlash{0%{opacity:.9}100%{opacity:0}}
  #gxIntro .sub{position:absolute;bottom:17%;left:0;right:0;text-align:center;font:400 15px 'Fredoka One','Segoe UI',system-ui,sans-serif;letter-spacing:.45em;text-transform:uppercase;color:rgba(255,190,255,0);transition:color .8s,letter-spacing 1.2s}
  #gxIntro .sub.on{color:rgba(255,190,255,.75);letter-spacing:.6em}
  @media (prefers-reduced-motion:reduce){#gxIntro .ch,#gxIntro .streak,#gxIntro .spark{animation-duration:.01s!important}}
  `;

  const rnd = (a, b) => a + Math.random() * (b - a);

  function play(opts, done) {
    if (typeof opts === 'function') { done = opts; opts = {}; }
    opts = opts || {};
    if (running) return;
    running = true;
    const out = opts.mode === 'out';
    const st = document.createElement('style');
    st.textContent = CSS;
    const root = document.createElement('div');
    root.id = 'gxIntro';
    const word = String(boot.text || 'Galaxy OS').slice(0, 16), n = word.length;
    const useImg = !!boot.image;
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const chars = useImg ? `<img class="ch pic${out ? ' stay' : ''}" id="gxc0" src="${esc(boot.image)}" alt="" style="--d:.55s;--o:.2s;--b:0s;--x:-120px;--r:-30deg">` : Array.from(word).map((c, i) => {
      const side = i % 2 ? 1 : -1, g = c === ' ' ? '&nbsp;' : esc(c);
      const x = Math.round(side * rnd(60, 240)), r = Math.round(side * rnd(15, 70)) + 'deg';
      const timing = out
        ? `--o:${(0.15 + (n - 1 - i) * 0.08).toFixed(2)}s;--b:${(i * 0.1).toFixed(2)}s`   // the letters leave in reverse order
        : `--d:${(0.5 + i * 0.09).toFixed(2)}s`;
      return `<span class="ch${out ? ' stay' : ''}" id="gxc${i}" style="${timing};--x:${x}px;--r:${r}">${g}<b>${g}</b></span>`;
    }).join('');
    let streaks = '';
    for (let i = 0; i < 7; i++) {
      const fromLeft = (i % 2 === 0) !== out, w = Math.round(rnd(160, 420));
      streaks += `<i class="streak" style="--d:${((out ? 0.9 : 0) + i * 0.07).toFixed(2)}s;width:${w}px;top:${Math.round(rnd(12, 88))}%;left:${Math.round(rnd(10, 70))}%;--rot:${Math.round(rnd(-38, -12))}deg;--sx:${fromLeft ? -300 : 300}px;--ex:${fromLeft ? 300 : -300}px"></i>`;
    }
    let sparks = '';
    for (let i = 0; i < 9; i++) sparks += `<i class="spark" style="--s:${Math.round(rnd(14, 30))}px;--d:${(out ? 0 : 1.3 + i * 0.17).toFixed(2)}s;left:${Math.round(rnd(4, 92))}%;top:${Math.round(rnd(6, 86))}%"></i>`;
    const label = esc(opts.label || (out ? 'Shutting down' : (boot.sub === null || boot.sub === undefined ? 'Desktop · Browser · Games' : boot.sub)));
    root.innerHTML = `<div class="stage">${streaks}${sparks}<div class="word" id="gxWord" style="--n:${n}">${chars}</div><div class="shine" id="gxShine"></div></div><div class="flash" id="gxFlash"></div><div class="sub" id="gxSub">${label}</div><div class="blk" id="gxBlk"></div>`;
    document.head.appendChild(st);
    if (out) root.classList.add('fadein');
    document.body.appendChild(root);

    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const q = (id) => root.querySelector('#' + id);
    let finished = false;
    const cleanup = () => { removeEventListener('keydown', skip, true); timers.forEach(clearTimeout); };
    function finish(keep) {
      if (finished) return;
      finished = true;
      cleanup();
      const end = () => { if (!keep) { root.remove(); st.remove(); } running = false; if (typeof done === 'function') done(); };
      if (keep) { q('gxBlk').classList.add('go'); setTimeout(end, 250); return; }
      root.classList.add('out');
      setTimeout(end, 820);
    }
    function skip() { finish(out); }
    root.addEventListener('click', skip);
    addEventListener('keydown', skip, true);

    // the logo shows up as soon as the cartoon font is ready, so the first frame is never the wrong font
    const ready = (document.fonts && document.fonts.load) ? Promise.race([document.fonts.load("1em 'Fredoka One'"), new Promise((r) => setTimeout(r, 700))]) : Promise.resolve();
    ready.then(() => {
      if (finished) return;
      if (!out) {
        at(1500, () => q('gxFlash').classList.add('go'));                                   // all letters have landed
        at(1600, () => { q('gxWord').classList.add('pulse'); q('gxShine').classList.add('go'); q('gxSub').classList.add('on'); });
        at(3400, () => finish(false));
      } else {
        requestAnimationFrame(() => root.classList.remove('fadein'));                       // fade the logo in
        q('gxWord').classList.add('pulse'); q('gxSub').classList.add('on');
        at(700, () => q('gxShine').classList.add('go'));
        at(900, () => root.querySelectorAll('.ch').forEach((c) => { c.classList.remove('stay'); c.classList.add('leave'); })); // letters fly away, last one first
        at(2200, () => { q('gxBlk').classList.add('go'); q('gxSub').classList.remove('on'); });  // then fade everything to black
        at(3200, () => finish(true));
      }
    });
  }
  return { play, config(b) { if (b && typeof b === 'object') boot = { text: String(b.text || 'Galaxy OS').slice(0, 16), image: typeof b.image === 'string' && /^data:image\//.test(b.image) ? b.image : '', sub: b.sub === undefined ? null : b.sub }; } };
})();
