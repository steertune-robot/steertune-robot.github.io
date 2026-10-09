"use strict";
// Rollout panels remain placeholders until the corresponding execution videos are supplied.
const taskNames = {
  flower: "Flower watering",
  coffee: "Coffee machine",
  kettle: "Kettle handling",
};
const taskTabs = [...document.querySelectorAll("[data-task]")];
const panel = document.getElementById("rollout-panel");
function selectTask(tab) {
  for (const item of taskTabs) {
    const active = item === tab;
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
  }
  panel.setAttribute("aria-labelledby", tab.id);
  for (const label of panel.querySelectorAll("[data-task-label]"))
    label.textContent = taskNames[tab.dataset.task];
}
for (const [index, tab] of taskTabs.entries()) {
  tab.addEventListener("click", () => selectTask(tab));
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % taskTabs.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + taskTabs.length) % taskTabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = taskTabs.length - 1;
    else return;
    event.preventDefault();
    selectTask(taskTabs[next]);
    taskTabs[next].focus();
  });
}
