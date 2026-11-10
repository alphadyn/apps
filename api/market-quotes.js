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
