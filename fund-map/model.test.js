import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareFunds } from './model.js';
import { discountedCashFlowUpside } from '../market-insights/ranking.js';

const stock = (symbol, cap, income = 10) => ({
  symbol, name: symbol, market_cap: cap, price: 100, net_income: income, net_income_change_1y: 0,
});
const fund = (symbol, industry = 'S&P 500', price = 100) => ({
  symbol, name: symbol, asset_type: 'fund', industry, fund_type: 'ETF', price,
});
const assets = { fetched_at: '2026-01-01T00:00:00Z', assets: { F: 100, G: 300, H: 600 } };

test('S&P 500 proxy uses cap-weighted constituent DCF and each fund price', () => {
  const a = stock('A', 100, 10);
  const b = stock('B', 300, 30);
  const result = prepareFunds({ securities: [a, b, fund('F', 'S&P 500', 50), fund('G', 'S&P 500', 200), fund('H', 'U.S. bonds')] }, assets);
  const expected = (100 * discountedCashFlowUpside(a) + 300 * discountedCashFlowUpside(b)) / 400;
  assert.ok(Math.abs(result.proxy.upside - expected) < 1e-10);
  assert.equal(result.funds[0].fairValue, 50 * (1 + expected));
  assert.equal(result.funds[1].fairValue, 200 * (1 + expected));
  assert.equal(result.funds[2].upside, null);
  assert.equal(result.funds[2].fairValue, null);
  assert.deepEqual(result.funds.map((entry) => entry.marketCap), [100, 300, 600]);
});

test('missing quotes and coverage do not produce a valuation', () => {
  const entries = Array.from({ length: 5 }, (_, i) => stock(`S${i}`, 100));
  const missingQuote = prepareFunds({ securities: [...entries, fund('F', 'S&P 500', null)] }, assets);
  assert.equal(missingQuote.funds[0].upside, null);
  assert.equal(missingQuote.funds[0].fairValue, null);
  const missingCaps = entries.map((entry, i) => ({ ...entry, market_cap: i < 2 ? null : 100 }));
  const insufficient = prepareFunds({ securities: [...missingCaps, fund('F')] }, assets);
  assert.equal(insufficient.proxy.upside, null);
  assert.equal(insufficient.funds[0].upside, null);
  const missingEarnings = entries.map((entry, i) => ({ ...entry, net_income: i < 2 ? null : 10 }));
  assert.equal(prepareFunds({ securities: [...missingEarnings, fund('F')] }, assets).proxy.upside, null);
});

test('coverage thresholds include exactly 80 percent and exclude unavailable DCF from weights', () => {
  const entries = Array.from({ length: 5 }, (_, i) => stock(`S${i}`, 100, i === 0 ? null : 10));
  const result = prepareFunds({ securities: [...entries, fund('F')] }, assets);
  assert.equal(result.proxy.capCoverage, 0.8);
  assert.equal(result.proxy.companyCoverage, 1);
  assert.ok(Number.isFinite(result.proxy.upside));
  assert.equal(result.proxy.valuedCount, 4);
});

test('share classes are not double counted and invalid fund records are rejected', () => {
  const entries = [stock('A', 100), { ...stock('AA', 100), cik: 1 }, { ...stock('B', 200), cik: 1 }];
  const result = prepareFunds({ securities: [...entries, fund('F')] }, assets);
  assert.equal(result.proxy.companyCount, 2);
  assert.throws(() => prepareFunds({ securities: [...entries, fund('F'), fund('F')] }, assets));
  assert.throws(() => prepareFunds({ securities: entries }, assets));
});

test('invalid or missing assets exclude funds from the map, but preserve search and valuation', () => {
  const snapshot = { fetched_at: '2026-01-01T00:00:00Z', assets: { F: 100, G: -1, H: '600' } };
  const result = prepareFunds({ securities: [stock('A', 100), fund('F'), fund('G'), fund('H'), fund('I')] }, snapshot);
  assert.deepEqual(result.mapped.map((entry) => entry.id), ['F']);
  assert.deepEqual(result.missing.map((entry) => entry.id), ['G', 'H', 'I']);
  assert.ok(result.missing.every((entry) => entry.marketCap === null && Number.isFinite(entry.upside)));
  assert.throws(() => prepareFunds({ securities: [stock('A', 100), fund('F')] }, {}));
});

test('shared Vanguard share classes appear in one portfolio with pooled assets', () => {
  const pairs = [['VFIAX', 'VOO'], ['VTSAX', 'VTI'], ['VTIAX', 'VXUS'], ['VBTLX', 'BND']];
  const assetValues = Object.fromEntries(pairs.flatMap(([first, second], index) => [
    [first, 1000 * (index + 1)], [second, 1000 * (index + 1)],
  ]));
  const sharedAssets = { fetched_at: '2026-01-01T00:00:00Z', assets: assetValues };
  const result = prepareFunds({
    securities: [stock('A', 100), ...pairs.flatMap(([first, second]) => [fund(first), fund(second)])],
  }, sharedAssets);
  assert.deepEqual(result.mappedPortfolios.map((portfolio) => portfolio.symbols), pairs);
  assert.deepEqual(result.mappedPortfolios.map((portfolio) => portfolio.netAssets), [1000, 2000, 3000, 4000]);
  assert.deepEqual(result.mappedPortfolios.map((portfolio) => portfolio.marketCap), [1000, 2000, 3000, 4000]);
  assert.equal(result.mappedPortfolios[0].upside, result.funds[0].upside);
});

test('shared portfolio rejects conflicting pooled asset values', () => {
  const sharedAssets = { fetched_at: '2026-01-01T00:00:00Z', assets: { VFIAX: 1000, VOO: 900 } };
  assert.throws(() => prepareFunds({
    securities: [stock('A', 100), fund('VFIAX'), fund('VOO')],
  }, sharedAssets), /Conflicting pooled net assets for VFIAX and VOO/);
});

test('S&P 500 ETFs use their own reported holdings weights for upside', () => {
  const securities = [
    stock('A', 100, 10),
    stock('B', 200, 30),
    stock('C', 300, 90),
    fund('SPY'),
    fund('IVV'),
    fund('SPYM'),
  ];
  const holdings = { funds: {
    SPY: { as_of: '2026-01-01', source: 'https://www.ssga.com/test',
      holdings: [{ symbol: 'A', weight: 0.8 }, { symbol: 'B', weight: 0.1 }, { symbol: 'C', weight: 0.1 }] },
    IVV: { as_of: '2026-01-01', source: 'https://www.ishares.com/test',
      holdings: [{ symbol: 'A', weight: 0.1 }, { symbol: 'B', weight: 0.1 }, { symbol: 'C', weight: 0.8 }] },
    SPYM: { as_of: '2026-01-01', source: 'https://www.ssga.com/test',
      holdings: [{ symbol: 'A', weight: 0.1 }, { symbol: 'B', weight: 0.8 }, { symbol: 'C', weight: 0.1 }] },
  } };
  const result = prepareFunds({ securities }, {
    fetched_at: '2026-01-01T00:00:00Z', assets: { SPY: 100, IVV: 100, SPYM: 100 },
  }, holdings, Date.parse('2026-01-02T00:00:00Z'));
  const estimates = result.funds.map((entry) => entry.upside);
  assert.ok(estimates.every(Number.isFinite));
  assert.equal(new Set(estimates).size, 3);
  assert.ok(result.funds.every((entry) => entry.method === 'holdings' && entry.holdingCoverage === 1));
});

test('holdings-based valuation uses each actual holding weight and requires coverage and freshness', () => {
  const a = stock('A', 100, 10);
  const b = stock('BRK-B', 300, 10);
  const snapshot = { securities: [a, b, fund('F', 'Total U.S. stock market')] };
  const portfolio = { as_of: '2026-01-01', source: 'https://www.ishares.com/test',
    holdings: [{ symbol: 'A', weight: 0.6 }, { symbol: 'BRK B', weight: 0.2 }, { symbol: 'UNKNOWN', weight: 0.2 }] };
  const holdings = { funds: { F: portfolio } };
  const now = Date.parse('2026-01-02T00:00:00Z');
  const result = prepareFunds(snapshot, assets, holdings, now).funds[0];
  const expected = (0.6 * discountedCashFlowUpside(a) + 0.2 * discountedCashFlowUpside(b)) / 0.8;
  assert.ok(Math.abs(result.upside - expected) < 1e-10);
  assert.ok(Math.abs(result.holdingCoverage - 0.8) < 1e-10);
  assert.equal(result.method, 'holdings');
  assert.equal(prepareFunds(snapshot, assets, holdings, Date.parse('2026-03-01T00:00:00Z')).funds[0].upside, null);
  portfolio.holdings[1].weight = 0.19;
  assert.equal(prepareFunds(snapshot, assets, holdings, now).funds[0].upside, null);
  portfolio.holdings[1].weight = -1;
  assert.throws(() => prepareFunds(snapshot, assets, holdings, now));
});
