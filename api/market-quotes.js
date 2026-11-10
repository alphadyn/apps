const ALLOWED_ORIGINS = new Set([
  'https://alphadyn.github.io',
  'https://ai-orcin-eta-15.vercel.app',
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  'http://127.0.0.1:8765',
  'http://localhost:8765',
]);

export function parseSymbols(value) {
  if (typeof value !== 'string') throw new Error('Provide a comma-separated symbols parameter.');
  const symbols = [...new Set(value.split(',').map((symbol) => symbol.trim().toUpperCase()))];
  if (!symbols.length || symbols.length > 20 || symbols.some((symbol) => !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(symbol))) {
    throw new Error('Request between 1 and 20 valid ticker symbols.');
  }
  return symbols;
}

export function parseQuotes(payload, symbols) {
  if (payload?.spark?.error) throw new Error('Yahoo Finance could not load quotes.');
  if (!Array.isArray(payload?.spark?.result)) throw new Error('Yahoo Finance returned an invalid quote response.');
  const quotes = [];
  for (const result of payload.spark.result) {
    const meta = result.response?.[0]?.meta;
    if (!symbols.includes(result.symbol) || !meta || meta.currency !== 'USD'
      || !Number.isFinite(meta.regularMarketPrice) || meta.regularMarketPrice <= 0
      || !Number.isFinite(meta.regularMarketTime) || meta.regularMarketTime <= 0
      || !Number.isFinite(new Date(meta.regularMarketTime * 1000).getTime())) continue;
    quotes.push({
      symbol: result.symbol,
      price: meta.regularMarketPrice,
      timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
    });
  }
  if (!quotes.length) throw new Error('Yahoo Finance returned no usable quotes.');
  return {
    quotes,
    missing: symbols.filter((symbol) => !quotes.some((quote) => quote.symbol === symbol)),
  };
}

export function parseMarketCaps(payload) {
  const data = payload?.data;
  const rows = data?.table?.rows;
  if (payload?.status?.rCode !== 200 || !Array.isArray(rows) || !rows.length
    || !Number.isInteger(Number(data.totalrecords)) || Number(data.totalrecords) < 1
    || rows.length < Number(data.totalrecords)) {
    throw new Error('Nasdaq returned an invalid or incomplete market-cap response.');
  }
  const positiveNumber = (value) => {
    const number = Number(String(value ?? '').replace(/[$,]/g, '').trim());
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const marketCaps = rows.flatMap((row) => {
    const symbol = String(row.symbol || '').trim().toUpperCase().replace(/[./]/g, '-');
    const marketCap = positiveNumber(row.marketCap);
    const price = positiveNumber(row.lastsale);
    return symbol && marketCap && price ? [{ symbol, market_cap: marketCap, price }] : [];
  });
  if (!marketCaps.length) throw new Error('Nasdaq returned no usable market caps.');
  return { marketCaps, as_of: data.asof || null };
}

export default async function handler(request, response) {
  const origin = request.headers.origin;
  response.setHeader('Vary', 'Origin');
  if (ALLOWED_ORIGINS.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, OPTIONS');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (request.query.marketCaps === '1') {
    try {
      const url = new URL('https://api.nasdaq.com/api/screener/stocks');
      url.search = new URLSearchParams({
        tableonly: 'true', limit: '10000', offset: '0', exchange: 'all',
        sortColumn: 'marketCap', sortOrder: 'DESC',
      }).toString();
      const upstream = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MarketInsights/1.0)',
          Accept: 'application/json',
          Referer: 'https://www.nasdaq.com/',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!upstream.ok) throw new Error(`Nasdaq returned HTTP ${upstream.status}.`);
      const result = parseMarketCaps(await upstream.json());
      response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
      return response.status(200).json({ ...result, fetched_at: new Date().toISOString() });
    } catch (error) {
      return response.status(502).json({
        error: error instanceof Error ? error.message : 'Could not load market valuations.',
      });
    }
  }

  let symbols;
  try {
    symbols = parseSymbols(request.query.symbols);
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }

  try {
    const url = new URL('https://query2.finance.yahoo.com/v7/finance/spark');
    url.searchParams.set('symbols', symbols.join(','));
    url.searchParams.set('range', '1d');
    url.searchParams.set('interval', '1d');
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketInsights/1.0)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) throw new Error(`Yahoo Finance returned HTTP ${upstream.status}.`);
    const result = parseQuotes(await upstream.json(), symbols);
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    return response.status(200).json({ ...result, fetched_at: new Date().toISOString() });
  } catch (error) {
    return response.status(502).json({
      error: error instanceof Error ? error.message : 'Could not load market quotes.',
    });
  }
}
