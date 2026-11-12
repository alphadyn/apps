export const MAX_DIMENSION = 100;
export const MAX_FILE_BYTES = 128 * 1024;
export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;

const directions = [
  { dx: 0, dy: -1, wall: NORTH, opposite: SOUTH },
  { dx: 1, dy: 0, wall: EAST, opposite: WEST },
  { dx: 0, dy: 1, wall: SOUTH, opposite: NORTH },
  { dx: -1, dy: 0, wall: WEST, opposite: EAST }
];

export function validateDimensions(width, height) {
  if (![width, height].every(value => Number.isInteger(value) && value >= 1 && value <= MAX_DIMENSION)) {
    throw new RangeError(`Width and height must be whole numbers from 1 to ${MAX_DIMENSION}.`);
  }
}

export function generateMaze(width, height) {
  validateDimensions(width, height);
  const cells = new Uint8Array(width * height).fill(NORTH | EAST | SOUTH | WEST);
  const visited = new Uint8Array(cells.length);
  const stack = [0];
  visited[0] = 1;

  // Iterative backtracking carves a spanning tree, so every pair of cells has one route.
  while (stack.length) {
    const current = stack[stack.length - 1];
    const x = current % width;
    const y = Math.floor(current / width);
    const candidates = directions.filter(({ dx, dy }) =>
      x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height &&
      !visited[(y + dy) * width + x + dx]
    );
    if (!candidates.length) {
      stack.pop();
      continue;
    }
    const direction = candidates[Math.floor(Math.random() * candidates.length)];
    const next = (y + direction.dy) * width + x + direction.dx;
    cells[current] &= ~direction.wall;
    cells[next] &= ~direction.opposite;
    visited[next] = 1;
    stack.push(next);
  }
  return { width, height, cells };
}

export function solveMaze({ width, height, cells }) {
  const parents = new Int32Array(cells.length).fill(-1);
  const queue = [0];
  parents[0] = 0;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === cells.length - 1) {
      const path = [current];
      while (path[path.length - 1] !== 0) path.push(parents[path[path.length - 1]]);
      return path.reverse();
    }
    const x = current % width;
    const y = Math.floor(current / width);
    for (const { dx, dy, wall } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height || (cells[current] & wall)) continue;
      const next = ny * width + nx;
      if (parents[next] !== -1) continue;
      parents[next] = current;
      queue.push(next);
    }
  }
  throw new Error("No route connects the entrance to the exit.");
}

export function serializeMaze({ width, height, cells }) {
  return JSON.stringify({
    format: "maze-studio",
    version: 1,
    width,
    height,
    cells: Array.from(cells)
  }, null, 2) + "\n";
}

export function parseMaze(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
    throw new Error("Maze files must be text no larger than 128 KB.");
  }
  let data;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error("This is not a valid maze text file. Choose a file saved by Maze Studio.");
  }
  if (!data || data.format !== "maze-studio" || data.version !== 1) {
    throw new Error("Unsupported maze file. Choose a version 1 file saved by Maze Studio.");
  }
  const { width, height, cells } = data;
  validateDimensions(width, height);
  if (!Array.isArray(cells) || cells.length !== width * height ||
      !cells.every(cell => Number.isInteger(cell) && cell >= 0 && cell <= 15)) {
    throw new Error("Invalid maze cell data: each cell must contain a wall value from 0 to 15.");
  }
  let passages = 0;
  cells.forEach((cell, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    for (const { dx, dy, wall, opposite } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        if (!(cell & wall)) throw new Error("Invalid maze: an outer boundary wall is missing.");
      } else {
        const next = ny * width + nx;
        if (Boolean(cell & wall) !== Boolean(cells[next] & opposite)) {
          throw new Error("Invalid maze: neighboring walls do not match.");
        }
        if (!(cell & wall) && next > index) passages++;
      }
    }
  });
  if (passages !== cells.length - 1) {
    throw new Error("Invalid maze: the maze must have exactly one route between any two cells.");
  }
  const visited = new Uint8Array(cells.length);
  const queue = [0];
  visited[0] = 1;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const { dx, dy, wall } of directions) {
      if (cells[current] & wall) continue;
      const next = current + dy * width + dx;
      if (!visited[next]) {
        visited[next] = 1;
        queue.push(next);
      }
    }
  }
  if (queue.length !== cells.length) {
    throw new Error("Invalid maze: some cells are unreachable.");
  }
  return { width, height, cells: Uint8Array.from(cells) };
}
