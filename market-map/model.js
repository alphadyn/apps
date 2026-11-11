import { discountedCashFlowUpside, discountedCashFlowValue } from '../market-insights/ranking.js';

export function prepareMarket(payload) {
  if (!Array.isArray(payload?.securities) || !payload.securities.length) {
    throw new Error('The market snapshot has no securities.');
  }
  const issuers = new Map();
  const symbols = new Set();
  for (const stock of payload.securities) {
    if (stock.asset_type === 'fund') continue;
    if (typeof stock.symbol !== 'string' || !stock.symbol || typeof stock.name !== 'string'
      || symbols.has(stock.symbol)) throw new Error('The snapshot contains invalid or duplicate stock records.');
    symbols.add(stock.symbol);
    const key = stock.cik || stock.symbol;
    if (!issuers.has(key)) issuers.set(key, []);
    issuers.get(key).push(stock);
  }
  if (!issuers.size) throw new Error('The snapshot has no S&P 500 stocks.');
  const companies = [...issuers.values()].map((classes) => {
    // Match Market Insights' first-listed issuer convention, preferring a usable cap.
    const representative = classes.find((stock) => Number.isFinite(stock.market_cap) && stock.market_cap > 0) || classes[0];
    return {
      id: representative.symbol,
      name: representative.name.replace(/ \(Class [^)]+\)/, ''),
      sector: representative.sector || 'Unclassified',
      symbols: classes.map((stock) => stock.symbol),
      classes,
      representative,
      marketCap: Number.isFinite(representative.market_cap) && representative.market_cap > 0
        ? representative.market_cap : null,
      upside: discountedCashFlowUpside(representative),
      fairValue: discountedCashFlowValue(representative),
    };
  }).sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0) || a.id.localeCompare(b.id));
  const mapped = companies.filter((company) => company.marketCap !== null);
  return {
    companies,
    mapped,
    missing: companies.filter((company) => company.marketCap === null),
    stockCount: symbols.size,
    total: mapped.reduce((sum, company) => sum + company.marketCap, 0),
    priceDate: payload.price_as_of,
    generatedAt: payload.generated_at,
  };
}

function upsideColorComponents(upside) {
  const strength = Math.abs(upside) / (Math.abs(upside) + 0.35);
  return {
    hue: upside > 0 ? 140 : 5,
    saturation: 40 + 45 * strength,
    lightness: 62 - 32 * strength,
  };
}

function hslToRgb({ hue, saturation, lightness }) {
  const h = hue / 60;
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(h % 2 - 1));
  const [red, green, blue] = h < 1 ? [chroma, x, 0]
    : h < 2 ? [x, chroma, 0]
      : h < 3 ? [0, chroma, x]
        : h < 4 ? [0, x, chroma]
          : h < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const match = l - chroma / 2;
  return [red + match, green + match, blue + match];
}

function relativeLuminance(rgb) {
  const linear = rgb.map((channel) => channel <= 0.04045
    ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function upsideColor(upside) {
  if (!Number.isFinite(upside)) return '#454d5c';
  if (upside === 0) return '#8a8a8a';
  const { hue, saturation, lightness } = upsideColorComponents(upside);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function upsideTextColor(upside) {
  if (!Number.isFinite(upside)) return '#ffffff';
  const background = relativeLuminance(hslToRgb(upsideColorComponents(upside)));
  const darkText = 0;
  const whiteContrast = 1.05 / (background + 0.05);
  const darkContrast = (background + 0.05) / (darkText + 0.05);
  return whiteContrast >= darkContrast ? '#ffffff' : '#000000';
}

export function matches(company, query) {
  const needle = query.trim().toLowerCase();
  return !needle || [company.name, ...company.symbols].some((value) => value.toLowerCase().includes(needle));
}

// Squarified, gapless treemap. Every tile retains its exact share of the outer area.
export function treemap(companies, width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  const valid = companies.filter((company) => Number.isFinite(company.marketCap) && company.marketCap > 0)
    .sort((a, b) => b.marketCap - a.marketCap);
  const total = valid.reduce((sum, company) => sum + company.marketCap, 0);
  const entries = valid.map((company) => ({ company, area: company.marketCap / total * width * height }));
  const tiles = [];
  let box = { x: 0, y: 0, width, height };
  let row = [];
  function worst(items, side) {
    if (!items.length) return Infinity;
    const sum = items.reduce((value, item) => value + item.area, 0);
    return Math.max(side * side * items[0].area / (sum * sum),
      sum * sum / (side * side * items[items.length - 1].area));
  }
  function place(items) {
    const area = items.reduce((sum, item) => sum + item.area, 0);
    const vertical = box.width >= box.height;
    const thickness = area / (vertical ? box.height : box.width);
    let offset = 0;
    for (const item of items) {
      const length = item.area / thickness;
      tiles.push({
        company: item.company,
        x: box.x + (vertical ? 0 : offset),
        y: box.y + (vertical ? offset : 0),
        width: vertical ? thickness : length,
        height: vertical ? length : thickness,
      });
      offset += length;
    }
    box = vertical
      ? { ...box, x: box.x + thickness, width: Math.max(0, box.width - thickness) }
      : { ...box, y: box.y + thickness, height: Math.max(0, box.height - thickness) };
  }
  for (const entry of entries) {
    const side = Math.min(box.width, box.height);
    if (row.length && worst([...row, entry], side) > worst(row, side)) {
      place(row);
      row = [];
    }
    row.push(entry);
  }
  if (row.length) place(row);
  return tiles;
}

export function money(value) {
  if (!Number.isFinite(value)) return 'Unavailable';
  for (const [scale, suffix] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M']]) {
    if (Math.abs(value) >= scale) return `$${(value / scale).toFixed(2)}${suffix}`;
  }
  return `$${value.toFixed(2)}`;
}

export function percent(value) {
  return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%` : 'N/A';
}
