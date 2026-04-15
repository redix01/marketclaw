import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  Account, 
  Position, 
  Order, 
  LedgerEvent, 
  Agent, 
  AgentLog 
} from '../types';

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
        updatedAt: new Date().toISOString()
      });
      setPositions([
        { id: 'g_1', uid: 'guest-user', symbol: 'AAPL', quantity: 10, averageEntryPrice: 150, assetType: 'stock', updatedAt: new Date().toISOString() },
        { id: 'g_2', uid: 'guest-user', symbol: 'BTC', quantity: 0.5, averageEntryPrice: 45000, assetType: 'crypto', updatedAt: new Date().toISOString() }
      ]);
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
          createdAt: new Date().toISOString()
        }
      ]);
      setLoading(false);
      return;
    }

    // Listen to Account
    const unsubAccount = onSnapshot(doc(db, 'accounts', uid), (doc) => {
      if (doc.exists()) setAccount(doc.data() as Account);
    });

    // Listen to Positions
    const qPositions = query(collection(db, 'positions'), where('uid', '==', uid));
    const unsubPositions = onSnapshot(qPositions, (snap) => {
      setPositions(snap.docs.map(d => d.data() as Position));
    });

    // Listen to Orders
    const qOrders = query(collection(db, 'orders'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(d => d.data() as Order));
    });

    // Listen to Ledger
    const qLedger = query(collection(db, 'ledger'), where('uid', '==', uid), orderBy('timestamp', 'desc'));
    const unsubLedger = onSnapshot(qLedger, (snap) => {
      setLedger(snap.docs.map(d => d.data() as LedgerEvent));
    });

    // Listen to Agents
    const qAgents = query(collection(db, 'agents'), where('uid', '==', uid));
    const unsubAgents = onSnapshot(qAgents, (snap) => {
      setAgents(snap.docs.map(d => d.data() as Agent));
    });

    // Listen to Logs
    const qLogs = query(collection(db, 'agentLogs'), where('uid', '==', uid), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => d.data() as AgentLog));
    });

    setLoading(false);

    return () => {
      unsubAccount();
      unsubPositions();
      unsubOrders();
      unsubLedger();
      unsubAgents();
      unsubLogs();
    };
  }, [user]);

  return { account, positions, orders, ledger, agents, logs, loading };
}
