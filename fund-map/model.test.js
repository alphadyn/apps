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

test('funds without reported holdings do not use an index proxy', () => {
  const a = stock('A', 100, 10);
  const b = stock('B', 300, 30);
  const result = prepareFunds({ securities: [a, b, fund('F', 'S&P 500', 50), fund('G', 'S&P 500', 200), fund('H', 'U.S. bonds')] }, assets);
  assert.ok(result.funds.every((entry) => entry.upside === null && entry.fairValue === null));
  assert.ok(result.funds.every((entry) => entry.method === 'unavailable'));
  assert.deepEqual(result.funds.map((entry) => entry.marketCap), [100, 300, 600]);
});

test('missing quotes and coverage do not produce a valuation', () => {
  const portfolio = { as_of: '2026-01-01', source: 'https://www.ishares.com/test',
    holdings: [{ symbol: 'A', weight: 1 }] };
  const holdings = { funds: { F: portfolio } };
  const now = Date.parse('2026-01-02T00:00:00Z');
  const missingQuote = prepareFunds({ securities: [stock('A', 100), fund('F', 'S&P 500', null)] }, assets, holdings, now);
  assert.equal(missingQuote.funds[0].upside, null);
  assert.equal(missingQuote.funds[0].fairValue, null);
  const insufficient = prepareFunds({ securities: [stock('A', null), fund('F')] }, assets, holdings, now);
  assert.equal(insufficient.funds[0].upside, null);
  assert.equal(prepareFunds({ securities: [stock('A', 100, null), fund('F')] }, assets, holdings, now).funds[0].upside, null);
});

test('invalid fund records are rejected', () => {
  const entries = [stock('A', 100), { ...stock('AA', 100), cik: 1 }, { ...stock('B', 200), cik: 1 }];
  assert.throws(() => prepareFunds({ securities: [...entries, fund('F'), fund('F')] }, assets));
  assert.throws(() => prepareFunds({ securities: entries }, assets));
});

test('invalid or missing assets exclude funds from the map, but preserve search and valuation', () => {
  const snapshot = { fetched_at: '2026-01-01T00:00:00Z', assets: { F: 100, G: -1, H: '600' } };
  const result = prepareFunds({ securities: [stock('A', 100), fund('F'), fund('G'), fund('H'), fund('I')] }, snapshot);
  assert.deepEqual(result.mapped.map((entry) => entry.id), ['F']);
  assert.deepEqual(result.missing.map((entry) => entry.id), ['G', 'H', 'I']);
  assert.ok(result.missing.every((entry) => entry.marketCap === null && entry.upside === null));
  assert.throws(() => prepareFunds({ securities: [stock('A', 100), fund('F')] }, {}));
});

test('bond holdings are never valued as equities even if an identifier matches', () => {
  const snapshot = { securities: [stock('A', 100), fund('F', 'U.S. bonds')] };
  const holdings = { funds: { F: { as_of: '2026-01-01',
    source: 'https://investor.vanguard.com/vmf/api/test', asset_class: 'bond',
    holdings: [{ symbol: 'A', weight: 1 }] } } };
  const result = prepareFunds(snapshot, assets, holdings, Date.parse('2026-01-02T00:00:00Z')).funds[0];
  assert.equal(result.holdingCoverage, 0);
  assert.equal(result.upside, null);
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

test('SEC holdings support a disclosed 120-day freshness window', () => {
  const a = stock('A', 100);
  const snapshot = { securities: [a, fund('F', 'S&P 500')] };
  const holdings = { funds: { F: {
    as_of: '2026-01-01',
    source: 'https://www.sec.gov/Archives/edgar/data/819118/test/primary_doc.xml',
    holdings: [{ symbol: 'A', weight: 0.9 }, { symbol: 'UNKNOWN', weight: 0.1 }],
  } } };
  const onLimit = prepareFunds(snapshot, assets, holdings, Date.parse('2026-05-01T00:00:00Z')).funds[0];
  assert.ok(Number.isFinite(onLimit.upside));
  assert.equal(onLimit.holdingMaxAgeDays, 120);
  const stale = prepareFunds(snapshot, assets, holdings, Date.parse('2026-05-02T00:00:00Z')).funds[0];
  assert.equal(stale.upside, null);
});

test('Vanguard holdings are accepted with the standard freshness limit', () => {
  const a = stock('A', 100);
  const snapshot = { securities: [a, fund('VFIAX'), fund('VOO')] };
  const portfolio = {
    as_of: '2026-01-01',
    source: 'https://investor.vanguard.com/vmf/api/VFIAX/portfolio-holding/stock.json?start=1&count=20000',
    holdings: [{ symbol: 'A', weight: 1 }],
  };
  const holdings = { funds: { VFIAX: portfolio, VOO: portfolio } };
  const fundAssets = { fetched_at: '2026-01-01T00:00:00Z', assets: { VFIAX: 1000, VOO: 1000 } };
  const result = prepareFunds(snapshot, fundAssets, holdings, Date.parse('2026-01-02T00:00:00Z'));
  assert.ok(Number.isFinite(result.funds[0].upside));
  assert.equal(result.funds[0].upside, result.funds[1].upside);
  assert.equal(result.funds[0].holdingMaxAgeDays, 45);
  assert.equal(result.mappedPortfolios[0].upside, result.funds[0].upside);
});
