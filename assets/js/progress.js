// Builds the little progress bar inside <span class="progress" data-percent="67">.
// Fills up and counts to the percent on load; on hover it tries to rush to 99%,
// then settles back when the pointer leaves.

(function progress() {
  const el = document.querySelector('.progress');
  if (!el) return;
  const target = Number(el.dataset.percent) || 0;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  el.innerHTML =
    '<span class="progress-bar"><span class="progress-fill"></span></span>' +
    '<span class="progress-pct">0%</span>';
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-label', 'site progress');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');
  const fill = el.querySelector('.progress-fill');
  const pct = el.querySelector('.progress-pct');

  let shown = 0;       // number currently displayed
  let raf = null;
  let done = null;

  function goTo(value, duration) {
    fill.style.width = value + '%';
    el.setAttribute('aria-valuenow', String(value));
    cancelAnimationFrame(raf);
    clearTimeout(done);
    if (reduceMotion) { shown = value; pct.textContent = value + '%'; return; }
    const from = shown, start = performance.now();
    (function tick(now) {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      shown = Math.round(from + (value - from) * t);  // steady count, like a loading screen
      pct.textContent = shown + '%';
      if (t < 1) raf = requestAnimationFrame(tick);
    })(start);
    // safety net: land on the final number even if animation frames are paused
    done = setTimeout(() => {
      cancelAnimationFrame(raf);
      shown = value;
      pct.textContent = value + '%';
    }, duration + 50);
  }

  // start once the page has had a moment to appear
  setTimeout(() => goTo(target, 1400), 400);

  el.addEventListener('mouseenter', () => goTo(99, 700));
  el.addEventListener('mouseleave', () => goTo(target, 700));
})();
