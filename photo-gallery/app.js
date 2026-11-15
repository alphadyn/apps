const PHOTO_COUNT = 10;
const IMAGE_SOURCE = "https://images.unsplash.com";
const FALLBACK_IMAGE = "preview-photo.jpg";
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

function buildPhotoList() {
  const photoIds = [...PHOTO_IDS];
  for (let i = photoIds.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [photoIds[i], photoIds[randomIndex]] = [photoIds[randomIndex], photoIds[i]];
  }

  return photoIds.slice(0, PHOTO_COUNT).map((id, index) => ({
    src: `${IMAGE_SOURCE}/${id}?auto=format&fit=crop&w=1200&q=80`,
    caption: `Photo ${index + 1} of ${PHOTO_COUNT}`,
  }));
}

const PHOTOS = buildPhotoList();

const ROTATE_INTERVAL_MS = 4000;

const track = document.getElementById("carousel-track");
const thumbnails = document.getElementById("thumbnails");
const caption = document.getElementById("caption");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const playBtn = document.getElementById("play-btn");
const carousel = document.getElementById("carousel");
const maximizeBtn = document.getElementById("maximize-btn");
const fullscreenModal = document.getElementById("fullscreen-modal");
const fullscreenImg = document.getElementById("fullscreen-img");
const closeModalBtn = document.getElementById("close-modal-btn");
const fullscreenCaption = document.getElementById("fullscreen-caption");

let current = 0;
let playing = true;
let timerId = null;
let swipeStartX = 0;
let swipeStartY = 0;
let wasPlayingBeforeMaximize = true;
let carouselSwipePointerId = null;
let fullscreenSwipePointerId = null;
const SWIPE_THRESHOLD = 50;

function setPhotoImage(img, src) {
  img.onerror = () => {
    img.onerror = null;
    img.src = FALLBACK_IMAGE;
  };
  img.src = src;
}

function loadPhotoImages() {
  document.querySelectorAll("[data-photo-src]").forEach((img) => {
    setPhotoImage(img, img.dataset.photoSrc);
  });
}

function isButtonInteraction(target) {
  return target instanceof Element && target.closest("button");
}

function handleSwipeStart(clientX, clientY) {
  swipeStartX = clientX;
  swipeStartY = clientY;
}

function handleSwipeEnd(clientX, clientY) {
  const deltaX = clientX - swipeStartX;
  const deltaY = clientY - swipeStartY;

  if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) {
    return;
  }

  // If vertical swipe is more significant than horizontal, don't handle
  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    return;
  }

  if (deltaX < 0) {
    next();
  } else {
    prev();
  }
}

function handleFullscreenSwipeStart(clientX, clientY) {
  swipeStartX = clientX;
  swipeStartY = clientY;
}

function handleFullscreenSwipeEnd(clientX, clientY) {
  const deltaX = clientX - swipeStartX;
  const deltaY = clientY - swipeStartY;

  if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) {
    return;
  }

  // Vertical swipe (up or down) closes the modal
  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    closeMaximized();
    return;
  }

  // Horizontal swipe navigates through photos
  if (deltaX < 0) {
    next();
    updateFullscreenImage();
  } else {
    prev();
    updateFullscreenImage();
  }
}

function buildSlides() {
  PHOTOS.forEach((photo, index) => {
    const slide = document.createElement("div");
    slide.className = "slide" + (index === 0 ? " active" : "");
    slide.dataset.index = String(index);

    const img = document.createElement("img");
    img.src = FALLBACK_IMAGE;
    img.dataset.photoSrc = photo.src;
    img.alt = photo.caption;
    img.loading = index === 0 ? "eager" : "lazy";

    slide.appendChild(img);
    track.appendChild(slide);

    const thumb = document.createElement("button");
    thumb.className = "thumb" + (index === 0 ? " active" : "");
    thumb.setAttribute("aria-label", `Go to ${photo.caption}`);
    const thumbImg = document.createElement("img");
    thumbImg.src = FALLBACK_IMAGE;
    thumbImg.dataset.photoSrc = photo.src;
    thumbImg.alt = "";
    thumb.appendChild(thumbImg);
    thumb.addEventListener("click", () => goTo(index));
    thumbnails.appendChild(thumb);
  });
}

function render() {
  document.querySelectorAll(".slide").forEach((slide, index) => {
    slide.classList.toggle("active", index === current);
  });
  document.querySelectorAll(".thumb").forEach((thumb, index) => {
    thumb.classList.toggle("active", index === current);
  });
  caption.textContent = PHOTOS[current].caption;
}

function goTo(index) {
  current = (index + PHOTOS.length) % PHOTOS.length;
  render();
  restartTimer();
}

function next() {
  goTo(current + 1);
}

function prev() {
  goTo(current - 1);
}

function restartTimer() {
  clearInterval(timerId);
  timerId = null;
  if (playing) {
    startTimer();
  }
}

function startTimer() {
  timerId = setInterval(() => {
    current = (current + 1) % PHOTOS.length;
    render();
  }, ROTATE_INTERVAL_MS);
}

function togglePlay() {
  playing = !playing;
  playBtn.innerHTML = playing ? "&#10073;&#10073;" : "&#9654;";
  playBtn.setAttribute("aria-label", playing ? "Pause rotation" : "Play rotation");
  restartTimer();
}

function openMaximized() {
  wasPlayingBeforeMaximize = playing;
  if (playing) {
    togglePlay();
  }
  setPhotoImage(fullscreenImg, PHOTOS[current].src);
  fullscreenCaption.textContent = PHOTOS[current].caption;
  fullscreenModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function updateFullscreenImage() {
  setPhotoImage(fullscreenImg, PHOTOS[current].src);
  fullscreenCaption.textContent = PHOTOS[current].caption;
}

function closeMaximized() {
  fullscreenModal.classList.remove("active");
  document.body.style.overflow = "auto";
  if (wasPlayingBeforeMaximize && !playing) {
    togglePlay();
  }
}

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);
playBtn.addEventListener("click", togglePlay);
maximizeBtn.addEventListener("click", openMaximized);
closeModalBtn.addEventListener("click", closeMaximized);

fullscreenModal.addEventListener("click", (event) => {
  if (event.target === fullscreenModal) {
    closeMaximized();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && fullscreenModal.classList.contains("active")) {
    closeMaximized();
  }
});

carousel.addEventListener(
  "pointerdown",
  (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    if (isButtonInteraction(event.target)) {
      return;
    }
    carouselSwipePointerId = event.pointerId;
    carousel.setPointerCapture(event.pointerId);
    handleSwipeStart(event.clientX, event.clientY);
  },
  { passive: true }
);

carousel.addEventListener(
  "pointerup",
  (event) => {
    if (carouselSwipePointerId !== event.pointerId) {
      return;
    }
    carouselSwipePointerId = null;
    handleSwipeEnd(event.clientX, event.clientY);
    if (carousel.hasPointerCapture(event.pointerId)) {
      carousel.releasePointerCapture(event.pointerId);
    }
  },
  { passive: true }
);

carousel.addEventListener("pointercancel", () => {
  carouselSwipePointerId = null;
});

// Fullscreen modal swipe handlers
fullscreenModal.addEventListener(
  "pointerdown",
  (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    if (isButtonInteraction(event.target)) {
      return;
    }
    fullscreenSwipePointerId = event.pointerId;
    fullscreenModal.setPointerCapture(event.pointerId);
    handleFullscreenSwipeStart(event.clientX, event.clientY);
  },
  { passive: true }
);

fullscreenModal.addEventListener(
  "pointerup",
  (event) => {
    if (fullscreenSwipePointerId !== event.pointerId) {
      return;
    }
    fullscreenSwipePointerId = null;
    handleFullscreenSwipeEnd(event.clientX, event.clientY);
    if (fullscreenModal.hasPointerCapture(event.pointerId)) {
      fullscreenModal.releasePointerCapture(event.pointerId);
    }
  },
  { passive: true }
);

fullscreenModal.addEventListener("pointercancel", () => {
  fullscreenSwipePointerId = null;
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  if (event.key === "ArrowLeft") {
    prev();
  } else {
    next();
  }

  if (fullscreenModal.classList.contains("active")) {
    updateFullscreenImage();
  }
});

buildSlides();
render();
startTimer();
window.addEventListener("load", loadPhotoImages, { once: true });
