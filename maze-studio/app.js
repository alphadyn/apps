import { generateMaze, solveMaze, serializeMaze, parseMaze, MAX_FILE_BYTES, NORTH, EAST, SOUTH, WEST } from "./maze.js";

const form = document.getElementById("maze-form");
const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const svg = document.getElementById("maze");
const solveButton = document.getElementById("solve");
const detail = document.getElementById("solution-detail");
const status = document.getElementById("status");
const routeLegend = document.getElementById("route-legend");
const viewport = document.getElementById("maze-viewport");
const saveButton = document.getElementById("save");
const loadButton = document.getElementById("load");
const fileInput = document.getElementById("maze-file");
const cellSize = 20;
const padding = 10;
let maze;
let solutionVisible = false;
let solutionPath;

function element(name, attributes = {}, text) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

function point(index) {
  return [padding + (index % maze.width + .5) * cellSize, padding + (Math.floor(index / maze.width) + .5) * cellSize];
}

function render() {
  const { width, height, cells } = maze;
  svg.replaceChildren(
    element("title", { id: "maze-title" }, `${width} by ${height} cell maze`),
    element("desc", { id: "maze-description" }, "Entrance at the top left, exit at the bottom right. Exactly one route connects them. Solution hidden.")
  );
  svg.setAttribute("viewBox", `0 0 ${width * cellSize + padding * 2} ${height * cellSize + padding * 2}`);
  svg.style.minWidth = `${Math.max(150, width * 10)}px`;
  let walls = "";
  const line = (x1, y1, x2, y2) => { walls += `M${x1},${y1}L${x2},${y2}`; };
  cells.forEach((cell, index) => {
    const x = padding + (index % width) * cellSize;
    const y = padding + Math.floor(index / width) * cellSize;
    if ((cell & NORTH) && index !== 0) line(x, y, x + cellSize, y);
    if (cell & WEST) line(x, y, x, y + cellSize);
    if ((cell & EAST) && index % width === width - 1) line(x + cellSize, y, x + cellSize, y + cellSize);
    if ((cell & SOUTH) && index >= cells.length - width && index !== cells.length - 1) line(x, y + cellSize, x + cellSize, y + cellSize);
  });
  solutionPath = element("path", { class: "solution-path", hidden: "", "aria-hidden": "true" });
  svg.append(solutionPath, element("path", { class: "maze-walls", d: walls }));
  const [startX, startY] = point(0);
  const [endX, endY] = point(cells.length - 1);
  svg.append(
    element("circle", { class: "start-marker", cx: startX, cy: startY, r: 5 }),
    element("circle", { class: "end-marker", cx: endX, cy: endY, r: 3 })
  );
}

function reportError(error) {
  console.error(error);
  status.classList.add("error");
  status.textContent = error.message;
}

function displayMaze(nextMaze, source) {
  maze = nextMaze;
  widthInput.value = String(maze.width);
  heightInput.value = String(maze.height);
  solutionVisible = false;
  render();
  viewport.scrollTo(0, 0);
  solveButton.disabled = false;
  saveButton.disabled = false;
  solveButton.textContent = "Reveal solution";
  solveButton.setAttribute("aria-pressed", "false");
  routeLegend.hidden = true;
  detail.textContent = "The route stays hidden until you ask.";
  document.getElementById("size-badge").textContent = `${maze.width} \u00d7 ${maze.height}`;
  document.getElementById("cell-count").textContent = `${maze.cells.length.toLocaleString()} ${maze.cells.length === 1 ? "cell" : "cells"}`;
  status.classList.remove("error");
  status.textContent = `${source} ${maze.width} by ${maze.height} maze ready. Start at the green ring; finish at the amber dot.`;
}

function generate() {
  try {
    displayMaze(generateMaze(widthInput.valueAsNumber, heightInput.valueAsNumber), "New");
  } catch (error) {
    reportError(error);
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  generate();
});

saveButton.addEventListener("click", () => {
  try {
    const blob = new Blob([serializeMaze(maze)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `maze-${maze.width}x${maze.height}.txt`;
    document.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    status.classList.remove("error");
    status.textContent = "Maze text file download requested. Use Load maze to retrieve it later.";
  } catch (error) {
    reportError(error);
  }
});

loadButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const controls = document.querySelectorAll(".controls button, .dimensions input");
  controls.forEach(control => { control.disabled = true; });
  status.classList.remove("error");
  status.textContent = "Reading maze file...";
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error("Maze files must be no larger than 128 KB.");
    displayMaze(parseMaze(await file.text()), "Loaded");
  } catch (error) {
    reportError(error);
  } finally {
    fileInput.value = "";
    controls.forEach(control => { control.disabled = false; });
    solveButton.disabled = !maze;
    saveButton.disabled = !maze;
  }
});

solveButton.addEventListener("click", () => {
  try {
    if (!solutionVisible) {
      const path = solveMaze(maze);
      const entranceX = padding + cellSize / 2;
      const exitX = padding + (maze.width - .5) * cellSize;
      solutionPath.setAttribute("d", `M${entranceX},${padding} ` +
        path.map(index => `L${point(index).join(",")}`).join(" ") +
        ` L${exitX},${padding + maze.height * cellSize}`);
      const steps = path.length - 1;
      detail.textContent = `${steps.toLocaleString()} ${steps === 1 ? "step" : "steps"} from entrance cell to exit cell.`;
    } else {
      detail.textContent = "The route stays hidden until you ask.";
    }
    solutionVisible = !solutionVisible;
    solutionPath.toggleAttribute("hidden", !solutionVisible);
    routeLegend.hidden = !solutionVisible;
    solveButton.textContent = solutionVisible ? "Hide solution" : "Reveal solution";
    solveButton.setAttribute("aria-pressed", String(solutionVisible));
    document.getElementById("maze-description").textContent =
      `Entrance at the top left, exit at the bottom right. Exactly one route connects them. Solution ${solutionVisible ? "shown in amber" : "hidden"}.`;
    status.classList.remove("error");
    status.textContent = solutionVisible ? "Solution revealed. Follow the amber line from entrance to exit." : "Solution hidden. The maze is unchanged.";
  } catch (error) {
    reportError(error);
  }
});

generate();
