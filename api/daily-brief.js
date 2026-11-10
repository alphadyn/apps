const ALLOWED_ORIGINS = new Set([
  'https://alphadyn.github.io',
  'https://ai-orcin-eta-15.vercel.app',
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  'http://127.0.0.1:8765',
  'http://localhost:8765',
]);

const FEEDS = [
  {
    name: 'Google News',
    url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
  },
  {
    name: 'Reuters',
    url: 'https://news.google.com/rss/search?q=site%3Areuters.com&hl=en-US&gl=US&ceid=US%3Aen',
  },
  {
    name: 'CNN',
    url: 'https://news.google.com/rss/search?q=site%3Acnn.com&hl=en-US&gl=US&ceid=US%3Aen',
  },
  {
    name: 'BBC',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  },
  {
    name: 'Bloomberg',
    url: 'https://news.google.com/rss/search?q=site%3Abloomberg.com&hl=en-US&gl=US&ceid=US%3Aen',
  },
  {
    name: 'CNBC',
    url: 'https://news.google.com/rss/search?q=site%3Acnbc.com&hl=en-US&gl=US&ceid=US%3Aen',
  },
];

const CACHE_MS = 5 * 60 * 1000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_STORIES_PER_FEED = 24;
const STOP_WORDS = new Set([
  'about', 'after', 'against', 'among', 'amid', 'been', 'before', 'being', 'between',
  'could', 'from', 'have', 'into', 'just', 'more', 'most', 'news', 'over', 'says',
  'said', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'under', 'very', 'were', 'what', 'when', 'where', 'which',
  'while', 'will', 'with', 'would', 'your', 'today', 'live', 'latest', 'update',
  'updates', 'video', 'watch', 'report', 'reports', 'reporting',
]);

let cachedResult;
let cachedAt = 0;

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function textContent(value) {
  return decodeXml(value).replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagContent(block, tag) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}\\s*>`, 'i'));
  return match ? match[1] : '';
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function parseRss(xml, fallbackSource) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi)]
    .map(([, block]) => {
      const title = textContent(tagContent(block, 'title'));
      const link = safeHttpUrl(textContent(tagContent(block, 'link')));
      const sourceElement = block.match(/<source\b([^>]*)>([\s\S]*?)<\/source\s*>/i);
      const sourceName = sourceElement ? textContent(sourceElement[2]) : '';
      const sourceUrl = sourceElement?.[1].match(/\burl=["']([^"']+)["']/i)?.[1];
      const published = textContent(
        tagContent(block, 'pubDate') || tagContent(block, 'published') || tagContent(block, 'updated'),
      );
      const publishedAt = published && Number.isFinite(Date.parse(published))
        ? new Date(published).toISOString()
        : null;

      if (!title || !link) return null;
      return {
        title,
        url: link,
        source: sourceName || fallbackSource,
        sourceUrl: safeHttpUrl(sourceUrl || ''),
        publishedAt,
      };
    })
    .filter(Boolean);
}

function headlineWords(title) {
  return new Set(
    title.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu)?.filter((word) => !STOP_WORDS.has(word)) || [],
  );
}

function similarity(left, right) {
  const shared = [...left].filter((word) => right.has(word));
  const unionSize = new Set([...left, ...right]).size;
  if (!shared.length || !unionSize) return 0;
  const hasDistinctiveMatch = shared.some((word) => word.length >= 7);
  if (shared.length < 2 && !(hasDistinctiveMatch && unionSize <= 3)) return 0;
  return shared.length / unionSize;
}

export function buildDigest(stories, maxParagraphs = 5) {
  const clusters = [];
  for (const story of stories) {
    const words = headlineWords(story.title);
    let bestCluster;
    let bestScore = 0;
    for (const cluster of clusters) {
      const score = similarity(words, cluster.words);
      if (score > bestScore) {
        bestCluster = cluster;
        bestScore = score;
      }
    }
    if (bestCluster) {
      bestCluster.stories.push(story);
    } else {
      clusters.push({ stories: [story], words });
    }
  }

  return clusters
    .map(({ stories: groupedStories }) => {
      const sourceNames = [...new Set(groupedStories.map((story) => story.source))];
      return {
        lead: groupedStories[0],
        supporting: groupedStories.slice(1, 3),
        sourceCount: sourceNames.length,
        storyCount: groupedStories.length,
        newest: groupedStories.reduce((latest, story) => {
          const time = Date.parse(story.publishedAt || '') || 0;
          return Math.max(latest, time);
        }, 0),
      };
    })
    .sort((left, right) => (
      right.sourceCount - left.sourceCount
      || right.storyCount - left.storyCount
      || right.newest - left.newest
    ))
    .slice(0, Math.min(5, Math.max(0, maxParagraphs)));
}

function uniqueStories(stories) {
  const unique = new Map();
  for (const story of stories) {
    const key = story.title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const prior = unique.get(key);
    if (!prior || (!prior.publishedAt && story.publishedAt)) unique.set(key, story);
  }
  return [...unique.values()];
}

async function fetchFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      headers: { 'User-Agent': 'AlphadynDailyBrief/1.0 (+https://alphadyn.github.io/apps/daily-brief/)' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);
    const stories = parseRss(await response.text(), feed.name);
    const since = Date.now() - MAX_AGE_MS;
    const recent = stories.filter((story) => !story.publishedAt || Date.parse(story.publishedAt) >= since);
    return { name: feed.name, stories: recent.slice(0, MAX_STORIES_PER_FEED), error: null };
  } catch (error) {
    return {
      name: feed.name,
      stories: [],
      error: error instanceof Error ? error.message : 'Feed request failed',
    };
  }
}

async function createBrief() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const available = results.filter((result) => result.stories.length);
  if (!available.length) {
    throw new Error('All news feeds are temporarily unavailable. Please try again shortly.');
  }

  const allStories = uniqueStories(results.flatMap((result) => result.stories))
    .sort((left, right) => (
      (Date.parse(right.publishedAt || '') || 0) - (Date.parse(left.publishedAt || '') || 0)
    ));

  return {
    generatedAt: new Date().toISOString(),
    totalStories: allStories.length,
    sources: results.map(({ name, stories, error }) => ({
      name,
      count: stories.length,
      ...(error ? { error } : {}),
    })),
    digest: buildDigest(allStories),
    stories: allStories,
  };
}

export default async function handler(request, response) {
  const origin = request.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=900');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    if (!cachedResult || Date.now() - cachedAt >= CACHE_MS) {
      cachedResult = await createBrief();
      cachedAt = Date.now();
    }
    response.status(200).json(cachedResult);
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : 'Could not load the daily news briefing.',
    });
  }
}
