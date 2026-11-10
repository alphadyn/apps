import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { parseQuotes, parseSymbols } from '../api/market-quotes.js';

const payload = {
  spark: {
    result: [
      { symbol: 'ABC', response: [{ meta: { currency: 'USD', regularMarketPrice: 120, regularMarketTime: 1794344400 } }] },
      { symbol: 'MISSING', response: [] },
    ],
    error: null,
  },
};

function responseMock() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

test('symbol validation normalizes, deduplicates and bounds requests', () => {
  assert.deepEqual(parseSymbols('aapl, MSFT,aapl,BRK-B'), ['AAPL', 'MSFT', 'BRK-B']);
  for (const value of [undefined, [], '', 'ABC,', 'https://example.com', '<script>', Array.from({ length: 21 }, (_, i) => `S${i}`).join(',')]) {
    assert.throws(() => parseSymbols(value));
  }
});

test('Yahoo spark metadata provides timestamped quotes with explicit missing symbols', () => {
  const result = parseQuotes(payload, ['ABC', 'MISSING']);
  assert.equal(result.quotes[0].symbol, 'ABC');
  assert.equal(result.quotes[0].price, 120);
  assert.equal(result.quotes[0].timestamp, '2026-11-10T21:00:00.000Z');
  assert.deepEqual(result.missing, ['MISSING']);
  for (const invalid of [{}, { spark: { error: { code: 'Bad Request' } } }, { spark: { result: [] } }]) {
    assert.throws(() => parseQuotes(invalid, ['ABC']));
  }
});

test('invalid prices, currencies and timestamps are not reported as usable quotes', () => {
  for (const override of [
    { regularMarketPrice: 0 }, { regularMarketPrice: null }, { regularMarketPrice: '120' },
    { currency: 'CAD' }, { regularMarketTime: null }, { regularMarketTime: 1e100 },
  ]) {
    const invalid = structuredClone(payload);
    Object.assign(invalid.spark.result[0].response[0].meta, override);
    assert.throws(() => parseQuotes(invalid, ['ABC']));
  }
  assert.throws(() => parseQuotes(payload, ['UNREQUESTED']));
});

test('handler handles CORS, preflight, methods and validation without an upstream request', async () => {
  for (const [method, symbols, expected] of [['OPTIONS', '', 204], ['POST', '', 405], ['GET', '', 400]]) {
    const response = responseMock();
    await handler({ method, headers: { origin: 'https://alphadyn.github.io' }, query: { symbols } }, response);
    assert.equal(response.statusCode, expected);
    assert.equal(response.headers['Access-Control-Allow-Origin'], 'https://alphadyn.github.io');
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
  const response = responseMock();
  await handler({ method: 'OPTIONS', headers: { origin: 'https://untrusted.test' } }, response);
  assert.equal(response.headers['Access-Control-Allow-Origin'], undefined);
});

test('handler requests compact batch data and caches only successful responses', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.hostname, 'query2.finance.yahoo.com');
    assert.equal(url.searchParams.get('symbols'), 'ABC,MISSING');
    assert.equal(url.searchParams.get('interval'), '1d');
    assert.ok(options.signal);
    return { ok: true, json: async () => payload };
  });
  const response = responseMock();
  await handler({ method: 'GET', headers: {}, query: { symbols: 'ABC,MISSING' } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.quotes.length, 1);
  assert.deepEqual(response.body.missing, ['MISSING']);
  assert.ok(Number.isFinite(Date.parse(response.body.fetched_at)));
  assert.match(response.headers['Cache-Control'], /s-maxage=60/);
});

test('upstream failures return explicit non-cacheable errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 429 }));
  const response = responseMock();
  await handler({ method: 'GET', headers: {}, query: { symbols: 'ABC' } }, response);
  assert.equal(response.statusCode, 502);
  assert.match(response.body.error, /429/);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});
