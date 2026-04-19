import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown, ExternalLink, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MOCK_SYMBOLS } from '../constants';
import { Position, SymbolInfo } from '../types';

interface AssetsProps {
  basePath: '/app' | '/demo';
  positions: Position[];
  symbols: SymbolInfo[];
}

function formatQuoteTime(quotedAt?: string) {
  if (!quotedAt) {
    return 'Live';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(quotedAt));
}

export default function Assets({ basePath, positions, symbols }: AssetsProps) {
  const [search, setSearch] = useState('');
  const [assetTab, setAssetTab] = useState<'all' | 'stock' | 'crypto'>('all');
  const liveSymbols = symbols.length > 0 ? symbols : MOCK_SYMBOLS;
  const filteredByType = assetTab === 'all' ? liveSymbols : liveSymbols.filter((symbol) => symbol.type === assetTab);
  const visibleSymbols = filteredByType.filter((symbol) =>
    symbol.symbol.toLowerCase().includes(search.toLowerCase()) ||
    symbol.name.toLowerCase().includes(search.toLowerCase())
  );
  const [selectedSymbolId, setSelectedSymbolId] = useState(visibleSymbols[0]?.symbol || liveSymbols[0]?.symbol || 'AAPL');

  const selectedSymbol = visibleSymbols.find((symbol) => symbol.symbol === selectedSymbolId) || visibleSymbols[0] || filteredByType[0] || liveSymbols[0];
  const selectedPrice = selectedSymbol?.price ?? 0;
  const selectedChange = selectedSymbol?.change ?? 0;
  const selectedChangePercent = selectedSymbol?.changePercent ?? 0;
  const selectedHolding = positions.find((position) => position.symbol === selectedSymbol?.symbol);

  useEffect(() => {
    if (!selectedSymbol || selectedSymbol.symbol === selectedSymbolId) {
      return;
    }

    setSelectedSymbolId(selectedSymbol.symbol);
  }, [selectedSymbol, selectedSymbolId]);

  useEffect(() => {
    if (visibleSymbols.length > 0 && !visibleSymbols.some((symbol) => symbol.symbol === selectedSymbolId)) {
      setSelectedSymbolId(visibleSymbols[0].symbol);
    }
  }, [visibleSymbols, selectedSymbolId]);

  const typeCounts = useMemo(() => ({
    all: liveSymbols.length,
    stock: liveSymbols.filter((symbol) => symbol.type === 'stock').length,
    crypto: liveSymbols.filter((symbol) => symbol.type === 'crypto').length,
  }), [liveSymbols]);

  const summaryCards = [
    { label: 'All Assets', value: typeCounts.all },
    { label: 'Stocks', value: typeCounts.stock },
    { label: 'Crypto', value: typeCounts.crypto },
    { label: 'Selected Holding', value: selectedHolding?.quantity ? selectedHolding.quantity.toString() : '0' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6 md:p-8 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_28%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live asset browser
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Stocks and crypto, updated from the server.</h2>
            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Search every tradable asset, filter by market, and inspect live price movement without leaving the app.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-zinc-800/70 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">{card.label}</p>
                <p className="mt-2 text-2xl font-mono font-bold text-white">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold">Asset list</h3>
                <p className="text-xs text-zinc-500">Search and switch between markets.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: `All (${typeCounts.all})` },
                  { key: 'stock', label: `Stocks (${typeCounts.stock})` },
                  { key: 'crypto', label: `Crypto (${typeCounts.crypto})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAssetTab(tab.key as 'all' | 'stock' | 'crypto')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                      assetTab === tab.key
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search stocks or crypto..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
              {visibleSymbols.map((symbol) => (
                <button
                  key={symbol.symbol}
                  onClick={() => setSelectedSymbolId(symbol.symbol)}
                  className={`text-left p-4 rounded-2xl border transition-all group ${
                    selectedSymbol?.symbol === symbol.symbol
                      ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/30'
                      : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-white">{symbol.symbol}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400 uppercase font-bold">
                          {symbol.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 max-w-[14rem] truncate">{symbol.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-white">${symbol.price.toLocaleString()}</p>
                      <div className={`mt-1 text-[10px] font-bold flex items-center justify-end gap-1 ${symbol.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {symbol.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {symbol.change >= 0 ? '+' : ''}{symbol.changePercent}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    <span>{formatQuoteTime(symbol.quotedAt)}</span>
                    <span className={symbol.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {symbol.change >= 0 ? '+' : ''}{symbol.change.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}

              {visibleSymbols.length === 0 && (
                <div className="md:col-span-2 p-10 border border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500">
                  No assets match "{search}".
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6 sticky top-24">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Selected asset</p>
                <h3 className="text-xl font-bold mt-1">{selectedSymbol?.symbol}</h3>
              </div>
              <Link
                to={`${basePath}/trade`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider"
              >
                Trade
                <ExternalLink size={14} />
              </Link>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">{selectedSymbol?.name}</p>
                  <p className="mt-2 text-3xl font-mono font-bold text-white">${selectedPrice.toLocaleString()}</p>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${selectedChange >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                  {selectedChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {selectedChange >= 0 ? '+' : ''}{selectedChange.toFixed(2)} ({selectedChangePercent.toFixed(2)}%)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Asset Type</p>
                <p className="text-sm font-bold uppercase">{selectedSymbol?.type}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Holding</p>
                <p className="text-sm font-bold">{selectedHolding?.quantity || 0}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Updated</p>
                <p className="text-sm font-bold">{formatQuoteTime(selectedSymbol?.quotedAt)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Movement</p>
                <p className={`text-sm font-bold ${selectedChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedChange >= 0 ? '+' : ''}{selectedChange.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-emerald-400" />
              <h3 className="text-lg font-bold">Live movement</h3>
            </div>
            <div className="space-y-3">
              {(visibleSymbols.slice(0, 5)).map((symbol) => (
                <div key={symbol.symbol} className="flex items-center justify-between rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold">{symbol.symbol}</p>
                    <p className="text-[10px] text-zinc-500">{symbol.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-white">${symbol.price.toLocaleString()}</p>
                    <p className={`text-[10px] font-bold ${symbol.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {symbol.change >= 0 ? '+' : ''}{symbol.changePercent}%
                    </p>
                  </div>
                </div>
              ))}
              {visibleSymbols.length === 0 && (
                <p className="text-sm text-zinc-500">No assets to display.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
