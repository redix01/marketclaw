import React, { useMemo, useState } from 'react';
import {
  Wallet as WalletIcon,
  History,
  AlertCircle,
  CheckCircle2,
  Copy,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Account, LedgerEvent } from '../types';
import { tradingService } from '../services/tradingService';

interface WalletProps {
  user: any;
  account: Account | null;
  ledger: LedgerEvent[];
}

type DepositWallet = {
  id: string;
  name: string;
  network: string;
  address: string;
};

const DEPOSIT_WALLETS: DepositWallet[] = [
  {
    id: 'usdt-trc20',
    name: 'USDT',
    network: 'TRC20',
    address: import.meta.env.VITE_USDT_TRC20_ADDRESS || 'Set-VITE_USDT_TRC20_ADDRESS',
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    network: 'BTC',
    address: import.meta.env.VITE_BTC_ADDRESS || 'Set-VITE_BTC_ADDRESS',
  },
  {
    id: 'eth',
    name: 'Ethereum',
    network: 'ERC20',
    address: import.meta.env.VITE_ETH_ADDRESS || 'Set-VITE_ETH_ADDRESS',
  },
];

export default function Wallet({ user, account, ledger }: WalletProps) {
  const [amount, setAmount] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(DEPOSIT_WALLETS[0].id);
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedWallet = useMemo(
    () => DEPOSIT_WALLETS.find((wallet) => wallet.id === selectedWalletId) ?? DEPOSIT_WALLETS[0],
    [selectedWalletId]
  );

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(selectedWallet.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Unable to copy the wallet address. Please copy it manually.');
    }
  };

  const handleDepositSubmit = async () => {
    const numericAmount = Number(amount);

    if (!user) return;
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter a valid deposit amount.');
      return;
    }
    if (!proofFile) {
      setError('Upload your payment proof before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = new FormData();
      payload.append('amount', String(numericAmount));
      payload.append('wallet_name', selectedWallet.name);
      payload.append('wallet_network', selectedWallet.network);
      payload.append('wallet_address', selectedWallet.address);
      payload.append('transaction_reference', transactionReference);
      payload.append('notes', notes);
      payload.append('proof_file', proofFile);

      await tradingService.submitDepositRequest(user.uid, payload);

      setSuccess('Deposit proof submitted successfully. Admin has been notified by email.');
      setAmount('');
      setTransactionReference('');
      setNotes('');
      setProofFile(null);
    } catch (err: any) {
      setError(err.message || 'Unable to submit deposit proof.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
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
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-black/5 rounded-full blur-2xl"></div>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6 md:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Wallet Deposit</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Submit deposit proof</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Enter your amount, choose a wallet, copy the address, then upload your payment proof for admin review.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-yellow-500/50 transition-all"
                  placeholder="1000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Select Wallet</label>
                <div className="grid gap-3 md:grid-cols-3">
                  {DEPOSIT_WALLETS.map((wallet) => {
                    const active = wallet.id === selectedWallet.id;
                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        onClick={() => setSelectedWalletId(wallet.id)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          active
                            ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <p className="text-sm font-bold">{wallet.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider">{wallet.network}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Wallet Address</p>
                    <p className="mt-2 break-all font-mono text-sm text-white">{selectedWallet.address}</p>
                    <p className="mt-2 text-xs text-zinc-500">{selectedWallet.name} on {selectedWallet.network}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-yellow-500/40 hover:text-yellow-300 transition-colors"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Transaction Reference</label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(event) => setTransactionReference(event.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
                  placeholder="Optional hash or reference"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Payment Proof</label>
                <label className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300 cursor-pointer hover:border-yellow-500/40 transition-colors">
                  <Upload size={16} className="text-yellow-400" />
                  <span className="truncate">{proofFile ? proofFile.name : 'Upload JPG, PNG, or PDF'}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full min-h-28 bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all resize-none"
                  placeholder="Add any extra payment details for admin review"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-rose-400">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 text-yellow-400">
                <CheckCircle2 size={18} className="shrink-0" />
                <p className="text-xs font-medium">{success}</p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                disabled={loading}
                onClick={handleDepositSubmit}
                className="inline-flex items-center justify-center rounded-2xl bg-yellow-500 px-8 py-3 text-sm font-bold text-black transition-all hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Submitting...' : 'Submit Deposit Proof'}
              </button>
            </div>
          </div>
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
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                          event.type === 'deposit'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : event.type === 'withdrawal'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {event.type === 'deposit' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {event.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">{event.description}</td>
                    <td className={`px-6 py-4 text-sm font-mono font-bold text-right ${event.amount >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                      {event.amount >= 0 ? '+' : ''}
                      {event.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
    </div>
  );
}
