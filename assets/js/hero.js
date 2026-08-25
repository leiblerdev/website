// leibler.dev hero: the bar never moves, the student climbs to it
(function () {
  var TASKS = ['ticket_classification', 'summarize_call_notes', 'extract_invoice_fields', 'draft_customer_reply'];
  var BAR_Q = 0.72, reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function setup(id, sfx) {
    var cv = document.getElementById(id); if (!cv) return null;
    var o = { cv: cv, ctx: cv.getContext('2d'), W: 0, H: 0,
      el: { task: document.getElementById('r-task' + sfx), iter: document.getElementById('r-iter' + sfx), pass: document.getElementById('r-pass' + sfx), grad: document.getElementById('r-grad' + sfx) } };
    o.resize = function () { var d = Math.min(window.devicePixelRatio || 1, 2); o.W = cv.clientWidth; o.H = cv.clientHeight; cv.width = o.W * d; cv.height = o.H * d; o.ctx.setTransform(d, 0, 0, d, 0, 0); };
    o.resize(); window.addEventListener('resize', function () { o.resize(); if (o.redraw) o.redraw(); });
    o.mono = function (px) { o.ctx.font = px + 'px "Geist Mono", ui-monospace, monospace'; };
    return o;
  }
  function run(o, step, draw) {
    var last = 0, on = false;
    function frame(now) { if (!on) { last = 0; return; } if (!last) last = now; var dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); draw(); requestAnimationFrame(frame); }
    if (reduce) { draw(); return; }
    if (!('IntersectionObserver' in window)) { on = true; requestAnimationFrame(frame); return; }
    new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !on) { on = true; requestAnimationFrame(frame); } else if (!v) on = false; }, { rootMargin: '80px' }).observe(o.cv);
  }
  function shelf(o, graduated) {
    var ctx = o.ctx, W = o.W, H = o.H;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(W * 0.72, H * 0.1); ctx.lineTo(W * 0.72, H * 0.9); ctx.stroke();
    ctx.fillStyle = '#8a8a8a'; o.mono(12); ctx.textAlign = 'left'; ctx.fillText('graduated · yours', W * 0.76, H * 0.16);
    graduated.forEach(function (name, i) { var y = H * 0.24 + i * 30; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W * 0.765, y - 4, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a3a3a3'; ctx.fillText(name, W * 0.78, y); });
  }

  // ---------- C: trajectories ----------
  (function () {
    var o = setup('cv', ''); if (!o) return;
    var ctx = o.ctx, state, t = 0, taskIx = 0, iter, mu, sigma, paths = [], graduated = [], ring = 0, N = 34, P = 40;
    function narrow() { return o.W < 760; }
    // on phones the plot uses the top of the canvas and the task list sits underneath it
    function PH() { return narrow() ? o.H - 104 : o.H; }
    function qToY(q) { var h = PH(); return h * 0.86 - q * (h * 0.86 - h * 0.12); }
    function sx() { return o.W * (narrow() ? 0.12 : 0.10); } function ex() { return o.W * (narrow() ? 0.90 : 0.66); } function sy() { return PH() * 0.5; }
    function slot(i) { return { x: o.W * 0.06, y: PH() + 40 + i * 19 }; }
    function shelfNarrow(graduated) {
      var W = o.W, top = PH(), pad = W * 0.06;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(pad, top); ctx.lineTo(W - pad, top); ctx.stroke();
      ctx.fillStyle = '#8a8a8a'; o.mono(11); ctx.textAlign = 'left'; ctx.fillText('graduated \u00b7 yours', pad, top + 20);
      ctx.textAlign = 'right'; ctx.fillText(graduated.length + ' of ' + TASKS.length, W - pad, top + 20); ctx.textAlign = 'left';
      TASKS.forEach(function (name, i) { var done = graduated.indexOf(name) >= 0, q = slot(i); ctx.fillStyle = done ? '#fff' : '#3a3a3a'; ctx.beginPath(); ctx.arc(q.x + 3, q.y - 4, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = done ? '#a3a3a3' : '#4a4a4a'; ctx.fillText(name, q.x + 13, q.y); });
    }
    function start(ix) { taskIx = ix; iter = 1; mu = 0.42 + Math.random() * 0.08; sigma = 0.16; o.el.task.textContent = TASKS[ix]; o.el.iter.textContent = '01'; o.el.pass.textContent = '0%'; roll(); }
    function roll() {
      paths = []; var n = 0, count = narrow() ? 22 : N;
      for (var i = 0; i < count; i++) {
        var q = Math.max(0.05, Math.min(0.98, mu + gauss() * sigma)), pass = q >= BAR_Q; if (pass) n++;
        var pts = [], y0 = sy(), y1 = qToY(q), w = 0, wob = (0.25 + Math.random() * 0.5) * PH() * 0.12;
        for (var k = 0; k <= P; k++) { var u = k / P; w += gauss() * 0.35; var env = Math.sin(u * Math.PI); pts.push({ x: sx() + (ex() - sx()) * u, y: y0 + (y1 - y0) * ease(u) + w * wob * env * 0.3 }); }
        paths.push({ pts: pts, pass: pass, q: q, d: Math.random() * 0.4 });
      }
      paths.n = n; state = 'rise'; t = 0;
    }
    function step(dt) {
      t += dt; ring = Math.max(0, ring - dt * 1.2);
      if (state === 'rise' && t > 1.6) { state = 'hold'; t = 0; o.el.pass.textContent = Math.round(100 * paths.n / paths.length) + '%'; }
      else if (state === 'hold' && t > 0.9) { if (paths.n / paths.length >= 0.98) { state = 'graduate'; t = 0; } else { state = 'return'; t = 0; } }
      else if (state === 'return' && t > 1.0) { ring = 1; iter++; mu = mu + (0.86 - mu) * 0.38; sigma = Math.max(0.05, sigma * 0.82); o.el.iter.textContent = (iter < 10 ? '0' : '') + iter; roll(); }
      else if (state === 'graduate' && t > 1.5) { graduated.push(TASKS[taskIx]); o.el.grad.textContent = graduated.length; if (graduated.length >= TASKS.length) { state = 'done'; t = 0; } else start(taskIx + 1); }
      else if (state === 'done' && t > 3) { graduated = []; o.el.grad.textContent = '0'; start(0); }
    }
    function draw() {
      var W = o.W, H = o.H, barY = qToY(BAR_Q); ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = '#fff'; ctx.setLineDash([]); ctx.lineWidth = 1; var bx0 = W * (narrow() ? 0.2 : 0.16), bx1 = W * (narrow() ? 0.94 : 0.68);
      ctx.beginPath(); ctx.moveTo(bx0, barY); ctx.lineTo(bx1, barY); ctx.stroke();
      ctx.fillStyle = '#fff'; o.mono(narrow() ? 11 : 12); ctx.textAlign = 'left'; ctx.fillText(narrow() ? 'the bar · your frontier model' : 'the bar · your frontier model, scored on your inputs', bx0, barY - 10);
      paths.forEach(function (p) {
        var frac, a, shrink = 0;
        if (state === 'rise') { frac = ease(Math.max(0, Math.min(1, (t - p.d) / 1.2))); a = 0.35; }
        else if (state === 'hold') { frac = 1; a = p.pass ? 0.9 : 0.15; }
        else if (state === 'return') { var k = ease(Math.min(1, t / 0.9)); if (p.pass) { frac = 1 - k; a = 0.9; } else { frac = 1; a = 0.15 * (1 - k); } }
        else if (state === 'graduate') { var k2 = ease(Math.min(1, t / 1.2)); frac = 1; a = p.pass ? 0.9 * (1 - k2) : 0; }
        else { frac = 1; a = 0.3; }
        if (a <= 0 || frac <= 0) return;
        var m = Math.max(1, Math.floor(frac * P)); ctx.beginPath(); ctx.moveTo(p.pts[0].x, p.pts[0].y);
        for (var i = 1; i <= m; i++) ctx.lineTo(p.pts[i].x, p.pts[i].y);
        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.stroke();
        if (frac >= 1 && state !== 'rise') { var e = p.pts[P]; ctx.beginPath(); ctx.arc(e.x, e.y, 2.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.fill(); }
        if (state === 'graduate') { var k3 = ease(Math.min(1, t / 1.2)), gy = narrow() ? slot(taskIx).y - 4 : H * 0.24 + graduated.length * 30 - 4, gx = narrow() ? slot(taskIx).x + 3 : W * 0.765, e2 = p.pts[P]; if (p.pass) { ctx.beginPath(); ctx.arc(e2.x + (gx - e2.x) * k3, e2.y + (gy - e2.y) * k3, 2.2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - k3 * 0.5)) + ')'; ctx.fill(); } }
      });
      // student
      var s = { x: sx(), y: sy() };
      if (ring > 0) { ctx.beginPath(); ctx.arc(s.x, s.y, 12 + (1 - ring) * 30, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * ring) + ')'; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#8a8a8a'; ctx.textAlign = 'center'; ctx.fillText('student', s.x, s.y + 32);
      var cap = narrow() ? { rise: 'rollouts', hold: 'graded against the bar', 'return': 'passes retrain the student', graduate: 'graduated' }[state] : { rise: 'the student rolls out attempts', hold: 'each attempt is graded against the bar', 'return': 'attempts that cleared it train the next version', graduate: 'the task clears the bar reliably and graduates' }[state];
      if (cap) { ctx.textAlign = 'left'; ctx.fillText(cap, bx0, PH() * 0.955); }
      if (narrow()) shelfNarrow(graduated); else shelf(o, graduated);
      if (state === 'done') { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '500 13px "Geist Mono", ui-monospace, monospace'; ctx.fillText(narrow() ? 'Four tasks, one bar.' : 'Four tasks cleared the same bar. Small models, your weights.', W * (narrow() ? 0.5 : 0.39), PH() * 0.5); }
    }
    o.redraw = draw; start(0); run(o, step, draw);
  })();

})();
