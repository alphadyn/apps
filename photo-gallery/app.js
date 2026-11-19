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
];

function selectPhotos() {
  const photoIds = [...PHOTO_IDS];
  for (let i = photoIds.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [photoIds[i], photoIds[randomIndex]] = [photoIds[randomIndex], photoIds[i]];
  }

  return photoIds.slice(0, PHOTO_COUNT);
}

const track = document.getElementById("carousel-track");
const thumbnails = document.getElementById("thumbnails");
const caption = document.getElementById("caption");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const playBtn = document.getElementById("play-btn");
const closeBtn = document.getElementById("close-btn");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const carousel = document.getElementById("carousel");
const controls = document.getElementById("gallery-controls");

let current = 0;
let playing = true;
let timerId = null;
let gesture = null;
let pendingTap = null;

function createPhotoImage(id, { alt, width, loading = "lazy" }) {
  const img = document.createElement("img");
  img.alt = alt;
  img.loading = loading;
  img.draggable = false;
  img.addEventListener("error", () => {
    img.src = FALLBACK_IMAGE;
  }, { once: true });
  img.src = `${IMAGE_SOURCE}/${id}?auto=format&fit=crop&w=${width}&q=80`;
  return img;
}

function buildSlides(photoIds) {
  return photoIds.map((id, index) => {
    const label = `Photo ${index + 1} of ${photoIds.length}`;
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.appendChild(createPhotoImage(id, { alt: label, width: 1200, loading: index === 0 ? "eager" : "lazy" }));
    track.appendChild(slide);

    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "thumb";
    thumb.setAttribute("aria-label", `Go to ${label}`);
    thumb.appendChild(createPhotoImage(id, { alt: "", width: 160 }));
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
closeBtn.addEventListener("click", () => setControlsVisible(false));
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
