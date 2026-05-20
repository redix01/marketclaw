import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Minus,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  TrendingUp,
  Wallet as WalletIcon,
  Zap,
  Play,
  Square,
  Sliders,
  ShieldAlert,
  ChevronLeft,
  Coins,
  LineChart,
  BadgePercent,
  Lock,
  Activity,
} from 'lucide-react';
import { MOCK_SYMBOLS } from '../constants';
import { tradingService } from '../services/tradingService';
import { Account, ClosedTrade, ClosedTradesSummary, Position, SymbolInfo, TraderProfile, TraderUpgradeRequest } from '../types';

interface AssetsProps {
  basePath: '/app' | '/demo';
  positions: Position[];
  symbols: SymbolInfo[];
  account: Account | null;
  serverTrades: ClosedTrade[];
  serverTradesSummary: ClosedTradesSummary | null;
  user?: any;
}

type AssetClass = 'stock' | 'crypto';

interface TraderConfig {
  leverage: number;
  takeProfitPercent: number;
  walletExposurePercent: number;
  emergencyStopPercent: number;
  maxOpenPositions: number;
  autoCloseEnabled: boolean;
}

// Per-asset-class minimum funding required to spin the trader up.
// Stocks need a higher floor because share prices are bigger and we need
// at least a couple of slots' worth of margin to deploy.
const TRADER_MINIMUMS: Record<AssetClass, number> = {
  stock: 500,
  crypto: 200,
};

// Default win-rate displayed on the cards when the user has no history to
// draw from yet. Once they have closed trades, the actual rate from their
// own ledger overrides this.
const DEFAULT_WIN_RATES: Record<AssetClass, number> = {
  stock: 80,
  crypto: 77,
};

const DEFAULT_CONFIG: TraderConfig = {
  leverage: 10,
  takeProfitPercent: 2.0,
  walletExposurePercent: 25,
  emergencyStopPercent: 5,
  maxOpenPositions: 10,
  autoCloseEnabled: true,
};

// Trader plan range for the "Max Open Positions" slider. The plan auto-scales
// between these bounds so the grid always runs with enough concurrency to
// rotate capital, but never more than the wallet can realistically support.
const MAX_OPEN_POSITIONS_MIN = 10;
const MAX_OPEN_POSITIONS_MAX = 30;

const CONFIG_STORAGE_KEY = 'marketclaw:trader-config:v1';
const RUNTIME_STORAGE_KEY = 'marketclaw:trader-running:v1';
const ASSET_TYPE_STORAGE_KEY = 'marketclaw:trader-asset-type:v1';

function loadStoredConfig(): TraderConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return null;
  }
}

function loadRunning(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(RUNTIME_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadAssetType(): AssetClass | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ASSET_TYPE_STORAGE_KEY);
    return raw === 'stock' || raw === 'crypto' ? raw : null;
  } catch {
    return null;
  }
}

function persistAssetType(type: AssetClass | null) {
  if (typeof window === 'undefined') return;
  try {
    if (type) {
      window.localStorage.setItem(ASSET_TYPE_STORAGE_KEY, type);
    } else {
      window.localStorage.removeItem(ASSET_TYPE_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
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

interface LocalClosedTrade {
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

// Used in tight headers where a 12+ digit balance would overflow the
// column. Falls back to full notation for anything under $1M so the
// dashboard stays precise for normal wallets.
function formatMoneyAdaptive(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 10_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSignedMoneyAdaptive(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatMoneyAdaptive(Math.abs(value)).replace(/^-/, '')}`;
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

const STORAGE_KEY = 'marketclaw:grid-session:v2';

interface PersistedSession {
  sessionStart: number;
  grids: GridConfig[];
  closedTrades: LocalClosedTrade[];
  sessionRealized: number;
  selectedSymbol: string;
  gridIdCounter: number;
}

function loadPersisted(): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed || !Array.isArray(parsed.grids) || !Array.isArray(parsed.closedTrades)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedSession) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or disabled */
  }
}

function buildGrid(
  symbol: SymbolInfo,
  index: number,
  openedAt: number,
  cfg: TraderConfig,
  walletBalance: number
): GridConfig {
  const seed = symbolSeed(symbol.symbol) + Math.floor(Math.random() * 97);
  const totalLevels = clamp(10 + ((seed + index) % 18), 10, 28);
  const filledLevels = (seed + index * 3) % (totalLevels + 1);

  // Distribute wallet exposure across the configured number of positions.
  const slots = Math.max(cfg.maxOpenPositions, 1);
  const targetExposurePerSlot = cfg.walletExposurePercent / slots;
  const margin = clamp((walletBalance * targetExposurePerSlot) / 100, 1, walletBalance);

  const rangePercent = clamp(2 + ((seed % 13) * 0.6), 1.8, 9.5);
  const baseUnrealized = ((seed % 7) - 3) * 0.012;

  // Use the user-configured TP / emergency stop directly.
  const closeThreshold = cfg.takeProfitPercent / 100;
  const stopThreshold = -(cfg.emergencyStopPercent / 100);

  return {
    id: nextGridId(symbol.symbol),
    symbol: symbol.symbol,
    name: symbol.name,
    type: symbol.type,
    basePrice: symbol.price,
    baseChangePercent: symbol.changePercent,
    leverage: cfg.leverage,
    margin,
    exposurePercent: targetExposurePerSlot,
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

function tickGrid(config: GridConfig, prevTick: GridTick | undefined, nowMs: number, liveLeverage: number, marketPrice?: number): GridTick {
  const seed = symbolSeed(config.symbol);
  const slow = Math.sin(nowMs / 7300 + seed) * 0.0008;
  const fast = Math.sin(nowMs / 1100 + seed * 1.7) * 0.0011;
  const drift = slow + fast;

  const prevPrice = prevTick?.price ?? config.basePrice;
  const targetPrice = marketPrice && marketPrice > 0
    ? marketPrice
    : config.basePrice * (1 + drift);
  const price = prevPrice + (targetPrice - prevPrice) * 0.18;

  const changePercent = ((price - config.basePrice) / config.basePrice) * 100 + config.baseChangePercent;

  // Real-leverage P&L: the underlying price-move return is multiplied by the
  // user's chosen leverage (so 10x leverage swings 10x as hard for any given
  // tick), plus a small unleveraged synthetic component so each grid has
  // its own slight bias and the simulation stays bounded.
  const priceMoveFraction = (price - config.basePrice) / config.basePrice;
  // Use the *live* leverage from the active config so editing leverage while
  // the trader is running affects open positions immediately, rather than
  // staying frozen at the value the grid was opened with.
  const leverage = Math.max(1, liveLeverage || config.leverage);
  const leveragedReturn = priceMoveFraction * leverage;
  const syntheticBias = config.unrealizedPnL + Math.sin(nowMs / 4200 + seed) * 0.01;
  const pnlFraction = leveragedReturn + syntheticBias;
  const unrealizedPnL = config.active ? config.margin * pnlFraction : 0;
  const realizedPnL = config.margin * config.realizedPnL + Math.sin(nowMs / 9100 + seed * 0.6) * 0.05;

  const fillJitter = Math.floor((Math.sin(nowMs / 6500 + seed) + 1) * 1.5);
  const filledLevels = clamp(config.filledLevels + fillJitter, 0, config.totalLevels);

  return { price, changePercent, unrealizedPnL, realizedPnL, filledLevels };
}

export default function Assets({ positions, symbols, account, serverTrades, serverTradesSummary, user }: AssetsProps) {
  const liveSymbols = symbols.length > 0 ? symbols : MOCK_SYMBOLS;
  const uid = user?.uid;
  const isGuest = !uid || uid === 'guest-user';

  // Initial state is hydrated from localStorage so the first paint already
  // shows the right screen — no flicker between TraderSelect → RunningTrader
  // while we wait on the server. Guests are considered "hydrated" instantly.
  const [config, setConfig] = useState<TraderConfig>(() => loadStoredConfig() ?? DEFAULT_CONFIG);
  const [running, setRunning] = useState<boolean>(() => loadRunning() && loadStoredConfig() !== null);
  const [selectedType, setSelectedType] = useState<AssetClass | null>(() => loadAssetType());
  const [hydrated, setHydrated] = useState<boolean>(() => !uid || uid === 'guest-user');
  const [busy, setBusy] = useState(false);
  // inCooldown is transient — NOT persisted to localStorage. Refreshing during cooldown
  // safely drops back to the SetupForm screen.
  const [inCooldown, setInCooldown] = useState(false);
  const [botStartedAt, setBotStartedAt] = useState<string | null>(null);
  const [traderProfiles, setTraderProfiles] = useState<Record<AssetClass, TraderProfile>>({} as Record<AssetClass, TraderProfile>);
  const [upgradeBusy, setUpgradeBusy] = useState(false);

  // Debounced server save of preference fields the user can edit while the
  // trader is running (leverage, take-profit, stop-loss, auto-close). Local
  // state and localStorage update synchronously so the simulation responds
  // immediately; the API call is throttled to avoid spamming.
  const liveSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLiveConfigChange = (next: TraderConfig) => {
    setConfig(next);
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
    if (isGuest) return;
    if (liveSaveTimer.current) clearTimeout(liveSaveTimer.current);
    liveSaveTimer.current = setTimeout(() => {
      void tradingService.updatePreferences(uid, {
        leverage: next.leverage,
        take_profit_percent: next.takeProfitPercent,
        emergency_stop_percent: next.emergencyStopPercent,
        auto_close_enabled: next.autoCloseEnabled,
      }).catch((err) => {
        console.error('Failed to persist live settings:', err);
      });
    }, 500);
  };
  useEffect(() => () => {
    if (liveSaveTimer.current) clearTimeout(liveSaveTimer.current);
  }, []);

  // Hydrate config + running flag + asset class from the server preferences
  // on mount, so the trader picks up where the user left off across devices.
  useEffect(() => {
    if (isGuest) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    void Promise.all([
      tradingService.getPreferences(uid),
      tradingService.getTraderProfiles(uid),
    ]).then(([prefs, profiles]) => {
      if (cancelled || !prefs) {
        setHydrated(true);
        return;
      }
      const nextProfiles = profiles.reduce((acc, profile) => {
        acc[profile.asset_type] = profile;
        return acc;
      }, {} as Record<AssetClass, TraderProfile>);
      setTraderProfiles(nextProfiles);
      const next: TraderConfig = {
        leverage: prefs.leverage ?? DEFAULT_CONFIG.leverage,
        takeProfitPercent: prefs.take_profit_percent ?? DEFAULT_CONFIG.takeProfitPercent,
        walletExposurePercent: prefs.wallet_exposure_percent ?? DEFAULT_CONFIG.walletExposurePercent,
        emergencyStopPercent: prefs.emergency_stop_percent ?? DEFAULT_CONFIG.emergencyStopPercent,
        maxOpenPositions: clamp(
          prefs.max_open_positions ?? DEFAULT_CONFIG.maxOpenPositions,
          MAX_OPEN_POSITIONS_MIN,
          MAX_OPEN_POSITIONS_MAX,
        ),
        autoCloseEnabled: prefs.auto_close_enabled ?? DEFAULT_CONFIG.autoCloseEnabled,
      };
      setConfig(next);
      try {
        window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }

      const serverType: AssetClass | null = prefs.bot_asset_type === 'stock' || prefs.bot_asset_type === 'crypto'
        ? prefs.bot_asset_type
        : null;
      const isRunning = typeof prefs.bot_running === 'boolean' ? prefs.bot_running : false;

      // Resolve asset type — server is source of truth, but keep the local
      // selection if the bot isn't running and the user picked one offline.
      const resolvedType = serverType
        ?? (isRunning ? 'stock' : selectedType);
      setSelectedType(resolvedType);
      persistAssetType(resolvedType);

      setBotStartedAt(prefs.bot_started_at ?? null);
      setRunning(isRunning);
      try {
        window.localStorage.setItem(RUNTIME_STORAGE_KEY, isRunning ? '1' : '0');
      } catch { /* ignore */ }

      setHydrated(true);
    }).catch(() => {
      // On error, fall back to whatever we hydrated from localStorage so the
      // user still gets a screen instead of an empty render.
      setHydrated(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isGuest]);

  const handlePickTrader = (type: AssetClass) => {
    setSelectedType(type);
    persistAssetType(type);
  };

  const handleBackToSelect = () => {
    setSelectedType(null);
    persistAssetType(null);
  };

  const handleStart = async (next: TraderConfig, mode: 'fresh' | 'resume' = 'fresh') => {
    if (!selectedType) return;
    setConfig(next);
    setBusy(true);
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
      if (mode === 'fresh') {
        // Resetting the grid session ensures fresh state for the new run.
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }

    let startedAt = new Date().toISOString();
    let actualMode: 'fresh' | 'resume' = mode;
    if (!isGuest) {
      try {
        const profileCommission = traderProfiles[selectedType]?.commission_percent;
        await tradingService.updatePreferences(uid, {
          leverage: next.leverage,
          take_profit_percent: next.takeProfitPercent,
          wallet_exposure_percent: next.walletExposurePercent,
          emergency_stop_percent: next.emergencyStopPercent,
          max_open_positions: next.maxOpenPositions,
          auto_close_enabled: next.autoCloseEnabled,
          bot_asset_type: selectedType,
          commission_percent: profileCommission,
        });
        const response = await tradingService.startBot(uid, selectedType, mode);
        startedAt = response?.preferences?.bot_started_at ?? startedAt;
        actualMode = response?.session?.mode ?? actualMode;
      } catch (err) {
        console.error('Failed to start agent on server:', err);
      }
    }
    setBotStartedAt(startedAt);
    setBusy(false);
    if (actualMode === 'resume') {
      setRunning(true);
      try {
        window.localStorage.setItem(RUNTIME_STORAGE_KEY, '1');
      } catch { /* ignore */ }
      return;
    }
    setInCooldown(true);
  };

  const handleCooldownReady = () => {
    setInCooldown(false);
    setRunning(true);
    try {
      window.localStorage.setItem(RUNTIME_STORAGE_KEY, '1');
    } catch { /* ignore */ }
  };

  const handleCooldownCancel = async () => {
    setInCooldown(false);
    if (!isGuest) {
      try {
        await tradingService.stopBot(uid);
      } catch { /* ignore */ }
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      window.localStorage.setItem(RUNTIME_STORAGE_KEY, '0');
    } catch { /* ignore */ }
    if (!isGuest) {
      try {
        await tradingService.stopBot(uid);
      } catch (err) {
        console.error('Failed to stop agent on server:', err);
      }
    }
    setBusy(false);
    setRunning(false);
    // After stopping, the user lands back on the config screen for the same
    // trader so they can tweak and restart without re-picking the asset type.
  };

  const handleSwitchTrader = async () => {
    await handleStop();
    setSelectedType(null);
    persistAssetType(null);
  };

  // Block the first render until we've reconciled with the server. Otherwise
  // a logged-in user with a stale localStorage flag can see TraderSelect for
  // one paint before the running view takes over (or vice versa). The
  // skeleton matches the eventual layout so the swap feels seamless.
  if (!hydrated) {
    return <AiTraderSkeleton />;
  }

  // Stage selection. Running trumps everything, then the selected type, else
  // the trader-picker. Edge case: somehow running with no type → caught above.
  if (running && selectedType) {
    return (
      <RunningTrader
        config={config}
        assetType={selectedType}
        profile={traderProfiles[selectedType]}
        liveSymbols={liveSymbols}
        positions={positions}
        account={account}
        serverTrades={serverTrades}
        serverTradesSummary={serverTradesSummary}
        botStartedAt={botStartedAt}
        onRequestUpgrade={async () => {
          if (!uid || !selectedType || upgradeBusy) return;
          const profile = traderProfiles[selectedType];
          if (!profile) return;
          setUpgradeBusy(true);
          try {
            const note = window.prompt(`Request ${profile.title} upgrade to level ${profile.level + 1}. Optional note:`) ?? '';
            const request = await tradingService.requestTraderUpgrade(uid, {
              asset_type: selectedType,
              requested_level: profile.level + 1,
              note: note.trim() || undefined,
            });
            setTraderProfiles((current) => ({
              ...current,
              [selectedType]: {
                ...profile,
                pending_upgrade_request: request,
              },
            }));
          } catch (error) {
            console.error('Failed to request upgrade:', error);
          } finally {
            setUpgradeBusy(false);
          }
        }}
        upgradeBusy={upgradeBusy}
        onStop={handleStop}
        onSwitchTrader={handleSwitchTrader}
        busy={busy}
        onConfigChange={handleLiveConfigChange}
      />
    );
  }

  if (inCooldown && selectedType) {
    return (
      <CooldownScreen
        assetType={selectedType}
        config={config}
        symbols={liveSymbols}
        onReady={handleCooldownReady}
        onCancel={handleCooldownCancel}
      />
    );
  }

  if (selectedType) {
    return (
      <SetupForm
        assetType={selectedType}
        profile={traderProfiles[selectedType]}
        initial={config}
        account={account}
        closedTradesSummary={serverTradesSummary}
        onStart={handleStart}
        hasExistingPositions={positions.some((position) => position.assetType === selectedType)}
        onBack={handleBackToSelect}
        busy={busy}
      />
    );
  }

  return (
    <TraderSelect
      account={account}
      symbols={liveSymbols}
      serverTrades={serverTrades}
      traderProfiles={traderProfiles}
      onPick={handlePickTrader}
    />
  );
}

function AiTraderSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div>
        <div className="h-5 w-24 rounded-full bg-zinc-800/60 mb-3" />
        <div className="h-9 w-72 rounded-md bg-zinc-800/60" />
        <div className="h-4 w-[28rem] max-w-full rounded bg-zinc-800/40 mt-3" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 flex flex-col gap-5 min-h-[300px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/60" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-zinc-800/60" />
                <div className="h-3 w-28 rounded bg-zinc-800/40" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-zinc-800/40" />
            <div className="h-3 w-3/4 rounded bg-zinc-800/40" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-16 rounded-xl border border-zinc-800/60 bg-zinc-950/40" />
              ))}
            </div>
            <div className="h-12 rounded-xl bg-zinc-800/50" />
          </div>
        ))}
      </div>
      <div className="h-16 rounded-2xl bg-zinc-900/30 border border-zinc-800/60" />
    </div>
  );
}

function CooldownScreen({
  assetType,
  config,
  symbols,
  onReady,
  onCancel,
}: {
  assetType: AssetClass;
  config: TraderConfig;
  symbols: SymbolInfo[];
  onReady: () => void;
  onCancel: () => void;
}) {
  const COOLDOWN = 30;
  const [left, setLeft] = useState(COOLDOWN);
  const [scanPhase, setScanPhase] = useState<'scanning' | 'picking' | 'ready'>('scanning');
  const [scanned, setScanned] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  const pool = useMemo(
    () => symbols.filter((s) => s.type === assetType).map((s) => s.symbol),
    [symbols, assetType],
  );

  // Countdown: fire onReady when it hits 0
  useEffect(() => {
    if (left <= 0) {
      onReady();
      return;
    }
    const id = window.setTimeout(() => setLeft((prev) => prev - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, onReady]);

  // Scanning: reveal pool symbols one by one across ~20 seconds, then pick
  useEffect(() => {
    if (pool.length === 0) return;
    let i = 0;
    const revealMs = Math.min(600, Math.floor(20_000 / pool.length));
    const id = window.setInterval(() => {
      if (i < pool.length) {
        const sym = pool[i];
        setScanned((prev) => (prev.includes(sym) ? prev : [...prev, sym]));
        i += 1;
      } else {
        window.clearInterval(id);
        setScanPhase('picking');
        const picks = [...pool]
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(config.maxOpenPositions, pool.length));
        window.setTimeout(() => {
          setPicked(picks);
          setScanPhase('ready');
        }, 1800);
      }
    }, revealMs);
    return () => window.clearInterval(id);
    // pool changes cause a restart — that's intentional when symbols load late
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.join(','), config.maxOpenPositions]);

  const progress = ((COOLDOWN - left) / COOLDOWN) * 100;
  const circumference = 2 * Math.PI * 15.5; // r=15.5 on viewBox 0 0 36 36
  const stroke = (progress / 100) * circumference;

  const traderLabel = assetType === 'stock' ? 'Stock AI Trader' : 'Crypto AI Trader';
  const TraderIcon = assetType === 'stock' ? LineChart : Coins;
  const iconTone = assetType === 'stock' ? 'text-yellow-300' : 'text-amber-300';

  const phaseLabel =
    scanPhase === 'scanning'
      ? 'Scanning markets…'
      : scanPhase === 'picking'
        ? 'Selecting positions…'
        : 'Ready to open positions';

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-[10px] uppercase tracking-[0.22em] font-bold mb-3">
          <TraderIcon size={12} className={iconTone} /> {traderLabel}
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Initializing Agent Trader</h2>
        <p className="text-sm text-zinc-500 mt-1.5 max-w-xl">
          Scanning {assetType === 'stock' ? 'equity' : 'crypto'} markets and selecting optimal
          grid positions before trading begins.
        </p>
      </div>

      {/* Countdown ring + phase label */}
      <div className="flex items-center gap-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#27272a" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="#eab308"
              strokeWidth="3"
              strokeDasharray={`${stroke.toFixed(2)} ${circumference.toFixed(2)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-mono font-bold text-white">{left}</span>
          </div>
        </div>
        <div>
          <p className="text-white font-bold">{phaseLabel}</p>
          <p className="text-sm text-zinc-500 mt-1">Trading begins in {left}s</p>
          <div className="mt-2 w-52 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-yellow-500 transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scanning list */}
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-3">
            {assetType === 'stock' ? 'Equity' : 'Crypto'} Markets Scanned
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {scanned.map((sym) => {
              const isPicked = picked.includes(sym);
              return (
                <div
                  key={sym}
                  className={`flex items-center gap-2 text-xs font-mono ${isPicked ? 'text-yellow-300' : 'text-zinc-400'}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isPicked ? 'bg-yellow-400 animate-pulse' : 'bg-zinc-700'
                    }`}
                  />
                  {sym}
                  {isPicked && (
                    <span className="text-[9px] uppercase text-yellow-500 font-bold ml-auto">
                      selected
                    </span>
                  )}
                </div>
              );
            })}
            {scanned.length === 0 && (
              <p className="text-xs text-zinc-600 italic">Loading symbols…</p>
            )}
          </div>
        </div>

        {/* Config + selected positions */}
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            Agent Configuration
          </p>
          <div className="space-y-2.5">
            {[
              ['Asset class', assetType === 'stock' ? 'US Equities' : 'Crypto Pairs'],
              ['Leverage', `${config.leverage}x`],
              ['Take profit', `+${config.takeProfitPercent}%`],
              ['Stop loss', `-${config.emergencyStopPercent}%`],
              ['Max positions', String(config.maxOpenPositions)],
              ['Exposure', `${config.walletExposurePercent}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{label}</span>
                <span className="text-xs font-mono font-bold text-white">{value}</span>
              </div>
            ))}
          </div>

          {scanPhase === 'ready' && picked.length > 0 && (
            <div className="mt-1 pt-3 border-t border-zinc-800/60">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Opening positions
              </p>
              <div className="flex flex-wrap gap-2">
                {picked.map((sym) => (
                  <span
                    key={sym}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-bold font-mono"
                  >
                    <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onCancel}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Cancel and go back
      </button>
    </div>
  );
}

function TraderSelect({
  account,
  symbols,
  serverTrades,
  traderProfiles,
  onPick,
}: {
  account: Account | null;
  symbols: SymbolInfo[];
  serverTrades: ClosedTrade[];
  traderProfiles: Record<AssetClass, TraderProfile>;
  onPick: (type: AssetClass) => void;
}) {
  const wallet = account?.cashBalance ?? 0;

  // Derive the live symbol counts so the user sees the actual instrument
  // pool the trader will rotate through, not a hard-coded number.
  const counts = useMemo(() => ({
    stock: symbols.filter((s) => s.type === 'stock').length,
    crypto: symbols.filter((s) => s.type === 'crypto').length,
  }), [symbols]);

  // Win rate from the user's actual closed-bot trades for that asset class.
  // Falls back to a conservative default when there's no history yet.
  const stats = useMemo(() => {
    const compute = (type: AssetClass) => {
      const trades = serverTrades.filter((t) => t.assetType === type);
      if (trades.length === 0) {
        return { winRate: DEFAULT_WIN_RATES[type], realizedPnl: 0, trades: 0, isLive: false };
      }
      const wins = trades.filter((t) => t.realizedPnl > 0).length;
      const realized = trades.reduce((sum, t) => sum + t.realizedPnl, 0);
      return {
        winRate: Math.round((wins / trades.length) * 100),
        realizedPnl: realized,
        trades: trades.length,
        isLive: true,
      };
    };
    return { stock: compute('stock'), crypto: compute('crypto') };
  }, [serverTrades]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-[10px] uppercase tracking-[0.22em] font-bold mb-3">
          <Bot size={12} /> AI Trader
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Pick your Agent Trader</h2>
        <p className="text-sm text-zinc-500 mt-1.5 max-w-2xl">
          Two grid agents trained on different markets. Pick one, configure the risk profile, and the
          agent scans assets, places grid orders and auto-closes winners — net realized P&amp;L lands in
          your wallet automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TraderCard
          type="stock"
          profile={traderProfiles.stock}
          title={traderProfiles.stock?.title ?? 'Stock AI Trader'}
          description={traderProfiles.stock?.description ?? 'Tracks blue-chip and high-volatility equities; opens grid positions around technical levels.'}
          accent="from-yellow-500/20 to-yellow-600/[0.04]"
          icon={<LineChart size={22} className="text-yellow-300" />}
          symbolsCount={counts.stock}
          stats={stats.stock}
          wallet={wallet}
          onPick={() => onPick('stock')}
        />
        <TraderCard
          type="crypto"
          profile={traderProfiles.crypto}
          title={traderProfiles.crypto?.title ?? 'Crypto AI Trader'}
          description={traderProfiles.crypto?.description ?? '24/7 grid agent on top crypto pairs — fractional sizing, faster cycles, deeper exposure ranges.'}
          accent="from-amber-500/20 to-amber-600/[0.04]"
          icon={<Coins size={22} className="text-amber-300" />}
          symbolsCount={counts.crypto}
          stats={stats.crypto}
          wallet={wallet}
          onPick={() => onPick('crypto')}
        />
      </div>

      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-5 py-4 flex items-start gap-3">
        <BadgePercent size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-400 leading-relaxed">
          <span className="text-white font-bold">Platform commission.</span> Levels and commissions are managed by the admin for each trader.
          Winning auto-closes are charged per-trader commission, and the remaining proceeds land in your
          wallet immediately and compounds into the next cycle. Losing closes are not charged.
        </div>
      </div>
    </div>
  );
}

function TraderCard({
  type,
  profile,
  title,
  description,
  accent,
  icon,
  symbolsCount,
  stats,
  wallet,
  onPick,
}: {
  type: AssetClass;
  profile?: TraderProfile;
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
  symbolsCount: number;
  stats: { winRate: number; realizedPnl: number; trades: number; isLive: boolean };
  wallet: number;
  onPick: () => void;
}) {
  const min = TRADER_MINIMUMS[type];
  const insufficient = wallet < min;
  const shortBy = Math.max(0, min - wallet);
  const commissionPercent = profile?.commission_percent ?? 20;
  const level = profile?.level ?? 1;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${insufficient ? 'border-zinc-800/70' : 'border-yellow-500/20'} bg-gradient-to-br ${accent} p-6 flex flex-col gap-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-bold mt-0.5">
              {type === 'stock' ? 'US Equities' : 'Crypto Pairs'} · {symbolsCount} instruments
            </p>
          </div>
        </div>
        {stats.isLive && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
            <Activity size={10} />
            {stats.trades} closed
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 -mt-2">
        <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300">
          Level {level}
        </span>
        {profile?.pending_upgrade_request?.status === 'pending' && (
          <span className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300">
            Upgrade Pending
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Min. to start"
          value={`$${min.toLocaleString()}`}
          accent={insufficient ? 'rose' : 'yellow'}
        />
        <Stat
          label="Win rate"
          value={`${stats.winRate}%`}
          hint={stats.isLive ? 'your history' : 'expected'}
        />
        <Stat
          label="Commission"
          value={`${commissionPercent}%`}
          hint="on winners only"
        />
        <Stat
          label={stats.isLive ? 'Net realized' : 'Avg cycle'}
          value={stats.isLive
            ? (stats.realizedPnl >= 0 ? `+$${stats.realizedPnl.toFixed(2)}` : `-$${Math.abs(stats.realizedPnl).toFixed(2)}`)
            : (type === 'stock' ? '~30m' : '~12m')}
          accent={stats.isLive ? (stats.realizedPnl >= 0 ? 'yellow' : 'rose') : undefined}
        />
      </div>

      <button
        onClick={onPick}
        disabled={insufficient}
        className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
          insufficient
            ? 'bg-zinc-800/70 text-zinc-500 cursor-not-allowed'
            : 'bg-yellow-500 hover:bg-yellow-400 text-black'
        }`}
      >
        {insufficient ? (
          <>
            <Lock size={16} />
            Need ${shortBy.toFixed(2)} more
          </>
        ) : (
          <>
            Configure {title.split(' ')[0]} Trader
            <ChevronRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'yellow' | 'rose';
}) {
  const valueColor = accent === 'rose'
    ? 'text-rose-300'
    : accent === 'yellow'
      ? 'text-yellow-300'
      : 'text-white';
  return (
    <div className="rounded-xl bg-zinc-950/40 border border-zinc-800/60 px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{label}</p>
      <p className={`text-base font-mono font-bold mt-0.5 ${valueColor}`}>{value}</p>
      {hint && <p className="text-[9px] text-zinc-600 mt-0.5">{hint}</p>}
    </div>
  );
}

function SetupForm({
  assetType,
  profile,
  initial,
  account,
  closedTradesSummary,
  onStart,
  hasExistingPositions,
  onBack,
  busy,
}: {
  assetType: AssetClass;
  profile?: TraderProfile;
  initial: TraderConfig;
  account: Account | null;
  closedTradesSummary: ClosedTradesSummary | null;
  onStart: (cfg: TraderConfig, mode: 'fresh' | 'resume') => void | Promise<void>;
  hasExistingPositions: boolean;
  onBack: () => void;
  busy: boolean;
}) {
  const [config, setConfig] = useState<TraderConfig>(initial);
  const [saving, setSaving] = useState(false);

  // Keep the form in sync with the latest server-hydrated config.
  useEffect(() => {
    setConfig(initial);
  }, [initial.leverage, initial.takeProfitPercent, initial.walletExposurePercent, initial.emergencyStopPercent, initial.maxOpenPositions, initial.autoCloseEnabled]);

  const stats = closedTradesSummary ?? {
    totalTrades: 0,
    totalRealizedPnl: 0,
    avgPnlPercent: 0,
    autoClosedCount: 0,
    manualClosedCount: 0,
  };

  const wallet = account?.cashBalance ?? 0;
  const capitalAtRisk = (wallet * config.walletExposurePercent) / 100;
  const minRequired = TRADER_MINIMUMS[assetType];
  const insufficient = wallet < minRequired;
  const shortBy = Math.max(0, minRequired - wallet);
  const traderLabel = profile?.title ?? (assetType === 'stock' ? 'Stock AI Trader' : 'Crypto AI Trader');
  const TraderIcon = assetType === 'stock' ? LineChart : Coins;
  const iconTone = assetType === 'stock' ? 'text-yellow-300' : 'text-amber-300';
  const commissionPercent = profile?.commission_percent ?? 20;

  const handleStart = async (mode: 'fresh' | 'resume') => {
    if (insufficient) return;
    setSaving(true);
    await onStart(config, mode);
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={14} /> Back to traders
      </button>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-[10px] uppercase tracking-[0.22em] font-bold mb-3">
            <TraderIcon size={12} className={iconTone} /> {traderLabel}
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Configure your {traderLabel.replace(' AI Trader', '')} agent</h2>
          <p className="text-sm text-zinc-500 mt-1.5 max-w-xl">
            Set leverage, exposure and risk limits. The agent rotates through {assetType === 'stock' ? 'equity' : 'crypto'}{' '}
            instruments, auto-closes winners at your TP, and net realized P&amp;L (after the
            {' '}{commissionPercent}% commission) lands in your wallet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-3 rounded-xl border border-zinc-800/70 bg-[#0F0F11] min-w-[140px]">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Wallet</p>
            <p className={`mt-1 text-xl font-mono font-bold ${insufficient ? 'text-rose-300' : 'text-white'}`}>{formatMoney(wallet)}</p>
            <p className="text-[9px] text-zinc-500 mt-0.5">min ${minRequired}</p>
          </div>
          <div className="px-4 py-3 rounded-xl border border-zinc-800/70 bg-[#0F0F11] min-w-[140px]">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Bot Level</p>
            <p className="mt-1 text-xl font-mono font-bold text-white">Lv {profile?.level ?? 1}</p>
          </div>
          <div className="px-4 py-3 rounded-xl border border-zinc-800/70 bg-[#0F0F11] min-w-[140px]">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Realized P&amp;L</p>
            <p className={`mt-1 text-xl font-mono font-bold ${stats.totalRealizedPnl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
              {stats.totalRealizedPnl >= 0 ? '+' : '-'}${Math.abs(stats.totalRealizedPnl).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {insufficient && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3 flex items-start gap-3">
          <Lock size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200 leading-relaxed">
            <span className="font-bold">Wallet below minimum.</span> The {traderLabel} needs at least
            ${minRequired.toLocaleString()} to deploy a meaningful grid. Deposit{' '}
            <span className="font-mono text-rose-100">${shortBy.toFixed(2)}</span> more from the Wallet page,
            or pick the other trader.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FieldCard icon={<Zap size={16} className="text-yellow-400" />} label="Leverage" hint="Position multiplier for grid trading">
          <NumberInput
            value={config.leverage}
            min={1}
            max={100}
            step={1}
            integer
            onChange={(v) => setConfig({ ...config, leverage: v })}
            suffix="x"
          />
        </FieldCard>

        <FieldCard icon={<TrendingUp size={16} className="text-yellow-400" />} label="Take Profit" hint="Auto-close when profit reaches this %">
          <NumberInput
            value={config.takeProfitPercent}
            min={0.1}
            max={50}
            step={0.1}
            onChange={(v) => setConfig({ ...config, takeProfitPercent: v })}
            suffix="%"
          />
        </FieldCard>

        <FieldCard
          icon={<WalletIcon size={16} className="text-yellow-400" />}
          label="Wallet Allocation"
          hint="Share of your wallet the AI trader is allowed to deploy as margin across all open positions combined. Higher = more capital at risk."
        >
          <NumberInput
            value={config.walletExposurePercent}
            min={1}
            max={100}
            step={1}
            integer
            onChange={(v) => setConfig({ ...config, walletExposurePercent: v })}
            suffix="%"
          />
          <p className="text-[10px] text-yellow-300/80 mt-2 leading-relaxed">
            e.g. <span className="font-mono">25%</span> of a <span className="font-mono">$1,000</span> wallet
            allocates up to <span className="font-mono">$250</span> as margin — split evenly across your
            Max Open Positions. The remainder stays as free cash.
          </p>
        </FieldCard>

        <FieldCard icon={<ShieldAlert size={16} className="text-yellow-400" />} label="Stop Loss" hint="Halt all trading once this loss % is hit">
          <NumberInput
            value={config.emergencyStopPercent}
            min={0.1}
            max={50}
            step={0.1}
            onChange={(v) => setConfig({ ...config, emergencyStopPercent: v })}
            suffix="%"
          />
        </FieldCard>

        <FieldCard
          icon={<Sliders size={16} className="text-yellow-400" />}
          label="Max Open Positions"
          hint={`Trader-plan range: ${MAX_OPEN_POSITIONS_MIN}–${MAX_OPEN_POSITIONS_MAX} simultaneous grid positions.`}
        >
          <NumberInput
            value={config.maxOpenPositions}
            min={MAX_OPEN_POSITIONS_MIN}
            max={MAX_OPEN_POSITIONS_MAX}
            step={1}
            integer
            onChange={(v) => setConfig({ ...config, maxOpenPositions: v })}
          />
        </FieldCard>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-5 flex items-center justify-between">
          <div>
            <label className="text-sm font-bold text-white">Auto-Close</label>
            <p className="text-[10px] text-zinc-500 mt-1">
              Auto-close at +{config.takeProfitPercent}% / halt at -{config.emergencyStopPercent}%
            </p>
          </div>
          <button
            onClick={() => setConfig({ ...config, autoCloseEnabled: !config.autoCloseEnabled })}
            className={`w-14 h-7 rounded-full transition-all flex-shrink-0 ${
              config.autoCloseEnabled ? 'bg-yellow-500' : 'bg-zinc-700'
            }`}
            aria-pressed={config.autoCloseEnabled}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                config.autoCloseEnabled ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.04] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-bold text-yellow-400">Plan summary</p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Allocate up to <span className="font-mono text-yellow-300">{formatMoney(capitalAtRisk)}</span>
              {' '}({config.walletExposurePercent}% of wallet) across <span className="font-mono text-yellow-300">{config.maxOpenPositions}</span> {assetType} grid positions
              at <span className="font-mono text-yellow-300">{config.leverage}x</span> leverage. Auto-close fires at
              {' '}<span className="font-mono text-yellow-300">+{config.takeProfitPercent}%</span> realized;
              the platform takes <span className="font-mono text-yellow-300">{commissionPercent}%</span> of each
              winning close, the rest auto-credits your wallet.
              Stop loss halts trading at <span className="font-mono text-rose-300">-{config.emergencyStopPercent}%</span>.
            </p>
          </div>
        </div>
      </div>

      <div className={`grid gap-3 ${hasExistingPositions ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        <button
          onClick={() => void handleStart('fresh')}
          disabled={saving || busy || insufficient}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
            insufficient
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black'
          }`}
        >
          {(saving || busy) ? (
            <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : insufficient ? (
            <Lock size={18} />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
          {insufficient ? `Need $${shortBy.toFixed(2)} more` : ((saving || busy) ? 'Starting…' : `Start Fresh ${traderLabel.replace(' AI Trader', '')}`)}
        </button>
        {hasExistingPositions && (
          <button
            onClick={() => void handleStart('resume')}
            disabled={saving || busy}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-zinc-700 bg-zinc-900 hover:border-yellow-500/40 hover:text-yellow-300 disabled:opacity-50"
          >
            <Activity size={18} />
            {(saving || busy) ? 'Resuming…' : 'Resume Existing Trades'}
          </button>
        )}
      </div>
    </div>
  );
}

function FieldCard({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <label className="text-sm font-bold text-white">{label}</label>
      </div>
      {children}
      <p className="text-[10px] text-zinc-500 mt-2">{hint}</p>
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  step,
  integer,
  onChange,
  suffix,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  // Track the raw text the user is typing so they can clear the field, type
  // multi-digit numbers, and pass through intermediate states like "1." or
  // empty without the value snapping back to the clamped current value on
  // every keystroke. Validation + clamping happens on blur / Enter.
  const [text, setText] = useState<string>(() => String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    // Sync external value into the input when we're not actively editing it,
    // so server hydration and parent resets still reach the field.
    if (focusedRef.current) return;
    if (Number(text) !== value) {
      setText(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      // Empty / invalid → snap back to the last known good value.
      setText(String(value));
      return;
    }
    let next = parsed;
    if (integer) next = Math.round(next);
    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);
    setText(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        step={step}
        min={min}
        max={max}
        value={text}
        onFocus={(e) => {
          focusedRef.current = true;
          // Select-all on focus so the user can immediately overwrite the
          // current value — solves the "I want to type 2 but it shows 12"
          // confusion when the field already had a value like 10.
          e.currentTarget.select();
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          // Stream live changes only when the input parses to a number, so
          // the plan summary updates as you type but empty / "1." don't
          // clobber the parent state.
          const parsed = parseFloat(raw);
          if (Number.isFinite(parsed) && parsed !== value) {
            onChange(parsed);
          }
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          commit(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit(e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-500/50"
      />
      {suffix && <span className="text-zinc-500 text-sm">{suffix}</span>}
    </div>
  );
}

function RunningTrader({
  config,
  assetType,
  profile,
  liveSymbols,
  positions,
  account,
  serverTrades,
  serverTradesSummary,
  botStartedAt,
  onRequestUpgrade,
  upgradeBusy,
  onStop,
  onSwitchTrader,
  busy,
  onConfigChange,
}: {
  config: TraderConfig;
  assetType: AssetClass;
  profile?: TraderProfile;
  liveSymbols: SymbolInfo[];
  positions: Position[];
  account: Account | null;
  serverTrades: ClosedTrade[];
  serverTradesSummary: ClosedTradesSummary | null;
  botStartedAt?: string | null;
  onRequestUpgrade: () => void | Promise<void>;
  upgradeBusy: boolean;
  onStop: () => void | Promise<void>;
  onSwitchTrader: () => void | Promise<void>;
  busy: boolean;
  onConfigChange?: (next: TraderConfig) => void;
}) {
  // Live editor state for the in-flight settings card. Edits here flow up
  // through onConfigChange and are also fed into configRef (below) on the
  // next render, so the simulation loop picks them up immediately.
  const liveSettings = config;
  const updateLive = (patch: Partial<TraderConfig>) => {
    if (!onConfigChange) return;
    onConfigChange({ ...config, ...patch });
  };

  const [tab, setTab] = useState<'detail' | 'history'>('detail');

  // Only surface trades that occurred in the *current* bot session.
  // Filtering by botStartedAt means a freshly started trader always opens
  // with an empty trade table, not one pre-populated with old history.
  const sessionServerTrades = useMemo(() => {
    if (!botStartedAt) return serverTrades;
    const since = new Date(botStartedAt).getTime();
    return serverTrades.filter(
      (t) => t.filledAt && new Date(t.filledAt).getTime() >= since,
    );
  }, [serverTrades, botStartedAt]);

  // Restrict the symbol pool to the trader's asset class so a Stock agent
  // never opens crypto grids and vice versa. Fall back to all symbols only
  // if the filter would empty the pool entirely.
  const filteredSymbols = useMemo(
    () => liveSymbols.filter((s) => s.type === assetType),
    [liveSymbols, assetType]
  );
  const liveSymbolsRef = useRef(filteredSymbols.length > 0 ? filteredSymbols : liveSymbols);
  liveSymbolsRef.current = filteredSymbols.length > 0 ? filteredSymbols : liveSymbols;
  const configRef = useRef(config);
  configRef.current = config;

  const baseWallet = account?.cashBalance ?? 192.23;
  const baseWalletRef = useRef(baseWallet);
  baseWalletRef.current = baseWallet;

  const persistedRef = useRef<PersistedSession | null>(loadPersisted());

  const sessionStartRef = useRef<number>(persistedRef.current?.sessionStart ?? Date.now());

  const [grids, setGrids] = useState<GridConfig[]>(() => {
    const persisted = persistedRef.current;
    // Only reuse the persisted grid session if it actually matches the
    // currently selected asset class — otherwise the user could land on a
    // Crypto trader showing yesterday's stock grids.
    const persistedMatchesType = persisted?.grids?.length
      && persisted.grids.every((g) => g.type === assetType);
    if (persistedMatchesType) {
      const maxId = persisted!.gridIdCounter ?? 0;
      gridIdCounter = Math.max(gridIdCounter, maxId);
      return persisted!.grids;
    }
    const pool = filteredSymbols.length > 0 ? filteredSymbols : liveSymbols;
    const slots = Math.min(config.maxOpenPositions, pool.length);
    return pool.slice(0, slots).map((symbol, index) => buildGrid(symbol, index, Date.now(), config, baseWallet));
  });
  const [closedTrades, setClosedTrades] = useState<LocalClosedTrade[]>(
    () => persistedRef.current?.closedTrades ?? []
  );
  const [sessionRealized, setSessionRealized] = useState(
    () => persistedRef.current?.sessionRealized ?? 0
  );
  const [now, setNow] = useState(Date.now());
  const [emergencyHalted, setEmergencyHalted] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Keep open grids in sync with config for the fields the dashboard reads
  // straight off the grid object. The P&L math already pulls leverage / TP
  // / SL from the live configRef, but the per-grid detail panels (header
  // chip, ParamRow, margin/exposure stat) used to show the values the grid
  // was *opened* with — so after stop/resume with a new leverage or wallet
  // allocation the dashboard kept reading the old numbers even though the
  // math was correctly using the new ones. Patching the grid records here
  // keeps the visible numbers and the next-tick margin aligned with the
  // active configuration on every config edit and on every resume.
  useEffect(() => {
    setGrids((prev) => {
      if (prev.length === 0) return prev;

      const liveClose = config.takeProfitPercent / 100;
      const liveStop = -(config.emergencyStopPercent / 100);
      // Re-derive per-grid margin from the live wallet allocation so editing
      // either side (wallet_exposure_percent or max_open_positions) and
      // resuming actually changes how much capital each grid plays with.
      const walletBalance = account?.cashBalance ?? baseWalletRef.current;
      const slots = Math.max(config.maxOpenPositions, prev.length, 1);
      const exposurePerSlot = config.walletExposurePercent / slots;
      const liveMargin = clamp((walletBalance * exposurePerSlot) / 100, 1, Math.max(walletBalance, 1));

      let changed = false;
      const next = prev.map((g) => {
        if (
          g.leverage === config.leverage
          && g.closeThreshold === liveClose
          && g.stopThreshold === liveStop
          && Math.abs(g.exposurePercent - exposurePerSlot) < 1e-6
          && Math.abs(g.margin - liveMargin) < 1e-2
        ) {
          return g;
        }
        changed = true;
        return {
          ...g,
          leverage: config.leverage,
          closeThreshold: liveClose,
          stopThreshold: liveStop,
          exposurePercent: exposurePerSlot,
          margin: liveMargin,
        };
      });
      return changed ? next : prev;
    });
  }, [
    config.leverage,
    config.takeProfitPercent,
    config.emergencyStopPercent,
    config.walletExposurePercent,
    config.maxOpenPositions,
    account?.cashBalance,
  ]);

  // Selected grid is mirrored to the URL as ?symbol=PYPL so each grid has
  // a deep-linkable address (the dashboard URL identifies which trade the
  // user is looking at, can be bookmarked, shared, or refreshed without
  // losing context). The URL is the source of truth on mount; once mounted
  // we keep them in sync both ways.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSymbol = searchParams.get('symbol') ?? '';
  const [selectedSymbol, setSelectedSymbolState] = useState<string>(
    () => urlSymbol || persistedRef.current?.selectedSymbol || grids[0]?.symbol || ''
  );
  const setSelectedSymbol = (symbol: string) => {
    setSelectedSymbolState(symbol);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (symbol) next.set('symbol', symbol);
        else next.delete('symbol');
        return next;
      },
      { replace: true },
    );
  };
  // Pick up URL changes initiated outside this component (back/forward
  // navigation, paste-into-address-bar) as long as the symbol matches an
  // active grid for this trader.
  useEffect(() => {
    if (urlSymbol && urlSymbol !== selectedSymbol && grids.some((g) => g.symbol === urlSymbol)) {
      setSelectedSymbolState(urlSymbol);
    }
  }, [urlSymbol, grids, selectedSymbol]);
  const [ticks, setTicks] = useState<Record<string, GridTick>>({});
  const [liveMarketPrices, setLiveMarketPrices] = useState<Record<string, number>>({});
  const ticksRef = useRef<Record<string, GridTick>>({});
  ticksRef.current = ticks;
  const gridsRef = useRef(grids);
  gridsRef.current = grids;
  const sessionRealizedRef = useRef(sessionRealized);
  sessionRealizedRef.current = sessionRealized;
  const haltedRef = useRef(emergencyHalted);
  haltedRef.current = emergencyHalted;
  const liveMarketPricesRef = useRef<Record<string, number>>({});
  liveMarketPricesRef.current = liveMarketPrices;

  useEffect(() => {
    if (assetType !== 'crypto' || filteredSymbols.length === 0) {
      setLiveMarketPrices({});
      return;
    }

    const streams = filteredSymbols
      .map((symbol) => `${symbol.symbol.toLowerCase()}usdt@miniTicker`)
      .join('/');

    const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const stream = payload?.stream as string | undefined;
        const price = Number(payload?.data?.c ?? 0);
        const ticker = typeof stream === 'string' ? stream.split('@')[0]?.replace('usdt', '').toUpperCase() : null;

        if (!ticker || !Number.isFinite(price) || price <= 0) {
          return;
        }

        setLiveMarketPrices((current) => ({ ...current, [ticker]: price }));
      } catch {
        /* ignore malformed feed packets */
      }
    };

    return () => {
      socket.close();
    };
  }, [assetType, filteredSymbols]);

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
        const cfg = configRef.current;
        const halted = haltedRef.current;
        const nextTicks: Record<string, GridTick> = {};
        const closedThisRound: LocalClosedTrade[] = [];
        let realizedDelta = 0;

        const replacements: { index: number; grid: GridConfig }[] = [];

        for (let i = 0; i < currentGrids.length; i += 1) {
          const grid = currentGrids[i];
          const tick = tickGrid(
            grid,
            ticksRef.current[grid.id],
            nowMs,
            cfg.leverage,
            assetType === 'crypto' ? liveMarketPricesRef.current[grid.symbol] : undefined,
          );
          const pnlPct = grid.margin > 0 ? tick.unrealizedPnL / grid.margin : 0;

          const ageMs = Date.now() - grid.openedAt;
          const eligible = ageMs > 4000 && !halted;

          // Use the *live* take-profit / stop-loss from the active config so
          // edits to those thresholds while the trader is running affect open
          // grids on the very next tick — not just newly-opened ones.
          const liveCloseThreshold = cfg.takeProfitPercent / 100;
          const liveStopThreshold = -(cfg.emergencyStopPercent / 100);
          const hitTP = cfg.autoCloseEnabled && pnlPct >= liveCloseThreshold;
          const hitStop = pnlPct <= liveStopThreshold;

          if (eligible && (hitTP || hitStop)) {
            const outcome: 'win' | 'loss' = pnlPct >= 0 ? 'win' : 'loss';
            closedThisRound.push({
              id: grid.id,
              symbol: grid.symbol,
              pnl: tick.unrealizedPnL,
              outcome,
              closedAt: Date.now(),
            });
            realizedDelta += tick.unrealizedPnL;

            // Replace the closed grid with a fresh one — keep the rotation alive
            // so the trader continues compounding realized P&L into the wallet.
            const pool = liveSymbolsRef.current;
            const activeSymbols = new Set(currentGrids.map((g, idx) => (idx === i ? null : g.symbol)).filter(Boolean) as string[]);
            const candidates = pool.filter((entry) => !activeSymbols.has(entry.symbol));
            const fresh = (candidates.length > 0 ? candidates : pool)[Math.floor(Math.random() * (candidates.length || pool.length))];
            const newGrid = buildGrid(fresh, i, Date.now(), cfg, baseWalletRef.current + sessionRealizedRef.current + realizedDelta);
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
          setSessionRealized((prev) => {
            const next = prev + realizedDelta;
            // Emergency stop: halt trading once total session loss
            // exceeds the user-configured loss threshold of base wallet.
            const lossPct = baseWalletRef.current > 0 ? (next / baseWalletRef.current) * 100 : 0;
            if (lossPct <= -cfg.emergencyStopPercent && !haltedRef.current) {
              haltedRef.current = true;
              setEmergencyHalted(true);
            }
            return next;
          });
        }
      }
      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    savePersisted({
      sessionStart: sessionStartRef.current,
      grids,
      closedTrades,
      sessionRealized,
      selectedSymbol,
      gridIdCounter,
    });
  }, [grids, closedTrades, sessionRealized, selectedSymbol]);

  useEffect(() => {
    const handleUnload = () => {
      savePersisted({
        sessionStart: sessionStartRef.current,
        grids: gridsRef.current,
        closedTrades,
        sessionRealized,
        selectedSymbol,
        gridIdCounter,
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [closedTrades, sessionRealized, selectedSymbol]);

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

  // Wallet displayed here is the *server-canonical* cashBalance — same value
  // the Layout top-bar and Dashboard render. The local sessionRealized state
  // exists only to drive the simulated grid animations and must not bleed
  // into a balance display, otherwise the AI Trader would say $13,235 while
  // the rest of the app correctly says $13,000.
  const wallet = account?.cashBalance ?? 0;

  const totalMargin = enriched.reduce((sum, entry) => sum + entry.grid.margin, 0);
  const totalUnrealized = enriched.reduce((sum, entry) => sum + entry.unrealizedPnL, 0);
  const exposurePercent = wallet > 0 ? clamp((totalMargin / wallet) * 100, 0, 100) : 0;
  const activeCount = enriched.filter((entry) => entry.grid.active).length;

  // "Closed trades" must reflect real positions that hit TP or stop loss in
  // the ledger — not the local simulation's grid-close animations. Use the
  // *lifetime* serverTrades list (not the session-scoped one) so realized
  // P&L from individual trades accumulates across stop/resume cycles. The
  // header number then matches what the wallet has actually compounded.
  const realClosed = useMemo(
    () => serverTrades.filter((t) => t.assetType === assetType),
    [serverTrades, assetType]
  );
  // Realized P&L for the current trader is the sum of realized P&L on every
  // real closed trade for this asset class, across all sessions. This is
  // what the wallet has actually earned from the bot — not the simulated
  // jitter and not just the trades since the latest start button.
  const realRealizedPnl = useMemo(
    () => realClosed.reduce((sum, t) => sum + t.realizedPnl, 0),
    [realClosed]
  );
  const realizedPercent = baseWallet > 0 ? (realRealizedPnl / baseWallet) * 100 : 0;

  const wins = realClosed.filter((trade) => trade.realizedPnl > 0).length;
  const losses = realClosed.length - wins;
  const closedCount = realClosed.length;
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
    const nowMs = Date.now();
    const rangeStep = (selected.grid.basePrice * selected.grid.rangePercent) / 100 / Math.max(selected.grid.totalLevels, 1);

    return Array.from({ length: 8 }, (_, index) => {
      const buy = (seed + index) % 2 === 0;
      const offset = (index - 3) * rangeStep;
      return {
        id: `${selected.grid.symbol}-${index}`,
        time: new Date(nowMs - (index * 6 + (seed % 7)) * 60_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        side: (buy ? 'Buy' : 'Sell') as 'Buy' | 'Sell',
        price: selected.grid.basePrice + offset,
        size: clamp(0.4 + ((seed + index) % 6) * 0.18, 0.4, 1.6),
        pnl: ((seed + index * 3) % 9 - 3) * 0.018,
      };
    });
  }, [selected]);

  return (
    <div className="space-y-4">
      {/* Header — running state */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-1">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/25">
            <span className={`w-1.5 h-1.5 rounded-full ${emergencyHalted ? 'bg-rose-400' : 'bg-yellow-400 animate-pulse'}`} />
            <span className={`text-[10px] uppercase tracking-[0.22em] font-bold ${emergencyHalted ? 'text-rose-300' : 'text-yellow-300'}`}>
              {emergencyHalted ? 'Halted' : 'Live'}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] uppercase tracking-[0.22em] font-bold text-zinc-300">
            {assetType === 'stock' ? <LineChart size={10} className="text-yellow-300" /> : <Coins size={10} className="text-amber-300" />}
            {assetType === 'stock' ? 'Stock Trader' : 'Crypto Trader'}
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] uppercase tracking-[0.22em] font-bold text-zinc-300">
            Level {profile?.level ?? 1}
          </div>
          {profile?.pending_upgrade_request?.status === 'pending' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-[10px] uppercase tracking-[0.22em] font-bold text-yellow-300">
              Upgrade Pending
            </div>
          )}
          <div className="text-xs text-zinc-500">
            {config.leverage}x · TP +{config.takeProfitPercent}% · Stop -{config.emergencyStopPercent}% · Allocation {config.walletExposurePercent}% · Comm. {profile?.commission_percent ?? 20}%
            {!config.autoCloseEnabled && ' · Auto-close OFF'}
            {assetType === 'crypto' && ' · WebSocket feed'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void onRequestUpgrade()}
            disabled={upgradeBusy || profile?.pending_upgrade_request?.status === 'pending'}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 hover:border-yellow-500/40 hover:bg-yellow-500/10 text-zinc-300 hover:text-yellow-300 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <BadgePercent size={14} /> {profile?.pending_upgrade_request?.status === 'pending' ? 'Upgrade Requested' : `Request Lv ${(profile?.level ?? 1) + 1}`}
          </button>
          <button
            onClick={onSwitchTrader}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 hover:border-yellow-500/40 hover:bg-yellow-500/10 text-zinc-300 hover:text-yellow-300 text-xs font-bold transition-colors disabled:opacity-50"
            title="Stop and pick a different trader"
          >
            <ChevronLeft size={14} /> Switch trader
          </button>
          <button
            onClick={onStop}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 hover:border-rose-500/40 hover:bg-rose-500/10 text-zinc-300 hover:text-rose-300 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Square size={14} /> Stop &amp; Reconfigure
          </button>
        </div>
      </div>

      {/* Live settings — fields editable without stopping the bot. Changes
          take effect on the next tick (≤ 750ms). Slot count and wallet
          allocation are locked here because they're baked into the grid
          layout — use Stop & Reconfigure to change them. */}
      {onConfigChange && (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-yellow-400" />
              <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-zinc-200">Live Settings</p>
              <span className="text-[10px] text-zinc-500">applies on next tick</span>
            </div>
            <span className="text-[10px] text-zinc-500 hidden sm:inline">
              Locked while running: <span className="text-zinc-400">Max Positions, Wallet Allocation</span>
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5"><Zap size={11} className="text-yellow-400" /> Leverage</span>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={liveSettings.leverage}
                  onChange={(e) => updateLive({ leverage: clamp(parseInt(e.target.value || '1', 10), 1, 100) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-yellow-500/50"
                />
                <span className="text-zinc-500 text-xs">x</span>
              </div>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5"><TrendingUp size={11} className="text-yellow-400" /> Take Profit</span>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  min={0.1}
                  max={50}
                  step={0.1}
                  value={liveSettings.takeProfitPercent}
                  onChange={(e) => updateLive({ takeProfitPercent: clamp(parseFloat(e.target.value || '0'), 0.1, 50) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-yellow-500/50"
                />
                <span className="text-zinc-500 text-xs">%</span>
              </div>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5"><ShieldAlert size={11} className="text-yellow-400" /> Stop Loss</span>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  min={0.1}
                  max={50}
                  step={0.1}
                  value={liveSettings.emergencyStopPercent}
                  onChange={(e) => updateLive({ emergencyStopPercent: clamp(parseFloat(e.target.value || '0'), 0.1, 50) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-yellow-500/50"
                />
                <span className="text-zinc-500 text-xs">%</span>
              </div>
            </label>
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Auto-Close</p>
                <p className="text-[10px] text-zinc-500">TP/SL fires automatically</p>
              </div>
              <button
                type="button"
                onClick={() => updateLive({ autoCloseEnabled: !liveSettings.autoCloseEnabled })}
                className={`w-10 h-6 rounded-full transition-all flex-shrink-0 ${liveSettings.autoCloseEnabled ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                aria-pressed={liveSettings.autoCloseEnabled}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${liveSettings.autoCloseEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {emergencyHalted && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200 leading-relaxed">
            <span className="font-bold">Stop loss triggered.</span> Session loss exceeded {config.emergencyStopPercent}% of wallet —
            new fills paused. Open positions will not auto-rotate until you reconfigure.
          </div>
        </div>
      )}

      <div className="bg-[#0A0A0B] border border-zinc-800/50 rounded-3xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
          <aside className="border-b lg:border-b-0 lg:border-r border-zinc-800/60 flex flex-col">
            <div className="p-5 border-b border-zinc-800/60">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold mb-4">Trading Stats</p>

              {/* Stacked layout: each value gets the full aside width so big
                  balances (e.g. $1,234,567.89) and signed P&L numbers no
                  longer collide with the next column. */}
              <div className="space-y-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Wallet</p>
                  <p
                    className="mt-1 text-2xl font-mono text-white whitespace-nowrap leading-tight truncate"
                    title={formatMoney(wallet)}
                  >
                    {formatMoneyAdaptive(wallet)}
                  </p>
                  <p className="mt-1 text-[10px] text-yellow-300/80 font-bold">{exposurePercent.toFixed(1)}% allocated</p>
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">PNL (Realized)</p>
                  <p
                    className={`mt-1 text-2xl font-mono whitespace-nowrap leading-tight truncate ${realRealizedPnl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}
                    title={formatSignedMoney(realRealizedPnl, 2)}
                  >
                    {formatSignedMoneyAdaptive(realRealizedPnl)}
                  </p>
                  <p className={`mt-1 text-[10px] font-bold ${realRealizedPnl >= 0 ? 'text-yellow-400/80' : 'text-rose-400/80'}`}>
                    {realizedPercent >= 0 ? '+' : ''}{realizedPercent.toFixed(2)}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-2 py-1.5 min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-yellow-400/80 font-bold">Realized</p>
                    <p
                      className="text-xs font-mono text-yellow-300 truncate"
                      title={formatSignedMoney(realRealizedPnl, 2)}
                    >
                      {formatSignedMoneyAdaptive(realRealizedPnl)}
                    </p>
                  </div>
                  <div className="rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-1.5 min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-rose-400/80 font-bold">Unrealized</p>
                    <p
                      className="text-xs font-mono text-rose-300 truncate"
                      title={formatSignedMoney(totalUnrealized, 2)}
                    >
                      {formatSignedMoneyAdaptive(totalUnrealized)}
                    </p>
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
                  <p className="mt-1 text-[10px] text-yellow-400/80 font-bold">{winRate}% win</p>
                </div>
              </div>
            </div>

            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold">Active Grids</p>
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-yellow-500/15 text-yellow-300 text-[10px] font-bold border border-yellow-500/25">
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
                      <span className={`font-mono text-xs ${positive ? 'text-yellow-400' : 'text-rose-400'}`}>
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
                      <span className="text-zinc-500">R: <span className={entry.realizedPnL >= 0 ? 'text-yellow-400' : 'text-rose-400'}>{formatSignedMoney(entry.realizedPnL, 4)}</span></span>
                      <span className="text-zinc-500">U: <span className={pnl >= 0 ? 'text-yellow-400' : 'text-rose-400'}>{formatSignedMoney(pnl, 4)}</span></span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex flex-col">
            <div className="border-b border-zinc-800/60 px-6 pt-5">
              <div className="flex items-center gap-6">
                {([
                  { value: 'detail', label: 'Detail' },
                  { value: 'history', label: 'Order History' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    className={`pb-3 text-[11px] uppercase tracking-[0.22em] font-bold border-b-2 transition-colors whitespace-nowrap ${
                      tab === value
                        ? 'text-white border-yellow-400'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    {label}
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

          <div className="border-t border-zinc-800/60 col-span-1 lg:col-span-2">
            {/* Use the lifetime serverTrades feed so the list matches the
                headline "Closed" count above it. Filtering by botStartedAt
                meant a freshly resumed session showed "No closed trades yet"
                even when the stat panel claimed 36 closed trades — auto-closes
                from previous sessions were silently hidden. */}
            <ClosedTradesSection trades={serverTrades} summary={serverTradesSummary} assetType={assetType} />
          </div>
        </div>
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
  const realizedPercent = grid.margin > 0 ? (selected.realizedPnL / grid.margin) * 100 : 0;
  const unrealizedPercent = grid.margin > 0 ? (selected.unrealizedPnL / grid.margin) * 100 : 0;
  const positive = totalPnL >= 0;
  const priceChange = selected.price - grid.basePrice;
  const priceChangePct = grid.basePrice > 0 ? (priceChange / grid.basePrice) * 100 : 0;
  const priceUp = priceChange >= 0;
  const holding = positions.find((position) => position.symbol === grid.symbol);

  return (
    <div className="p-6 space-y-5 overflow-y-auto">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
          <Minus className="text-zinc-500" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{grid.symbol}</h2>
            <span
              className="text-base sm:text-lg font-mono text-zinc-300 whitespace-nowrap"
              title={`Live market price: $${selected.price.toFixed(4)}`}
            >
              ${formatPrice(selected.price)}
            </span>
            <span className={`text-xs font-bold font-mono ${priceUp ? 'text-yellow-400' : 'text-rose-400'}`}>
              {priceUp ? '+' : ''}{priceChangePct.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500 mt-1.5 flex-wrap">
            <span className="whitespace-nowrap">{grid.symbol}/USDT</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${grid.active ? 'bg-yellow-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className={`text-[11px] uppercase tracking-wider font-bold ${grid.active ? 'text-yellow-400' : 'text-zinc-500'}`}>
                {grid.active ? 'Active' : 'Paused'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] uppercase tracking-wider font-bold text-zinc-300 whitespace-nowrap">
              <Zap size={10} className="text-yellow-400" /> {grid.leverage}x
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] uppercase tracking-wider font-bold text-zinc-300 whitespace-nowrap">
              Entry ${formatPrice(grid.basePrice)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] uppercase tracking-wider font-bold text-zinc-300 whitespace-nowrap">
              Margin {formatMoney(grid.margin)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-4 sm:px-6 py-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold mb-2">Unrealized PNL</p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p
            className={`font-mono leading-tight whitespace-nowrap truncate max-w-full ${positive ? 'text-yellow-400' : 'text-rose-400'}`}
            style={{ fontSize: 'clamp(1.875rem, 9vw, 3rem)' }}
            title={formatSignedMoney(totalPnL, 4)}
          >
            {formatSignedMoney(totalPnL, 4)}
          </p>
          <p className={`text-xs sm:text-sm font-bold ${positive ? 'text-yellow-400/80' : 'text-rose-400/80'}`}>
            {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs">
          <span className="text-zinc-500">
            Realized:{' '}
            <span className={`font-mono ${selected.realizedPnL >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
              {formatSignedMoney(selected.realizedPnL, 4)}
            </span>
            <span className={`ml-1 font-mono text-[10px] sm:text-[11px] ${selected.realizedPnL >= 0 ? 'text-yellow-400/70' : 'text-rose-400/70'}`}>
              ({realizedPercent >= 0 ? '+' : ''}{realizedPercent.toFixed(2)}%)
            </span>
          </span>
          <span className="text-zinc-500">
            Unrealized:{' '}
            <span className={`font-mono ${selected.unrealizedPnL >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
              {formatSignedMoney(selected.unrealizedPnL, 4)}
            </span>
            <span className={`ml-1 font-mono text-[10px] sm:text-[11px] ${selected.unrealizedPnL >= 0 ? 'text-yellow-400/70' : 'text-rose-400/70'}`}>
              ({unrealizedPercent >= 0 ? '+' : ''}{unrealizedPercent.toFixed(2)}%)
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-6 py-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold">Wallet Allocation</p>
          <p className="text-yellow-400 font-mono text-sm">{grid.exposurePercent.toFixed(1)}%</p>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-[width] duration-700"
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
          <ParamRow label="Wallet Allocation" value={`${grid.exposurePercent.toFixed(1)}%`} valueClassName="text-yellow-400" />
          <ParamRow label="Take Profit" value={`+${(grid.closeThreshold * 100).toFixed(2)}%`} valueClassName="text-yellow-400" />
          <ParamRow label="Stop Loss" value={`${(grid.stopThreshold * 100).toFixed(2)}%`} valueClassName="text-rose-400" />
          <ParamRow label="Grid Levels" value={grid.totalLevels.toString()} />
          <ParamRow label="Fills" value={selected.filledLevels.toString()} />
          <ParamRow label="Current Price" value={`$${formatPrice(selected.price)}`} valueClassName={selected.changePercent >= 0 ? 'text-yellow-400' : 'text-rose-400'} />
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
              <span className={`font-bold ${row.side === 'Buy' ? 'text-yellow-400' : 'text-rose-400'}`}>{row.side}</span>
              <span className="text-right text-white">${formatPrice(row.price)}</span>
              <span className="text-right text-zinc-300">{row.size.toFixed(2)}</span>
              <span className={`text-right ${row.pnl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>{formatSignedMoney(row.pnl, 4)}</span>
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

function ClosedTradesSection({ trades, summary, assetType }: { trades: ClosedTrade[]; summary: ClosedTradesSummary | null; assetType?: AssetClass }) {
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'manual'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'pnl_percent'>('date');
  const [showAll, setShowAll] = useState(false);

  // When the section is rendered inside a running trader view, narrow the
  // ledger to that asset class and recompute the summary cards from the
  // filtered set so the user sees stats relevant to *this* trader only.
  const scopedTrades = useMemo(
    () => assetType ? trades.filter((t) => t.assetType === assetType) : trades,
    [trades, assetType]
  );

  const stats = useMemo(() => {
    if (!assetType) {
      return summary ?? {
        totalTrades: 0,
        totalRealizedPnl: 0,
        avgPnlPercent: 0,
        autoClosedCount: 0,
        manualClosedCount: 0,
      };
    }
    const total = scopedTrades.length;
    const realized = scopedTrades.reduce((sum, t) => sum + t.realizedPnl, 0);
    const avgPnlPct = total > 0
      ? scopedTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / total
      : 0;
    const auto = scopedTrades.filter((t) => t.autoClosed).length;
    return {
      totalTrades: total,
      totalRealizedPnl: Number(realized.toFixed(2)),
      avgPnlPercent: Number(avgPnlPct.toFixed(2)),
      autoClosedCount: auto,
      manualClosedCount: total - auto,
    };
  }, [assetType, scopedTrades, summary]);

  const filteredTrades = useMemo(() => {
    let result = [...scopedTrades];

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
  }, [scopedTrades, filterType, sortBy]);

  const displayTrades = showAll ? filteredTrades : filteredTrades.slice(0, 5);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-white">History</h3>
          <p className="text-xs text-zinc-500">Closed positions — newest first.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['all', 'auto', 'manual'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setFilterType(option)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                  filterType === option
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {option === 'all' ? 'All' : option === 'auto' ? 'Auto' : 'Manual'}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'pnl' | 'pnl_percent')}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-400 focus:outline-none"
          >
            <option value="date">Date</option>
            <option value="pnl">P&L $</option>
            <option value="pnl_percent">P&L %</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Total Trades</p>
          <p className="mt-1 text-lg font-mono font-bold text-white">{stats.totalTrades}</p>
        </div>
        <div className={`rounded-xl border bg-zinc-900/30 px-3 py-2 ${stats.totalRealizedPnl >= 0 ? 'border-yellow-500/20' : 'border-rose-500/20'}`}>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Realized P&L</p>
          <p className={`mt-1 text-lg font-mono font-bold ${stats.totalRealizedPnl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
            {formatSigned(stats.totalRealizedPnl)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Avg Return</p>
          <p className={`mt-1 text-lg font-mono font-bold ${stats.avgPnlPercent >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
            {stats.avgPnlPercent >= 0 ? '+' : ''}{stats.avgPnlPercent.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Auto / Manual</p>
          <p className="mt-1 text-lg font-mono font-bold text-white">{stats.autoClosedCount} / {stats.manualClosedCount}</p>
        </div>
      </div>

      <div className="space-y-2">
        {displayTrades.map((trade) => (
          <div
            key={trade.id}
            className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-3 hover:bg-zinc-900/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.realizedPnl >= 0 ? 'bg-yellow-500/10' : 'bg-rose-500/10'}`}>
                  {trade.realizedPnl >= 0 ? (
                    <ArrowUpRight size={14} className="text-yellow-400" />
                  ) : (
                    <ArrowDownRight size={14} className="text-rose-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{trade.symbol}</span>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{trade.assetType}</span>
                    {trade.autoClosed && (
                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                        <Bot size={9} />
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-1">
                    <span>Entry: <span className="text-zinc-300 font-mono">${trade.entryPrice.toFixed(2)}</span></span>
                    <span>Exit: <span className="text-zinc-300 font-mono">${trade.exitPrice.toFixed(2)}</span></span>
                    <span>Qty: <span className="text-zinc-300 font-mono">{trade.quantity}</span></span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className={`text-sm font-mono font-bold ${trade.realizedPnl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                  {formatSigned(trade.realizedPnl)}
                </p>
                <p className={`text-[10px] font-bold ${trade.pnlPercent >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                  {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                </p>
                <p className="text-[9px] text-zinc-500 mt-0.5">
                  {formatDate(trade.filledAt)} {formatTime(trade.filledAt)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {filteredTrades.length === 0 && (
          <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500 text-sm">
            No closed trades yet.
          </div>
        )}

        {filteredTrades.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors border border-zinc-800 rounded-xl hover:border-zinc-700"
          >
            {showAll ? `Show less (${filteredTrades.length} total)` : `Show all ${filteredTrades.length} trades`}
          </button>
        )}
      </div>
    </div>
  );
}
