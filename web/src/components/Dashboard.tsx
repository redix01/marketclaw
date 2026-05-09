import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Bot,
  Wallet,
  Repeat
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import { Account, Position, Order, LedgerEvent, Agent, DashboardSnapshot, ClosedTradesSummary } from '../types';

interface DashboardProps {
  account: Account | null;
  positions: Position[];
  orders: Order[];
  ledger: LedgerEvent[];
  agents: Agent[];
  dashboard: DashboardSnapshot | null;
  closedTradesSummary: ClosedTradesSummary | null;
}

const StatCard = ({ title, value, subValue, icon: Icon, trend }: any) => (
  <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-5 hover:border-zinc-700/50 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 bg-zinc-900 rounded-xl group-hover:bg-yellow-500/10 group-hover:text-yellow-400 transition-colors">
        <Icon size={20} />
      </div>
      {typeof trend === 'number' && Number.isFinite(trend) && (
        <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend).toFixed(2)}%
        </div>
      )}
    </div>
    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{title}</p>
    <h3 className="text-2xl font-mono font-bold text-white">{value}</h3>
    {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
  </div>
);

export default function Dashboard({ account, positions, orders, ledger, agents, dashboard, closedTradesSummary }: DashboardProps) {
  const [range, setRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');

  const holdingsValue = dashboard?.summary.holdingsValue
    ?? positions.reduce((acc, pos) => acc + (pos.marketValue ?? pos.quantity * (pos.currentPrice ?? pos.averageEntryPrice)), 0);
  const totalEquity = dashboard?.summary.totalEquity ?? ((account?.cashBalance || 0) + holdingsValue);
  const unrealizedPL = dashboard?.summary.unrealizedPL
    ?? positions.reduce((acc, pos) => acc + (pos.unrealizedPL ?? ((pos.currentPrice ?? pos.averageEntryPrice) - pos.averageEntryPrice) * pos.quantity), 0);

  // Real trends derived from backend data — no more hardcoded 2.4 / 5.2.
  // Total-equity trend compares the latest equity_curve point against the
  // earliest one in view; if there's only one data point we omit the trend
  // chip entirely instead of inventing one.
  const equityTrend = useMemo(() => {
    const points = dashboard?.equityCurve ?? [];
    if (points.length < 2) return null;
    const first = points[0]?.value ?? 0;
    const last = points[points.length - 1]?.value ?? 0;
    if (first <= 0) return null;
    return Number((((last - first) / first) * 100).toFixed(2));
  }, [dashboard?.equityCurve]);

  // Unrealized P&L trend = unrealized P&L expressed as % of total cost basis.
  // Same number every other holdings table shows in row form.
  const unrealizedTrend = useMemo(() => {
    const costBasis = positions.reduce(
      (acc, pos) => acc + pos.quantity * pos.averageEntryPrice,
      0,
    );
    if (costBasis <= 0) return null;
    return Number(((unrealizedPL / costBasis) * 100).toFixed(2));
  }, [positions, unrealizedPL]);

  const realizedPnl = closedTradesSummary?.totalRealizedPnl ?? 0;
  const closedTradesCount = closedTradesSummary?.totalTrades ?? 0;

  const chartData = useMemo(() => {
    const points = dashboard?.equityCurve ?? [];

    if (points.length === 0) {
      return [{ name: 'Now', value: totalEquity }];
    }

    const sliceSize = range === '1D' ? 2 : range === '1W' ? 7 : range === '1M' ? 30 : points.length;

    return points.slice(-sliceSize).map((point) => ({
      name: point.label,
      value: point.value,
    }));
  }, [dashboard?.equityCurve, range, totalEquity]);

  const allocationData = useMemo(() => {
    if (dashboard?.assetAllocation?.length) {
      return dashboard.assetAllocation;
    }

    const stockValue = positions
      .filter((pos) => pos.assetType === 'stock')
      .reduce((acc, pos) => acc + (pos.marketValue ?? pos.quantity * (pos.currentPrice ?? pos.averageEntryPrice)), 0);
    const cryptoValue = positions
      .filter((pos) => pos.assetType === 'crypto')
      .reduce((acc, pos) => acc + (pos.marketValue ?? pos.quantity * (pos.currentPrice ?? pos.averageEntryPrice)), 0);

    return [
      { name: 'Cash', value: account?.cashBalance || 0, color: '#eab308' },
      { name: 'Stock', value: stockValue, color: '#3b82f6' },
      { name: 'Crypto', value: cryptoValue, color: '#f59e0b' },
    ].filter((item) => item.value > 0);
  }, [account?.cashBalance, dashboard?.assetAllocation, positions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Equity"
          value={`$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subValue="Combined cash & holdings"
          icon={DollarSign}
          trend={equityTrend}
        />
        <StatCard
          title="Cash Balance"
          value={`$${(account?.cashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subValue="Available buying power"
          icon={Wallet}
        />
        <StatCard
          title="Unrealized P/L"
          value={`${unrealizedPL >= 0 ? '+' : '-'}$${Math.abs(unrealizedPL).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subValue="Current open profit/loss"
          icon={Activity}
          trend={unrealizedTrend}
        />
        <StatCard
          title="Realized P/L"
          value={`${realizedPnl >= 0 ? '+' : '-'}$${Math.abs(realizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subValue={`${closedTradesCount} closed ${closedTradesCount === 1 ? 'trade' : 'trades'}`}
          icon={Repeat}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Equity Curve</h3>
            <div className="flex gap-2">
              {(['1D', '1W', '1M', 'ALL'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setRange(t)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${t === range ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F0F11', border: '1px solid #374151', borderRadius: '12px' }}
                  itemStyle={{ color: '#eab308' }}
                />
                <Area type="monotone" dataKey="value" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-6">Asset Allocation</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F0F11', border: '1px solid #374151', borderRadius: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {allocationData.map((item) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-zinc-400">{item.name}</span>
                </div>
                <span className="text-sm font-mono font-bold">${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
            <h3 className="text-lg font-bold">Open Positions</h3>
            <button className="text-xs font-bold text-yellow-400 hover:text-yellow-300">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800/50">
                  <th className="px-6 py-4">Symbol</th>
                  <th className="px-6 py-4">Qty</th>
                  <th className="px-6 py-4">Avg Cost</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4 text-right">P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {positions.slice(0, 5).map((pos) => {
                  const currentPrice = pos.currentPrice || pos.averageEntryPrice;
                  const pl = pos.unrealizedPL ?? ((currentPrice - pos.averageEntryPrice) * pos.quantity);
                  const plPercent = ((currentPrice / pos.averageEntryPrice) - 1) * 100;

                  return (
                    <tr key={pos.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-xs">
                            {pos.symbol[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{pos.symbol}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">{pos.assetType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono">{pos.quantity}</td>
                      <td className="px-6 py-4 text-sm font-mono">${pos.averageEntryPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm font-mono">${currentPrice.toFixed(2)}</td>
                      <td className={`px-6 py-4 text-sm font-mono text-right ${pl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                        {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                        <span className="block text-[10px] opacity-70">{plPercent.toFixed(2)}%</span>
                      </td>
                    </tr>
                  );
                })}
                {positions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">
                      No open positions. Start trading to see holdings.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <button className="text-xs font-bold text-yellow-400 hover:text-yellow-300">View History</button>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {ledger.slice(0, 6).map((event) => (
              <div key={event.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    event.type === 'deposit' ? 'bg-yellow-500/10 text-yellow-400' :
                    event.type === 'withdrawal' ? 'bg-rose-500/10 text-rose-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {event.type === 'deposit' ? <ArrowUpRight size={18} /> : 
                     event.type === 'withdrawal' ? <ArrowDownRight size={18} /> : 
                     <Activity size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{event.description}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <p className={`text-sm font-mono font-bold ${event.amount >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                  {event.amount >= 0 ? '+' : ''}{event.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
            {ledger.length === 0 && (
              <div className="px-6 py-12 text-center text-zinc-500 italic">
                No recent activity.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
