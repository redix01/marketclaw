import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Minus } from 'lucide-react';
import { MOCK_SYMBOLS } from '../constants';
import { Account, Position, SymbolInfo } from '../types';

interface AssetsProps {
  basePath: '/app' | '/demo';
  positions: Position[];
  symbols: SymbolInfo[];
  account: Account | null;
}

interface GridConfig {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  basePrice: number;
  baseChangePercent: number;
  leverage: number;
  margin: number;
  exposurePercent: number;
  rangePercent: number;
  totalLevels: number;
  filledLevels: number;
  realizedPnL: number;
  unrealizedPnL: number;
  openedAt: number;
  closeThreshold: number;
  stopThreshold: number;
  active: boolean;
}

interface ClosedTrade {
  id: string;
  symbol: string;
  pnl: number;
  outcome: 'win' | 'loss';
  closedAt: number;
}

interface GridTick {
  price: number;
  changePercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  filledLevels: number;
}

function symbolSeed(symbol: string) {
  return symbol.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatPrice(value: number) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  if (value >= 10) return value.toFixed(4);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function formatMoney(value: number, digits = 2) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatSignedMoney(value: number, digits = 4) {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatDuration(totalMinutes: number) {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

let gridIdCounter = 0;
function nextGridId(symbol: string) {
  gridIdCounter += 1;
  return `${symbol}-${gridIdCounter}`;
}

function buildGrid(symbol: SymbolInfo, index: number, openedAt: number): GridConfig {
  const seed = symbolSeed(symbol.symbol) + Math.floor(Math.random() * 97);
  const totalLevels = clamp(10 + ((seed + index) % 18), 10, 28);
  const filledLevels = (seed + index * 3) % (totalLevels + 1);
  const margin = clamp(8 + (seed % 11) + index * 0.4, 8, 50);
  const rangePercent = clamp(2 + ((seed % 13) * 0.6), 1.8, 9.5);
  const baseUnrealized = ((seed % 7) - 3) * 0.012;
  const closeThreshold = 0.02 + ((seed % 11) / 1000);
  const stopThreshold = -(0.02 + ((seed % 9) / 1000));

  return {
    id: nextGridId(symbol.symbol),
    symbol: symbol.symbol,
    name: symbol.name,
    type: symbol.type,
    basePrice: symbol.price,
    baseChangePercent: symbol.changePercent,
    leverage: 10,
    margin,
    exposurePercent: clamp((margin / 192) * 100, 0.6, 28),
    rangePercent,
    totalLevels,
    filledLevels,
    realizedPnL: 0,
    unrealizedPnL: baseUnrealized,
    openedAt,
    closeThreshold,
    stopThreshold,
    active: true,
  };
}

function tickGrid(config: GridConfig, prevTick: GridTick | undefined, nowMs: number): GridTick {
  const seed = symbolSeed(config.symbol);
  const slow = Math.sin(nowMs / 7300 + seed) * 0.0008;
  const fast = Math.sin(nowMs / 1100 + seed * 1.7) * 0.0011;
  const drift = slow + fast;

  const prevPrice = prevTick?.price ?? config.basePrice;
  const targetPrice = config.basePrice * (1 + drift);
  const price = prevPrice + (targetPrice - prevPrice) * 0.18;

  const changePercent = ((price - config.basePrice) / config.basePrice) * 100 + config.baseChangePercent;
  const unrealizedPnL = config.active
    ? config.margin * (config.unrealizedPnL + Math.sin(nowMs / 4200 + seed) * 0.01)
    : 0;
  const realizedPnL = config.margin * config.realizedPnL + Math.sin(nowMs / 9100 + seed * 0.6) * 0.05;

  const fillJitter = Math.floor((Math.sin(nowMs / 6500 + seed) + 1) * 1.5);
  const filledLevels = clamp(config.filledLevels + fillJitter, 0, config.totalLevels);

  return { price, changePercent, unrealizedPnL, realizedPnL, filledLevels };
}

export default function Assets({ positions, symbols, account }: AssetsProps) {
  const [tab, setTab] = useState<'detail' | 'history'>('detail');
  const liveSymbols = symbols.length > 0 ? symbols : MOCK_SYMBOLS;

  const liveSymbolsRef = useRef(liveSymbols);
  liveSymbolsRef.current = liveSymbols;

  const sessionStartRef = useRef<number>(Date.now());
  const [grids, setGrids] = useState<GridConfig[]>(() =>
    liveSymbols.map((symbol, index) => buildGrid(symbol, index, Date.now()))
  );
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [sessionRealized, setSessionRealized] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(grids[0]?.symbol ?? '');
  const [ticks, setTicks] = useState<Record<string, GridTick>>({});
  const ticksRef = useRef<Record<string, GridTick>>({});
  ticksRef.current = ticks;
  const gridsRef = useRef(grids);
  gridsRef.current = grids;

  useEffect(() => {
    if (!grids.some((grid) => grid.symbol === selectedSymbol)) {
      setSelectedSymbol(grids[0]?.symbol ?? '');
    }
  }, [grids, selectedSymbol]);

  useEffect(() => {
    let frame: number;
    let last = 0;

    const loop = (nowMs: number) => {
      if (nowMs - last >= 750) {
        last = nowMs;
        const currentGrids = gridsRef.current;
        const nextTicks: Record<string, GridTick> = {};
        const closedThisRound: ClosedTrade[] = [];
        let realizedDelta = 0;

        const replacements: { index: number; grid: GridConfig }[] = [];

        for (let i = 0; i < currentGrids.length; i += 1) {
          const grid = currentGrids[i];
          const tick = tickGrid(grid, ticksRef.current[grid.id], nowMs);
          const pnlPct = grid.margin > 0 ? tick.unrealizedPnL / grid.margin : 0;

          const ageMs = Date.now() - grid.openedAt;
          const eligible = ageMs > 4000;

          if (eligible && (pnlPct >= grid.closeThreshold || pnlPct <= grid.stopThreshold)) {
            const outcome: 'win' | 'loss' = pnlPct >= 0 ? 'win' : 'loss';
            closedThisRound.push({
              id: grid.id,
              symbol: grid.symbol,
              pnl: tick.unrealizedPnL,
              outcome,
              closedAt: Date.now(),
            });
            realizedDelta += tick.unrealizedPnL;

            const pool = liveSymbolsRef.current;
            const activeSymbols = new Set(currentGrids.map((g, idx) => (idx === i ? null : g.symbol)).filter(Boolean) as string[]);
            const candidates = pool.filter((entry) => !activeSymbols.has(entry.symbol));
            const fresh = (candidates.length > 0 ? candidates : pool)[Math.floor(Math.random() * (candidates.length || pool.length))];
            const newGrid = buildGrid(fresh, i, Date.now());
            replacements.push({ index: i, grid: newGrid });
            nextTicks[newGrid.id] = {
              price: newGrid.basePrice,
              changePercent: newGrid.baseChangePercent,
              unrealizedPnL: 0,
              realizedPnL: 0,
              filledLevels: newGrid.filledLevels,
            };
          } else {
            nextTicks[grid.id] = tick;
          }
        }

        if (replacements.length > 0) {
          const updated = currentGrids.slice();
          for (const replacement of replacements) {
            updated[replacement.index] = replacement.grid;
          }
          setGrids(updated);
        }

        setTicks(nextTicks);

        if (closedThisRound.length > 0) {
          setClosedTrades((prev) => [...closedThisRound, ...prev].slice(0, 200));
          setSessionRealized((prev) => prev + realizedDelta);
        }
      }
      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const enriched = useMemo(
    () =>
      grids.map((grid) => {
        const tick = ticks[grid.id];
        return {
          grid,
          price: tick?.price ?? grid.basePrice,
          changePercent: tick?.changePercent ?? grid.baseChangePercent,
          unrealizedPnL: tick?.unrealizedPnL ?? 0,
          realizedPnL: tick?.realizedPnL ?? 0,
          filledLevels: tick?.filledLevels ?? grid.filledLevels,
        };
      }),
    [grids, ticks]
  );

  const selected = enriched.find((entry) => entry.grid.symbol === selectedSymbol) ?? enriched[0];

  const baseWallet = account?.cashBalance ?? 192.23;
  const wallet = baseWallet + sessionRealized;
  const totalMargin = enriched.reduce((sum, entry) => sum + entry.grid.margin, 0);
  const totalUnrealized = enriched.reduce((sum, entry) => sum + entry.unrealizedPnL, 0);
  const totalPnL = sessionRealized + totalUnrealized;
  const pnlPercent = baseWallet > 0 ? (totalPnL / baseWallet) * 100 : 0;
  const realizedPercent = baseWallet > 0 ? (sessionRealized / baseWallet) * 100 : 0;
  const exposurePercent = wallet > 0 ? clamp((totalMargin / wallet) * 100, 0, 100) : 0;
  const activeCount = enriched.filter((entry) => entry.grid.active).length;
  const wins = closedTrades.filter((trade) => trade.outcome === 'win').length;
  const losses = closedTrades.filter((trade) => trade.outcome === 'loss').length;
  const closedCount = closedTrades.length;
  const winRate = closedCount > 0 ? Math.round((wins / closedCount) * 100) : 0;

  const sessionDuration = useMemo(() => {
    const elapsedSec = Math.max(0, Math.floor((now - sessionStartRef.current) / 1000));
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }, [now]);

  const fillProgressBars = useMemo(() => {
    if (!selected) return [] as { active: boolean; filled: boolean }[];
    return Array.from({ length: selected.grid.totalLevels }, (_, index) => ({
      filled: index < selected.filledLevels,
      active: index === selected.filledLevels - 1,
    }));
  }, [selected]);

  const historyRows = useMemo(() => {
    if (!selected) return [] as { id: string; time: string; side: 'Buy' | 'Sell'; price: number; size: number; pnl: number }[];
    const seed = symbolSeed(selected.grid.symbol);
    const now = Date.now();
    const rangeStep = (selected.grid.basePrice * selected.grid.rangePercent) / 100 / Math.max(selected.grid.totalLevels, 1);

    return Array.from({ length: 8 }, (_, index) => {
      const buy = (seed + index) % 2 === 0;
      const offset = (index - 3) * rangeStep;
      return {
        id: `${selected.grid.symbol}-${index}`,
        time: new Date(now - (index * 6 + (seed % 7)) * 60_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        side: (buy ? 'Buy' : 'Sell') as 'Buy' | 'Sell',
        price: selected.grid.basePrice + offset,
        size: clamp(0.4 + ((seed + index) % 6) * 0.18, 0.4, 1.6),
        pnl: ((seed + index * 3) % 9 - 3) * 0.018,
      };
    });
  }, [selected]);

  return (
    <div className="bg-[#0A0A0B] border border-zinc-800/50 rounded-3xl overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
        <aside className="border-b lg:border-b-0 lg:border-r border-zinc-800/60 flex flex-col">
          <div className="p-5 border-b border-zinc-800/60">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold mb-4">Trading Stats</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Wallet</p>
                <p className="mt-1 text-2xl font-mono text-white">{formatMoney(wallet)}</p>
                <p className="mt-1 text-[10px] text-yellow-300/80 font-bold">{exposurePercent.toFixed(1)}% exposed</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">PNL (Realized)</p>
                <p className={`mt-1 text-2xl font-mono ${sessionRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatSignedMoney(sessionRealized, 2)}
                </p>
                <p className={`mt-1 text-[10px] font-bold ${sessionRealized >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                  {realizedPercent >= 0 ? '+' : ''}{realizedPercent.toFixed(2)}%
                </p>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1">
                  <p className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-bold">R</p>
                  <p className="text-xs font-mono text-emerald-300">{formatSignedMoney(sessionRealized, 2)}</p>
                </div>
                <div className="rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-1">
                  <p className="text-[9px] uppercase tracking-wider text-rose-400/80 font-bold">U</p>
                  <p className="text-xs font-mono text-rose-300">{formatSignedMoney(totalUnrealized, 2)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-zinc-800/60">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Closed</p>
                <p className="mt-1 text-xl font-mono text-white">{closedCount.toLocaleString()}</p>
                <p className="mt-1 text-[10px] text-zinc-500">{wins}W / {losses}L</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Active</p>
                <p className="mt-1 text-xl font-mono text-white">{sessionDuration}</p>
                <p className="mt-1 text-[10px] text-emerald-400/80 font-bold">{winRate}% win</p>
              </div>
            </div>
          </div>

          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold">Active Grids</p>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/25">
              {activeCount}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[640px] px-2 pb-3 space-y-1">
            {enriched.map((entry) => {
              const { grid } = entry;
              const isSelected = grid.symbol === selectedSymbol;
              const fillRatio = grid.totalLevels > 0 ? entry.filledLevels / grid.totalLevels : 0;
              const pnl = entry.unrealizedPnL;
              const positive = pnl >= 0;

              const ageSec = Math.max(0, Math.floor((now - grid.openedAt) / 1000));
              const ageLabel = ageSec >= 60 ? `${Math.floor(ageSec / 60)}m` : `${ageSec}s`;

              return (
                <button
                  key={grid.id}
                  onClick={() => setSelectedSymbol(grid.symbol)}
                  className={`w-full text-left px-3 py-3 rounded-lg border transition-colors flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-yellow-500/[0.06] border-yellow-400/40'
                      : 'bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Minus size={12} className={isSelected ? 'text-yellow-300' : 'text-zinc-600'} />
                      <span className="font-bold text-white text-sm truncate">{grid.symbol}</span>
                    </div>
                    <span className={`font-mono text-xs ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatSignedMoney(pnl, 4)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 -mt-1 ml-5">
                    <span>{grid.symbol}/USDT · <span className="font-mono text-zinc-400">{formatPrice(entry.price)}</span></span>
                    {isSelected && <ChevronRight size={12} className="text-yellow-300" />}
                  </div>

                  <div className="flex items-center justify-between text-[10px] ml-5">
                    <span className="text-zinc-500">
                      <span className="text-zinc-300 font-bold">{grid.leverage}x</span>
                      <span className="mx-1.5 text-zinc-700">·</span>
                      <span className="font-mono">${grid.margin.toFixed(2)}</span>
                      <span className="mx-1.5 text-zinc-700">·</span>
                      <span>{ageLabel}</span>
                      <span className="mx-1.5 text-zinc-700">·</span>
                      <span className="text-yellow-300 font-bold">{grid.exposurePercent.toFixed(1)}%</span>
                    </span>
                  </div>

                  <div className="ml-5 mr-1">
                    <div className="h-[3px] rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-[width] duration-700 ease-out"
                        style={{ width: `${fillRatio * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                      <span className="text-zinc-600">{formatPrice(grid.basePrice * (1 - grid.rangePercent / 100))}</span>
                      <span className="text-zinc-500">{entry.filledLevels}/{grid.totalLevels}</span>
                      <span className="text-zinc-600">{formatPrice(grid.basePrice * (1 + grid.rangePercent / 100))}</span>
                    </div>
                  </div>

                  <div className="ml-5 flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-zinc-500">R: <span className={entry.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatSignedMoney(entry.realizedPnL, 4)}</span></span>
                    <span className="text-zinc-500">U: <span className={pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatSignedMoney(pnl, 4)}</span></span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex flex-col">
          <div className="border-b border-zinc-800/60 px-6 pt-5">
            <div className="flex items-center gap-6">
              {(['detail', 'history'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`pb-3 text-[11px] uppercase tracking-[0.22em] font-bold border-b-2 transition-colors ${
                    tab === value
                      ? 'text-white border-yellow-400'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            tab === 'detail' ? (
              <DetailPane selected={selected} positions={positions} fillProgressBars={fillProgressBars} />
            ) : (
              <HistoryPane rows={historyRows} symbol={selected.grid.symbol} />
            )
          ) : (
            <div className="p-10 text-center text-zinc-500 text-sm">No active grids.</div>
          )}
        </main>
      </div>
    </div>
  );
}

function DetailPane({
  selected,
  positions,
  fillProgressBars,
}: {
  selected: ReturnType<typeof Object> & {
    grid: GridConfig;
    price: number;
    changePercent: number;
    unrealizedPnL: number;
    realizedPnL: number;
    filledLevels: number;
  };
  positions: Position[];
  fillProgressBars: { filled: boolean; active: boolean }[];
}) {
  const { grid } = selected;
  const upper = grid.basePrice * (1 + grid.rangePercent / 100);
  const lower = grid.basePrice * (1 - grid.rangePercent / 100);
  const orderSize = grid.margin / Math.max(grid.totalLevels, 1);
  const totalPnL = selected.realizedPnL + selected.unrealizedPnL;
  const pnlPercent = grid.margin > 0 ? (totalPnL / grid.margin) * 100 : 0;
  const positive = totalPnL >= 0;
  const holding = positions.find((position) => position.symbol === grid.symbol);

  return (
    <div className="p-6 space-y-5 overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Minus className="text-zinc-500" size={18} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">{grid.symbol}</h2>
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
            <span>{grid.symbol}/USDT</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${grid.active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className={`text-[11px] uppercase tracking-wider font-bold ${grid.active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {grid.active ? 'Active' : 'Paused'}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-6 py-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold mb-2">Unrealized PNL</p>
        <div className="flex items-baseline gap-3">
          <p className={`text-5xl font-mono ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatSignedMoney(totalPnL, 4)}
          </p>
          <p className={`text-sm font-bold ${positive ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
            {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
          </p>
        </div>
        <div className="mt-4 flex items-center gap-6 text-xs">
          <span className="text-zinc-500">Realized: <span className={selected.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatSignedMoney(selected.realizedPnL, 4)}</span></span>
          <span className="text-zinc-500">Unrealized: <span className={selected.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatSignedMoney(selected.unrealizedPnL, 4)}</span></span>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-6 py-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold">Wallet Exposure</p>
          <p className="text-emerald-400 font-mono text-sm">{grid.exposurePercent.toFixed(1)}%</p>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-700"
            style={{ width: `${Math.min(grid.exposurePercent, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-zinc-600">
          <span>${grid.margin.toFixed(2)} margin</span>
          <span>100%</span>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 overflow-hidden">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold px-6 pt-5 pb-3">Grid Parameters</p>
        <div className="divide-y divide-zinc-800/60">
          <ParamRow label="Leverage" value={`${grid.leverage}x`} />
          <ParamRow label="Order Size" value={formatMoney(orderSize)} />
          <ParamRow label="Allocated Margin" value={formatMoney(grid.margin)} />
          <ParamRow label="Wallet Exposure" value={`${grid.exposurePercent.toFixed(1)}%`} valueClassName="text-emerald-400" />
          <ParamRow label="Grid Levels" value={grid.totalLevels.toString()} />
          <ParamRow label="Fills" value={selected.filledLevels.toString()} />
          <ParamRow label="Current Price" value={`$${formatPrice(selected.price)}`} valueClassName={selected.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
          <ParamRow label="Upper Price" value={`$${formatPrice(upper)}`} />
          <ParamRow label="Lower Price" value={`$${formatPrice(lower)}`} />
          <ParamRow label="Duration" value={formatDuration(Math.floor((Date.now() - grid.openedAt) / 60000))} />
          {holding && <ParamRow label="Position" value={`${holding.quantity} sh`} />}
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold">Grid Fill Progress</p>
          <p className="text-xs font-mono text-zinc-400">{selected.filledLevels}/{grid.totalLevels} filled</p>
        </div>
        <div className="flex items-end gap-1 h-12">
          {fillProgressBars.map((bar, index) => (
            <div
              key={index}
              className={`flex-1 rounded-sm transition-colors duration-500 ${
                bar.filled
                  ? bar.active
                    ? 'bg-yellow-300'
                    : 'bg-amber-500/70'
                  : 'bg-zinc-800/80'
              }`}
              style={{ height: `${30 + (index % 5) * 14}%` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-zinc-600">
          <span>${formatPrice(lower)}</span>
          <span className="text-zinc-500">live ticks</span>
          <span>${formatPrice(upper)}</span>
        </div>
      </div>
    </div>
  );
}

function HistoryPane({
  rows,
  symbol,
}: {
  rows: { id: string; time: string; side: 'Buy' | 'Sell'; price: number; size: number; pnl: number }[];
  symbol: string;
}) {
  return (
    <div className="p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold">Recent Fills · {symbol}</p>
        <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Last 8</p>
      </div>
      <div className="rounded-2xl border border-zinc-800/60 overflow-hidden">
        <div className="grid grid-cols-[80px_60px_1fr_1fr_1fr] px-4 py-2 bg-zinc-900/60 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
          <span>Time</span>
          <span>Side</span>
          <span className="text-right">Price</span>
          <span className="text-right">Size</span>
          <span className="text-right">P/L</span>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[80px_60px_1fr_1fr_1fr] px-4 py-3 text-xs font-mono items-center">
              <span className="text-zinc-500">{row.time}</span>
              <span className={`font-bold ${row.side === 'Buy' ? 'text-emerald-400' : 'text-rose-400'}`}>{row.side}</span>
              <span className="text-right text-white">${formatPrice(row.price)}</span>
              <span className="text-right text-zinc-300">{row.size.toFixed(2)}</span>
              <span className={`text-right ${row.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatSignedMoney(row.pnl, 4)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParamRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={`text-sm font-mono ${valueClassName ?? 'text-white'}`}>{value}</span>
    </div>
  );
}
