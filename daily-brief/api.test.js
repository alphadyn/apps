import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDigest, parseRss, resolveGoogleNewsUrl } from '../api/daily-brief.js';
import { runChecks } from '../scripts/test-checks.js';

const checks = [];
const check = (name, action) => checks.push([name, action]);

check('parseRss decodes headlines and keeps source attribution and safe links', () => {
  const xml = `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title><![CDATA[Markets &amp; investors react to "new plan"]]></title>
        <link>https://news.google.com/articles/story-1</link>
        <source url="https://www.reuters.com/">Reuters</source>
        <pubDate>Mon, 09 Nov 2026 10:00:00 GMT</pubDate>
      </item>
      <item><title>Unsafe item</title><link>javascript:alert(1)</link></item>
    </channel></rss>`;

  assert.deepEqual(parseRss(xml, 'Google News'), [{
    title: 'Markets & investors react to "new plan"',
    url: 'https://news.google.com/articles/story-1',
    source: 'Reuters',
    sourceUrl: 'https://www.reuters.com/',
    publishedAt: '2026-11-09T10:00:00.000Z',
  }]);

  const stories = parseRss(
    '<rss><channel><item><title>Simple headline</title><link>https://example.com/story</link></item></channel></rss>',
    'CNN',
  );
  assert.equal(stories[0].source, 'CNN');
  assert.equal(stories[0].publishedAt, null);
});

check('buildDigest groups related headlines and never exceeds five paragraphs', () => {
  const stories = [
    { title: 'Central bank cuts interest rates as inflation cools', source: 'Reuters' },
    { title: 'Inflation cools as central bank cuts rates', source: 'BBC' },
    { title: 'Champions League final ends in dramatic victory', source: 'CNN' },
    { title: 'Central bank signals more rate cuts as inflation eases', source: 'CNBC' },
    { title: 'New climate agreement reached at global summit', source: 'Google News' },
    { title: 'Tech company announces major product launch', source: 'Bloomberg' },
    { title: 'Storm disrupts travel across northern region', source: 'BBC' },
  ];

  const digest = buildDigest(stories, 99);
  assert.equal(digest.length, 5);
  assert.equal(digest[0].sourceCount, 3);
  assert.equal(digest[0].supporting.length, 2);
  assert.equal(buildDigest(stories, 2).length, 2);
});

check('resolveGoogleNewsUrl replaces an RSS wrapper URL with its publisher article', async () => {
  const id = 'CBMiW0FVX3lxTE1FNVg3ME1zb05FTlVhMmw5SXQ4eGlxRF9hYUo3bGhVNlMyTjEyeFBMT29tMDM1WjY4QUxONVVjSkp4VFVlZFZrNkNxU0ZDR0c1LWU3cmE1c0lDeTQ';
  const calls = [];
  const fetchRequest = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) {
      return {
        ok: true,
        url: String(url),
        text: async () => `<div data-n-a-id="${id}" data-n-a-ts="1795026330" data-n-a-sg="signature">`,
      };
    }
    return {
      ok: true,
      text: async () => JSON.stringify([[
        'wrb.fr',
        'Fbv4je',
        JSON.stringify(['garturlres', 'https://publisher.example/article']),
      ]]),
    };
  };

  const resolved = await resolveGoogleNewsUrl(
    `https://news.google.com/rss/articles/${id}?oc=5`,
    fetchRequest,
  );

  assert.equal(resolved, 'https://publisher.example/article');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, 'POST');
  assert.match(calls[1].options.body.toString(), /garturlreq/);
});

check('resolveGoogleNewsUrl rejects invalid links and follows direct redirects', async () => {
  let fetched = false;
  await assert.rejects(
    resolveGoogleNewsUrl('https://publisher.example/article', async () => {
      fetched = true;
    }),
    /Expected an HTTPS Google News article URL/,
  );
  assert.equal(fetched, false);

  let requests = 0;
  const resolved = await resolveGoogleNewsUrl(
    'https://news.google.com/rss/articles/CBMiW0FVX3lxTE1FNVg3ME1zb05FTlVhMmw5SXQ4eGlxRF9hYUo3bGhVNlMyTjEyeFBMT29tMDM1WjY4QUxONVVjSkp4VFVlZFZrNkNxU0ZDR0c1LWU3cmE1c0lDeTQ',
    async () => {
      requests += 1;
      return {
        status: 302,
        headers: new Headers({ location: 'https://publisher.example/article' }),
        ok: false,
      };
    },
  );
  assert.equal(resolved, 'https://publisher.example/article');
  assert.equal(requests, 1);
});

test('RSS parsing and digest generation', () => runChecks(checks.slice(0, 2)));
test('Google News link resolution', () => runChecks(checks.slice(2)));
