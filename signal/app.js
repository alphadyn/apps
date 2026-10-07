const NEWS_SNAPSHOT_URL = './news.json';

const elements = {
  captureButton: document.getElementById('capture-button'),
  buttonLabel: document.querySelector('#capture-button .button-label'),
  searchInput: document.getElementById('article-search'),
  statusPanel: document.getElementById('status-panel'),
  statusTitle: document.getElementById('status-title'),
  statusMessage: document.getElementById('status-message'),
  statusMeta: document.getElementById('status-meta'),
  statusIcon: document.getElementById('status-icon'),
  storyList: document.getElementById('story-list'),
  emptyNote: document.getElementById('empty-note'),
  errorMessage: document.getElementById('error-message'),
  downloadButton: document.getElementById('download-button'),
  captureFooter: document.getElementById('capture-footer'),
};

let capturedItems = [];
let capturedSnapshot = null;

function getVisibleStories() {
  const query = elements.searchInput.value.trim().toLowerCase();

  if (!query) {
    return capturedItems;
  }

  return capturedItems.filter((story) => {
    const haystack = [
      story.header_title,
      story.section,
      ...(story.subtitles || []).map((subtitle) => subtitle.title),
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });
}

function updateSearchResults() {
  const visibleStories = getVisibleStories();

  if (!visibleStories.length) {
    elements.storyList.innerHTML = '';
    elements.emptyNote.hidden = false;
    elements.emptyNote.innerHTML = elements.searchInput.value.trim()
      ? '<span class="empty-star" aria-hidden="true">✳</span><span>No matching articles found.<br>Try a different keyword or topic.</span>'
      : '<span class="empty-star" aria-hidden="true">✳</span><span>Nothing in your briefing yet.<br>Start a capture to bring today’s stories into focus.</span>';
    elements.downloadButton.hidden = !capturedItems.length;
    elements.captureFooter.hidden = true;
    return;
  }

  elements.storyList.replaceChildren(...visibleStories.map(createStoryCard));
  elements.emptyNote.hidden = true;
  elements.downloadButton.hidden = false;
  elements.captureFooter.hidden = false;
}

function createStoryCard(story, index) {
  const card = document.createElement('article');
  card.className = 'story-card';

  const header = document.createElement('div');
  header.className = 'story-card-header';

  const number = document.createElement('span');
  number.className = 'story-number';
  number.textContent = String(index + 1).padStart(2, '0');

  const title = document.createElement('a');
  title.className = 'story-title';
  title.href = story.header_url;
  title.target = '_blank';
  title.rel = 'noopener noreferrer';
  title.textContent = story.header_title;

  header.append(number, title);
  card.append(header);

  if (story.section) {
    const section = document.createElement('span');
    section.className = 'story-section';
    section.textContent = story.section;
    card.append(section);
  }

  if (story.subtitles && story.subtitles.length) {
    const label = document.createElement('span');
    label.className = 'related-count';
    const count = story.subtitles.length;
    label.textContent = `${count} related ${count === 1 ? 'read' : 'reads'}`;

    const links = document.createElement('ul');
    links.className = 'related-links';

    for (const item of story.subtitles) {
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = item.title;
      row.append(link);
      links.append(row);
    }

    card.append(label, links);
  }

  return card;
}

function renderStories(items) {
  const filteredItems = getVisibleStories();

  if (elements.searchInput.value.trim() && filteredItems.length !== items.length) {
    updateSearchResults();
    return;
  }

  const visibleItems = elements.searchInput.value.trim() ? filteredItems : items;

  if (!visibleItems.length) {
    elements.storyList.innerHTML = '';
    elements.emptyNote.hidden = false;
    elements.emptyNote.innerHTML = '<span class="empty-star" aria-hidden="true">✳</span><span>Nothing in your briefing yet.<br>Start a capture to bring today’s stories into focus.</span>';
    elements.downloadButton.hidden = true;
    elements.captureFooter.hidden = true;
    return;
  }

  elements.storyList.replaceChildren(...visibleItems.map(createStoryCard));
  elements.emptyNote.hidden = true;
  elements.downloadButton.hidden = false;
  elements.captureFooter.hidden = false;
}

function setStatus(state, title, message, meta) {
  elements.statusPanel.dataset.state = state;
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
  elements.statusMeta.textContent = meta;
  elements.statusIcon.textContent = state === 'running' ? '◌' : state === 'error' ? '!' : '✳';
}

function showError(message) {
  elements.errorMessage.hidden = false;
  elements.errorMessage.textContent = message;
}

function clearError() {
  elements.errorMessage.hidden = true;
  elements.errorMessage.textContent = '';
}

async function fetchNewsSnapshot() {
  const response = await fetch(NEWS_SNAPSHOT_URL, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`News snapshot request failed (${response.status}). The Pages deployment must build the snapshot before it can be loaded.`);
  }

  const payload = await response.json();
  const isText = (value) => typeof value === 'string' && value.trim().length > 0;
  const isLink = (value) => isText(value) && /^https?:\/\/[^/\s]+(?:\/|$)/i.test(value);
  const isFeed = (feed) => feed && isText(feed.section) && isLink(feed.url);
  if (!payload || !Array.isArray(payload.news) || !payload.news.length
      || !payload.news.every((story) => story && isText(story.header_title)
        && isLink(story.header_url) && isText(story.section)
        && Array.isArray(story.subtitles)
        && story.subtitles.every((item) => item && isText(item.title) && isLink(item.url)))
      || !Array.isArray(payload.source_feeds) || !payload.source_feeds.length
      || !payload.source_feeds.every(isFeed)
      || !Array.isArray(payload.failed_feeds)
      || !payload.failed_feeds.every((feed) => isFeed(feed) && isText(feed.error)
        && payload.source_feeds.some((source) => source.url === feed.url))
      || payload.failed_feeds.length >= payload.source_feeds.length
      || !isText(payload.captured_at_utc) || !Number.isFinite(Date.parse(payload.captured_at_utc))) {
    throw new Error('The news snapshot is invalid or contains no headlines.');
  }
  return payload;
}

async function fetchGoogleNews() {
  clearError();
  setStatus('running', 'Building your briefing', 'Loading the latest Google News snapshot…', 'IN PROGRESS');
  elements.captureButton.disabled = true;
  elements.buttonLabel.textContent = 'Gathering the latest stories…';

  try {
    capturedSnapshot = await fetchNewsSnapshot();
    capturedItems = capturedSnapshot.news;
    renderStories(capturedItems);
    const totalFeeds = capturedSnapshot.source_feeds.length;
    const loadedFeeds = totalFeeds - capturedSnapshot.failed_feeds.length;
    const feedMessage = `Loaded ${capturedItems.length} unique stories across ${loadedFeeds} of ${totalFeeds} Google News feeds.`;
    setStatus('idle', `${capturedItems.length} ${capturedItems.length === 1 ? 'story' : 'stories'} in your briefing`, feedMessage, `${loadedFeeds} FEEDS`);
    if (capturedSnapshot.failed_feeds.length) {
      showError(`Some sections were unavailable when this snapshot was built: ${capturedSnapshot.failed_feeds.map((feed) => `${feed.section}: ${feed.error}`).join('; ')}. The next scheduled build will try again.`);
    }
    elements.captureFooter.textContent = `Snapshot updated ${new Date(capturedSnapshot.captured_at_utc).toLocaleString()} · Source: Google News`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    showError(message);
    renderStories(capturedItems);
    setStatus('error', 'Capture needs attention', 'The news feed is temporarily unavailable. Please try again.', 'CAPTURE FAILED');
  } finally {
    elements.captureButton.disabled = false;
    elements.buttonLabel.textContent = 'Capture today’s headlines';
  }
}

function downloadAsJson() {
  const payload = {
    source_feeds: capturedSnapshot.source_feeds,
    captured_at_utc: capturedSnapshot.captured_at_utc,
    failed_feeds: capturedSnapshot.failed_feeds,
    news: capturedItems,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'google_news_capture.json';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  elements.captureButton.addEventListener('click', fetchGoogleNews);
  elements.downloadButton.addEventListener('click', downloadAsJson);
  elements.searchInput.addEventListener('input', updateSearchResults);
}

bindEvents();
renderStories([]);
setStatus('idle', 'Ready when you are', 'Your captured headlines will appear here.', 'NO CAPTURE YET');
