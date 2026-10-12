/* Independent supplied recordings, encoded at 4×; browser playback stays at 1×. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  for (const group of document.querySelectorAll('[data-task-demo-group]')) {
    const videos = [...group.querySelectorAll('[data-task-demo-video]')];
    const button = group.querySelector('[data-task-demo-toggle]');
    const near = new Set(), loaded = new WeakSet(), internal = new WeakSet();
    const manuallyPaused = new WeakSet();
    let paused = reduced.matches;
    function stop(video) {
      if (!video.paused) { internal.add(video); video.pause(); }
    }
    function load(video) {
      if (loaded.has(video)) return;
      loaded.add(video);
      video.preload = paused ? 'metadata' : 'auto';
      video.src = video.dataset.src;
      video.muted = true;
      video.playbackRate = 1;
      video.load();
    }
    function sync() {
      if (button) {
        button.hidden = false;
        button.textContent = paused ? 'Play clips' : 'Pause clips';
        button.setAttribute('aria-pressed', String(paused));
      }
      for (const video of videos) {
        if (paused || document.hidden || !near.has(video) || manuallyPaused.has(video)) {
          stop(video); continue;
        }
        load(video);
        if (video.paused) video.play()?.catch(error => {
          if (error.name === 'NotAllowedError') { paused = true; sync(); }
        });
      }
    }
    button?.addEventListener('click', () => {
      paused = !paused;
      if (!paused) videos.forEach(video => manuallyPaused.delete(video));
      sync();
    });
    for (const video of videos) {
      video.addEventListener('pause', () => {
        if (internal.delete(video)) return;
        if (!document.hidden && near.has(video) && !video.ended) manuallyPaused.add(video);
      });
      video.addEventListener('play', () => {
        manuallyPaused.delete(video);
        if (paused) { paused = false; sync(); }
      });
      video.addEventListener('error', () => {
        const note = group.querySelector('[data-task-demo-status]');
        if (note) { note.hidden = false; note.textContent = 'A clip could not load. Use its video link to open the recording.'; }
      });
    }
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', () => { if (reduced.matches) paused = true; sync(); });
    window.addEventListener('pagehide', () => videos.forEach(stop));
    window.addEventListener('pageshow', sync);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) { near.add(entry.target); load(entry.target); }
          else near.delete(entry.target);
        }
        sync();
      }, { threshold: .05 });
      videos.forEach(video => observer.observe(video));
    } else { videos.forEach(video => near.add(video)); }
    sync();
  }
})();
