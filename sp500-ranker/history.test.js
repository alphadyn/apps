import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RANGES, formatAxisDate, historyFileFor, indexOnOrBefore, logTicks, nearestIndex, niceTicks, parseHistory,
  rangeStartDay, rangeSummaries, shiftMonths, sliceRange,
} from './history.js';

const day = (iso) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const iso = (value) => new Date(value * 86_400_000).toISOString().slice(0, 10);
const points = (entries) => entries.map(([date, close]) => ({ day: day(date), close }));

test('calendar shifts clamp to month end', () => {
  assert.equal(iso(shiftMonths(day('2026-03-31'), -1)), '2026-02-28');
  assert.equal(iso(shiftMonths(day('2024-02-29'), -12)), '2023-02-28');
  assert.equal(iso(shiftMonths(day('2026-01-15'), -3)), '2025-10-15');
});

test('range starts', () => {
  const last = day('2026-10-09');
  const expected = {
    '1w': '2026-10-02', '1m': '2026-09-09', '3m': '2026-07-09', ytd: '2025-12-31', '1y': '2025-10-09',
    '2y': '2024-10-09', '5y': '2021-10-09', '10y': '2016-10-09', all: '1990-01-01',
  };
  for (const { key } of RANGES) assert.equal(iso(rangeStartDay(last, key, day('1990-01-01'))), expected[key], key);
});

test('parseHistory drops invalid entries and sorts', () => {
  assert.deepEqual(parseHistory({ d: [3, 1, 2, 4], c: [30, 10, -1, null] }), [{ day: 1, close: 10 }, { day: 3, close: 30 }]);
  assert.deepEqual(parseHistory(null), []);
});

test('index searches', () => {
  const series = points([['2026-01-01', 1], ['2026-01-05', 2], ['2026-01-10', 3]]);
  assert.equal(indexOnOrBefore(series, day('2025-12-31')), -1);
  assert.equal(indexOnOrBefore(series, day('2026-01-07')), 1);
  assert.equal(nearestIndex(series, day('2026-01-08')), 2);
  assert.equal(nearestIndex(series, day('2026-01-02')), 0);
  assert.equal(nearestIndex(series, day('2027-01-01')), 2);
});

const history = points([
  ['2017-06-02', 10], ['2025-10-08', 50], ['2025-12-31', 60], ['2026-01-02', 61],
  ['2026-07-09', 80], ['2026-10-01', 95], ['2026-10-02', 96], ['2026-10-09', 100],
]);

test('sliceRange uses the close on or before the start as base', () => {
  const year = sliceRange(history, '1y');
  assert.equal(iso(year.base.day), '2025-10-08');
  assert.equal(year.change, 1);
  assert.equal(year.changeAmount, 50);
  assert.equal(year.partial, false);
  assert.equal(year.points.length, 7);
  assert.deepEqual([year.high.close, year.low.close], [100, 50]);

  assert.equal(sliceRange(history, 'ytd').base.close, 60);
  assert.equal(sliceRange(history, '3m').change, 0.25);
  assert.equal(sliceRange(history, '1w').base.close, 96);
  assert.equal(sliceRange(history, 'all').change, 9);
  assert.equal(sliceRange([], '1y'), null);
});

test('ranges longer than the history are marked partial', () => {
  const slice = sliceRange(history, '10y');
  assert.equal(slice.partial, true);
  assert.equal(slice.base.close, 10);
  assert.equal(sliceRange(history, 'all').partial, false);
  const summaries = rangeSummaries(history);
  assert.deepEqual(summaries.map(({ key }) => key), RANGES.map(({ key }) => key));
  assert.equal(summaries.find(({ key }) => key === '5y').change, 9);
});

test('ticks', () => {
  assert.deepEqual(niceTicks(0, 100, 5), [0, 25, 50, 75, 100]);
  assert.deepEqual(niceTicks(12, 47, 5), [20, 30, 40]);
  assert.deepEqual(niceTicks(5, 5), [5]);
  assert.deepEqual(logTicks(0.1, 400), [0.1, 1, 10, 100]);
  assert.deepEqual(logTicks(15, 60), niceTicks(15, 60, 5));
});

test('labels and file names', () => {
  assert.equal(formatAxisDate(day('2026-10-02'), 30), 'Oct 2');
  assert.equal(formatAxisDate(day('2026-10-02'), 400), "Oct '26");
  assert.equal(formatAxisDate(day('2026-10-02'), 4000), '2026');
  assert.equal(historyFileFor('BRK.B'), 'BRK-B.json');
});
