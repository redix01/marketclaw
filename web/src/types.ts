export type AssetType = 'stock' | 'crypto';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type OrderSource = 'manual' | 'bot';
export type AgentStatus = 'running' | 'stopped' | 'paused' | 'blocked';
export type LedgerEventType = 'deposit' | 'withdrawal' | 'trade_buy' | 'trade_sell' | 'adjustment';
export type AgentLogEventType = 'tick' | 'decision' | 'risk_block' | 'order_submitted' | 'error';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface Account {
  uid: string;
  cashBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  updatedAt: string;
}

export interface Position {
  id: string; // uid_symbol
  uid: string;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  averageEntryPrice: number;
  currentPrice?: number;
  marketValue?: number;
  unrealizedPL?: number;
  updatedAt: string;
}

export interface Order {
  id: string;
  uid: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: 'market';
  status: OrderStatus;
  source: OrderSource;
  agentId?: string;
  createdAt: string;
  filledAt?: string;
  fillPrice?: number;
}

export interface LedgerEvent {
  id: string;
  uid: string;
  type: LedgerEventType;
  amount: number;
  description: string;
  timestamp: string;
  referenceId?: string;
}

export interface Agent {
  id: string;
  uid: string;
  name: string;
  template: string;
  symbols: string[];
  status: AgentStatus;
  maxAllocation: number;
  maxPositionSize: number;
  tickFrequency: string;
  createdAt: string;
  lastTickAt?: string;
}

export interface AgentLog {
  id: string;
  agentId: string;
  uid: string;
  timestamp: string;
  eventType: AgentLogEventType;
  symbol?: string;
  summary: string;
  details?: any;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: AssetType;
}

export interface EquityPoint {
  label: string;
  value: number;
  timestamp: string;
}

export interface AllocationPoint {
  name: string;
  value: number;
  color: string;
}

export interface DashboardSummary {
  holdingsValue: number;
  totalEquity: number;
  unrealizedPL: number;
  openPositionsCount: number;
  recentOrdersCount: number;
}

export interface DashboardSnapshot {
  summary: DashboardSummary;
  equityCurve: EquityPoint[];
  assetAllocation: AllocationPoint[];
}
