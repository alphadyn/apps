import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDigest, parseRss } from '../api/daily-brief.js';

test('parseRss decodes headlines and keeps source attribution and safe links', () => {
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
});

test('buildDigest groups related headlines and never exceeds five paragraphs', () => {
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

test('parseRss handles missing dates and falls back to the feed name', () => {
  const stories = parseRss(
    '<rss><channel><item><title>Simple headline</title><link>https://example.com/story</link></item></channel></rss>',
    'CNN',
  );

  assert.equal(stories[0].source, 'CNN');
  assert.equal(stories[0].publishedAt, null);
});
