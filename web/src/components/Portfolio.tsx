import React from 'react';
import { Briefcase, TrendingUp, TrendingDown, PieChart, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Position, Account } from '../types';
import { MOCK_SYMBOLS } from '../constants';

interface PortfolioProps {
  account: Account | null;
  positions: Position[];
}

export default function Portfolio({ account, positions }: PortfolioProps) {
  const holdingsValue = positions.reduce((acc, pos) => {
    const symbolInfo = MOCK_SYMBOLS.find(s => s.symbol === pos.symbol);
    return acc + (pos.quantity * (symbolInfo?.price || pos.averageEntryPrice));
  }, 0);

  const totalEquity = (account?.cashBalance || 0) + holdingsValue;
  const dayPL = positions.reduce((acc, pos) => {
    const symbolInfo = MOCK_SYMBOLS.find(s => s.symbol === pos.symbol);
    if (!symbolInfo) return acc;
    const dayChange = symbolInfo.change * pos.quantity;
    return acc + dayChange;
  }, 0);

  const totalPL = positions.reduce((acc, pos) => {
    const symbolInfo = MOCK_SYMBOLS.find(s => s.symbol === pos.symbol);
    const currentVal = pos.quantity * (symbolInfo?.price || pos.averageEntryPrice);
    const costBasis = pos.quantity * pos.averageEntryPrice;
    return acc + (currentVal - costBasis);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Total Portfolio Value</p>
          <h3 className="text-3xl font-mono font-bold text-white">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-bold flex items-center gap-1 ${dayPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
          <h3 className={`text-3xl font-mono font-bold ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPL >= 0 ? '+' : ''}${totalPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-zinc-500 mt-2">Since account creation</p>
        </div>
      </div>

      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800/50 flex items-center gap-2">
          <Briefcase size={20} className="text-emerald-400" />
          <h3 className="text-lg font-bold">Your Holdings</h3>
        </div>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {positions.map((pos) => {
                const symbolInfo = MOCK_SYMBOLS.find(s => s.symbol === pos.symbol);
                const currentPrice = symbolInfo?.price || pos.averageEntryPrice;
                const marketVal = pos.quantity * currentPrice;
                const pl = (currentPrice - pos.averageEntryPrice) * pos.quantity;
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
                    <td className={`px-6 py-4 text-sm font-mono text-right ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                      <span className="block text-[10px] opacity-70">{plPercent.toFixed(2)}%</span>
                    </td>
                  </tr>
                );
              })}
              {positions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 italic">
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
