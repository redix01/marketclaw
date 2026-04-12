import { SymbolInfo } from "./types";

export const MOCK_SYMBOLS: SymbolInfo[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 1.24, changePercent: 0.67, type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 175.34, change: -4.12, changePercent: -2.3, type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.28, change: 12.45, changePercent: 1.44, type: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', price: 68432.12, change: 1245.32, changePercent: 1.85, type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', price: 3845.67, change: -45.21, changePercent: -1.16, type: 'crypto' },
  { symbol: 'SOL', name: 'Solana', price: 145.23, change: 8.45, changePercent: 6.18, type: 'crypto' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.32, change: 2.11, changePercent: 0.51, type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 148.23, change: -0.45, changePercent: -0.3, type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.45, change: 1.67, changePercent: 0.94, type: 'stock' },
];

export const AGENT_TEMPLATES = [
  { id: 'trend_rider', name: 'Trend Rider', description: 'Follows strong upward momentum and exits on reversals.' },
  { id: 'mean_revert', name: 'Mean Revert', description: 'Buys oversold assets and sells overbought ones.' },
  { id: 'breakout_hunter', name: 'Breakout Hunter', description: 'Identifies key resistance levels and trades breakouts.' },
  { id: 'crypto_momentum', name: 'Crypto Momentum', description: 'Aggressive strategy focused on high-volatility crypto assets.' },
];
