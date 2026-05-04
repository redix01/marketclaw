import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Bot, MousePointerClick, BarChart3, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ClosedTrade, ClosedTradesSummary } from '../types';

interface ClosedTradesProps {
  trades: ClosedTrade[];
  summary: ClosedTradesSummary | null;
}

function formatCurrency(value: number) {
  return `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSigned(value: number) {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function ClosedTrades({ trades, summary }: ClosedTradesProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'manual'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'pnl_percent'>('date');

  const filteredTrades = useMemo(() => {
    let result = [...trades];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (t) => t.symbol.toLowerCase().includes(query) || t.assetType.toLowerCase().includes(query)
      );
    }

    if (filterType === 'auto') {
      result = result.filter((t) => t.autoClosed);
    } else if (filterType === 'manual') {
      result = result.filter((t) => !t.autoClosed);
    }

    if (sortBy === 'pnl') {
      result.sort((a, b) => b.realizedPnl - a.realizedPnl);
    } else if (sortBy === 'pnl_percent') {
      result.sort((a, b) => b.pnlPercent - a.pnlPercent);
    } else {
      result.sort((a, b) => new Date(b.filledAt).getTime() - new Date(a.filledAt).getTime());
    }

    return result;
  }, [trades, search, filterType, sortBy]);

  const stats = summary ?? {
    totalTrades: 0,
    totalRealizedPnl: 0,
    avgPnlPercent: 0,
    autoClosedCount: 0,
    manualClosedCount: 0,
  };

  const statCards = [
    {
      label: 'Total Trades',
      value: stats.totalTrades.toString(),
      icon: BarChart3,
      color: 'text-white',
      bg: 'bg-zinc-800/50',
    },
    {
      label: 'Realized P&L',
      value: formatSigned(stats.totalRealizedPnl),
      icon: stats.totalRealizedPnl >= 0 ? TrendingUp : TrendingDown,
      color: stats.totalRealizedPnl >= 0 ? 'text-yellow-400' : 'text-rose-400',
      bg: stats.totalRealizedPnl >= 0 ? 'bg-yellow-500/10' : 'bg-rose-500/10',
    },
    {
      label: 'Avg Return',
      value: `${stats.avgPnlPercent >= 0 ? '+' : ''}${stats.avgPnlPercent.toFixed(2)}%`,
      icon: stats.avgPnlPercent >= 0 ? ArrowUpRight : ArrowDownRight,
      color: stats.avgPnlPercent >= 0 ? 'text-yellow-400' : 'text-rose-400',
      bg: stats.avgPnlPercent >= 0 ? 'bg-yellow-500/10' : 'bg-rose-500/10',
    },
    {
      label: 'Auto / Manual',
      value: `${stats.autoClosedCount} / ${stats.manualClosedCount}`,
      icon: Bot,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6 md:p-8 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.15),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.1),transparent_28%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
            Trade history
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Closed trades, realized gains.</h2>
          <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-2xl">
            Every closed position shows its realized profit or loss. Auto-closed trades hit the 2% take-profit target, while manual exits reflect your own timing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-800/70 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={14} className={card.color} />
                </div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">{card.label}</p>
              </div>
              <p className={`text-xl font-mono font-bold ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold">Trade log</h3>
            <p className="text-xs text-zinc-500">Filter, search, and sort through your closed positions.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search symbol or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-yellow-500/50 transition-all"
              />
            </div>

            <div className="flex gap-2">
              {(['all', 'auto', 'manual'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setFilterType(option)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                    filterType === option
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  {option === 'all' ? 'All' : option === 'auto' ? 'Auto' : 'Manual'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredTrades.map((trade) => (
            <div
              key={trade.id}
              className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 hover:bg-zinc-900/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      trade.realizedPnl >= 0 ? 'bg-yellow-500/10' : 'bg-rose-500/10'
                    }`}
                  >
                    {trade.realizedPnl >= 0 ? (
                      <ArrowUpRight size={18} className="text-yellow-400" />
                    ) : (
                      <ArrowDownRight size={18} className="text-rose-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{trade.symbol}</span>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                        {trade.assetType}
                      </span>
                      {trade.autoClosed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                          <Bot size={10} />
                          Auto-closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold">
                          <MousePointerClick size={10} />
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
                      <span>
                        Entry: <span className="text-zinc-300 font-mono">${trade.entryPrice.toFixed(2)}</span>
                      </span>
                      <span>
                        Exit: <span className="text-zinc-300 font-mono">${trade.exitPrice.toFixed(2)}</span>
                      </span>
                      <span>
                        Qty: <span className="text-zinc-300 font-mono">{trade.quantity}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-mono font-bold ${trade.realizedPnl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                    {formatSigned(trade.realizedPnl)}
                  </p>
                  <p className={`text-xs font-bold mt-1 ${trade.pnlPercent >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                    {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-2">
                    {formatDate(trade.filledAt)} at {formatTime(trade.filledAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {filteredTrades.length === 0 && (
            <div className="p-10 border border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500">
              {trades.length === 0
                ? 'No closed trades yet. Positions will appear here once they are sold or auto-closed at take profit.'
                : 'No trades match your current filters.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
