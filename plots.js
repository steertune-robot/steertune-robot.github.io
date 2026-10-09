"use strict";

// Figures 6–7 are digitizations of the publication, not raw experimental logs.
// Nulls denote points clipped above 350 MSE; never interpolate those values.
const plotNS = "http://www.w3.org/2000/svg";
function plotNode(tag, attributes = {}, text) {
  const node = document.createElementNS(plotNS, tag);
  for (const [name, value] of Object.entries(attributes))
    node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function plotText(x, y, text, attributes = {}) {
  return plotNode("text", { x, y, class: "plot-label", ...attributes }, text);
}
function htmlNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function revealPlot(figure) {
  if (chartReducedMotion.matches || !("IntersectionObserver" in window)) {
    figure.classList.add("is-visible");
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        figure.classList.add("is-visible");
        observer.disconnect();
      }
    },
    { threshold: 0.12 },
  );
  observer.observe(figure);
}

const scalingRoot = document.getElementById("scaling-charts");
const scalingNotes = {
  "pretraining-compute": {
    title: "Pretraining steps",
    takeaway: "200k → 1M updates: ≈60% → 83% success.",
    emphasis: "≈60% → 83%",
  },
  "lora-compute": {
    title: "Finetuning steps",
    takeaway: "2k updates: ≈83% success.",
    emphasis: "2k updates",
  },
  "pretraining-data": {
    title: "Pretraining data",
    takeaway: "20 → 100 hours: ≈67% → 83% success.",
    emphasis: "≈67% → 83%",
  },
  demonstrations: {
    title: "Demonstrations per task",
    takeaway: "1 → 5 demonstrations: ≈23% → 83% success.",
    emphasis: "1 → 5 demonstrations",
  },
};
for (const [panelIndex, data] of plotResults.scaling.entries()) {
  const figure = htmlNode("figure", "curve-panel scaling-panel");
  figure.id = `plot-${data.id}`;
  const title = htmlNode("h4", "chart-title", scalingNotes[data.id].title);
  title.id = `${data.id}-title`;
  figure.setAttribute("aria-labelledby", title.id);
  const note = scalingNotes[data.id];
  const takeaway = htmlNode("p", "plot-takeaway");
  const [before, after] = note.takeaway.split(note.emphasis);
  takeaway.append(before, htmlNode("em", "text-accent", note.emphasis), after);
  figure.append(
    htmlNode(
      "span",
      "chart-source",
      `Figure 6${"abcd"[panelIndex]} · 3 lab tasks`,
    ),
    title,
    takeaway,
  );
  const svg = plotNode("svg", {
    viewBox: "0 0 300 224",
    class: "scientific-plot",
    role: "group",
    "aria-label": `${data.title}. Approximate success rate and one standard deviation.`,
  });
  const x = (i) => 35 + (i * 250) / (data.points.length - 1);
  const y = (value) => 168 - value * 1.32;
  svg.append(plotText(35, 16, "Success (%) ↑"));
  for (const tick of [0, 50, 100]) {
    svg.append(
      plotNode("line", {
        x1: 35,
        x2: 285,
        y1: y(tick),
        y2: y(tick),
        class: "plot-grid",
      }),
      plotText(28, y(tick) + 4, tick, { "text-anchor": "end" }),
    );
  }
  const defaultPoint = data.points[data.defaultIndex];
  svg.append(
    plotNode("line", {
      x1: x(data.defaultIndex),
      x2: x(data.defaultIndex),
      y1: y(100),
      y2: y(0),
      class: "plot-default-guide",
    }),
  );
  const errors = plotNode("g", {
    class: "plot-error-bars",
    "aria-hidden": "true",
  });
  for (const [index, point] of data.points.entries()) {
    const px = x(index),
      top = y(point.mean + point.std),
      bottom = y(point.mean - point.std);
    errors.append(
      plotNode("path", {
        d: `M${px},${top}V${bottom} M${px - 5},${top}H${px + 5} M${px - 5},${bottom}H${px + 5}`,
      }),
    );
  }
  svg.append(errors);
  svg.append(
    plotNode("path", {
      d: data.points
        .map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.mean)}`)
        .join(" "),
      class: "plot-curve scaling-curve",
      pathLength: 1,
      "aria-hidden": "true",
    }),
  );
  const readout = htmlNode("figcaption", "plot-readout");
  const label = htmlNode("span", "plot-readout-label");
  const value = htmlNode("strong", "plot-readout-value");
  const uncertainty = htmlNode("span", "plot-readout-detail");
  readout.append(label, value, uncertainty);
  const circles = [];
  function selectPoint(index) {
    const point = data.points[index];
    const unit =
      data.id === "pretraining-data"
        ? "hours"
        : data.id === "demonstrations"
          ? "demos"
          : "updates";
    label.textContent = `${point.label} ${unit}${index === data.defaultIndex ? " · chosen" : ""}`;
    value.textContent = `≈ ${point.mean.toFixed(1)}%`;
    uncertainty.textContent = `±${point.std.toFixed(1)} pp across tasks`;
    circles.forEach((circle, i) =>
      circle.classList.toggle("is-active", i === index),
    );
  }
  for (const [index, point] of data.points.entries()) {
    svg.append(
      plotText(x(index), 191, point.label, { "text-anchor": "middle" }),
    );
    // A large transparent hit target keeps touch and keyboard inspection usable.
    const target = plotNode("g", {
      tabindex: 0,
      role: "button",
      "aria-label": `${point.label} ${data.xLabel.toLowerCase()}, approximately ${point.mean}% success, plus or minus ${point.std} percentage points standard deviation${index === data.defaultIndex ? ", default setting" : ""}`,
      class: "plot-point",
    });
    target.append(
      plotNode("circle", {
        cx: x(index),
        cy: y(point.mean),
        r: 13,
        class: "plot-hit",
      }),
    );
    const circle = plotNode("circle", {
      cx: x(index),
      cy: y(point.mean),
      r: index === data.defaultIndex ? 4.5 : 3.5,
      class: `plot-dot${index === data.defaultIndex ? " is-default" : ""}`,
    });
    target.append(circle);
    circles.push(circle);
    for (const event of ["pointerenter", "focus", "click"])
      target.addEventListener(event, () => selectPoint(index));
    target.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPoint(index);
      }
    });
    svg.append(target);
  }
  svg.append(plotText(160, 216, data.xLabel, { "text-anchor": "middle" }));
  figure.append(svg, readout);
  scalingRoot.append(figure);
  selectPoint(data.defaultIndex);
  revealPlot(figure);

}

const steeringFigure = document.getElementById("steering-chart");
const steering = plotResults.steering;
const defaultBudget = steering.series.findIndex((s) => s.label === "2k");
const keyBudgets = [
  0,
  defaultBudget,
  steering.series.findIndex((s) => s.label === "128k"),
];
let activeBudget = defaultBudget;
let activeWeight = steering.weights.indexOf(0.3);
const curveColors = [
  "#b38f68",
  "#b5a28b",
  "#a08a72",
  "#2f5d4a",
  "#917355",
  "#7e664f",
  "#725944",
  "#604a36",
  "#503c2b",
  "#77766b",
];
steeringFigure.append(
  htmlNode("span", "chart-source", "Figure 7 · action prediction on 12 tasks"),
);
const steeringTitle = htmlNode(
  "h4",
  "chart-title",
  "Brief finetuning approaches a longer run",
);
steeringTitle.id = "steering-plot-title";
steeringFigure.setAttribute("aria-labelledby", steeringTitle.id);
steeringFigure.append(
  steeringTitle,
  htmlNode(
    "p",
    "chart-guide",
    "Mean prediction error across 12 tasks; lower is better.",
  ),
);

const controls = htmlNode("div", "steering-filters");
const budgetLabel = htmlNode("label", "chart-select-label", "Finetuning");
const budgetSelect = htmlNode("select", "chart-select");
budgetSelect.setAttribute("aria-label", "Inspect finetuning budget");
steering.series.forEach((series, index) => {
  const option = htmlNode(
    "option",
    "",
    series.label === "None"
      ? "None"
      : `${series.label} steps${index === defaultBudget ? " · ours" : ""}`,
  );
  option.value = index;
  budgetSelect.append(option);
});
budgetSelect.value = activeBudget;
budgetLabel.append(budgetSelect);
const weightLabel = htmlNode(
  "label",
  "chart-select-label",
  "Steering strength",
);
const weightSelect = htmlNode("select", "chart-select");
weightSelect.setAttribute("aria-label", "Inspect steering weight");
steering.weights.forEach((weight, index) => {
  const option = htmlNode(
    "option",
    "",
    `${weight.toFixed(1)}${weight === 0.3 ? " · chosen" : weight === 0 ? " · model only" : weight === 1 ? " · replay demo" : ""}`,
  );
  option.value = index;
  weightSelect.append(option);
});
weightSelect.value = activeWeight;
weightLabel.append(weightSelect);
const allLabel = htmlNode("label", "curve-all-label");
const fullToggle = htmlNode("input");
fullToggle.type = "checkbox";
fullToggle.id = "show-all-budgets";
allLabel.append(fullToggle, document.createTextNode("Show all 10 budgets"));
controls.append(budgetLabel, weightLabel, allLabel);
steeringFigure.append(controls);
const legend = htmlNode("div", "steering-key");
legend.setAttribute("aria-label", "Curve legend");
steeringFigure.append(legend);

const svg = plotNode("svg", {
  viewBox: "0 0 880 340",
  class: "scientific-plot steering-svg",
  role: "group",
  "aria-label":
    "Action prediction error across steering weights. Three key comparisons shown initially; all ten budgets are available.",
});
const sx = (weight) => 58 + 780 * weight;
const sy = (value) => 270 - (value - 220) * 1.7;
svg.append(plotText(58, 25, "Action error (MSE) · lower is better"));
for (const tick of [220, 240, 260, 280, 300, 320, 340]) {
  svg.append(
    plotNode("line", {
      x1: 58,
      x2: 838,
      y1: sy(tick),
      y2: sy(tick),
      class: "plot-grid",
    }),
    plotText(44, sy(tick) + 4, tick, { "text-anchor": "end" }),
  );
}
for (const weight of steering.weights)
  svg.append(
    plotText(sx(weight), 292, weight.toFixed(1), { "text-anchor": "middle" }),
  );
svg.append(
  plotText(448, 323, "Steering strength w", { "text-anchor": "middle" }),
  plotText(58, 323, "Model only", { class: "plot-label plot-endpoint" }),
  plotText(838, 323, "Replay demonstration", {
    "text-anchor": "end",
    class: "plot-label plot-endpoint",
  }),
);
svg.append(
  plotNode("line", {
    x1: 58,
    x2: 838,
    y1: sy(steering.replay),
    y2: sy(steering.replay),
    class: "replay-baseline",
  }),
);
const paths = steering.series.map((series, index) => {
  let connected = false;
  const path = plotNode("path", {
    d: series.values
      .map((value, i) => {
        if (value === null) {
          connected = false;
          return "";
        }
        const command = connected ? "L" : "M";
        connected = true;
        return `${command}${sx(steering.weights[i])},${sy(value)}`;
      })
      .join(" "),
    class: "plot-curve steering-curve",
    pathLength: 1,
    stroke: curveColors[index],
    "aria-hidden": "true",
  });
  svg.append(path);
  return path;
});
const defaultRing = plotNode("circle", {
  cx: sx(0.3),
  cy: sy(steering.series[defaultBudget].values[3]),
  r: 7,
  class: "default-setting-ring",
  "aria-hidden": "true",
});
svg.append(defaultRing);
const guide = plotNode("line", {
  x1: sx(0.3),
  x2: sx(0.3),
  y1: sy(350),
  y2: sy(220),
  class: "plot-default-guide",
  "aria-hidden": "true",
});
svg.append(guide);
const pointLayer = plotNode("g");
svg.append(pointLayer);
const viewport = htmlNode("div", "steering-viewport");
viewport.tabIndex = 0;
viewport.setAttribute("role", "region");
viewport.setAttribute(
  "aria-label",
  "Steering comparison plot, scroll horizontally on narrow screens",
);
viewport.append(svg);
steeringFigure.append(viewport);
steeringFigure.append(
  htmlNode(
    "p",
    "plot-scroll-hint",
    "Swipe the plot to see the full steering range →",
  ),
);
const readout = htmlNode("figcaption", "plot-readout steering-readout");
const selectedLabel = htmlNode("span", "plot-readout-label");
const selectedValue = htmlNode("strong", "plot-readout-value");
const selectedDetail = htmlNode("span", "plot-readout-detail");
readout.append(selectedLabel, selectedValue, selectedDetail);
steeringFigure.append(readout);
const status = htmlNode("span", "sr-only");
status.setAttribute("aria-live", "polite");
steeringFigure.append(status);

function updateSteering(rebuild = true) {
  const series = steering.series[activeBudget];
  const value = series.values[activeWeight];
  const weight = steering.weights[activeWeight];
  paths.forEach((path, i) => {
    path.classList.toggle("is-selected", i === activeBudget);
    path.classList.toggle("is-key", keyBudgets.includes(i));
    path.classList.toggle(
      "is-hidden",
      !fullToggle.checked && !keyBudgets.includes(i) && i !== activeBudget,
    );
  });
  svg.insertBefore(paths[activeBudget], defaultRing);
  guide.setAttribute("x1", sx(weight));
  guide.setAttribute("x2", sx(weight));
  budgetSelect.value = activeBudget;
  weightSelect.value = activeWeight;
  selectedLabel.textContent = `${series.label === "None" ? "No finetuning" : `${series.label} steps`} · steering strength ${weight.toFixed(1)}`;
  selectedValue.textContent =
    value === null ? "> 350 MSE" : `≈ ${value.toFixed(1)} MSE`;
  selectedDetail.textContent =
    value === null
      ? "Above the plot limit; exact value unavailable."
      : activeBudget === defaultBudget && weight === 0.3
        ? "Our setting · approximately 2 minutes of finetuning"
        : "Held-out demonstrations · lower is better";
  status.textContent = `${selectedLabel.textContent}. ${selectedValue.textContent}. ${selectedDetail.textContent}`;
  if (rebuild) {
    legend.replaceChildren();
    for (const i of [...new Set([...keyBudgets, activeBudget])]) {
      const name =
        i === 0
          ? "No finetuning"
          : `${steering.series[i].label} steps${i === defaultBudget ? " · ours" : ""}`;
      const item = htmlNode("span", "steering-key-item", name);
      item.style.setProperty("--curve-color", curveColors[i]);
      legend.append(item);
    }
    legend.append(
      htmlNode("span", "steering-key-item is-replay", "Demonstration replay"),
    );
    if (fullToggle.checked)
      legend.append(
        htmlNode("span", "legend-note", "Other budgets shown faintly"),
      );
    pointLayer.replaceChildren();
    series.values.forEach((v, i) => {
      if (v === null) return;
      const description = `${series.label === "None" ? "No finetuning" : `${series.label} steps`}, steering weight ${steering.weights[i]}, approximately ${v} MSE`;
      const point = plotNode("g", {
        tabindex: 0,
        role: "button",
        class: "plot-point",
        "data-weight": i,
        "aria-label": description,
      });
      point.append(
        plotNode("title", {}, description),
        plotNode("circle", {
          cx: sx(steering.weights[i]),
          cy: sy(v),
          r: 12,
          class: "plot-hit",
        }),
        plotNode("circle", {
          cx: sx(steering.weights[i]),
          cy: sy(v),
          r: 4,
          class: "plot-dot",
          style: `--point-color:${curveColors[activeBudget]}`,
        }),
      );
      const select = () => {
        activeWeight = i;
        updateSteering(false);
      };
      for (const event of ["focus", "click"])
        point.addEventListener(event, select);
      point.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });
      pointLayer.append(point);
    });
  }
  for (const point of pointLayer.children)
    point.classList.toggle(
      "is-active",
      Number(point.getAttribute("data-weight")) === activeWeight,
    );
}
budgetSelect.addEventListener("change", () => {
  activeBudget = Number(budgetSelect.value);
  updateSteering();
});
weightSelect.addEventListener("change", () => {
  activeWeight = Number(weightSelect.value);
  updateSteering(false);
});
fullToggle.addEventListener("change", () => updateSteering());
updateSteering();
revealPlot(steeringFigure);
