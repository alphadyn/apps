import {
  RANGES, formatAxisDate, formatLongDate, historyFileFor, logTicks, nearestIndex, niceTicks, parseHistory,
  rangeSummaries, sliceRange,
} from './history.js';
import { CRITERIA, formatPE, formatPercent, formatPrice, formatValue, getSecurityPE } from './ranking.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const historyCache = new Map();

export function loadHistory(symbol) {
  if (!historyCache.has(symbol)) {
    const request = fetch(`history/${historyFileFor(symbol)}`, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(parseHistory)
      .catch((error) => {
        historyCache.delete(symbol);
        throw error;
      });
    historyCache.set(symbol, request);
  }
  return historyCache.get(symbol);
}

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

function tone(value) {
  if (!Number.isFinite(value) || value === 0) return '';
  return value > 0 ? 'up' : 'down';
}

function formatSignedMoney(value) {
  if (!Number.isFinite(value)) return '—';
  const text = formatPrice(Math.abs(value));
  return value > 0 ? `+${text}` : value < 0 ? `\u2212${text}` : text;
}

function formatAxisPrice(value) {
  const digits = value < 1 ? 3 : value < 10 ? 2 : 0;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: digits })}`;
}

function annualized(slice) {
  const years = (slice.last.day - slice.base.day) / 365.25;
  return years >= 0.99 ? (1 + slice.change) ** (1 / years) - 1 : null;
}

export function createDetailView({ onRequestClose, onNavigate, onRangeChange, onShare }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    dialog: $('detail'), back: $('detail-back'), share: $('detail-share'), previous: $('detail-previous'), next: $('detail-next'),
    symbol: $('detail-symbol'), name: $('detail-name'),
    sector: $('detail-sector'), price: $('detail-price'), change: $('detail-change'), period: $('detail-period'),
    tabs: $('range-tabs'), caption: $('chart-caption'), log: $('log-scale'), chart: $('chart'),
    tooltip: $('chart-tooltip'), periodStats: $('period-stats'), metricStats: $('metric-stats'),
    detailPerfBody: $('detail-perf-body'),
  };
  const view = { security: null, range: null, points: null, slice: null, status: 'idle', geometry: null, active: null };

  function rangeMeta(key) {
    return RANGES.find((range) => range.key === key);
  }

  function renderHeader() {
    const { security, slice } = view;
    el.symbol.textContent = security.symbol;
    el.name.textContent = security.name;
    el.sector.textContent = [security.sector, security.industry].filter(Boolean).join(' · ');
    el.price.textContent = formatPrice(security.price);
    if (!slice) {
      el.change.textContent = '';
      el.change.className = '';
      el.period.textContent = security.price_date ? `Close on ${formatLongDate(Date.parse(security.price_date) / 86_400_000)}` : '';
      return;
    }
    el.change.textContent = `${formatSignedMoney(slice.changeAmount)} (${formatPercent(slice.change)})`;
    el.change.className = tone(slice.change);
    const since = slice.partial ? 'since first available close' : 'since';
    el.period.textContent = `${rangeMeta(view.range).name} · ${since} ${formatLongDate(slice.base.day)}`;
  }

  function renderTabs() {
    const summaries = view.points?.length ? rangeSummaries(view.points) : RANGES.map(({ key }) => ({ key, change: null }));
    el.tabs.innerHTML = summaries.map(({ key, change, partial }) => {
      const meta = rangeMeta(key);
      const pressed = key === view.range;
      const note = partial && key !== 'all' ? ' title="History is shorter than this period; measured from the first available close"' : '';
      return `<button type="button" data-range="${key}" aria-pressed="${pressed}" aria-label="${meta.name}: ${formatPercent(change)}"${note}>
        <span>${meta.label}</span><small class="${tone(change)}">${formatPercent(change)}${partial && key !== 'all' ? '*' : ''}</small></button>`;
    }).join('');
  }

  function renderPerformanceTable() {
    if (!el.detailPerfBody) return;
    if (!view.points?.length) {
      el.detailPerfBody.innerHTML = '<tr><td colspan="9" class="status">Loading performance history…</td></tr>';
      return;
    }
    const rows = RANGES.map(({ key, label, name }) => {
      const slice = sliceRange(view.points, key);
      if (!slice) return '';
      const isActive = key === view.range;
      const activeClass = isActive ? ' class="perf-row active-perf-row"' : ' class="perf-row"';
      const ariaCurrent = isActive ? ' aria-current="true"' : '';
      const returnTone = tone(slice.change);
      const ann = annualized(slice);
      const annTone = ann !== null ? tone(ann) : '';
      const dates = `${formatLongDate(slice.base.day)} – ${formatLongDate(slice.last.day)}`;
      const note = slice.partial && key !== 'all' ? '*' : '';
      return `<tr${activeClass}${ariaCurrent} data-range="${key}" tabindex="0" role="button" title="View ${escapeHtml(name)} on chart">
        <td class="perf-period-col"><strong>${escapeHtml(label)}</strong> <span class="perf-period-name">(${escapeHtml(name)})</span>${note ? `<span title="History is shorter than this period; measured from first available close">*</span>` : ''}</td>
        <td class="perf-dates-col">${escapeHtml(dates)}</td>
        <td class="num">${formatPrice(slice.base.close)}</td>
        <td class="num">${formatPrice(slice.last.close)}</td>
        <td class="num ${returnTone}"><span class="delta">${formatPercent(slice.change)}</span></td>
        <td class="num ${returnTone}">${formatSignedMoney(slice.changeAmount)}</td>
        <td class="num ${annTone}">${ann !== null ? formatPercent(ann) : '—'}</td>
        <td class="num">${formatPrice(slice.high.close)}</td>
        <td class="num">${formatPrice(slice.low.close)}</td>
      </tr>`;
    }).filter(Boolean);

    el.detailPerfBody.innerHTML = rows.join('');
  }

  function renderStats() {
    const { slice, security } = view;
    const rows = slice ? [
      ['Start', `${formatPrice(slice.base.close)}`, formatLongDate(slice.base.day)],
      ['End', `${formatPrice(slice.last.close)}`, formatLongDate(slice.last.day)],
      ['Change', `<span class="${tone(slice.change)}">${formatPercent(slice.change)}</span>`, formatSignedMoney(slice.changeAmount)],
      ['Annualized', annualized(slice) === null ? '—' : `<span class="${tone(annualized(slice))}">${formatPercent(annualized(slice))}</span>`, 'Compound annual rate'],
      ['High', formatPrice(slice.high.close), formatLongDate(slice.high.day)],
      ['Low', formatPrice(slice.low.close), formatLongDate(slice.low.day)],
    ] : [];
    el.periodStats.innerHTML = rows.length
      ? rows.map(([label, value, note]) => `<div><dt>${label}</dt><dd>${value}<small>${escapeHtml(note)}</small></dd></div>`).join('')
      : '<div><dt>Period</dt><dd>—</dd></div>';

    const pe = getSecurityPE(security);
    const metricCards = [
      ...CRITERIA.map(({ key, label, format }) => {
        const value = security[key];
        const toneClass = format === 'percent' || (format === 'money' && value < 0) ? tone(value) : '';
        return `<div><dt>${escapeHtml(label)}</dt><dd class="${toneClass}">${formatValue(format, value)}</dd></div>`;
      }),
      `<div><dt>P/E ratio (TTM)</dt><dd>${formatPE(pe)}</dd></div>`,
    ];
    el.metricStats.innerHTML = metricCards.join('');
  }

  function renderChart() {
    hideTooltip();
    const { slice } = view;
    if (view.status === 'loading') {
      el.chart.innerHTML = '<p class="chart-status">Loading price history…</p>';
      el.caption.textContent = '';
      return;
    }
    if (view.status === 'error' || !slice || slice.points.length < 2) {
      el.chart.innerHTML = `<p class="chart-status">Price history isn't available for ${escapeHtml(view.security.symbol)} right now.</p>`;
      el.caption.textContent = '';
      view.geometry = null;
      return;
    }

    const points = slice.points;
    const width = Math.max(300, el.chart.clientWidth);
    const height = width < 600 ? 260 : 380;
    const pad = { top: 16, right: 62, bottom: 30, left: 10 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const firstDay = points[0].day;
    const spanDays = Math.max(1, points.at(-1).day - firstDay);
    const useLog = el.log.checked;
    const scale = useLog ? Math.log10 : (value) => value;

    let low = Infinity;
    let high = -Infinity;
    for (const point of points) {
      low = Math.min(low, point.close);
      high = Math.max(high, point.close);
    }
    let bottom = scale(low);
    let top = scale(high);
    const padding = (top - bottom) * 0.08 || Math.abs(top) * 0.05 || 1;
    bottom -= padding;
    top += padding;
    if (!useLog) bottom = Math.max(0, bottom);

    const xOf = (day) => pad.left + ((day - firstDay) / spanDays) * innerWidth;
    const yOf = (close) => pad.top + ((top - scale(close)) / (top - bottom)) * innerHeight;
    const yTicks = (useLog ? logTicks(10 ** bottom, 10 ** top) : niceTicks(bottom, top, 5))
      .filter((value) => value > 0 || !useLog);
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => firstDay + Math.round(spanDays * fraction));
    const line = points.map((point, index) => `${index ? 'L' : 'M'}${xOf(point.day).toFixed(1)},${yOf(point.close).toFixed(1)}`).join('');
    const baseY = yOf(slice.base.close).toFixed(1);
    const chartBottom = pad.top + innerHeight;
    const direction = slice.change >= 0 ? 'up' : 'down';
    const summary = `${view.security.symbol} closing price over ${rangeMeta(view.range).name.toLowerCase()}: `
      + `${formatPrice(slice.base.close)} on ${formatLongDate(slice.base.day)} to ${formatPrice(slice.last.close)} on ${formatLongDate(slice.last.day)}, ${formatPercent(slice.change)}.`;

    el.chart.innerHTML = `
      <svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="chart-svg ${direction}"
        role="img" tabindex="0" aria-label="${escapeHtml(summary)} Use arrow keys to inspect closes.">
        <defs><linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" class="fill-top"/><stop offset="100%" class="fill-bottom"/></linearGradient></defs>
        <g class="grid">${yTicks.map((value) => `<line x1="${pad.left}" x2="${pad.left + innerWidth}" y1="${yOf(value).toFixed(1)}" y2="${yOf(value).toFixed(1)}"/>`).join('')}</g>
        <g class="y-labels">${yTicks.map((value) => `<text x="${width - pad.right + 8}" y="${yOf(value).toFixed(1)}" dy="0.32em">${formatAxisPrice(value)}</text>`).join('')}</g>
        <g class="x-labels">${xTicks.map((day, index) => {
          const anchor = index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle';
          return `<text x="${xOf(day).toFixed(1)}" y="${height - 8}" text-anchor="${anchor}">${formatAxisDate(day, spanDays)}</text>`;
        }).join('')}</g>
        <line class="baseline" x1="${pad.left}" x2="${pad.left + innerWidth}" y1="${baseY}" y2="${baseY}"/>
        <path class="area" d="${line}L${xOf(points.at(-1).day).toFixed(1)},${chartBottom}L${xOf(firstDay).toFixed(1)},${chartBottom}Z"/>
        <path class="line" d="${line}"/>
        <g class="cursor" visibility="hidden"><line y1="${pad.top}" y2="${chartBottom}"/><circle r="4.5"/></g>
      </svg>`;
    view.geometry = { width, xOf, yOf, firstDay, spanDays, pad, innerWidth };
    const shortHistory = rangeSummaries(view.points).some(({ key, partial }) => partial && key !== 'all');
    el.caption.textContent = `${points.length.toLocaleString('en-US')} closes · ${useLog ? 'log' : 'linear'} scale`
      + (shortHistory ? ' · * listed for less than the full period' : '');
  }

  function hideTooltip() {
    view.active = null;
    el.tooltip.hidden = true;
    el.chart.querySelector('.cursor')?.setAttribute('visibility', 'hidden');
  }

  function showPoint(index) {
    const { slice, geometry } = view;
    if (!slice || !geometry) return;
    view.active = Math.max(0, Math.min(slice.points.length - 1, index));
    const point = slice.points[view.active];
    const x = geometry.xOf(point.day);
    const y = geometry.yOf(point.close);
    const cursor = el.chart.querySelector('.cursor');
    cursor.setAttribute('visibility', 'visible');
    cursor.querySelector('line').setAttribute('x1', x);
    cursor.querySelector('line').setAttribute('x2', x);
    cursor.querySelector('circle').setAttribute('cx', x);
    cursor.querySelector('circle').setAttribute('cy', y);

    const change = point.close / slice.base.close - 1;
    el.tooltip.innerHTML = `<span>${formatLongDate(point.day)}</span><strong>${formatPrice(point.close)}</strong>
      <span class="${tone(change)}">${formatPercent(change)} vs. start</span>`;
    el.tooltip.hidden = false;
    const svg = el.chart.querySelector('svg');
    const ratio = svg.getBoundingClientRect().width / geometry.width;
    const left = x * ratio + el.chart.offsetLeft;
    const flip = left > el.chart.offsetLeft + el.chart.clientWidth * 0.6;
    el.tooltip.style.left = `${left}px`;
    el.tooltip.style.top = `${Math.max(0, y * ratio + el.chart.offsetTop - 70)}px`;
    el.tooltip.style.transform = flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)';
  }

  function pointerToIndex(event) {
    const svg = el.chart.querySelector('svg');
    const { geometry, slice } = view;
    if (!svg || !geometry) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * geometry.width;
    const day = geometry.firstDay + ((x - geometry.pad.left) / geometry.innerWidth) * geometry.spanDays;
    return nearestIndex(slice.points, day);
  }

  function renderAll() {
    view.slice = view.points?.length ? sliceRange(view.points, view.range) : null;
    renderHeader();
    renderTabs();
    renderChart();
    renderStats();
    renderPerformanceTable();
  }

  async function load(security) {
    view.points = null;
    view.status = 'loading';
    renderAll();
    try {
      const points = await loadHistory(security.symbol);
      if (view.security !== security) return;
      view.points = points;
      view.status = points.length ? 'ready' : 'error';
    } catch {
      if (view.security !== security) return;
      view.status = 'error';
    }
    renderAll();
  }

  el.chart.addEventListener('pointermove', (event) => {
    const index = pointerToIndex(event);
    if (index !== null) showPoint(index);
  });
  el.chart.addEventListener('pointerleave', hideTooltip);
  el.chart.addEventListener('keydown', (event) => {
    if (!view.slice) return;
    const last = view.slice.points.length - 1;
    const step = event.shiftKey ? 10 : 1;
    const current = view.active ?? last;
    const next = { ArrowLeft: current - step, ArrowRight: current + step, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    showPoint(next);
  });
  el.chart.addEventListener('focusout', hideTooltip);
  el.tabs.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-range]');
    if (!button || button.dataset.range === view.range) return;
    view.range = button.dataset.range;
    renderAll();
    el.tabs.querySelector(`button[data-range="${view.range}"]`)?.focus();
    onRangeChange(view.range);
  });
  el.detailPerfBody?.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-range]');
    if (!row || row.dataset.range === view.range) return;
    view.range = row.dataset.range;
    renderAll();
    onRangeChange(view.range);
  });
  el.detailPerfBody?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const row = event.target.closest('tr[data-range]');
      if (!row) return;
      event.preventDefault();
      view.range = row.dataset.range;
      renderAll();
      onRangeChange(view.range);
    }
  });
  el.log.addEventListener('change', renderChart);
  el.back.addEventListener('click', onRequestClose);
  if (onShare) el.share?.addEventListener('click', onShare);
  el.dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      onNavigate(event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    onRequestClose();
  });
  el.previous.addEventListener('click', () => onNavigate(-1));
  el.next.addEventListener('click', () => onNavigate(1));
  el.dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    onRequestClose();
  });
  el.dialog.addEventListener('click', (event) => {
    if (event.target === el.dialog) onRequestClose();
  });
  new ResizeObserver(() => {
    if (el.dialog.open && view.slice) renderChart();
  }).observe(el.chart);

  return {
    open(security, range) {
      const changedSecurity = view.security?.symbol !== security.symbol;
      view.security = security;
      view.range = range;
      if (!el.dialog.open) {
        el.dialog.showModal();
        document.body.classList.add('detail-open');
        el.back.focus();
      }
      el.dialog.querySelector('.detail-inner').scrollTop = 0;
      if (changedSecurity) load(security);
      else renderAll();
    },
    close() {
      if (!el.dialog.open) return;
      el.dialog.close();
      view.security = null;
      document.body.classList.remove('detail-open');
    },
    setNavigation(canPrevious, canNext) {
      el.previous.disabled = !canPrevious;
      el.next.disabled = !canNext;
    },
    get isOpen() {
      return el.dialog.open;
    },
  };
}
