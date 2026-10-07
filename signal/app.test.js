import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
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

function setup(fetch) {
  const nodes = new Map();
  const node = () => ({
    dataset: {}, value: '', hidden: false, disabled: false, textContent: '',
    append() {}, replaceChildren(...children) { this.children = children; },
    addEventListener() {}, click() {}, remove() {},
  });
  const getNode = (id) => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  };
  let downloaded;
  const context = vm.createContext({
    document: {
      getElementById: getNode, querySelector: getNode,
      createElement: node, body: node(),
    },
    fetch, Date, Blob, URL: {
      createObjectURL(blob) { downloaded = blob; return 'blob:download'; },
      revokeObjectURL() {},
    },
  });
  vm.runInContext(script, context);
  return { nodes, run: (code) => vm.runInContext(code, context), download: () => downloaded };
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
