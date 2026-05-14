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
  currentPriceSource?: 'market' | 'admin_override' | 'entry_price';
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
  quotedAt?: string;
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

export interface UserPreferences {
  bot_running: boolean;
  bot_asset_type?: AssetType | null;
  bot_started_at?: string | null;
  bot_stopped_at?: string | null;
  take_profit_percent?: number;
  wallet_exposure_percent?: number;
  emergency_stop_percent?: number;
  max_open_positions?: number;
  auto_close_enabled?: boolean;
  commission_percent?: number;
}

export interface TraderUpgradeRequest {
  id: number;
  user_id: number;
  asset_type: AssetType;
  requested_level: number;
  status: 'pending' | 'approved' | 'rejected';
  note?: string | null;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_name?: string | null;
  user_email?: string | null;
}

export interface TraderProfile {
  id: number;
  asset_type: AssetType;
  title: string;
  description: string;
  commission_percent: number;
  level: number;
  pending_upgrade_request?: TraderUpgradeRequest | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  pnlPercent: number;
  autoClosed: boolean;
  source: OrderSource;
  filledAt: string;
}

export interface ClosedTradesSummary {
  totalTrades: number;
  totalRealizedPnl: number;
  avgPnlPercent: number;
  autoClosedCount: number;
  manualClosedCount: number;
}

export interface PaymentMethod {
  id: number;
  name: string;
  network?: string | null;
  address: string;
  instructions?: string | null;
  is_active?: boolean;
}

export interface AdminStats {
  users_count: number;
  admins_count: number;
  active_users_count: number;
  pending_deposit_requests_count: number;
  approved_deposit_requests_count: number;
  payment_methods_count: number;
  active_payment_methods_count: number;
  deposit_transactions_total: number;
  withdrawal_transactions_total: number;
  ai_trades_count: number;
  all_trades_count: number;
}

export interface AdminUserRow {
  user: {
    id: number;
    name: string;
    email: string;
    status: string;
    is_admin: boolean;
    created_at?: string;
  };
  account: {
    cash_balance: number;
    total_deposits: number;
    total_withdrawals: number;
  };
}

export interface AdminTransaction {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  type: 'deposit' | 'withdrawal';
  amount: number;
  signed_amount: number;
  description: string;
  cash_balance?: number | null;
  source?: string | null;
  editable: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DepositRequestRow {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  payment_method_id?: number | null;
  payment_method_name: string;
  wallet_network?: string | null;
  wallet_address: string;
  amount: number;
  transaction_reference?: string | null;
  notes?: string | null;
  proof_original_name: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
}

export interface AdminTrade {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  symbol?: string | null;
  symbol_name?: string | null;
  asset_type: AssetType;
  quantity: number;
  average_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  pnl_percent: number;
  bot_running: boolean;
  price_source: 'market' | 'admin_override' | 'entry_price';
  updated_at?: string | null;
  admin_price_overridden_at?: string | null;
}
