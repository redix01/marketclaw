import React, { useState } from 'react';
import { Briefcase, ArrowUpRight, ArrowDownRight, X, Loader2 } from 'lucide-react';
import { Position, Account } from '../types';
import { SymbolInfo } from '../types';
import { tradingService } from '../services/tradingService';

interface PortfolioProps {
  user: any;
  account: Account | null;
  positions: Position[];
  symbols: SymbolInfo[];
}

export default function Portfolio({ user, account, positions, symbols }: PortfolioProps) {
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const liveSymbols = symbols.length > 0 ? symbols : [];

  const holdingsValue = positions.reduce((acc, pos) => {
    const symbolInfo = liveSymbols.find(s => s.symbol === pos.symbol);
    const currentPrice = pos.currentPrice ?? symbolInfo?.price ?? pos.averageEntryPrice;
    return acc + (pos.quantity * currentPrice);
  }, 0);

  const totalEquity = (account?.cashBalance || 0) + holdingsValue;
  const dayPL = positions.reduce((acc, pos) => {
    const symbolInfo = liveSymbols.find(s => s.symbol === pos.symbol);
    const dayChange = (symbolInfo?.change ?? 0) * pos.quantity;
    return acc + dayChange;
  }, 0);

  const handleClose = async (pos: Position) => {
    if (!user?.uid) return;
    setCloseError(null);
    setClosingId(pos.id);
    try {
      const symbolInfo = liveSymbols.find((s) => s.symbol === pos.symbol);
      const exitPrice = pos.currentPrice ?? symbolInfo?.price ?? pos.averageEntryPrice;
      await tradingService.placeOrder(user.uid, pos.symbol, 'sell', pos.quantity, exitPrice, pos.assetType);
      setConfirmCloseId(null);
    } catch (err: any) {
      setCloseError(err?.message || 'Failed to close position.');
    } finally {
      setClosingId(null);
    }
  };

  const totalPL = positions.reduce((acc, pos) => {
    const symbolInfo = liveSymbols.find(s => s.symbol === pos.symbol);
    const currentPrice = pos.currentPrice ?? symbolInfo?.price ?? pos.averageEntryPrice;
    const currentVal = pos.quantity * currentPrice;
    const costBasis = pos.quantity * pos.averageEntryPrice;
    return acc + (pos.unrealizedPL ?? (currentVal - costBasis));
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Total Portfolio Value</p>
          <h3 className="text-3xl font-mono font-bold text-white">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-bold flex items-center gap-1 ${dayPL >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
              {dayPL >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              ${Math.abs(dayPL).toLocaleString(undefined, { minimumFractionDigits: 2 })} Today
            </span>
          </div>
        </div>
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Holdings Value</p>
          <h3 className="text-3xl font-mono font-bold text-white">${holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-zinc-500 mt-2">{((holdingsValue / totalEquity) * 100).toFixed(1)}% Exposure</p>
        </div>
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Total P/L</p>
          <h3 className={`text-3xl font-mono font-bold ${totalPL >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
            {totalPL >= 0 ? '+' : ''}${totalPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-zinc-500 mt-2">Since account creation</p>
        </div>
      </div>

      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800/50 flex items-center gap-2">
          <Briefcase size={20} className="text-yellow-400" />
          <h3 className="text-lg font-bold">Your Holdings</h3>
        </div>
        {closeError && (
          <div className="px-6 py-3 border-b border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs">
            {closeError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800/50">
                <th className="px-6 py-4">Symbol</th>
                <th className="px-6 py-4">Asset Type</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Avg Cost</th>
                <th className="px-6 py-4">Market Price</th>
                <th className="px-6 py-4">Market Value</th>
                <th className="px-6 py-4 text-right">Unrealized P/L</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {positions.map((pos) => {
                const symbolInfo = liveSymbols.find(s => s.symbol === pos.symbol);
                const currentPrice = pos.currentPrice ?? symbolInfo?.price ?? pos.averageEntryPrice;
                const marketVal = pos.quantity * currentPrice;
                const pl = pos.unrealizedPL ?? ((currentPrice - pos.averageEntryPrice) * pos.quantity);
                const plPercent = ((currentPrice / pos.averageEntryPrice) - 1) * 100;

                return (
                  <tr key={pos.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-xs">
                          {pos.symbol[0]}
                        </div>
                        <span className="text-sm font-bold">{pos.symbol}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700 font-bold uppercase">
                        {pos.assetType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{pos.quantity}</td>
                    <td className="px-6 py-4 text-sm font-mono">${pos.averageEntryPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-mono">${currentPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold">${marketVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={`px-6 py-4 text-sm font-mono text-right ${pl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                      {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                      <span className="block text-[10px] opacity-70">{plPercent.toFixed(2)}%</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {confirmCloseId === pos.id ? (
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleClose(pos)}
                            disabled={closingId === pos.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
                            title="Confirm close at current market price"
                          >
                            {closingId === pos.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <X size={14} />
                            )}
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmCloseId(null)}
                            disabled={closingId === pos.id}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setCloseError(null);
                            setConfirmCloseId(pos.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 border border-zinc-700 hover:border-rose-500/40 text-zinc-300 text-xs font-bold transition-colors"
                          title="Close this position at market price"
                        >
                          <X size={14} />
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {positions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500 italic">
                    You don't have any open positions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
