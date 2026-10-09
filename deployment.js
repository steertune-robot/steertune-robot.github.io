/* Ordered deployment walkthrough. Connections illustrate the paper's system;
 * the animation does not replay measured robot state or invoke a model. */
(() => {
  "use strict";
  const figure = document.getElementById("deployment-figure");
  const d3 = window.d3;
  if (!figure || !d3) return;
  const flow = figure.querySelector("[data-deploy-flow]");
  const svgElement = figure.querySelector("[data-deploy-wires]");
  const play = figure.querySelector("[data-deploy-play]");
  const replay = figure.querySelector("[data-deploy-replay]");
  const title = figure.querySelector("[data-deploy-detail-title]");
  const detail = figure.querySelector("[data-deploy-detail]");
  const status = figure.querySelector("[data-deploy-status]");
  const buttons = [...figure.querySelectorAll("[data-deploy-step]")];
  const inspectors = [...figure.querySelectorAll("[data-deploy-inspect]")];
  const nodes = new Map(
    [...figure.querySelectorAll("[data-deploy-node]")].map((el) => [
      el.dataset.deployNode,
      el,
    ]),
  );
  if (
    !flow ||
    !svgElement ||
    !play ||
    !replay ||
    !title ||
    !detail ||
    !status ||
    buttons.length !== 4
  )
    return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 700px)");
  const duration = 3500;
  const steps = [
    {
      skill: "navigation",
      title: "Navigate to the white cup",
      body: "Find the cup by nearest SAM3-latent lookup in the voxelized SLAM map, then move the mobile base to its location.",
    },
    {
      skill: "manipulation",
      title: "Pick up the white cup",
      body: "Current observations and the pickup instruction condition the task-adapted policy. Predicted human landmarks become robot motion through wrist IK and Wuji hand retargeting.",
    },
    {
      skill: "navigation",
      title: "Carry the cup to the trash",
      body: "Locate the trash in the scene map and navigate to it. The arm and hand pose is held while the mobile base carries the cup.",
    },
    {
      skill: "manipulation",
      title: "Drop the cup into the trash",
      body: "The learned, human-demonstration skill predicts the placement motion. Wrist IK and Wuji hand retargeting convert the human-landmark trajectory to robot commands.",
    },
  ];
  const descriptions = {
    planner: {
      title: "One command, ordered subtasks",
      body: "Gemini ER 1.6 decomposes the command into ordered navigation and manipulation subtasks. Each instruction is passed to its corresponding controller.",
    },
    navigation: {
      title: "Object navigation",
      body: "Nearest SAM3-latent lookup identifies the target in a voxelized SLAM scene map. The mobile base moves to the target; during carrying, the arm and hand pose is held.",
    },
    manipulation: {
      title: "Learned manipulation",
      body: "Current observations and the subtask instruction condition the task-adapted policy. It predicts human landmarks, converted to robot motion by wrist IK, Wuji hand retargeting, and real-time chunking.",
    },
  };
  const edges = [];
  steps.forEach((step, index) => {
    edges.push({
      id: `plan-${index}`,
      from: "planner",
      to: `step-${index}`,
      step: index,
      skill: step.skill,
    });
    edges.push({
      id: `skill-${index}`,
      from: `step-${index}`,
      to: step.skill,
      step: index,
      skill: step.skill,
    });
  });
  ["navigation", "manipulation"].forEach((skill) =>
    edges.push({ id: `execute-${skill}`, from: skill, to: "robot", skill }),
  );
  let current = 0,
    elapsed = 0,
    inspected = null,
    paused = reduced.matches;
  let visible = false,
    frame = 0,
    previous = null,
    resizeFrame = 0;
  let selectedPaths = [];
  const svg = d3.select(svgElement);
  const routes = svg.append("g").attr("class", "deploy-route-layer");
  const packets = svg.append("g").attr("class", "deploy-packet-layer");
  const dots = packets
    .selectAll("circle")
    .data([0, 1, 2])
    .join("circle")
    .attr("class", "deploy-packet")
    .attr("r", 2.5)
    .attr("opacity", 0);
  const color = (skill) =>
    `var(--deploy-${skill === "navigation" ? "nav" : "manip"})`;
  const activeIds = () => [
    `plan-${current}`,
    `skill-${current}`,
    `execute-${steps[current].skill}`,
  ];
  const running = () => visible && !paused && !document.hidden;

  function roundedRoute(points, radius = 5) {
    const path = d3.path();
    path.moveTo(...points[0]);
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1],
        b = points[i],
        c = points[i + 1];
      const before = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const after = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const r = Math.min(radius, before / 2, after / 2);
      if (!before || !after) {
        path.lineTo(...b);
        continue;
      }
      path.lineTo(
        b[0] + ((a[0] - b[0]) * r) / before,
        b[1] + ((a[1] - b[1]) * r) / before,
      );
      path.quadraticCurveTo(
        ...b,
        b[0] + ((c[0] - b[0]) * r) / after,
        b[1] + ((c[1] - b[1]) * r) / after,
      );
    }
    path.lineTo(...points[points.length - 1]);
    return path.toString();
  }
  function geometry(edge, bounds) {
    const source = nodes.get(edge.from)?.getBoundingClientRect();
    const target = nodes.get(edge.to)?.getBoundingClientRect();
    if (!source || !target) return "";
    if (!mobile.matches) {
      const x1 = source.right - bounds.left + 1,
        y1 = source.top - bounds.top + source.height / 2;
      const x2 = target.left - bounds.left - 1,
        y2 = target.top - bounds.top + target.height / 2;
      const bend = Math.max(0, (x2 - x1) * 0.5);
      return `M${x1},${y1}C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`;
    }
    const x1 = source.left - bounds.left + source.width / 2,
      y1 = source.bottom - bounds.top + 1;
    const x2 = target.left - bounds.left + target.width / 2,
      y2 = target.top - bounds.top - 1;
    // The outside rail bypasses the centered column labels between mobile rows.
    const rail = edge.skill === "navigation" ? 4 : bounds.width - 4;
    const inset = Math.min(9, Math.max(2, (y2 - y1) / 4));
    return roundedRoute([
      [x1, y1],
      [x1, y1 + inset],
      [rail, y1 + inset],
      [rail, y2 - inset],
      [x2, y2 - inset],
      [x2, y2],
    ]);
  }
  function highlighted(edge) {
    if (!inspected) return activeIds().includes(edge.id);
    if (inspected === "planner") return edge.from === "planner";
    return edge.skill === inspected;
  }
  function drawRoutes() {
    const bounds = flow.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    svg.attr("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    const visibleEdges = mobile.matches
      ? edges.filter((edge) => activeIds().includes(edge.id))
      : edges;
    const groups = routes
      .selectAll("g.deploy-edge")
      .data(visibleEdges, (edge) => edge.id)
      .join((enter) => {
        const group = enter.append("g").attr("class", "deploy-edge");
        group.append("path").attr("class", "deploy-ribbon");
        group.append("path").attr("class", "deploy-wire");
        return group;
      });
    groups
      .attr("data-deploy-route", (edge) => edge.id)
      .style("--route-color", (edge) => color(edge.skill));
    groups.each(function (edge) {
      d3.select(this)
        .selectAll("path")
        .attr("d", geometry(edge, bounds))
        .classed("is-active", highlighted(edge));
    });
    selectedPaths = activeIds().map((id) => {
      const path = routes
        .selectAll("g.deploy-edge")
        .filter((edge) => edge.id === id)
        .select(".deploy-wire")
        .node();
      return path ? { path, length: path.getTotalLength() } : null;
    });
    paint();
  }
  function updateDetail() {
    const description = inspected ? descriptions[inspected] : steps[current];
    title.textContent = description.title;
    detail.textContent = description.body;
    status.textContent = inspected
      ? "Inspecting"
      : `Step ${current + 1} / 4${paused ? " · Paused" : ""}`;
    play.textContent = paused ? "Play walkthrough" : "Pause walkthrough";
    play.setAttribute("aria-pressed", String(paused));
    buttons.forEach((button, index) => {
      button.setAttribute("aria-pressed", String(index === current));
      button.style.setProperty("--route-color", color(steps[index].skill));
    });
    inspectors.forEach((button) => {
      const id = button.dataset.deployInspect;
      button.classList.toggle("is-inspected", inspected === id);
      button.classList.toggle("is-active", id === steps[current].skill);
      button.setAttribute("aria-pressed", String(inspected === id));
      if (id !== "planner")
        button.style.setProperty("--route-color", color(id));
    });
  }
  function paint() {
    const progress = Math.max(0, Math.min(1, elapsed / duration));
    buttons.forEach((button, index) => {
      const bar = button.querySelector(".deploy-step-progress");
      if (bar)
        bar.style.width = index === current ? `${progress * 100}%` : "0%";
    });
    dots
      .style("--route-color", color(steps[current].skill))
      .each(function (index) {
        const route = selectedPaths[index],
          fraction = progress * 3 - index;
        const show = !inspected && route && fraction >= 0 && fraction < 1;
        this.setAttribute("opacity", show ? "1" : "0");
        if (show) {
          const point = route.path.getPointAtLength(fraction * route.length);
          this.setAttribute("cx", point.x);
          this.setAttribute("cy", point.y);
        }
      });
  }
  function tick(now) {
    frame = 0;
    if (!running()) {
      previous = null;
      return;
    }
    if (previous !== null) elapsed += Math.max(0, now - previous);
    previous = now;
    if (elapsed >= duration) {
      const advance = Math.floor(elapsed / duration);
      current = (current + advance) % steps.length;
      elapsed %= duration;
      inspected = null;
      updateDetail();
      drawRoutes();
    } else paint();
    frame = requestAnimationFrame(tick);
  }
  function reconcile() {
    if (running() && !frame) {
      previous = null;
      frame = requestAnimationFrame(tick);
    } else if (!running() && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
    }
  }
  function choose(index) {
    current = index;
    elapsed = 0;
    inspected = null;
    paused = true;
    updateDetail();
    drawRoutes();
    reconcile();
  }
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => choose(index));
    button.addEventListener("keydown", (event) => {
      const next =
        event.key === "ArrowRight"
          ? (index + 1) % 4
          : event.key === "ArrowLeft"
            ? (index + 3) % 4
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? 3
                : null;
      if (next === null) return;
      event.preventDefault();
      choose(next);
      buttons[next].focus();
    });
  });
  inspectors.forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.deployInspect;
      if (!descriptions[id]) return;
      paused = true;
      inspected = id;
      if (id !== "planner" && steps[current].skill !== id) {
        current = steps.findIndex((step) => step.skill === id);
        elapsed = 0;
      }
      updateDetail();
      drawRoutes();
      reconcile();
    }),
  );
  play.addEventListener("click", () => {
    paused = !paused;
    if (!paused) inspected = null;
    updateDetail();
    drawRoutes();
    reconcile();
  });
  replay.addEventListener("click", () => {
    current = 0;
    elapsed = 0;
    inspected = null;
    paused = false;
    updateDetail();
    drawRoutes();
    reconcile();
  });
  reduced.addEventListener("change", () => {
    paused = true;
    updateDetail();
    reconcile();
  });
  document.addEventListener("visibilitychange", reconcile);
  function scheduleGeometry() {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      drawRoutes();
    });
  }
  mobile.addEventListener("change", scheduleGeometry);
  if ("ResizeObserver" in window) {
    const resize = new ResizeObserver(scheduleGeometry);
    resize.observe(flow);
    nodes.forEach((node) => resize.observe(node));
  } else window.addEventListener("resize", scheduleGeometry);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        reconcile();
      },
      { threshold: 0.08 },
    ).observe(flow);
  } else visible = true;
  document.fonts?.ready.then(scheduleGeometry);
  updateDetail();
  drawRoutes();
  reconcile();
})();
