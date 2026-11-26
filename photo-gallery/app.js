const PHOTO_COUNT = 10;
const IMAGE_SOURCE = "https://images.unsplash.com";
const FALLBACK_IMAGE = "preview-photo.jpg";
const ROTATE_INTERVAL_MS = 4000;
const SWIPE_THRESHOLD = 50;
const TAP_SLOP = 12;
const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_DISTANCE = 32;

const PHOTO_IDS = [
  "photo-1500530855697-b586d89ba3ee",
  "photo-1470770841072-f978cf4d019e",
  "photo-1501785888041-af3ef285b470",
  "photo-1464822759023-fed622ff2c3b",
  "photo-1470252649378-9c29740c9fa8",
  "photo-1500534623283-312aade485b7",
  "photo-1518837695005-2083093ee35b",
  "photo-1507525428034-b723cf961d3e",
  "photo-1472214103451-9374bd1c798e",
  "photo-1441974231531-c6227db76b6e",
  "photo-1470071459604-3b5ec3a7fe05",
  "photo-1482938289607-e9573fc25ebb",
  "photo-1497250681960-ef046c08a56e",
  "photo-1511497584788-876760111969",
  "photo-1500534314209-a25ddb2bd429",
  "photo-1472396961693-142e6e269027",
  "photo-1482192596544-9eb780fc7f66",
  "photo-1454496522488-7a8e488e8606",
  "photo-1464278533981-50106e6176b1",
  "photo-1469474968028-56623f02e42e",
  "photo-1449824913935-59a10b8d2000",
  "photo-1477959858617-67f85cf4f1df",
  "photo-1519501025264-65ba15a82390",
  "photo-1514565131-fce0801e5785",
  "photo-1511818966892-d7d671e672a2",
  "photo-1487958449943-2429e8be8625",
  "photo-1518005020951-eccb494ad742",
  "photo-1494526585095-c41746248156",
  "photo-1488646953014-85cb44e25828",
  "photo-1502602898657-3e91760cbb34",
  "photo-1516483638261-f4dbaf036963",
  "photo-1523906834658-6e24ef2386f9",
  "photo-1533105079780-92b9be482077",
  "photo-1534447677768-be436bb09401",
  "photo-1462331940025-496dfbfc7564",
  "photo-1446776811953-b23d57bd21aa",
  "photo-1419242902214-272b3f66ee7a",
  "photo-1531366936337-7c912a4589a7",
  "photo-1546182990-dffeafbe841d",
  "photo-1549366021-9f761d450615",
  "photo-1552728089-57bdde30beb3",
  "photo-1452570053594-1b985d6ea890",
  "photo-1561731216-c3a4d99437d5",
  "photo-1552083375-1447ce886485",
  "photo-1490750967868-88aa4486c946",
  "photo-1490730141103-6cac27aaab94",
  "photo-1457089328109-e5d9bd499191",
  "photo-1462275646964-a0e3386b89fa",
  "photo-1519681393784-d120267933ba",
  "photo-1509316785289-025f5b846b35",
  "photo-1473580044384-7ba9967e16a0",
  "photo-1468581264429-2548ef9eb732",
  "photo-1433086966358-54859d0ed716",
  "photo-1519904981063-b0cf448d479e",
  "photo-1504608524841-42fe6f032b4b",
  "photo-1473448912268-2022ce9509d8",
  "photo-1502082553048-f009c37129b9",
  "photo-1493246507139-91e8fad9978e",
  "photo-1475924156734-496f6cac6ec1",
  "photo-1518098268026-4e89f1a2cd8e",
];

const PHOTO_CATALOG = [
  ...PHOTO_IDS.map((id) => ({ id, source: "unsplash" })),
  ...PICSUM_PHOTOS.map((photo) => ({ ...photo, source: "picsum" })),
];

function selectPhotos() {
  const photos = [...PHOTO_CATALOG];
  for (let i = photos.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [photos[i], photos[randomIndex]] = [photos[randomIndex], photos[i]];
  }

  return photos.slice(0, PHOTO_COUNT);
}

const track = document.getElementById("carousel-track");
const thumbnails = document.getElementById("thumbnails");
const caption = document.getElementById("caption");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const playBtn = document.getElementById("play-btn");
const saveBtn = document.getElementById("save-btn");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const carousel = document.getElementById("carousel");
const controls = document.getElementById("gallery-controls");

let current = 0;
let playing = true;
let timerId = null;
let gesture = null;
let pendingTap = null;

function photoUrl(photo, width) {
  if (photo.source === "picsum") {
    const imageWidth = Math.min(width, photo.width);
    const imageHeight = Math.max(1, Math.round(imageWidth * photo.height / photo.width));
    return `https://picsum.photos/id/${photo.id}/${imageWidth}/${imageHeight}`;
  }
  return `${IMAGE_SOURCE}/${photo.id}?auto=format&fit=crop&w=${width}&q=80`;
}

function createPhotoImage(photo, { alt, width, loading = "lazy" }) {
  const img = document.createElement("img");
  img.alt = alt;
  img.loading = loading;
  img.draggable = false;
  img.addEventListener("error", () => {
    console.error("Unable to load gallery photo:", img.src);
    img.src = FALLBACK_IMAGE;
  }, { once: true });
  img.src = photoUrl(photo, width);
  return img;
}

function buildSlides(photos) {
  return photos.map((photo, index) => {
    const label = `Photo ${index + 1} of ${photos.length}`;
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.appendChild(createPhotoImage(photo, { alt: "", width: 1200, loading: index === 0 ? "eager" : "lazy" }));
    track.appendChild(slide);

    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "thumb";
    thumb.setAttribute("aria-label", `Go to ${label}`);
    thumb.appendChild(createPhotoImage(photo, { alt: "", width: 160 }));
    thumb.addEventListener("click", () => goTo(index));
    thumbnails.appendChild(thumb);

    return { slide, thumb };
  });
}

const slides = buildSlides(selectPhotos());

function renderSlide() {
  slides.forEach(({ slide, thumb }, index) => {
    const active = index === current;
    slide.classList.toggle("active", active);
    slide.setAttribute("aria-hidden", String(!active));
    thumb.setAttribute("aria-current", String(active));
  });
  caption.textContent = `${current + 1} / ${slides.length}`;
}

function goTo(index) {
  current = (index + slides.length) % slides.length;
  renderSlide();
  scheduleRotation();
}

function step(offset) {
  goTo(current + offset);
}

function scheduleRotation() {
  clearTimeout(timerId);
  timerId = playing ? setTimeout(() => step(1), ROTATE_INTERVAL_MS) : null;
}

function togglePlay() {
  playing = !playing;
  playIcon.toggleAttribute("hidden", playing);
  pauseIcon.toggleAttribute("hidden", !playing);
  playBtn.setAttribute("aria-label", playing ? "Pause rotation" : "Play rotation");
  scheduleRotation();
}

async function saveDisplayedPhoto() {
  const activeSlide = slides[current].slide;
  const image = activeSlide.querySelector("img");
  if (!image?.src) return;

  saveBtn.disabled = true;
  saveBtn.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(image.src, { mode: "cors" });
    if (!response.ok) throw new Error(`Download failed with status ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const type = blob.type;
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    link.href = objectUrl;
    link.download = `photo-gallery-${current + 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    console.error("Unable to save gallery photo:", error);
    const link = document.createElement("a");
    link.href = image.src;
    link.download = `photo-gallery-${current + 1}.jpg`;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    saveBtn.disabled = false;
    saveBtn.removeAttribute("aria-busy");
  }
}

function setControlsVisible(visible) {
  if (!visible && controls.contains(document.activeElement)) {
    carousel.focus({ preventScroll: true });
  }
  controls.hidden = !visible;
}

function toggleControls() {
  setControlsVisible(controls.hidden);
}

function cancelPendingTap() {
  if (pendingTap) {
    clearTimeout(pendingTap.timerId);
    pendingTap = null;
  }
}

function handleTouchTap(x, y) {
  if (pendingTap) {
    const nearby = Math.hypot(x - pendingTap.x, y - pendingTap.y) <= DOUBLE_TAP_DISTANCE;
    cancelPendingTap();
    if (nearby) {
      togglePlay();
      return;
    }
    toggleControls();
  }
  // Wait briefly so a double tap changes playback without flashing the controls.
  pendingTap = {
    x,
    y,
    timerId: setTimeout(() => {
      pendingTap = null;
      toggleControls();
    }, DOUBLE_TAP_DELAY),
  };
}

prevBtn.addEventListener("click", () => step(-1));
nextBtn.addEventListener("click", () => step(1));
playBtn.addEventListener("click", togglePlay);
saveBtn.addEventListener("click", saveDisplayedPhoto);
controls.addEventListener("pointerdown", cancelPendingTap);

track.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  track.setPointerCapture(event.pointerId);
});

track.addEventListener("pointermove", (event) => {
  if (gesture?.id !== event.pointerId) return;
  if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > TAP_SLOP) {
    gesture.moved = true;
    cancelPendingTap();
  }
});

track.addEventListener("pointerup", (event) => {
  if (gesture?.id !== event.pointerId) return;
  const { x, y, moved } = gesture;
  gesture = null;
  const dx = event.clientX - x;
  const dy = event.clientY - y;

  if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
    cancelPendingTap();
    step(dx < 0 ? 1 : -1);
  } else if (moved || Math.hypot(dx, dy) > TAP_SLOP) {
    cancelPendingTap();
  } else if (event.pointerType === "touch") {
    handleTouchTap(event.clientX, event.clientY);
  } else {
    cancelPendingTap();
    toggleControls();
  }
});

function cancelGesture(event) {
  if (gesture?.id !== event.pointerId) return;
  gesture = null;
  cancelPendingTap();
}

track.addEventListener("pointercancel", cancelGesture);
track.addEventListener("lostpointercapture", cancelGesture);

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    step(event.key === "ArrowLeft" ? -1 : 1);
  } else if (event.key === "Escape" && !controls.hidden) {
    cancelPendingTap();
    setControlsVisible(false);
  } else if (event.target === carousel && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    if (event.repeat) return;
    cancelPendingTap();
    toggleControls();
  }
});

renderSlide();
scheduleRotation();
