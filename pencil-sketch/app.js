const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const modeSelect = document.getElementById('modeSelect');
const detailRange = document.getElementById('detailRange');
const detailValue = document.getElementById('detailValue');
const pressureRange = document.getElementById('pressureRange');
const pressureValue = document.getElementById('pressureValue');
const textureRange = document.getElementById('textureRange');
const textureValue = document.getElementById('textureValue');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('status');
const showOriginalBtn = document.getElementById('showOriginalBtn');
const showSketchBtn = document.getElementById('showSketchBtn');
const originalPanel = document.getElementById('originalPanel');
const sketchPanel = document.getElementById('sketchPanel');

const originalCanvas = document.getElementById('originalCanvas');
const sketchCanvas = document.getElementById('sketchCanvas');
const originalCtx = originalCanvas.getContext('2d');
const sketchCtx = sketchCanvas.getContext('2d');

let currentImage = null;

function clampByte(value) {
  return Math.min(255, Math.max(0, value));
}

function getGrayChannel(data) {
  const gray = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  return gray;
}

function invertChannel(channel) {
  const inverted = new Uint8ClampedArray(channel.length);
  for (let i = 0; i < channel.length; i += 1) {
    inverted[i] = 255 - channel[i];
  }
  return inverted;
}

function boxBlurChannel(channel, width, height, radius) {
  if (radius <= 0) {
    return new Uint8ClampedArray(channel);
  }

  const horizontalPass = new Uint8ClampedArray(channel.length);
  const output = new Uint8ClampedArray(channel.length);
  const kernelSize = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width;
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const sampleX = Math.min(width - 1, Math.max(0, x + k));
        sum += channel[rowStart + sampleX];
      }
      horizontalPass[rowStart + x] = Math.round(sum / kernelSize);
    }
  }

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const sampleY = Math.min(height - 1, Math.max(0, y + k));
        sum += horizontalPass[sampleY * width + x];
      }
      output[y * width + x] = Math.round(sum / kernelSize);
    }
  }

  return output;
}

function colorDodgeBlend(grayValue, blurredInvertedValue) {
  if (blurredInvertedValue >= 255) {
    return 255;
  }

  return clampByte(Math.round((grayValue * 256) / (255 - blurredInvertedValue)));
}

function updateLabels() {
  detailValue.textContent = `${detailRange.value}%`;
  pressureValue.textContent = `${pressureRange.value}%`;
  textureValue.textContent = `${textureRange.value}%`;
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? '#fca5a5' : '#a7f3d0';
}

function setPreview(view) {
  const showOriginal = view === 'original';
  originalPanel.hidden = !showOriginal;
  sketchPanel.hidden = showOriginal;
  showOriginalBtn.setAttribute('aria-pressed', String(showOriginal));
  showSketchBtn.setAttribute('aria-pressed', String(!showOriginal));
}

function renderImageToCanvas(canvas, context, image) {
  const maxSize = 900;
  const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
}

function generateSketch() {
  if (!currentImage) {
    setStatus('Please upload an image first.', true);
    return;
  }

  const width = originalCanvas.width;
  const height = originalCanvas.height;
  const source = originalCtx.getImageData(0, 0, width, height);
  const output = new ImageData(width, height);
  const sourceData = source.data;
  const outputData = output.data;
  const mode = modeSelect.value;
  const detail = Number(detailRange.value) / 100;
  const pressure = 0.3 + Number(pressureRange.value) / 100 * 1.9;
  const texture = Number(textureRange.value) / 100;

  const gray = getGrayChannel(sourceData);
  const invertedGray = invertChannel(gray);
  const blurRadius = Math.round(2 + (1 - detail) * 18);
  const blurredInverted = boxBlurChannel(invertedGray, width, height, blurRadius);

  for (let px = 0, i = 0; i < sourceData.length; i += 4, px += 1) {
    const sketchTone = colorDodgeBlend(gray[px], blurredInverted[px]) / 255;
    const x = px % width;
    const y = Math.floor(px / width);
    const left = gray[y * width + Math.max(0, x - 1)];
    const right = gray[y * width + Math.min(width - 1, x + 1)];
    const above = gray[Math.max(0, y - 1) * width + x];
    const below = gray[Math.min(height - 1, y + 1) * width + x];
    const edge = Math.hypot(right - left, below - above) / 360;
    const shadow = 1 - gray[px] / 255;
    const graphite = (1 - sketchTone) * 0.75
      + edge * (0.2 + detail * 0.7) + shadow * 0.1;

    // Keep hatching and grain inside drawn areas, leaving blank paper clean.
    const hatchA = Math.pow(Math.max(0, Math.sin((x + y) * 1.15)), 8);
    const hatchB = Math.pow(Math.max(0, Math.sin((x - y) * 0.95)), 8);
    const grainSeed = ((x * 73856093) ^ (y * 19349663)) & 255;
    const grain = grainSeed / 255 - 0.5;
    const strokeTexture = 1 + texture * (hatchA * 0.9 + hatchB * shadow * 0.6 + grain * 0.5 - 0.25);
    const darkness = Math.min(1, Math.max(0, graphite * pressure * strokeTexture));

    for (let channel = 0; channel < 3; channel += 1) {
      const pigment = mode === 'color' ? (sourceData[i + channel] - gray[px]) * 0.8 : 0;
      outputData[i + channel] = clampByte(Math.round(255 - darkness * (255 - pigment)));
    }
    outputData[i + 3] = 255;
  }

  sketchCanvas.width = width;
  sketchCanvas.height = height;
  sketchCtx.putImageData(output, 0, 0);
  const style = mode === 'bw' ? 'Black-and-white' : 'Color';
  setStatus(`${style} pencil sketch generated with ${detailRange.value}% detail, ${pressureRange.value}% pressure, and ${textureRange.value}% texture. Drag the sketch to save it locally.`);
}

function loadImageFile(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setStatus('Please choose a valid image file.', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (readEvent) => {
    const image = new Image();
    image.onload = () => {
      currentImage = image;
      renderImageToCanvas(originalCanvas, originalCtx, image);
      generateSketch();
      setStatus(`Loaded ${file.name}.`);
    };
    image.onerror = () => {
      setStatus('The selected image could not be read.', true);
    };
    image.src = readEvent.target.result;
  };

  reader.readAsDataURL(file);
}

function handleFileSelection(event) {
  const file = event.target.files?.[0];
  loadImageFile(file);
}

function handleDrop(event) {
  event.preventDefault();
  dropZone.classList.remove('dragover');

  const file = event.dataTransfer?.files?.[0];
  loadImageFile(file);
}

fileInput.addEventListener('change', handleFileSelection);
showOriginalBtn.addEventListener('click', () => setPreview('original'));
showSketchBtn.addEventListener('click', () => setPreview('sketch'));
dropZone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', (event) => {
  if (event.target === dropZone) {
    dropZone.classList.remove('dragover');
  }
});
dropZone.addEventListener('drop', handleDrop);
for (const slider of [detailRange, pressureRange, textureRange]) {
  slider.addEventListener('input', () => {
    updateLabels();
    if (currentImage) {
      generateSketch();
    }
  });
}
generateBtn.addEventListener('click', generateSketch);
modeSelect.addEventListener('change', () => {
  if (currentImage) {
    generateSketch();
  }
});

sketchCanvas.addEventListener('dragstart', async (event) => {
  if (!currentImage) {
    event.preventDefault();
    return;
  }

  const blob = await new Promise((resolve) => sketchCanvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    event.preventDefault();
    return;
  }

  const file = new File([blob], 'pencil-sketch.png', { type: 'image/png' });
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('DownloadURL', `image/png:pencil-sketch.png:${URL.createObjectURL(blob)}`);
  event.dataTransfer.setData('text/uri-list', URL.createObjectURL(blob));
  event.dataTransfer.setData('text/plain', 'pencil-sketch.png');
  if (event.dataTransfer.items && event.dataTransfer.items.length >= 0) {
    event.dataTransfer.items.clear();
    event.dataTransfer.items.add(file);
  }
});

downloadBtn.addEventListener('click', () => {
  if (!currentImage) {
    setStatus('Generate a sketch before downloading.', true);
    return;
  }

  const link = document.createElement('a');
  link.download = 'pencil-sketch.png';
  link.href = sketchCanvas.toDataURL('image/png');
  link.click();
  setStatus('Sketch download started. You can also drag the sketch out of the browser to save it.');
});

updateLabels();
