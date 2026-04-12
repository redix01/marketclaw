import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Info, AlertCircle } from 'lucide-react';
import { MOCK_SYMBOLS } from '../constants';
import { tradingService } from '../services/tradingService';
import { Account, Position } from '../types';

interface TradeProps {
  user: any;
  account: Account | null;
  positions: Position[];
}

export default function Trade({ user, account, positions }: TradeProps) {
  const [search, setSearch] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(MOCK_SYMBOLS[0]);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredSymbols = MOCK_SYMBOLS.filter(s => 
    s.symbol.toLowerCase().includes(search.toLowerCase()) || 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentPosition = positions.find(p => p.symbol === selectedSymbol.symbol);
  const estimatedValue = quantity * selectedSymbol.price;
  const canAfford = side === 'buy' ? (account?.cashBalance || 0) >= estimatedValue : (currentPosition?.quantity || 0) >= quantity;

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
        selectedSymbol.price,
        selectedSymbol.type,
        'manual'
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Symbol Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search symbols..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredSymbols.map((s) => (
              <button
                key={s.symbol}
                onClick={() => setSelectedSymbol(s)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${
                  selectedSymbol.symbol === s.symbol 
                    ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/30' 
                    : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                    selectedSymbol.symbol === s.symbol ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'
                  }`}>
                    {s.symbol[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm leading-none mb-1">{s.symbol}</p>
                    <p className="text-[10px] text-zinc-500 truncate max-w-[120px]">{s.name}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-white">${s.price.toLocaleString()}</p>
                  <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${s.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {s.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {s.change >= 0 ? '+' : ''}{s.changePercent}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Market Info */}
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">Market Information: {selectedSymbol.symbol}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Price</p>
              <p className="text-lg font-mono font-bold">${selectedSymbol.price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Day Change</p>
              <p className={`text-lg font-mono font-bold ${selectedSymbol.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedSymbol.change >= 0 ? '+' : ''}{selectedSymbol.change.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Asset Type</p>
              <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700 font-bold uppercase">
                {selectedSymbol.type}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Your Holding</p>
              <p className="text-lg font-mono font-bold">{currentPosition?.quantity || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Ticket */}
      <div className="space-y-6">
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6 lg:sticky lg:top-24">
          <h3 className="text-lg font-bold mb-6">Order Ticket</h3>
          
          <div className="flex p-1 bg-zinc-900 rounded-xl mb-6">
            <button 
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${side === 'buy' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              BUY
            </button>
            <button 
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${side === 'sell' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              SELL
            </button>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Symbol</label>
              <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-bold flex justify-between">
                <span>{selectedSymbol.symbol}</span>
                <span className="text-zinc-500">{selectedSymbol.name}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Quantity</label>
              <input 
                type="number" 
                min="0.0001"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="pt-4 border-t border-zinc-800/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Estimated Price</span>
                <span className="font-mono">${selectedSymbol.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-zinc-500">Total Value</span>
                <span className="font-mono text-white">${estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {!canAfford && quantity > 0 && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-rose-400">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-xs font-medium">
                {side === 'buy' ? 'Insufficient cash balance for this trade.' : 'Insufficient holdings to sell this amount.'}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
              {success}
            </div>
          )}

          <button 
            disabled={!canAfford || quantity <= 0 || loading}
            onClick={handleTrade}
            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              side === 'buy' 
                ? 'bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500' 
                : 'bg-rose-500 text-white hover:bg-rose-400 disabled:opacity-50 disabled:hover:bg-rose-500'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {side === 'buy' ? 'Submit Buy Order' : 'Submit Sell Order'}
              </>
            )}
          </button>

          <div className="mt-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Info size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Simulation Note</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              This is a paper trading simulation. No real funds are used. Orders are filled instantly at the current mock market price.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
