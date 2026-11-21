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
  $('selected-symbol').textContent = fund.id;
  $('selected-name').textContent = fund.name;
  $('selected-assets').textContent = money(fund.netAssets);
  $('selected-upside').textContent = percent(fund.upside);
  $('details').disabled = false;
  for (const button of buttons) button.classList.toggle('selected', button.dataset.id === fund.id);
}

function clearInspection() {
  selected = undefined;
  $('selected-symbol').textContent = 'Explore funds';
  $('selected-name').textContent = 'Hover, focus, or tap a fund';
  $('selected-assets').textContent = '--';
  $('selected-upside').textContent = '--';
  $('details').disabled = true;
  for (const button of buttons) button.classList.remove('selected');
}

function coverageText() {
  const p = data.proxy;
  return `Live market caps are available for ${p.mappedCount} of ${p.companyCount} proxy companies (${(p.companyCoverage * 100).toFixed(1)}%). DCF is available for ${p.valuedCount} companies, representing ${(p.capCoverage * 100).toFixed(1)}% of the market cap with live caps. At least 80% of companies must have live caps and at least 80% of observed cap must have a usable DCF. Missing caps have unknown weight.`;
}

function sourceText() {
  const generated = data.generatedAt && Number.isFinite(Date.parse(data.generatedAt))
    ? new Date(data.generatedAt).toLocaleString() : 'unknown';
  return `Fund classifications and earnings snapshot generated: ${generated}. Yahoo net assets fetched: ${new Date(data.assetsFetchedAt).toLocaleString()} (provider as-of date unavailable). Nasdaq market-cap data as of: ${data.marketCapAsOf || 'unavailable'}. Quotes, assets, and fundamentals can have different dates.`;
}

function details(fund) {
  inspect(fund);
  const facts = node('dl');
  for (const [label, value] of [
    ['Ticker', fund.id], ['Type', fund.type], ['Category', fund.sector],
    ['Reported net assets', money(fund.netAssets)],
    ['Price / NAV', money(fund.price)],
    ['Quote as of', fund.quoteAt ? new Date(fund.quoteAt).toLocaleString() : 'Unavailable'],
    ['Estimation method', fund.method],
    ['Estimated fair value', money(fund.fairValue)],
    ['Estimated upside', percent(fund.upside)],
  ]) facts.append(node('dt', label), node('dd', value));
  const explanation = fund.method === 'holdings'
    ? `Based on iShares holdings as of ${fund.holdingsAsOf}. Usable company DCFs cover ${((fund.holdingCoverage || 0) * 100).toFixed(1)}% of fund assets by reported weight. At least 80% coverage and holdings no older than 45 days are required. The estimate normalizes over covered holdings; uncovered assets, fees, trading and changes since the holdings date are not modeled.`
    : fund.sector === 'S&P 500'
    ? 'This is an illustrative S&P 500 proxy, not a valuation of this fund’s actual holdings. The same proxy upside is applied to each S&P 500 fund’s current price. Differences in holdings, index weights, fees, cash, tracking error, and distributions are not modeled.'
    : 'A DCF estimate is unavailable: this fund is not an S&P 500 fund, and its actual holdings and weights are not in the dataset.';
  const link = node('a', 'Open in Market Insights');
  link.href = `../market-insights/#symbol=${encodeURIComponent(fund.id)}`;
  const content = [facts, node('p', explanation), node('p', coverageText()), node('p', sourceText())];
  if (fund.holdingsSource) {
    const source = node('a', 'Download issuer holdings');
    source.href = fund.holdingsSource;
    content.push(source, node('p', ''));
  }
  content.push(link);
  showDialog(fund.name, content);
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
          const length = Math.max(item.company.id.length, money(item.company.netAssets).length, percent(item.company.upside).length);
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
    const match = matches(data.funds.find((fund) => fund.id === button.dataset.id), query);
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
  $('coverage').textContent = `${data.mapped.length} mapped${data.missing.length ? ` / ${data.missing.length} missing assets` : ' / full coverage'}`;
  $('coverage').disabled = false;
  $('search').disabled = false;
  $('message').hidden = data.mapped.length > 0;
  if (!data.mapped.length) $('message').textContent = 'No net assets are available. Open coverage to explore funds.';
  buttons = data.mapped.map((fund) => {
    const button = node('button', undefined, 'tile');
    button.type = 'button';
    button.dataset.id = fund.id;
    button.style.background = upsideColor(fund.upside);
    button.classList.toggle('dark', upsideTextColor(fund.upside) === '#ffffff');
    const description = `${fund.id}: ${fund.name}. Reported net assets ${money(fund.netAssets)}. Estimated upside ${percent(fund.upside)}.`;
    button.setAttribute('aria-label', description);
    button.title = description;
    button.append(node('strong', fund.id), node('span', money(fund.netAssets)), node('span', percent(fund.upside)));
    button.addEventListener('pointerenter', () => inspect(fund));
    button.addEventListener('focus', () => inspect(fund));
    button.addEventListener('click', () => details(fund));
    return button;
  });
  const groups = new Map();
  for (const fund of data.mapped) {
    if (!groups.has(fund.sector)) groups.set(fund.sector, []);
    groups.get(fund.sector).push(fund);
  }
  const byId = new Map(buttons.map((button) => [button.dataset.id, button]));
  regions = [...groups].map(([name, funds]) => {
    const element = node('div', undefined, 'sector-region');
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', name);
    const tiles = node('div', undefined, 'sector-tiles');
    tiles.append(...funds.map((fund) => byId.get(fund.id)));
    element.append(node('span', name, 'sector-label'), tiles);
    return { name, funds, marketCap: funds.reduce((sum, fund) => sum + fund.netAssets, 0), element, buttons: byId };
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
  if (!$('map').contains(document.activeElement)) clearInspection();
});
$('refresh').addEventListener('click', load);
$('details').addEventListener('click', () => { if (selected) details(selected); });
$('close').addEventListener('click', () => $('dialog').close());
$('dialog').addEventListener('click', (event) => { if (event.target === $('dialog')) $('dialog').close(); });
$('coverage').addEventListener('click', () => {
  const content = [
    node('p', `${data.mapped.length} of ${data.funds.length} curated funds have reported net assets and are mapped. Tile area is proportional to Yahoo Finance reported net assets. Values can represent the entire fund rather than an individual share class, so related funds may overlap and must not be added as independent assets.`),
    node('p', coverageText()),
    node('p', sourceText()),
    node('p', 'S&P 500 funds use an index proxy; ITOT uses issuer-reported holdings when sufficient holdings have usable DCFs. Unsupported funds, missing quotes, stale holdings, and insufficient coverage are shown as N/A.'),
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
  node('p', 'Funds are grouped by exposure, with tile area proportional to Yahoo Finance reported net assets. Fund-level assets may be shared across multiple classes or tickers, so the map can count the same assets more than once. Funds missing assets have no map area but remain searchable. Search highlights matches without changing areas. Hover or focus for the bottom readout, select a tile for details, or search and press Enter.'),
  node('p', 'Green and red show estimated upside or downside; gray means unavailable. S&P 500 funds use a shared index proxy rather than actual holdings, using company-wide market caps rather than float-adjusted index weights. ITOT uses reported holdings and their weights when at least 80% of its assets have usable company DCFs and holdings are no more than 45 days old.'),
  node('p', 'The proxy is the market-cap-weighted average of available constituent DCF upside, normalized over covered companies. Estimated fund fair value is its current price multiplied by one plus proxy upside. Missing or non-positive earnings are excluded rather than valued at zero; this can bias the estimate. Coverage thresholds and missing data are shown under View coverage.'),
  node('p', 'For ITOT, reported holdings weights are multiplied by available company DCF upside and normalized over covered assets. Holdings not in the S&P 500 dataset, other assets, and companies with unavailable DCFs are excluded, which can materially bias the estimate. Holdings weights are dated and rounded, not live.'),
  node('p', 'The shared Market Insights earnings-based model projects five years of net income, caps annual growth at +/-5%, discounts at 10%, and uses 2.5% terminal growth. It is not a full cash-flow model, a price forecast, or investment advice.'),
  node('p', 'Sources: curated funds, S&P 500 constituents, and SEC EDGAR earnings from Market Insights; ITOT holdings from iShares; Yahoo Finance regular-session quotes and Nasdaq market caps fetched on load and refresh. Quotes may be delayed, and mutual fund NAVs typically update once daily.'),
]));
new ResizeObserver(layout).observe($('tiles'));
load();
