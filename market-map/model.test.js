import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareMarket, treemap, upsideColor, upsideTextColor, matches, money, percent } from './model.js';

const stock = (symbol, cap, extra = {}) => ({
  symbol, name: `${symbol} company`, market_cap: cap, price: 100,
  net_income: 10, net_income_change_1y: .04, ...extra,
});

test('all stock tickers retained, funds excluded, issuer caps counted once', () => {
  const market = prepareMarket({ securities: [
    stock('A', 100, { cik: 1 }), stock('AA', 101, { cik: 1 }),
    stock('B', 50), stock('C', null), stock('F', 900, { asset_type: 'fund' }),
  ] });
  assert.equal(market.stockCount, 4);
  assert.equal(market.companies.length, 3);
  assert.equal(market.total, 150);
  assert.deepEqual(market.mapped[0].symbols, ['A', 'AA']);
  assert.equal(market.missing[0].id, 'C');
  assert.equal(market.missing[0].upside, null);
  assert.ok(matches(market.mapped[0], 'aa'));
  assert.ok(matches(market.mapped[0], 'company'));
  assert.equal(matches(market.mapped[0], 'xyz'), false);
});

test('selects a usable share-class cap and rejects invalid snapshots', () => {
  const market = prepareMarket({ securities: [
    stock('A', null, { cik: 1 }), stock('AA', 100, { cik: 1 }),
    stock('B', -1), stock('C', Infinity),
  ] });
  assert.equal(market.total, 100);
  assert.equal(market.mapped[0].id, 'AA');
  assert.equal(market.missing.length, 2);
  for (const payload of [{}, { securities: [] }, { securities: [{}] },
    { securities: [stock('A', 1), stock('A', 2)] },
    { securities: [stock('F', 1, { asset_type: 'fund' })] }]) {
    assert.throws(() => prepareMarket(payload));
  }
});

test('missing/nonpositive earnings remain neutral, not a fabricated downside', () => {
  for (const income of [null, 0, -1]) {
    const company = prepareMarket({ securities: [stock('A', 100, { net_income: income })] }).mapped[0];
    assert.equal(company.upside, null);
    assert.equal(upsideColor(company.upside), '#454d5c');
    assert.equal(upsideTextColor(company.upside), '#ffffff');
  }
});

test('colors retain sign and strictly darken even for extreme upside', () => {
  const lightness = (color) => Number(color.match(/ ([\d.]+)%\)$/)[1]);
  assert.notEqual(upsideColor(0), upsideColor(null));
  assert.equal(upsideColor(0), '#8a8a8a');
  for (const [sign, hue] of [[-1, 5], [1, 140]]) {
    const colors = [.01, .5, 1, 5, 100].map((value) => upsideColor(sign * value));
    assert.ok(colors.every((color) => color.startsWith(`hsl(${hue} `)));
    for (let index = 1; index < colors.length; index += 1) {
      assert.ok(lightness(colors[index]) < lightness(colors[index - 1]));
    }
    assert.equal(upsideTextColor(sign * .01), '#000000');
    assert.equal(upsideTextColor(sign * 100), '#ffffff');
  }
});

test('treemap fills viewport with exact proportional areas, bounds, and no overlaps', () => {
  const companies = Array.from({ length: 503 }, (_, index) => ({
    id: `${index}`, marketCap: (504 - index) ** 2,
  }));
  const total = companies.reduce((sum, company) => sum + company.marketCap, 0);
  for (const [width, height] of [[1440, 700], [370, 480], [820, 180], [1, 1]]) {
    const tiles = treemap(companies, width, height);
    assert.equal(tiles.length, companies.length);
    let area = 0;
    for (const tile of tiles) {
      assert.ok(tile.width > 0 && tile.height > 0);
      assert.ok(tile.x >= -1e-7 && tile.y >= -1e-7);
      assert.ok(tile.x + tile.width <= width + 1e-7);
      assert.ok(tile.y + tile.height <= height + 1e-7);
      const actual = tile.width * tile.height;
      const expected = tile.company.marketCap / total * width * height;
      assert.ok(Math.abs(actual - expected) < 1e-7);
      area += actual;
    }
    assert.ok(Math.abs(area - width * height) < 1e-6);
    for (let index = 0; index < tiles.length; index += 1) {
      for (const other of tiles.slice(index + 1)) {
        const tile = tiles[index];
        const overlapX = Math.min(tile.x + tile.width, other.x + other.width) - Math.max(tile.x, other.x);
        const overlapY = Math.min(tile.y + tile.height, other.y + other.height) - Math.max(tile.y, other.y);
        assert.ok(overlapX < 1e-7 || overlapY < 1e-7);
      }
    }
  }
});

test('empty, invalid, and single-tile layouts and financial formatting', () => {
  assert.deepEqual(treemap([], 100, 100), []);
  assert.deepEqual(treemap([{ marketCap: null }], 100, 100), []);
  assert.deepEqual(treemap([{ marketCap: 1 }], 0, 100), []);
  const [tile] = treemap([{ marketCap: 42 }], 100, 200);
  assert.equal(tile.width * tile.height, 20000);
  assert.equal(money(1e12), '$1.00T');
  assert.equal(money(null), 'Unavailable');
  assert.equal(percent(.25), '+25.0%');
  assert.equal(percent(-.25), '-25.0%');
  assert.equal(percent(null), 'N/A');
});
