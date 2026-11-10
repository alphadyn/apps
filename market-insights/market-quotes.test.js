import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { parseMarketCaps, parseQuotes, parseSymbols } from '../api/market-quotes.js';

const payload = {
  spark: {
    result: [
      { symbol: 'ABC', response: [{ meta: { currency: 'USD', regularMarketPrice: 120, regularMarketTime: 1794344400 } }] },
      { symbol: 'MISSING', response: [] },
    ],
    error: null,
  },
};

const capPayload = {
  status: { rCode: 200 },
  data: {
    totalrecords: 4, asof: 'Last price as of Nov 9, 2026',
    table: { rows: [
      { symbol: 'ABC', marketCap: '2,000', lastsale: '$100.00' },
      { symbol: 'BRK/B', marketCap: '3,000', lastsale: '$500.00' },
      { symbol: 'BF/B', marketCap: 'NA', lastsale: '$30.00' },
      { symbol: 'INVALID', marketCap: 'Infinity', lastsale: '$30.00' },
    ] },
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

test('market-cap parsing uses actual finite provider values and normalizes class shares', () => {
  assert.deepEqual(parseMarketCaps(capPayload), {
    marketCaps: [
      { symbol: 'ABC', market_cap: 2000, price: 100 },
      { symbol: 'BRK-B', market_cap: 3000, price: 500 },
    ],
    as_of: capPayload.data.asof,
  });
  for (const invalid of [{}, { data: null, status: { rCode: 400 } },
    { ...capPayload, data: { ...capPayload.data, totalrecords: 5 } },
    { ...capPayload, data: { ...capPayload.data, totalrecords: 0 } },
    { ...capPayload, data: { totalrecords: 1, table: { rows: [{ symbol: 'ABC', marketCap: 'NA' }] } } },
  ]) {
    assert.throws(() => parseMarketCaps(invalid));
  }
});

test('market-cap mode fetches the complete screener once and caches valuations separately', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls += 1;
    assert.equal(url.hostname, 'api.nasdaq.com');
    assert.equal(url.searchParams.get('limit'), '10000');
    assert.equal(url.searchParams.get('offset'), '0');
    assert.ok(options.signal);
    return { ok: true, json: async () => capPayload };
  });
  const response = responseMock();
  await handler({ method: 'GET', headers: {}, query: { marketCaps: '1' } }, response);
  assert.equal(calls, 1);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.marketCaps.length, 2);
  assert.match(response.headers['Cache-Control'], /s-maxage=3600/);
});

test('market-cap provider failures are explicit and never cached as successful valuations', async (t) => {
  const upstream = t.mock.method(globalThis, 'fetch');
  for (const failure of [
    { ok: false, status: 403 },
    { ok: true, json: async () => ({ data: null }) },
    { ok: true, json: async () => ({ ...capPayload, data: { ...capPayload.data, totalrecords: 5000 } }) },
  ]) {
    upstream.mock.mockImplementation(async () => failure);
    const response = responseMock();
    await handler({ method: 'GET', headers: {}, query: { marketCaps: '1' } }, response);
    assert.equal(response.statusCode, 502);
    assert.match(response.body.error, /Nasdaq/);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
});
