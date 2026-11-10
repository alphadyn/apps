export const QUOTE_REFRESH_MS = 60_000;

export function quoteApiUrl(hostname) {
  return hostname.endsWith('github.io') || ['localhost', '127.0.0.1'].includes(hostname)
    ? 'https://ai-orcin-eta-15.vercel.app/api/market-quotes'
    : '/api/market-quotes';
}

export async function fetchQuotes(symbols, { url, signal, fetcher = fetch }) {
  const batches = [];
  for (let index = 0; index < symbols.length; index += 20) batches.push(symbols.slice(index, index + 20));
  const quotes = [];
  const errors = [];
  let next = 0;
  async function worker() {
    while (next < batches.length) {
      const batch = batches[next++];
      try {
        const response = await fetcher(`${url}?symbols=${encodeURIComponent(batch.join(','))}`, {
          cache: 'no-store',
          signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(15_000)]),
        });
        if (!response.ok) throw new Error(`Quote service returned HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.quotes)) throw new Error('Invalid quote response');
        const usable = payload.quotes.filter((quote) => batch.includes(quote.symbol)
          && Number.isFinite(quote.price) && quote.price > 0
          && Number.isFinite(Date.parse(quote.timestamp)));
        quotes.push(...usable);
        const missing = batch.filter((symbol) => !usable.some((quote) => quote.symbol === symbol));
        if (missing.length) errors.push(`No quote for ${missing.join(', ')}`);
      } catch (error) {
        if (signal?.aborted) throw error;
        errors.push(`${batch.join(', ')}: ${error.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, batches.length) }, worker));
  return { quotes, errors };
}

export async function fetchMarketData(symbols, { url, signal, fetcher = fetch }) {
  const capsRequest = (async () => {
    try {
      const response = await fetcher(`${url}?marketCaps=1`, {
        cache: 'no-store',
        signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(15_000)]),
      });
      if (!response.ok) throw new Error(`Valuation service returned HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.marketCaps) || !payload.marketCaps.length
        || payload.marketCaps.some((entry) => typeof entry?.symbol !== 'string'
          || !Number.isFinite(entry.market_cap) || entry.market_cap <= 0
          || !Number.isFinite(entry.price) || entry.price <= 0)) throw new Error('Invalid market-cap response');
      return { marketCaps: payload.marketCaps, marketCapAsOf: payload.as_of, errors: [] };
    } catch (error) {
      if (signal?.aborted) throw error;
      return { marketCaps: [], errors: [`Market valuations unavailable: ${error.message}`] };
    }
  })();
  const [quotes, caps] = await Promise.all([fetchQuotes(symbols, { url, signal, fetcher }), capsRequest]);
  return { ...quotes, ...caps, errors: [...quotes.errors, ...caps.errors] };
}

export function applyQuotes(securities, quotes, marketCaps = [], marketCapAsOf = null) {
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const capsBySymbol = new Map(marketCaps.map((entry) => [entry.symbol, entry]));
  return securities.map((security) => {
    const symbol = security.symbol.replace(/\./g, '-');
    const received = bySymbol.get(symbol);
    const quote = received && !(security.quote_at && Date.parse(received.timestamp) < Date.parse(security.quote_at))
      && !(!security.quote_at && security.price_date && received.timestamp.slice(0, 10) < security.price_date)
      ? received : null;
    const cap = security.asset_type === 'fund' ? null : capsBySymbol.get(symbol);
    if (!quote && !cap) return security;
    const basePrice = security.snapshot_price ?? security.price;
    const baseCap = security.snapshot_market_cap ?? security.market_cap;
    const basePE = security.snapshot_pe ?? security.pe;
    const price = quote?.price ?? security.price;
    const capBase = cap?.market_cap ?? security.valuation_market_cap ?? baseCap;
    const capPrice = cap?.price ?? security.valuation_price ?? basePrice;
    const ratio = Number.isFinite(basePrice) && basePrice > 0 ? price / basePrice : null;
    const marketCap = security.asset_type !== 'fund' && Number.isFinite(price) && price > 0
      && Number.isFinite(capBase) && capBase > 0 && Number.isFinite(capPrice) && capPrice > 0
      ? capBase * price / capPrice : null;
    return {
      ...security,
      snapshot_price: basePrice,
      snapshot_market_cap: baseCap,
      snapshot_pe: basePE,
      price,
      quote_at: quote?.timestamp ?? security.quote_at,
      valuation_market_cap: capBase,
      valuation_price: capPrice,
      market_cap_as_of: cap ? marketCapAsOf : security.market_cap_as_of,
      market_cap_stale: cap ? false : security.market_cap_stale,
      market_cap: marketCap,
      pe: marketCap > 0 && security.net_income > 0 ? marketCap / security.net_income
        : Number.isFinite(basePE) && ratio !== null ? basePE * ratio : null,
    };
  });
}

export function createQuotePoller({ load, onUpdate, onError, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let controller;
  let timer;
  let generation = 0;
  function stop() {
    generation += 1;
    clearTimer(timer);
    controller?.abort();
    controller = null;
  }
  async function refresh(id) {
    if (id !== generation) return;
    controller = new AbortController();
    try {
      const result = await load(controller.signal);
      if (id === generation) onUpdate(result);
    } catch (error) {
      if (id === generation) onError(error);
    } finally {
      if (id === generation) {
        controller = null;
        timer = setTimer(() => refresh(id), QUOTE_REFRESH_MS);
      }
    }
  }
  return {
    start() {
      stop();
      return refresh(generation);
    },
    stop,
  };
}
