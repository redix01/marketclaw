import React, { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, TrendingDown, AlertCircle, ChevronDown, Activity, Wallet, BarChart3, ArrowRight, Zap, Target, Clock } from 'lucide-react';
import { MOCK_SYMBOLS } from '../constants';
import { tradingService } from '../services/tradingService';
import { Account, Position, SymbolInfo } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TradeProps {
  user: any;
  account: Account | null;
  positions: Position[];
  symbols: SymbolInfo[];
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatPrice(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function Trade({ user, account, positions, symbols }: TradeProps) {
  const [search, setSearch] = useState('');
  const [selectedSymbolId, setSelectedSymbolId] = useState(MOCK_SYMBOLS[0].symbol);
  const [assetTab, setAssetTab] = useState<'stock' | 'crypto'>('stock');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const liveSymbols = symbols.length > 0 ? symbols : MOCK_SYMBOLS;
  const filteredByType = useMemo(() => 
    liveSymbols.filter((symbol) => symbol.type === assetTab), [liveSymbols, assetTab]
  );
  const visibleSymbols = useMemo(() =>
    filteredByType.filter((symbol) =>
      symbol.symbol.toLowerCase().includes(search.toLowerCase()) ||
      symbol.name.toLowerCase().includes(search.toLowerCase())
    ), [filteredByType, search]
  );
  
  const selectedSymbol = visibleSymbols.find((symbol) => symbol.symbol === selectedSymbolId) 
    || visibleSymbols[0] || filteredByType[0] || liveSymbols[0];
    
  const selectedPrice = selectedSymbol?.price ?? 0;
  const selectedChange = selectedSymbol?.change ?? 0;
  const currentPosition = positions.find((position) => position.symbol === selectedSymbol?.symbol);
  const estimatedValue = quantity * selectedPrice;
  const canAfford = selectedSymbol
    ? side === 'buy'
      ? (account?.cashBalance || 0) >= estimatedValue
      : (currentPosition?.quantity || 0) >= quantity
    : false;

  useEffect(() => {
    if (filteredByType.length > 0 && !filteredByType.some((symbol) => symbol.symbol === selectedSymbolId)) {
      setSelectedSymbolId(filteredByType[0].symbol);
    }
  }, [assetTab, filteredByType, selectedSymbolId]);

  const typeCounts = useMemo(() => ({
    stock: liveSymbols.filter((symbol) => symbol.type === 'stock').length,
    crypto: liveSymbols.filter((symbol) => symbol.type === 'crypto').length,
  }), [liveSymbols]);

  const handleTrade = async () => {
    if (!user || !canAfford || quantity <= 0) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await tradingService.placeOrder(
        user.uid,
        selectedSymbol.symbol,
        side,
        quantity,
        selectedPrice,
        selectedSymbol.type
      );
      setSuccess(`Successfully ${side === 'buy' ? 'bought' : 'sold'} ${quantity} ${selectedSymbol.symbol}`);
      setQuantity(1);
    } catch (err: any) {
      setError(err.message || 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Trade</h2>
          <p className="text-zinc-400 text-sm mt-1">Execute paper trades at market price</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
            <Wallet size={16} className="text-yellow-400" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Available Cash</span>
              <span className="text-sm font-mono font-bold text-white">${formatPrice(account?.cashBalance ?? 0)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            <span className="text-xs font-medium text-zinc-400">Live Market Data</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Market Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Card */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/50 rounded-2xl p-6">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <span className="text-2xl font-bold text-yellow-400">{selectedSymbol?.symbol?.[0]}</span>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{selectedSymbol?.symbol}</p>
                  <p className="text-sm text-zinc-500">{selectedSymbol?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-mono font-bold text-white">${formatPrice(selectedPrice)}</p>
                <div className={cn(
                  "flex items-center justify-end gap-1 text-sm font-bold mt-1",
                  selectedChange >= 0 ? "text-yellow-400" : "text-rose-400"
                )}>
                  {selectedChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {formatChange(selectedChange)}
                </div>
              </div>
            </div>
          </div>

          {/* Asset Type Tabs & Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 shrink-0">
              <button
                onClick={() => setAssetTab('stock')}
                className={cn(
                  "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  assetTab === 'stock'
                    ? "bg-zinc-700 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Stocks
              </button>
              <button
                onClick={() => setAssetTab('crypto')}
                className={cn(
                  "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  assetTab === 'crypto'
                    ? "bg-zinc-700 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Crypto
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search assets..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-all"
              />
            </div>
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleSymbols.map((s) => (
              <button
                key={s.symbol}
                onClick={() => setSelectedSymbolId(s.symbol)}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all group",
                  selectedSymbol?.symbol === s.symbol 
                    ? "bg-zinc-800 border-yellow-500/50" 
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{s.symbol}</span>
                  <span className={cn(
                    "text-xs font-bold",
                    s.change >= 0 ? "text-yellow-400" : "text-rose-400"
                  )}>
                    {formatChange(s.change)}
                  </span>
                </div>
                <p className="text-lg font-mono text-zinc-300">${formatPrice(s.price)}</p>
                <p className="text-xs text-zinc-500 mt-1 truncate">{s.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Order Form */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-yellow-400" />
                Place Order
              </h3>
            </div>

            {/* Buy/Sell Toggle */}
            <div className="flex rounded-xl bg-zinc-950 p-1 mb-6">
              <button 
                onClick={() => setSide('buy')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                  side === 'buy' 
                    ? "bg-yellow-500 text-black" 
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Buy
              </button>
              <button 
                onClick={() => setSide('sell')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                  side === 'sell' 
                    ? "bg-rose-500 text-white" 
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Sell
              </button>
            </div>

            <div className="space-y-5">
              {/* Asset Display */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Asset</p>
                    <p className="text-lg font-bold text-white mt-1">{selectedSymbol?.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Price</p>
                    <p className="text-lg font-mono text-white mt-1">${formatPrice(selectedPrice)}</p>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Quantity</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0.0001"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-4 text-lg font-mono focus:outline-none focus:border-yellow-500/50 transition-all text-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                    {selectedSymbol?.type === 'crypto' ? 'COIN' : 'SHR'}
                  </span>
                </div>
              </div>

              {/* Quick amount chips */}
              {side === 'buy' && (account?.cashBalance ?? 0) > 0 && selectedPrice > 0 && (
                <div className="flex items-center gap-2">
                  {[0.1, 0.25, 0.5, 1].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const cash = account?.cashBalance ?? 0;
                        const qty = (cash * pct) / selectedPrice;
                        const stepped = selectedSymbol?.type === 'crypto'
                          ? Number(qty.toFixed(6))
                          : Math.max(1, Math.floor(qty));
                        setQuantity(stepped);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-yellow-500/40 text-xs font-bold text-zinc-300 transition-colors"
                    >
                      {pct === 1 ? 'MAX' : `${pct * 100}%`}
                    </button>
                  ))}
                </div>
              )}

              {/* Holdings, Value, Wallet, After-trade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500">Holding</p>
                  <p className="text-lg font-mono text-white mt-1">
                    {(currentPosition?.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </p>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500">{side === 'buy' ? 'Estimated Cost' : 'Estimated Proceeds'}</p>
                  <p className="text-lg font-mono text-white mt-1">${formatPrice(estimatedValue)}</p>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500">Wallet</p>
                  <p className="text-lg font-mono text-white mt-1">${formatPrice(account?.cashBalance ?? 0)}</p>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500">After Trade</p>
                  <p className="text-lg font-mono text-white mt-1">
                    ${formatPrice(
                      Math.max(
                        0,
                        (account?.cashBalance ?? 0) + (side === 'buy' ? -estimatedValue : estimatedValue)
                      )
                    )}
                  </p>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
                  {success}
                </div>
              )}
              {!canAfford && quantity > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-sm">
                  <AlertCircle size={16} />
                  Insufficient {side === 'buy' ? 'funds' : 'holdings'}
                </div>
              )}

              {/* Submit Button */}
              <button 
                disabled={!canAfford || quantity <= 0 || loading}
                onClick={handleTrade}
                className={cn(
                  "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                  side === 'buy' 
                    ? "bg-yellow-500 text-black hover:bg-yellow-400 disabled:bg-zinc-700 disabled:text-zinc-500" 
                    : "bg-rose-500 text-white hover:bg-rose-400 disabled:bg-zinc-700 disabled:text-zinc-500",
                  "disabled:cursor-not-allowed"
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {side === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol?.symbol}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Info Note */}
              <div className="flex items-start gap-2 text-xs text-zinc-500 pt-4 border-t border-zinc-800">
                <Zap size={14} className="shrink-0 mt-0.5" />
                <p>Paper trading simulation. Orders execute instantly at displayed market price.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
