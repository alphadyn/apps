// Pure ranking, state, and formatting helpers for the S&P 500 Ranker (no DOM access).
import { DEFAULT_RANGE, RANGE_KEYS } from './history.js';

export const CRITERIA = [
  { key: 'market_cap', label: 'Market cap', format: 'money' },
  { key: 'market_cap_change_1y', label: 'Market cap growth (YoY)', format: 'percent' },
  { key: 'net_income', label: 'Net income (TTM)', format: 'money' },
  { key: 'net_income_change_1y', label: 'Net income growth (YoY)', format: 'percent' },
  { key: 'price', label: 'Price', format: 'price' },
  { key: 'price_change_1y', label: 'Price growth (1Y)', format: 'percent' },
  { key: 'price_change_3m', label: 'Price growth (3M)', format: 'percent' },
];

export const METHODS = ['priority', 'average'];
const CRITERION_KEYS = new Set(CRITERIA.map((criterion) => criterion.key));

export function criterionFor(key) {
  return CRITERIA.find((criterion) => criterion.key === key);
}

/** Table column order: selected criteria first in sort order, then the rest in default order. */
export function columnOrder(sorts) {
  const selected = sorts.map(({ key }) => criterionFor(key)).filter(Boolean);
  const selectedKeys = new Set(selected.map(({ key }) => key));
  return [...selected, ...CRITERIA.filter(({ key }) => !selectedKeys.has(key))];
}

function valueOf(row, key) {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Missing values always sort last, regardless of direction.
export function compareValues(a, b, direction) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function compareSymbols(a, b) {
  return a.symbol.localeCompare(b.symbol);
}

function priorityComparator(sorts) {
  return (a, b) => {
    for (const { key, direction } of sorts) {
      const result = compareValues(valueOf(a, key), valueOf(b, key), direction);
      if (result !== 0) return result;
    }
    return compareSymbols(a, b);
  };
}

/** Competition ranks (1, 2, 2, 4) for one criterion; missing values share the last rank. */
export function criterionRanks(rows, { key, direction }) {
  const ordered = rows
    .map((row, index) => ({ index, value: valueOf(row, key) }))
    .sort((a, b) => compareValues(a.value, b.value, direction));
  const ranks = new Array(rows.length);
  ordered.forEach((entry, position) => {
    const previous = ordered[position - 1];
    if (entry.value === null) ranks[entry.index] = rows.length;
    else if (previous && previous.value === entry.value) ranks[entry.index] = ranks[previous.index];
    else ranks[entry.index] = position + 1;
  });
  return ranks;
}

/**
 * Rank securities by the user's criteria.
 * - priority: sort by the first criterion, breaking ties with each following criterion.
 * - average: order by the mean of each criterion's rank (lower is better); ties fall back to priority order.
 * With no criteria the securities are listed alphabetically by ticker.
 * Returns [{ security, rank, score }] where score is the average rank (average method only).
 */
export function rankSecurities(securities, sorts = [], method = 'priority') {
  const active = sorts.filter((sort) => CRITERION_KEYS.has(sort.key));
  const byPriority = priorityComparator(active);
  if (method !== 'average' || active.length === 0) {
    return [...securities].sort(byPriority).map((security, index) => ({ security, rank: index + 1, score: null }));
  }
  const rankLists = active.map((sort) => criterionRanks(securities, sort));
  const scored = securities.map((security, index) => ({
    security,
    score: rankLists.reduce((sum, ranks) => sum + ranks[index], 0) / rankLists.length,
  }));
  scored.sort((a, b) => a.score - b.score || byPriority(a.security, b.security));
  return scored.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function filterRanked(ranked, { query = '', sector = '' } = {}) {
  const needle = query.trim().toLowerCase();
  return ranked.filter(({ security }) => {
    if (sector && security.sector !== sector) return false;
    if (!needle) return true;
    return security.symbol.toLowerCase().includes(needle) || security.name.toLowerCase().includes(needle);
  });
}

// --- Sort-state transitions (immutable) -----------------------------------

export function addCriterion(sorts, key, direction = 'desc') {
  if (!CRITERION_KEYS.has(key) || sorts.some((sort) => sort.key === key)) return sorts;
  return [...sorts, { key, direction }];
}

export function removeCriterion(sorts, key) {
  return sorts.filter((sort) => sort.key !== key);
}

export function toggleDirection(sorts, key) {
  return sorts.map((sort) => (sort.key === key ? { ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' } : sort));
}

export function moveCriterion(sorts, key, offset) {
  const from = sorts.findIndex((sort) => sort.key === key);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= sorts.length) return sorts;
  const next = [...sorts];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

// --- Market summary --------------------------------------------------------

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/** Aggregate figures for a set of securities; issuer-level totals count multi-class issuers once (by CIK). */
export function marketSummary(securities) {
  const issuers = new Map();
  for (const security of securities) {
    const id = security.cik ?? security.symbol;
    if (!issuers.has(id)) issuers.set(id, security);
  }
  const sum = (key) => {
    const values = [...issuers.values()].map((security) => security[key]).filter(finite);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };
  const returns = securities.map((security) => security.price_change_1y).filter(finite);
  const leaders = securities.filter((security) => finite(security.price_change_1y))
    .sort((a, b) => b.price_change_1y - a.price_change_1y);
  return {
    count: securities.length,
    marketCap: sum('market_cap'),
    netIncome: sum('net_income'),
    medianReturn1y: median(returns),
    advancers: returns.filter((value) => value > 0).length,
    measured: returns.length,
    leader: leaders[0] || null,
  };
}

// --- URL hash persistence: #sort=market_cap:desc,price:asc&method=average&symbol=AAPL&range=5y ---

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;

export function serializeState({ sorts, method, symbol = null, range = DEFAULT_RANGE }) {
  const parts = [];
  if (sorts.length) parts.push(`sort=${sorts.map(({ key, direction }) => `${key}:${direction}`).join(',')}`);
  if (method === 'average') parts.push(`method=${method}`);
  if (symbol) parts.push(`symbol=${encodeURIComponent(symbol)}`);
  if (symbol && range !== DEFAULT_RANGE) parts.push(`range=${range}`);
  return parts.join('&');
}

export function parseState(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  let sorts = [];
  for (const part of (params.get('sort') || '').split(',')) {
    const [key, direction] = part.split(':');
    sorts = addCriterion(sorts, key, direction === 'asc' ? 'asc' : 'desc');
  }
  const method = METHODS.includes(params.get('method')) ? params.get('method') : 'priority';
  const symbol = (params.get('symbol') || '').toUpperCase();
  const range = RANGE_KEYS.includes(params.get('range')) ? params.get('range') : DEFAULT_RANGE;
  return { sorts, method, symbol: SYMBOL_PATTERN.test(symbol) ? symbol : null, range };
}

// --- Formatting ------------------------------------------------------------

const MINUS = '\u2212';

export function formatMoney(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value < 0 ? MINUS : '';
  const absolute = Math.abs(value);
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, suffix] of units) {
    if (absolute >= size) {
      const scaled = absolute / size;
      return `${sign}$${scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2)}${suffix}`;
    }
  }
  return `${sign}$${absolute.toFixed(0)}`;
}

export function formatPrice(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const percent = value * 100;
  const digits = Math.abs(percent) >= 1000 ? 0 : 1;
  const text = Math.abs(percent).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (text === (0).toFixed(digits)) return `${text}%`;
  return `${percent > 0 ? '+' : MINUS}${text}%`;
}

export function formatValue(format, value) {
  if (format === 'money') return formatMoney(value);
  if (format === 'percent') return formatPercent(value);
  return formatPrice(value);
}
