import { prepareMarket } from '../market-map/model.js';
import { discountedCashFlowUpside } from '../market-insights/ranking.js';

export const MIN_COVERAGE = 0.8;
export const MAX_HOLDINGS_AGE_DAYS = 45;

export function prepareFunds(payload, assetsSnapshot, holdingsSnapshot = null, now = Date.now()) {
  if (!assetsSnapshot || typeof assetsSnapshot.assets !== 'object' || !assetsSnapshot.assets
    || Array.isArray(assetsSnapshot.assets) || !Number.isFinite(Date.parse(assetsSnapshot.fetched_at))) {
    throw new Error('The fund net-assets snapshot is invalid.');
  }
  const market = prepareMarket(payload);
  const valued = market.mapped.filter((company) => Number.isFinite(company.upside));
  const valuedCap = valued.reduce((sum, company) => sum + company.marketCap, 0);
  const companyCoverage = market.mapped.length / market.companies.length;
  const capCoverage = market.total > 0 ? valuedCap / market.total : 0;
  const upside = companyCoverage >= MIN_COVERAGE && capCoverage >= MIN_COVERAGE
    ? valued.reduce((sum, company) => sum + company.marketCap * company.upside, 0) / valuedCap
    : null;
  const proxy = {
    upside: Number.isFinite(upside) ? upside : null,
    companyCoverage,
    capCoverage,
    mappedCount: market.mapped.length,
    companyCount: market.companies.length,
    valuedCount: valued.length,
  };
  const securities = new Map(payload.securities.filter((security) => security.asset_type !== 'fund')
    .map((security) => [security.symbol.replace(/\./g, '-'), security]));
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
    if (portfolio) {
      if (!Array.isArray(portfolio.holdings) || !Number.isFinite(Date.parse(portfolio.as_of))
        || typeof portfolio.source !== 'string' || !portfolio.source.startsWith('https://www.ishares.com/')) {
        throw new Error(`Invalid holdings data for ${security.symbol}.`);
      }
      let weightedUpside = 0;
      holdingCoverage = 0;
      for (const holding of portfolio.holdings) {
        if (typeof holding.symbol !== 'string' || !Number.isFinite(holding.weight) || holding.weight <= 0) {
          throw new Error(`Invalid holding for ${security.symbol}.`);
        }
        const upside = discountedCashFlowUpside(securities.get(holding.symbol.replace(/\./g, '-')));
        if (Number.isFinite(upside)) {
          holdingCoverage += holding.weight;
          weightedUpside += holding.weight * upside;
        }
      }
      const age = now - Date.parse(`${portfolio.as_of}T00:00:00Z`);
      if (holdingCoverage >= MIN_COVERAGE && holdingCoverage <= 1.01
        && age >= -86400000 && age <= MAX_HOLDINGS_AGE_DAYS * 86400000) {
        holdingUpside = weightedUpside / holdingCoverage;
      }
    }
    const estimate = portfolio ? holdingUpside : security.industry === 'S&P 500' ? proxy.upside : null;
    const fundUpside = price !== null && Number.isFinite(estimate) ? estimate : null;
    return {
      id: security.symbol, symbols: [security.symbol], name: security.name,
      sector: security.industry, type: security.fund_type || 'Fund',
      price, quoteAt: security.quote_at || null,
      upside: fundUpside,
      method: portfolio ? 'holdings' : security.industry === 'S&P 500' ? 'index proxy' : 'unavailable',
      holdingCoverage, holdingsAsOf: portfolio?.as_of || null, holdingsSource: portfolio?.source || null,
      fairValue: fundUpside === null ? null : price * (1 + fundUpside),
      netAssets,
      marketCap: netAssets,
    };
  });
  if (!funds.length) throw new Error('The snapshot has no funds.');
  const mapped = funds.filter((fund) => fund.netAssets !== null);
  return { funds, mapped, missing: funds.filter((fund) => fund.netAssets === null), proxy,
    assetsFetchedAt: assetsSnapshot.fetched_at };
}
