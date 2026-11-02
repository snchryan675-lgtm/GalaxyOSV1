// Animated wallpapers drawn on a canvas behind the desktop: live-stars, live-aurora, live-galaxy.
window.GalaxyLive = (() => {
  let canvas = null, ctx = null, raf = 0, scene = null, kind = null, W = 0, H = 0, last = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  function makeStars(n, big) {
    return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: rnd(.3, big ? 1.9 : 1.3), tw: rnd(0, TAU), sp: rnd(.6, 2.4), z: rnd(.2, 1), hue: Math.random() < .2 ? rnd(190, 330) : 215 }));
  }
  function drawStars(stars, t, dt, drift) {
    for (const s of stars) {
      s.x += drift * s.z * dt / W; if (s.x > 1) s.x -= 1;
      const a = .35 + .65 * (.5 + .5 * Math.sin(t * s.sp + s.tw));
      ctx.globalAlpha = a * (.4 + .6 * s.z);
      ctx.fillStyle = `hsl(${s.hue},70%,${s.r > 1.2 ? 92 : 82}%)`;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r * (.6 + s.z * .6), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const SCENES = {
    'live-stars'() {
      let stars = makeStars(420, true), shoot = [], nextShoot = 2;
      return {
        accent: { h: 215, s: .75, l: .66 },
        draw(t, dt) {
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04050f'); g.addColorStop(.6, '#0a1030'); g.addColorStop(1, '#1b1445');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          const neb = ctx.createRadialGradient(W * .7, H * .35, 0, W * .7, H * .35, W * .45); neb.addColorStop(0, 'rgba(120,70,220,.20)'); neb.addColorStop(1, 'rgba(120,70,220,0)');
          ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
          drawStars(stars, t, dt, 6);
          nextShoot -= dt;
          if (nextShoot <= 0) { nextShoot = rnd(2.5, 6); shoot.push({ x: rnd(.1, .9) * W, y: rnd(0, .4) * H, l: 0, v: rnd(900, 1400) }); }
          shoot = shoot.filter((s) => s.l < 1.2);
          for (const s of shoot) {
            s.l += dt * 1.6; const len = 160, k = s.l * s.v * .35, x = s.x + k * .8, y = s.y + k * .45;
            const gr = ctx.createLinearGradient(x, y, x - len * .8, y - len * .45); gr.addColorStop(0, `rgba(255,255,255,${Math.max(0, 1 - s.l)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = gr; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * .8, y - len * .45); ctx.stroke();
          }
        },
        resize() { stars = makeStars(Math.round(W * H / 3200), true); }
      };
    },

    'live-aurora'() {
      let stars = makeStars(260, false);
      const bands = [{ h: 150, a: .5, f: 1.3, s: .35, y: .36 }, { h: 175, a: .4, f: 1.9, s: -.28, y: .42 }, { h: 285, a: .3, f: 1.1, s: .22, y: .32 }];
      return {
        accent: { h: 155, s: .7, l: .62 },
        draw(t, dt) {
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#020913'); g.addColorStop(.7, '#07182a'); g.addColorStop(1, '#0b2236');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          drawStars(stars, t, dt, 2);
          ctx.globalCompositeOperation = 'lighter';
          for (const b of bands) {
            for (let x = 0; x < W; x += 3) {
              const nx = x / W;
              const wave = Math.sin(nx * 5 * b.f + t * b.s) * .5 + Math.sin(nx * 11 * b.f - t * b.s * 1.7) * .25 + Math.sin(nx * 2.3 + t * .15) * .5;
              const top = H * (b.y + wave * .09), bot = top + H * (.28 + .1 * Math.sin(nx * 7 * b.f + t * .6));
              const al = b.a * (.55 + .45 * Math.sin(nx * 17 + t * b.s * 2.2));
              const gr = ctx.createLinearGradient(0, top, 0, bot);
              gr.addColorStop(0, `hsla(${b.h},90%,65%,${al})`); gr.addColorStop(.35, `hsla(${b.h + 25},90%,55%,${al * .55})`); gr.addColorStop(1, `hsla(${b.h + 40},90%,50%,0)`);
              ctx.fillStyle = gr; ctx.fillRect(x, top, 4, bot - top);
            }
          }
          ctx.globalCompositeOperation = 'source-over';
          // dark hills at the bottom
          ctx.fillStyle = '#030b12'; ctx.beginPath(); ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * .86 + Math.sin(x * .004) * H * .04 + Math.sin(x * .011 + 2) * H * .02);
          ctx.lineTo(W, H); ctx.fill();
        },
        resize() { stars = makeStars(Math.round(W * H / 5000), false); }
      };
    },

    'live-galaxy'() {
      let bg = makeStars(300, true), parts = [];
      const build = () => {
        const n = Math.round(Math.min(4200, Math.max(1800, W * H / 450)));
        parts = Array.from({ length: n }, () => {
          const arm = Math.floor(Math.random() * 2), r = Math.pow(Math.random(), .65);
          const ang = r * 7.2 + arm * Math.PI + rnd(-.38, .38) * (1 - r * .4);
          return { r, a: ang, j: rnd(-.04, .04), s: Math.random() < .12 ? rnd(1.5, 2.4) : rnd(.6, 1.3), c: r };
        });
      };
      build();
      return {
        accent: { h: 275, s: .7, l: .66 },
        draw(t, dt) {
          const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .7); g.addColorStop(0, '#150a2a'); g.addColorStop(1, '#03020a');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          drawStars(bg, t, dt, 1.5);
          const R = Math.min(W, H) * .62, rot = t * .05;
          ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-.5); ctx.scale(1, .5);
          // glowing core
          const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * .3); cg.addColorStop(0, 'rgba(255,235,200,.95)'); cg.addColorStop(.25, 'rgba(255,170,230,.45)'); cg.addColorStop(1, 'rgba(160,80,255,0)');
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, R * .3, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          for (const p of parts) {
            const a = p.a + rot * (1.6 - p.r), rr = p.r * R + p.j * R;
            const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
            const h = p.c < .25 ? 40 + p.c * 120 : 205 + p.c * 120;      // warm centre -> blue/violet/pink arms
            ctx.fillStyle = `hsla(${h},85%,${p.c < .25 ? 78 : 68}%,${.75 - p.r * .35})`;
            ctx.fillRect(x, y, p.s, p.s);
          }
          ctx.restore();
          ctx.globalCompositeOperation = 'source-over';
        },
        resize() { build(); bg = makeStars(Math.round(W * H / 5000), true); }
      };
    }
  };

  function size() {
    if (!canvas) return;
    const k = Math.min(1, 1600 / Math.max(innerWidth, 1));          // keep the canvas light on big screens
    W = canvas.width = Math.round(innerWidth * k); H = canvas.height = Math.round(innerHeight * k);
    if (scene && scene.resize) scene.resize();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
    scene.draw(now / 1000, dt);
  }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; }

  function set(k) {
    const host = document.getElementById('bg');
    if (!k || !SCENES[k]) {
      stopLoop(); scene = null; kind = null;
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      return null;
    }
    if (k === kind && canvas) return scene.accent;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      host.appendChild(canvas); ctx = canvas.getContext('2d');
    }
    kind = k; scene = SCENES[k](); size();
    stopLoop(); last = performance.now(); raf = requestAnimationFrame(frame);
    return scene.accent;
  }
  addEventListener('resize', size);
  return { set, kinds: Object.keys(SCENES), accentOf: (k) => (SCENES[k] ? { h: ({ 'live-stars': 215, 'live-aurora': 155, 'live-galaxy': 275 })[k], s: .7, l: .64, gray: false } : null) };
})();
