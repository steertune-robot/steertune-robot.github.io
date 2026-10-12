/* Shared, accessible icons for playback actions across the research page. */
(() => {
  const shapes = {
    play: '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>',
    replay: '<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>',
  };
  function set(button, icon, label) {
    if (!button) return;
    button.classList.add('playback-button');
    if (button.dataset.playbackIcon !== icon || !button.querySelector('svg')) {
      button.dataset.playbackIcon = icon;
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${shapes[icon]}</svg>`;
    }
    if (button.getAttribute('aria-label') !== label) {
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    // These expose their next action in the name, rather than a toggle state.
    button.removeAttribute('aria-pressed');
  }
  window.SteertuningPlayback = { set };
  const initial = [
    ['[data-transfer-pause]', 'pause', 'Pause overview'],
    ['[data-dataset-toggle]', 'pause', 'Pause mosaic'],
    ['[data-contact-play]', 'play', 'Play recording'],
    ['[data-process-toggle]', 'pause', 'Pause current pair'],
    ['[data-graph-pause]', 'pause', 'Pause animation'],
    ['[data-task-demo-toggle]', 'pause', 'Pause all five demonstrations'],
    ['[data-coordinate-play]', 'play', 'Play steering motion'],
    ['[data-deploy-play]', 'pause', 'Pause walkthrough'],
    ['[data-deploy-replay]', 'replay', 'Replay walkthrough'],
    ['[data-rollout-toggle]', 'play', 'Play both videos'],
    ['[data-rollout-replay]', 'replay', 'Replay both videos'],
  ];
  initial.forEach(([selector, icon, label]) => {
    document.querySelectorAll(selector).forEach(button => set(button, icon, label));
  });
})();
