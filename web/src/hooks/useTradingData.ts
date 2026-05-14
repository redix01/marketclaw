import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { tradingService } from '../services/tradingService';
import { MOCK_SYMBOLS } from '../constants';
import { Account, Agent, AgentLog, ClosedTrade, ClosedTradesSummary, DashboardSnapshot, LedgerEvent, Order, Position, SymbolInfo, UserPreferences } from '../types';

function mapAccount(account: any): Account {
  return {
    uid: String(account.user_id),
    cashBalance: account.cash_balance,
    totalDeposits: account.total_deposits,
    totalWithdrawals: account.total_withdrawals,
    updatedAt: account.updated_at,
  };
}

function mapPosition(position: any): Position {
  return {
    id: String(position.id),
    uid: '',
    symbol: position.symbol,
    assetType: position.asset_type,
    quantity: position.quantity,
    averageEntryPrice: position.average_entry_price,
    currentPrice: position.current_price,
    marketValue: position.market_value,
    unrealizedPL: position.unrealized_pl,
    updatedAt: position.updated_at,
  };
}

function mapOrder(order: any): Order {
  return {
    id: String(order.id),
    uid: '',
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    orderType: order.order_type,
    status: order.status,
    source: order.source,
    agentId: order.agent_id ? String(order.agent_id) : undefined,
    createdAt: order.created_at || order.submitted_at,
    filledAt: order.filled_at || undefined,
    fillPrice: order.fill_price ?? undefined,
  };
}

function mapLedger(entry: any): LedgerEvent {
  return {
    id: String(entry.id),
    uid: '',
    type: entry.type,
    amount: entry.amount,
    description: entry.description,
    timestamp: entry.created_at,
    referenceId: entry.reference_id ? String(entry.reference_id) : undefined,
  };
}

function mapDashboard(snapshot: any): DashboardSnapshot {
  return {
    summary: {
      holdingsValue: snapshot.summary.holdings_value,
      totalEquity: snapshot.summary.total_equity,
      unrealizedPL: snapshot.summary.unrealized_pl,
      openPositionsCount: snapshot.summary.open_positions_count,
      recentOrdersCount: snapshot.summary.recent_orders_count,
    },
    equityCurve: (snapshot.equity_curve ?? []).map((point: any) => ({
      label: point.label,
      value: point.value,
      timestamp: point.timestamp,
    })),
    assetAllocation: (snapshot.asset_allocation ?? []).map((point: any) => ({
      name: point.name,
      value: point.value,
      color: point.color,
    })),
  };
}

function mapSymbols(symbols: any[]): SymbolInfo[] {
  return symbols.map((symbol: any) => ({
    symbol: symbol.symbol,
    name: symbol.name,
    price: symbol.price ?? 0,
    change: symbol.change ?? 0,
    changePercent: symbol.changePercent ?? 0,
    type: symbol.type,
    quotedAt: symbol.quotedAt ?? undefined,
  }));
}

export function useTradingData(user: any) {
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [symbols, setSymbols] = useState(MOCK_SYMBOLS);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [closedTradesSummary, setClosedTradesSummary] = useState<ClosedTradesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const uid = user.uid;

    if (uid === 'guest-user') {
      setAccount({
        uid: 'guest-user',
        cashBalance: 25000,
        totalDeposits: 25000,
        totalWithdrawals: 0,
        updatedAt: new Date().toISOString(),
      });
      setPositions([
        { id: 'g_1', uid: 'guest-user', symbol: 'AAPL', quantity: 10, averageEntryPrice: 150, assetType: 'stock', updatedAt: new Date().toISOString() },
        { id: 'g_2', uid: 'guest-user', symbol: 'BTC', quantity: 0.5, averageEntryPrice: 45000, assetType: 'crypto', updatedAt: new Date().toISOString() },
      ]);
      setOrders([]);
      setLedger([]);
      setSymbols(MOCK_SYMBOLS);
      setDashboard({
        summary: {
          holdingsValue: 24000,
          totalEquity: 49000,
          unrealizedPL: 3500,
          openPositionsCount: 2,
          recentOrdersCount: 0,
        },
        equityCurve: [
          { label: 'Mon', value: 42000, timestamp: new Date().toISOString() },
          { label: 'Tue', value: 43800, timestamp: new Date().toISOString() },
          { label: 'Wed', value: 45100, timestamp: new Date().toISOString() },
          { label: 'Thu', value: 46900, timestamp: new Date().toISOString() },
          { label: 'Fri', value: 49000, timestamp: new Date().toISOString() },
        ],
        assetAllocation: [
          { name: 'Cash', value: 25000, color: '#10b981' },
          { name: 'Stock', value: 1859.2, color: '#3b82f6' },
          { name: 'Crypto', value: 34216.06, color: '#f59e0b' },
        ],
      });
      setPreferences({
        bot_running: true,
        bot_asset_type: 'stock',
      });
      setAgents([
        {
          id: 'g_bot_1',
          uid: 'guest-user',
          name: 'Demo Momentum Bot',
          template: 'aggressive_momentum',
          status: 'running',
          symbols: ['AAPL', 'TSLA', 'BTC'],
          maxAllocation: 20,
          maxPositionSize: 5000,
          tickFrequency: '1h',
          createdAt: new Date().toISOString(),
        },
      ]);
      setLogs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const [dashboardResponse, accountResponse, positionsResponse, ordersResponse, ledgerResponse, symbolsResponse, closedTradesResponse, preferencesResponse] = await Promise.all([
          apiFetch<{ data: any }>(`/users/${uid}/dashboard`),
          apiFetch<{ data: any }>(`/users/${uid}/account`),
          apiFetch<{ data: any[] }>(`/users/${uid}/positions`),
          apiFetch<{ data: any[] }>(`/users/${uid}/orders`),
          apiFetch<{ data: any[] }>(`/users/${uid}/ledger`),
          tradingService.refreshSymbols(),
          apiFetch<{ data: any[]; summary: any }>(`/users/${uid}/closed-trades`),
          tradingService.getPreferences(uid),
        ]);

        if (cancelled) return;

        setDashboard(mapDashboard(dashboardResponse.data));
        setAccount(mapAccount(accountResponse.data));
        setPositions(positionsResponse.data.map(mapPosition));
        setOrders(ordersResponse.data.map(mapOrder));
        setLedger(ledgerResponse.data.map(mapLedger));
        setPreferences(preferencesResponse ? {
          bot_running: !!preferencesResponse.bot_running,
          bot_asset_type: preferencesResponse.bot_asset_type === 'stock' || preferencesResponse.bot_asset_type === 'crypto'
            ? preferencesResponse.bot_asset_type
            : null,
          bot_started_at: preferencesResponse.bot_started_at ?? null,
          bot_stopped_at: preferencesResponse.bot_stopped_at ?? null,
          take_profit_percent: preferencesResponse.take_profit_percent ?? undefined,
          wallet_exposure_percent: preferencesResponse.wallet_exposure_percent ?? undefined,
          emergency_stop_percent: preferencesResponse.emergency_stop_percent ?? undefined,
          max_open_positions: preferencesResponse.max_open_positions ?? undefined,
          auto_close_enabled: preferencesResponse.auto_close_enabled ?? undefined,
          commission_percent: preferencesResponse.commission_percent ?? undefined,
        } : null);
        setSymbols(mapSymbols(symbolsResponse));
        setAgents([]);
        setLogs([]);
        setClosedTrades(closedTradesResponse.data.map((trade: any) => ({
          id: String(trade.id),
          symbol: trade.symbol,
          assetType: trade.asset_type,
          quantity: parseFloat(trade.quantity),
          entryPrice: parseFloat(trade.entry_price),
          exitPrice: parseFloat(trade.exit_price),
          realizedPnl: parseFloat(trade.realized_pnl),
          pnlPercent: parseFloat(trade.pnl_percent),
          autoClosed: trade.auto_closed === true || trade.auto_closed === 'true' || trade.auto_closed === 1,
          source: trade.source,
          filledAt: trade.filled_at,
        })));
        setClosedTradesSummary(closedTradesResponse.summary ? {
          totalTrades: Number(closedTradesResponse.summary.total_trades ?? 0),
          totalRealizedPnl: Number(closedTradesResponse.summary.total_realized_pnl ?? 0),
          avgPnlPercent: Number(closedTradesResponse.summary.avg_pnl_percent ?? 0),
          autoClosedCount: Number(closedTradesResponse.summary.auto_closed_count ?? 0),
          manualClosedCount: Number(closedTradesResponse.summary.manual_closed_count ?? 0),
        } : null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    // Poll every 8s while the tab is foregrounded. /dashboard is what triggers
    // AutoCloseProfitablePositions on the backend, so a tighter cadence here
    // means a bot close → wallet credit → UI update round-trip lands within
    // ~10s instead of the previous ~30s window.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    }, 8000);

    const handleRefresh = () => {
      void load();
    };

    window.addEventListener('marketclaw:data-changed', handleRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('marketclaw:data-changed', handleRefresh);
    };
  }, [user]);

  return { account, positions, orders, ledger, dashboard, preferences, agents, logs, symbols, closedTrades, closedTradesSummary, loading };
}
