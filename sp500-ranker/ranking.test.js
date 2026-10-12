import assert from 'node:assert/strict';
import test from 'node:test';
import {
  columnOrder, marketSummary,
  addCriterion, criterionRanks, filterRanked, formatMoney, formatPercent, formatPrice, moveCriterion,
  parseState, rankSecurities, removeCriterion, serializeState, toggleDirection,
  filterSecurities, rankFilteredSecurities, parseMoneyInput, parsePercentInput, formatPE, getSecurityPE,
} from './ranking.js';

const rows = [
  { symbol: 'CCC', name: 'Charlie Co', sector: 'Energy', market_cap: 300, price: 10, price_change_1y: 0.5, net_income: null },
  { symbol: 'AAA', name: 'Alpha Inc', sector: 'Tech', market_cap: 100, price: 30, price_change_1y: 0.5, net_income: 5 },
  { symbol: 'BBB', name: 'Bravo Corp', sector: 'Tech', market_cap: 200, price: 20, price_change_1y: -0.1, net_income: -2 },
  { symbol: 'DDD', name: 'Delta Ltd', sector: 'Energy', market_cap: null, price: 40, price_change_1y: null, net_income: 9 },
];
const symbols = (ranked) => ranked.map(({ security }) => security.symbol);

test('no criteria lists securities alphabetically with sequential ranks', () => {
  const ranked = rankSecurities(rows, []);
  assert.deepEqual(symbols(ranked), ['AAA', 'BBB', 'CCC', 'DDD']);
  assert.deepEqual(ranked.map(({ rank }) => rank), [1, 2, 3, 4]);
});

test('single criterion sorts either direction with missing values last', () => {
  assert.deepEqual(symbols(rankSecurities(rows, [{ key: 'market_cap', direction: 'desc' }])), ['CCC', 'BBB', 'AAA', 'DDD']);
  assert.deepEqual(symbols(rankSecurities(rows, [{ key: 'market_cap', direction: 'asc' }])), ['AAA', 'BBB', 'CCC', 'DDD']);
});

test('later criteria break ties in priority order', () => {
  const sorts = [{ key: 'price_change_1y', direction: 'desc' }, { key: 'price', direction: 'desc' }];
  assert.deepEqual(symbols(rankSecurities(rows, sorts)), ['AAA', 'CCC', 'BBB', 'DDD']);
  const reordered = [{ key: 'price', direction: 'desc' }, { key: 'price_change_1y', direction: 'desc' }];
  assert.deepEqual(symbols(rankSecurities(rows, reordered)), ['DDD', 'AAA', 'BBB', 'CCC']);
});

test('average-rank method combines criteria equally', () => {
  const sorts = [{ key: 'market_cap', direction: 'desc' }, { key: 'net_income', direction: 'desc' }];
  // market cap ranks: CCC1 BBB2 AAA3 DDD4; net income ranks: DDD1 AAA2 BBB3 CCC4
  const ranked = rankSecurities(rows, sorts, 'average');
  assert.deepEqual(ranked.map(({ security, score }) => [security.symbol, score]), [
    ['CCC', 2.5], ['BBB', 2.5], ['AAA', 2.5], ['DDD', 2.5],
  ]);
  const momentum = rankSecurities(rows, [{ key: 'price', direction: 'desc' }, { key: 'price_change_1y', direction: 'desc' }], 'average');
  assert.deepEqual(momentum.map(({ security, score }) => [security.symbol, score]), [
    ['AAA', 1.5], ['DDD', 2.5], ['CCC', 2.5], ['BBB', 3],
  ]);
});

test('criterionRanks gives ties the same rank and missing values the last rank', () => {
  assert.deepEqual(criterionRanks(rows, { key: 'price_change_1y', direction: 'desc' }), [1, 1, 3, 4]);
});

test('unknown criteria are ignored', () => {
  assert.deepEqual(symbols(rankSecurities(rows, [{ key: 'bogus', direction: 'asc' }])), ['AAA', 'BBB', 'CCC', 'DDD']);
});

test('filtering keeps overall ranks', () => {
  const ranked = rankSecurities(rows, [{ key: 'market_cap', direction: 'desc' }]);
  assert.deepEqual(filterRanked(ranked, { sector: 'Tech' }).map(({ rank }) => rank), [2, 3]);
  assert.deepEqual(symbols(filterRanked(ranked, { query: 'delta' })), ['DDD']);
  assert.deepEqual(symbols(filterRanked(ranked, { query: 'aa' })), ['AAA']);
});

test('sort state transitions are immutable and guard invalid input', () => {
  const start = addCriterion(addCriterion([], 'price'), 'market_cap', 'asc');
  assert.deepEqual(start, [{ key: 'price', direction: 'desc' }, { key: 'market_cap', direction: 'asc' }]);
  assert.equal(addCriterion(start, 'price'), start);
  assert.equal(addCriterion(start, 'nope'), start);
  assert.deepEqual(toggleDirection(start, 'price')[0].direction, 'asc');
  assert.deepEqual(moveCriterion(start, 'market_cap', -1).map(({ key }) => key), ['market_cap', 'price']);
  assert.equal(moveCriterion(start, 'price', -1), start);
  assert.deepEqual(removeCriterion(start, 'price'), [{ key: 'market_cap', direction: 'asc' }]);
});

test('state round-trips through the URL hash', () => {
  const state = {
    sorts: [{ key: 'net_income', direction: 'desc' }, { key: 'price_change_3m', direction: 'asc' }],
    method: 'average', symbol: 'BRK.B', range: '5y',
  };
  const hash = serializeState(state);
  assert.equal(hash, 'sort=net_income:desc,price_change_3m:asc&method=average&symbol=BRK.B&range=5y');
  assert.deepEqual(parseState(`#${hash}`), state);
  assert.equal(serializeState({ sorts: [], method: 'priority' }), '');
  assert.equal(serializeState({ sorts: [], method: 'priority', symbol: 'AAPL', range: '1y' }), 'symbol=AAPL');
  assert.equal(serializeState({ sorts: [], method: 'priority', symbol: null, range: '5y' }), '');
  assert.deepEqual(parseState('#sort=evil:asc,price:sideways,price:asc&method=x&symbol=<script>&range=7y'), {
    sorts: [{ key: 'price', direction: 'desc' }], method: 'priority', symbol: null, range: '1y',
  });
  assert.equal(parseState('#symbol=aapl').symbol, 'AAPL');
});

test('formatters', () => {
  assert.equal(formatMoney(4_913_000_000_000), '$4.91T');
  assert.equal(formatMoney(128_930_000_000), '$129B');
  assert.equal(formatMoney(-1_250_000_000), '\u2212$1.25B');
  assert.equal(formatMoney(null), '—');
  assert.equal(formatPercent(0.3251), '+32.5%');
  assert.equal(formatPercent(-0.015), '\u22121.5%');
  assert.equal(formatPercent(0), '0.0%');
  assert.equal(formatPercent(25.5), '+2,550%');
  assert.equal(formatPrice(1234.5), '$1,234.50');
});

test('market summary counts multi-class issuers once and takes the median return', () => {
  const summary = marketSummary([
    { symbol: 'GOOGL', cik: 1, market_cap: 100, net_income: 10, price_change_1y: 0.2 },
    { symbol: 'GOOG', cik: 1, market_cap: 100, net_income: 10, price_change_1y: 0.22 },
    { symbol: 'X', cik: 2, market_cap: 50, net_income: -5, price_change_1y: -0.1 },
    { symbol: 'Y', cik: 3, market_cap: null, net_income: null, price_change_1y: null },
  ]);
  assert.equal(summary.count, 4);
  assert.equal(summary.marketCap, 150);
  assert.equal(summary.netIncome, 5);
  assert.equal(summary.medianReturn1y, 0.2);
  assert.deepEqual([summary.advancers, summary.measured], [2, 3]);
  assert.equal(summary.leader.symbol, 'GOOG');
  assert.equal(marketSummary([]).medianReturn1y, null);
});

test('selected columns lead in sort order, then the rest in default order', () => {
  const keys = (sorts) => columnOrder(sorts).map(({ key }) => key);
  assert.deepEqual(keys([]), [
    'market_cap', 'market_cap_change_1y', 'net_income', 'net_income_change_1y', 'price', 'price_change_1y', 'price_change_3m',
  ]);
  assert.deepEqual(keys([{ key: 'price_change_3m', direction: 'desc' }, { key: 'net_income', direction: 'asc' }]), [
    'price_change_3m', 'net_income', 'market_cap', 'market_cap_change_1y', 'net_income_change_1y', 'price', 'price_change_1y',
  ]);
  assert.equal(columnOrder([{ key: 'bogus', direction: 'desc' }]).length, 7);
});

test('filterSecurities filters by market cap, P/E, price, and performance periods', () => {
  const testSecurities = [
    {
      symbol: 'AAPL', name: 'Apple Inc.', sector: 'Information Technology',
      market_cap: 3_000_000_000_000, price: 200, net_income: 100_000_000_000, net_income_prior: 76_900_000_000, net_income_change_1y: 0.30, pe: 30,
      performance: { '1w': 0.01, '1m': 0.05, '3m': 0.10, ytd: 0.15, '1y': 0.30, '2y': 0.45, '5y': 1.2, '10y': 5.0, all: 20.0 },
    },
    {
      symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Information Technology',
      market_cap: 2_500_000_000_000, price: 400, net_income: 80_000_000_000, net_income_prior: 64_000_000_000, net_income_change_1y: 0.25, pe: 31.25,
      performance: { '1w': -0.01, '1m': 0.02, '3m': 0.08, ytd: 0.12, '1y': 0.25, '2y': 0.40, '5y': 1.1, '10y': 6.0, all: 15.0 },
    },
    {
      symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Health Care',
      market_cap: 400_000_000_000, price: 160, net_income: 20_000_000_000, net_income_prior: 19_000_000_000, net_income_change_1y: 0.05, pe: 20,
      performance: { '1w': 0.005, '1m': -0.02, '3m': -0.01, ytd: 0.03, '1y': 0.05, '2y': 0.10, '5y': 0.3, '10y': 1.2, all: 5.0 },
    },
    {
      symbol: 'LOSS', name: 'Unprofitable Co.', sector: 'Health Care',
      market_cap: 5_000_000_000, price: 25, net_income: -500_000_000, net_income_prior: -333_000_000, net_income_change_1y: -0.50, pe: null,
      performance: { '1w': -0.05, '1m': -0.10, '3m': -0.20, ytd: -0.30, '1y': -0.50, '2y': -0.40, '5y': -0.2, '10y': null, all: -0.5 },
    },
  ];

  // Market cap filter
  const megaCaps = filterSecurities(testSecurities, { marketCapMin: 1_000_000_000_000 });
  assert.deepEqual(megaCaps.map((s) => s.symbol), ['AAPL', 'MSFT']);

  // P/E filter
  const lowPE = filterSecurities(testSecurities, { peMax: 25 });
  assert.deepEqual(lowPE.map((s) => s.symbol), ['JNJ']);

  // Profitable only
  const profitable = filterSecurities(testSecurities, { pePositiveOnly: true });
  assert.deepEqual(profitable.map((s) => s.symbol), ['AAPL', 'MSFT', 'JNJ']);

  // Price filter
  const affordable = filterSecurities(testSecurities, { priceMax: 180 });
  assert.deepEqual(affordable.map((s) => s.symbol), ['JNJ', 'LOSS']);

  // Performance filters across different time periods
  const weeklyWinners = filterSecurities(testSecurities, { performance: { '1w': { min: 0 } } });
  assert.deepEqual(weeklyWinners.map((s) => s.symbol), ['AAPL', 'JNJ']);

  const strong1Y = filterSecurities(testSecurities, { performance: { '1y': { min: 0.20 } } });
  assert.deepEqual(strong1Y.map((s) => s.symbol), ['AAPL', 'MSFT']);

  const multiPeriod = filterSecurities(testSecurities, {
    performance: { '1y': { min: 0.25 }, '1m': { min: 0.03 } },
  });
  assert.deepEqual(multiPeriod.map((s) => s.symbol), ['AAPL']);

  // Sector and search query
  const techOnly = filterSecurities(testSecurities, { sector: 'Information Technology' });
  assert.deepEqual(techOnly.map((s) => s.symbol), ['AAPL', 'MSFT']);

  const searched = filterSecurities(testSecurities, { query: 'johnson' });
  assert.deepEqual(searched.map((s) => s.symbol), ['JNJ']);

  // Net income (TTM) filtering
  const highEarners = filterSecurities(testSecurities, { netIncomeMin: 50_000_000_000 });
  assert.deepEqual(highEarners.map((s) => s.symbol), ['AAPL', 'MSFT']);

  const profitableEarnings = filterSecurities(testSecurities, { netIncomeMin: 0 });
  assert.deepEqual(profitableEarnings.map((s) => s.symbol), ['AAPL', 'MSFT', 'JNJ']);

  // Net income percentage growth (YoY) filtering
  const fastGrowth = filterSecurities(testSecurities, { netIncomeGrowthMin: 0.20 });
  assert.deepEqual(fastGrowth.map((s) => s.symbol), ['AAPL', 'MSFT']);

  const structuredNetIncome = filterSecurities(testSecurities, {
    netIncome: { ttm: { min: 20_000_000_000 }, yoy: { min: 0.26 } },
  });
  assert.deepEqual(structuredNetIncome.map((s) => s.symbol), ['AAPL']);
});

test('rankFilteredSecurities ranks by selected column and direction', () => {
  const secs = [
    { symbol: 'A', market_cap: 100, price: 50, pe: 25, net_income: 10, net_income_change_1y: 0.05, performance: { '1y': 0.1 } },
    { symbol: 'B', market_cap: 300, price: 20, pe: 10, net_income: 50, net_income_change_1y: 0.35, performance: { '1y': 0.5 } },
    { symbol: 'C', market_cap: 200, price: 80, pe: null, net_income: -5, net_income_change_1y: -0.20, performance: { '1y': -0.2 } },
  ];

  // Rank by market_cap descending
  const byCap = rankFilteredSecurities(secs, 'market_cap', 'desc');
  assert.deepEqual(byCap.map((r) => [r.security.symbol, r.rank]), [['B', 1], ['C', 2], ['A', 3]]);

  // Rank by net_income descending
  const byNI = rankFilteredSecurities(secs, 'net_income', 'desc');
  assert.deepEqual(byNI.map((r) => [r.security.symbol, r.rank]), [['B', 1], ['A', 2], ['C', 3]]);

  // Rank by net_income_change_1y descending
  const byNIGrowth = rankFilteredSecurities(secs, 'net_income_change_1y', 'desc');
  assert.deepEqual(byNIGrowth.map((r) => [r.security.symbol, r.rank]), [['B', 1], ['A', 2], ['C', 3]]);

  // Rank by P/E ascending (null P/E sorts last)
  const byPE = rankFilteredSecurities(secs, 'pe', 'asc');
  assert.deepEqual(byPE.map((r) => [r.security.symbol, r.rank]), [['B', 1], ['A', 2], ['C', 3]]);

  // Rank by 1y performance descending (handles both '1y' and 'perf_1y')
  const byPerf = rankFilteredSecurities(secs, '1y', 'desc');
  assert.deepEqual(byPerf.map((r) => [r.security.symbol, r.rank]), [['B', 1], ['A', 2], ['C', 3]]);

  const byPerfPrefix = rankFilteredSecurities(secs, 'perf_1y', 'desc');
  assert.deepEqual(byPerfPrefix.map((r) => [r.security.symbol, r.rank]), [['B', 1], ['A', 2], ['C', 3]]);
});

test('parseMoneyInput and parsePercentInput handle varied human inputs', () => {
  assert.equal(parseMoneyInput('$50B'), 50e9);
  assert.equal(parseMoneyInput('1.5T'), 1.5e12);
  assert.equal(parseMoneyInput('250m'), 250e6);
  assert.equal(parseMoneyInput('50000'), 50000);
  assert.equal(parseMoneyInput('-$500M'), -500e6);
  assert.equal(parseMoneyInput('> $1B'), 1e9);
  assert.equal(parseMoneyInput('< $0'), 0);
  assert.equal(parseMoneyInput('$0'), 0);
  assert.equal(parseMoneyInput('0'), 0);
  assert.equal(parseMoneyInput(''), null);
  assert.equal(parseMoneyInput('invalid'), null);

  assert.equal(parsePercentInput('25%'), 0.25);
  assert.equal(parsePercentInput('10'), 0.10);
  assert.equal(parsePercentInput('-5%'), -0.05);
  assert.equal(parsePercentInput('0%'), 0);
  assert.equal(parsePercentInput('0'), 0);
  assert.equal(parsePercentInput('> 10%'), 0.10);
  assert.equal(parsePercentInput('< 0%'), 0);
  assert.equal(parsePercentInput('+15.5%'), 0.155);
  assert.equal(parsePercentInput(''), null);
  assert.equal(parsePercentInput('-'), null);
});

test('formatPE formats numbers cleanly', () => {
  assert.equal(formatPE(38.12), '38.1');
  assert.equal(formatPE(null), '—');
  assert.equal(formatPE(-5), '—');
});

test('state serialization handles tab and fsort', () => {
  const filterState = {
    tab: 'filter', sorts: [], method: 'priority', symbol: null, range: '1y',
    filterSort: { key: '1y', direction: 'desc' },
  };
  const hash = serializeState(filterState);
  assert.equal(hash, 'tab=filter&fsort=1y:desc');
  const parsed = parseState(hash);
  assert.equal(parsed.tab, 'filter');
  assert.deepEqual(parsed.filterSort, { key: '1y', direction: 'desc' });
});
