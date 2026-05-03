import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Search,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { MOCK_SYMBOLS } from '../constants';
import { Position, SymbolInfo } from '../types';

interface AssetsProps {
  basePath: '/app' | '/demo';
  positions: Position[];
  symbols: SymbolInfo[];
}

type StrategyProfile = 'balanced' | 'momentum' | 'defensive';
type PriceBand = 'all' | 'under200' | '200to500' | 'over500';
type VolatilityBand = 'all' | 'steady' | 'active' | 'aggressive';

interface RankedStock extends SymbolInfo {
  sector: string;
  liquidityScore: number;
  volatilityScore: number;
  trendScore: number;
  strategyScore: number;
  confidence: number;
  gridLower: number;
  gridUpper: number;
  gridLevels: number;
  gridSpacing: number;
  capitalAllocation: number;
  estimatedDailyProfit: number;
  monthlyWinRate: number;
}

const SECTOR_MAP: Record<string, string> = {
  AAPL: 'Consumer Tech',
  TSLA: 'Mobility',
  NVDA: 'AI Infrastructure',
  META: 'Digital Media',
  NFLX: 'Media',
  AMD: 'Semiconductors',
  INTC: 'Semiconductors',
  ORCL: 'Enterprise Software',
  CRM: 'Enterprise Software',
  JPM: 'Financials',
  BAC: 'Financials',
  DIS: 'Consumer Media',
  MSFT: 'Cloud',
  GOOGL: 'Advertising',
  AMZN: 'Commerce',
};

const PROFILE_COPY: Record<StrategyProfile, { label: string; description: string }> = {
  balanced: {
    label: 'Balanced Scan',
    description: 'Mixes liquidity, trend strength, and contained volatility for durable grid rotation.',
  },
  momentum: {
    label: 'Momentum Scan',
    description: 'Prioritizes strong directional flow and wider bands for faster grid turnover.',
  },
  defensive: {
    label: 'Defensive Scan',
    description: 'Favors lower-volatility names with tighter ladders and smaller downside excursions.',
  },
};

function formatCurrency(value: number, maximumFractionDigits = 2) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: maximumFractionDigits === 0 ? 0 : 2,
    maximumFractionDigits,
  })}`;
}

function formatSigned(value: number, suffix = '') {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
}

function symbolSeed(symbol: string) {
  return symbol.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function matchesPriceBand(price: number, band: PriceBand) {
  if (band === 'under200') return price < 200;
  if (band === '200to500') return price >= 200 && price <= 500;
  if (band === 'over500') return price > 500;
  return true;
}

function matchesVolatilityBand(volatilityScore: number, band: VolatilityBand) {
  if (band === 'steady') return volatilityScore < 4.5;
  if (band === 'active') return volatilityScore >= 4.5 && volatilityScore < 6.6;
  if (band === 'aggressive') return volatilityScore >= 6.6;
  return true;
}

function buildRankedStock(symbol: SymbolInfo, profile: StrategyProfile): RankedStock {
  const seed = symbolSeed(symbol.symbol);
  const priceDrift = ((seed % 9) - 4) * 0.22;
  const volatilityScore = clamp(Math.abs(symbol.changePercent) * 1.35 + (seed % 5) + 1.8, 2.2, 9.4);
  const liquidityScore = clamp(5.4 + ((seed % 11) * 0.34), 4.8, 9.7);
  const trendScore = clamp(5 + symbol.changePercent * 1.65 + priceDrift, 1.8, 9.8);

  const scoreByProfile = {
    balanced: liquidityScore * 0.4 + volatilityScore * 0.35 + trendScore * 0.25,
    momentum: trendScore * 0.5 + volatilityScore * 0.35 + liquidityScore * 0.15,
    defensive: liquidityScore * 0.45 + (10 - volatilityScore) * 0.3 + trendScore * 0.25,
  };

  const strategyScore = clamp(scoreByProfile[profile], 1, 9.9);
  const rangePercent = clamp(volatilityScore * 0.65, 1.8, 6.8);
  const gridLevels = clamp(Math.round(5 + volatilityScore / 1.55), 5, 9);
  const gridLower = symbol.price * (1 - rangePercent / 100);
  const gridUpper = symbol.price * (1 + rangePercent / 100);
  const gridSpacing = (gridUpper - gridLower) / (gridLevels - 1);
  const capitalAllocation = clamp(symbol.price * (18 + volatilityScore * 4.8), 3500, 24000);
  const estimatedDailyProfit = capitalAllocation * ((0.38 + volatilityScore * 0.11) / 100);
  const confidence = clamp(58 + strategyScore * 3.6, 61, 93);
  const monthlyWinRate = clamp(54 + strategyScore * 3.1 - Math.max(0, volatilityScore - 6.5) * 1.8, 56, 82);

  return {
    ...symbol,
    sector: SECTOR_MAP[symbol.symbol] ?? 'Large Cap',
    liquidityScore,
    volatilityScore,
    trendScore,
    strategyScore,
    confidence,
    gridLower,
    gridUpper,
    gridLevels,
    gridSpacing,
    capitalAllocation,
    estimatedDailyProfit,
    monthlyWinRate,
  };
}

export default function Assets({ basePath, positions, symbols }: AssetsProps) {
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<StrategyProfile>('balanced');
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [volatilityBand, setVolatilityBand] = useState<VolatilityBand>('active');
  const [selectedSector, setSelectedSector] = useState<string>('all');

  const liveSymbols = symbols.length > 0 ? symbols : MOCK_SYMBOLS;
  const stockUniverse = useMemo(
    () => liveSymbols.filter((symbol) => symbol.type === 'stock').map((symbol) => buildRankedStock(symbol, profile)),
    [liveSymbols, profile]
  );

  const sectors = useMemo(
    () => ['all', ...new Set(stockUniverse.map((symbol) => symbol.sector))],
    [stockUniverse]
  );

  const filteredStocks = useMemo(() => {
    return stockUniverse
      .filter((symbol) => matchesPriceBand(symbol.price, priceBand))
      .filter((symbol) => matchesVolatilityBand(symbol.volatilityScore, volatilityBand))
      .filter((symbol) => selectedSector === 'all' || symbol.sector === selectedSector)
      .filter((symbol) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          symbol.symbol.toLowerCase().includes(query) ||
          symbol.name.toLowerCase().includes(query) ||
          symbol.sector.toLowerCase().includes(query)
        );
      })
      .sort((left, right) => right.strategyScore - left.strategyScore);
  }, [priceBand, search, selectedSector, stockUniverse, volatilityBand]);

  const autoSelectedStocks = filteredStocks.slice(0, 6);
  const [selectedSymbolId, setSelectedSymbolId] = useState(autoSelectedStocks[0]?.symbol || stockUniverse[0]?.symbol || 'AAPL');

  useEffect(() => {
    if (autoSelectedStocks.length === 0) {
      return;
    }

    if (!autoSelectedStocks.some((symbol) => symbol.symbol === selectedSymbolId)) {
      setSelectedSymbolId(autoSelectedStocks[0].symbol);
    }
  }, [autoSelectedStocks, selectedSymbolId]);

  const selectedStock =
    autoSelectedStocks.find((symbol) => symbol.symbol === selectedSymbolId) ||
    filteredStocks[0] ||
    stockUniverse[0];

  const selectedHolding = positions.find((position) => position.symbol === selectedStock?.symbol);

  const gridLevels = useMemo(() => {
    if (!selectedStock) {
      return [];
    }

    const midpoint = Math.floor(selectedStock.gridLevels / 2);

    return Array.from({ length: selectedStock.gridLevels }, (_, index) => {
      const price = selectedStock.gridLower + selectedStock.gridSpacing * index;
      const quantity = Math.max(1, Math.floor((selectedStock.capitalAllocation / selectedStock.gridLevels) / price));
      const distance = index - midpoint;

      return {
        level: selectedStock.gridLevels - index,
        price,
        quantity,
        zone: distance < 0 ? 'Accumulation' : distance > 0 ? 'Distribution' : 'Anchor',
        action: distance < 0 ? 'Buy' : distance > 0 ? 'Sell' : 'Hold',
        active: Math.abs(price - selectedStock.price) <= selectedStock.gridSpacing / 1.8,
      };
    }).reverse();
  }, [selectedStock]);

  const recentExecutions = useMemo(() => {
    if (!selectedStock) {
      return [];
    }

    const now = new Date();
    const seed = symbolSeed(selectedStock.symbol);

    return Array.from({ length: 5 }, (_, index) => {
      const direction = index % 2 === 0 ? 'Buy' : 'Sell';
      const priceOffset = (2 - index) * (selectedStock.gridSpacing * 0.55);
      const fillPrice = selectedStock.price - priceOffset;
      const realizedPnL = selectedStock.estimatedDailyProfit * (0.16 + index * 0.06);
      const filledAt = new Date(now.getTime() - (index + 1) * 42 * 60 * 1000 - (seed % 18) * 60000);

      return {
        id: `${selectedStock.symbol}-${index}`,
        direction,
        fillPrice,
        quantity: Math.max(2, Math.floor((selectedStock.capitalAllocation / 10) / fillPrice)),
        realizedPnL,
        filledAt: new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        }).format(filledAt),
      };
    });
  }, [selectedStock]);

  const summaryCards = [
    { label: 'Universe Scanned', value: stockUniverse.length.toString(), hint: 'US equities only' },
    { label: 'Qualified Stocks', value: filteredStocks.length.toString(), hint: 'Passing active filters' },
    { label: 'Grid Basket', value: autoSelectedStocks.length.toString(), hint: 'Auto-selected entries' },
    {
      label: 'Projected Daily Edge',
      value: formatCurrency(autoSelectedStocks.reduce((total, stock) => total + stock.estimatedDailyProfit, 0), 0),
      hint: 'Modeled net capture',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6 md:p-8 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
                Automated grid engine
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Auto-select stocks, set the ladder, and harvest the range.</h2>
              <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-2xl">
                The engine scans the market, ranks liquid names that fit your filter set, then deploys a price grid that buys weakness and sells strength inside a defined channel.
              </p>
            </div>

            <div className="rounded-3xl border border-yellow-500/15 bg-black/25 px-5 py-4 min-w-[280px]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Active mode</p>
              <div className="mt-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Bot size={18} className="text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{PROFILE_COPY[profile].label}</p>
                  <p className="mt-1 text-xs text-zinc-400 max-w-xs">{PROFILE_COPY[profile].description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-zinc-800/70 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">{card.label}</p>
                <p className="mt-2 text-2xl font-mono font-bold text-white">{card.value}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{card.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-6">
        <div className="space-y-6">
          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <SlidersHorizontal size={16} className="text-yellow-300" />
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Auto-selection filters</p>
                </div>
                <h3 className="text-lg font-bold">Market scan controls</h3>
                <p className="text-xs text-zinc-500">Change the ranking model, price band, or volatility appetite and the basket rebalances instantly.</p>
              </div>

              <div className="relative w-full md:w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Search stock, company, sector..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold mb-2">Strategy profile</p>
                <div className="flex flex-wrap gap-2">
                  {(['balanced', 'momentum', 'defensive'] as StrategyProfile[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => setProfile(option)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                        profile === option
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {PROFILE_COPY[option].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold mb-2">Price band</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'Any' },
                      { key: 'under200', label: '< $200' },
                      { key: '200to500', label: '$200-$500' },
                      { key: 'over500', label: '> $500' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setPriceBand(option.key as PriceBand)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          priceBand === option.key
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold mb-2">Volatility</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'steady', label: 'Steady' },
                      { key: 'active', label: 'Active' },
                      { key: 'aggressive', label: 'High Beta' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setVolatilityBand(option.key as VolatilityBand)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          volatilityBand === option.key
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold mb-2">Sector</p>
                  <div className="flex flex-wrap gap-2">
                    {sectors.map((sector) => (
                      <button
                        key={sector}
                        onClick={() => setSelectedSector(sector)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          selectedSector === sector
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {sector === 'all' ? 'All sectors' : sector}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Auto-selected basket</p>
                <h3 className="text-lg font-bold mt-1">Grid-ready stocks</h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[11px] font-bold text-yellow-300">
                <Target size={12} />
                Top ranked by current filter set
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {autoSelectedStocks.map((symbol, index) => (
                <button
                  key={symbol.symbol}
                  onClick={() => setSelectedSymbolId(symbol.symbol)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    selectedStock?.symbol === symbol.symbol
                      ? 'bg-yellow-500/5 border-yellow-500/30 ring-1 ring-yellow-500/25'
                      : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-300 font-bold">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-bold text-white">{symbol.symbol}</span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">{symbol.name}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{symbol.sector}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-white">{formatCurrency(symbol.price)}</p>
                      <div className={`mt-1 text-[10px] font-bold flex items-center justify-end gap-1 ${symbol.change >= 0 ? 'text-yellow-300' : 'text-rose-400'}`}>
                        {symbol.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {formatSigned(symbol.changePercent, '%')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-black/20 border border-zinc-800/70 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Score</p>
                      <p className="mt-1 text-sm font-mono font-bold text-white">{symbol.strategyScore.toFixed(1)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 border border-zinc-800/70 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Grid</p>
                      <p className="mt-1 text-sm font-mono font-bold text-white">{symbol.gridLevels} lvls</p>
                    </div>
                    <div className="rounded-xl bg-black/20 border border-zinc-800/70 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Daily Edge</p>
                      <p className="mt-1 text-sm font-mono font-bold text-white">{formatCurrency(symbol.estimatedDailyProfit, 0)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {autoSelectedStocks.length === 0 && (
              <div className="p-10 border border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500 mt-4">
                No stocks matched the current grid filter set.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-yellow-300" />
                <h3 className="text-lg font-bold">Grid ladder</h3>
              </div>
              <div className="space-y-3">
                {gridLevels.map((level) => (
                  <div
                    key={`${level.level}-${level.price}`}
                    className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 ${
                      level.active
                        ? 'border-yellow-500/30 bg-yellow-500/10'
                        : 'border-zinc-800/70 bg-zinc-900/30'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-white">Level {level.level}</p>
                      <p className="text-[11px] text-zinc-500">{level.zone} zone</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-white">{formatCurrency(level.price)}</p>
                      <p className={`text-[11px] font-bold ${level.action === 'Sell' ? 'text-yellow-300' : level.action === 'Buy' ? 'text-sky-300' : 'text-zinc-400'}`}>
                        {level.action} {level.quantity} sh
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bot size={18} className="text-yellow-300" />
                <h3 className="text-lg font-bold">Execution loop</h3>
              </div>
              <div className="space-y-3">
                {recentExecutions.map((execution) => (
                  <div key={execution.id} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{execution.direction} fill</p>
                        <p className="text-[11px] text-zinc-500">{execution.filledAt} local time</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-white">{formatCurrency(execution.fillPrice)}</p>
                        <p className="text-[11px] text-zinc-500">{execution.quantity} shares</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Realized spread capture</span>
                      <span className="font-bold text-yellow-300">{formatCurrency(execution.realizedPnL)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6 sticky top-24">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Selected engine</p>
                <h3 className="text-2xl font-bold mt-1">{selectedStock?.symbol ?? 'No symbol'}</h3>
              </div>
              <Link
                to={`${basePath}/trade`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-300 text-xs font-bold uppercase tracking-wider"
              >
                Open trade
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {selectedStock ? (
              <>
                <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4 mb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 font-medium">{selectedStock.name}</p>
                      <p className="mt-2 text-3xl font-mono font-bold text-white">{formatCurrency(selectedStock.price)}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{selectedStock.sector}</p>
                    </div>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${selectedStock.change >= 0 ? 'text-yellow-300 bg-yellow-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                      {selectedStock.change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {formatSigned(selectedStock.change, '')} ({formatSigned(selectedStock.changePercent, '%')})
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Range floor</p>
                    <p className="text-sm font-bold">{formatCurrency(selectedStock.gridLower)}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Range ceiling</p>
                    <p className="text-sm font-bold">{formatCurrency(selectedStock.gridUpper)}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Grid spacing</p>
                    <p className="text-sm font-bold">{formatCurrency(selectedStock.gridSpacing)}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Holding</p>
                    <p className="text-sm font-bold">{selectedHolding?.quantity ?? 0} shares</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/5 p-4 mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Profit configuration</p>
                      <p className="mt-2 text-sm font-bold text-white">{selectedStock.gridLevels} ladder levels across {formatCurrency(selectedStock.gridUpper - selectedStock.gridLower)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Expected daily capture</p>
                      <p className="mt-2 text-xl font-mono font-bold text-yellow-300">{formatCurrency(selectedStock.estimatedDailyProfit, 0)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-zinc-400">
                    The bot distributes capital across buy and sell steps, recycles filled inventory through the band, and exits partial size each time price re-enters the upper ladder.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Strategy confidence</span>
                      <span className="text-sm font-bold text-yellow-300">{selectedStock.confidence.toFixed(0)}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-amber-200" style={{ width: `${selectedStock.confidence}%` }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Modeled monthly win rate</span>
                      <span className="text-sm font-bold text-white">{selectedStock.monthlyWinRate.toFixed(0)}%</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Liquidity</p>
                        <p className="mt-1 text-sm font-mono font-bold text-white">{selectedStock.liquidityScore.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Volatility</p>
                        <p className="mt-1 text-sm font-mono font-bold text-white">{selectedStock.volatilityScore.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Trend</p>
                        <p className="mt-1 text-sm font-mono font-bold text-white">{selectedStock.trendScore.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
                No stock is currently available for the selected filter set.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
