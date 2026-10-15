import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  archiveLicenseName,
  buildArchiveMetadataUrl,
  buildArchiveSearchUrl,
  parseArchiveSearch,
  selectArchiveAudioFile
} from './audio-search.js';

test('builds a free, scoped audio search URL', () => {
  const url = new URL(buildArchiveSearchUrl(' Radiohead  In Rainbows '));
  assert.equal(url.origin, 'https://archive.org');
  assert.equal(url.pathname, '/advancedsearch.php');
  assert.equal(
    url.searchParams.get('q'),
    'mediatype:audio AND licenseurl:*creativecommons.org* AND (title:(Radiohead In Rainbows) OR creator:(Radiohead In Rainbows))'
  );
  assert.equal(url.searchParams.get('rows'), '20');
  assert.equal(url.searchParams.get('output'), 'json');
  assert.deepEqual(url.searchParams.getAll('fl[]'), ['identifier', 'title', 'creator', 'description', 'licenseurl']);
});

test('validates and parses licensed audio search results', () => {
  const results = parseArchiveSearch({
    response: {
      docs: [
        {
          identifier: 'example-audio',
          title: 'Song Title',
          creator: 'A. Musician',
          licenseurl: 'https://creativecommons.org/licenses/by/4.0/'
        },
        {
          identifier: 'unlicensed',
          title: 'Not licensed',
          licenseurl: 'https://example.com/license'
        },
        {
          identifier: '../unsafe',
          title: 'Unsafe identifier',
          licenseurl: 'https://creativecommons.org/publicdomain/mark/1.0/'
        }
      ]
    }
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].identifier, 'example-audio');
  assert.equal(results[0].creator, 'A. Musician');
  assert.equal(results[0].licenseName, 'CC BY 4.0');
  assert.equal(results[0].pageUrl, 'https://archive.org/details/example-audio');
  assert.match(results[0].description, /Creator: A\. Musician · License: CC BY 4\.0/);
});

test('accepts Creative Commons and public-domain license labels', () => {
  assert.equal(archiveLicenseName('http://creativecommons.org/licenses/by-nc-sa/3.0/'), 'CC BY-NC-SA 3.0');
  assert.equal(archiveLicenseName('https://creativecommons.org/publicdomain/mark/1.0/'), 'Public Domain Mark 1.0');
  assert.equal(archiveLicenseName('https://creativecommons.org/publicdomain/zero/1.0/'), 'Public Domain CC0 1.0');
  assert.equal(archiveLicenseName('https://example.com/'), '');
});

test('selects a downloadable audio file only from a verified licensed item', () => {
  const audio = selectArchiveAudioFile({
    metadata: {
      identifier: 'licensed-song',
      licenseurl: 'https://creativecommons.org/licenses/by/4.0/'
    },
    files: [
      { name: 'song.wav', size: '500', format: 'WAVE' },
      { name: 'song.mp3', size: '900', format: 'VBR MP3' },
      { name: 'private.mp3', size: '100', private: 'true' },
      { name: 'metadata.mp3', size: '100', source: 'metadata' },
      { name: 'cover.jpg', size: '100', format: 'JPEG' }
    ]
  });
  assert.deepEqual(audio, {
    url: 'https://archive.org/download/licensed-song/song.mp3',
    fileName: 'song.mp3',
    type: 'audio/mpeg'
  });
  assert.throws(() => selectArchiveAudioFile({
    metadata: { identifier: 'copyrighted', licenseurl: 'https://example.com/license' },
    files: [{ name: 'song.mp3', size: '900' }]
  }), /no verified Creative Commons or public-domain license/);
});

test('rejects malformed archive queries and item identifiers', () => {
  assert.throws(() => buildArchiveSearchUrl(' '), /between 2 and 200 characters/);
  assert.throws(() => buildArchiveSearchUrl('a'.repeat(201)), /between 2 and 200 characters/);
  assert.throws(() => buildArchiveMetadataUrl('../other'), /Invalid Internet Archive item/);
  assert.equal(
    buildArchiveMetadataUrl('licensed-song'),
    'https://archive.org/metadata/licensed-song?output=json'
  );
});
