import {
  FILTER_RANGES,
  filterSecurities, formatMoney, formatPE, formatPercent, formatValue, getSecurityPE,
  getSecurityPerformance, marketSummary, parseMoneyInput, parsePercentInput,
  parseState, rankFilteredSecurities, serializeState,
} from './ranking.js';
import { createDetailView } from './detail.js';
import { DEFAULT_RANGE } from './history.js';

const SECTOR_HUES = {
  'Communication Services': 280, 'Consumer Discretionary': 330, 'Consumer Staples': 35, Energy: 15,
  Financials: 210, 'Health Care': 160, Industrials: 225, 'Information Technology': 190,
  Materials: 50, 'Real Estate': 260, Utilities: 95,
};

const PERIOD_NAMES = {
  '1w': '1 Week (1W)',
  '1m': '1 Month (1M)',
  '3m': '3 Months / Quarter (3M)',
  ytd: 'Year to Date (YTD)',
  '1y': '1 Year (1Y)',
  '2y': '2 Years (2Y)',
  '5y': '5 Years (5Y)',
  '10y': '10 Years (10Y)',
  all: 'All Available History (All)',
};

const NI_PERIOD_NAMES = {
  ttm: 'Trailing 12 Months (TTM)',
  yoy: '1-Year YoY Growth (%)',
  prior: 'Prior Fiscal Year ($)',
};

const NI_PRESETS = {
  ttm: [
    { label: 'Profitable (≥ $0)', min: '0', max: '' },
    { label: '> $1B', min: '1B', max: '' },
    { label: '> $10B', min: '10B', max: '' },
    { label: '< $0 (Losses)', min: '', max: '0' },
  ],
  yoy: [
    { label: '> 0% (Growing)', min: '0%', max: '' },
    { label: '> 10%', min: '10%', max: '' },
    { label: '> 25%', min: '25%', max: '' },
    { label: '< 0% (Declining)', min: '', max: '0%' },
  ],
  prior: [
    { label: 'Profitable (≥ $0)', min: '0', max: '' },
    { label: '> $1B', min: '1B', max: '' },
    { label: '> $10B', min: '10B', max: '' },
    { label: '< $0 (Losses)', min: '', max: '0' },
  ],
};

const FILTER_COLUMNS = [
  { key: 'market_cap', label: 'Market cap', defaultDir: 'desc' },
  { key: 'pe', label: 'P/E', defaultDir: 'asc' },
  { key: 'price', label: 'Price', defaultDir: 'desc' },
  { key: 'net_income', label: 'Net inc', defaultDir: 'desc' },
  { key: 'net_income_change_1y', label: 'Net inc YoY', defaultDir: 'desc' },
  { key: 'net_income_prior', label: 'Prior net inc', defaultDir: 'desc' },
  { key: 'perf_1w', label: '1W', defaultDir: 'desc', period: '1w' },
  { key: 'perf_1m', label: '1M', defaultDir: 'desc', period: '1m' },
  { key: 'perf_3m', label: '3M', defaultDir: 'desc', period: '3m' },
  { key: 'perf_ytd', label: 'YTD', defaultDir: 'desc', period: 'ytd' },
  { key: 'perf_1y', label: '1Y', defaultDir: 'desc', period: '1y' },
  { key: 'perf_2y', label: '2Y', defaultDir: 'desc', period: '2y' },
  { key: 'perf_5y', label: '5Y', defaultDir: 'desc', period: '5y' },
  { key: 'perf_10y', label: '10Y', defaultDir: 'desc', period: '10y' },
  { key: 'perf_all', label: 'All', defaultDir: 'desc', period: 'all' },
];

const elements = {
  meta: document.getElementById('data-meta'),
  kpis: document.getElementById('kpis'),

  // Filter controls & toggle
  filterGrid: document.getElementById('filter-grid'),
  btnToggleFilters: document.getElementById('btn-toggle-filters'),
  toggleFiltersText: document.getElementById('toggle-filters-text'),
  filterSummaryRow: document.getElementById('filter-summary-row'),
  filterSummaryEmpty: document.getElementById('filter-summary-empty'),
  filterSummaryActive: document.getElementById('filter-summary-active'),
  filterSummaryLabel: document.getElementById('filter-summary-label'),
  filterSummaryChips: document.getElementById('filter-summary-chips'),
  filterSummaryMatch: document.getElementById('filter-summary-match'),
  filterReset: document.getElementById('filter-reset-button'),
  filterMcapMin: document.getElementById('filter-mcap-min'),
  filterMcapMax: document.getElementById('filter-mcap-max'),
  filterPeMin: document.getElementById('filter-pe-min'),
  filterPeMax: document.getElementById('filter-pe-max'),
  filterPePositive: document.getElementById('filter-pe-positive'),
  filterPriceMin: document.getElementById('filter-price-min'),
  filterPriceMax: document.getElementById('filter-price-max'),

  // Net Income controls
  filterNiMin: document.getElementById('filter-ni-min'),
  filterNiMax: document.getElementById('filter-ni-max'),
  filterNiMinLabel: document.getElementById('filter-ni-min-label'),
  filterNiMaxLabel: document.getElementById('filter-ni-max-label'),
  niPeriodSelector: document.getElementById('ni-period-selector'),
  niPeriodHeading: document.getElementById('ni-period-heading'),
  niPresets: document.getElementById('ni-presets'),

  // Performance controls
  perfPeriodSelector: document.getElementById('perf-period-selector'),
  perfPeriodHeading: document.getElementById('perf-period-heading'),
  filterPerfMin: document.getElementById('filter-perf-min'),
  filterPerfMax: document.getElementById('filter-perf-max'),
  filterPerfClearPeriod: document.getElementById('filter-perf-clear-period'),

  // Toolbar & Table
  filterSearch: document.getElementById('filter-search'),
  filterSector: document.getElementById('filter-sector'),
  filterCount: document.getElementById('filter-result-count'),
  filterHead: document.getElementById('filter-table-head'),
  filterBody: document.getElementById('filter-table-body'),
};

const state = {
  securities: [],
  query: '',
  sector: '',
  symbol: null,
  range: DEFAULT_RANGE,
  filterSort: { key: 'market_cap', direction: 'desc' },
  activePerfPeriod: '1y',
  activeNiPeriod: 'ttm',
  filtersVisible: true,
  filters: {
    marketCapMin: null,
    marketCapMax: null,
    peMin: null,
    peMax: null,
    pePositiveOnly: false,
    priceMin: null,
    priceMax: null,
    netIncome: {},
    performance: {},
  },
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

function cellTitle(security, key) {
  if (key === 'net_income' || key === 'net_income_change_1y' || key === 'net_income_prior') {
    if (!security.net_income_period_end) return 'No SEC net income data';
    const basis = security.net_income_basis === 'ttm' ? 'Trailing 12 months' : 'Fiscal year';
    const prior = formatValue('money', security.net_income_prior);
    return `${basis} ending ${formatDate(security.net_income_period_end)} (year earlier: ${prior})`;
  }
  if (key === 'price') return security.price_date ? `Close on ${formatDate(security.price_date)}` : '';
  return '';
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

function formatPerfForInput(val) {
  if (val === null || val === undefined || !Number.isFinite(val)) return '';
  const pct = Math.round(val * 1000) / 10;
  return `${pct}%`;
}

function formatNiForInput(val, period) {
  if (val === null || val === undefined || !Number.isFinite(val)) return '';
  if (period === 'yoy') {
    return formatPerfForInput(val);
  }
  return formatMoney(val);
}

function countActiveFilters() {
  let count = 0;
  if (state.filters.marketCapMin !== null || state.filters.marketCapMax !== null) count++;
  if (state.filters.peMin !== null || state.filters.peMax !== null || state.filters.pePositiveOnly) count++;
  if (state.filters.priceMin !== null || state.filters.priceMax !== null) count++;
  for (const period of ['ttm', 'yoy', 'prior']) {
    const f = state.filters.netIncome[period];
    if (f && (f.min !== null || f.max !== null)) count++;
  }
  for (const range of FILTER_RANGES) {
    const f = state.filters.performance[range.key];
    if (f && (f.min !== null || f.max !== null)) count++;
  }
  return count;
}

function getActiveFilterDescriptors() {
  const items = [];
  if (state.filters.marketCapMin !== null || state.filters.marketCapMax !== null) {
    const min = state.filters.marketCapMin !== null ? formatMoney(state.filters.marketCapMin) : null;
    const max = state.filters.marketCapMax !== null ? formatMoney(state.filters.marketCapMax) : null;
    let label = 'Cap';
    if (min && max) label = `Cap: ${min}–${max}`;
    else if (min) label = `Cap ≥ ${min}`;
    else label = `Cap ≤ ${max}`;
    items.push({ key: 'market_cap', label, title: 'Remove Market Cap filter' });
  }
  if (state.filters.peMin !== null || state.filters.peMax !== null || state.filters.pePositiveOnly) {
    let label = 'P/E';
    if (state.filters.peMin !== null && state.filters.peMax !== null) label = `P/E: ${state.filters.peMin}–${state.filters.peMax}`;
    else if (state.filters.peMin !== null) label = `P/E ≥ ${state.filters.peMin}`;
    else if (state.filters.peMax !== null) label = `P/E ≤ ${state.filters.peMax}`;
    else label = 'P/E > 0 (Profitable)';
    items.push({ key: 'pe', label, title: 'Remove P/E ratio filter' });
  }
  if (state.filters.priceMin !== null || state.filters.priceMax !== null) {
    const min = state.filters.priceMin !== null ? `$${state.filters.priceMin}` : null;
    const max = state.filters.priceMax !== null ? `$${state.filters.priceMax}` : null;
    let label = 'Price';
    if (min && max) label = `Price: ${min}–${max}`;
    else if (min) label = `Price ≥ ${min}`;
    else label = `Price ≤ ${max}`;
    items.push({ key: 'price', label, title: 'Remove Price filter' });
  }
  for (const [pKey, labelName] of [['ttm', 'Net Inc (TTM)'], ['yoy', 'Net Inc YoY'], ['prior', 'Prior Net Inc']]) {
    const f = state.filters.netIncome[pKey];
    if (f && (f.min !== null || f.max !== null)) {
      const isPct = pKey === 'yoy';
      const minStr = f.min !== null ? (isPct ? formatPercent(f.min) : formatMoney(f.min)) : null;
      const maxStr = f.max !== null ? (isPct ? formatPercent(f.max) : formatMoney(f.max)) : null;
      let label = labelName;
      if (minStr && maxStr) label = `${labelName}: ${minStr} to ${maxStr}`;
      else if (minStr) label = `${labelName} ≥ ${minStr}`;
      else label = `${labelName} ≤ ${maxStr}`;
      items.push({ key: `ni_${pKey}`, label, title: `Remove ${labelName} filter` });
    }
  }
  for (const range of FILTER_RANGES) {
    const f = state.filters.performance[range.key];
    if (f && (f.min !== null || f.max !== null)) {
      const min = f.min !== null ? formatPercent(f.min) : null;
      const max = f.max !== null ? formatPercent(f.max) : null;
      let label = range.label;
      if (min && max) label = `${range.label}: ${min} to ${max}`;
      else if (min) label = `${range.label} ≥ ${min}`;
      else label = `${range.label} ≤ ${max}`;
      items.push({ key: `perf_${range.key}`, label, title: `Remove ${range.label} return filter` });
    }
  }
  return items;
}

let lastMatchedCount = undefined;

function updateFilterSummary(matchedCount) {
  if (matchedCount !== undefined) {
    lastMatchedCount = matchedCount;
  }
  const descriptors = getActiveFilterDescriptors();
  const total = state.securities.length;

  if (descriptors.length === 0) {
    elements.filterSummaryEmpty.hidden = false;
    elements.filterSummaryEmpty.textContent = total > 0
      ? `No filters applied — showing all ${total} securities`
      : 'No filters applied';
    elements.filterSummaryActive.hidden = true;
    elements.filterSummaryChips.innerHTML = '';
  } else {
    elements.filterSummaryEmpty.hidden = true;
    elements.filterSummaryActive.hidden = false;
    elements.filterSummaryLabel.textContent = `Filters (${descriptors.length}):`;
    elements.filterSummaryChips.innerHTML = descriptors.map((d) => `
      <button type="button" class="filter-chip" data-tag-key="${escapeHtml(d.key)}" title="${escapeHtml(d.title)}" aria-label="${escapeHtml(d.title)}">
        <span class="chip-text">${escapeHtml(d.label)}</span>
        <span class="chip-remove" aria-hidden="true">×</span>
      </button>
    `).join('');
    const count = lastMatchedCount !== undefined ? lastMatchedCount : total;
    elements.filterSummaryMatch.textContent = `(${count} of ${total} matching)`;
  }
}

function renderFilterControls() {
  const count = countActiveFilters();
  elements.filterReset.disabled = count === 0;

  // Toggle button and filter grid visibility
  elements.filterGrid.hidden = !state.filtersVisible;
  elements.btnToggleFilters.setAttribute('aria-expanded', state.filtersVisible ? 'true' : 'false');
  if (state.filtersVisible) {
    elements.toggleFiltersText.textContent = 'Hide filters';
  } else {
    elements.toggleFiltersText.textContent = count > 0 ? `Show filters (${count} active)` : 'Show filters';
  }

  // Net Income active period display and buttons
  const activeNiPeriod = state.activeNiPeriod;
  elements.niPeriodHeading.textContent = NI_PERIOD_NAMES[activeNiPeriod] || activeNiPeriod.toUpperCase();
  elements.niPeriodSelector.querySelectorAll('.ni-pill-btn').forEach((btn) => {
    const period = btn.dataset.period;
    const isActive = period === activeNiPeriod;
    const hasFilter = Boolean(state.filters.netIncome[period] && (
      state.filters.netIncome[period].min !== null || state.filters.netIncome[period].max !== null
    ));
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('has-filter', hasFilter);
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  // Net Income inputs and labels
  const isNiYoy = activeNiPeriod === 'yoy';
  elements.filterNiMinLabel.textContent = isNiYoy ? 'Min %' : 'Min';
  elements.filterNiMaxLabel.textContent = isNiYoy ? 'Max %' : 'Max';
  elements.filterNiMin.placeholder = isNiYoy ? 'e.g. 10%' : 'e.g. 1B';
  elements.filterNiMax.placeholder = isNiYoy ? 'e.g. 50%' : 'e.g. 50B';

  const niFilter = state.filters.netIncome[activeNiPeriod] || { min: null, max: null };
  if (document.activeElement !== elements.filterNiMin) {
    elements.filterNiMin.value = formatNiForInput(niFilter.min, activeNiPeriod);
  }
  if (document.activeElement !== elements.filterNiMax) {
    elements.filterNiMax.value = formatNiForInput(niFilter.max, activeNiPeriod);
  }

  // Net Income presets
  const niPresets = NI_PRESETS[activeNiPeriod] || [];
  elements.niPresets.innerHTML = niPresets.map((p) => {
    const minVal = isNiYoy ? parsePercentInput(p.min) : parseMoneyInput(p.min);
    const maxVal = isNiYoy ? parsePercentInput(p.max) : parseMoneyInput(p.max);
    const isActive = niFilter.min === minVal && niFilter.max === maxVal;
    return `<button type="button" class="preset-chip${isActive ? ' active' : ''}" data-preset="ni" data-min="${escapeHtml(p.min)}" data-max="${escapeHtml(p.max)}">${escapeHtml(p.label)}</button>`;
  }).join('') + '<button type="button" class="preset-chip clear-chip" data-action="clear-ni">Clear period</button>';

  // Performance active period display and buttons
  const activePerfPeriod = state.activePerfPeriod;
  elements.perfPeriodHeading.textContent = PERIOD_NAMES[activePerfPeriod] || activePerfPeriod.toUpperCase();
  elements.perfPeriodSelector.querySelectorAll('.perf-pill-btn').forEach((btn) => {
    const period = btn.dataset.period;
    const isActive = period === activePerfPeriod;
    const hasFilter = Boolean(state.filters.performance[period] && (
      state.filters.performance[period].min !== null || state.filters.performance[period].max !== null
    ));
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('has-filter', hasFilter);
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  // Performance inputs for current period
  const perfFilter = state.filters.performance[activePerfPeriod] || { min: null, max: null };
  if (document.activeElement !== elements.filterPerfMin) {
    elements.filterPerfMin.value = formatPerfForInput(perfFilter.min);
  }
  if (document.activeElement !== elements.filterPerfMax) {
    elements.filterPerfMax.value = formatPerfForInput(perfFilter.max);
  }

  // Update unified filter summary & active chips
  updateFilterSummary();

  // Update preset active states for static presets
  document.querySelectorAll('.preset-chip[data-preset="mcap"]').forEach((chip) => {
    const min = parseMoneyInput(chip.dataset.min);
    const max = parseMoneyInput(chip.dataset.max);
    chip.classList.toggle('active', state.filters.marketCapMin === min && state.filters.marketCapMax === max);
  });
  document.querySelectorAll('.preset-chip[data-preset="pe"]').forEach((chip) => {
    const min = chip.dataset.min ? Number(chip.dataset.min) : null;
    const max = chip.dataset.max ? Number(chip.dataset.max) : null;
    chip.classList.toggle('active', state.filters.peMin === min && state.filters.peMax === max);
  });
  document.querySelectorAll('.preset-chip[data-preset="price"]').forEach((chip) => {
    const min = chip.dataset.min ? Number(chip.dataset.min) : null;
    const max = chip.dataset.max ? Number(chip.dataset.max) : null;
    chip.classList.toggle('active', state.filters.priceMin === min && state.filters.priceMax === max);
  });
  document.querySelectorAll('.preset-chip[data-preset="perf"]').forEach((chip) => {
    const min = parsePercentInput(chip.dataset.min);
    const max = parsePercentInput(chip.dataset.max);
    chip.classList.toggle('active', perfFilter.min === min && perfFilter.max === max);
  });
}

function renderFilterHead() {
  const currentKey = state.filterSort.key;
  const currentDir = state.filterSort.direction;

  const cols = FILTER_COLUMNS.map((col) => {
    const isActive = col.key === currentKey;
    const arrow = isActive ? (currentDir === 'asc' ? ' ↑' : ' ↓') : '<span class="sort-icon" aria-hidden="true">↕</span>';
    const ariaSort = isActive ? ` aria-sort="${currentDir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th scope="col" class="num${isActive ? ' active' : ''}"${ariaSort}>
      <button type="button" data-fcol="${col.key}">${escapeHtml(col.label)}${arrow}</button>
    </th>`;
  }).join('');

  const symbolActive = currentKey === 'symbol';
  const symbolArrow = symbolActive ? (currentDir === 'asc' ? ' ↑' : ' ↓') : '<span class="sort-icon" aria-hidden="true">↕</span>';
  elements.filterHead.innerHTML = `
    <th scope="col" class="rank-col">#</th>
    <th scope="col" class="security-col${symbolActive ? ' active' : ''}">
      <button type="button" data-fcol="symbol">Security${symbolArrow}</button>
    </th>
    ${cols}
  `;
}

function renderFilterTable() {
  const filtered = filterSecurities(state.securities, {
    ...state.filters,
    query: state.query,
    sector: state.sector,
  });
  const ranked = rankFilteredSecurities(filtered, state.filterSort.key, state.filterSort.direction);

  updateFilterSummary(ranked.length);

  elements.filterCount.textContent = ranked.length === state.securities.length
    ? `${state.securities.length} securities`
    : `Showing ${ranked.length} of ${state.securities.length} securities`;

  if (!ranked.length) {
    elements.filterBody.innerHTML = `<tr><td colspan="${FILTER_COLUMNS.length + 2}" class="status">No securities match the selected filters.</td></tr>`;
    return;
  }

  const sortKey = state.filterSort.key;
  elements.filterBody.innerHTML = ranked.map(({ security, rank }) => {
    const pe = getSecurityPE(security);
    const mcapCell = `<td class="num${sortKey === 'market_cap' ? ' active' : ''}">${escapeHtml(formatMoney(security.market_cap))}</td>`;
    const peCell = `<td class="num${sortKey === 'pe' ? ' active' : ''}">${escapeHtml(formatPE(pe))}</td>`;
    const priceCell = `<td class="num${sortKey === 'price' ? ' active' : ''}">${escapeHtml(formatMoney(security.price))}</td>`;

    const niTone = toneClass('money', security.net_income);
    const niCell = `<td class="num ${niTone}${sortKey === 'net_income' ? ' active' : ''}" title="${escapeHtml(cellTitle(security, 'net_income'))}">${escapeHtml(formatMoney(security.net_income))}</td>`;

    const niGrowthVal = security.net_income_change_1y;
    const niGrowthTone = toneClass('percent', niGrowthVal);
    const niGrowthFmt = formatPercent(niGrowthVal);
    const niGrowthContent = Number.isFinite(niGrowthVal) ? `<span class="delta">${niGrowthFmt}</span>` : niGrowthFmt;
    const niGrowthCell = `<td class="num ${niGrowthTone}${sortKey === 'net_income_change_1y' ? ' active' : ''}" title="${escapeHtml(cellTitle(security, 'net_income_change_1y'))}">${niGrowthContent}</td>`;

    const niPriorTone = toneClass('money', security.net_income_prior);
    const niPriorCell = `<td class="num ${niPriorTone}${sortKey === 'net_income_prior' ? ' active' : ''}" title="${escapeHtml(cellTitle(security, 'net_income_prior'))}">${escapeHtml(formatMoney(security.net_income_prior))}</td>`;

    const perfCells = FILTER_RANGES.map((range) => {
      const val = getSecurityPerformance(security, range.key);
      const isColActive = sortKey === `perf_${range.key}`;
      const tc = toneClass('percent', val);
      const formatted = formatPercent(val);
      const content = Number.isFinite(val) ? `<span class="delta">${formatted}</span>` : formatted;
      return `<td class="num ${tc}${isColActive ? ' active' : ''}">${content}</td>`;
    }).join('');

    return `<tr data-symbol="${escapeHtml(security.symbol)}">
      <td class="rank-col">${rank}</td>
      <th scope="row" class="security-col" title="${escapeHtml(security.name)}">
        <span class="security-line">
          <button type="button" class="symbol" aria-label="${escapeHtml(`${security.symbol}, ${security.name}: view price history and performance`)}">${escapeHtml(security.symbol)}</button>
          <span class="sector">${sectorDot(security.sector)}<span class="sector-name">${escapeHtml(security.sector || '')}</span></span>
        </span>
        <span class="name">${escapeHtml(security.name)}</span>
      </th>
      ${mcapCell}
      ${peCell}
      ${priceCell}
      ${niCell}
      ${niGrowthCell}
      ${niPriorCell}
      ${perfCells}
    </tr>`;
  }).join('');
}

function hashUrl() {
  const hash = serializeState(state);
  return hash ? `#${hash}` : `${location.pathname}${location.search}`;
}

function render({ updateHash = true } = {}) {
  renderFilterControls();
  renderFilterHead();
  renderFilterTable();
  if (updateHash) history.replaceState(history.state, '', hashUrl());
}

const detail = createDetailView({
  onRequestClose: closeDetail,
  onNavigate: navigateDetail,
  onRangeChange(range) {
    state.range = range;
    history.replaceState(history.state, '', hashUrl());
  },
});

function rankedVisibleSecurities() {
  const filtered = filterSecurities(state.securities, {
    ...state.filters,
    query: state.query,
    sector: state.sector,
  });
  return rankFilteredSecurities(filtered, state.filterSort.key, state.filterSort.direction).map(({ security }) => security);
}

function navigateDetail(direction) {
  const ranked = rankedVisibleSecurities();
  const index = ranked.findIndex((security) => security.symbol === state.symbol);
  const security = ranked[index + direction];
  if (!security) return;
  state.symbol = security.symbol;
  history.replaceState(history.state, '', hashUrl());
  syncDetail();
}

function syncDetail() {
  const security = state.symbol && state.securities.find((item) => item.symbol === state.symbol);
  if (security) {
    lastFocusedSymbol = security.symbol;
    detail.open(security, state.range);
    const ranked = rankedVisibleSecurities();
    const index = ranked.findIndex((item) => item.symbol === security.symbol);
    detail.setNavigation(index > 0, index >= 0 && index < ranked.length - 1);
    document.title = `${security.symbol} · S&P 500 Ranker`;
    return;
  }
  if (detail.isOpen) {
    detail.close();
    elements.filterBody.querySelector(`tr[data-symbol="${CSS.escape(lastFocusedSymbol || '')}"] button.symbol`)?.focus();
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

function onFiltersChanged() {
  renderFilterControls();
  renderFilterTable();
  history.replaceState(history.state, '', hashUrl());
}

function updateNiFilter() {
  const period = state.activeNiPeriod;
  const isYoy = period === 'yoy';
  const minText = elements.filterNiMin.value.trim();
  const maxText = elements.filterNiMax.value.trim();
  const min = minText === '' ? null : (isYoy ? parsePercentInput(minText) : parseMoneyInput(minText));
  const max = maxText === '' ? null : (isYoy ? parsePercentInput(maxText) : parseMoneyInput(maxText));
  if (min !== null || max !== null) {
    state.filters.netIncome[period] = { min, max };
  } else {
    delete state.filters.netIncome[period];
  }
  onFiltersChanged();
}

function updatePerfFilter() {
  const minText = elements.filterPerfMin.value.trim();
  const maxText = elements.filterPerfMax.value.trim();
  const min = minText === '' ? null : parsePercentInput(minText);
  const max = maxText === '' ? null : parsePercentInput(maxText);
  if (min !== null || max !== null) {
    state.filters.performance[state.activePerfPeriod] = { min, max };
  } else {
    delete state.filters.performance[state.activePerfPeriod];
  }
  onFiltersChanged();
}

function handlePresetClick(btn) {
  const { preset, min, max } = btn.dataset;
  if (preset === 'mcap') {
    const minVal = parseMoneyInput(min);
    const maxVal = parseMoneyInput(max);
    if (state.filters.marketCapMin === minVal && state.filters.marketCapMax === maxVal) {
      state.filters.marketCapMin = null;
      state.filters.marketCapMax = null;
      elements.filterMcapMin.value = '';
      elements.filterMcapMax.value = '';
    } else {
      state.filters.marketCapMin = minVal;
      state.filters.marketCapMax = maxVal;
      elements.filterMcapMin.value = min || '';
      elements.filterMcapMax.value = max || '';
    }
  } else if (preset === 'pe') {
    const minVal = min ? Number(min) : null;
    const maxVal = max ? Number(max) : null;
    if (state.filters.peMin === minVal && state.filters.peMax === maxVal) {
      state.filters.peMin = null;
      state.filters.peMax = null;
      elements.filterPeMin.value = '';
      elements.filterPeMax.value = '';
    } else {
      state.filters.peMin = minVal;
      state.filters.peMax = maxVal;
      elements.filterPeMin.value = min || '';
      elements.filterPeMax.value = max || '';
    }
  } else if (preset === 'price') {
    const minVal = min ? Number(min) : null;
    const maxVal = max ? Number(max) : null;
    if (state.filters.priceMin === minVal && state.filters.priceMax === maxVal) {
      state.filters.priceMin = null;
      state.filters.priceMax = null;
      elements.filterPriceMin.value = '';
      elements.filterPriceMax.value = '';
    } else {
      state.filters.priceMin = minVal;
      state.filters.priceMax = maxVal;
      elements.filterPriceMin.value = min || '';
      elements.filterPriceMax.value = max || '';
    }
  } else if (preset === 'perf') {
    const minVal = parsePercentInput(min);
    const maxVal = parsePercentInput(max);
    const current = state.filters.performance[state.activePerfPeriod];
    if (current && current.min === minVal && current.max === maxVal) {
      delete state.filters.performance[state.activePerfPeriod];
      elements.filterPerfMin.value = '';
      elements.filterPerfMax.value = '';
    } else {
      state.filters.performance[state.activePerfPeriod] = { min: minVal, max: maxVal };
      elements.filterPerfMin.value = formatPerfForInput(minVal);
      elements.filterPerfMax.value = formatPerfForInput(maxVal);
    }
  } else if (preset === 'ni') {
    const period = state.activeNiPeriod;
    const isYoy = period === 'yoy';
    const minVal = isYoy ? parsePercentInput(min) : parseMoneyInput(min);
    const maxVal = isYoy ? parsePercentInput(max) : parseMoneyInput(max);
    const current = state.filters.netIncome[period];
    if (current && current.min === minVal && current.max === maxVal) {
      delete state.filters.netIncome[period];
      elements.filterNiMin.value = '';
      elements.filterNiMax.value = '';
    } else {
      state.filters.netIncome[period] = { min: minVal, max: maxVal };
      elements.filterNiMin.value = formatNiForInput(minVal, period);
      elements.filterNiMax.value = formatNiForInput(maxVal, period);
    }
  }
  onFiltersChanged();
}

function removeFilterByKey(key) {
  if (key === 'market_cap') {
    state.filters.marketCapMin = null;
    state.filters.marketCapMax = null;
    elements.filterMcapMin.value = '';
    elements.filterMcapMax.value = '';
  } else if (key === 'pe') {
    state.filters.peMin = null;
    state.filters.peMax = null;
    state.filters.pePositiveOnly = false;
    elements.filterPeMin.value = '';
    elements.filterPeMax.value = '';
    elements.filterPePositive.checked = false;
  } else if (key === 'price') {
    state.filters.priceMin = null;
    state.filters.priceMax = null;
    elements.filterPriceMin.value = '';
    elements.filterPriceMax.value = '';
  } else if (key.startsWith('ni_')) {
    const period = key.replace('ni_', '');
    delete state.filters.netIncome[period];
    if (state.activeNiPeriod === period) {
      elements.filterNiMin.value = '';
      elements.filterNiMax.value = '';
    }
  } else if (key.startsWith('perf_')) {
    const period = key.replace('perf_', '');
    delete state.filters.performance[period];
    if (state.activePerfPeriod === period) {
      elements.filterPerfMin.value = '';
      elements.filterPerfMax.value = '';
    }
  }
  onFiltersChanged();
}

function resetFilters() {
  state.filters = {
    marketCapMin: null,
    marketCapMax: null,
    peMin: null,
    peMax: null,
    pePositiveOnly: false,
    priceMin: null,
    priceMax: null,
    netIncome: {},
    performance: {},
  };
  elements.filterMcapMin.value = '';
  elements.filterMcapMax.value = '';
  elements.filterPeMin.value = '';
  elements.filterPeMax.value = '';
  elements.filterPePositive.checked = false;
  elements.filterPriceMin.value = '';
  elements.filterPriceMax.value = '';
  elements.filterNiMin.value = '';
  elements.filterNiMax.value = '';
  elements.filterPerfMin.value = '';
  elements.filterPerfMax.value = '';
  onFiltersChanged();
}

function syncInputsFromState() {
  elements.filterSearch.value = state.query || '';
  elements.filterSector.value = state.sector || '';

  elements.filterMcapMin.value = state.filters.marketCapMin !== null ? formatMoney(state.filters.marketCapMin) : '';
  elements.filterMcapMax.value = state.filters.marketCapMax !== null ? formatMoney(state.filters.marketCapMax) : '';
  elements.filterPeMin.value = state.filters.peMin !== null ? String(state.filters.peMin) : '';
  elements.filterPeMax.value = state.filters.peMax !== null ? String(state.filters.peMax) : '';
  elements.filterPePositive.checked = Boolean(state.filters.pePositiveOnly);
  elements.filterPriceMin.value = state.filters.priceMin !== null ? String(state.filters.priceMin) : '';
  elements.filterPriceMax.value = state.filters.priceMax !== null ? String(state.filters.priceMax) : '';

  const ni = state.filters.netIncome[state.activeNiPeriod];
  elements.filterNiMin.value = formatNiForInput(ni?.min ?? null, state.activeNiPeriod);
  elements.filterNiMax.value = formatNiForInput(ni?.max ?? null, state.activeNiPeriod);

  const perf = state.filters.performance[state.activePerfPeriod];
  elements.filterPerfMin.value = formatPerfForInput(perf?.min ?? null);
  elements.filterPerfMax.value = formatPerfForInput(perf?.max ?? null);
}

function bindEvents() {
  // Toggle filter criteria visibility
  elements.btnToggleFilters.addEventListener('click', () => {
    state.filtersVisible = !state.filtersVisible;
    renderFilterControls();
  });

  // Column sorting
  elements.filterHead.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-fcol]');
    if (!btn) return;
    const col = btn.dataset.fcol;
    if (state.filterSort.key === col) {
      state.filterSort.direction = state.filterSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      const defaultAsc = col === 'pe' || col === 'symbol';
      state.filterSort = { key: col, direction: defaultAsc ? 'asc' : 'desc' };
    }
    renderFilterHead();
    renderFilterTable();
    history.replaceState(history.state, '', hashUrl());
  });

  // Security row detail click
  elements.filterBody.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-symbol]');
    if (row && !window.getSelection()?.toString()) openDetail(row.dataset.symbol);
  });

  // Market Cap
  elements.filterMcapMin.addEventListener('input', () => {
    state.filters.marketCapMin = parseMoneyInput(elements.filterMcapMin.value);
    onFiltersChanged();
  });
  elements.filterMcapMax.addEventListener('input', () => {
    state.filters.marketCapMax = parseMoneyInput(elements.filterMcapMax.value);
    onFiltersChanged();
  });

  // P/E Ratio
  elements.filterPeMin.addEventListener('input', () => {
    const v = elements.filterPeMin.value.trim();
    state.filters.peMin = v === '' ? null : Number(v);
    onFiltersChanged();
  });
  elements.filterPeMax.addEventListener('input', () => {
    const v = elements.filterPeMax.value.trim();
    state.filters.peMax = v === '' ? null : Number(v);
    onFiltersChanged();
  });
  elements.filterPePositive.addEventListener('change', () => {
    state.filters.pePositiveOnly = elements.filterPePositive.checked;
    onFiltersChanged();
  });

  // Price
  elements.filterPriceMin.addEventListener('input', () => {
    const v = elements.filterPriceMin.value.trim();
    state.filters.priceMin = v === '' ? null : Number(v);
    onFiltersChanged();
  });
  elements.filterPriceMax.addEventListener('input', () => {
    const v = elements.filterPriceMax.value.trim();
    state.filters.priceMax = v === '' ? null : Number(v);
    onFiltersChanged();
  });

  // Net Income period selector
  elements.niPeriodSelector.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-period]');
    if (!btn) return;
    state.activeNiPeriod = btn.dataset.period;
    const niFilter = state.filters.netIncome[state.activeNiPeriod] || { min: null, max: null };
    elements.filterNiMin.value = formatNiForInput(niFilter.min, state.activeNiPeriod);
    elements.filterNiMax.value = formatNiForInput(niFilter.max, state.activeNiPeriod);
    renderFilterControls();
  });

  // Net Income range inputs
  elements.filterNiMin.addEventListener('input', updateNiFilter);
  elements.filterNiMax.addEventListener('input', updateNiFilter);
  elements.filterNiMin.addEventListener('blur', () => {
    const niFilter = state.filters.netIncome[state.activeNiPeriod];
    elements.filterNiMin.value = formatNiForInput(niFilter?.min ?? null, state.activeNiPeriod);
  });
  elements.filterNiMax.addEventListener('blur', () => {
    const niFilter = state.filters.netIncome[state.activeNiPeriod];
    elements.filterNiMax.value = formatNiForInput(niFilter?.max ?? null, state.activeNiPeriod);
  });

  // Net Income presets delegation
  elements.niPresets.addEventListener('click', (event) => {
    const btn = event.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'clear-ni') {
      delete state.filters.netIncome[state.activeNiPeriod];
      elements.filterNiMin.value = '';
      elements.filterNiMax.value = '';
      onFiltersChanged();
      return;
    }
    if (btn.dataset.preset === 'ni') {
      handlePresetClick(btn);
    }
  });

  // Performance period selector
  elements.perfPeriodSelector.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-period]');
    if (!btn) return;
    state.activePerfPeriod = btn.dataset.period;
    const perfFilter = state.filters.performance[state.activePerfPeriod] || { min: null, max: null };
    elements.filterPerfMin.value = formatPerfForInput(perfFilter.min);
    elements.filterPerfMax.value = formatPerfForInput(perfFilter.max);
    renderFilterControls();
  });

  // Performance range inputs
  elements.filterPerfMin.addEventListener('input', updatePerfFilter);
  elements.filterPerfMax.addEventListener('input', updatePerfFilter);
  elements.filterPerfMin.addEventListener('blur', () => {
    const perfFilter = state.filters.performance[state.activePerfPeriod];
    elements.filterPerfMin.value = formatPerfForInput(perfFilter?.min ?? null);
  });
  elements.filterPerfMax.addEventListener('blur', () => {
    const perfFilter = state.filters.performance[state.activePerfPeriod];
    elements.filterPerfMax.value = formatPerfForInput(perfFilter?.max ?? null);
  });
  elements.filterPerfClearPeriod.addEventListener('click', () => {
    delete state.filters.performance[state.activePerfPeriod];
    elements.filterPerfMin.value = '';
    elements.filterPerfMax.value = '';
    onFiltersChanged();
  });

  // Static Presets (mcap, pe, price, perf)
  document.getElementById('view-filter').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-preset]');
    if (btn && btn.dataset.preset !== 'ni') {
      handlePresetClick(btn);
    }
  });

  // Active filter summary chips
  elements.filterSummaryChips.addEventListener('click', (event) => {
    const tag = event.target.closest('button[data-tag-key]');
    if (tag) removeFilterByKey(tag.dataset.tagKey);
  });

  elements.filterReset.addEventListener('click', resetFilters);

  // Search input
  elements.filterSearch.addEventListener('input', () => {
    state.query = elements.filterSearch.value;
    renderFilterTable();
  });

  // Sector dropdown
  elements.filterSector.addEventListener('change', () => {
    state.sector = elements.filterSector.value;
    renderKpis();
    renderFilterTable();
  });

  window.addEventListener('hashchange', () => {
    Object.assign(state, parseState(location.hash));
    if (!state.symbol) openedViaPush = false;
    syncInputsFromState();
    render({ updateHash: false });
    syncDetail();
  });
}

async function init() {
  Object.assign(state, parseState(location.hash));
  syncInputsFromState();
  bindEvents();
  render({ updateHash: false });
  try {
    const response = await fetch('data.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.securities = data.securities || [];
    const sectors = [...new Set(state.securities.map((security) => security.sector).filter(Boolean))].sort();
    const sectorOptions = sectors.map((sector) => `<option>${escapeHtml(sector)}</option>`).join('');
    elements.filterSector.insertAdjacentHTML('beforeend', sectorOptions);
    if (state.sector) {
      elements.filterSector.value = state.sector;
    }
    const updated = data.generated_at ? new Date(data.generated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown';
    elements.meta.innerHTML = `<span class="pulse" aria-hidden="true"></span>Prices as of <strong>${escapeHtml(formatDate(data.price_as_of))}</strong>`;
    elements.meta.title = `${state.securities.length} securities · snapshot built ${updated}`;
    renderKpis();
    render({ updateHash: false });
    syncDetail();
  } catch (error) {
    elements.meta.innerHTML = '<span class="pulse offline" aria-hidden="true"></span>Market data unavailable';
    elements.filterBody.innerHTML = `<tr><td colspan="${FILTER_COLUMNS.length + 2}" class="status">Could not load data.json (${escapeHtml(error.message)}).</td></tr>`;
  }
}

init();
