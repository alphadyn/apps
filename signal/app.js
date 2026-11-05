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
  trends: document.getElementById('trends'),
  trendList: document.getElementById('trend-list'),
  trendsHint: document.getElementById('trends-hint'),
  removedTrendsButton: document.getElementById('removed-trends-button'),
  removedTrendsDialog: document.getElementById('removed-trends-dialog'),
  removedTrendsSearch: document.getElementById('removed-trends-search'),
  removedTrendsList: document.getElementById('removed-trends-list'),
  removedTrendsStatus: document.getElementById('removed-trends-status'),
  removedTrendsError: document.getElementById('removed-trends-error'),
};

let capturedItems = [];
let capturedSnapshot = null;
let activeTrends = [];

const REMOVED_STORAGE_KEY = 'signal.removedTrends';
const SUPABASE_CONFIG = window.SIGNAL_SUPABASE;
const REMOVED_TRENDS_URL = `${SUPABASE_CONFIG.url}/rest/v1/signal_removed_trends`;

let removedTrends = loadRemovedTrends();

function loadRemovedTrends() {
  try {
    const stored = JSON.parse(localStorage.getItem(REMOVED_STORAGE_KEY));
    return Array.isArray(stored) ? stored.filter((term) => typeof term === 'string') : [];
  } catch {
    return [];
  }
}

function cacheRemovedTrends() {
  try {
    localStorage.setItem(REMOVED_STORAGE_KEY, JSON.stringify(removedTrends));
  } catch {
    showRemovedTrendsError('The shared list is available, but this browser could not save its local cache.');
  }
}

function removedTrendsHeaders() {
  return {
    apikey: SUPABASE_CONFIG.anonKey,
    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
    'Content-Type': 'application/json',
  };
}

async function saveRemovedTrend(term, shouldRemove) {
  await removedTrendsReady;
  removedTrends = shouldRemove
    ? [...removedTrends.filter((item) => item.toLowerCase() !== term.toLowerCase()), term]
    : removedTrends.filter((item) => item.toLowerCase() !== term.toLowerCase());
  cacheRemovedTrends();
  renderRemovedTrends();
  renderTrends();
  updateSearchResults();

  try {
    const url = shouldRemove
      ? REMOVED_TRENDS_URL
      : `${REMOVED_TRENDS_URL}?term=eq.${encodeURIComponent(term)}`;
    const response = await fetch(url, {
      method: shouldRemove ? 'POST' : 'DELETE',
      headers: {
        ...removedTrendsHeaders(),
        ...(shouldRemove ? { Prefer: 'resolution=ignore-duplicates,return=minimal' } : {}),
      },
      ...(shouldRemove ? { body: JSON.stringify({ term }) } : {}),
    });
    if (!response.ok) {
      showRemovedTrendsError(`Could not save the shared removed trends list (${response.status}). This change is only saved in this browser.`);
    } else {
      clearRemovedTrendsError();
    }
  } catch {
    showRemovedTrendsError('Could not save the shared removed trends list. This change is only saved in this browser.');
  }
}

async function syncRemovedTrendsFromDatabase() {
  try {
    const response = await fetch(`${REMOVED_TRENDS_URL}?select=term&order=term.asc`, {
      headers: removedTrendsHeaders(),
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.some((row) => typeof row?.term !== 'string')) {
      throw new Error('Supabase returned an invalid removed trends list');
    }
    removedTrends = [...new Set(rows.map((row) => row.term))];
    cacheRemovedTrends();
    clearRemovedTrendsError();
    renderRemovedTrends();
    renderTrends();
    updateSearchResults();
  } catch (error) {
    showRemovedTrendsError(`Could not load the shared removed trends list: ${error.message}. Showing this browser’s saved copy.`);
  }
}

function computeTrends(stories, removed, limit = 20) {
  return SignalTrends.compute(stories, removed, limit);
}

function storyMatchesTrend(story, term) {
  return SignalTrends.matches(story, term);
}

function selectTrend(term) {
  activeTrends = activeTrends.includes(term)
    ? activeTrends.filter((item) => item !== term)
    : [...activeTrends, term];
  renderTrends();
  updateSearchResults();
}

function removeTrend(term) {
  if (!removedTrends.includes(term)) removedTrends.push(term);
  activeTrends = activeTrends.filter((item) => item !== term);
  cacheRemovedTrends();
  saveRemovedTrend(term, true);
  renderRemovedTrends();
  renderTrends();
  updateSearchResults();
}

function restoreTrend(term) {
  removedTrends = removedTrends.filter((item) => item.toLowerCase() !== term.toLowerCase());
  cacheRemovedTrends();
  saveRemovedTrend(term, false);
  renderRemovedTrends();
  renderTrends();
  updateSearchResults();
  const nextRestore = elements.removedTrendsList.querySelector('button');
  (nextRestore || elements.removedTrendsSearch).focus();
}

function renderRemovedTrends() {
  const query = elements.removedTrendsSearch.value.trim().toLowerCase();
  const terms = removedTrends
    .filter((term) => term.toLowerCase().includes(query))
    .sort((a, b) => a.localeCompare(b));
  elements.removedTrendsStatus.textContent = !removedTrends.length
    ? 'No removed trends. Keywords you remove will appear here.'
    : !terms.length
      ? 'No matching removed keywords. Try a different search.'
      : `${terms.length} removed ${terms.length === 1 ? 'keyword' : 'keywords'}`;
  elements.removedTrendsList.replaceChildren(...terms.map((term) => {
    const item = document.createElement('li');
    item.className = 'trend-item';
    const keyword = document.createElement('span');
    keyword.className = 'trend-link';
    keyword.textContent = term;
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'trend-restore';
    restore.textContent = '+';
    restore.setAttribute('aria-label', `Restore ${term} to trending`);
    restore.addEventListener('click', () => restoreTrend(term));
    item.append(keyword, restore);
    return item;
  }));
}

function renderTrends() {
  const trends = computeTrends(capturedItems, removedTrends);
  elements.trends.hidden = !capturedItems.length;
  elements.trendsHint.textContent = activeTrends.length
    ? `Showing stories with ${activeTrends.map((term) => `“${term}”`).join(' and ')}. Select a term again to deselect it.`
    : trends.length
      ? 'Ranked by headline count, highest first. Select terms to filter stories, or × to remove one.'
      : 'No recurring names or phrases found in this capture.';

  elements.trendList.replaceChildren(...trends.map(({ term, count }, index) => {
    const item = document.createElement('li');
    item.className = 'trend-item';
    item.dataset.active = String(activeTrends.includes(term));

    const rank = document.createElement('span');
    rank.className = 'trend-rank';
    rank.textContent = String(index + 1).padStart(2, '0');

    const link = document.createElement('a');
    link.className = 'trend-link';
    link.href = '#';
    link.textContent = term;
    link.addEventListener('click', (event) => { event.preventDefault(); selectTrend(term); });

    const total = document.createElement('span');
    total.className = 'trend-count';
    total.textContent = String(count);
    total.setAttribute('aria-label', `${count} headlines`);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'trend-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${term} from trending`);
    remove.addEventListener('click', () => removeTrend(term));

    item.append(rank, link, total, remove);
    return item;
  }));

}

function getVisibleStories() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const stories = activeTrends.length
    ? capturedItems.filter((story) => activeTrends.every((term) => storyMatchesTrend(story, term)))
    : capturedItems;

  if (!query) {
    return stories;
  }

  return stories.filter((story) => {
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

function showRemovedTrendsError(message) {
  elements.removedTrendsError.hidden = false;
  elements.removedTrendsError.textContent = message;
  showError(message);
}

function clearRemovedTrendsError() {
  elements.removedTrendsError.hidden = true;
  elements.removedTrendsError.textContent = '';
  if (/^(Could not (?:load|save) the shared removed trends list|The shared list is available)/.test(elements.errorMessage.textContent)) {
    clearError();
  }
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
    activeTrends = [];
    renderTrends();
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
  elements.removedTrendsButton.addEventListener('click', () => {
    elements.removedTrendsSearch.value = '';
    renderRemovedTrends();
    elements.removedTrendsDialog.showModal();
  });
  elements.removedTrendsSearch.addEventListener('input', renderRemovedTrends);
}

bindEvents();
const removedTrendsReady = syncRemovedTrendsFromDatabase();
renderStories([]);
setStatus('idle', 'Ready when you are', 'Your captured headlines will appear here.', 'NO CAPTURE YET');
