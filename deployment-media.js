/* Full, independently edited recordings; schematic graph timing is separate. */
(() => {
  const videos = [...document.querySelectorAll('[data-deploy-video]')];
  if (!videos.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const players = new Map(videos.map(video => [video, {
    video, loaded: false, visible: false, intended: !reduced.matches,
    managedPause: false, blocked: false, pending: false,
  }]));

  function load(player) {
    if (player.loaded) return;
    player.loaded = true;
    player.video.src = player.video.dataset.src;
    player.video.preload = 'metadata';
    player.video.load();
  }
  function reconcile(player) {
    const { video } = player;
    if (!player.visible || document.hidden || !player.intended || player.blocked) {
      if (!video.paused) {
        player.managedPause = true;
        video.pause();
      }
      return;
    }
    load(player);
    if (!video.paused || player.pending) return;
    player.pending = true;
    video.play().catch(error => {
      if (error.name !== 'AbortError') player.blocked = true;
    }).finally(() => {
      player.pending = false;
      reconcile(player);
    });
  }
  players.forEach(player => {
    const { video } = player;
    video.muted = true;
    video.addEventListener('play', () => {
      player.intended = true;
      player.blocked = false;
    });
    video.addEventListener('pause', () => {
      if (player.managedPause) player.managedPause = false;
      else player.intended = false;
    });
    // A loading or decoding failure still leaves the complete file accessible.
    video.addEventListener('error', () => {
      player.blocked = true;
      if (video.parentElement.querySelector('.deploy-video-fallback')) return;
      const link = document.createElement('a');
      link.className = 'deploy-video-fallback';
      link.href = video.dataset.src;
      link.textContent = 'Open video';
      video.after(link);
    });
  });
  document.addEventListener('visibilitychange', () => players.forEach(reconcile));
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    players.forEach(player => {
      player.intended = false;
      reconcile(player);
    });
  });
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) load(players.get(entry.target));
    }), { rootMargin: '250px' });
    const visible = new IntersectionObserver(entries => entries.forEach(entry => {
      const player = players.get(entry.target);
      player.visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      reconcile(player);
    }), { threshold: [0, 0.15] });
    videos.forEach(video => { near.observe(video); visible.observe(video); });
  } else players.forEach(load);
})();
