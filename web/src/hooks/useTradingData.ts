import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { Account, Agent, AgentLog, LedgerEvent, Order, Position } from '../types';

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

export function useTradingData(user: any) {
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
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
        const [accountResponse, positionsResponse, ordersResponse, ledgerResponse] = await Promise.all([
          apiFetch<{ data: any }>(`/users/${uid}/account`),
          apiFetch<{ data: any[] }>(`/users/${uid}/positions`),
          apiFetch<{ data: any[] }>(`/users/${uid}/orders`),
          apiFetch<{ data: any[] }>(`/users/${uid}/ledger`),
        ]);

        if (cancelled) return;

        setAccount(mapAccount(accountResponse.data));
        setPositions(positionsResponse.data.map(mapPosition));
        setOrders(ordersResponse.data.map(mapOrder));
        setLedger(ledgerResponse.data.map(mapLedger));
        setAgents([]);
        setLogs([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    const handleRefresh = () => {
      void load();
    };

    window.addEventListener('marketclaw:data-changed', handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('marketclaw:data-changed', handleRefresh);
    };
  }, [user]);

  return { account, positions, orders, ledger, agents, logs, loading };
}
