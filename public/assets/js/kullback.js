// leibler.dev/kullback: scroll reveal and count-up
(function () {
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function count(el) {
    var n = +el.getAttribute('data-n');
    if (rm || !('requestAnimationFrame' in window)) { el.textContent = n; return; }
    var t0 = performance.now(), d = 900;
    function f(t) {
      var p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(n * e);
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  function show(el) {
    el.classList.add('in');
    el.querySelectorAll('[data-n]').forEach(count);
  }
  var els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  els.forEach(function (el) { io.observe(el); });
})();
