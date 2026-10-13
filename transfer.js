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

  // A conceptual path morph, not measured robot motion. Keep the demonstration
  // fixed so the viewer can see the prediction being pulled toward it.
  const steeringPath = figure.querySelector('[data-steer-path]');
  const predicted = [10,55,28,51,24,10,61,16,91,22,119,3,149,14];
  const demonstration = [10,55,30,57,25,34,61,41,91,49,122,24,149,40];
  let steeringFrame = 0, steeringLast = 0, steeringElapsed = 0;
  const cycle = (parseFloat(getComputedStyle(figure.querySelector('.transfer-grid')).getPropertyValue('--transfer-cycle')) || 8) * 1000;
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  function paintSteering() {
    if (!steeringPath) return;
    const phase = (steeringElapsed % cycle) / cycle;
    const blend = reduced.matches ? .8 : .8 * smooth((phase - .52) / .28);
    const points = predicted.map((value, i) => (value + (demonstration[i] - value) * blend).toFixed(2));
    steeringPath.setAttribute('d', `M${points.slice(0,2).join(' ')} C${points.slice(2,8).join(' ')} C${points.slice(8).join(' ')}`);
    const opacity = phase < .06 ? smooth(phase / .06) : 1 - smooth((phase - .94) / .06);
    steeringPath.style.opacity = reduced.matches ? '1' : String(opacity);
  }
  function steeringTick(now) {
    steeringFrame = 0;
    if (steeringLast) steeringElapsed += now - steeringLast;
    steeringLast = now;
    paintSteering();
    steeringFrame = requestAnimationFrame(steeringTick);
  }
  function syncSteering(running) {
    if (running && steeringPath && !steeringFrame) {
      steeringLast = 0;
      steeringFrame = requestAnimationFrame(steeringTick);
    } else if (!running) {
      cancelAnimationFrame(steeringFrame);
      steeringFrame = 0;
      steeringLast = 0;
    }
    paintSteering();
  }

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
    syncSteering(running && !reduced.matches);
    if (button) {
      window.SteertuningPlayback.set(button, paused ? 'play' : 'pause', paused ? 'Play overview' : 'Pause overview');
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
  window.addEventListener('pagehide', () => { videos.forEach(stop); syncSteering(false); });
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
