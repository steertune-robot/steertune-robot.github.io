/* Keep the supplied edit at its original speed. Native controls remain usable
 * without JavaScript; automatic playback is muted and limited to the viewport. */
(() => {
  const video = document.querySelector('[data-asset="teaser-video"]');
  if (!video) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let intended = !reduced.matches;
  let visible = false;
  let managedPause = false;
  let blocked = false;
  let pending = false;
  video.muted = true;

  function reconcile() {
    if (!visible || document.hidden || !intended || blocked) {
      if (!video.paused) {
        managedPause = true;
        video.pause();
      }
      return;
    }
    if (!video.paused || pending) return;
    pending = true;
    video.play().catch((error) => {
      if (error.name !== 'AbortError') blocked = true;
    }).finally(() => {
      pending = false;
      reconcile();
    });
  }

  video.addEventListener('play', () => {
    intended = true;
    blocked = false;
  });
  video.addEventListener('pause', () => {
    if (managedPause) managedPause = false;
    else intended = false;
  });
  document.addEventListener('visibilitychange', reconcile);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      intended = false;
      reconcile();
    }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      reconcile();
    }, { threshold: [0, 0.15] }).observe(video);
  }
})();
