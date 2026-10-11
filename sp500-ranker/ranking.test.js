import assert from 'node:assert/strict';
import test from 'node:test';
import {
  columnOrder, marketSummary,
  addCriterion, criterionRanks, filterRanked, formatMoney, formatPercent, formatPrice, moveCriterion,
  parseState, rankSecurities, removeCriterion, serializeState, toggleDirection,
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
