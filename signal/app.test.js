import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const trendsScript = readFileSync(new URL('./static/trends.js', import.meta.url), 'utf8');
const supabaseUrl = 'https://vftmcftccahjlxbxcnsf.supabase.co/rest/v1/signal_removed_trends';
const snapshot = {
  source_feeds: [
    { section: 'Top Stories', url: 'https://news.google.com/rss' },
    { section: 'Nation', url: 'https://news.google.com/rss/nation' },
  ],
  captured_at_utc: '2026-10-07T14:00:00+00:00',
  failed_feeds: [],
  news: [{
    header_title: 'Example headline',
    header_url: 'https://example.com/story',
    section: 'Top Stories',
    subtitles: [],
  }],
};

function setup(fetch, storage = new Map(), options = {}) {
  const nodes = new Map();
  const removed = [...(options.removed || [])];
  const supabaseRequests = [];
  const node = () => ({
    dataset: {}, value: '', hidden: false, disabled: false, textContent: '',
    attributes: {}, listeners: {},
    append(...children) { this.children = [...(this.children || []), ...children]; },
    replaceChildren(...children) { this.children = children; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; },
    click() { this.listeners.click?.(); }, remove() {},
    showModal() { this.open = true; },
    focus() { this.focused = true; },
    querySelector() { return this.children?.[0]?.children?.[1] || null; },
  });
  const getNode = (id) => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  };
  getNode('removed-trends-error').hidden = true;
  let downloaded;
  const appFetch = async (url, request = {}) => {
    if (String(url).startsWith(supabaseUrl)) {
      supabaseRequests.push({ url, ...request });
      if (options.supabaseFetch) return options.supabaseFetch(url, request);
      const method = request.method || 'GET';
      if (method === 'GET') return { ok: true, json: async () => removed.map((term) => ({ term })) };
      if (method === 'POST') {
        const { term } = JSON.parse(request.body);
        if (!removed.includes(term)) removed.push(term);
        return { ok: true };
      }
      if (method === 'DELETE') {
        const term = new URL(url).searchParams.get('term')?.slice(3);
        const index = removed.findIndex((item) => item === term);
        if (index !== -1) removed.splice(index, 1);
        return { ok: true };
      }
      return { ok: false, status: 405 };
    }
    return fetch(url, request);
  };
  const context = vm.createContext({
    document: {
      getElementById: getNode, querySelector: getNode,
      createElement: node, body: node(),
    },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
    },
    window: { SIGNAL_SUPABASE: { url: 'https://vftmcftccahjlxbxcnsf.supabase.co', anonKey: 'test-key' } },
    fetch: appFetch, Date, Blob, URLSearchParams, URL: {
      createObjectURL(blob) { downloaded = blob; return 'blob:download'; },
      revokeObjectURL() {},
    },
  });
  vm.runInContext(trendsScript, context);
  vm.runInContext(script, context);
  return {
    nodes,
    run: (code) => vm.runInContext(code, context),
    download: () => downloaded,
    removed,
    supabaseRequests,
  };
}

test('loads same-origin snapshot and downloads original timestamp and metadata', async () => {
  const app = setup(async (url, options) => {
    assert.equal(url, './news.json');
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => snapshot };
  });
  await app.run('fetchGoogleNews()');
  assert.equal(app.nodes.get('error-message').hidden, true);
  assert.equal(app.nodes.get('status-meta').textContent, '2 FEEDS');
  assert.equal(app.nodes.get('story-list').children.length, 1);
  app.run('downloadAsJson()');
  assert.deepEqual(JSON.parse(await app.download().text()), snapshot);
  app.nodes.get('article-search').value = 'not present';
  app.run('updateSearchResults()');
  assert.equal(app.nodes.get('capture-footer').hidden, true);
  assert.equal(app.nodes.get('download-button').hidden, false);
});

test('shows actual failed section details while retaining usable headlines', async () => {
  const partial = {
    ...snapshot,
    failed_feeds: [{ ...snapshot.source_feeds[1], error: 'Upstream timeout' }],
  };
  const app = setup(async () => ({ ok: true, json: async () => partial }));
  await app.run('fetchGoogleNews()');
  assert.match(app.nodes.get('error-message').textContent, /Nation: Upstream timeout/);
  assert.equal(app.nodes.get('status-meta').textContent, '1 FEEDS');
  assert.equal(app.nodes.get('story-list').children.length, 1);
});

test('reports missing snapshot and restores capture controls', async () => {
  const app = setup(async () => ({ ok: false, status: 404 }));
  await app.run('fetchGoogleNews()');
  assert.match(app.nodes.get('error-message').textContent, /404/);
  assert.equal(app.nodes.get('status-panel').dataset.state, 'error');
  assert.equal(app.nodes.get('capture-button').disabled, false);
});

test('rejects invalid snapshot data', async () => {
  for (const invalid of [
    { ...snapshot, news: [] },
    { ...snapshot, captured_at_utc: 'invalid' },
    { ...snapshot, news: [{ ...snapshot.news[0], header_url: 'javascript:alert(1)' }] },
    { ...snapshot, failed_feeds: [{}] },
  ]) {
    const app = setup(async () => ({ ok: true, json: async () => invalid }));
    await app.run('fetchGoogleNews()');
    assert.equal(app.nodes.get('status-panel').dataset.state, 'error');
    assert.match(app.nodes.get('error-message').textContent, /invalid/);
  }
});

test('failed refresh preserves previous stories and downloadable snapshot', async () => {
  let fail = false;
  const app = setup(async () => {
    if (fail) throw new Error('Network unavailable');
    return { ok: true, json: async () => snapshot };
  });
  await app.run('fetchGoogleNews()');
  fail = true;
  await app.run('fetchGoogleNews()');
  assert.equal(app.nodes.get('story-list').children.length, 1);
  assert.equal(app.nodes.get('download-button').hidden, false);
  app.run('downloadAsJson()');
  assert.deepEqual(JSON.parse(await app.download().text()), snapshot);
});

test('ranks trending terms, filters stories, and persists removals', async () => {
  const headlines = [
    'The Fed rate cut looms - Reuters', 'The Fed rate decision nears - AP',
    'The Fed holds steady on rates - CNN', 'A tropical storm hits coast - BBC', 'A tropical storm warning issued - NBC',
  ];
  const data = { ...snapshot, news: headlines.map((header_title, i) => ({
    header_title, header_url: `https://example.com/${i}`, section: 'Top Stories', subtitles: [],
  })) };
  const app = setup(async () => ({ ok: true, json: async () => data }));
  await app.run('fetchGoogleNews()');
  assert.deepEqual(JSON.parse(app.run('JSON.stringify(computeTrends(capturedItems, []).map((t) => t.term))')),
    ['fed', 'fed rate', 'tropical storm']);
  assert.equal(app.nodes.get('trend-list').children.length, 3);
  app.run("selectTrend('tropical storm')");
  assert.equal(app.nodes.get('story-list').children.length, 2);
  app.run("selectTrend('fed')");
  assert.equal(app.run('getVisibleStories().length'), 0);
  app.run("selectTrend('tropical storm')");
  assert.equal(app.run('getVisibleStories().length'), 3);
  app.run("selectTrend('fed rate')");
  assert.equal(app.run('getVisibleStories().length'), 2);
  app.run("removeTrend('fed')");
  assert.equal(app.run("JSON.stringify(removedTrends)"), '["fed"]');
  assert.equal(app.run("computeTrends(capturedItems, removedTrends).some((t) => t.term === 'fed')"), false);
});

test('opens removed trends, searches keywords, and restores ranking with the plus button', async () => {
  const storage = new Map([['signal.removedTrends', '["nasa","apple","absent keyword"]']]);
  const data = { ...snapshot, news: [
    { ...snapshot.news[0], header_title: 'NASA launches today' },
    { ...snapshot.news[0], header_title: 'Reports from NASA arrive' },
  ] };
  const app = setup(async (url, options) => {
    return {
      ok: true,
      headers: { get: () => 'true' },
      json: async () => data,
    };
  }, storage, { removed: ['nasa', 'apple', 'absent keyword'] });
  await app.run('removedTrendsReady');
  await app.run('fetchGoogleNews()');
  app.nodes.get('removed-trends-button').click();
  assert.equal(app.nodes.get('removed-trends-dialog').open, true);
  const list = app.nodes.get('removed-trends-list');
  assert.deepEqual(list.children.map((row) => row.children[0].textContent), ['absent keyword', 'apple', 'nasa']);
  const search = app.nodes.get('removed-trends-search');
  search.value = '  NaSa ';
  search.listeners.input();
  assert.equal(list.children.length, 1);
  const plus = list.children[0].children[1];
  assert.equal(plus.textContent, '+');
  assert.equal(plus.attributes['aria-label'], 'Restore nasa to trending');
  plus.click();
  assert.equal(list.children.length, 0);
  assert.match(app.nodes.get('removed-trends-status').textContent, /No matching/);
  assert.equal(search.focused, true);
  assert.equal(app.nodes.get('trend-list').children[0].children[1].textContent, 'nasa');
  assert.deepEqual(JSON.parse(storage.get('signal.removedTrends')), ['apple', 'absent keyword']);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(app.removed, ['apple', 'absent keyword']);
  assert.equal(app.supabaseRequests.at(-1).method, 'DELETE');
  app.nodes.get('removed-trends-button').click();
  assert.equal(search.value, '');
  assert.equal(list.children.length, 2);

  const reloaded = setup(async () => ({ ok: true }), storage, { removed: ['apple'] });
  await reloaded.run('syncRemovedTrendsFromDatabase()');
  assert.equal(reloaded.run("removedTrends.some((term) => term.toLowerCase() === 'nasa')"), false);
  reloaded.run("removeTrend('nasa')");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reloaded.run("removedTrends.includes('nasa')"), true);
  assert.deepEqual(reloaded.removed, ['apple', 'nasa']);
});

test('shows an empty removed list and handles the final restoration without forcing a trend', async () => {
  const app = setup(async () => ({ ok: false, status: 405 }));
  await app.run('removedTrendsReady');
  app.nodes.get('removed-trends-button').click();
  assert.match(app.nodes.get('removed-trends-status').textContent, /No removed trends/);
  app.run("removeTrend('rare keyword')");
  app.run("restoreTrend('rare keyword')");
  assert.equal(app.nodes.get('removed-trends-list').children.length, 0);
  assert.match(app.nodes.get('removed-trends-status').textContent, /No removed trends/);
  assert.equal(app.nodes.get('trend-list').children.length, 0);
});

test('restoration made before the shared list loads is not undone by synchronization', async () => {
  let resolveDatabase;
  const app = setup(async () => ({ ok: true }), new Map([['signal.removedTrends', '["nasa"]']]), {
    supabaseFetch: (url, options) => options.method === 'GET'
      ? new Promise((resolve) => { resolveDatabase = resolve; })
      : Promise.resolve({ ok: true }),
  });
  app.run("restoreTrend('nasa')");
  resolveDatabase({ ok: true, json: async () => [{ term: 'nasa' }, { term: 'apple' }] });
  await app.run('removedTrendsReady');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.run("JSON.stringify(removedTrends)"), '["apple"]');
  assert.equal(app.nodes.get('removed-trends-list').children[0].children[0].textContent, 'apple');
});

test('shared removals and restorations are written to Supabase', async () => {
  const storage = new Map();
  const app = setup(async () => ({ ok: true }), storage, { removed: ['nasa'] });
  await app.run('removedTrendsReady');
  app.run("removeTrend('amazon')");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(app.removed, ['nasa', 'amazon']);
  assert.equal(app.supabaseRequests.at(-1).method, 'POST');
  assert.deepEqual(JSON.parse(app.supabaseRequests.at(-1).body), { term: 'amazon' });

  app.run("restoreTrend('nasa')");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(app.supabaseRequests.map(({ method }) => method || 'GET'), ['GET', 'POST', 'DELETE']);
  assert.deepEqual(app.removed, ['amazon']);
  assert.deepEqual(JSON.parse(storage.get('signal.removedTrends')), ['amazon']);
});

test('database read failures remain visible while opening the removed trends dialog', async () => {
  const app = setup(async () => ({ ok: true }), new Map(), {
    supabaseFetch: async () => ({ ok: false, status: 404 }),
  });
  await app.run('removedTrendsReady');
  app.nodes.get('removed-trends-button').click();
  assert.equal(app.nodes.get('removed-trends-error').hidden, false);
  assert.match(app.nodes.get('removed-trends-error').textContent, /Supabase returned 404/);
});

test('database write failures are reported instead of silently treated as shared', async () => {
  for (const failure of [503, 'Network unavailable']) {
    const app = setup(async () => ({ ok: true }), new Map(), {
      supabaseFetch: async (url, options) => {
        if (options.method === 'GET') return { ok: true, json: async () => [{ term: 'nasa' }] };
        if (typeof failure === 'string') throw new Error(failure);
        return { ok: false, status: failure };
      },
    });
    await app.run('removedTrendsReady');
    app.run("restoreTrend('nasa')");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(app.nodes.get('error-message').hidden, false);
    assert.match(app.nodes.get('error-message').textContent, /Could not save the shared removed trends list/);
  }
});

function rank(headlines, removed = []) {
  const app = setup(async () => ({ ok: false }));
  return JSON.parse(app.run(`JSON.stringify(SignalTrends.compute(
    ${JSON.stringify(headlines.map((header_title) => ({ header_title })))},
    ${JSON.stringify(removed)}
  ))`));
}

test('returns exactly the 20 most frequent eligible terms in descending order', () => {
  const headlines = [];
  for (let i = 0; i < 25; i += 1) {
    for (let count = 0; count < i + 2; count += 1) {
      headlines.push(`Reports on Entity${i} - Publisher`);
    }
  }
  const trends = rank(headlines);
  assert.equal(trends.length, 20);
  assert.deepEqual(trends, Array.from({ length: 20 }, (_, i) => ({
    term: `entity${24 - i}`, count: 26 - i,
  })));
  const removed = rank(headlines, ['Entity24']);
  assert.equal(removed.length, 20);
  assert.deepEqual(removed[0], { term: 'entity23', count: 25 });
  assert.deepEqual(removed[19], { term: 'entity4', count: 6 });
});

test('counts a name once per headline and excludes common single words and publishers', () => {
  assert.deepEqual(rank([
    'Apple says Apple profits rise - Reuters',
    'Investors watch Apple as profits fall - Reuters',
    'NASA sends probes - Reuters',
    'Updates from NASA arrive - Reuters',
    'Markets rise today - Reuters',
    'Markets fall tomorrow - Reuters',
  ]), [{ term: 'apple', count: 2 }, { term: 'nasa', count: 2 }]);
});

test('preserves full names and longer topic phrases, normalizing case and possessives', () => {
  assert.deepEqual(rank([
    'New York City reviews climate change policy - Reuters',
    'In New York City, climate change policy advances - AP',
    'Officials discuss New York City’s future - BBC',
    'Scientists review climate change policy - CNN',
  ]), [
    { term: 'climate change policy', count: 3 },
    { term: 'new york city', count: 3 },
  ]);
});

test('supports Unicode names and acronyms and does not join across punctuation', () => {
  const headlines = [
    'The U.S. meets São Paulo officials; rate, cut discussed - Reuters',
    'Updates from U.S. reach São Paulo residents; rate. Cut expected - AP',
  ];
  assert.deepEqual(rank(headlines), [
    { term: 'são paulo', count: 2 }, { term: 'u.s', count: 2 },
  ]);
  const app = setup(async () => ({ ok: false }));
  assert.equal(app.run(`SignalTrends.matches({header_title: ${JSON.stringify(headlines[0])}}, 'rate cut')`), false);
  assert.equal(app.run("SignalTrends.matches({header_title: 'New York City’s outlook - AP'}, 'new york city')"), true);
  assert.deepEqual(rank([]), []);
  assert.deepEqual(rank(['A unique headline']), []);
});

test('renders ranked headline counts and uses the same extractor in the Flask UI', async () => {
  const data = { ...snapshot, news: [
    { ...snapshot.news[0], header_title: 'NASA launches today' },
    { ...snapshot.news[0], header_title: 'Reports from NASA arrive' },
  ] };
  const app = setup(async () => ({ ok: true, json: async () => data }));
  await app.run('fetchGoogleNews()');
  const row = app.nodes.get('trend-list').children[0];
  assert.equal(row.children[0].textContent, '01');
  assert.equal(row.children[1].textContent, 'nasa');
  assert.equal(row.children[2].textContent, '2');

  const nodes = new Map();
  const node = () => ({
    dataset: {}, append() {}, addEventListener() {},
    replaceChildren(...children) { this.children = children; },
  });
  const context = vm.createContext({
    document: {
      querySelector(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); },
      createElement: node,
    },
    fetch: async () => ({ ok: true, json: async () => ({ status: 'idle', news: [] }) }),
    window: { setTimeout() {} },
  });
  vm.runInContext(trendsScript, context);
  vm.runInContext(readFileSync(new URL('./static/app.js', import.meta.url), 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  vm.runInContext(`renderState(${JSON.stringify({ status: 'complete', news: data.news })})`, context);
  assert.equal(nodes.get('#trends').hidden, false);
  assert.equal(nodes.get('#trend-list').children[0].textContent, 'nasa (2 headlines)');
});
