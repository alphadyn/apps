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
export const FILTER_RANGES = [
  { key: '1w', label: '1W', name: '1 week' },
  { key: '1m', label: '1M', name: '1 month' },
  { key: '3m', label: '3M', name: '3 months (Q)' },
  { key: 'ytd', label: 'YTD', name: 'Year to date' },
  { key: '1y', label: '1Y', name: '1 year' },
  { key: '2y', label: '2Y', name: '2 years' },
  { key: '5y', label: '5Y', name: '5 years' },
  { key: '10y', label: '10Y', name: '10 years' },
  { key: 'all', label: 'All', name: 'All time' },
];
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

// --- Filter Tab Filtering & Ranking --------------------------------------

export function getSecurityPE(security) {
  if (security.pe !== undefined && security.pe !== null) return security.pe;
  if (security.net_income > 0 && security.market_cap > 0) {
    return security.market_cap / security.net_income;
  }
  return null;
}

export function getSecurityPerformance(security, rangeKey) {
  if (security.performance && security.performance[rangeKey] !== undefined) {
    return security.performance[rangeKey];
  }
  const flat = security[`price_change_${rangeKey}`];
  if (flat !== undefined) return flat;
  return null;
}

export function filterSecurities(securities, filters = {}) {
  const {
    query = '',
    sector = '',
    marketCapMin = null,
    marketCapMax = null,
    netIncome = {},
    netIncomeMin = null,
    netIncomeMax = null,
    netIncomeGrowthMin = null,
    netIncomeGrowthMax = null,
    netIncomePriorMin = null,
    netIncomePriorMax = null,
    peMin = null,
    peMax = null,
    pePositiveOnly = false,
    priceMin = null,
    priceMax = null,
    performance = {},
  } = filters;

  const needle = query.trim().toLowerCase();

  return securities.filter((security) => {
    if (sector && security.sector !== sector) return false;
    if (needle) {
      const sym = (security.symbol || '').toLowerCase();
      const name = (security.name || '').toLowerCase();
      if (!sym.includes(needle) && !name.includes(needle)) return false;
    }

    if (marketCapMin !== null && marketCapMin !== undefined) {
      if (security.market_cap === null || security.market_cap === undefined || security.market_cap < marketCapMin) {
        return false;
      }
    }
    if (marketCapMax !== null && marketCapMax !== undefined) {
      if (security.market_cap === null || security.market_cap === undefined || security.market_cap > marketCapMax) {
        return false;
      }
    }

    // Net income TTM
    const niTtmMin = netIncome?.ttm?.min ?? netIncomeMin;
    const niTtmMax = netIncome?.ttm?.max ?? netIncomeMax;
    if (niTtmMin !== null && niTtmMin !== undefined) {
      if (security.net_income === null || security.net_income === undefined || security.net_income < niTtmMin) {
        return false;
      }
    }
    if (niTtmMax !== null && niTtmMax !== undefined) {
      if (security.net_income === null || security.net_income === undefined || security.net_income > niTtmMax) {
        return false;
      }
    }

    // Net income percentage growth (YoY / 1Y)
    const niGrowthMin = netIncome?.yoy?.min ?? netIncomeGrowthMin;
    const niGrowthMax = netIncome?.yoy?.max ?? netIncomeGrowthMax;
    if (niGrowthMin !== null && niGrowthMin !== undefined) {
      if (security.net_income_change_1y === null || security.net_income_change_1y === undefined || security.net_income_change_1y < niGrowthMin) {
        return false;
      }
    }
    if (niGrowthMax !== null && niGrowthMax !== undefined) {
      if (security.net_income_change_1y === null || security.net_income_change_1y === undefined || security.net_income_change_1y > niGrowthMax) {
        return false;
      }
    }

    // Net income Prior Year
    const niPriorMin = netIncome?.prior?.min ?? netIncomePriorMin;
    const niPriorMax = netIncome?.prior?.max ?? netIncomePriorMax;
    if (niPriorMin !== null && niPriorMin !== undefined) {
      if (security.net_income_prior === null || security.net_income_prior === undefined || security.net_income_prior < niPriorMin) {
        return false;
      }
    }
    if (niPriorMax !== null && niPriorMax !== undefined) {
      if (security.net_income_prior === null || security.net_income_prior === undefined || security.net_income_prior > niPriorMax) {
        return false;
      }
    }

    const pe = getSecurityPE(security);
    if (pePositiveOnly) {
      if (pe === null || pe <= 0) return false;
    }
    if (peMin !== null && peMin !== undefined) {
      if (pe === null || pe < peMin) return false;
    }
    if (peMax !== null && peMax !== undefined) {
      if (pe === null || pe > peMax) return false;
    }

    if (priceMin !== null && priceMin !== undefined) {
      if (security.price === null || security.price === undefined || security.price < priceMin) {
        return false;
      }
    }
    if (priceMax !== null && priceMax !== undefined) {
      if (security.price === null || security.price === undefined || security.price > priceMax) {
        return false;
      }
    }

    if (performance && typeof performance === 'object') {
      for (const [period, range] of Object.entries(performance)) {
        if (!range) continue;
        const { min = null, max = null } = range;
        if (min === null && max === null) continue;
        const val = getSecurityPerformance(security, period);
        if (min !== null && min !== undefined) {
          if (val === null || val === undefined || val < min) return false;
        }
        if (max !== null && max !== undefined) {
          if (val === null || val === undefined || val > max) return false;
        }
      }
    }

    return true;
  });
}

export function rankFilteredSecurities(securities, sortKey = 'market_cap', sortDirection = 'desc') {
  const perfKeys = new Set(FILTER_RANGES.map((r) => r.key));
  const sorted = [...securities].sort((a, b) => {
    let aVal, bVal;
    if (sortKey === 'pe') {
      aVal = getSecurityPE(a);
      bVal = getSecurityPE(b);
    } else if (sortKey === 'net_income' || sortKey === 'net_income_ttm') {
      aVal = a.net_income ?? null;
      bVal = b.net_income ?? null;
    } else if (sortKey === 'net_income_change_1y' || sortKey === 'net_income_growth' || sortKey === 'net_income_yoy') {
      aVal = a.net_income_change_1y ?? null;
      bVal = b.net_income_change_1y ?? null;
    } else if (sortKey === 'net_income_prior') {
      aVal = a.net_income_prior ?? null;
      bVal = b.net_income_prior ?? null;
    } else if (sortKey === 'symbol') {
      return sortDirection === 'asc'
        ? a.symbol.localeCompare(b.symbol)
        : b.symbol.localeCompare(a.symbol);
    } else if (sortKey === 'name') {
      return sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortKey.startsWith('perf_')) {
      const period = sortKey.replace('perf_', '');
      aVal = getSecurityPerformance(a, period);
      bVal = getSecurityPerformance(b, period);
    } else if (perfKeys.has(sortKey)) {
      aVal = getSecurityPerformance(a, sortKey);
      bVal = getSecurityPerformance(b, sortKey);
    } else {
      aVal = a[sortKey] ?? null;
      bVal = b[sortKey] ?? null;
    }
    const cmp = compareValues(aVal, bVal, sortDirection);
    if (cmp !== 0) return cmp;
    return a.symbol.localeCompare(b.symbol);
  });

  return sorted.map((security, index) => ({
    security,
    rank: index + 1,
  }));
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

// --- URL hash persistence: #sort=market_cap:desc,price:asc&method=average&symbol=AAPL&range=5y&tab=filter ---

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;

export function serializeState({ tab = 'sort', sorts = [], method = 'priority', symbol = null, range = DEFAULT_RANGE, filterSort = null }) {
  const parts = [];
  if (tab === 'filter') parts.push('tab=filter');
  if (sorts && sorts.length) parts.push(`sort=${sorts.map(({ key, direction }) => `${key}:${direction}`).join(',')}`);
  if (method === 'average') parts.push(`method=${method}`);
  if (filterSort && (filterSort.key !== 'market_cap' || filterSort.direction !== 'desc')) {
    parts.push(`fsort=${filterSort.key}:${filterSort.direction}`);
  }
  if (symbol) parts.push(`symbol=${encodeURIComponent(symbol)}`);
  if (symbol && range !== DEFAULT_RANGE) parts.push(`range=${range}`);
  return parts.join('&');
}

export function parseState(hashOrQuery) {
  let input = String(hashOrQuery || '').trim();

  // Match /s/<symbol> in path or full URL
  const shareMatch = input.match(/(?:^|\/)s\/([A-Za-z0-9.-]+)(?:\/|$|\?|#)/);
  let shareSymbol = shareMatch ? shareMatch[1].toUpperCase() : null;

  if (input.includes('#')) {
    input = input.slice(input.indexOf('#'));
  } else if (input.includes('?')) {
    input = input.slice(input.indexOf('?'));
  }
  const clean = input.replace(/^[#?]/, '');
  const params = new URLSearchParams(clean);
  let sorts = [];
  for (const part of (params.get('sort') || '').split(',')) {
    const [key, direction] = part.split(':');
    sorts = addCriterion(sorts, key, direction === 'asc' ? 'asc' : 'desc');
  }
  const method = METHODS.includes(params.get('method')) ? params.get('method') : 'priority';
  let symbol = (params.get('symbol') || shareSymbol || '').toUpperCase();
  if (!symbol && !clean.includes('=') && SYMBOL_PATTERN.test(clean.toUpperCase())) {
    symbol = clean.toUpperCase();
  }
  const range = RANGE_KEYS.includes(params.get('range')) ? params.get('range') : DEFAULT_RANGE;
  const state = { sorts, method, symbol: SYMBOL_PATTERN.test(symbol) ? symbol : null, range };
  if (params.get('tab') === 'filter') state.tab = 'filter';
  if (params.get('fsort')) {
    const [fkey, fdir] = params.get('fsort').split(':');
    if (fkey) state.filterSort = { key: fkey, direction: fdir === 'asc' ? 'asc' : 'desc' };
  }
  return state;
}

// --- Formatting ------------------------------------------------------------

const MINUS = '\u2212';

export function parseMoneyInput(text) {
  if (text === null || text === undefined) return null;
  const clean = String(text).trim().replace(/[><$]/g, '').replace(/,/g, '').trim();
  if (!clean) return null;
  const match = clean.match(/^([+-]?[0-9.]+)\s*([tbmk])?$/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (!Number.isFinite(num)) return null;
  const unit = (match[2] || '').toLowerCase();
  const multipliers = { t: 1e12, b: 1e9, m: 1e6, k: 1e3 };
  return num * (multipliers[unit] ?? 1);
}

export function parsePercentInput(text) {
  if (text === null || text === undefined) return null;
  const clean = String(text).trim().replace(/[><%]/g, '').replace(/,/g, '').trim();
  if (!clean) return null;
  const num = parseFloat(clean);
  if (!Number.isFinite(num)) return null;
  return num / 100;
}

export function formatPE(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value <= 0) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

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

export function formatSecuritySummary(security) {
  if (!security) return null;
  const price = formatPrice(security.price);
  const ret1y = formatPercent(security['1y'] ?? security.price_change_1y);
  const peVal = getSecurityPE(security);
  const pe = formatPE(peVal);
  const mcap = formatMoney(security.market_cap);
  const netIncome = formatMoney(security.net_income);

  const peClause = pe !== '—' ? `, P/E: ${pe}` : '';
  const niClause = security.net_income != null ? `, Net Income: ${netIncome}` : '';

  const performanceList = FILTER_RANGES.map((r) => {
    const val = getSecurityPerformance(security, r.key);
    return {
      key: r.key,
      label: r.label,
      name: r.name,
      value: val,
      text: formatPercent(val),
      isUp: typeof val === 'number' && val > 0,
      isDown: typeof val === 'number' && val < 0,
    };
  });

  const featuredKeys = ['1w', '1m', '3m', 'ytd', '1y', '5y'];
  const performanceText = performanceList
    .filter((item) => featuredKeys.includes(item.key) && item.text !== '—')
    .map((item) => `${item.label} ${item.text}`)
    .join(', ');

  const perfClause = performanceText ? `. Performance: ${performanceText}` : '';
  const title = `${security.symbol} · ${security.name} — S&P 500 Screener & Ranker`;
  const description = `${security.name} (${security.symbol}): ${price} (${ret1y} 1Y)${perfClause}. Market Cap: ${mcap}${peClause}${niClause}. Explore performance graph across 9 periods and 10 years of price history.`;
  const ytdItem = performanceList.find((item) => item.key === 'ytd');
  const ytdText = ytdItem && ytdItem.text !== '—' ? `, YTD: ${ytdItem.text}` : '';
  const message = `Take a look at ${security.symbol} on S&P 500 Screener & Ranker (1Y: ${ret1y}${ytdText}).`;

  return {
    symbol: security.symbol,
    name: security.name,
    price,
    ret1y,
    pe,
    mcap,
    netIncome,
    performanceList,
    performanceText,
    title,
    description,
    message,
  };
}
