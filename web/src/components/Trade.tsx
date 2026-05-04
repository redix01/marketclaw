import React, { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, TrendingDown, Info, AlertCircle, ChevronDown, Activity, Wallet } from 'lucide-react';
import { MOCK_SYMBOLS } from '../constants';
import { tradingService } from '../services/tradingService';
import { Account, Position, SymbolInfo } from '../types';

interface TradeProps {
  user: any;
  account: Account | null;
  positions: Position[];
  symbols: SymbolInfo[];
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
  const filteredByType = liveSymbols.filter((symbol) => symbol.type === assetTab);
  const visibleSymbols = filteredByType.filter((symbol) =>
    symbol.symbol.toLowerCase().includes(search.toLowerCase()) ||
    symbol.name.toLowerCase().includes(search.toLowerCase())
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
    if (!selectedSymbol || selectedSymbol.symbol === selectedSymbolId) {
      return;
    }
    setSelectedSymbolId(selectedSymbol.symbol);
  }, [selectedSymbol, selectedSymbolId]);

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
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left Area: Markets & Charts */}
      <div className="flex-1 space-y-6 min-w-0">
        
        {/* Market Data Panel */}
        <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-xl rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-yellow-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Market Overview</h3>
              <p className="text-sm text-zinc-400 mt-1">Explore and analyze live assets.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs font-bold uppercase tracking-wider text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-[pulse_2s_ease-in-out_infinite]"></span>
              Live Market Feed
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Asset Type Tabs */}
            <div className="flex p-1 bg-zinc-950/50 rounded-xl border border-white/5 shrink-0">
              <button
                onClick={() => setAssetTab('stock')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  assetTab === 'stock'
                    ? 'bg-zinc-800/80 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                }`}
              >
                Stocks ({typeCounts.stock})
              </button>
              <button
                onClick={() => setAssetTab('crypto')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  assetTab === 'crypto'
                    ? 'bg-zinc-800/80 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                }`}
              >
                Crypto ({typeCounts.crypto})
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder={`Search ${assetTab} assets...`} 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-full bg-zinc-950/50 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/30 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Abstract Chart Indicator based on selection */}
          <div className="mb-6 h-[180px] w-full rounded-2xl bg-gradient-to-b from-zinc-800/20 to-transparent border border-white/5 flex flex-col justify-end p-6 relative overflow-hidden group">
             {/* Chart Line */}
             <svg className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out opacity-60 ${selectedChange >= 0 ? 'text-yellow-500' : 'text-rose-500'}`} preserveAspectRatio="none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
                {selectedChange >= 0 
                  ? <path d="M0,90 Q10,80 20,85 T40,60 T60,50 T80,30 T100,10" strokeLinejoin="round" strokeLinecap="round" />
                  : <path d="M0,10 Q20,30 30,20 T50,50 T70,40 T90,80 T100,90" strokeLinejoin="round" strokeLinecap="round" />
                }
             </svg>
             {/* Chart Fill Array */}
             <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/80 pointer-events-none`}/>
             
             <div className="relative z-10">
                <p className="text-zinc-400 text-sm font-medium mb-1">Live Price: {selectedSymbol?.symbol}</p>
                <div className="flex items-baseline gap-3">
                  <h4 className="text-3xl font-mono font-bold text-white tracking-tight">${selectedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                  <span className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg ${selectedChange >= 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {selectedChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {selectedChange >= 0 ? '+' : ''}{selectedChange.toFixed(2)} ({selectedSymbol?.changePercent}%)
                  </span>
                </div>
             </div>
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {visibleSymbols.map((s) => (
              <button
                key={s.symbol}
                onClick={() => setSelectedSymbolId(s.symbol)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                  selectedSymbol?.symbol === s.symbol 
                    ? 'bg-zinc-800/80 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' 
                    : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-800/40 hover:border-white/10'
                }`}
              >
                {selectedSymbol?.symbol === s.symbol && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
                )}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
                      selectedSymbol?.symbol === s.symbol 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-zinc-800 text-zinc-300 group-hover:bg-zinc-700'
                    }`}>
                      {s.symbol[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white text-base leading-none mb-1">{s.symbol}</p>
                      <p className="text-xs text-zinc-500 truncate max-w-[100px]">{s.name}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end justify-between mt-4">
                  <p className="text-lg font-mono font-bold text-white tracking-tight">${s.price.toLocaleString()}</p>
                  <p className={`text-xs font-bold flex items-center gap-1 ${s.change >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                    {s.change >= 0 ? '+' : ''}{s.changePercent}%
                  </p>
                </div>
              </button>
            ))}
            {visibleSymbols.length === 0 && (
              <div className="col-span-full py-12 border border-dashed border-zinc-800 rounded-3xl text-center flex flex-col items-center justify-center">
                <Search size={32} className="text-zinc-600 mb-3" />
                <p className="text-zinc-400 font-medium">No {assetTab} assets match "{search}"</p>
                <button 
                  onClick={() => setSearch('')}
                  className="mt-4 text-yellow-500 text-sm hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Area: Order Ticket */}
      <div className="w-full xl:w-[420px] shrink-0">
        <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-3xl p-6 md:p-8 xl:sticky xl:top-24 shadow-2xl backdrop-blur-xl">
          
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-yellow-500" size={20} />
              New Order
            </h3>
            <span className="text-xs font-medium text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              {side === 'buy' ? 'Buying Power: ' : 'Available: '}
              <span className="text-zinc-300 ml-1">
                {side === 'buy' ? `$${account?.cashBalance.toLocaleString() || '0'}` : currentPosition?.quantity || '0'}
              </span>
            </span>
          </div>
          
          {/* Buy / Sell Tabs */}
          <div className="flex p-1.5 bg-zinc-900 rounded-2xl mb-8 border border-white/5">
            <button 
              onClick={() => setSide('buy')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                side === 'buy' 
                  ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              Buy
            </button>
            <button 
              onClick={() => setSide('sell')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                side === 'sell' 
                  ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              Sell
            </button>
          </div>

          <div className="space-y-5">
            {/* Asset Selection */}
            <div>
              <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block ml-1">Asset</label>
              <div className="relative group">
                <select 
                  value={selectedSymbol?.symbol || ''}
                  onChange={(e) => setSelectedSymbolId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl py-4 px-5 text-base font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent transition-all text-white cursor-pointer"
                >
                  {filteredByType.map(s => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} - {s.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-white transition-colors">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold mb-2 flex justify-between ml-1 block">
                <span>Quantity</span>
              </label>
               <div className="relative">
                 <input 
                   type="number" 
                   min="0.0001"
                   step="any"
                   value={quantity}
                   onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                   className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl py-4 px-5 pr-16 text-lg font-mono font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent transition-all text-white"
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm select-none">
                    {selectedSymbol?.type === 'crypto' ? 'COIN' : 'SHRS'}
                 </div>
               </div>
            </div>
            
            {/* Current Position Display */}
            <div className="flex items-center justify-between py-3 px-4 bg-zinc-900/50 rounded-xl border border-white/5">
               <div className="flex items-center gap-2 text-zinc-400">
                 <Wallet size={16} />
                 <span className="text-xs font-semibold">Your Holding</span>
               </div>
               <span className="text-sm font-mono font-bold text-white">{currentPosition?.quantity || 0} {selectedSymbol?.symbol}</span>
            </div>

            {/* Order Summary */}
            <div className="pt-6 border-t border-zinc-800 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-medium">Market Price</span>
                <span className="font-mono text-zinc-300">${selectedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-base pt-2">
                <span className="text-zinc-400 font-medium">Total Value</span>
                <span className="font-mono text-2xl font-bold text-white">${estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {!canAfford && quantity > 0 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-rose-400 animate-in fade-in slide-in-from-bottom-2">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-tight">
                  {side === 'buy' 
                    ? `Insufficient cash. You need $${(estimatedValue - (account?.cashBalance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })} more.` 
                    : `Insufficient holdings. You only have ${currentPosition?.quantity || 0} available.`}
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm font-medium animate-in fade-in">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 text-sm font-medium animate-in fade-in">
                {success}
              </div>
            )}

            <button 
              disabled={!canAfford || quantity <= 0 || loading}
              onClick={handleTrade}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 ${
                side === 'buy' 
                  ? 'bg-yellow-500 text-black hover:bg-yellow-400 hover:shadow-[0_0_25px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:hover:bg-yellow-500 disabled:hover:shadow-none' 
                  : 'bg-rose-500 text-white hover:bg-rose-400 hover:shadow-[0_0_25px_rgba(244,63,94,0.4)] disabled:opacity-50 disabled:hover:bg-rose-500 disabled:hover:shadow-none'
              }`}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {side === 'buy' ? 'Confirm Buy' : 'Confirm Sell'}
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800 border-dashed">
            <div className="flex gap-3 text-zinc-500">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed font-medium">
                Simulation mode active. Orders execute instantly at mock market prices using virtual funds.
              </p>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  );
}
