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
const GOOGLE_NEWS_ORIGIN = 'https://news.google.com';
const GOOGLE_NEWS_RESOLVER = `${GOOGLE_NEWS_ORIGIN}/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je`;
const resolvedGoogleUrls = new Map();
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

export async function resolveGoogleNewsUrl(articleUrl, fetchRequest = fetch) {
  const url = new URL(articleUrl);
  const match = url.hostname === 'news.google.com'
    && url.pathname.match(/^\/(?:rss\/)?(?:articles|read)\/([A-Za-z0-9_-]+)\/?$/);
  if (url.protocol !== 'https:' || !match) {
    throw new Error('Expected an HTTPS Google News article URL.');
  }

  const id = match[1];
  const pageUrl = new URL(`/rss/articles/${id}`, GOOGLE_NEWS_ORIGIN);
  pageUrl.search = new URLSearchParams({ hl: 'en-US', gl: 'US', ceid: 'US:en' });
  const requestOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AlphadynDailyBrief/1.0)',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(12_000),
  };
  const page = await fetchRequest(pageUrl, requestOptions);
  if ([301, 302, 303, 307, 308].includes(page.status)) {
    const location = page.headers.get('location');
    if (!location) throw new Error('Google News returned a redirect without an article URL.');
    const destination = new URL(location, pageUrl);
    if (!['http:', 'https:'].includes(destination.protocol)
      || destination.hostname === 'news.google.com'
      || destination.hostname === 'google.com'
      || destination.hostname.endsWith('.google.com')) {
      throw new Error('Google News returned an invalid article destination.');
    }
    return destination.href;
  }
  if (!page.ok) throw new Error(`Google News article lookup returned ${page.status}.`);

  const html = await page.text();
  const tags = html.match(/<[^>]*\bdata-n-a-id=["'][^"']+["'][^>]*>/g) || [];
  const tag = tags.find((entry) => entry.match(/\bdata-n-a-id=["']([^"']+)["']/)?.[1] === id);
  const timestamp = tag?.match(/\bdata-n-a-ts=["'](\d+)["']/)?.[1];
  const signature = tag?.match(/\bdata-n-a-sg=["']([^"']+)["']/)?.[1];
  if (!timestamp || !signature) {
    throw new Error('Google News did not provide an article signature.');
  }

  const context = [
    ['en-US', 'US', ['FINANCE_TOP_INDICES', 'WEB_TEST_1_0_0'], null, null,
      1, 1, 'US:en', null, 180, null, null, null, null, null, 0, null, null,
      [1608992183, 723341000]],
    'en-US', 'US', 1, [2, 3, 4, 8], 1, 0, '655000234', 0, 0, null, 0,
  ];
  const args = ['garturlreq', context, id, Number(timestamp), signature];
  const rpc = await fetchRequest(GOOGLE_NEWS_RESOLVER, {
    ...requestOptions,
    method: 'POST',
    body: new URLSearchParams({
      'f.req': JSON.stringify([[['Fbv4je', JSON.stringify(args), null, 'generic']]]),
    }),
  });
  if (!rpc.ok) throw new Error(`Google News link resolver returned ${rpc.status}.`);

  for (const line of (await rpc.text()).split('\n')) {
    if (!line.startsWith('[[')) continue;
    let rows;
    try {
      rows = JSON.parse(line);
    } catch {
      continue;
    }
    for (const row of rows) {
      if (row[0] !== 'wrb.fr' || row[1] !== 'Fbv4je' || typeof row[2] !== 'string') continue;
      const result = JSON.parse(row[2]);
      if (result[0] !== 'garturlres' || typeof result[1] !== 'string') continue;
      const destination = new URL(result[1]);
      if (!['http:', 'https:'].includes(destination.protocol)
        || destination.hostname === 'news.google.com') {
        throw new Error('Google News returned an invalid article destination.');
      }
      return destination.href;
    }
  }
  throw new Error('Google News returned no publisher article URL.');
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
  const digest = buildDigest(allStories);
  const selectedGoogleStories = [...new Map(
    digest.flatMap(({ lead, supporting }) => [lead, ...supporting.slice(0, 1)])
      .filter((story) => {
        try {
          return new URL(story.url).hostname === 'news.google.com';
        } catch {
          return false;
        }
      })
      .map((story) => [story.url, story]),
  ).values()];
  let nextStory = 0;
  let unresolvedGoogleLinks = 0;
  await Promise.all(Array.from(
    { length: Math.min(3, selectedGoogleStories.length) },
    async () => {
      while (nextStory < selectedGoogleStories.length) {
        const story = selectedGoogleStories[nextStory++];
        const googleUrl = story.url;
        const cachedUrl = resolvedGoogleUrls.get(googleUrl);
        if (cachedUrl && cachedUrl.expiresAt > Date.now()) {
          story.url = cachedUrl.url;
          continue;
        }
        try {
          story.url = await resolveGoogleNewsUrl(googleUrl);
          resolvedGoogleUrls.set(googleUrl, {
            url: story.url,
            expiresAt: Date.now() + MAX_AGE_MS,
          });
          if (resolvedGoogleUrls.size > 500) {
            resolvedGoogleUrls.delete(resolvedGoogleUrls.keys().next().value);
          }
        } catch (error) {
          console.error('Could not resolve a Google News article link.', error);
          unresolvedGoogleLinks += 1;
        }
      }
    },
  ));

  return {
    generatedAt: new Date().toISOString(),
    totalStories: allStories.length,
    unresolvedGoogleLinks,
    sources: results.map(({ name, stories, error }) => ({
      name,
      count: stories.length,
      ...(error ? { error } : {}),
    })),
    digest,
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
  response.setHeader('Cache-Control', 'no-store');

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
