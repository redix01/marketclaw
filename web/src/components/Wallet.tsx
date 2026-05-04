import React, { useState } from 'react';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Plus, 
  Minus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Account, LedgerEvent } from '../types';
import { tradingService } from '../services/tradingService';

interface WalletProps {
  user: any;
  account: Account | null;
  ledger: LedgerEvent[];
}

export default function Wallet({ user, account, ledger }: WalletProps) {
  const [amount, setAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!user || amount <= 0) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await tradingService.depositFunds(user.uid, amount);
      setSuccess(`Successfully deposited $${amount.toLocaleString()} virtual funds.`);
      setAmount(1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || amount <= 0) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await tradingService.withdrawFunds(user.uid, amount);
      setSuccess(`Successfully withdrawn $${amount.toLocaleString()} virtual funds.`);
      setAmount(1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-3xl p-8 text-black shadow-2xl shadow-yellow-500/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Available Cash</p>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold">${account?.cashBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</h2>
                </div>
                <WalletIcon size={40} className="opacity-30" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Total Deposits</p>
                  <p className="text-xl font-mono font-bold">${account?.totalDeposits?.toLocaleString() || '0.00'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Total Withdrawals</p>
                  <p className="text-xl font-mono font-bold">${account?.totalWithdrawals?.toLocaleString() || '0.00'}</p>
                </div>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-black/5 rounded-full blur-2xl"></div>
          </div>

          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800/50 flex items-center gap-2">
              <History size={20} className="text-yellow-400" />
              <h3 className="text-lg font-bold">Transaction History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800/50">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {ledger.map((event) => (
                    <tr key={event.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(event.timestamp).toLocaleDateString()}
                        <span className="block opacity-50">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                          event.type === 'deposit' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          event.type === 'withdrawal' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {event.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">{event.description}</td>
                      <td className={`px-6 py-4 text-sm font-mono font-bold text-right ${event.amount >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                        {event.amount >= 0 ? '+' : ''}{event.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6">Manage Funds</h3>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Amount ($)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-yellow-500/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-rose-400">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 text-yellow-400">
                <CheckCircle2 size={18} className="shrink-0" />
                <p className="text-xs font-medium">{success}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                disabled={loading || amount <= 0}
                onClick={handleDeposit}
                className="flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group disabled:opacity-50"
              >
                <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Plus size={20} />
                </div>
                <span className="text-xs font-bold">Deposit</span>
              </button>
              <button 
                disabled={loading || amount <= 0 || (account?.cashBalance || 0) < amount}
                onClick={handleWithdraw}
                className="flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-rose-500/50 hover:bg-rose-500/5 transition-all group disabled:opacity-50"
              >
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Minus size={20} />
                </div>
                <span className="text-xs font-bold">Withdraw</span>
              </button>
            </div>

            <div className="mt-8 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <AlertCircle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Simulation Only</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                All funds are virtual and for simulation purposes only. No real money is involved in these transactions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
