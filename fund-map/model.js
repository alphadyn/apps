import { discountedCashFlowUpside } from '../market-insights/ranking.js';

export const MIN_COVERAGE = 0.8;
export const MAX_HOLDINGS_AGE_DAYS = 45;
export const MAX_SEC_HOLDINGS_AGE_DAYS = 120;

const SHARED_ASSET_PORTFOLIOS = [
  { name: 'Vanguard 500 Index Fund', symbols: ['VFIAX', 'VOO'] },
  { name: 'Vanguard Total Stock Market Index Fund', symbols: ['VTSAX', 'VTI'] },
  { name: 'Vanguard Total International Stock Index Fund', symbols: ['VTIAX', 'VXUS'] },
  { name: 'Vanguard Total Bond Market Index Fund', symbols: ['VBTLX', 'BND'] },
];

function normalizeSymbol(symbol) {
  return symbol.trim().toUpperCase().replace(/[./\s]+/g, '-');
}

export function prepareFunds(payload, assetsSnapshot, holdingsSnapshot = null, now = Date.now()) {
  if (!assetsSnapshot || typeof assetsSnapshot.assets !== 'object' || !assetsSnapshot.assets
    || Array.isArray(assetsSnapshot.assets) || !Number.isFinite(Date.parse(assetsSnapshot.fetched_at))) {
    throw new Error('The fund net-assets snapshot is invalid.');
  }
  const securities = new Map(payload.securities.filter((security) => security.asset_type !== 'fund')
    .map((security) => [normalizeSymbol(security.symbol), security]));
  const seen = new Set();
  const funds = payload.securities.filter((security) => security.asset_type === 'fund').map((security) => {
    if (typeof security.symbol !== 'string' || !security.symbol || seen.has(security.symbol)
      || typeof security.name !== 'string' || !security.name || typeof security.industry !== 'string' || !security.industry) {
      throw new Error('The snapshot contains invalid or duplicate fund records.');
    }
    seen.add(security.symbol);
    const price = Number.isFinite(security.price) && security.price > 0 ? security.price : null;
    const rawAssets = assetsSnapshot.assets[security.symbol];
    const netAssets = Number.isFinite(rawAssets) && rawAssets > 0 ? rawAssets : null;
    const portfolio = holdingsSnapshot?.funds?.[security.symbol];
    let holdingCoverage = null;
    let holdingUpside = null;
    let holdingMaxAgeDays = null;
    if (portfolio) {
      if (!Array.isArray(portfolio.holdings) || !Number.isFinite(Date.parse(portfolio.as_of))
        || typeof portfolio.source !== 'string'
        || (portfolio.asset_class !== undefined && !['equity', 'bond'].includes(portfolio.asset_class))
        || ![
          'https://www.ishares.com/',
          'https://www.ssga.com/',
          'https://investor.vanguard.com/vmf/api/',
          'https://www.sec.gov/Archives/edgar/data/',
        ].some((prefix) => portfolio.source.startsWith(prefix))) {
        throw new Error(`Invalid holdings data for ${security.symbol}.`);
      }
      holdingMaxAgeDays = portfolio.source.startsWith('https://www.sec.gov/')
        ? MAX_SEC_HOLDINGS_AGE_DAYS : MAX_HOLDINGS_AGE_DAYS;
      let weightedUpside = 0;
      holdingCoverage = 0;
      for (const holding of portfolio.holdings) {
        if (typeof holding.symbol !== 'string' || !Number.isFinite(holding.weight)
          || (portfolio.asset_class !== 'bond' && holding.weight < 0)) {
          throw new Error(`Invalid holding for ${security.symbol}.`);
        }
        const upside = portfolio.asset_class === 'bond'
          ? null : discountedCashFlowUpside(securities.get(normalizeSymbol(holding.symbol)));
        if (Number.isFinite(upside)) {
          holdingCoverage += holding.weight;
          weightedUpside += holding.weight * upside;
        }
      }
      const age = now - Date.parse(`${portfolio.as_of}T00:00:00Z`);
      if (holdingCoverage >= MIN_COVERAGE && holdingCoverage <= 1.01
        && age >= -86400000 && age <= holdingMaxAgeDays * 86400000) {
        holdingUpside = weightedUpside / holdingCoverage;
      }
    }
    const fundUpside = price !== null && Number.isFinite(holdingUpside) ? holdingUpside : null;
    return {
      id: security.symbol, symbols: [security.symbol], name: security.name,
      sector: security.industry, type: security.fund_type || 'Fund',
      price, quoteAt: security.quote_at || null,
      upside: fundUpside,
      method: portfolio ? 'holdings' : 'unavailable',
      holdingCoverage, holdingMaxAgeDays, holdingsAsOf: portfolio?.as_of || null, holdingsSource: portfolio?.source || null,
      holdingsAssetClass: portfolio?.asset_class || 'equity',
      fairValue: fundUpside === null ? null : price * (1 + fundUpside),
      netAssets,
      marketCap: netAssets,
    };
  });
  if (!funds.length) throw new Error('The snapshot has no funds.');
  const mapped = funds.filter((fund) => fund.netAssets !== null);
  const fundsById = new Map(funds.map((fund) => [fund.id, fund]));
  const groupedIds = new Set();
  const portfolios = SHARED_ASSET_PORTFOLIOS.flatMap(({ name, symbols }) => {
    const members = symbols.map((symbol) => fundsById.get(symbol)).filter(Boolean);
    if (!members.length) return [];
    for (const member of members) groupedIds.add(member.id);
    const availableAssets = members.map((member) => member.netAssets).filter(Number.isFinite);
    if (new Set(availableAssets).size > 1) {
      throw new Error(`Conflicting pooled net assets for ${symbols.join(' and ')}.`);
    }
    if (members.some((member) => member.sector !== members[0].sector)) {
      throw new Error(`Shared-asset funds have conflicting categories: ${symbols.join(' and ')}.`);
    }
    return [{
      id: symbols.join('/'), symbols: members.map((member) => member.id), members,
      name, sector: members[0].sector, netAssets: availableAssets[0] ?? null,
      marketCap: availableAssets[0] ?? null,
      upside: members.every((member) => member.upside === members[0].upside) ? members[0].upside : null,
    }];
  });
  portfolios.push(...funds.filter((fund) => !groupedIds.has(fund.id)).map((member) => ({
    id: member.id, symbols: [member.id], members: [member], name: member.name,
    sector: member.sector, netAssets: member.netAssets, marketCap: member.marketCap, upside: member.upside,
  })));
  const mappedPortfolios = portfolios.filter((portfolio) => portfolio.netAssets !== null);
  return { funds, mapped, portfolios, mappedPortfolios,
    missing: funds.filter((fund) => fund.netAssets === null),
    assetsFetchedAt: assetsSnapshot.fetched_at };
}
