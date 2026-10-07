# Pencil Sketch Studio

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/pencil-sketch/)

> Standalone browser image-conversion experiment. See the [repository catalog](../README.md) for shared setup and deployment context.

A simple browser app for turning uploaded images into pencil-style sketches. It supports both black-and-white and color pencil effects, with controls for line detail, pencil pressure, and shading texture.

The sketch engine follows the same core idea used in the GeeksforGeeks example:
grayscale conversion, invert, blur, and color-dodge blending.

## Features

- Upload an image file from your device
- Choose between black-and-white and color sketch modes
- Adjust line detail from loose outlines to fine pencil lines
- Adjust pencil pressure from light graphite to bold, dark strokes
- Add shading texture with directional hatching and pencil grain
- Switch between the original and sketch using the preview toggle
- Download the final sketch as a PNG

## Run locally

From the project root, go to the app folder and start a simple local server:

```bash
cd pencil-sketch
python3 -m http.server 8000
```

Then open this in a browser:

```text
http://localhost:8000/
```

## How to use

1. Click “Choose an image” and select a photo.
2. Pick a sketch style: black-and-white or color pencil.
3. Adjust “Line detail” for loose outlines or fine lines.
4. Adjust “Pencil pressure” to make strokes lighter or darker without darkening blank paper.
5. Adjust “Shading texture” for smooth shading or visible pencil hatching.
6. Switch to the “Sketch” preview to see the result. Adjustments regenerate it automatically in both sketch styles.
7. Click “Generate Sketch” if needed.
8. Use “Download PNG” to save the sketch, regardless of the selected preview.

## Files

- `index.html` – page layout and controls
- `styles.css` – visual styling and responsive layout
- `app.js` – image rendering and sketch generation logic

## Sketch method

The black-and-white sketch is generated with this pipeline:

1. Convert source image to grayscale.
2. Invert the grayscale image.
3. Blur the inverted image.
4. Apply a color-dodge style blend using:

   sketch = gray * 256 / (255 - blurredInvert)

5. Combine the pencil tone with local edge strength and soft shadow shading.
6. Apply pencil pressure, directional hatching, and deterministic grain only in drawn areas.
7. Clamp output values to 0-255, keeping untouched paper white.

Line detail reduces the blur radius and strengthens fine edges at higher values. Color mode uses the same strokes and shading, adding subdued pigment from the source image instead of overlaying the original photograph. Transparent images are rendered over white paper before conversion.

## Test the project

Run the repository-wide test suite from the project root:

```bash
./run_tests.sh
```
