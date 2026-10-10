/* Independent recorded clips; arrows and adaptation highlights are schematic. */
(() => {
  const figure = document.querySelector('.transfer-story');
  if (!figure) return;
  const button = figure.querySelector('[data-transfer-pause]');
  const videos = [...figure.querySelectorAll('video[data-transfer-video]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const nearVideos = new Set();
  const loaded = new WeakSet();
  const programmaticPauses = new WeakSet();
  let paused = reduced.matches;
  let visible = false;

  // Aim the outgoing connector at the recorded scene, not its caption. The
  // stage layout determines this offset, so changing it cannot resize a stage.
  const grid = figure.querySelector('.transfer-grid');
  const robot = figure.querySelector('.transfer-robot');
  const robotVideo = robot?.querySelector('video');
  const steer = figure.querySelector('.steer-step');
  function alignRobotVideo() {
    if (!grid || !robot || !robotVideo || !steer) return;
    if (figure.getBoundingClientRect().width <= 800) {
      robot.style.removeProperty('--transfer-robot-offset');
      return;
    }
    const stage = steer.getBoundingClientRect();
    const video = robotVideo.getBoundingClientRect();
    const offset = Math.max(0, stage.top - grid.getBoundingClientRect().top
      + stage.height / 2 - video.height / 2);
    const value = `${offset.toFixed(2)}px`;
    if (robot.style.getPropertyValue('--transfer-robot-offset') !== value) {
      robot.style.setProperty('--transfer-robot-offset', value);
    }
  }
  if ('ResizeObserver' in window) {
    const alignmentObserver = new ResizeObserver(alignRobotVideo);
    for (const element of [figure, steer, robotVideo]) {
      if (element) alignmentObserver.observe(element);
    }
  } else window.addEventListener('resize', alignRobotVideo);
  document.fonts?.ready.then(alignRobotVideo);
  alignRobotVideo();

  function load(video) {
    if (loaded.has(video)) return;
    for (const source of video.querySelectorAll('source[data-src]')) {
      source.src = source.dataset.src;
      source.removeAttribute('data-src');
    }
    loaded.add(video);
    video.muted = true;
    video.load();
  }
  function stop(video) {
    if (video.paused) return;
    programmaticPauses.add(video);
    video.pause();
  }
  function update() {
    const running = visible && !paused && !document.hidden;
    figure.classList.toggle('motion-running', running && !reduced.matches);
    if (button) {
      button.textContent = paused ? 'Play motion' : 'Pause motion';
      button.removeAttribute('aria-pressed');
    }
    for (const video of videos) {
      if (!running || !nearVideos.has(video)) {
        stop(video);
        continue;
      }
      load(video);
      if (!video.paused) continue;
      const play = video.play();
      if (play) play.catch(error => {
        if (error.name === 'NotAllowedError' && !paused && visible && !document.hidden) {
          paused = true;
          update();
        }
      });
    }
  }
  if (button) {
    button.hidden = false;
    button.addEventListener('click', () => { paused = !paused; update(); });
  }
  for (const video of videos) {
    video.addEventListener('pause', () => {
      if (programmaticPauses.delete(video)) return;
      if (!paused && visible && !document.hidden && !video.ended) {
        paused = true;
        update();
      }
    });
    video.addEventListener('play', () => {
      if (paused) { paused = false; update(); }
    });
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) paused = true;
    update();
  });
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', () => videos.forEach(stop));
  window.addEventListener('pageshow', update);
  if ('IntersectionObserver' in window) {
    const loader = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        load(entry.target);
        loader.unobserve(entry.target);
      }
    }, { rootMargin:'300px 0px', threshold:0 });
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === figure) visible = entry.isIntersecting;
        else if (entry.isIntersecting) nearVideos.add(entry.target);
        else nearVideos.delete(entry.target);
      }
      update();
    }, { rootMargin:'60px 0px', threshold:0.01 });
    observer.observe(figure);
    for (const video of videos) { loader.observe(video); observer.observe(video); }
  } else {
    visible = true;
    for (const video of videos) nearVideos.add(video);
  }
  update();
})();
