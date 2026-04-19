import { SymbolInfo } from "./types";

export const MOCK_SYMBOLS: SymbolInfo[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 1.24, changePercent: 0.67, type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 175.34, change: -4.12, changePercent: -2.3, type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.28, change: 12.45, changePercent: 1.44, type: 'stock' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', price: 492.11, change: 4.72, changePercent: 0.97, type: 'stock' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', price: 665.42, change: 8.21, changePercent: 1.25, type: 'stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', price: 176.58, change: 2.14, changePercent: 1.23, type: 'stock' },
  { symbol: 'INTC', name: 'Intel Corporation', price: 31.84, change: 0.42, changePercent: 1.34, type: 'stock' },
  { symbol: 'ORCL', name: 'Oracle Corporation', price: 141.77, change: 1.08, changePercent: 0.77, type: 'stock' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', price: 314.52, change: 3.12, changePercent: 1.0, type: 'stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 197.63, change: 1.56, changePercent: 0.79, type: 'stock' },
  { symbol: 'BAC', name: 'Bank of America Corporation', price: 38.42, change: 0.21, changePercent: 0.55, type: 'stock' },
  { symbol: 'DIS', name: 'The Walt Disney Company', price: 113.09, change: 0.87, changePercent: 0.77, type: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', price: 68432.12, change: 1245.32, changePercent: 1.85, type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', price: 3845.67, change: -45.21, changePercent: -1.16, type: 'crypto' },
  { symbol: 'SOL', name: 'Solana', price: 145.23, change: 8.45, changePercent: 6.18, type: 'crypto' },
  { symbol: 'BNB', name: 'BNB', price: 582.44, change: 9.38, changePercent: 1.64, type: 'crypto' },
  { symbol: 'XRP', name: 'XRP', price: 0.57, change: 0.01, changePercent: 1.79, type: 'crypto' },
  { symbol: 'ADA', name: 'Cardano', price: 0.48, change: 0.02, changePercent: 4.35, type: 'crypto' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, change: 0.005, changePercent: 3.23, type: 'crypto' },
  { symbol: 'AVAX', name: 'Avalanche', price: 35.91, change: 1.12, changePercent: 3.22, type: 'crypto' },
  { symbol: 'LINK', name: 'Chainlink', price: 14.63, change: 0.41, changePercent: 2.88, type: 'crypto' },
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
