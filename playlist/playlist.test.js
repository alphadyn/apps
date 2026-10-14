import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLibrary,
  createTrack,
  dataUrlToBytes,
  fileNameFromUrl,
  formatBytes,
  formatDuration,
  guessMediaKind,
  guessMimeType,
  isLikelyMedia,
  moveItem,
  nextTrackId,
  normalizeUrl,
  parseLibrary,
  previousTrackId,
  reconcileShuffle,
  shuffleIds,
  streamingServiceMessage,
  streamingServiceName,
  titleFromFileName
} from './playlist.js';

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const tracks = (...ids) => ids.map((id) => ({ id }));

test('moveItem reorders and clamps', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 99), ['a', 'c', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 5, 0), ['a', 'b']);
});

test('shuffleIds keeps every id once and puts the first id at the front', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const order = shuffleIds(ids, 'd', seeded(7));
  assert.equal(order[0], 'd');
  assert.deepEqual([...order].sort(), ids);
  assert.deepEqual([...shuffleIds(ids, null, seeded(3))].sort(), ids);
});

test('reconcileShuffle drops removed ids and inserts new ones after the current track', () => {
  const order = ['c', 'a', 'b', 'd'];
  const result = reconcileShuffle(order, ['a', 'b', 'c', 'e'], 'a', seeded(9));
  assert.deepEqual([...result].sort(), ['a', 'b', 'c', 'e']);
  assert.ok(result.indexOf('e') > result.indexOf('a'));
  assert.deepEqual(result.filter((id) => id !== 'e'), ['c', 'a', 'b']);
});

test('nextTrackId handles sequential order and repeat modes', () => {
  const base = { tracks: tracks('a', 'b', 'c'), mode: 'sequential', repeat: 'off', shuffleOrder: [] };
  assert.equal(nextTrackId({ ...base, currentId: null }), 'a');
  assert.equal(nextTrackId({ ...base, currentId: 'a' }), 'b');
  assert.equal(nextTrackId({ ...base, currentId: 'c' }, { auto: true }), null);
  assert.equal(nextTrackId({ ...base, currentId: 'c', repeat: 'all' }, { auto: true }), 'a');
  assert.equal(nextTrackId({ ...base, currentId: 'b', repeat: 'one' }, { auto: true }), 'b');
  assert.equal(nextTrackId({ ...base, currentId: 'b', repeat: 'one' }), 'c');
  assert.equal(nextTrackId({ ...base, tracks: [], currentId: null }), null);
});

test('nextTrackId and previousTrackId follow the shuffle order', () => {
  const state = { tracks: tracks('a', 'b', 'c'), mode: 'shuffle', repeat: 'off', shuffleOrder: ['c', 'a', 'b'], currentId: 'c' };
  assert.equal(nextTrackId(state), 'a');
  assert.equal(nextTrackId({ ...state, currentId: 'b' }, { auto: true }), null);
  assert.equal(previousTrackId({ ...state, currentId: 'a' }), 'c');
  assert.equal(previousTrackId(state), 'c');
  assert.equal(previousTrackId({ ...state, repeat: 'all' }), 'b');
});

test('playback falls back to list order when the shuffle order is stale', () => {
  const state = { tracks: tracks('a', 'b', 'c'), mode: 'shuffle', repeat: 'off', shuffleOrder: ['b', 'a'], currentId: 'a' };
  assert.equal(nextTrackId(state), 'b');
});

test('media detection and naming helpers', () => {
  assert.ok(isLikelyMedia('song.mp3', ''));
  assert.ok(isLikelyMedia('x', 'audio/mpeg'));
  assert.ok(isLikelyMedia('track.m4a', 'application/octet-stream'));
  assert.ok(!isLikelyMedia('page', 'text/html; charset=utf-8'));
  assert.ok(!isLikelyMedia('photo.jpg', 'image/jpeg'));
  assert.ok(isLikelyMedia('clip.mp4', ''));
  assert.ok(isLikelyMedia('clip.mov', 'application/octet-stream'));
  assert.ok(isLikelyMedia('x', 'video/webm'));
  assert.equal(titleFromFileName('My_Song-Final.mp3'), 'My Song-Final');
  assert.equal(fileNameFromUrl('https://cdn.example.com/a/b/Hello%20World.mp3?x=1'), 'Hello World.mp3');
  assert.equal(fileNameFromUrl('https://example.com/stream', 'audio/mpeg'), 'stream.mp3');
  assert.equal(fileNameFromUrl('https://example.com/dl', '', 'attachment; filename="Track 01.flac"'), 'Track 01.flac');
});

test('normalizeUrl adds https and rejects non-http schemes', () => {
  assert.equal(normalizeUrl('example.com/a.mp3'), 'https://example.com/a.mp3');
  assert.equal(normalizeUrl(' http://x.org/s.ogg '), 'http://x.org/s.ogg');
  assert.throws(() => normalizeUrl(''), /Enter a URL/);
  assert.throws(() => normalizeUrl('ftp://x.org/a.mp3'), /http/);
  assert.throws(() => normalizeUrl('javascript:alert(1)'));
});

test('formatters', () => {
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(NaN), '--:--');
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
});

test('library JSON round-trips track details, settings and embedded audio', () => {
  const a = createTrack({ id: 'a', fileName: 'one.mp3', type: 'audio/mpeg', size: 3, duration: 12.5 });
  const b = createTrack({ id: 'b', fileName: 'two.ogg', source: 'url', sourceUrl: 'https://x.org/two.ogg' });
  const state = { tracks: [a, b], mode: 'shuffle', repeat: 'all', currentId: 'b' };
  const json = JSON.stringify(buildLibrary(state, { a: 'data:audio/mpeg;base64,AQID' }));
  const parsed = parseLibrary(json);
  assert.equal(parsed.tracks.length, 2);
  assert.deepEqual(parsed.settings, { mode: 'shuffle', repeat: 'all', currentId: 'b' });
  assert.equal(parsed.tracks[0].track.title, 'one');
  assert.equal(parsed.tracks[0].track.duration, 12.5);
  assert.equal(parsed.tracks[0].data, 'data:audio/mpeg;base64,AQID');
  assert.equal(parsed.tracks[1].data, null);
  assert.equal(parsed.tracks[1].track.sourceUrl, 'https://x.org/two.ogg');
  assert.deepEqual([...dataUrlToBytes(parsed.tracks[0].data).bytes], [1, 2, 3]);
});

test('parseLibrary validates input and skips unusable entries', () => {
  assert.throws(() => parseLibrary('{nope'), /not valid JSON/);
  assert.throws(() => parseLibrary('{"foo": 1}'), /tracks/);
  assert.throws(() => parseLibrary('{"format": "other", "tracks": []}'), /Unsupported/);
  const parsed = parseLibrary(JSON.stringify({
    tracks: [
      { id: 'x', title: 'No audio' },
      { id: 'y', url: 'example.com/song.mp3' },
      { id: 'y', sourceUrl: 'https://example.com/dupe.mp3' },
      { sourceUrl: 'javascript:alert(1)' },
      null
    ],
    settings: { mode: 'bogus', repeat: 'one' }
  }));
  assert.equal(parsed.tracks.length, 2);
  assert.equal(parsed.skipped, 3);
  assert.equal(parsed.tracks[0].track.sourceUrl, 'https://example.com/song.mp3');
  assert.equal(parsed.tracks[0].track.source, 'url');
  assert.notEqual(parsed.tracks[1].track.id, 'y');
  assert.deepEqual(parsed.settings, { mode: 'sequential', repeat: 'one', currentId: null });
});

test('streaming service links are recognised', () => {
  assert.equal(streamingServiceName('https://www.youtube.com/watch?v=756YdTT-WJ0'), 'YouTube');
  assert.equal(streamingServiceName('https://m.youtube.com/watch?v=x'), 'YouTube');
  assert.equal(streamingServiceName('https://youtu.be/756YdTT-WJ0'), 'YouTube');
  assert.equal(streamingServiceName('https://open.spotify.com/track/abc'), 'Spotify');
  assert.equal(streamingServiceName('https://artist.bandcamp.com/track/x'), 'Bandcamp');
  assert.equal(streamingServiceName('https://notyoutube.com/a.mp3'), null);
  assert.equal(streamingServiceName('https://cdn.example.com/song.mp3'), null);
  assert.equal(streamingServiceName('not a url'), null);
  assert.match(streamingServiceMessage('YouTube'), /YouTube links are web pages/);
  const parsed = parseLibrary({ tracks: [{ sourceUrl: 'https://youtu.be/abc' }, { sourceUrl: 'https://x.org/a.mp3' }] });
  assert.equal(parsed.tracks.length, 1);
  assert.equal(parsed.skipped, 1);
});

test('a bare array of tracks is accepted', () => {
  const parsed = parseLibrary([{ sourceUrl: 'https://example.com/a.wav', title: 'A' }]);
  assert.equal(parsed.tracks[0].track.title, 'A');
  assert.equal(parsed.tracks[0].track.type, 'audio/wav');
});

test('video files are recognised and keep their kind through JSON', () => {
  assert.equal(guessMimeType('clip.mp4'), 'video/mp4');
  assert.equal(guessMimeType('clip.mov'), 'video/quicktime');
  assert.equal(guessMimeType('song.m4a'), 'audio/mp4');
  assert.equal(guessMediaKind('clip.mp4'), 'video');
  assert.equal(guessMediaKind('song.mp3'), 'audio');
  assert.equal(guessMediaKind('stream', 'video/webm'), 'video');
  assert.equal(guessMediaKind('stream', 'audio/webm'), 'audio');
  assert.equal(createTrack({ fileName: 'a.mkv' }).kind, 'video');
  assert.equal(createTrack({ fileName: 'a.mp4', kind: 'audio' }).kind, 'audio');
  const v = createTrack({ id: 'v', fileName: 'clip.mp4', type: 'video/mp4', kind: 'video' });
  const a = createTrack({ id: 'a', fileName: 'voice.mp4', type: 'video/mp4', kind: 'audio' });
  const parsed = parseLibrary(JSON.stringify(buildLibrary({ tracks: [v, a], mode: 'sequential', repeat: 'off', currentId: null }, { v: 'data:video/mp4;base64,AQ==', a: 'data:video/mp4;base64,AQ==' })));
  assert.deepEqual(parsed.tracks.map((entry) => entry.track.kind), ['video', 'audio']);
  assert.equal(parseLibrary({ tracks: [{ sourceUrl: 'https://x.org/clip.webm' }] }).tracks[0].track.kind, 'video');
});
