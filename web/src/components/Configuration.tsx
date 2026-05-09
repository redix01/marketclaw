import React, { useState } from 'react';
import { Save, AlertTriangle, TrendingUp, Wallet, Zap } from 'lucide-react';
import { Account, ClosedTradesSummary } from '../types';

interface ConfigurationProps {
  account: Account | null;
  closedTradesSummary: ClosedTradesSummary | null;
}

export default function Configuration({ account, closedTradesSummary }: ConfigurationProps) {
  const [config, setConfig] = useState({
    leverage: 10,
    takeProfitPercent: 2.0,
    walletExposurePercent: 25,
    emergencyStopPercent: 5,
    maxOpenPositions: 5,
    autoCloseEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const stats = closedTradesSummary || {
    totalTrades: 0,
    totalRealizedPnl: 0,
    avgPnlPercent: 0,
    autoClosedCount: 0,
    manualClosedCount: 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">AI Trader Configuration</h2>
        <p className="text-sm text-zinc-500 mt-1">Configure your grid trading parameters</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total Trades</p>
          <p className="text-xl font-mono font-bold text-white mt-1">{stats.totalTrades}</p>
        </div>
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Realized P&L</p>
          <p className={`text-xl font-mono font-bold mt-1 ${stats.totalRealizedPnl >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
            ${stats.totalRealizedPnl?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Avg P&L%</p>
          <p className="text-xl font-mono font-bold text-white mt-1">{stats.avgPnlPercent?.toFixed(1) || '0'}%</p>
        </div>
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Auto Closed</p>
          <p className="text-xl font-mono font-bold text-white mt-1">{stats.autoClosedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-yellow-400" />
            <label className="text-sm font-bold text-white">Leverage</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="1"
              min="1"
              max="100"
              value={config.leverage}
              onChange={(e) => setConfig({ ...config, leverage: parseInt(e.target.value) || 1 })}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono"
            />
            <span className="text-zinc-500 text-sm">x</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Position multiplier for grid trading</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-yellow-400" />
            <label className="text-sm font-bold text-white">Take Profit</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              value={config.takeProfitPercent}
              onChange={(e) => setConfig({ ...config, takeProfitPercent: parseFloat(e.target.value) || 0 })}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono"
            />
            <span className="text-zinc-500 text-sm">%</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Auto-close when profit reaches this %</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={16} className="text-yellow-400" />
            <label className="text-sm font-bold text-white">Wallet Exposure</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="1"
              min="1"
              max="100"
              value={config.walletExposurePercent}
              onChange={(e) => setConfig({ ...config, walletExposurePercent: parseInt(e.target.value) || 0 })}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono"
            />
            <span className="text-zinc-500 text-sm">%</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Max capital to use per position</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-yellow-400" />
            <label className="text-sm font-bold text-white">Stop Loss</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="20"
              value={config.emergencyStopPercent}
              onChange={(e) => setConfig({ ...config, emergencyStopPercent: parseFloat(e.target.value) || 0 })}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono"
            />
            <span className="text-zinc-500 text-sm">%</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Stop all trading at this loss %</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-5">
          <label className="text-sm font-bold text-white mb-3 block">Max Open Positions</label>
          <input
            type="number"
            min="1"
            max="20"
            value={config.maxOpenPositions}
            onChange={(e) => setConfig({ ...config, maxOpenPositions: parseInt(e.target.value) || 1 })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono"
          />
          <p className="text-[10px] text-zinc-500 mt-2">Simultaneous grid positions</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between h-full">
            <div>
              <label className="text-sm font-bold text-white">Auto-Close</label>
              <p className="text-[10px] text-zinc-500 mt-1">Auto-close at take profit</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, autoCloseEnabled: !config.autoCloseEnabled })}
              className={`w-14 h-7 rounded-full transition-all ${
                config.autoCloseEnabled ? 'bg-yellow-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                  config.autoCloseEnabled ? 'translate-x-7' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-400">Risk Warning</p>
            <p className="text-xs text-zinc-400 mt-1">
              Grid trading involves significant risk. The stop loss will halt all trading
              when losses exceed {config.emergencyStopPercent}%. Always monitor your positions.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
        ) : (
          <Save size={20} />
        )}
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
}