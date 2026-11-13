import { prepareMarket, treemap, upsideColor, upsideTextColor, matches, money, percent } from './model.js';
import {
  discountedCashFlowUpside, discountedCashFlowValue, formatMoney, formatPE,
  getSecurityPE, marketCapDescription,
} from '../market-insights/ranking.js';
import { applyQuotes, fetchMarketData, quoteApiUrl } from '../market-insights/quotes.js';

const $ = (id) => document.getElementById(id);
let market;
let selected;
let buttons = [];
let sectors = [];
let buttonsById = new Map();

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

function inspect(company) {
  selected = company;
  $('selected-symbol').textContent = company.symbols.join(' / ');
  $('selected-name').textContent = company.name;
  $('selected-cap').textContent = money(company.marketCap);
  $('selected-upside').textContent = percent(company.upside);
  $('details').disabled = false;
  for (const button of buttons) button.classList.toggle('selected', button.dataset.id === company.id);
}

function clearInspection() {
  selected = undefined;
  $('selected-symbol').textContent = 'Explore the market';
  $('selected-name').textContent = 'Hover, focus, or tap a company';
  $('selected-cap').textContent = '--';
  $('selected-upside').textContent = '--';
  $('details').disabled = true;
  for (const button of buttons) button.classList.remove('selected');
}

function showDetails(company) {
  inspect(company);
  const facts = node('dl');
  for (const [label, value] of [
    ['Tickers', company.symbols.join(' / ')],
    ['Sector', company.sector],
    ['Company market cap', money(company.marketCap)],
    ['Share of mapped market', company.marketCap ? percent(company.marketCap / market.total) : 'Unavailable'],
    ['Representative ticker', company.id],
    ['Price', money(company.representative.price)],
    ['Quote as of', company.representative.quote_at
      ? new Date(company.representative.quote_at).toLocaleString() : 'No live quote available'],
    ['Net income (TTM)', formatMoney(company.representative.net_income)],
    ['P/E ratio (TTM)', formatPE(getSecurityPE(company.representative))],
    ['DCF value / share', money(company.fairValue)],
    ['Implied upside / downside', percent(company.upside)],
  ]) facts.append(node('dt', label), node('dd', value));
  const content = [facts, node('p', marketCapDescription(company.representative))];
  if (company.classes.length > 1) {
    content.push(node('p', 'Share classes are combined to avoid counting the company twice. Area and color use the first listed class with a market cap, matching Market Insights. These are company-wide caps, not separate share-class valuations.'));
    for (const stock of company.classes) {
      content.push(node('p', `${stock.symbol}: price ${money(stock.price)}, net income (TTM) ${formatMoney(stock.net_income)}, P/E ${formatPE(getSecurityPE(stock))}, DCF ${money(discountedCashFlowValue(stock))}, implied upside ${percent(discountedCashFlowUpside(stock))}.`));
    }
  }
  if (company.upside === null) content.push(node('p', 'DCF is unavailable when earnings are non-positive or earnings, price, or market cap are missing. No upside or downside is assumed.'));
  const link = node('a', 'Open in Market Insights');
  link.href = `../market-insights/#symbol=${encodeURIComponent(company.id)}`;
  content.push(link);
  showDialog(company.name, content);
}

function renderLayout() {
  if (!market) return;
  const { width, height } = $('tiles').getBoundingClientRect();
  const sectorLayout = treemap(sectors, width, height);
  for (const sectorTile of sectorLayout) {
    const region = sectorTile.company.region;
    Object.assign(region.style, {
      left: `${sectorTile.x}px`, top: `${sectorTile.y}px`,
      width: `${sectorTile.width}px`, height: `${sectorTile.height}px`,
    });
    const companyLayout = treemap(sectorTile.company.companies, sectorTile.width, sectorTile.height);
    for (const tile of companyLayout) {
      const button = buttonsById.get(tile.company.id);
      Object.assign(button.style, {
        left: `${tile.x}px`, top: `${tile.y}px`, width: `${tile.width}px`, height: `${tile.height}px`,
      });
      const textLength = Math.max(tile.company.symbols.join(' / ').length, money(tile.company.marketCap).length, percent(tile.company.upside).length);
      const fontSize = Math.max(1, Math.min(28, (tile.width - 3) / (textLength * .67), (tile.height - 3) / 3.8));
      button.style.fontSize = `${fontSize}px`;
      button.style.gap = fontSize < 8 ? '0' : '2px';
    }
  }
}

function search() {
  if (!market) return;
  const query = $('search').value;
  const found = market.companies.filter((company) => matches(company, query));
  $('matches').textContent = query.trim() ? `${found.length} found` : '';
  for (let index = 0; index < buttons.length; index += 1) {
    const match = matches(market.mapped[index], query);
    buttons[index].classList.toggle('dim', !match);
    buttons[index].classList.toggle('match', Boolean(query.trim()) && match);
  }
  if (query.trim() && found.length) inspect(found[0]);
  return found;
}

function render() {
  $('total').textContent = money(market.total);
  $('count').textContent = `${market.companies.length} / ${market.stockCount}`;
  $('date').textContent = market.quoteAsOf
    ? new Date(market.quoteAsOf).toLocaleString()
    : market.liveOnly ? 'No live data' : `Close ${market.priceDate || 'unknown'}`;
  $('coverage').textContent = `${market.mapped.length} mapped${market.missing.length ? ` / ${market.missing.length} missing cap` : ' / full coverage'}`;
  $('coverage').disabled = false;
  $('search').disabled = false;
  $('message').hidden = market.mapped.length > 0;
  if (!market.mapped.length) $('message').textContent = 'No market caps are available. Open coverage to explore all companies.';
  buttons = market.mapped.map((company) => {
    const button = node('button', undefined, 'tile');
    button.type = 'button';
    button.dataset.id = company.id;
    button.style.background = upsideColor(company.upside);
    button.classList.toggle('dark', upsideTextColor(company.upside) === '#ffffff');
    const description = `${company.symbols.join(' / ')}: ${company.name}. Market cap ${money(company.marketCap)}. Implied upside ${percent(company.upside)}.`;
    button.setAttribute('aria-label', description);
    button.title = description;
    button.append(node('strong', company.symbols.join(' / ')), node('span', money(company.marketCap)), node('span', percent(company.upside)));
    button.addEventListener('pointerenter', () => inspect(company));
    button.addEventListener('focus', () => inspect(company));
    button.addEventListener('click', () => showDetails(company));
    return button;
  });
  buttonsById = new Map(buttons.map((button) => [button.dataset.id, button]));
  const grouped = new Map();
  for (const company of market.mapped) {
    if (!grouped.has(company.sector)) grouped.set(company.sector, []);
    grouped.get(company.sector).push(company);
  }
  sectors = [...grouped].map(([name, companies]) => ({
    name,
    companies,
    marketCap: companies.reduce((sum, company) => sum + company.marketCap, 0),
    region: node('div', undefined, 'sector-region'),
  })).sort((a, b) => b.marketCap - a.marketCap || a.name.localeCompare(b.name));
  for (const sector of sectors) {
    sector.region.setAttribute('role', 'group');
    sector.region.setAttribute('aria-label', `${sector.name} sector`);
    const label = node('span', sector.name, 'sector-label');
    const tiles = node('div', undefined, 'sector-tiles');
    tiles.append(...sector.companies.map((company) => buttonsById.get(company.id)));
    sector.region.append(label, tiles);
  }
  $('tiles').replaceChildren(...sectors.map((sector) => sector.region));
  renderLayout();
  if (selected) {
    const updated = market.companies.find((company) => company.id === selected.id);
    if (updated) inspect(updated);
  }
  search();
  const warnings = [];
  if (market.missing.length) warnings.push(`${market.missing.map((company) => company.symbols.join('/')).join(', ')}: missing market cap; excluded from area and total. See coverage.`);
  const dataDate = market.quoteAsOf;
  const age = Date.now() - Date.parse(dataDate);
  if (!Number.isFinite(age)) warnings.push('Latest market data date is unavailable.');
  else if (age > 4 * 86400000) warnings.push('Latest market data is over four days old.');
  if (market.quoteErrors?.length) {
    warnings.push(`Live market data is incomplete (${market.quoteCount}/${market.stockCount} current quotes). Snapshot prices and caps are not used; unavailable live values are excluded.`);
    console.error('Market Map live market data incomplete:', market.quoteErrors);
  } else if (market.quoteCount !== undefined) {
    warnings.push(`Current quotes for ${market.quoteCount}/${market.stockCount} tickers; quotes may be delayed.`);
  }
  $('status').textContent = warnings.join(' ');
}

function clearMarketDisplay() {
  market = undefined;
  selected = undefined;
  buttons = [];
  sectors = [];
  buttonsById = new Map();
  $('total').textContent = '--';
  $('count').textContent = '--';
  $('date').textContent = '--';
  $('coverage').textContent = 'Refreshing live data...';
  $('coverage').disabled = true;
  $('search').value = '';
  $('search').disabled = true;
  $('matches').textContent = '';
  $('tiles').replaceChildren();
  $('message').textContent = 'Loading the latest live market data...';
  $('message').hidden = false;
  $('status').textContent = '';
  clearInspection();
}

function clearSnapshotMarketValues(securities) {
  return securities.map((security) => ({
    ...security,
    price: null,
    price_date: null,
    quote_at: null,
    market_cap: null,
    market_cap_as_of: null,
    market_cap_stale: false,
    pe: null,
    snapshot_price: null,
    snapshot_market_cap: null,
    snapshot_pe: null,
    valuation_market_cap: null,
    valuation_price: null,
  }));
}

async function load() {
  clearMarketDisplay();
  $('refresh').disabled = true;
  $('refresh').textContent = 'Loading...';
  $('map').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('../market-insights/data.json', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Snapshot request returned HTTP ${response.status}.`);
    const snapshot = await response.json();
    snapshot.securities = clearSnapshotMarketValues(snapshot.securities);
    try {
      const symbols = snapshot.securities.filter((security) => security.asset_type !== 'fund')
        .map((security) => security.symbol.replace(/\./g, '-'));
      const { quotes, marketCaps, marketCapAsOf, errors } = await fetchMarketData(symbols, {
        url: quoteApiUrl(location.hostname),
        cacheBust: `${Date.now()}-${Math.random()}`,
      });
      snapshot.securities = applyQuotes(snapshot.securities, quotes, marketCaps, marketCapAsOf);
      market = prepareMarket(snapshot);
      const returnedQuotes = new Map(quotes.map((quote) => [quote.symbol, quote]));
      const currentQuotes = snapshot.securities.flatMap((security) => {
        const quote = returnedQuotes.get(security.symbol.replace(/\./g, '-'));
        return quote && security.quote_at === quote.timestamp ? [quote] : [];
      });
      market.quoteCount = currentQuotes.length;
      market.quoteAsOf = currentQuotes.reduce((latest, quote) =>
        !latest || Date.parse(quote.timestamp) > Date.parse(latest) ? quote.timestamp : latest, null);
      market.quoteErrors = errors;
      render();
    } catch (error) {
      console.error('Market Map live market data load failed:', error);
      market = prepareMarket(snapshot);
      market.quoteCount = 0;
      market.quoteErrors = [error.message];
      render();
    }
  } catch (error) {
    console.error('Market Map snapshot load failed:', error);
    const text = `Unable to load constituent and fundamentals data: ${error.message}`;
    $('message').replaceChildren(node('span', text), node('span', 'Live market values were not loaded. Use Refresh to retry.'));
    $('coverage').textContent = 'Data unavailable';
  } finally {
    $('refresh').disabled = false;
    $('refresh').textContent = 'Refresh';
    $('map').setAttribute('aria-busy', 'false');
  }
}

$('search').addEventListener('input', search);
$('map').addEventListener('pointerleave', () => {
  if (!$('map').contains(document.activeElement)) clearInspection();
});
document.addEventListener('click', (event) => {
  if (!$('map').contains(event.target)) clearInspection();
});
$('search').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const found = search();
    if (found?.length) showDetails(found[0]);
  }
});
$('refresh').addEventListener('click', load);
$('details').addEventListener('click', () => { if (selected) showDetails(selected); });
$('close').addEventListener('click', () => $('dialog').close());
$('dialog').addEventListener('click', (event) => { if (event.target === $('dialog')) $('dialog').close(); });
$('coverage').addEventListener('click', () => {
  const content = [
    node('p', `${market.stockCount} constituent tickers across ${market.companies.length} companies. ${market.mapped.length} companies have a usable market cap. Funds are excluded. Multi-class companies appear once.`),
    node('p', `Latest live market data: ${market.quoteAsOf ? new Date(market.quoteAsOf).toLocaleString() : 'unavailable'}. Prices and market caps are fetched on load and refresh; published snapshot valuations are not used. Constituents and earnings fundamentals come from the published dataset.`),
  ];
  if (market.missing.length) content.push(node('h3', 'Missing market caps'), node('p', 'These stocks remain searchable, but cannot be assigned a truthful area and are excluded from the mapped total.'));
  for (const company of market.missing) {
    const button = node('button', `${company.symbols.join(' / ')} - ${company.name}`, 'company-option');
    button.addEventListener('click', () => showDetails(company));
    content.push(button);
  }
  showDialog('Market coverage', content);
});
$('about').addEventListener('click', () => {
  showDialog('One market. Every company.', [
    node('p', 'Companies are grouped into sector rectangles sized by their combined market cap. Within each sector, every company rectangle is proportional to its market cap. Search highlights matches without changing any area. Tiny labels scale down to preserve truthful proportions: hover or focus for the bottom readout, tap for full details, or search and press Enter.'),
    node('p', 'Green means positive implied upside; red means negative upside (downside). Larger magnitudes are progressively darker and more saturated. Gray means DCF is unavailable; zero upside is neutral. The color scale continues beyond +/-100% and does not cap extreme values.'),
    node('p', 'Implied upside = (DCF value - price) / price. The shared Market Insights model projects positive TTM net income for five years, caps earnings growth at +/-5%, discounts at 10%, and uses 2.5% terminal growth. Shares are estimated from market cap / price.'),
    node('p', 'This simplified earnings-based DCF is not a full free-cash-flow valuation, analyst target, or investment recommendation. Company-wide caps are counted once by SEC CIK; combined tiles list every constituent share class.'),
    node('p', 'Sources: S&P 500 constituents from datasets/s-and-p-500-companies, current Yahoo Finance regular-session quotes and Nasdaq market caps, and SEC EDGAR earnings via the Market Insights dataset. Quotes may be delayed. Snapshot prices and market caps are never used. No synthetic data or estimated tile areas.'),
  ]);
});
new ResizeObserver(renderLayout).observe($('tiles'));
load();
