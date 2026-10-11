import {
  CRITERIA, addCriterion, columnOrder, criterionFor, filterRanked, formatMoney, formatPercent, formatValue, marketSummary, moveCriterion,
  parseState, rankSecurities, removeCriterion, serializeState, toggleDirection,
} from './ranking.js';
import { createDetailView } from './detail.js';
import { DEFAULT_RANGE } from './history.js';

const COLUMN_LABELS = {
  market_cap: 'Market cap',
  market_cap_change_1y: 'Mkt cap YoY',
  net_income: 'Net income',
  net_income_change_1y: 'Net income YoY',
  price: 'Price',
  price_change_1y: 'Price 1Y',
  price_change_3m: 'Price 3M',
};
const DIRECTION_TEXT = { desc: 'High → Low', asc: 'Low → High' };
const SECTOR_HUES = {
  'Communication Services': 280, 'Consumer Discretionary': 330, 'Consumer Staples': 35, Energy: 15,
  Financials: 210, 'Health Care': 160, Industrials: 225, 'Information Technology': 190,
  Materials: 50, 'Real Estate': 260, Utilities: 95,
};

const elements = {
  meta: document.getElementById('data-meta'),
  kpis: document.getElementById('kpis'),
  sortList: document.getElementById('sort-list'),
  sortEmpty: document.getElementById('sort-empty'),
  available: document.getElementById('available-criteria'),
  reset: document.getElementById('reset-button'),
  methods: [...document.querySelectorAll('input[name="method"]')],
  search: document.getElementById('search'),
  sector: document.getElementById('sector'),
  count: document.getElementById('result-count'),
  head: document.getElementById('table-head'),
  body: document.getElementById('table-body'),
};

const state = {
  securities: [], sorts: [], method: 'priority', query: '', sector: '', symbol: null, range: DEFAULT_RANGE,
};
let openedViaPush = false;
const defaultTitle = document.title;
let lastFocusedSymbol = null;

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

function toneClass(format, value) {
  if (format !== 'percent' && format !== 'money') return '';
  if (typeof value !== 'number' || value === 0) return '';
  if (format === 'money' && value > 0) return '';
  return value > 0 ? 'up' : 'down';
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sectorDot(sector) {
  const hue = SECTOR_HUES[sector];
  return hue === undefined ? '' : `<i class="dot" style="--hue:${hue}" aria-hidden="true"></i>`;
}

function renderKpis() {
  const scope = state.sector
    ? state.securities.filter((security) => security.sector === state.sector)
    : state.securities;
  const summary = marketSummary(scope);
  const scopeLabel = state.sector || 'S&P 500';
  const share = summary.measured ? summary.advancers / summary.measured : null;
  const tone = (value) => (value > 0 ? 'up' : value < 0 ? 'down' : '');
  const cards = [
    ['Combined market cap', formatMoney(summary.marketCap), `${scopeLabel} · ${summary.count} securities`, ''],
    ['Net income (TTM)', formatMoney(summary.netIncome), 'Sum of reported trailing earnings', tone(summary.netIncome)],
    ['Median 1Y return', formatPercent(summary.medianReturn1y),
      summary.leader ? `Leader: ${summary.leader.symbol} ${formatPercent(summary.leader.price_change_1y)}` : '', tone(summary.medianReturn1y)],
    ['Higher than a year ago', share === null ? '—' : `${Math.round(share * 100)}%`,
      `${summary.advancers} of ${summary.measured} securities`, ''],
  ];
  elements.kpis.innerHTML = cards.map(([label, value, note, toneClass]) => `
    <div class="kpi"><span class="kpi-label">${escapeHtml(label)}</span>
      <strong class="kpi-value ${toneClass}">${escapeHtml(value)}</strong>
      <span class="kpi-note">${escapeHtml(note)}</span></div>`).join('');
}

function renderSortControls() {
  elements.sortList.innerHTML = state.sorts.map(({ key, direction }, index) => `
    <li data-key="${key}">
      <span class="priority" aria-hidden="true">${index + 1}</span>
      <span class="sort-name">${escapeHtml(criterionFor(key).label)}</span>
      <button type="button" class="direction" data-action="toggle" aria-label="${escapeHtml(criterionFor(key).label)}: ${DIRECTION_TEXT[direction]}. Toggle direction">${DIRECTION_TEXT[direction]}</button>
      <span class="sort-actions">
        <button type="button" data-action="up" aria-label="Move ${escapeHtml(criterionFor(key).label)} up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-action="down" aria-label="Move ${escapeHtml(criterionFor(key).label)} down" ${index === state.sorts.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" data-action="remove" aria-label="Remove ${escapeHtml(criterionFor(key).label)}">×</button>
      </span>
    </li>`).join('');
  elements.sortEmpty.hidden = state.sorts.length > 0;
  elements.reset.disabled = state.sorts.length === 0;

  const unused = CRITERIA.filter(({ key }) => !state.sorts.some((sort) => sort.key === key));
  elements.available.innerHTML = unused.length
    ? unused.map(({ key, label }) => `<button type="button" class="chip" data-key="${key}"><span aria-hidden="true">+</span>${escapeHtml(label)}</button>`).join('')
    : '<span class="all-used">All criteria are in use.</span>';
  elements.methods.forEach((input) => { input.checked = input.value === state.method; });
}

function renderHead() {
  const sortIndex = new Map(state.sorts.map((sort, index) => [sort.key, index]));
  const primary = state.sorts[0];
  const lastSelected = state.sorts.length - 1;
  const criterionHeaders = columnOrder(state.sorts).map(({ key, label }) => {
    const index = sortIndex.get(key);
    const active = index !== undefined;
    const direction = active ? state.sorts[index].direction : null;
    const ariaSort = primary && primary.key === key && state.method === 'priority'
      ? ` aria-sort="${direction === 'asc' ? 'ascending' : 'descending'}"` : '';
    const badge = active
      ? `<span class="badge">${index + 1}${direction === 'asc' ? '↑' : '↓'}</span>`
      : '<span class="sort-icon" aria-hidden="true">↕</span>';
    const hint = active ? 'Toggle direction' : 'Add to ranking';
    return `<th scope="col" class="num${active ? ' active' : ''}${index === lastSelected ? ' last-active' : ''}"${ariaSort}>
      <button type="button" data-key="${key}" title="${escapeHtml(label)} — ${hint}">${escapeHtml(COLUMN_LABELS[key])}${badge}</button></th>`;
  }).join('');
  elements.head.innerHTML = `<th scope="col" class="rank-col">#</th><th scope="col" class="security-col">Security</th>${criterionHeaders}`;
}

function cellTitle(security, key) {
  if (key === 'net_income' || key === 'net_income_change_1y') {
    if (!security.net_income_period_end) return 'No SEC net income data';
    const basis = security.net_income_basis === 'ttm' ? 'Trailing 12 months' : 'Fiscal year';
    const prior = formatValue('money', security.net_income_prior);
    return `${basis} ending ${formatDate(security.net_income_period_end)} (year earlier: ${prior})`;
  }
  if (key === 'price') return security.price_date ? `Close on ${formatDate(security.price_date)}` : '';
  return '';
}

function renderTable() {
  const ranked = rankSecurities(state.securities, state.sorts, state.method);
  const visible = filterRanked(ranked, { query: state.query, sector: state.sector });
  const activeKeys = new Set(state.sorts.map((sort) => sort.key));
  const columns = columnOrder(state.sorts);
  const lastKey = state.sorts.at(-1)?.key;

  elements.count.textContent = visible.length === ranked.length
    ? `${ranked.length} securities`
    : `Showing ${visible.length} of ${ranked.length} securities`;

  if (!visible.length) {
    elements.body.innerHTML = `<tr><td colspan="${CRITERIA.length + 2}" class="status">No securities match your search.</td></tr>`;
    return;
  }
  elements.body.innerHTML = visible.map(({ security, rank, score }) => {
    const scoreText = score === null ? '' : `<small title="Average rank across selected criteria">avg ${score.toFixed(1)}</small>`;
    const cells = columns.map(({ key, format }) => {
      const value = security[key];
      const title = cellTitle(security, key);
      const classes = ['num', toneClass(format, value), activeKeys.has(key) ? 'active' : '', key === lastKey ? 'last-active' : ''].filter(Boolean).join(' ');
      const text = formatValue(format, value);
      const content = format === 'percent' && Number.isFinite(value) ? `<span class="delta">${text}</span>` : text;
      return `<td class="${classes}"${title ? ` title="${escapeHtml(title)}"` : ''}>${content}</td>`;
    }).join('');
    return `<tr data-symbol="${escapeHtml(security.symbol)}">
      <td class="rank-col">${rank}${scoreText}</td>
      <th scope="row" class="security-col" title="${escapeHtml(security.name)}"><span class="security-line"><button type="button" class="symbol" aria-label="${escapeHtml(`${security.symbol}, ${security.name}: view price history`)}">${escapeHtml(security.symbol)}</button><span class="sector">${sectorDot(security.sector)}<span class="sector-name">${escapeHtml(security.sector || '')}</span></span></span><span class="name">${escapeHtml(security.name)}</span></th>
      ${cells}
    </tr>`;
  }).join('');
}

function hashUrl() {
  const hash = serializeState(state);
  return hash ? `#${hash}` : `${location.pathname}${location.search}`;
}

function render({ updateHash = true } = {}) {
  renderSortControls();
  renderHead();
  renderTable();
  if (updateHash) history.replaceState(history.state, '', hashUrl());
}

const detail = createDetailView({
  onRequestClose: closeDetail,
  onRangeChange(range) {
    state.range = range;
    history.replaceState(history.state, '', hashUrl());
  },
});

function syncDetail() {
  const security = state.symbol && state.securities.find((item) => item.symbol === state.symbol);
  if (security) {
    lastFocusedSymbol = security.symbol;
    detail.open(security, state.range);
    document.title = `${security.symbol} · S&P 500 Ranker`;
    return;
  }
  if (detail.isOpen) {
    detail.close();
    elements.body.querySelector(`tr[data-symbol="${CSS.escape(lastFocusedSymbol || '')}"] button.symbol`)?.focus();
  }
  document.title = defaultTitle;
}

function openDetail(symbol) {
  state.symbol = symbol;
  state.range = DEFAULT_RANGE;
  history.pushState({ detail: true }, '', hashUrl());
  openedViaPush = true;
  syncDetail();
}

function closeDetail() {
  if (openedViaPush && history.state?.detail) {
    openedViaPush = false;
    history.back();
    return;
  }
  openedViaPush = false;
  state.symbol = null;
  state.range = DEFAULT_RANGE;
  history.replaceState(null, '', hashUrl());
  syncDetail();
}

function setSorts(sorts) {
  state.sorts = sorts;
  render();
}

function bindEvents() {
  elements.available.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-key]');
    if (button) setSorts(addCriterion(state.sorts, button.dataset.key));
  });

  elements.sortList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { key } = button.closest('li').dataset;
    const action = button.dataset.action;
    if (action === 'toggle') setSorts(toggleDirection(state.sorts, key));
    if (action === 'remove') setSorts(removeCriterion(state.sorts, key));
    if (action === 'up' || action === 'down') {
      setSorts(moveCriterion(state.sorts, key, action === 'up' ? -1 : 1));
      elements.sortList.querySelector(`li[data-key="${key}"] button[data-action="${action}"]:not([disabled])`)?.focus();
    }
  });

  elements.head.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-key]');
    if (!button) return;
    const { key } = button.dataset;
    const active = state.sorts.some((sort) => sort.key === key);
    setSorts(active ? toggleDirection(state.sorts, key) : addCriterion(state.sorts, key));
    elements.head.querySelector(`button[data-key="${key}"]`)?.focus();
  });

  elements.body.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-symbol]');
    if (row && !window.getSelection()?.toString()) openDetail(row.dataset.symbol);
  });

  elements.reset.addEventListener('click', () => setSorts([]));
  elements.methods.forEach((input) => input.addEventListener('change', () => {
    state.method = input.value;
    render();
  }));
  elements.search.addEventListener('input', () => {
    state.query = elements.search.value;
    renderTable();
  });
  elements.sector.addEventListener('change', () => {
    state.sector = elements.sector.value;
    renderKpis();
    renderTable();
  });
  window.addEventListener('hashchange', () => {
    Object.assign(state, parseState(location.hash));
    if (!state.symbol) openedViaPush = false;
    render({ updateHash: false });
    syncDetail();
  });
}

async function init() {
  Object.assign(state, parseState(location.hash));
  bindEvents();
  render({ updateHash: false });
  try {
    const response = await fetch('data.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.securities = data.securities || [];
    const sectors = [...new Set(state.securities.map((security) => security.sector).filter(Boolean))].sort();
    elements.sector.insertAdjacentHTML('beforeend', sectors.map((sector) => `<option>${escapeHtml(sector)}</option>`).join(''));
    const updated = data.generated_at ? new Date(data.generated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown';
    elements.meta.innerHTML = `<span class="pulse" aria-hidden="true"></span>Prices as of <strong>${escapeHtml(formatDate(data.price_as_of))}</strong>`;
    elements.meta.title = `${state.securities.length} securities · snapshot built ${updated}`;
    renderKpis();
    render({ updateHash: false });
    syncDetail();
  } catch (error) {
    elements.meta.innerHTML = '<span class="pulse offline" aria-hidden="true"></span>Market data unavailable';
    elements.body.innerHTML = `<tr><td colspan="${CRITERIA.length + 2}" class="status">Could not load data.json (${escapeHtml(error.message)}).</td></tr>`;
  }
}

init();
