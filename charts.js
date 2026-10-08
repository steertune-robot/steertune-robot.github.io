"use strict";

// Transcribed from Tables I–III and Figure 8 of the supplied manuscript.
// Averages preserve the paper's rounding (8.3/10 is displayed as 83%).
const experimentResults = {
  adaptation: {
    title: "Success by adaptation method",
    source: "Table I · 3 lab tasks",
    note: "10 trials per task; averages as reported.",
    rows: [
      {
        name: "Steertuning",
        hint: "2k steps + steering",
        counts: [9, 7, 9],
        average: 83,
        ours: true,
      },
      {
        name: "Steering only",
        hint: "No finetuning",
        counts: [2, 2, 3],
        average: 23,
      },
      {
        name: "Short finetune",
        hint: "2k steps",
        counts: [0, 0, 0],
        average: 0,
      },
      {
        name: "Full finetune",
        hint: "150k steps",
        counts: [7, 8, 8],
        average: 77,
      },
    ],
  },
  architecture: {
    title: "Architecture ablations",
    source: "Table II · 3 lab tasks",
    note: "Same training and evaluation across variants.",
    groups: { all: "All variants", encoder: "Encoder", decoder: "Decoder" },
    rows: [
      { name: "PointNeXt", group: "encoder", counts: [5, 6, 7], average: 60 },
      { name: "PTv3", group: "encoder", counts: [10, 4, 9], average: 77 },
      {
        name: "Utonia",
        group: "encoder",
        counts: [9, 7, 9],
        average: 83,
        ours: true,
      },
      { name: "UNet", group: "decoder", counts: [8, 8, 6], average: 73 },
      {
        name: "DiT",
        group: "decoder",
        counts: [9, 7, 9],
        average: 83,
        ours: true,
      },
    ],
  },
  trajectory: {
    title: "Choosing a steering trajectory",
    source: "Table III · 3 lab tasks",
    note: "Same steering; different demonstration selection.",
    rows: [
      { name: "VINN", counts: [7, 2, 7], average: 53 },
      { name: "Wrist pose", counts: [6, 7, 4], average: 57 },
      { name: "Object-based", counts: [9, 7, 9], average: 83, ours: true },
    ],
  },
  generalization: {
    title: "Transfer to unseen objects",
    source: "Figure 8 · 10 trials per condition",
    note: "Success drops 10 percentage points on each task.",
    groups: { all: "Both tasks", flower: "Flower", toy: "Toy" },
    rows: [
      {
        name: "Flower",
        hint: "Original object",
        group: "flower",
        value: 70,
        count: 7,
        original: true,
      },
      {
        name: "Flower",
        hint: "New object",
        group: "flower",
        value: 60,
        count: 6,
        ours: true,
      },
      {
        name: "Toy",
        hint: "Original object",
        group: "toy",
        value: 100,
        count: 10,
        original: true,
      },
      {
        name: "Toy",
        hint: "New object",
        group: "toy",
        value: 90,
        count: 9,
        ours: true,
      },
    ],
  },
};

const metricNames = {
  average: "Average",
  trash: "Trash",
  flower: "Flower",
  bread: "Bread",
};
const taskIndices = { trash: 0, flower: 1, bread: 2 };
const chartReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

function chartElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setChartNumber(element, value) {
  // Keep the reported result stable while the bar itself animates.
  element.dataset.value = value;
  element.textContent = `${value}%`;
}

for (const figure of document.querySelectorAll("[data-result-chart]")) {
  const key = figure.dataset.resultChart;
  const data = experimentResults[key];
  let metric = "average";
  let group = data.groups ? Object.keys(data.groups)[0] : null;
  let visible = false;
  let renderedRows = [];

  const header = chartElement("div", "chart-header");
  const headingBlock = chartElement("div");
  headingBlock.append(chartElement("span", "chart-source", data.source));
  const title = chartElement("h4", "chart-title", data.title);
  title.id = `${key}-chart-title`;
  figure.setAttribute("aria-labelledby", title.id);
  headingBlock.append(title);
  const replay = chartElement("button", "chart-replay", "↻ Replay");
  replay.type = "button";
  replay.setAttribute(
    "aria-label",
    `Replay ${data.title.toLowerCase()} animation`,
  );
  header.append(headingBlock, replay);

  const controls = chartElement("div", "chart-controls");
  if (data.groups) {
    const buttons = chartElement("div", "chart-segments");
    buttons.setAttribute("role", "group");
    buttons.setAttribute(
      "aria-label",
      key === "architecture"
        ? "Architecture component"
        : "Object generalization task",
    );
    for (const [value, label] of Object.entries(data.groups)) {
      const button = chartElement("button", "", label);
      button.type = "button";
      button.setAttribute("aria-pressed", String(value === group));
      button.addEventListener("click", () => {
        if (group === value) return;
        group = value;
        for (const sibling of buttons.children)
          sibling.setAttribute("aria-pressed", String(sibling === button));
        buildRows();
        update(true);
      });
      buttons.append(button);
    }
    controls.append(buttons);
  }
  if (key !== "generalization") {
    const label = chartElement("label", "chart-select-label", "Task");
    const select = chartElement("select", "chart-select");
    select.setAttribute("aria-label", `Task for ${data.title.toLowerCase()}`);
    for (const [value, name] of Object.entries(metricNames)) {
      const option = chartElement(
        "option",
        "",
        value === "average" ? "Average · 3 tasks" : name,
      );
      option.value = value;
      select.append(option);
    }
    select.addEventListener("change", () => {
      metric = select.value;
      update();
    });
    label.append(select);
    controls.append(label);
  }
  const axisHeading = chartElement(
    "div",
    "chart-axis-heading",
    "Success rate (%)",
  );
  const axis = chartElement("div", "chart-axis");
  axis.setAttribute("aria-hidden", "true");
  for (const tick of [0, 25, 50, 75, 100])
    axis.append(chartElement("span", "", String(tick)));
  const plot = chartElement("div", "bar-chart");
  const status = chartElement("p", "sr-only");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  const caption = chartElement("figcaption", "chart-caption", data.note);
  const guides = {
    adaptation: "Green: brief finetuning + steering.",
    architecture: "Compare within each group; green marks our choice.",
    trajectory: "How to choose the guiding demonstration.",
    generalization: "Original vs. replacement objects.",
  };
  figure.append(
    header,
    chartElement("p", "chart-guide", guides[key]),
    controls,
    axisHeading,
    axis,
    plot,
    caption,
    status,
  );

  function buildRows() {
    for (const item of renderedRows) {
      if (item.number.animationFrame)
        cancelAnimationFrame(item.number.animationFrame);
    }
    plot.replaceChildren();
    let lastGroup = null;
    renderedRows = data.rows
      .filter((row) => !group || group === "all" || row.group === group)
      .map((row, index) => {
        const element = chartElement(
          "div",
          `chart-row${row.ours ? " is-ours" : ""}${row.original ? " is-original" : ""}`,
        );
        element.tabIndex = 0;
        element.style.setProperty("--row-delay", `${index * 65}ms`);
        if (row.group && row.group !== lastGroup && group === "all") {
          const groupName =
            key === "architecture"
              ? row.group === "encoder"
                ? "Point-cloud encoder"
                : "Action decoder"
              : data.groups[row.group];
          plot.append(chartElement("div", "bar-group-caption", groupName));
          lastGroup = row.group;
        }
        const meta = chartElement("div", "bar-meta");
        meta.append(
          chartElement(
            "span",
            "bar-name",
            key === "generalization" ? row.hint : row.name,
          ),
        );
        if (key !== "generalization" && row.hint)
          meta.append(
            chartElement(
              "span",
              "bar-hint",
              row.hint || data.groups[row.group],
            ),
          );
        const track = chartElement("div", "bar-track");
        const bar = chartElement("div", "chart-bar");
        track.append(bar);
        const number = chartElement("span", "bar-value", "0%");
        const tooltip = chartElement("span", "chart-tooltip");
        tooltip.id = `${key}-tooltip-${index}`;
        tooltip.setAttribute("role", "tooltip");
        element.setAttribute("aria-describedby", tooltip.id);
        // The accessible label contains the exact result; animated copies stay silent.
        for (const visual of [meta, track, number])
          visual.setAttribute("aria-hidden", "true");
        element.append(meta, track, number, tooltip);
        plot.append(element);
        return { row, element, bar, number, tooltip };
      });
  }

  function update(replayNumbers = false) {
    const summary = [];
    for (const item of renderedRows) {
      const { row, element, bar, number, tooltip } = item;
      const value =
        row.value ??
        (metric === "average"
          ? row.average
          : row.counts[taskIndices[metric]] * 10);
      const context = row.value !== undefined ? row.hint : metricNames[metric];
      const exact =
        row.value !== undefined
          ? `${row.count}/10 successful trials`
          : metric === "average"
            ? `${row.average / 10}/10 reported average · Trash ${row.counts[0]}/10 · Flower ${row.counts[1]}/10 · Bread ${row.counts[2]}/10`
            : `${row.counts[taskIndices[metric]]}/10 successful trials on ${context}`;
      bar.style.width = `${value}%`;
      element.classList.toggle("is-zero", value === 0);
      element.setAttribute(
        "aria-label",
        `${row.name}, ${context}, ${value}% success`,
      );
      tooltip.textContent = exact;
      if (visible) setChartNumber(number, value);
      else {
        number.dataset.value = value;
        number.textContent = `${value}%`;
      }
      summary.push(`${row.name} ${value}%`);
    }
    axisHeading.textContent =
      key === "generalization"
        ? "Success rate (%) · higher is better"
        : `${metricNames[metric]} success rate (%) · higher is better`;
    status.textContent = `${data.title}. ${group && data.groups ? `${data.groups[group]}. ` : ""}${axisHeading.textContent}: ${summary.join(", ")}.`;
  }

  function reveal() {
    visible = true;
    figure.classList.add("is-visible");
    update(true);
  }
  replay.addEventListener("click", () => {
    figure.classList.remove("is-visible");
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  });
  buildRows();
  update();
  if ("IntersectionObserver" in window && !chartReducedMotion.matches) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(figure);
  } else reveal();

  // Show charts first; full static tables stay open when JavaScript is unavailable.
  const table = figure.nextElementSibling;
  if (table?.matches("details[data-result-table]")) table.open = false;
}
