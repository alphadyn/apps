const VERCEL_API = 'https://ai-orcin-eta-15.vercel.app/api/daily-brief';
const API_URL = window.location.hostname.endsWith('github.io')
  || ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? VERCEL_API
  : '/api/daily-brief';

const elements = {
  editionDate: document.getElementById('edition-date'),
  refreshButton: document.getElementById('refresh-button'),
  refreshLabel: document.getElementById('refresh-label'),
  briefStatus: document.getElementById('brief-status'),
  statusLabel: document.getElementById('status-label'),
  briefContent: document.getElementById('brief-content'),
  sourceTotal: document.getElementById('source-total'),
  sourceList: document.getElementById('source-list'),
  sourceFootnote: document.getElementById('source-footnote'),
  coverageCount: document.getElementById('coverage-count'),
  storyList: document.getElementById('story-list'),
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

elements.editionDate.dateTime = new Date().toISOString();
elements.editionDate.textContent = dateFormatter.format(new Date());
elements.refreshButton.addEventListener('click', loadBriefing);

function setLoading(isLoading) {
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.setAttribute('aria-busy', String(isLoading));
  elements.refreshLabel.textContent = isLoading ? 'Refreshing…' : 'Refresh briefing';
  elements.briefContent.setAttribute('aria-busy', String(isLoading));
  elements.briefStatus.dataset.state = isLoading ? 'loading' : '';
  elements.statusLabel.textContent = isLoading ? 'CHECKING NEWSROOMS' : 'CONNECTING TO NEWSROOMS';
  if (isLoading) {
    elements.briefContent.innerHTML = '<div class="loading-state"><span class="loading-mark" aria-hidden="true"></span><strong>Scanning today’s headlines</strong><span>Gathering reporting from across the newsrooms.</span></div>';
  }
}

function setError(message) {
  elements.briefStatus.dataset.state = 'error';
  elements.statusLabel.textContent = 'BRIEFING UNAVAILABLE';
  elements.briefContent.setAttribute('aria-busy', 'false');
  elements.briefContent.replaceChildren();

  const panel = document.createElement('div');
  panel.className = 'error-state';
  const heading = document.createElement('strong');
  heading.textContent = 'We couldn’t reach the news feeds.';
  const description = document.createElement('p');
  description.textContent = message;
  const retry = document.createElement('button');
  retry.className = 'retry-link';
  retry.type = 'button';
  retry.textContent = 'Try again';
  retry.addEventListener('click', loadBriefing);
  panel.append(heading, description, retry);
  elements.briefContent.append(panel);
  elements.sourceTotal.textContent = '0 / 6';
  elements.sourceList.replaceChildren();
  elements.sourceFootnote.textContent = 'The feeds may be temporarily unavailable. Try again in a moment.';
  elements.coverageCount.textContent = 'No headlines loaded';
  elements.storyList.replaceChildren();
}

function renderSources(sources) {
  const available = sources.filter((source) => source.count > 0).length;
  elements.sourceTotal.textContent = `${available} / ${sources.length}`;
  elements.sourceList.replaceChildren(...sources.map((source) => {
    const row = document.createElement('li');
    row.className = 'source-row';
    row.dataset.state = source.count > 0 ? 'ready' : 'error';
    const dot = document.createElement('span');
    dot.className = 'source-state';
    dot.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'source-name';
    name.textContent = source.name;
    const count = document.createElement('span');
    count.className = 'source-count';
    count.textContent = source.count > 0
      ? `${source.count} ${source.count === 1 ? 'story' : 'stories'}`
      : 'unavailable';
    row.append(dot, name, count);
    return row;
  }));
  const unavailable = sources.filter((source) => source.count === 0);
  elements.sourceFootnote.textContent = unavailable.length
    ? `Some feeds are unavailable right now: ${unavailable.map((source) => source.name).join(', ')}.`
    : 'Feeds are checked on each visit; coverage changes throughout the day.';
}

function renderDigest(digest, generatedAt) {
  elements.briefContent.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = 'The stories leading today’s coverage.';
  const list = document.createElement('div');
  list.className = 'digest-list';

  digest.slice(0, 5).forEach((item, index) => {
    const paragraph = document.createElement('p');
    paragraph.className = 'digest-paragraph';
    const number = document.createElement('span');
    number.className = 'digest-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const text = document.createElement('span');
    const lead = document.createElement('strong');
    lead.textContent = `${item.lead.source}: “${item.lead.title}”`;
    text.append(lead);

    if (item.supporting.length) {
      const supporting = document.createTextNode(
        ` Related coverage from ${item.supporting.map((story) => story.source).filter((value, position, list) => list.indexOf(value) === position).join(', ')} follows the same thread, including “${item.supporting[0].title}.”`,
      );
      text.append(supporting);
    } else {
      text.append(document.createTextNode('.'));
    }

    paragraph.append(number, text);
    list.append(paragraph);
  });

  if (!digest.length) {
    const empty = document.createElement('p');
    empty.className = 'digest-paragraph';
    empty.textContent = 'News feeds responded, but no recent headlines were available for the daily briefing.';
    list.append(empty);
  }

  elements.briefContent.append(heading, list);
  elements.briefContent.setAttribute('aria-busy', 'false');
  elements.briefStatus.dataset.state = 'ready';
  elements.statusLabel.textContent = `UPDATED ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(generatedAt))}`;
}

function renderStories(stories) {
  elements.coverageCount.textContent = `${stories.length} recent ${stories.length === 1 ? 'headline' : 'headlines'}`;
  if (!stories.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-coverage';
    empty.textContent = 'No recent stories were returned. Refresh to check the feeds again.';
    elements.storyList.replaceChildren(empty);
    return;
  }

  elements.storyList.replaceChildren(...stories.slice(0, 12).map((story) => {
    const card = document.createElement('a');
    card.className = 'story-card';
    card.href = story.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    const source = document.createElement('span');
    source.className = 'story-source';
    source.textContent = story.source;
    const title = document.createElement('h3');
    title.className = 'story-title';
    title.textContent = story.title;
    const meta = document.createElement('span');
    meta.className = 'story-meta';
    const time = document.createElement('span');
    time.textContent = story.publishedAt
      ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(story.publishedAt))
      : 'Recent';
    const arrow = document.createElement('span');
    arrow.className = 'story-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    meta.append(time, arrow);
    card.append(source, title, meta);
    return card;
  }));
}

async function loadBriefing() {
  setLoading(true);
  try {
    const response = await fetch(API_URL, { headers: { Accept: 'application/json' } });
    if (!response.headers.get('content-type')?.includes('json')) {
      throw new Error(`The news service returned an unexpected response (${response.status}).`);
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `The news service returned ${response.status}.`);
    if (!Array.isArray(data.sources) || !Array.isArray(data.digest) || !Array.isArray(data.stories)) {
      throw new Error('The news service returned an unexpected response.');
    }
    renderSources(data.sources);
    renderDigest(data.digest, data.generatedAt);
    renderStories(data.stories);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.setAttribute('aria-busy', 'false');
    elements.refreshLabel.textContent = 'Refresh briefing';
  }
}

loadBriefing();
