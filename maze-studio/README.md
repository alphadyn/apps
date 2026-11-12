# Maze Studio

A standalone, dependency-free browser app for random two-dimensional mazes.

## Use

Serve the repository with `python3 -m http.server 8000`, then open
<http://localhost:8000/maze-studio/>.

- Enter width (columns) and height (rows), each a whole number from 1 to 100.
- Select **Generate maze** to create a fresh maze. A 20 by 20 maze appears on load.
- Start at the green ring in the top-left cell and finish at the amber dot in
  the bottom-right cell. The outer wall opens above the entrance and below the exit.
- Select **Reveal solution** to calculate and display the route and step count.
  **Hide solution** removes the overlay without changing the maze.
- Generating a maze always hides the previous solution. Editing dimensions alone
  does not alter the current maze until Generate is selected.
- Select **Save maze** to download the current maze as a `.txt` file, even if
  the dimension inputs have been edited. **Load maze** restores that exact maze
  and its dimensions; select **Reveal solution** when you want the answer.
  Saving never includes the solution, and loading always hides it.
- Invalid or oversized files show an error without changing the current maze
  or solution. Files are read locally and never uploaded.
- Large or tall mazes scroll inside the drawing region, which is keyboard-focusable.
- Single-row, single-column and single-cell mazes are supported. In a single-cell
  maze the entrance ring surrounds the exit dot, and the solution takes zero
  cell-to-cell steps.

The header brand returns to the app's initial state by reloading its entry page.
No backend or external assets are required; maze generation and solving run locally.

## Exactly one solution

Iterative randomized depth-first backtracking connects each new cell to the
visited cells once. The result is a spanning tree: all cells are reachable, and
there are no loops, so exactly one simple path connects any two cells.
The solver uses breadth-first search only when requested. Both algorithms
use linear time and memory in the number of cells; neither uses recursion.

## Saved text format

Maze Studio saves UTF-8 JSON text in `maze-WIDTHxHEIGHT.txt`. Version 1 contains
`format: "maze-studio"`, `version: 1`, `width`, `height`, and a `cells` array in
row-major order. Each cell's integer wall mask combines north `1`, east `2`,
south `4`, and west `8`. All model boundary walls remain closed; the drawing
opens the entrance and exit visually. No solution or other state is stored.

Loading accepts files up to 128 KB and validates the format, version, dimensions,
wall values, reciprocal walls, closed boundaries, connectivity and tree invariant.
Arbitrary text or ASCII maze drawings are not supported.

## Tests

From the repository root:

```bash
node --test maze-studio/maze.test.js
```

Tests check dimension validation, reciprocal and boundary walls, connectivity,
exactly `cells - 1` passages (the tree invariant), random variation, valid
solution paths, and no mutation during solving, including 100 by 100 mazes.
File tests cover exact round trips and solutions, format and size validation,
malformed cells, missing boundaries, mismatched walls, loops and disconnected cells.

## Text-message link previews

Share <https://alphadyn.github.io/apps/maze-studio/> after deployment. Static Open Graph
and Twitter card tags provide the title, description and a 1200 by 630 PNG image
without running JavaScript. This previews the app, not an individual saved maze.
Messaging clients control whether previews appear and may cache older cards.
The localhost preview is not accessible to messaging crawlers.

The artwork is committed; deployment does not require image-generation tooling.
To regenerate it and validate the metadata and image (requires Pillow):

```bash
python3 maze-studio/generate_social_preview.py
python3 -m unittest discover -s maze-studio -p 'test_social_preview.py'
```
