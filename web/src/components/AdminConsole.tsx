import React, { useEffect, useMemo, useState } from 'react';
import { adminService } from '../services/adminService';
import { AdminStats, AdminTrade, AdminTransaction, AdminUserRow, DepositRequestRow, PaymentMethod } from '../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type AdminTab = 'dashboard' | 'users' | 'transactions' | 'payment-methods' | 'trades' | 'settings';

interface AdminConsoleProps {
  tab: AdminTab;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6">
      <h3 className="text-lg font-bold text-white mb-5">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500 font-bold">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminConsole({ tab }: AdminConsoleProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentDepositRequests, setRecentDepositRequests] = useState<DepositRequestRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequestRow[]>([]);
  const [trades, setTrades] = useState<AdminTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userForm, setUserForm] = useState<any>({ name: '', email: '', password: '', password_confirmation: '', status: 'active', is_admin: false, initial_balance: 10000 });
  const [transactionForm, setTransactionForm] = useState<any>({ user_id: '', type: 'deposit', amount: '', description: '' });
  const [paymentMethodForm, setPaymentMethodForm] = useState<any>({ name: '', network: '', address: '', instructions: '', is_active: true });
  const [passwordForm, setPasswordForm] = useState<any>({ current_password: '', password: '', password_confirmation: '' });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [quickAmounts, setQuickAmounts] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      if (tab === 'dashboard') {
        const data = await adminService.getDashboard();
        setStats(data.stats);
        setRecentDepositRequests(data.recent_deposit_requests);
      }
      if (tab === 'users') {
        setUsers(await adminService.getUsers());
      }
      if (tab === 'transactions') {
        const [transactionRows, depositRows, userRows] = await Promise.all([
          adminService.getTransactions(),
          adminService.getDepositRequests(),
          adminService.getUsers(),
        ]);
        setTransactions(transactionRows);
        setDepositRequests(depositRows);
        setUsers(userRows);
      }
      if (tab === 'payment-methods') {
        setPaymentMethods(await adminService.getPaymentMethods());
      }
      if (tab === 'trades') {
        setTrades(await adminService.getTrades());
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tab]);

  const resetFlash = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCreateOrUpdateUser = async () => {
    setSaving(true);
    resetFlash();
    try {
      if (editingUserId) {
        await adminService.updateUser(editingUserId, userForm);
        setSuccess('User updated successfully.');
      } else {
        await adminService.createUser(userForm);
        setSuccess('User created successfully.');
      }
      setEditingUserId(null);
      setUserForm({ name: '', email: '', password: '', password_confirmation: '', status: 'active', is_admin: false, initial_balance: 10000 });
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickTransaction = async (userId: number, type: 'deposit' | 'withdrawal') => {
    const amount = Number(quickAmounts[userId] || 0);
    if (!amount || amount <= 0) {
      setError('Enter a valid quick action amount.');
      return;
    }

    setSaving(true);
    resetFlash();
    try {
      await adminService.createTransaction({
        user_id: userId,
        type,
        amount,
        description: type === 'deposit' ? 'Admin account funding' : 'Admin account debit',
      });
      setSuccess(type === 'deposit' ? 'User funded successfully.' : 'User debited successfully.');
      setQuickAmounts((current) => ({ ...current, [userId]: '' }));
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to process quick transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrUpdateTransaction = async () => {
    setSaving(true);
    resetFlash();
    try {
      if (editingTransactionId) {
        await adminService.updateTransaction(editingTransactionId, transactionForm);
        setSuccess('Transaction updated successfully.');
      } else {
        await adminService.createTransaction(transactionForm);
        setSuccess('Transaction created successfully.');
      }
      setEditingTransactionId(null);
      setTransactionForm({ user_id: '', type: 'deposit', amount: '', description: '' });
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrUpdatePaymentMethod = async () => {
    setSaving(true);
    resetFlash();
    try {
      if (editingPaymentMethodId) {
        await adminService.updatePaymentMethod(editingPaymentMethodId, paymentMethodForm);
        setSuccess('Payment method updated successfully.');
      } else {
        await adminService.createPaymentMethod(paymentMethodForm);
        setSuccess('Payment method created successfully.');
      }
      setEditingPaymentMethodId(null);
      setPaymentMethodForm({ name: '', network: '', address: '', instructions: '', is_active: true });
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to save payment method.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setSaving(true);
    resetFlash();
    try {
      await adminService.updatePassword(passwordForm);
      setSuccess('Password updated successfully.');
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err: any) {
      setError(err.message || 'Unable to update password.');
    } finally {
      setSaving(false);
    }
  };

  const userOptions = useMemo(
    () => users.map((row) => ({ id: row.user.id, label: `${row.user.name} (${row.user.email})` })),
    [users]
  );

  if (loading) {
    return <div className="rounded-3xl border border-zinc-800 bg-[#0F0F11] p-10 text-sm text-zinc-400">Loading admin data...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-rose-400">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex gap-3 text-yellow-400">
          <CheckCircle2 size={18} className="shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {tab === 'dashboard' && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.users_count} />
            <StatCard label="Admins" value={stats.admins_count} />
            <StatCard label="Pending Deposits" value={stats.pending_deposit_requests_count} />
            <StatCard label="AI Trades" value={stats.ai_trades_count} />
            <StatCard label="Deposit Total" value={`$${stats.deposit_transactions_total.toLocaleString()}`} />
            <StatCard label="Withdrawal Total" value={`$${stats.withdrawal_transactions_total.toLocaleString()}`} />
            <StatCard label="Payment Methods" value={stats.payment_methods_count} />
            <StatCard label="All Trades" value={stats.all_trades_count} />
          </div>

          <SectionCard title="Recent Deposit Requests">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800/50">
                    <th className="py-3">User</th>
                    <th className="py-3">Amount</th>
                    <th className="py-3">Wallet</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {recentDepositRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="py-3 text-sm">{request.user_name}<div className="text-xs text-zinc-500">{request.user_email}</div></td>
                      <td className="py-3 text-sm font-mono">${request.amount.toLocaleString()}</td>
                      <td className="py-3 text-sm">{request.payment_method_name}</td>
                      <td className="py-3 text-sm capitalize">{request.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      {tab === 'users' && (
        <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
          <SectionCard title={editingUserId ? 'Edit User' : 'Create User'}>
            <div className="space-y-3">
              <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Full name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
              <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Confirm password" type="password" value={userForm.password_confirmation} onChange={(e) => setUserForm({ ...userForm, password_confirmation: e.target.value })} />
              <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Initial balance" type="number" value={userForm.initial_balance} onChange={(e) => setUserForm({ ...userForm, initial_balance: Number(e.target.value) })} />
              <select className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={userForm.is_admin} onChange={(e) => setUserForm({ ...userForm, is_admin: e.target.checked })} />
                Grant admin access
              </label>
              <div className="flex gap-3">
                <button className="flex-1 rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black" disabled={saving} onClick={handleCreateOrUpdateUser}>
                  {editingUserId ? 'Update User' : 'Create User'}
                </button>
                {editingUserId && (
                  <button className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300" onClick={() => { setEditingUserId(null); setUserForm({ name: '', email: '', password: '', password_confirmation: '', status: 'active', is_admin: false, initial_balance: 10000 }); }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="User Management">
            <div className="space-y-4">
              {users.map((row) => (
                <div key={row.user.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="font-bold text-white">{row.user.name}</p>
                      <p className="text-sm text-zinc-400">{row.user.email}</p>
                      <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">{row.user.status} {row.user.is_admin ? '· admin' : ''}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-zinc-500">Balance</p><p className="font-mono text-yellow-400">${row.account.cash_balance.toLocaleString()}</p></div>
                      <div><p className="text-zinc-500">Deposits</p><p className="font-mono">${row.account.total_deposits.toLocaleString()}</p></div>
                      <div><p className="text-zinc-500">Withdrawals</p><p className="font-mono">${row.account.total_withdrawals.toLocaleString()}</p></div>
                      <div className="flex gap-2 items-end">
                        <button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200" onClick={() => { setEditingUserId(row.user.id); setUserForm({ ...row.user, password: '', password_confirmation: '', initial_balance: row.account.cash_balance }); }}>Edit</button>
                        <button className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300" onClick={async () => { await adminService.deleteUser(row.user.id); await load(); }}>Delete</button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <input className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Quick amount" type="number" value={quickAmounts[row.user.id] || ''} onChange={(e) => setQuickAmounts((current) => ({ ...current, [row.user.id]: e.target.value }))} />
                    <button className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black" onClick={() => handleQuickTransaction(row.user.id, 'deposit')}>Fund User</button>
                    <button className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-200" onClick={() => handleQuickTransaction(row.user.id, 'withdrawal')}>Debit User</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-6">
          <SectionCard title="Deposit Requests Review">
            <div className="space-y-4">
              {depositRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="font-bold text-white">{request.user_name} <span className="text-zinc-500">#{request.id}</span></p>
                      <p className="text-sm text-zinc-400">{request.user_email}</p>
                      <p className="text-sm text-zinc-300 mt-1">${request.amount.toLocaleString()} via {request.payment_method_name} {request.wallet_network ? `(${request.wallet_network})` : ''}</p>
                      <p className="text-xs text-zinc-500 mt-1">Ref: {request.transaction_reference || 'N/A'} · Proof: {request.proof_original_name}</p>
                    </div>
                    <div className="text-xs uppercase tracking-wider font-bold text-yellow-400">{request.status}</div>
                  </div>
                  <textarea className="mt-3 w-full min-h-24 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Admin notes" value={reviewNotes[request.id] ?? request.admin_notes ?? ''} onChange={(e) => setReviewNotes((current) => ({ ...current, [request.id]: e.target.value }))} />
                  <div className="mt-3 flex flex-wrap gap-3">
                    {request.status === 'pending' && (
                      <>
                        <button className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black" onClick={async () => { await adminService.reviewDepositRequest(request.id, { status: 'approved', admin_notes: reviewNotes[request.id] ?? request.admin_notes ?? '' }); await load(); }}>Approve</button>
                        <button className="rounded-xl border border-rose-500/30 px-4 py-3 text-sm font-bold text-rose-300" onClick={async () => { await adminService.reviewDepositRequest(request.id, { status: 'rejected', admin_notes: reviewNotes[request.id] ?? request.admin_notes ?? '' }); await load(); }}>Reject</button>
                      </>
                    )}
                    {request.status !== 'approved' && (
                      <button className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-200" onClick={async () => { await adminService.deleteDepositRequest(request.id); await load(); }}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
            <SectionCard title={editingTransactionId ? 'Edit Transaction' : 'Create Transaction'}>
              <div className="space-y-3">
                <select className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" value={transactionForm.user_id} onChange={(e) => setTransactionForm({ ...transactionForm, user_id: Number(e.target.value) })}>
                  <option value="">Select user</option>
                  {userOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                <select className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" value={transactionForm.type} onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}>
                  <option value="deposit">deposit</option>
                  <option value="withdrawal">withdrawal</option>
                </select>
                <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Amount" type="number" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: Number(e.target.value) })} />
                <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Description" value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} />
                <button className="w-full rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black" disabled={saving} onClick={handleCreateOrUpdateTransaction}>
                  {editingTransactionId ? 'Update Transaction' : 'Create Transaction'}
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Deposit and Withdrawal Transactions">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800/50">
                      <th className="py-3">User</th>
                      <th className="py-3">Type</th>
                      <th className="py-3">Amount</th>
                      <th className="py-3">Description</th>
                      <th className="py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {transactions.map((row) => (
                      <tr key={row.id}>
                        <td className="py-3 text-sm">{row.user_name}<div className="text-xs text-zinc-500">{row.user_email}</div></td>
                        <td className="py-3 text-sm capitalize">{row.type}</td>
                        <td className="py-3 text-sm font-mono">${row.amount.toLocaleString()}</td>
                        <td className="py-3 text-sm">{row.description}</td>
                        <td className="py-3 text-sm">
                          <div className="flex gap-2">
                            {row.editable && (
                              <>
                                <button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200" onClick={() => { setEditingTransactionId(row.id); setTransactionForm({ user_id: row.user_id, type: row.type, amount: row.amount, description: row.description }); }}>Edit</button>
                                <button className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300" onClick={async () => { await adminService.deleteTransaction(row.id); await load(); }}>Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'payment-methods' && (
        <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
          <SectionCard title={editingPaymentMethodId ? 'Edit Payment Method' : 'Add Payment Method'}>
            <div className="space-y-3">
              <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Wallet name" value={paymentMethodForm.name} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, name: e.target.value })} />
              <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Network" value={paymentMethodForm.network} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, network: e.target.value })} />
              <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Wallet address" value={paymentMethodForm.address} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, address: e.target.value })} />
              <textarea className="w-full min-h-24 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Instructions" value={paymentMethodForm.instructions} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, instructions: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={paymentMethodForm.is_active} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, is_active: e.target.checked })} />
                Active
              </label>
              <button className="w-full rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black" disabled={saving} onClick={handleCreateOrUpdatePaymentMethod}>
                {editingPaymentMethodId ? 'Update Payment Method' : 'Create Payment Method'}
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Payment Methods">
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="font-bold text-white">{method.name}</p>
                      <p className="text-sm text-zinc-400">{method.network || 'Default network'}</p>
                      <p className="mt-2 break-all font-mono text-xs text-zinc-300">{method.address}</p>
                      {method.instructions && <p className="mt-2 text-sm text-zinc-500">{method.instructions}</p>}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs font-bold uppercase tracking-wider ${method.is_active ? 'text-yellow-400' : 'text-zinc-500'}`}>{method.is_active ? 'active' : 'inactive'}</span>
                      <button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200" onClick={() => { setEditingPaymentMethodId(method.id); setPaymentMethodForm({ name: method.name, network: method.network || '', address: method.address, instructions: method.instructions || '', is_active: !!method.is_active }); }}>Edit</button>
                      <button className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300" onClick={async () => { await adminService.deletePaymentMethod(method.id); await load(); }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'trades' && (
        <SectionCard title="AI Trades">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800/50">
                  <th className="py-3">User</th>
                  <th className="py-3">Symbol</th>
                  <th className="py-3">Side</th>
                  <th className="py-3">Quantity</th>
                  <th className="py-3">Fill</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="py-3 text-sm">{trade.user_name}<div className="text-xs text-zinc-500">{trade.user_email}</div></td>
                    <td className="py-3 text-sm">{trade.symbol}<div className="text-xs text-zinc-500">{trade.symbol_name}</div></td>
                    <td className="py-3 text-sm uppercase">{trade.side}</td>
                    <td className="py-3 text-sm font-mono">{trade.quantity}</td>
                    <td className="py-3 text-sm font-mono">{trade.fill_price ? `$${trade.fill_price.toLocaleString()}` : 'N/A'}</td>
                    <td className="py-3 text-sm">{trade.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === 'settings' && (
        <SectionCard title="Admin Settings">
          <div className="max-w-xl space-y-3">
            <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" type="password" placeholder="Current password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} />
            <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" type="password" placeholder="New password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} />
            <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm" type="password" placeholder="Confirm new password" value={passwordForm.password_confirmation} onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })} />
            <button className="rounded-xl bg-yellow-500 px-6 py-3 text-sm font-bold text-black" disabled={saving} onClick={handleUpdatePassword}>Change Password</button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
