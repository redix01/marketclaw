import { MOCK_SYMBOLS } from '../constants';
import { Account, Agent, AssetType, OrderSide, Position } from '../types';
import { apiFetch, emitTradingDataChanged } from './api';

type SymbolRecord = {
  id: number;
  symbol: string;
  name: string;
  type: AssetType;
  price: number | null;
  change: number;
  changePercent: number;
};

let cachedSymbols: SymbolRecord[] | null = null;

async function getSymbols() {
  if (cachedSymbols) {
    return cachedSymbols;
  }

  try {
    const response = await apiFetch<{ data: SymbolRecord[] }>('/markets/symbols');
    cachedSymbols = response.data;
    return cachedSymbols;
  } catch {
    cachedSymbols = MOCK_SYMBOLS.map((symbol, index) => ({
      id: index + 1,
      symbol: symbol.symbol,
      name: symbol.name,
      type: symbol.type,
      price: symbol.price,
      change: symbol.change,
      changePercent: symbol.changePercent,
    }));

    return cachedSymbols;
  }
}

export const tradingService = {
  async checkGuest(uid: string) {
    if (uid === 'guest-user') {
      throw new Error('Action not allowed in Demo Mode. Please sign in to save your data.');
    }
  },

  async getSymbols() {
    return getSymbols();
  },

  async getAccount(uid: string): Promise<Account | null> {
    if (uid === 'guest-user') {
      return {
        uid: 'guest-user',
        cashBalance: 25000,
        totalDeposits: 25000,
        totalWithdrawals: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    const response = await apiFetch<{ data: any }>(`/users/${uid}/account`);

    return {
      uid: String(response.data.user_id),
      cashBalance: response.data.cash_balance,
      totalDeposits: response.data.total_deposits,
      totalWithdrawals: response.data.total_withdrawals,
      updatedAt: response.data.updated_at,
    };
  },

  async tickAgent(_agent: Agent, _positions: Position[]) {
    throw new Error('Agent execution is not connected to the Laravel API yet.');
  },

  async createAccount(_uid: string, _initialCash = 10000) {
    return;
  },

  async depositFunds(uid: string, amount: number) {
    await this.checkGuest(uid);

    await apiFetch(`/users/${uid}/account/deposits`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });

    emitTradingDataChanged();
  },

  async withdrawFunds(uid: string, amount: number) {
    await this.checkGuest(uid);

    await apiFetch(`/users/${uid}/account/withdrawals`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });

    emitTradingDataChanged();
  },

  async placeOrder(uid: string, symbol: string, side: OrderSide, quantity: number, price: number, _assetType: AssetType) {
    await this.checkGuest(uid);

    const symbols = await getSymbols();
    const selectedSymbol = symbols.find((entry) => entry.symbol === symbol);

    if (!selectedSymbol) {
      throw new Error(`Symbol ${symbol} is not available.`);
    }

    await apiFetch(`/users/${uid}/orders`, {
      method: 'POST',
      body: JSON.stringify({
        symbol_id: selectedSymbol.id,
        side,
        quantity,
        submitted_price: price,
        source: 'manual',
      }),
    });

    emitTradingDataChanged();
  },
};
