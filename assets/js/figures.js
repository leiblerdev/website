// pause step figures while off screen
(function () {
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('paused', !e.isIntersecting); }); }, { rootMargin: '80px' });
  document.querySelectorAll('.step').forEach(function (el) { el.classList.add('paused'); io.observe(el); });
})();
