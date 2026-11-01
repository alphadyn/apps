// Pure helpers for the security history view: ranges, slicing, and chart scales (no DOM access).

export const RANGES = [
  { key: '1w', label: '1W', name: '1 week' },
  { key: '1m', label: '1M', name: '1 month' },
  { key: '3m', label: '3M', name: '3 months' },
  { key: 'ytd', label: 'YTD', name: 'Year to date' },
  { key: '1y', label: '1Y', name: '1 year' },
  { key: '2y', label: '2Y', name: '2 years' },
  { key: '5y', label: '5Y', name: '5 years' },
  { key: '10y', label: '10Y', name: '10 years' },
  { key: 'all', label: 'All', name: 'All time' },
];
export const RANGE_KEYS = RANGES.map((range) => range.key);
export const DEFAULT_RANGE = '1y';

const DAY_MS = 86_400_000;
const MONTHS = { '1m': 1, '3m': 3, '1y': 12, '2y': 24, '5y': 60, '10y': 120 };

export function dayToDate(day) {
  return new Date(day * DAY_MS);
}

/** Calendar month shift in UTC days, clamping to month end (Mar 31 − 1M = Feb 28). */
export function shiftMonths(day, months) {
  const date = dayToDate(day);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)) / DAY_MS;
}

export function rangeStartDay(lastDay, key, firstDay) {
  if (key === '1w') return lastDay - 7;
  if (key === 'ytd') return Date.UTC(dayToDate(lastDay).getUTCFullYear() - 1, 11, 31) / DAY_MS;
  if (key === 'all') return firstDay;
  return shiftMonths(lastDay, -MONTHS[key]);
}

/** Validate a history payload ({ d: [days], c: [closes] }) into sorted points. */
export function parseHistory(payload) {
  const days = Array.isArray(payload?.d) ? payload.d : [];
  const closes = Array.isArray(payload?.c) ? payload.c : [];
  const points = [];
  for (let index = 0; index < Math.min(days.length, closes.length); index += 1) {
    const day = days[index];
    const close = closes[index];
    if (Number.isInteger(day) && Number.isFinite(close) && close > 0) points.push({ day, close });
  }
  return points.sort((a, b) => a.day - b.day);
}

/** Index of the last point on or before day, or -1. */
export function indexOnOrBefore(points, day) {
  let low = 0;
  let high = points.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (points[middle].day <= day) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/** Index of the point nearest to day. */
export function nearestIndex(points, day) {
  const before = indexOnOrBefore(points, day);
  if (before < 0) return 0;
  if (before === points.length - 1) return before;
  return day - points[before].day <= points[before + 1].day - day ? before : before + 1;
}

/**
 * Slice a range. The first point is the base: the last close on or before the range start
 * (so 1Y matches "price vs. one year ago"). `partial` marks histories shorter than the range.
 */
export function sliceRange(points, key) {
  if (!points.length) return null;
  const last = points.at(-1);
  const startDay = rangeStartDay(last.day, key, points[0].day);
  let baseIndex = indexOnOrBefore(points, startDay);
  const partial = baseIndex < 0;
  if (partial) baseIndex = 0;
  const slice = points.slice(baseIndex);
  let high = slice[0];
  let low = slice[0];
  for (const point of slice) {
    if (point.close > high.close) high = point;
    if (point.close < low.close) low = point;
  }
  const base = slice[0];
  return {
    key, points: slice, base, last, high, low, partial, startDay,
    change: last.close / base.close - 1,
    changeAmount: last.close - base.close,
  };
}

export function rangeSummaries(points) {
  return RANGES.map(({ key }) => {
    const slice = sliceRange(points, key);
    return { key, change: slice ? slice.change : null, partial: slice ? slice.partial : true };
  });
}

/** "Nice" evenly spaced ticks covering [min, max]. */
export function niceTicks(min, max, count = 5) {
  if (!(Number.isFinite(min) && Number.isFinite(max))) return [];
  if (min === max) return [min];
  const rough = (max - min) / Math.max(1, count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough);
  const ticks = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}

/** Ticks at 1-2-5 multiples of powers of ten for log scales, falling back to linear ticks. */
export function logTicks(min, max, count = 6) {
  if (!(min > 0 && max > 0)) return [];
  const ticks = [];
  for (let power = Math.floor(Math.log10(min)); power <= Math.ceil(Math.log10(max)); power += 1) {
    for (const factor of [1, 2, 5]) {
      const value = Number((factor * 10 ** power).toPrecision(12));
      if (value >= min && value <= max) ticks.push(value);
    }
  }
  if (ticks.length < 3) return niceTicks(min, max, 5);
  if (ticks.length <= count) return ticks;
  const powersOnly = ticks.filter((value) => Number(value.toExponential().split('e')[0]) === 1);
  return powersOnly.length >= 3 ? powersOnly : ticks.filter((_, index) => index % Math.ceil(ticks.length / count) === 0);
}

/** Date label suited to the visible span. */
export function formatAxisDate(day, spanDays) {
  const date = dayToDate(day);
  if (spanDays <= 120) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (spanDays <= 3 * 366) return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', " '");
  return String(date.getUTCFullYear());
}

export function formatLongDate(day) {
  return dayToDate(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function historyFileFor(symbol) {
  return `${symbol.toUpperCase().replace(/[./]/g, '-')}.json`;
}
