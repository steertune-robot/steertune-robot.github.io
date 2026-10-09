"use strict";
(() => {
  const figures = [...document.querySelectorAll("[data-science-figure]")];
  if (!figures.length) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const states = new Map();
  // Media are loaded only near the viewport and pause when offscreen or hidden.
  for (const figure of figures) {
    const button = figure.querySelector("[data-motion-toggle]");
    if (!button) continue;
    const state = {
      figure,
      button,
      visible: false,
      paused: reducedMotion.matches,
      videos: [...figure.querySelectorAll("[data-figure-video]")],
    };
    states.set(figure, state);
    button.hidden = false;
    button.addEventListener("click", () => {
      state.paused = !state.paused;
      updateMotion(state);
    });
    for (const detail of figure.querySelectorAll("details"))
      detail.addEventListener("toggle", () => updateMotion(state));
    for (const video of state.videos) {
      video.addEventListener("error", () => {
        video.classList.add("media-unavailable");
      });
    }
    updateMotion(state);
  }
  function updateMotion(state) {
    const playing = state.visible && !state.paused && !document.hidden;
    state.figure.classList.toggle("is-playing", playing);
    state.button.setAttribute("aria-pressed", String(state.paused));
    state.button.querySelector("[data-motion-label]").textContent = state.paused
      ? "Play example clips"
      : "Pause example clips";
    state.button.querySelector("[data-motion-icon]").textContent = state.paused
      ? "▷"
      : "Ⅱ";
    for (const video of state.videos) {
      if (
        playing &&
        (!video.closest("details") || video.closest("details").open)
      ) {
        const source = video.querySelector("source[data-src]");
        if (source) {
          source.src = source.dataset.src;
          source.removeAttribute("data-src");
          video.load();
        }
        video.play().catch(() => {
          /* Poster remains available when autoplay is blocked. */
        });
      } else video.pause();
    }
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const state = states.get(entry.target);
          state.visible = entry.isIntersecting;
          updateMotion(state);
        }
      },
      { threshold: 0.08 },
    );
    for (const figure of states.keys()) observer.observe(figure);
  } else
    for (const state of states.values()) {
      state.visible = true;
      updateMotion(state);
    }
  document.addEventListener("visibilitychange", () => {
    for (const state of states.values()) updateMotion(state);
  });
  reducedMotion.addEventListener("change", () => {
    for (const state of states.values()) {
      state.paused = reducedMotion.matches;
      updateMotion(state);
    }
  });
  // All four modality exports share the same eight-second timeline.
  const overviewState = states.get(document.getElementById("policy-figure"));
  if (overviewState?.videos.length) {
    const leader = overviewState.videos[0];
    leader.addEventListener("timeupdate", () => {
      if (!overviewState.figure.classList.contains("is-playing")) return;
      const frame = Math.min(79, Math.floor(leader.currentTime * 10));
      const instruction =
        frame < 13 || frame > 75
          ? "pouring food from pot into bowl"
          : "transferring food from pot to bowl";
      overviewState.figure.querySelector(
        "[data-example-instruction]",
      ).textContent = instruction;
      for (const video of overviewState.videos.slice(1)) {
        if (
          video.readyState >= 2 &&
          Math.abs(video.currentTime - leader.currentTime) > 0.22
        )
          video.currentTime = leader.currentTime;
      }
    });
  }
  const stages = [
    {
      input: "record-rgb.png",
      inputVideo: "processing-rgb.mp4",
      inputAlt: "Original egocentric RGB recording",
      inputCaption: "Egocentric RGB",
      output: "proprio.png",
      outputVideo: "proprio.webm",
      outputAlt: "Observed human hand landmarks retargeted to Wuji geometry",
      outputCaption: "Observed hand pose · Wuji rendering",
      eyebrow: "01 · Aria Gen 2",
      title: "Synchronized observation",
      copy: "RGB, stereo, hand tracking, and head pose at 10 Hz.",
      stat: "10 Hz",
      spec: "One common timeline",
    },
    {
      input: "cloud-before.png",
      inputVideo: "processing-cloud-before.webm",
      inputAlt: "Measured point cloud before hand and arm removal",
      inputCaption: "Before hand / arm removal",
      output: "cloud-after.png",
      outputVideo: "processing-cloud-after.webm",
      outputAlt: "The same point cloud after removing annotated hands and arms",
      outputCaption: "After hand / arm removal",
      eyebrow: "02 · Contact-based segmentation",
      title: "Remove body & segment",
      copy: "Remove hands and arms. Stable contact within 5 cm defines a snippet.",
      stat: "<5 cm",
      spec: "Hand–scene contact",
    },
    {
      input: "record-rgb.png",
      inputVideo: "processing-rgb.mp4",
      inputAlt: "Original RGB frame matching the binary object annotation",
      inputCaption: "Original RGB · matching crop",
      output: "object-mask.png",
      outputVideo: "processing-mask.webm",
      outputAlt: "Binary mask of the manipulated object",
      outputCaption: "Binary object mask",
      eyebrow: "03 · Language & object grounding",
      title: "Object grounding",
      copy: "A task instruction and tracked object mask describe each snippet.",
      stat: "48.7k",
      spec: "Generated instructions",
    },
    {
      input: "cloud-after.png",
      inputVideo: "processing-cloud-after.webm",
      inputAlt: "Dense cloud after hand and arm removal",
      inputCaption: "Dense cloud · detail view",
      output: "cloud-sampled.png",
      outputVideo: "processing-sampled.webm",
      outputAlt: "Detail view of the saved 5000-point model input sample",
      outputCaption: "5,000-point input · detail view",
      eyebrow: "04 · A common camera frame",
      title: "Camera-frame alignment",
      copy: "Crop and sample 5,000 points; align observations and actions to the anchor camera.",
      stat: "5,000",
      spec: "Sampled scene points",
    },
  ];
  const processing = document.getElementById("processing-figure");
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
    duration: 8,
    version: 0,
    pendingSeek: true,
    starting: false,
    failed: false,
    frame: 0,
  };
  const formatProcessTime = (time) => `0:${String(Math.floor(time)).padStart(2, "0")}`;
  function processCanPlay() {
    return processState.visible && !processState.paused && !document.hidden;
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
    processing
      .querySelector("[role=tabpanel]")
      .setAttribute("aria-labelledby", tabs[index].id);
    for (const side of ["input", "output"]) {
      const media = processing.querySelector(`[data-process-${side}]`);
      if (hasProcessVideo) {
        media.muted = true;
        media.loop = true;
        media.playsInline = true;
        media.autoplay = false;
        media.poster = `assets/figures/${stage[side]}`;
        media.setAttribute("aria-label", stage[`${side}Alt`]);
        media.dataset.processSrc = `assets/figures/${stage[`${side}Video`]}`;
        media.dataset.processReady = "false";
        media.parentElement.style.backgroundImage = `url("assets/figures/${stage[side]}")`;
      } else {
        media.src = `assets/figures/${stage[side]}`;
        media.alt = stage[`${side}Alt`];
      }
      processing.querySelector(`[data-process-${side}-caption]`).textContent =
        stage[`${side}Caption`];
    }
    for (const name of ["eyebrow", "title", "copy"])
      processing.querySelector(`[data-process-${name}]`).textContent =
        stage[name];
    const spec = processing.querySelector("[data-process-spec]");
    spec.querySelector("strong").textContent = stage.stat;
    spec.querySelector("span").textContent = stage.spec;
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
        updateProcessMotion();
      });
    }
    processButton?.addEventListener("click", () => {
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
  selectStage(0);
  const comparison = document.getElementById("object-figure");
  const objectDetails = {
    "flower-original":
      "Flower · original object: 7 of 10 successful trials (70%).",
    "flower-new":
      "Flower · replacement object: 6 of 10 successful trials (60%); 10 percentage points below the original.",
    "toy-original": "Toy · original object: 10 of 10 successful trials (100%).",
    "toy-new":
      "Toy · replacement object: 9 of 10 successful trials (90%); 10 percentage points below the original.",
  };
  const reset = comparison.querySelector("[data-object-reset]");
  function selectObject(button) {
    for (const sibling of comparison.querySelectorAll("[data-object]"))
      sibling.setAttribute("aria-pressed", String(sibling === button));
    comparison.querySelector("[data-object-detail]").textContent = button
      ? objectDetails[button.dataset.object]
      : "Successes in 10 trials.";
    reset.hidden = !button;
  }
  for (const button of comparison.querySelectorAll("[data-object]"))
    button.addEventListener("click", () => selectObject(button));
  reset.addEventListener("click", () => {
    selectObject(null);
    comparison.querySelector("[data-object]").focus();
  });
})();
