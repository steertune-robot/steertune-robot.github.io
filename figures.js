"use strict";
(() => {
  const figures = [...document.querySelectorAll("[data-science-figure]")];
  if (!figures.length) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const stages = [
    {
      input: "record-rgb.png",
      inputVideo: "processing-rgb.mp4",
      inputAlt: "Original egocentric RGB recording",
      inputCaption: "Egocentric RGB",
      output: "proprio.png",
      outputVideo: "proprio.webm",
      outputAlt: "Observed human hand landmarks retargeted to Wuji geometry",
      outputCaption: "Tracked hands: Wuji rendering",
      eyebrow: "01: Aria Gen 2",
      title: "Synchronized observation",
      copy: "Record the scene and hand motion on the same timeline.",
      stat: "10 Hz",
      spec: "One common timeline",
    },
    {
      assetBase: "assets/contact/processing/",
      duration: 4.8,
      input: "rgb.png?v=060eddf08ed0", inputVideo: "rgb.mp4?v=bd43647421e0",
      inputAlt: "Bread placement interaction from the same oven recording",
      inputCaption: "Scene with hands",
      output: "cloud.png", outputVideo: "cloud.webm",
      outputAlt: "Matching measured scene geometry after recorded hand and arm removal",
      outputCaption: "Hands removed",
      copy: "Remove hands and arms.",
    },
    {
      assetBase: "assets/contact/processing/",
      duration: 4.8,
      input: "rgb.png?v=060eddf08ed0", inputVideo: "rgb.mp4?v=bd43647421e0",
      inputAlt: "Selected bread pickup and placement interaction clip",
      inputCaption: "Interaction clip",
      output: "overlay.png?v=acd3cb81ceec", outputVideo: "overlay.mp4?v=0ffccf250f86",
      outputAlt: "The bread mask highlighted in green over the matching clip frame",
      outputCaption: "Bread mask",
      copy: "Bread mask + “put the bread into the oven.”",
    },
    {
      assetBase: "assets/contact/processing/",
      duration: 4.8,
      input: "cloud.png", inputVideo: "cloud.webm",
      inputAlt: "Recorded 40000-point scene cloud in the matching RGB camera view",
      inputCaption: "40,000 points",
      output: "sampled.png", outputVideo: "sampled.webm",
      outputAlt: "5000 measured points sampled from the same scene cloud",
      outputCaption: "5,000 points",
      copy: "Align geometry and motion; sample 5,000 points.",
    },
  ];
  const players = [...document.querySelectorAll("[data-processing-player]")];
  const sequence = document.querySelector("[data-processing-sequence]");
  const controllers = [];
  let activeStep = 0;
  let completedSteps = new Set();
  function showStep(index) {
    if (sequence) {
      sequence.dataset.activeStep = String(index + 1);
      players.forEach((player, i) => { player.closest("article").hidden = i !== index && !reducedMotion.matches; });
    }
  }
  function completeStep(index) {
    if (completedSteps.has(index)) return;
    completedSteps.add(index);
    if (index + 1 < players.length) {
      activeStep = index + 1;
      showStep(activeStep);
      controllers[activeStep]?.resume();
    }
  }
  if (sequence) {
    const toolbar = document.createElement("div"); toolbar.className = "processing-sequence-controls";
    const replay = document.createElement("button");
    replay.type = "button"; replay.className = "processing-replay";
    replay.textContent = "↻"; replay.title = "Replay processing"; replay.setAttribute("aria-label", "Replay all three processing steps in order");
    toolbar.append(replay); sequence.before(toolbar);
    replay.addEventListener("click", () => {
      completedSteps.clear(); activeStep = 0; showStep(0);
      controllers.forEach((controller, index) => controller.reset(index === 0));
    });
    showStep(0);
  }
  for (const [playerIndex, processing] of players.entries()) {
  if (sequence && playerIndex > 0 && !reducedMotion.matches) processing.closest("article").hidden = true;
  const tabs = [...processing.querySelectorAll("[data-process-stage]")];
  const processClips = ["input", "output"].map((side) =>
    processing.querySelector(`[data-process-${side}]`),
  );
  const hasProcessVideo = processClips.every(
    (clip) => clip instanceof HTMLVideoElement,
  );
  const processButton = processing.querySelector("[data-process-toggle]");
  const processSeek = processing.querySelector("[data-process-seek]");
  const processTime = processing.querySelector("[data-process-time]");
  const processStatus = processing.querySelector("[data-process-status]");
  const processState = {
    visible: false,
    paused: reducedMotion.matches,
    time: 0,
    duration: stages[Number(processing.dataset.processStage || 0)].duration || 8,
    version: 0,
    pendingSeek: true,
    starting: false,
    failed: false,
    frame: 0,
  };
  const formatProcessTime = (time) => `0:${time.toFixed(1).padStart(4, "0")}`;
  function processCanPlay() {
    return processState.visible && !processState.paused && !document.hidden && (!sequence || playerIndex === activeStep || reducedMotion.matches);
  }
  function showProcessTime() {
    if (processTime)
      processTime.textContent = `${formatProcessTime(processState.time)} / ${formatProcessTime(processState.duration)}`;
    if (processSeek) {
      processSeek.max = String(processState.duration);
      processSeek.value = String(processState.time);
      processSeek.setAttribute(
        "aria-valuetext",
        `${processState.time.toFixed(1)} of ${processState.duration.toFixed(0)} seconds`,
      );
      processSeek.style.setProperty(
        "--process-progress",
        `${(processState.time / processState.duration) * 100}%`,
      );
    }
  }
  function pauseProcessClips() {
    if (processState.frame) cancelAnimationFrame(processState.frame);
    processState.frame = 0;
    processClips.forEach((clip) => clip.pause());
  }
  function processTimeIsSeekable(clip, target) {
    if (Math.abs(clip.currentTime - target) <= 0.04) return true;
    if (target <= 0.04) return true;
    for (let i = 0; i < clip.seekable.length; i += 1) {
      if (clip.seekable.start(i) <= target && clip.seekable.end(i) >= target)
        return true;
    }
    return false;
  }
  function processClipFullyBuffered(clip) {
    return Number.isFinite(clip.duration) && clip.buffered.length > 0 &&
      clip.buffered.end(clip.buffered.length - 1) >= clip.duration - 0.05;
  }
  function syncProcessClips() {
    processState.frame = 0;
    if (!processCanPlay() || processState.pendingSeek || processState.failed) return;
    const [leader, follower] = processClips;
    processState.time = Math.min(leader.currentTime, processState.duration);
    if (follower.readyState >= 2 && !follower.seeking) {
      const drift = Math.abs(follower.currentTime - leader.currentTime);
      if (drift > 0.12) follower.currentTime = leader.currentTime;
    }
    showProcessTime();
    processState.frame = requestAnimationFrame(syncProcessClips);
  }
  function updateProcessMotion() {
    if (!hasProcessVideo) return;
    const shouldPlay = processCanPlay() && !processState.failed;
    if (processButton) {
      processButton.hidden = false;
      processButton.disabled = processState.failed;
      processButton.setAttribute("aria-pressed", String(processState.paused));
      processButton.setAttribute("aria-label", processState.paused ? "Play current pair" : "Pause current pair");
      processButton.querySelector("[data-process-play-label]").textContent = processState.paused
        ? "Play clips"
        : "Pause clips";
      processButton.querySelector("[data-process-play-icon]").textContent = processState.paused
        ? "▷"
        : "Ⅱ";
    }
    if (processSeek) processSeek.disabled = processState.failed;
    if (!shouldPlay) pauseProcessClips();
    // Loading only the selected, visible pair also keeps reduced-motion users
    // on a still frame until they explicitly choose to play.
    if (!processState.visible || document.hidden || processState.failed) return;
    for (const clip of processClips) {
      clip.autoplay = false;
      clip.preload = "auto";
      if (clip.dataset.loadedProcessSrc !== clip.dataset.processSrc) {
        clip.dataset.loadedProcessSrc = clip.dataset.processSrc;
        clip.src = clip.dataset.processSrc;
        clip.load();
      }
      clip.playbackRate = sequence ? .65 : 1;
    }
    if (processClips.some((clip) => clip.readyState < 2)) return;
    const durations = processClips.map((clip) => clip.duration).filter(Number.isFinite);
    if (durations.length === 2) processState.duration = Math.min(...durations);
    if (processState.pendingSeek) {
      // A seek can remain asynchronous even after loadeddata/canplay. Do not
      // restart it on each progress event; wait for seeked from both clips.
      if (processClips.some((clip) => clip.seeking)) return;
      let target = Math.min(processState.time, Math.max(0, processState.duration - 0.05));
      if (processClips.some((clip) => !processTimeIsSeekable(clip, target))) {
        // A new WebM may not expose its cue index until enough data arrives.
        // Keep the shared time while loading; progress will retry this branch.
        if (!processClips.every(processClipFullyBuffered)) return;
        // Only a fully loaded, genuinely unseekable pair falls back to zero.
        target = 0;
        processState.time = 0;
        if (processStatus) {
          processStatus.textContent = "This pair resumes from 0:00.";
          processStatus.hidden = false;
        }
      }
      for (const clip of processClips) {
        if (Math.abs(clip.currentTime - target) > 0.04) clip.currentTime = target;
      }
      if (processClips.some((clip) => clip.seeking)) return;
      processState.pendingSeek = false;
      processClips.forEach((clip) => { clip.dataset.processReady = "true"; });
      showProcessTime();
    }
    if (!shouldPlay || processState.starting || processState.frame) return;
    const version = processState.version;
    processState.starting = true;
    Promise.all(processClips.map((clip) => clip.play()))
      .then(() => {
        if (version !== processState.version) return;
        processState.starting = false;
        if (!processCanPlay()) pauseProcessClips();
        else if (processState.pendingSeek || processClips.some((clip) => clip.paused))
          updateProcessMotion();
        else processState.frame = requestAnimationFrame(syncProcessClips);
      })
      .catch((error) => {
        if (version !== processState.version) return;
        processState.starting = false;
        // pause(), a tab change, or visibility changes can cancel a pending
        // play request. Those cancellations must preserve the play choice.
        if (error.name === "AbortError") {
          if (processCanPlay() && !processState.failed) updateProcessMotion();
          return;
        }
        if (processState.failed) return;
        processState.paused = true;
        updateProcessMotion();
      });
  }
  function selectStage(index) {
    const stage = stages[index];
    const assetBase = stage.assetBase || "assets/figures/";
    if (hasProcessVideo) {
      if (!processState.pendingSeek && processClips[0].readyState >= 2)
        processState.time = processClips[0].currentTime;
      pauseProcessClips();
      processState.version += 1;
      processState.pendingSeek = true;
      processState.starting = false;
      processState.failed = false;
      if (processStatus) processStatus.hidden = true;
    }
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    if (tabs.length) processing.querySelector("[role=tabpanel]").setAttribute("aria-labelledby", tabs[index].id);
    for (const side of ["input", "output"]) {
      const media = processing.querySelector(`[data-process-${side}]`);
      if (hasProcessVideo) {
        media.muted = true;
        media.loop = !sequence;
        media.defaultPlaybackRate = sequence ? .65 : 1;
        media.playbackRate = media.defaultPlaybackRate;
        media.playsInline = true;
        media.autoplay = false;
        media.poster = `${assetBase}${stage[side]}`;
        media.setAttribute("aria-label", stage[`${side}Alt`]);
        media.dataset.processSrc = `${assetBase}${stage[`${side}Video`]}`;
        media.dataset.processReady = "false";
        media.parentElement.style.backgroundImage = `url("${assetBase}${stage[side]}")`;
      } else {
        media.src = `${assetBase}${stage[side]}`;
        media.alt = stage[`${side}Alt`];
      }
      const caption = processing.querySelector(`[data-process-${side}-caption]`);
      if (caption) caption.textContent = stage[`${side}Caption`];
    }

    showProcessTime();
    updateProcessMotion();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectStage(index));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft")
        next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectStage(next);
      tabs[next].focus();
    });
  });
  if (hasProcessVideo) {
    for (const clip of processClips) {
      for (const event of ["loadeddata", "canplay", "progress", "seeked"])
        clip.addEventListener(event, updateProcessMotion);
      clip.addEventListener("error", () => {
        if (!clip.getAttribute("src")) return;
        processState.failed = true;
        pauseProcessClips();
        processClips.forEach((video) => { video.dataset.processReady = "false"; });
        if (processStatus) {
          processStatus.textContent = "Clip unavailable; showing recorded frames.";
          processStatus.hidden = false;
        }
        if (sequence) completeStep(playerIndex);
        updateProcessMotion();
      });
    }
    processButton?.addEventListener("click", () => {
      if (sequence) { activeStep = playerIndex; showStep(activeStep); controllers.forEach((controller, index) => { if (index !== playerIndex) controller.pause(); }); }
      if (processClips[0].ended) { processState.time = 0; processState.pendingSeek = true; }
      processState.paused = !processState.paused;
      updateProcessMotion();
    });
    processSeek?.addEventListener("input", () => {
      pauseProcessClips();
      processState.time = Number(processSeek.value);
      processState.pendingSeek = true;
      showProcessTime();
      updateProcessMotion();
    });
    document.addEventListener("visibilitychange", updateProcessMotion);
    reducedMotion.addEventListener("change", () => {
      processState.paused = reducedMotion.matches;
      updateProcessMotion();
    });
    if ("IntersectionObserver" in window) {
      const processObserver = new IntersectionObserver((entries) => {
        processState.visible = entries[0].isIntersecting;
        updateProcessMotion();
      }, { threshold: 0.08 });
      processObserver.observe(processing);
    } else processState.visible = true;
  }
  controllers.push({
    pause() { processState.paused = true; pauseProcessClips(); updateProcessMotion(); },
    resume() { processState.paused = false; updateProcessMotion(); },
    reset(run) {
      pauseProcessClips(); processState.time = 0; processState.pendingSeek = true;
      processState.paused = !run; showProcessTime(); updateProcessMotion();
    }
  });
  if (sequence) {
    processClips[0].addEventListener("ended", () => {
      processState.paused = true; processState.time = processState.duration;
      pauseProcessClips(); showProcessTime(); updateProcessMotion(); completeStep(playerIndex);
    });
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) players.forEach(player => { player.closest("article").hidden = false; });
    });
  }
  selectStage(Number(processing.dataset.processStage || 0));
  }
})();
