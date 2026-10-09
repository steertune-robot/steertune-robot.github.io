"use strict";
(() => {
  const root = document.getElementById("in-the-wild-rollouts");
  const tasks = window.STEERTUNING_ROLLOUTS;
  if (!root || !Array.isArray(tasks) || !tasks.length) return;
  const tablist = root.querySelector("[data-rollout-tabs]");
  const panel = root.querySelector("#rollout-panel");
  const toggle = root.querySelector("[data-rollout-toggle]");
  const replay = root.querySelector("[data-rollout-replay]");
  const status = root.querySelector("[data-rollout-status]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = -1,
    near = false,
    visible = false,
    revision = 0;
  const players = ["human", "robot"].map((side) => ({
    side,
    name: side === "human" ? "Human demonstration" : "Robot rollout",
    video: root.querySelector(`[data-rollout-${side}]`),
    intent: !reduced.matches,
    userChoice: false,
    loaded: false,
    changing: false,
    internalPause: false,
    pending: null,
    blocked: false,
    failed: false,
    resetTime: false,
    fallback: null,
    asset: null,
  }));
  if (
    !tablist ||
    !panel ||
    !toggle ||
    !replay ||
    !status ||
    players.some((p) => !p.video)
  )
    return;

  function intended(player) {
    return player.intent && !player.blocked && !player.failed;
  }
  function updateControls() {
    const anyPlaying = players.some(intended);
    toggle.textContent = anyPlaying ? "Pause both" : "Play both";
    toggle.setAttribute("aria-pressed", String(!anyPlaying));
    toggle.disabled = replay.disabled = players.every((p) => p.failed);
  }
  function updateStatus() {
    const failed = players
      .filter((p) => p.failed)
      .map((p) => p.name.toLowerCase());
    status.textContent = failed.length
      ? `The ${failed.join(" and ")} could not load. A poster and direct video link are available below.`
      : players.some((p) => p.blocked)
        ? "Automatic playback is paused by your browser. Use Play both or an individual video’s play control."
        : "";
  }
  function managedPause(player) {
    if (!player.video.paused) {
      player.internalPause = true;
      player.video.pause();
    }
  }
  function showFallback(player) {
    if (player.failed) return;
    player.failed = true;
    managedPause(player);
    player.video.hidden = true;
    player.video.removeAttribute("aria-busy");
    const fallback = document.createElement("div");
    fallback.className = "rollout-fallback";
    if (player.asset.poster) {
      const poster = document.createElement("img");
      poster.src = player.asset.poster;
      poster.alt = `${tasks[active].label}: ${player.name.toLowerCase()} preview`;
      fallback.append(poster);
    }
    const note = document.createElement("p");
    note.append("Video unavailable. ");
    const link = document.createElement("a");
    link.href = player.asset.src;
    link.textContent = `Open ${player.name.toLowerCase()}`;
    note.append(link);
    fallback.append(note);
    player.video.after(fallback);
    player.fallback = fallback;
    updateStatus();
    updateControls();
  }
  function loadPlayer(player, force = false) {
    if (player.loaded || player.failed || (!near && !force)) return;
    player.loaded = true;
    player.changing = true;
    player.video.setAttribute("aria-busy", "true");
    // Buffer only the selected pair as it approaches the viewport. Paused or
    // reduced-motion visitors need metadata only until they request playback.
    player.video.preload = intended(player) ? "auto" : "metadata";
    player.video.src = player.asset.src;
    player.video.load();
  }
  function playPlayer(player) {
    if (!player.loaded || !intended(player) || !visible || document.hidden)
      return;
    if (!player.video.paused || player.pending) return;
    const attempt = { revision };
    player.pending = attempt;
    const promise = player.video.play();
    if (!promise?.then) {
      player.pending = null;
      return;
    }
    promise
      .catch((error) => {
        if (attempt.revision !== revision || player.pending !== attempt) return;
        // A switch, offscreen pause, or source load can interrupt play normally.
        if (
          error.name === "AbortError" ||
          !visible ||
          document.hidden ||
          !player.intent
        )
          return;
        if (error.name === "NotAllowedError") player.blocked = true;
        else if (error.name === "NotSupportedError") showFallback(player);
        else player.blocked = true;
        updateStatus();
        updateControls();
      })
      .finally(() => {
        if (player.pending === attempt) {
          player.pending = null;
          // Re-entering the viewport can race with an aborted offscreen play.
          if (attempt.revision === revision) playPlayer(player);
        }
      });
  }
  function reconcile() {
    players.forEach((player) => {
      loadPlayer(player);
      if (visible && !document.hidden && intended(player)) playPlayer(player);
      else managedPause(player);
    });
    updateControls();
  }
  const tabs = tasks.map((task, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `rollout-task-${index}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "rollout-panel");
    button.textContent = task.label;
    button.addEventListener("click", () => selectTask(index));
    button.addEventListener("keydown", (event) => {
      const next =
        event.key === "ArrowRight"
          ? (index + 1) % tasks.length
          : event.key === "ArrowLeft"
            ? (index + tasks.length - 1) % tasks.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? tasks.length - 1
                : null;
      if (next === null) return;
      event.preventDefault();
      selectTask(next);
      tabs[next].focus();
    });
    tablist.append(button);
    return button;
  });
  function selectTask(index) {
    if (index === active) return;
    active = index;
    revision += 1;
    const task = tasks[index];
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", tabs[index].id);
    const title = root.querySelector("[data-rollout-title]");
    const count = root.querySelector("[data-rollout-count]");
    if (title) title.textContent = task.label;
    if (count) count.textContent = `${index + 1} / ${tasks.length}`;
    players.forEach((player) => {
      player.changing = true;
      managedPause(player);
      player.pending = null;
      player.loaded = player.blocked = player.failed = false;
      player.resetTime = false;
      player.fallback?.remove();
      player.fallback = null;
      player.asset = task[player.side];
      player.video.hidden = false;
      player.video.removeAttribute("src");
      player.video.load();
      player.video.preload = "none";
      player.video.poster = player.asset.poster || "";
      player.video.muted = true;
      player.video.loop = true;
      player.video.playsInline = true;
      player.video.controls = true;
      player.video.playbackRate = 1;
      player.video.setAttribute(
        "aria-label",
        `${task.label}: ${player.name.toLowerCase()}`,
      );
      player.video.removeAttribute("aria-busy");
      const caption = root.querySelector(
        `[data-rollout-${player.side}-caption]`,
      );
      if (caption) caption.textContent = player.asset.caption || "";
    });
    updateStatus();
    reconcile();
  }
  players.forEach((player) => {
    const video = player.video;
    video.addEventListener("loadedmetadata", () => {
      if (!player.loaded) return;
      player.changing = false;
      player.internalPause = false;
      if (player.resetTime) {
        video.currentTime = 0;
        player.resetTime = false;
      }
    });
    video.addEventListener("canplay", () => {
      video.removeAttribute("aria-busy");
      playPlayer(player);
    });
    video.addEventListener("error", () => {
      if (
        player.loaded &&
        video.error &&
        video.getAttribute("src") === player.asset.src
      )
        showFallback(player);
    });
    video.addEventListener("pause", () => {
      if (player.internalPause) {
        player.internalPause = false;
        return;
      }
      if (player.changing || !visible || document.hidden || video.ended) return;
      player.intent = false;
      player.userChoice = true;
      updateControls();
    });
    video.addEventListener("play", () => {
      if (player.changing) return;
      if (!player.pending) {
        player.intent = true;
        player.userChoice = true;
      }
      player.blocked = false;
      updateStatus();
      updateControls();
      if (!visible || document.hidden) managedPause(player);
    });
  });
  toggle.addEventListener("click", () => {
    const shouldPlay = !players.some(intended);
    players.forEach((p) => {
      p.intent = shouldPlay;
      p.userChoice = true;
      p.blocked = false;
      if (shouldPlay) loadPlayer(p, true);
    });
    updateStatus();
    reconcile();
  });
  replay.addEventListener("click", () => {
    players.forEach((p) => {
      p.intent = true;
      p.userChoice = true;
      p.blocked = false;
      loadPlayer(p, true);
      if (p.video.readyState >= 1) p.video.currentTime = 0;
      else p.resetTime = true;
    });
    updateStatus();
    reconcile();
  });
  reduced.addEventListener("change", () => {
    players.forEach((p) => {
      if (!p.userChoice) p.intent = !reduced.matches;
    });
    reconcile();
  });
  document.addEventListener("visibilitychange", reconcile);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        near = entries[0].isIntersecting;
        if (near) reconcile();
      },
      { rootMargin: "350px 0px", threshold: 0 },
    ).observe(panel);
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        reconcile();
      },
      { threshold: 0.08 },
    ).observe(panel);
  } else {
    near = visible = true;
  }
  selectTask(0);
})();
