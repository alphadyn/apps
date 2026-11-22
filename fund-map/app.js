import { prepareFunds } from './model.js';
import { treemap, upsideColor, upsideTextColor, matches, money, percent } from '../market-map/model.js';
import { applyQuotes, fetchMarketData, quoteApiUrl } from '../market-insights/quotes.js';

const $ = (id) => document.getElementById(id);
let data;
let selected;
let regions = [];
let buttons = [];

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function showDialog(title, children) {
  $('dialog-title').textContent = title;
  $('dialog-body').replaceChildren(...children);
  if (!$('dialog').open) $('dialog').showModal();
}

function inspect(fund) {
  selected = fund;
  $('selected-symbol').textContent = fund.symbols?.join(' / ') || fund.id;
  $('selected-name').textContent = fund.name;
  $('selected-assets').textContent = money(fund.netAssets);
  $('selected-upside').textContent = percent(fund.upside);
  const portfolioId = fund.members ? fund.id
    : data.portfolios.find((portfolio) => portfolio.members.some((member) => member.id === fund.id))?.id;
  for (const button of buttons) button.classList.toggle('selected', button.dataset.id === portfolioId);
}

function clearInspection() {
  selected = undefined;
  $('selected-symbol').textContent = 'Explore funds';
  $('selected-name').textContent = 'Hover, focus, or tap a fund';
  $('selected-assets').textContent = '--';
  $('selected-upside').textContent = '--';
  for (const button of buttons) button.classList.remove('selected');
}

function coverageText(fund) {
  if (fund?.method === 'holdings') {
    return `${fund.id} reported holdings with usable company DCFs cover ${(fund.holdingCoverage * 100).toFixed(1)}% of fund assets by weight. An estimate requires at least 80% coverage and holdings no more than ${fund.holdingMaxAgeDays} days old.`;
  }
  return fund ? 'No reported holdings are available for this fund.' : 'Holdings-based estimates require at least 80% of fund assets to have usable valuations. Open a fund for its coverage.';
}

function sourceText() {
  const generated = data.generatedAt && Number.isFinite(Date.parse(data.generatedAt))
    ? new Date(data.generatedAt).toLocaleString() : 'unknown';
  return `Fund classifications and earnings snapshot generated: ${generated}. Yahoo net assets fetched: ${new Date(data.assetsFetchedAt).toLocaleString()} (provider as-of date unavailable). Nasdaq market-cap data as of: ${data.marketCapAsOf || 'unavailable'}. Quotes, assets, and fundamentals can have different dates.`;
}

function details(fund) {
  inspect(fund);
  const sharedPortfolio = data.portfolios.find((portfolio) => portfolio.members.length > 1
    && portfolio.members.some((member) => member.id === fund.id));
  const facts = node('dl');
  for (const [label, value] of [
    ['Ticker', fund.id], ['Type', fund.type], ['Category', fund.sector],
    [sharedPortfolio ? 'Reported pooled net assets' : 'Reported net assets',
      money(sharedPortfolio?.netAssets ?? fund.netAssets)],
    ['Price / NAV', money(fund.price)],
    ['Quote as of', fund.quoteAt ? new Date(fund.quoteAt).toLocaleString() : 'Unavailable'],
    ['Estimation method', fund.method],
    ['Estimated fair value', money(fund.fairValue)],
    ['Estimated upside', percent(fund.upside)],
  ]) facts.append(node('dt', label), node('dd', value));
  const explanation = fund.holdingsAssetClass === 'bond' && fund.method === 'holdings'
    ? `Bond holdings are reported as of ${fund.holdingsAsOf}, but bond cash-flow valuations and credit-quality inputs are not available. No estimated upside is displayed.`
    : fund.method === 'holdings'
    ? `Based on ${fund.id} reported holdings as of ${fund.holdingsAsOf}. ${fund.holdingsSource.startsWith('https://www.sec.gov/')
      ? 'This SEC N-PORT report can be up to 120 days old. ' : ''}The estimate normalizes over covered holdings; uncovered assets, fees, trading and changes since the holdings date are not modeled.`
    : 'A DCF estimate is unavailable because reported holdings are not in the dataset.';
  const link = node('a', 'Open in Market Insights');
  link.href = `../market-insights/#symbol=${encodeURIComponent(fund.id)}`;
  const content = [facts];
  if (sharedPortfolio) {
    content.push(node('p', `Yahoo reports pooled assets shared by ${sharedPortfolio.symbols.join(' and ')}; the map shows this portfolio once.`));
  }
  content.push(node('p', explanation), node('p', coverageText(fund)), node('p', sourceText()));
  if (fund.holdingsSource) {
    const source = node('a', fund.holdingsSource.startsWith('https://www.sec.gov/')
      ? 'View SEC N-PORT filing' : 'View issuer holdings');
    source.href = fund.holdingsSource;
    content.push(source, node('p', ''));
  }
  content.push(link);
  showDialog(fund.name, content);
}

function portfolioDetails(portfolio) {
  inspect(portfolio);
  const content = [
    node('p', 'These tickers are share classes of one pooled fund. Reported net assets are shown once on the map and are not separate values for each ticker.'),
    node('h3', `Reported pooled net assets: ${money(portfolio.netAssets)}`),
  ];
  for (const fund of portfolio.members) {
    const button = node('button', `${fund.id} — ${fund.name}`, 'company-option');
    button.addEventListener('click', () => details(fund));
    content.push(button);
  }
  content.push(node('p', sourceText()));
  showDialog(portfolio.name, content);
}

function layout() {
  const { width, height } = $('tiles').getBoundingClientRect();
  for (const tile of treemap(regions, width, height)) {
    const region = tile.company;
    Object.assign(region.element.style, {
      left: `${tile.x}px`, top: `${tile.y}px`, width: `${tile.width}px`, height: `${tile.height}px`,
    });
    for (const item of treemap(region.funds, tile.width, tile.height)) {
      const button = region.buttons.get(item.company.id);
      Object.assign(button.style, {
        left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px`,
      });
      const length = Math.max(item.company.symbols.join(' / ').length, money(item.company.netAssets).length, percent(item.company.upside).length);
      const size = Math.max(1, Math.min(28, (item.width - 3) / (length * .67), (item.height - 3) / 3.8));
      button.style.fontSize = `${size}px`;
      button.style.gap = size < 8 ? '0' : '2px';
    }
  }
}

function search() {
  if (!data) return [];
  const query = $('search').value;
  const found = data.funds.filter((fund) => matches(fund, query));
  $('matches').textContent = query.trim() ? `${found.length} found` : '';
  for (const button of buttons) {
    const portfolio = data.mappedPortfolios.find((item) => item.id === button.dataset.id);
    const match = portfolio.members.some((fund) => matches(fund, query));
    button.classList.toggle('dim', !match);
    button.classList.toggle('match', Boolean(query.trim()) && match);
  }
  if (query.trim() && found.length) inspect(found[0]);
  return found;
}

function render() {
  $('count').textContent = data.funds.length;
  $('valued').textContent = data.funds.filter((fund) => fund.upside !== null).length;
  const dates = data.funds.map((fund) => fund.quoteAt).filter(Boolean).sort();
  $('date').textContent = dates.length ? new Date(dates.at(-1)).toLocaleString() : 'Unavailable';
  $('coverage').textContent = `${data.mappedPortfolios.length} portfolios mapped${data.missing.length ? ` / ${data.missing.length} funds missing assets` : ' / full coverage'}`;
  $('coverage').disabled = false;
  $('search').disabled = false;
  $('message').hidden = data.mapped.length > 0;
  if (!data.mapped.length) $('message').textContent = 'No net assets are available. Open coverage to explore funds.';
  buttons = data.mappedPortfolios.map((portfolio) => {
    const button = node('button', undefined, 'tile');
    button.type = 'button';
    button.dataset.id = portfolio.id;
    button.style.background = upsideColor(portfolio.upside);
    button.classList.toggle('dark', upsideTextColor(portfolio.upside) === '#ffffff');
    const description = `${portfolio.symbols.join(' and ')}: ${portfolio.name}. Reported net assets ${money(portfolio.netAssets)}. Estimated upside ${percent(portfolio.upside)}.`;
    button.setAttribute('aria-label', description);
    button.title = description;
    button.append(node('strong', portfolio.symbols.join(' / ')), node('span', money(portfolio.netAssets)), node('span', percent(portfolio.upside)));
    button.addEventListener('pointerenter', () => inspect(portfolio));
    button.addEventListener('focus', () => inspect(portfolio));
    button.addEventListener('click', () => portfolio.members.length > 1
      ? portfolioDetails(portfolio) : details(portfolio.members[0]));
    return button;
  });
  const groups = new Map();
  for (const portfolio of data.mappedPortfolios) {
    if (!groups.has(portfolio.sector)) groups.set(portfolio.sector, []);
    groups.get(portfolio.sector).push(portfolio);
  }
  const byId = new Map(buttons.map((button) => [button.dataset.id, button]));
  regions = [...groups].map(([name, portfolios]) => {
    const element = node('div', undefined, 'sector-region');
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', name);
    const tiles = node('div', undefined, 'sector-tiles');
    tiles.append(...portfolios.map((portfolio) => byId.get(portfolio.id)));
    element.append(node('span', name, 'sector-label'), tiles);
    return { name, funds: portfolios, marketCap: portfolios.reduce((sum, portfolio) => sum + portfolio.netAssets, 0), element, buttons: byId };
  });
  $('tiles').replaceChildren(...regions.map((region) => region.element));
  layout();
}

async function load() {
  data = undefined;
  buttons = [];
  regions = [];
  clearInspection();
  $('tiles').replaceChildren();
  $('message').textContent = 'Loading fund and live market data...';
  $('message').hidden = false;
  $('status').textContent = '';
  $('count').textContent = $('valued').textContent = $('date').textContent = '--';
  $('search').value = '';
  $('search').disabled = true;
  $('matches').textContent = '';
  $('coverage').disabled = true;
  $('coverage').textContent = 'Loading coverage...';
  $('refresh').disabled = true;
  $('refresh').textContent = 'Loading...';
  $('map').setAttribute('aria-busy', 'true');
  try {
    const [response, assetsResponse, holdingsResponse] = await Promise.all([
      fetch('../market-insights/data.json', { cache: 'no-store', signal: AbortSignal.timeout(20000) }),
      fetch('./assets.json', { cache: 'no-store', signal: AbortSignal.timeout(20000) }),
      fetch('./holdings.json', { cache: 'no-store', signal: AbortSignal.timeout(20000) }),
    ]);
    if (!response.ok) throw new Error(`Snapshot request returned HTTP ${response.status}.`);
    if (!assetsResponse.ok) throw new Error(`Fund net-assets snapshot request returned HTTP ${assetsResponse.status}.`);
    if (!holdingsResponse.ok) throw new Error(`Fund holdings snapshot request returned HTTP ${holdingsResponse.status}.`);
    const snapshot = await response.json();
    const assetsSnapshot = await assetsResponse.json();
    const holdingsSnapshot = await holdingsResponse.json();
    if (!Array.isArray(snapshot.securities)) throw new Error('Invalid securities snapshot.');
    const securities = snapshot.securities.map((security) => ({
      ...security, price: null, price_date: null, quote_at: null, market_cap: null,
      snapshot_price: null, snapshot_market_cap: null, snapshot_pe: null,
      valuation_market_cap: null, valuation_price: null, pe: null,
    }));
    const symbols = securities.map((security) => security.symbol.replace(/\./g, '-'));
    const { quotes, marketCaps, marketCapAsOf, errors } = await fetchMarketData(symbols, {
      url: quoteApiUrl(location.hostname), cacheBust: `${Date.now()}-${Math.random()}`,
    });
    snapshot.securities = applyQuotes(securities, quotes, marketCaps, marketCapAsOf);
    data = prepareFunds(snapshot, assetsSnapshot, holdingsSnapshot);
    data.generatedAt = snapshot.generated_at;
    data.marketCapAsOf = marketCapAsOf;
    render();
    const assetsAge = Date.now() - Date.parse(data.assetsFetchedAt);
    const warnings = [];
    if (data.missing.length) warnings.push(`${data.missing.length} funds have no reported net assets and are excluded from the map; see coverage.`);
    if (assetsAge > 4 * 86400000) warnings.push('Fund net-assets snapshot was fetched over four days ago.');
    if (errors.length) {
      console.error('Fund Map live market data incomplete:', errors);
      warnings.push('Live market data is incomplete; unavailable quotes and valuations are not replaced with snapshot prices. See coverage.');
    }
    if (data.funds.some((fund) => fund.method === 'holdings' && fund.upside === null)) {
      warnings.push('Holdings-based estimates are unavailable for some funds; see fund details.');
    }
    const missingHoldings = data.funds.filter((fund) => fund.method === 'unavailable');
    if (missingHoldings.length) {
      warnings.push(`Holdings are unavailable for ${missingHoldings.map((fund) => fund.id).join(', ')}; no proxy is used.`);
    }
    warnings.push('Quotes may be delayed; fund assets can overlap. DCF estimates are illustrative.');
    $('status').textContent = warnings.join(' ');
  } catch (error) {
    console.error('Fund Map load failed:', error);
    $('message').textContent = `Unable to load fund data: ${error.message}. Use Refresh to retry.`;
    $('coverage').textContent = 'Data unavailable';
  } finally {
    $('refresh').disabled = false;
    $('refresh').textContent = 'Refresh';
    $('map').setAttribute('aria-busy', 'false');
  }
}

$('search').addEventListener('input', search);
$('search').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const found = search();
    if (found.length) details(found[0]);
  }
});
$('map').addEventListener('pointerleave', () => {
  clearInspection();
});
$('refresh').addEventListener('click', load);
$('close').addEventListener('click', () => {
  $('dialog').close();
  clearInspection();
});
$('dialog').addEventListener('close', clearInspection);
$('dialog').addEventListener('click', (event) => {
  if (event.target === $('dialog')) {
    $('dialog').close();
    clearInspection();
  }
});
$('coverage').addEventListener('click', () => {
  const content = [
    node('p', `${data.mapped.length} of ${data.funds.length} curated fund tickers have reported net assets. The map shows ${data.mappedPortfolios.length} pooled portfolios, with known Vanguard share classes combined into one tile. A share class without its own asset value may still appear in a shared portfolio tile. Other overlapping funds may still be present and must not be added as independent assets.`),
    node('p', coverageText()),
    node('p', sourceText()),
    node('p', 'Each estimate uses that fund’s reported holdings, not an index proxy. Vanguard share classes use their pooled portfolio. An estimate requires at least 80% coverage and current holdings; SEC N-PORT filings may be up to 120 days old, and issuer holdings up to 45 days old. Missing valuations, stale holdings, and insufficient coverage are shown as N/A.'),
  ];
  if (data.missing.length) content.push(node('h3', 'Missing net assets'), node('p', 'These funds have no map area but remain searchable.'));
  for (const fund of data.missing) {
    const button = node('button', `${fund.id} - ${fund.name}`, 'company-option');
    button.addEventListener('click', () => details(fund));
    content.push(button);
  }
  showDialog('Fund coverage', content);
});
$('about').addEventListener('click', () => showDialog('One map. A view of funds.', [
  node('p', 'Funds are grouped by exposure, with tile area proportional to Yahoo Finance reported net assets. Known Vanguard mutual-fund and ETF share classes of the same pooled portfolio appear together in one tile; search still finds each ticker, and the tile details link to each share class. Other overlapping funds may still be shown separately. Funds missing assets have no individual tile but remain searchable; if another share class reports pooled assets, they remain included in the shared tile. Search highlights matches without changing areas. Hover or focus for the bottom readout, select a tile for details, or search and press Enter.'),
  node('p', 'Green and red show estimated upside or downside; gray means unavailable. Each fund uses reported holdings weights, not a shared index proxy. Issuer holdings must be no more than 45 days old; SEC N-PORT holdings may be up to 120 days old. Estimates require usable company DCFs for at least 80% of fund assets.'),
  node('p', 'Reported holdings weights are multiplied by available company DCF upside and normalized over covered assets. Holdings not in the S&P 500 dataset, other assets, and companies with unavailable DCFs are excluded, which can materially bias the estimate. Holdings weights are dated and rounded, not live. International equities and bonds currently lack valuation inputs and are shown as N/A.'),
  node('p', 'The shared Market Insights earnings-based model projects five years of net income, caps annual growth at +/-5%, discounts at 10%, and uses 2.5% terminal growth. It is not a full cash-flow model, a price forecast, or investment advice.'),
  node('p', 'Sources: curated funds, S&P 500 constituents, and SEC EDGAR earnings from Market Insights; SEC N-PORT filings, Vanguard, iShares and State Street holdings; Yahoo Finance regular-session quotes and Nasdaq market caps fetched on load and refresh. Quotes may be delayed, and mutual fund NAVs typically update once daily.'),
]));
new ResizeObserver(layout).observe($('tiles'));
load();
