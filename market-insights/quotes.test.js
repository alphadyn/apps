import test from 'node:test';
import assert from 'node:assert/strict';
import { applyQuotes, createQuotePoller, fetchMarketData, fetchQuotes, QUOTE_REFRESH_MS, quoteApiUrl } from './quotes.js';
import { discountedCashFlowValue, discountedCashFlowUpside, marketCapDescription } from './ranking.js';

const timestamp = '2026-11-10T20:00:00.000Z';
const quote = (symbol, price = 120) => ({ symbol, price, timestamp });
const stock = {
  symbol: 'ABC', price: 100, price_date: '2026-11-09', market_cap: 1000,
  net_income: 100, pe: 10, performance: { '1y': 0.1 },
};

test('quotes scale valuation from immutable snapshot values without compounding', () => {
  const [first] = applyQuotes([stock], [quote('ABC')]);
  const [second] = applyQuotes([first], [quote('ABC', 110)]);
  assert.equal(first.price, 120);
  assert.equal(first.market_cap, 1200);
  assert.equal(first.pe, 12);
  assert.equal(second.market_cap, 1100);
  assert.equal(second.pe, 11);
  assert.equal(second.snapshot_price, 100);
  assert.equal(second.price_date, stock.price_date);
  assert.equal(second.performance, stock.performance);
  assert.equal(second.net_income, 100);
  assert.equal(stock.price, 100);
  assert.equal(discountedCashFlowValue(first), discountedCashFlowValue(stock));
  assert.notEqual(discountedCashFlowUpside(first), discountedCashFlowUpside(stock));
});

test('funds, unpriced securities and class-share symbols are handled without fabricating valuations', () => {
  const securities = [
    { symbol: 'FUND', asset_type: 'fund', price: 100, market_cap: null, pe: null },
    { symbol: 'NEW', price: null, market_cap: null },
    { ...stock, symbol: 'BRK.B' },
  ];
  const result = applyQuotes(securities, [quote('FUND'), quote('NEW'), quote('BRK-B')]);
  assert.equal(result[0].market_cap, null);
  assert.equal(result[0].pe, null);
  assert.equal(result[1].price, 120);
  assert.equal(result[1].market_cap, null);
  assert.equal(result[2].price, 120);
});

test('missing and older quotes preserve last values', () => {
  const [current] = applyQuotes([stock], [quote('ABC')]);
  assert.equal(applyQuotes([current], [])[0], current);
  assert.equal(applyQuotes([current], [{ ...quote('ABC'), timestamp: '2026-11-09T20:00:00Z' }])[0], current);
  assert.equal(applyQuotes([stock], [{ ...quote('ABC'), timestamp: '2026-11-08T20:00:00Z' }])[0], stock);
});

test('runtime market caps recover missing stock valuations and DCF upside', () => {
  const missing = { ...stock, symbol: 'BRK.B', market_cap: null, pe: null };
  const caps = [{ symbol: 'BRK-B', market_cap: 2000, price: 100 }];
  const [recovered] = applyQuotes([missing], [quote('BRK-B', 120)], caps, 'Last price as of Nov 9, 2026');
  assert.equal(recovered.market_cap, 2400);
  assert.equal(recovered.pe, 24);
  assert.ok(Number.isFinite(discountedCashFlowValue(recovered)));
  assert.ok(Number.isFinite(discountedCashFlowUpside(recovered)));
  assert.equal(recovered.market_cap_as_of, 'Last price as of Nov 9, 2026');
  const [next] = applyQuotes([recovered], [quote('BRK-B', 110)]);
  assert.equal(next.market_cap, 2200);
  assert.equal(next.pe, 22);
  assert.equal(discountedCashFlowValue(next), discountedCashFlowValue(recovered));
});

test('new valuation bases update without compounding and survive a later cap outage', () => {
  const [first] = applyQuotes([stock], [quote('ABC', 120)], [{ symbol: 'ABC', market_cap: 2000, price: 100 }]);
  const [second] = applyQuotes([first], [quote('ABC', 120)], [{ symbol: 'ABC', market_cap: 3300, price: 110 }]);
  const [third] = applyQuotes([second], [quote('ABC', 130)]);
  assert.equal(first.market_cap, 2400);
  assert.equal(second.market_cap, 3600);
  assert.equal(third.market_cap, 3900);
  assert.equal(third.pe, 39);
});

test('market caps recover even when quotes fail, but funds and nonpositive earnings are not valued', () => {
  const caps = [{ symbol: 'ABC', market_cap: 2000, price: 100 }];
  const [capOnly] = applyQuotes([{ ...stock, market_cap: null, pe: null }], [], caps);
  assert.equal(capOnly.market_cap, 2000);
  assert.equal(capOnly.pe, 20);
  for (const net_income of [null, 0, -100]) {
    const [result] = applyQuotes([{ ...stock, market_cap: null, pe: null, net_income }], [quote('ABC')], caps);
    assert.equal(result.market_cap, 2400);
    assert.equal(result.pe, null);
    assert.equal(discountedCashFlowUpside(result), null);
  }
  const [fund] = applyQuotes([{ symbol: 'ABC', asset_type: 'fund', price: 100 }], [quote('ABC')], caps);
  assert.equal(fund.market_cap, null);
  assert.equal(fund.pe, null);
});

test('fresh runtime valuations replace retained estimates and clear their warning without changing earnings', () => {
  const retained = { ...stock, market_cap_stale: true, market_cap_as_of: '2026-11-01' };
  const [quoted] = applyQuotes([retained], [quote('ABC')]);
  assert.equal(quoted.market_cap_stale, true);
  assert.equal(quoted.market_cap_as_of, '2026-11-01');
  const [fresh] = applyQuotes([quoted], [quote('ABC')], [{ symbol: 'ABC', market_cap: 2000, price: 100 }], 'Nov 10');
  assert.equal(fresh.market_cap_stale, false);
  assert.equal(fresh.market_cap_as_of, 'Nov 10');
  assert.equal(fresh.market_cap, 2400);
  assert.equal(fresh.net_income, 100);
  assert.match(marketCapDescription(quoted), /Retained last-known market cap: 2026-11-01/);
  assert.match(marketCapDescription(fresh), /Nasdaq market cap: Nov 10/);
  assert.equal(marketCapDescription({ asset_type: 'fund' }), 'Not applicable to funds');
  assert.match(marketCapDescription({ market_cap: null }), /unavailable/);
});

test('market data fetches valuations once alongside quote batches', async () => {
  let capsCalls = 0;
  const result = await fetchMarketData(['ABC'], {
    url: 'https://example.test/quotes',
    fetcher: async (url) => ({
      ok: true,
      json: async () => {
        if (url.endsWith('?marketCaps=1')) {
          capsCalls += 1;
          return { marketCaps: [{ symbol: 'ABC', market_cap: 2000, price: 100 }], as_of: 'Nov 9' };
        }
        return { quotes: [quote('ABC')] };
      },
    }),
  });
  assert.equal(capsCalls, 1);
  assert.equal(result.marketCaps.length, 1);
  assert.equal(result.quotes.length, 1);
  assert.equal(result.marketCapAsOf, 'Nov 9');
  assert.deepEqual(result.errors, []);
});

test('cache-busted market refresh uses a unique URL for quotes and market caps', async () => {
  const requested = [];
  await fetchMarketData(['ABC'], {
    url: '/quotes',
    cacheBust: 'refresh-123',
    fetcher: async (url) => {
      requested.push(url);
      return url.includes('marketCaps=1')
        ? { ok: true, json: async () => ({ marketCaps: [{ symbol: 'ABC', market_cap: 2000, price: 100 }] }) }
        : { ok: true, json: async () => ({ quotes: [quote('ABC')] }) };
    },
  });
  assert.equal(requested.length, 2);
  assert.ok(requested.every((url) => new URL(url, 'https://example.test').searchParams.get('_') === 'refresh-123'));
});

test('valuation failures keep quotes usable and expose errors instead of claiming complete success', async () => {
  for (const response of [
    { ok: false, status: 502 },
    { ok: true, json: async () => ({ marketCaps: [] }) },
    { ok: true, json: async () => ({ marketCaps: [{ symbol: 'ABC', market_cap: 0, price: 100 }] }) },
    { ok: true, json: async () => ({ marketCaps: [null] }) },
  ]) {
    const result = await fetchMarketData(['ABC'], {
      url: '/quotes',
      fetcher: async (url) => url.endsWith('?marketCaps=1') ? response
        : { ok: true, json: async () => ({ quotes: [quote('ABC')] }) },
    });
    assert.deepEqual(result.marketCaps, []);
    assert.equal(result.quotes.length, 1);
    assert.match(result.errors[0], /Market valuations unavailable/);
  }
});

test('quote API follows the repository hosting configuration', () => {
  assert.match(quoteApiUrl('alphadyn.github.io'), /^https:\/\/ai-orcin-eta-15\.vercel\.app\//);
  assert.equal(quoteApiUrl('localhost'), quoteApiUrl('alphadyn.github.io'));
  assert.equal(quoteApiUrl('ai-orcin-eta-15.vercel.app'), '/api/market-quotes');
});

test('fetching batches all securities and caps concurrent requests at three', async () => {
  const symbols = Array.from({ length: 520 }, (_, i) => `S${i}`);
  const sizes = [];
  let active = 0;
  let maxActive = 0;
  const result = await fetchQuotes(symbols, {
    url: 'https://example.test/quotes',
    fetcher: async (url, options) => {
      const batch = new URL(url).searchParams.get('symbols').split(',');
      sizes.push(batch.length);
      assert.equal(options.cache, 'no-store');
      maxActive = Math.max(maxActive, ++active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return { ok: true, json: async () => ({ quotes: batch.map((symbol) => quote(symbol)) }) };
    },
  });
  assert.deepEqual(sizes, Array(26).fill(20));
  assert.equal(maxActive, 3);
  assert.equal(result.quotes.length, 520);
  assert.deepEqual(result.errors, []);
});

test('partial, malformed and failed quote requests produce explicit warnings', async () => {
  const result = await fetchQuotes(['ABC', 'DEF', 'GHI'], {
    url: '/quotes',
    fetcher: async () => ({ ok: true, json: async () => ({
      quotes: [quote('ABC'), quote('DEF', 0), quote('UNREQUESTED'), { ...quote('GHI'), timestamp: 'invalid' }],
    }) }),
  });
  assert.deepEqual(result.quotes, [quote('ABC')]);
  assert.match(result.errors[0], /DEF, GHI/);
  for (const response of [
    { ok: false, status: 502 },
    { ok: true, json: async () => ({}) },
  ]) {
    const failed = await fetchQuotes(['ABC'], { url: '/quotes', fetcher: async () => response });
    assert.equal(failed.quotes.length, 0);
    assert.equal(failed.errors.length, 1);
  }
});

test('aborted quote requests do not turn into a successful partial refresh', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchQuotes(['ABC'], {
    url: '/quotes',
    signal: controller.signal,
    fetcher: async (_, { signal }) => { signal.throwIfAborted(); },
  }), { name: 'AbortError' });
});

test('polling refreshes immediately, schedules 60 seconds after completion, and cancels on stop', async () => {
  let next;
  let delay;
  let calls = 0;
  let updates = 0;
  let cleared;
  const poller = createQuotePoller({
    load: async () => { calls += 1; return { quotes: [], errors: [] }; },
    onUpdate: () => { updates += 1; },
    onError: assert.fail,
    setTimer: (callback, ms) => { next = callback; delay = ms; return 42; },
    clearTimer: (id) => { cleared = id; },
  });
  await poller.start();
  assert.equal(calls, 1);
  assert.equal(updates, 1);
  assert.equal(delay, QUOTE_REFRESH_MS);
  assert.equal(delay, 60_000);
  await next();
  assert.equal(calls, 2);
  poller.stop();
  assert.equal(cleared, 42);
  await next();
  assert.equal(calls, 2);
});

test('stopped and superseded requests cannot update the UI or reschedule', async () => {
  const requests = [];
  let schedules = 0;
  const updates = [];
  const poller = createQuotePoller({
    load: (signal) => new Promise((resolve) => requests.push({ signal, resolve })),
    onUpdate: (result) => updates.push(result),
    onError: assert.fail,
    setTimer: () => { schedules += 1; },
    clearTimer: () => {},
  });
  const first = poller.start();
  const second = poller.start();
  assert.equal(requests[0].signal.aborted, true);
  requests[0].resolve('old');
  await first;
  assert.deepEqual(updates, []);
  requests[1].resolve('current');
  await second;
  assert.deepEqual(updates, ['current']);
  const third = poller.start();
  poller.stop();
  requests[2].resolve('stopped');
  await third;
  assert.deepEqual(updates, ['current']);
  assert.equal(schedules, 1);
});

test('polling reports errors and still schedules a retry', async () => {
  const errors = [];
  let delay;
  const poller = createQuotePoller({
    load: async () => { throw new Error('offline'); },
    onUpdate: assert.fail,
    onError: (error) => errors.push(error.message),
    setTimer: (_, ms) => { delay = ms; },
    clearTimer: () => {},
  });
  await poller.start();
  assert.deepEqual(errors, ['offline']);
  assert.equal(delay, 60_000);
  poller.stop();
});
