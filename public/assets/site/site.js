(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll + nav ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const t = id === '#top' ? document.body : $(id);
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(id === '#top' ? 0 : t, { duration: 1.4, offset: -80 }) : (id === '#top' ? scrollTo({ top: 0, behavior: 'smooth' }) : t.scrollIntoView({ behavior: 'smooth' }));
  }));
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 20);
  const burger = $('.burger');
  if (burger) {
    burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
    $$('.menu a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); }));
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* =====================================================================
     Pixel engine: each scene returns a brightness 0..1 per low-res pixel;
     we map it onto the palette with a 4x4 ordered (Bayer) dither.
     ===================================================================== */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const RAMP = ['#060607', '#0A1A4F', '#0054FF', '#8FA8FF', '#E8EFEA'].map(hex);
  const RAMPS = {
    dark: RAMP,
    // inverted, for pixel art on the light accordion panel
    light: ['#E8EFEA', '#C9D6FF', '#7E9BFF', '#0054FF', '#0A1A4F'].map(hex),
    // pale blues, for the closing card
    sky: ['#AFC2FF', '#8FA8FF', '#BFD0FF', '#DCE5FF', '#F2F5FF'].map(hex)
  };
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function pixel(canvas, scene, { px = 4, fps = 24, ramp = RAMP } = {}) {
    const ctx = canvas.getContext('2d');
    const st = { mx: -9, my: -9, hover: 0 };
    let w = 0, h = 0, img = null, visible = false, last = 0;
    function size() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(8, Math.ceil(r.width / px)); h = Math.max(8, Math.ceil(r.height / px));
      canvas.width = w; canvas.height = h;
      img = ctx.createImageData(w, h);
      scene.init && scene.init(w, h, st);
      if (reduce) draw(0);
    }
    function draw(t) {
      const d = img.data, n = ramp.length - 1, glow = !scene.ownGlow;
      scene.frame && scene.frame(t, st, w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let L = scene.fn(x, y, w, h, t, st);
          if (glow && st.mx > -1) {
            const gx = x - st.mx * w, gy = y - st.my * h, g = Math.exp(-(gx * gx + gy * gy) / (w * 3));
            L += g * (L > .05 ? .38 : .14);
          }
          L = L < 0 ? 0 : L > 1 ? 1 : L;
          const s = L * n, i = s | 0, c = ramp[Math.min(n, i + ((s - i) > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0))];
          const o = (y * w + x) * 4;
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    const host = canvas.closest('.hero-frame, .cta') || canvas;
    host.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); st.mx = (e.clientX - r.left) / r.width; st.my = (e.clientY - r.top) / r.height; });
    host.addEventListener('pointerleave', () => { st.mx = st.my = -9; });
    st.ripples = [];
    host.addEventListener('pointerdown', e => {
      if (e.target.closest('a, button')) return;
      const r = canvas.getBoundingClientRect();
      st.ripples.push({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, t0: performance.now() / 1000 });
      if (st.ripples.length > 4) st.ripples.shift();
      st.pulse = 1;
    });
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    size();
    canvas._st = st;
    if (!reduce) gsap.ticker.add(() => {
      const now = performance.now();
      if (!visible || now - last < 1000 / fps) return;
      last = now; draw(now / 1000);
    });
    return st;
  }

  /* ---------- scenes ---------- */
  const SCENES = {
    // a lit model-orb with a turning grid and an orbit ring, over a glowing horizon.
    // it leans toward the cursor, lights from it, spins its ring faster when you're near, and ripples where you click
    orb: {
      frame(t, st, w, h) {
        const on = st.mx > -1, tx = on ? st.mx : .5, ty = on ? st.my : .4;
        st.sx = st.sx === undefined ? tx : st.sx + (tx - st.sx) * .08;
        st.sy = st.sy === undefined ? ty : st.sy + (ty - st.sy) * .08;
        st.near = (st.near || 0) + ((on ? Math.max(0, 1 - Math.hypot(tx - .5, (ty - .3) * h / w) * 2.2) : 0) - (st.near || 0)) * .06;
        st.pulse = Math.max(0, (st.pulse || 0) - .03);
        const dt = st.lt === undefined ? 0 : t - st.lt; st.lt = t;
        st.spin = (st.spin || 0) + dt * (1.6 + 4 * st.near);
        st.live = (st.ripples || []).filter(r => t - r.t0 < 2.2);
      },
      fn(x, y, w, h, t, st) {
        const tall = h > w, ox = (st.sx - .5) * w * .05, oy = (st.sy - .4) * h * .04;
        const cx = w * .5 + ox, cy = h * (tall ? .13 : .24) + oy, R = (tall ? w * .2 : Math.min(w, h) * .17) * (1 + .05 * st.pulse);
        const u = (x - cx) / R, v = (y - cy) / R, d2 = u * u + v * v;
        let L = 0;
        // stars at three depths, each layer shifting with the cursor
        const hs = hash(x, y);
        if (hs > .993) {
          const dep = hash(y, x), px = Math.round(x - (st.sx - .5) * 18 * dep), py = Math.round(y - (st.sy - .5) * 12 * dep);
          if (hash(px, py) > .993 || dep < .4) L = .3 + .45 * (.5 + .5 * Math.sin(t * 2 + hs * 40));
        }
        // horizon glow and contour lines below it
        const hz = h * .9;
        if (y > hz - 30) {
          L = Math.max(L, .38 * Math.exp(-((y - hz) ** 2) / 40));
          if (y > hz) {
            const k = (y - hz) / (h - hz), ln = Math.sin((1 / (k + .05)) * 3 - t * 1.4 + Math.sin(x * .03 + t * .2) * .6);
            if (ln > .93) L = Math.max(L, .28 + .3 * k);
          }
        }
        // orbit ring, tilted by the cursor
        const a = .32 + (st.sx - .5) * .5, ru = u * Math.cos(a) + v * Math.sin(a), rv = -u * Math.sin(a) + v * Math.cos(a);
        const sq = .42 + (st.sy - .4) * .35, e = Math.sqrt((ru / 1.75) ** 2 + (rv / sq) ** 2);
        const ringOn = Math.abs(e - 1) < .03, ang = Math.atan2(rv / sq, ru / 1.75);
        const dash = .55 + .45 * Math.sin(ang * 9 - st.spin);
        if (ringOn && rv < 0) L = Math.max(L, .5 * dash);
        if (d2 < 1) {
          const z = Math.sqrt(1 - d2);
          const lx = -.45 + (st.sx - .5) * 1.4, ly = -.6 + (st.sy - .4) * 1.1, lz = .66;
          const ll = Math.hypot(lx, ly, lz), dif = Math.max(0, (u * lx + v * ly + z * lz) / ll);
          const spec = Math.pow(Math.max(0, z * .9 + dif * .1), 28);
          const lon = Math.atan2(u, z) + t * .35 + st.spin * .08, lat = Math.asin(v);
          const grid = (Math.abs(Math.sin(lon * 6)) < .07 || Math.abs(Math.sin(lat * 6)) < .07) ? .16 : 0;
          L = .1 + .62 * dif + .45 * spec + grid * dif + .14 * st.pulse + .08 * st.near;
          L *= sm(1.02, .92, Math.sqrt(d2)) * .25 + .75;
        } else {
          L = Math.max(L, (.3 + .2 * st.near + .4 * st.pulse) * Math.exp(-(Math.sqrt(d2) - 1) * 5));
        }
        if (ringOn && rv >= 0) L = Math.max(L, .82 * dash);
        // click ripples: a bright pixel ring expanding and fading
        for (const r of st.live || []) {
          const age = t - r.t0, rad = age * w * .35, d = Math.hypot(x - r.x * w, y - r.y * h);
          const band = Math.abs(d - rad);
          if (band < 2.2) L = Math.max(L, (1 - age / 2.2) * (band < 1 ? .95 : .55));
          else if (d < rad && hash(x, y + Math.floor(age * 20)) > .985) L = Math.max(L, .4 * (1 - age / 2.2));
        }
        return L;
      }
    },
    // hero: the same stream of requests goes to a big general model (left) and your small trained one (right).
    // the big one is slow, its queue piles up and it gets more wrong; yours answers at once and gets more right.
    // clicking sends a burst of extra requests to both.
    duel: {
      ownGlow: true,
      frame(t, st, w, h) {
        if (!st.sim) {
          st.sim = { last: t, nextSpawn: t, tasks: [], out: [], seen: 0,
            m: [ { busyUntil: 0, q: [], n: 0, ok: 0, service: 1.7, acc: .64 }, { busyUntil: 0, q: [], n: 0, ok: 0, service: .085, acc: .86 } ] };
        }
        const S = st.sim, dt = Math.min(.1, t - S.last); S.last = t;
        const tall = h > w;
        const M = [
          { x: w * (tall ? .3 : .27), y: h * (tall ? .2 : .3), R: tall ? w * .15 : Math.min(w, h) * .19 },
          { x: w * (tall ? .75 : .73), y: h * (tall ? .2 : .3), R: tall ? w * .065 : Math.min(w, h) * .085 }
        ];
        st.M = M;
        const spawn = () => { const id = Math.random(); for (let k = 0; k < 2; k++) S.tasks.push({ k, x: M[k].x + (Math.random() - .5) * M[k].R * .6, y: -2, id }); };
        if (t >= S.nextSpawn) { spawn(); S.nextSpawn = t + .55; }
        // clicks become bursts
        const rs = st.ripples || [];
        while (S.seen < rs.length) { for (let i = 0; i < 8; i++) setTimeout(spawn, i * 60); S.seen++; }
        if (rs.length < S.seen) S.seen = rs.length;
        // move incoming requests; on arrival they join the model's queue
        for (const q of S.tasks) q.y += dt * h * .55;
        S.tasks = S.tasks.filter(q => {
          const m = M[q.k], top = m.y - m.R - 1;
          if (q.y >= top - S.m[q.k].q.length * 2.4) { S.m[q.k].q.push(1); return false; }
          return true;
        });
        // serve
        S.m.forEach((sm, k) => {
          if (sm.q.length && t >= sm.busyUntil) {
            sm.q.shift(); sm.busyUntil = t + sm.service; sm.n++;
            // an even pattern of right and wrong, so the running rate tracks 64% and 86% from the start
            sm.carry = (sm.carry || 0) + sm.acc; const ok = sm.carry >= 1; if (ok) { sm.ok++; sm.carry -= 1; }
            const a = (k ? 1 : -1) * (.4 + Math.random() * .9);
            S.out.push({ x: M[k].x, y: M[k].y + M[k].R * .6, vx: Math.sin(a) * w * .12, vy: h * (.18 + Math.random() * .12), ok, born: t });
          }
          sm.busy = t < sm.busyUntil;
          if (sm.q.length > 60) sm.q.length = 60;
        });
        for (const o of S.out) { o.x += o.vx * dt; o.y += o.vy * dt; if (!o.ok) o.vy += h * .6 * dt; }
        S.out = S.out.filter(o => t - o.born < 1.6 && o.y < h);
        // particle layer
        if (!st.ov || st.ov.length !== w * h) st.ov = new Float32Array(w * h);
        st.ov.fill(0);
        const plot = (x, y, v) => { x |= 0; y |= 0; if (x >= 0 && x < w && y >= 0 && y < h && st.ov[y * w + x] < v) st.ov[y * w + x] = v; };
        for (const q of S.tasks) { plot(q.x, q.y, .7); plot(q.x, q.y - 1, .35); }
        S.m.forEach((sm, k) => { const m = M[k]; for (let i = 0, cap = Math.max(0, Math.floor((m.y - m.R - 4) / 2.4)); i < Math.min(sm.q.length, cap); i++) { plot(m.x - 1, m.y - m.R - 2 - i * 2.4, .62); plot(m.x, m.y - m.R - 2 - i * 2.4, .62); } });
        for (const o of S.out) { const f = 1 - (t - o.born) / 1.6; plot(o.x, o.y, o.ok ? .98 * f + .02 : .26 * f); if (o.ok) plot(o.x - Math.sign(o.vx), o.y - 1, .5 * f); }
        // live labels, a few times a second
        if (!st.lu || t - st.lu > .25) {
          st.lu = t;
          S.m.forEach((sm, k) => {
            const set = (key, v) => { const el = document.querySelector(`[data-k="${key}"]`); if (el) el.textContent = v; };
            set(`n${k}`, sm.n); set(`p${k}`, sm.n ? Math.round(100 * sm.ok / sm.n) + '%' : '–'); set(`q${k}`, sm.q.length);
          });
        }
        st.live = rs.filter(r => t - r.t0 < 2);
      },
      fn(x, y, w, h, t, st) {
        const M = st.M; if (!M) return 0;
        let L = hash(x, y) > .994 ? .22 + .2 * Math.sin(t * 2 + hash(y, x) * 30) : 0;
        const hov = st.mx > -1 ? M.map(m => Math.hypot(st.mx * w - m.x, st.my * h - m.y) < m.R * 1.4 ? 1 : 0) : [0, 0];
        M.forEach((m, k) => {
          const u = (x - m.x) / m.R, v = (y - m.y) / m.R, d2 = u * u + v * v, d = Math.sqrt(d2), sm = st.sim.m[k];
          if (d2 < 1) {
            const z = Math.sqrt(1 - d2), dif = Math.max(0, -u * .45 - v * .6 + z * .66), lon = Math.atan2(u, z) + t * (k ? .9 : .12), lat = Math.asin(v);
            const grid = Math.abs(Math.sin(lon * (k ? 4 : 9))) < .06 || Math.abs(Math.sin(lat * (k ? 4 : 9))) < .06;
            if (k === 0) L = .17 + .3 * dif - (grid ? .07 : 0) + .1 * hov[0];          // big: dim, dull, heavy grid
            else L = .3 + .42 * dif + .4 * Math.pow(z, 10) + (grid ? .12 : 0) + (sm.busy ? .12 : 0) + .15 * hov[1]; // yours: bright, crisp
          } else {
            L = Math.max(L, (k ? .42 : .06) * Math.exp(-(d - 1) * (k ? 3 : 6)) * (1 + hov[k] * .6));
            // "thinking" spinner around a model while it works
            if (sm.busy && Math.abs(d - 1.18) < (k ? .12 : .05)) {
              let a = Math.atan2(v, u) - t * (k ? 14 : 2.4); a = ((a % 6.283) + 6.283) % 6.283;
              if (a < 1.4) L = Math.max(L, .75 * (1 - a / 1.4));
            }
          }
        });
        return Math.max(L, st.ov ? st.ov[y * w + x] : 0);
      }
    },
    // log lines stream from the left and get absorbed into the orb on the right
    logs: {
      fn(x, y, w, h, t) {
        const tall = h > w, cx = w * (tall ? .7 : .74), cy = h * (tall ? .2 : .5), R = tall ? w * .22 : Math.min(w, h) * .26;
        const u = (x - cx) / R, v = (y - cy) / R, d2 = u * u + v * v;
        let L = 0;
        const row = Math.floor(y / 5);
        if (y % 5 < 2 && x < cx - R * .2) {
          const sp = 18 + hash(row, 1) * 22, off = (x - t * sp + hash(row, 2) * 400);
          const seg = Math.floor(off / 14), on = hash(seg, row) > .42 && (off % 14) < 10;
          if (on) L = (.22 + .4 * hash(seg, row + 9)) * sm(cx - R * .2, w * .05, x) * (row % 7 === 3 ? 1.7 : 1);
          // keep the copy readable: the lines fade out behind the headline, lower left
          L *= 1 - .95 * sm(h * (tall ? .25 : .3), h * (tall ? .35 : .42), y) * sm(w * (tall ? 1.2 : .62), w * (tall ? .9 : .5), x);
        }
        if (d2 < 1) {
          const z = Math.sqrt(1 - d2), dif = Math.max(0, (-u * .5 - v * .55 + z * .67));
          const lon = Math.atan2(u, z) + t * .4, lat = Math.asin(v);
          const grid = (Math.abs(Math.sin(lon * 5)) < .08 || Math.abs(Math.sin(lat * 5)) < .08) ? .2 : 0;
          L = .12 + .7 * dif + grid * dif;
        } else L = Math.max(L, .28 * Math.exp(-(Math.sqrt(d2) - 1) * 4));
        return L;
      }
    },
    // hero panorama: layered pixel mountains (the frontier) and a small bright model rising over them
    dawn: {
      frame(t, st) { if (st.t0 === undefined) st.t0 = t; const k = Math.min(1, (t - st.t0) / 4.5); st.rise = 1 - Math.pow(1 - k, 3); },
      fn(x, y, w, h, t, st) {
        const hy = h * .6, mx = st.mx > -1 ? st.mx - .5 : 0;
        const R = Math.min(w * .2, h * .17), ox = w * (.64 + mx * .04), oy = hy + R * .3 - R * 1.25 * (st.rise || 0) + Math.sin(t * .6) * 1.2;
        const dx = (x - ox) / w, dy = (y - oy) / h;
        let L = .3 * Math.exp(-(dx * dx * 40 + dy * dy * 30));
        if (y < hy && hash(x, y) > .993) L = Math.max(L, .3 + .3 * Math.sin(t * 2 + hash(y, x) * 30));
        const d = Math.hypot(x - ox, y - oy) / R;
        if (d < 1) L = .66 + .34 * (1 - d * d);
        else if (d < 1.12) L = Math.max(L, .5);
        // three ridges, far to near; nearer ones cover farther ones and catch the orb's light on their crest
        for (let i = 0; i < 3; i++) {
          const par = mx * (i + 1) * 26, f = .0065 + i * .004, amp = h * (.07 + i * .035), base = hy + i * h * .085;
          const X = x + par;
          const ridge = base - amp * (.55 + .3 * Math.sin(X * f * 6.28 + i * 2.1) + .15 * Math.sin(X * f * 15 + i));
          if (y >= ridge) {
            const lit = Math.exp(-Math.abs(x - ox) / (w * (.16 + i * .04)));
            let l = [.2, .11, .045][i];
            if ((y - ridge) % (7 + i * 4) < 1) l += .07 * (1 - i * .3);
            if (y - ridge < 1.4) l = .24 + .66 * lit * (1 - i * .22);
            L = l;
          }
        }
        return L;
      }
    },
    // "four steps" backdrop, one motif per step, kept dim so the cards stay readable
    steps: {
      fn(x, y, w, h, t, st) {
        const v = this.raw(x, y, w, h, t, st), cx = (x / w - .5) * 2, cy = (y / h - .5) * 2;
        return v * (.55 - .3 * Math.exp(-(cx * cx * 2 + cy * cy * 3)));
      },
      raw(x, y, w, h, t, st) {
        const s = st.step || 0, star = hash(x, y) > .995 ? .16 : 0;
        if (s === 0) {
          // conversations drifting in from both sides toward the middle
          const row = Math.floor(y / 6); if (y % 6 > 1) return star;
          const side = x < w / 2 ? 1 : -1, sp = 14 + hash(row, 1) * 18, off = side * (x - (side > 0 ? 0 : w)) - t * sp + hash(row, 3) * 300;
          const seg = Math.floor(off / 16), on = hash(seg, row) > .5 && ((off % 16) + 16) % 16 < 11;
          return on ? .2 + .18 * hash(seg, row + 4) : star;
        }
        if (s === 1) {
          // graded columns rising and settling, the goal line across them
          const col = Math.floor(x / 9); if (x % 9 > 5) return star;
          const target = .2 + .45 * hash(col, 11), v = target * (.8 + .2 * Math.sin(t * 1.4 + col));
          const top = h * (1 - v);
          if (Math.abs(y - h * .32) < .6) return .34;
          return y > top ? .14 + .2 * (1 - (y - top) / h) : star;
        }
        if (s === 2) {
          // a score climbing in steps, area filled beneath
          const X = x / w, ph = (t * .12) % 1, lvl = Math.floor(X * 8) / 8;
          const curve = h * (.9 - .65 * Math.pow(lvl, .8));
          if (X > ph + .1) return star;
          if (Math.abs(y - curve) < 1) return .46;
          return y > curve ? .1 + .14 * (1 - (y - curve) / h) : star;
        }
        // requests streaming in, replies racing out
        const row = Math.floor(y / 5); if (y % 5 !== 1) return star;
        const inbound = row % 2 === 0, sp = inbound ? 30 + hash(row, 2) * 30 : 90 + hash(row, 2) * 80, len = inbound ? 18 : 30;
        const p = ((t * sp + hash(row, 5) * w * 2) % (w + len * 2)) - len, dxp = p - x;
        return dxp > 0 && dxp < len ? (inbound ? .2 : .36) * (1 - dxp / len) : star;
      }
    },
    // copy: blocks assembling into a little world
    build: {
      fn(x, y, w, h, t) {
        const c = 6, gx = Math.floor(x / c), gy = Math.floor(y / c), cols = Math.ceil(w / c), rows = Math.ceil(h / c);
        const ht = Math.floor(rows * (.5 + .45 * hash(gx, 3)));
        const phase = (t * .25 + hash(gx, 9) * .3) % 1.4;
        const built = Math.floor(ht * Math.min(1, phase / .9));
        if (rows - gy <= built) {
          const edge = x % c === 0 || y % c === 0;
          return edge ? .12 : (gy === rows - built ? .62 : .3 + .12 * hash(gx, gy));
        }
        return hash(x, y) > .995 ? .2 : 0;
      }
    },
    // test: a wall of tests, each flipping from waiting to passed
    exam: {
      fn(x, y, w, h, t) {
        const c = 8, gx = Math.floor(x / c), gy = Math.floor(y / c);
        if (x % c > 5 || y % c > 5) return 0;
        const at = hash(gx, gy) * 6, cyc = t % 7;
        const scan = Math.abs(gx - ((t * 6) % (w / c))) < .6;
        return cyc > at ? .58 : (scan ? .4 : .14);
      }
    },
    // train: a score climbing past the goal line
    climb: {
      fn(x, y, w, h, t) {
        const X = x / w, ph = (t * .16) % 1.2;
        const v = 1 - Math.exp(-X * 3.2), curve = h * (.92 - .78 * v);
        if (Math.abs(y - h * .3) < .6 && x % 4 < 2) return .5;
        if (X > ph) return hash(x, y) > .995 ? .2 : 0;
        if (Math.abs(y - curve) < 1.1) return .9;
        return y > curve ? .12 + .3 * (1 - (y - curve) / (h - curve + 1)) : (hash(x, y) > .995 ? .2 : 0);
      }
    },
    // watch: a radar sweep, new releases blipping as it passes
    radar: {
      fn(x, y, w, h, t) {
        const cx = w * .62, cy = h * .62, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), R = Math.min(w, h) * .55;
        if (r > R) return hash(x, y) > .996 ? .2 : 0;
        let a = Math.atan2(dy, dx) - t * 1.2; a = ((a % 6.283) + 6.283) % 6.283;
        let L = Math.abs((r / R) * 4 - Math.round((r / R) * 4)) < .05 ? .22 : 0;
        L = Math.max(L, .45 * Math.exp(-a * 2.4));
        for (let i = 0; i < 5; i++) {
          const ba = hash(i, 1) * 6.283, br = R * (.25 + .6 * hash(i, 2)), bx = cx + Math.cos(ba) * br, by = cy + Math.sin(ba) * br;
          let ag = ba - t * 1.2; ag = ((ag % 6.283) + 6.283) % 6.283;
          if (Math.abs(x - bx) < 1.6 && Math.abs(y - by) < 1.6) L = Math.max(L, .3 + .65 * Math.exp(-(6.283 - ag) * 1.2));
        }
        return L;
      }
    },
    // github stars: a constellation that twinkles, one star brighter than the rest
    stars: {
      fn(x, y, w, h, t) {
        const hs = hash(x, y);
        if (hs > .985) return .25 + .5 * (.5 + .5 * Math.sin(t * 2.5 + hs * 60));
        const cx = w * .72, cy = h * .45, d = Math.hypot(x - cx, y - cy);
        if (d < 2) return 1;
        if ((Math.abs(x - cx) < 1 && Math.abs(y - cy) < 5) || (Math.abs(y - cy) < 1 && Math.abs(x - cx) < 5)) return .8 * (.6 + .4 * Math.sin(t * 3));
        return .12 * Math.exp(-d / 10);
      }
    },
    // practice worlds: two small planets slowly turning
    worlds: {
      fn(x, y, w, h, t) {
        let L = hash(x, y) > .993 ? .25 : 0;
        [[.34, .5, .3, 0], [.72, .46, .22, 2]].forEach(([px, py, r, ph]) => {
          const R = h * r * 1.4, u = (x - w * px) / R, v = (y - h * py) / R, d2 = u * u + v * v;
          if (d2 < 1) {
            const z = Math.sqrt(1 - d2), dif = Math.max(0, -u * .6 - v * .5 + z * .6), lon = Math.atan2(u, z) + t * .5 + ph;
            L = .14 + .62 * dif + (Math.abs(Math.sin(lon * 4)) < .12 ? .18 * dif : 0);
          }
        });
        return L;
      }
    },
    // downloads: pixels falling into a growing pile
    rain: {
      fn(x, y, w, h, t) {
        const col = Math.floor(x / 3);
        if (x % 3 === 0) return 0;
        const pile = h * (.82 - .22 * (.5 + .5 * Math.sin(col * .4 + t * .15)));
        if (y > pile) return .32 + .22 * hash(col, Math.floor(y / 3));
        const sp = 18 + hash(col, 1) * 30, p = (t * sp + hash(col, 2) * h * 3) % (h * 1.6);
        const dy = p - y;
        return dy > 0 && dy < 4 ? .9 - dy * .15 : (hash(x, y) > .996 ? .2 : 0);
      }
    },
    // two bars: the frontier bill (mint) and yours (blue) shrinking to a tenth
    bars: {
      fn(x, y, w, h, t) {
        // yours shrinks from the frontier's height to a tenth of it, and back
        const k = .5 + .5 * Math.sin(t * .8), ky = 1 - .9 * sm(.1, .9, k);
        const base = h * .86, top = h * .14, H = base - top;
        let L = hash(x, y) > .996 ? .3 : 0;
        if (y > base && y < base + 1) L = .3;
        if (x > w * .5 && x < w * .66 && y < base && y > base - H) L = .78 + .22 * ((y - top) / H);
        const yh = H * ky;
        if (x > w * .76 && x < w * .92 && y < base && y > base - yh) L = .45 + .15 * hash(x, Math.floor(y / 3));
        return L;
      }
    },
    // speed streaks racing left to right
    streaks: {
      fn(x, y, w, h, t) {
        const row = Math.floor(y / 4);
        if (y % 4 !== 1) return hash(x, y) > .996 ? .3 : 0;
        const sp = 40 + hash(row, 3) * 120, len = 10 + hash(row, 4) * 40;
        const p = ((t * sp + hash(row, 5) * w * 3) % (w + len * 2)) - len;
        const dx = p - x;
        if (dx > 0 && dx < len) return (1 - dx / len) * (row % 5 === 0 ? 1 : .62);
        return 0;
      }
    },
    // a target: rings, with hits clustering in the middle
    target: {
      fn(x, y, w, h, t) {
        const cx = w * .62, cy = h * .46, r = Math.hypot(x - cx, y - cy), R = Math.min(w, h) * .42;
        let L = hash(x, y) > .996 ? .3 : 0;
        const ring = r / R * 5;
        if (r < R && Math.abs(ring - Math.round(ring)) < .09) L = .32;
        if (r < R * .2) L = Math.max(L, .5);
        for (let i = 0; i < 14; i++) {
          const ph = (t * .5 + i / 14) % 1, a = hash(i, 7) * 6.28, rr = R * (.03 + .16 * hash(i, 8)) * (1 + (1 - ph) * .6);
          const hx = cx + Math.cos(a) * rr, hy = cy + Math.sin(a) * rr;
          if (Math.abs(x - hx) < 1.6 && Math.abs(y - hy) < 1.6) L = Math.max(L, .95 * (ph < .9 ? 1 : (1 - ph) * 10));
        }
        return L;
      }
    },
    // a broad frontier curve and a sharp one of your own, breathing
    curves: {
      fn(x, y, w, h, t) {
        const k = .5 + .5 * Math.sin(t * .7);
        const base = h * .78, X = x / w;
        const broad = base - h * .3 * Math.exp(-((X - .5) ** 2) / (2 * .17 ** 2));
        const sd = .17 - .12 * k, sharp = base - h * (.3 + .38 * k) * Math.exp(-((X - .5) ** 2) / (2 * sd * sd));
        let L = hash(x, y) > .995 ? .25 : 0;
        if (Math.abs(y - base) < .6) L = .3;
        if (y > sharp && y < base) L = .26 + .32 * (1 - (y - sharp) / (base - sharp + 1));
        if (Math.abs(y - sharp) < 1.2) L = .62;
        if (Math.abs(y - broad) < 1) L = .98;
        return L;
      }
    },
    // drifting blue field behind the closing card: it swells toward the cursor and ripples where you click
    field: {
      ownGlow: true,
      frame(t, st) {
        const on = st.mx > -1;
        st.sx = st.sx === undefined ? .5 : st.sx + ((on ? st.mx : .5) - st.sx) * .1;
        st.sy = st.sy === undefined ? .5 : st.sy + ((on ? st.my : .5) - st.sy) * .1;
        st.on = (st.on || 0) + ((on ? 1 : 0) - (st.on || 0)) * .08;
        st.live = (st.ripples || []).filter(r => t - r.t0 < 2.4);
      },
      fn(x, y, w, h, t, st) {
        const dx = x - st.sx * w, dy = y - st.sy * h, d = Math.hypot(dx, dy * 1.4);
        const warp = st.on * 14 * Math.exp(-d / (w * .12));
        const X = x - dx / (d + 1) * warp, Y = y - dy / (d + 1) * warp;
        const v = Math.sin(X * .05 + t * .5) * Math.cos(Y * .07 - t * .3) + Math.sin((X + Y) * .03 + t * .4);
        let L = .14 + .14 * v + .35 * (y / h) ** 2 + st.on * .22 * Math.exp(-d / (w * .08));
        for (const r of st.live || []) {
          const age = t - r.t0, rad = age * w * .3, rd = Math.hypot(x - r.x * w, y - r.y * h), band = Math.abs(rd - rad);
          if (band < 2) L = Math.max(L, (1 - age / 2.4) * (band < 1 ? .95 : .6));
        }
        return L;
      }
    },
    // the wordmark, set in fraunces, sampled once and dithered with a shimmer and a cursor glow
    wordmark: {
      ownGlow: true,
      // the same pixel glyphs as the logo, scaled up; the i's peak stays blue
      init(w, h, st) {
        const G = {
          l: ['XX.', '.X.', '.X.', '.X.', '.X.', '.X.', '.X.', '.XX'],
          e: ['....', '....', '....', '.XX.', 'X..X', 'XXXX', 'X...', '.XXX'],
          i: ['.B.', 'BBB', '...', 'XX.', '.X.', '.X.', '.X.', '.XX'],
          b: ['X...', 'X...', 'X...', 'XXX.', 'X..X', 'X..X', 'X..X', 'XXX.'],
          r: ['....', '....', '....', 'X.XX', 'XX..', 'X...', 'X...', 'X...']
        };
        const word = 'leibler', W = [...word].reduce((s, ch) => s + G[ch][0].length + 1, -1);
        const cell = Math.max(1, Math.floor(Math.min(w * .94 / W, h * .9 / 8))), ox = Math.floor((w - W * cell) / 2), oy = Math.floor((h - 8 * cell) / 2);
        st.mask = new Float32Array(w * h); st.peak = new Uint8Array(w * h);
        let cx = 0;
        for (const ch of word) {
          G[ch].forEach((row, y) => [...row].forEach((k, dx) => {
            if (k === '.') return;
            for (let py = 0; py < cell; py++) for (let px = 0; px < cell; px++) {
              const X = ox + (cx + dx) * cell + px, Y = oy + y * cell + py;
              if (X >= 0 && X < w && Y >= 0 && Y < h) { st.mask[Y * w + X] = 1; if (k === 'B') st.peak[Y * w + X] = 1; }
            }
          }));
          cx += G[ch][0].length + 1;
        }
      },
      fn(x, y, w, h, t, st) {
        const m = st.mask ? st.mask[y * w + x] : 0;
        const dx = st.mx * w - x, dy = st.my * h - y, near = st.mx > -1 ? Math.exp(-(dx * dx + dy * dy) / (w * 6)) : 0;
        if (m > .1 && st.peak[y * w + x]) return .88 + .08 * Math.sin(t * 3);
        if (m > .1) {
          const sh = .5 + .5 * Math.sin(x * .09 - t * 1.6 + Math.sin(y * .2 + t) * .8);
          return (.32 + .34 * sh) * m * (1 - .35 * (y / h)) + near * .55;
        }
        return (hash(x, y) > .994 ? .22 : 0) + near * .22;
      }
    },
    // a photo, turned into pixels
    portrait: {
      ownGlow: true,
      init(w, h, st) {
        const src = st.img; if (!src || !src.complete) return;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d');
        const s = Math.max(w / src.naturalWidth, h / src.naturalHeight);
        g.drawImage(src, (w - src.naturalWidth * s) / 2, (h - src.naturalHeight * s) / 2, src.naturalWidth * s, src.naturalHeight * s);
        const a = g.getImageData(0, 0, w, h).data;
        st.lum = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) st.lum[i] = (a[i * 4] * .3 + a[i * 4 + 1] * .59 + a[i * 4 + 2] * .11) / 255;
      },
      fn(x, y, w, h, t, st) {
        if (!st.lum) return 0;
        const l = st.lum[y * w + x];
        return Math.pow(l, 1.25) * .98 + (hash(x, y + Math.floor(t * 6)) > .997 ? .2 : 0);
      }
    }
  };

  $$('canvas.px').forEach(c => {
    const scene = SCENES[c.dataset.scene];
    if (!scene) return;
    const opts = { px: +(c.dataset.px || 4), fps: +(c.dataset.fps || 24), ramp: RAMPS[c.dataset.ramp] || RAMP };
    if (c.dataset.scene === 'portrait') {
      const img = $(c.dataset.src);
      const st = pixel(c, scene, opts);
      st.img = img;
      const go = () => scene.init(c.width, c.height, st);
      img.complete ? go() : img.addEventListener('load', go);
    } else if (c.dataset.scene === 'wordmark') {
      const st = pixel(c, scene, opts);
      document.fonts && document.fonts.ready.then(() => scene.init(c.width, c.height, st));
    } else pixel(c, scene, opts);
  });

  /* ---------- hero intro ---------- */
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.nav .wrap > *', { y: -12, opacity: 0, duration: 1, stagger: .08 })
    .from('.hero-frame, .pano', { opacity: 0, scale: .985, duration: 1.6 }, .05)
    .from('.hero-copy > *, .hero2 .caps, .hero2 h1, .hero2-row > *', { opacity: 0, y: 22, duration: 1.2, stagger: .1 }, .25);

  /* ---------- showcase: tabs auto-advance, each scene plays ---------- */
  (() => {
    const tabs = $$('.tabs button'), scenes = $$('.scene');
    if (!tabs.length) return;
    let cur = -1, prog = null, inView = false;
    const play = [
      el => {
        const p = $('.prompt-in p', el), text = p.dataset.text, o = { n: 0 };
        p.textContent = '';
        gsap.to(o, { n: text.length, duration: 2.6, ease: 'none', onUpdate: () => { p.textContent = text.slice(0, Math.round(o.n)); } });
      },
      el => gsap.fromTo($$('.ev u', el), { width: 0 }, { width: i => $$('.ev', el)[i].dataset.v + '%', duration: 1.4, stagger: .12, ease: 'power3.out' }),
      el => {
        const ln = $('.spark .ln', el), L = ln.getTotalLength(), sc = $('.score span', el), o = { v: 38 };
        gsap.fromTo(ln, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' });
        gsap.fromTo($('.spark .area', el), { opacity: 0 }, { opacity: 1, duration: 1.2, delay: 1.2 });
        gsap.fromTo($('.spark rect', el), { opacity: 0 }, { opacity: 1, duration: .4, delay: 2.3 });
        gsap.to(o, { v: 86, duration: 2.4, ease: 'power2.inOut', onUpdate: () => { sc.textContent = Math.round(o.v); } });
      },
      el => {
        const y = $('.split .y', el), lbl = $('.split .y span', el), o = { v: 5 };
        gsap.set(y, { width: '5%' });
        gsap.to(o, { v: 100, duration: 2.6, delay: .8, ease: 'power2.inOut', onUpdate: () => { y.style.width = o.v + '%'; lbl.textContent = `Your model · ${Math.round(o.v)}%`; } });
      }
    ];
    function go(i) {
      if (i === cur) return;
      cur = i;
      tabs.forEach((t, j) => { t.classList.toggle('on', j === i); gsap.set($('i', t), { scaleX: 0 }); });
      scenes.forEach((s, j) => s.classList.toggle('on', j === i));
      const bg = $('.stage > canvas');
      if (bg && bg._st) bg._st.step = i;
      play[i](scenes[i]);
      if (prog) prog.kill();
      prog = gsap.fromTo($('i', tabs[i]), { scaleX: 0 }, { scaleX: 1, duration: 6, ease: 'none', paused: !inView, onComplete: () => go((i + 1) % tabs.length) });
    }
    tabs.forEach((t, i) => { t.addEventListener('click', () => go(i)); t.addEventListener('mouseenter', () => go(i)); });
    ScrollTrigger.create({ trigger: '.frame', start: 'top 70%', end: 'bottom 20%', onToggle: s => { inView = s.isActive; if (cur < 0 && inView) go(0); else if (prog) inView ? prog.play() : prog.pause(); } });
  })();

  /* ---------- horizontal accordion ---------- */
  (() => {
    const ps = $$('.hp');
    if (!ps.length) return;
    let cur = 0, timer = null, hover = false;
    const open = i => { cur = i; ps.forEach((p, j) => p.classList.toggle('on', j === i)); };
    ps.forEach((p, i) => {
      p.addEventListener('click', () => open(i));
      p.addEventListener('mouseenter', () => { hover = true; open(i); });
    });
    $('.hacc').addEventListener('mouseleave', () => { hover = false; });
    ScrollTrigger.create({ trigger: '.hacc', start: 'top 70%', end: 'bottom 20%', onToggle: s => { clearInterval(timer); if (s.isActive) timer = setInterval(() => { if (!hover) open((cur + 1) % ps.length); }, 4200); } });
  })();

  /* ---------- live numbers (kullback) ---------- */
  (() => {
    if (!$('[data-stat]')) return;
    const fmt = n => Number(n).toLocaleString('en-US');
    const set = (name, n) => $$(`[data-stat="${name}"]`).forEach(el => {
      const o = { v: 0 };
      gsap.to(o, { v: n, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(Math.round(o.v)); } });
    });
    fetch('https://api.github.com/repos/leiblerdev/kullback').then(r => r.ok ? r.json() : Promise.reject()).then(d => { if (typeof d.stargazers_count === 'number') set('stars', d.stargazers_count); }).catch(() => {});
    fetch('https://huggingface.co/api/datasets?author=leibler').then(r => r.ok ? r.json() : Promise.reject()).then(d => {
      if (!Array.isArray(d)) return;
      set('envs', d.length);
      set('downloads', d.reduce((s, x) => s + (typeof x.downloads === 'number' ? x.downloads : 0), 0));
    }).catch(() => {});
  })();

  /* ---------- copy the clone command ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1600); }).catch(() => {});
  }));

  /* ---------- footer: live san francisco time ---------- */
  (() => {
    const el = $('.sf-time');
    if (!el) return;
    const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', second: '2-digit' });
    const tick = () => { el.textContent = f.format(new Date()); };
    tick(); setInterval(tick, 1000);
  })();

  /* ---------- reveals ---------- */
  const sel = '.mq, .insts li, .sec-head > *, .split-head > *, .frame, .hacc, .gcard, .gnote, .ill, .feats li, .yours .pill-wide, .cta, .code-card, .mcard, .person-l, .person-r, .foot-top > *, .foot-meta';
  gsap.set(sel, { opacity: 0 });
  ScrollTrigger.batch(sel, { start: 'top 90%', once: true, onEnter: els => gsap.fromTo(els, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .08, ease: 'expo.out' }) });

  ScrollTrigger.refresh();
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
