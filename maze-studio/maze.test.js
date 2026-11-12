import assert from "node:assert/strict";
import test from "node:test";
import { generateMaze, solveMaze, serializeMaze, parseMaze, MAX_FILE_BYTES, NORTH, EAST, SOUTH, WEST } from "./maze.js";

test("dimensions reject blanks, fractions, non-numbers and out-of-range values", () => {
  for (const value of [0, -1, 101, 2.5, NaN, Infinity, "20", "", null, undefined]) {
    assert.throws(() => generateMaze(value, 20), RangeError);
    assert.throws(() => generateMaze(20, value), RangeError);
  }
});

test("every generated maze is a connected tree with reciprocal walls and one solution", () => {
  for (const [width, height] of [[1, 1], [1, 100], [100, 1], [2, 2], [7, 23], [40, 20], [100, 100]]) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const maze = generateMaze(width, height);
      const { cells } = maze;
      const adjacent = Array.from({ length: cells.length }, () => []);
      let edges = 0;
      cells.forEach((cell, i) => {
        const x = i % width;
        const y = Math.floor(i / width);
        if (y === 0) assert.ok(cell & NORTH);
        if (x === 0) assert.ok(cell & WEST);
        if (x === width - 1) assert.ok(cell & EAST);
        if (y === height - 1) assert.ok(cell & SOUTH);
        if (x + 1 < width) {
          assert.equal(Boolean(cell & EAST), Boolean(cells[i + 1] & WEST));
          if (!(cell & EAST)) { adjacent[i].push(i + 1); adjacent[i + 1].push(i); edges++; }
        }
        if (y + 1 < height) {
          assert.equal(Boolean(cell & SOUTH), Boolean(cells[i + width] & NORTH));
          if (!(cell & SOUTH)) { adjacent[i].push(i + width); adjacent[i + width].push(i); edges++; }
        }
      });
      assert.equal(edges, cells.length - 1);
      const seen = new Set([0]);
      const queue = [0];
      for (let head = 0; head < queue.length; head++) {
        for (const next of adjacent[queue[head]]) {
          if (!seen.has(next)) { seen.add(next); queue.push(next); }
        }
      }
      assert.equal(seen.size, cells.length);
      const before = cells.slice();
      const path = solveMaze(maze);
      assert.equal(path[0], 0);
      assert.equal(path.at(-1), cells.length - 1);
      assert.equal(new Set(path).size, path.length);
      path.slice(1).forEach((cell, i) => assert.ok(adjacent[path[i]].includes(cell)));
      assert.deepEqual(cells, before, "solving must not change maze walls");
    }
  }
});

test("successive generations produce different layouts", () => {
  const layouts = new Set(Array.from({ length: 5 }, () => generateMaze(20, 20).cells.join(",")));
  assert.ok(layouts.size > 1);
});

test("a disconnected maze produces an explicit solver error", () => {
  assert.throws(() => solveMaze({ width: 2, height: 1, cells: new Uint8Array([15, 15]) }), /No route/);
});

test("saved files restore exact dimensions, walls and solutions without storing the answer", () => {
  for (const [width, height] of [[1, 1], [1, 100], [100, 1], [7, 23], [100, 100]]) {
    const maze = generateMaze(width, height);
    const text = serializeMaze(maze);
    assert.ok(new TextEncoder().encode(text).length <= MAX_FILE_BYTES);
    assert.deepEqual(Object.keys(JSON.parse(text)), ["format", "version", "width", "height", "cells"]);
    const loaded = parseMaze(text);
    assert.deepEqual(loaded, maze);
    assert.deepEqual(solveMaze(loaded), solveMaze(maze));
    assert.deepEqual(parseMaze("\uFEFF" + text.replace(/\n/g, "\r\n")), maze);
  }
});

test("loading rejects invalid formats, sizes, dimensions and cells", () => {
  for (const text of ["", "not a maze", "null", "[]", "{}", '{"format":"maze-studio","version":2}']) {
    assert.throws(() => parseMaze(text), /maze/i);
  }
  assert.throws(() => parseMaze(" ".repeat(MAX_FILE_BYTES + 1)), /128 KB/);
  assert.throws(() => parseMaze("\u00e9".repeat(MAX_FILE_BYTES / 2 + 1)), /128 KB/);
  const valid = JSON.parse(serializeMaze(generateMaze(2, 2)));
  for (const patch of [
    { width: 0 }, { height: 101 }, { width: "2" }, { height: 1.5 },
    { cells: [] }, { cells: null }, { cells: [15, 15, 15, -1] },
    { cells: [15, 15, 15, 16] }, { cells: [15, 15, 15, 1.5] },
    { cells: [15, 15, 15, "15"] }
  ]) {
    assert.throws(() => parseMaze(JSON.stringify({ ...valid, ...patch })));
  }
});

test("loading rejects broken boundaries, asymmetric passages, cycles and disconnected cells", () => {
  const file = cells => JSON.stringify({ format: "maze-studio", version: 1, width: 2, height: 2, cells });
  assert.throws(() => parseMaze(file([14, 15, 15, 15])), /boundary/);
  assert.throws(() => parseMaze(file([13, 15, 15, 15])), /neighboring/);
  assert.throws(() => parseMaze(file([9, 3, 12, 6])), /one route/);
  assert.throws(() => parseMaze(file([15, 15, 15, 15])), /one route/);
  // A cycle with a tail and an isolated cell still has cells - 1 edges.
  const disconnected = { format: "maze-studio", version: 1, width: 3, height: 2, cells: [9, 3, 15, 12, 6, 15] };
  disconnected.cells[1] &= ~EAST;
  disconnected.cells[2] &= ~WEST;
  assert.throws(() => parseMaze(JSON.stringify(disconnected)), /unreachable/);
});
