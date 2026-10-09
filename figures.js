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
      ? "Play"
      : "Pause";
    state.button.querySelector("[data-motion-icon]").textContent = state.paused
      ? "▷"
      : "Ⅱ";
    for (const video of state.videos) {
      if (playing) {
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
  const overviewState = states.get(document.getElementById("system-figure"));
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
      inputAlt: "Original egocentric RGB recording",
      inputCaption: "Egocentric RGB",
      output: "proprio.png",
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
      inputAlt: "Measured point cloud before hand and arm removal",
      inputCaption: "Before hand / arm removal",
      output: "cloud-after.png",
      outputAlt: "The same point cloud after removing annotated hands and arms",
      outputCaption: "After hand / arm removal",
      eyebrow: "02 · Contact-based segmentation",
      title: "Contact segmentation",
      copy: "Remove hands and arms. Stable contact within 5 cm defines a snippet.",
      stat: "<5 cm",
      spec: "Hand–scene contact",
    },
    {
      input: "record-rgb.png",
      inputAlt: "Original RGB frame matching the binary object annotation",
      inputCaption: "Original RGB · matching crop",
      output: "object-mask.png",
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
      inputAlt: "Dense cloud after hand and arm removal",
      inputCaption: "Dense cloud · detail view",
      output: "cloud-sampled.png",
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
  function selectStage(index) {
    const stage = stages[index];
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    processing
      .querySelector("[role=tabpanel]")
      .setAttribute("aria-labelledby", tabs[index].id);
    for (const side of ["input", "output"]) {
      const img = processing.querySelector(`[data-process-${side}]`);
      img.src = `assets/figures/${stage[side]}`;
      img.alt = stage[`${side}Alt`];
      processing.querySelector(`[data-process-${side}-caption]`).textContent =
        stage[`${side}Caption`];
    }
    for (const name of ["eyebrow", "title", "copy"])
      processing.querySelector(`[data-process-${name}]`).textContent =
        stage[name];
    const spec = processing.querySelector("[data-process-spec]");
    spec.querySelector("strong").textContent = stage.stat;
    spec.querySelector("span").textContent = stage.spec;
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
  selectStage(0);
  const architecture = document.getElementById("policy-figure");
  const encoderDetails = {
    scene:
      "Utonia: the frozen point-cloud encoder maps 5,000 scene points to 512 tokens, each 1,024-dimensional. The video above shows a denser visualization before sampling.",
    object:
      "ResNet-18: a binary 255 × 255 manipulated-object mask becomes one 1,024-dimensional token. This encoder is trained from scratch during pretraining.",
    hand: "Proprioception FFN: ten 3D fingertip locations (five per hand), in the anchor camera frame, become one 1,024-dimensional token. The hand meshes above visualize retargeted landmarks.",
    text: "SigLIP: the frozen text encoder maps the task instruction to one 1,024-dimensional token. Together, the four modalities form 515 observation tokens.",
  };
  for (const button of architecture.querySelectorAll("[data-encoder]"))
    button.addEventListener("click", () => {
      for (const sibling of architecture.querySelectorAll("[data-encoder]"))
        sibling.setAttribute("aria-pressed", String(sibling === button));
      architecture.querySelector(".encoder-inspector").hidden = false;
      architecture.querySelector("[data-encoder-detail]").textContent =
        encoderDetails[button.dataset.encoder];
    });
  const model = [116, 91, 105, 70, 78, 47, 69, 39, 46];
  const demo = [105, 100, 88, 80, 68, 57, 51, 37, 26];
  const path = (values) =>
    values.map((y, i) => `${i ? "L" : "M"}${20 + i * 37.5},${y}`).join(" ");
  architecture.querySelector("[data-demo-curve]").setAttribute("d", path(demo));
  architecture
    .querySelector("[data-model-curve]")
    .setAttribute("d", path(model));
  const points = architecture.querySelector("[data-blend-points]");
  for (let i = 0; i < model.length; i++) {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", 20 + i * 37.5);
    circle.setAttribute("r", 2.5);
    points.append(circle);
  }
  const weight = architecture.querySelector("#steering-weight");
  function blend() {
    const w = Number(weight.value);
    const values = model.map((v, i) => (1 - w) * v + w * demo[i]);
    architecture
      .querySelector("[data-blend-curve]")
      .setAttribute("d", path(values));
    [...points.children].forEach((circle, i) =>
      circle.setAttribute("cy", values[i]),
    );
    architecture.querySelector("[data-demo-weight]").textContent = w.toFixed(1);
    architecture.querySelector("[data-model-weight]").textContent = (
      1 - w
    ).toFixed(1);
    const setting =
      w === 0.3
        ? " · paper setting"
        : w === 0
          ? " · model only"
          : w === 1
            ? " · demo replay"
            : "";
    architecture.querySelector("[data-steering-value]").textContent =
      `w = ${w.toFixed(1)}${setting}`;
    weight.setAttribute(
      "aria-valuetext",
      `Steering weight ${w.toFixed(1)}${setting}`,
    );
  }
  weight.addEventListener("input", blend);
  blend();
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
