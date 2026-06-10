import React, { useEffect, useMemo, useState } from 'react';
import { adminService } from '../services/adminService';
import { AdminStats, AdminTrade, AdminTransaction, AdminUserRow, DepositRequestRow, PaymentMethod, TraderProfile, TraderUpgradeRequest } from '../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type AdminTab = 'dashboard' | 'users' | 'transactions' | 'payment-methods' | 'trades' | 'trader-settings' | 'settings';

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

function formatMoney(value: number) {
  return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-[#0F0F11] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
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
  const [traderProfiles, setTraderProfiles] = useState<TraderProfile[]>([]);
  const [traderUpgradeRequests, setTraderUpgradeRequests] = useState<TraderUpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userForm, setUserForm] = useState<any>({ name: '', email: '', password: '', password_confirmation: '', status: 'active', is_admin: false, initial_balance: 0 });
  const [transactionForm, setTransactionForm] = useState<any>({ user_id: '', type: 'deposit', amount: '', description: '' });
  const [paymentMethodForm, setPaymentMethodForm] = useState<any>({ name: '', network: '', address: '', instructions: '', is_active: true });
  const [passwordForm, setPasswordForm] = useState<any>({ current_password: '', password: '', password_confirmation: '' });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userActionModal, setUserActionModal] = useState<{ userId: number; type: 'deposit' | 'withdrawal'; name: string } | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<number | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'deposit' | 'withdrawal'>('deposit');
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [userActionAmount, setUserActionAmount] = useState('');
  const [tradePnlDrafts, setTradePnlDrafts] = useState<Record<number, string>>({});
  const [traderProfileForms, setTraderProfileForms] = useState<Record<number, { title: string; description: string; commission_percent: string; level: string }>>({});
  const [upgradeReviewNotes, setUpgradeReviewNotes] = useState<Record<number, string>>({});
  const [userBotSettings, setUserBotSettings] = useState<any[]>([]);
  const [editingUserBotSettings, setEditingUserBotSettings] = useState<{ userId: number; botLevel: string; minimumAmount: string; commissionPercent: string } | null>(null);

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
        const tradeRows = await adminService.getTrades();
        setTrades(tradeRows);
        setTradePnlDrafts(
          tradeRows.reduce<Record<number, string>>((acc, trade) => {
            acc[trade.id] = trade.unrealized_pnl.toFixed(2);
            return acc;
          }, {})
        );
      }
      if (tab === 'trader-settings') {
        const [profiles, requests, botSettings] = await Promise.all([
          adminService.getTraderProfiles(),
          adminService.getTraderUpgradeRequests(),
          adminService.getUserBotSettings(),
        ]);
        setTraderProfiles(profiles);
        setTraderUpgradeRequests(requests);
        setUserBotSettings(botSettings);
        setTraderProfileForms(
          profiles.reduce<Record<number, { title: string; description: string; commission_percent: string; level: string }>>((acc, profile) => {
            acc[profile.id] = {
              title: profile.title,
              description: profile.description,
              commission_percent: String(profile.commission_percent),
              level: String(profile.level),
            };
            return acc;
          }, {})
        );
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
      setUserForm({ name: '', email: '', password: '', password_confirmation: '', status: 'active', is_admin: false, initial_balance: 0 });
      setIsUserModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickTransaction = async (userId: number, type: 'deposit' | 'withdrawal') => {
    const amount = Number(userActionAmount || 0);
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
      setUserActionAmount('');
      setUserActionModal(null);
      setSuccess(type === 'deposit' ? 'User funded successfully.' : 'User debited successfully.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to process quick transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: AdminUserRow['user']) => {
    if (!window.confirm(`Delete user "${user.name}"?`)) {
      return;
    }

    setSaving(true);
    resetFlash();
    try {
      await adminService.deleteUser(user.id);
      setSuccess('User deleted successfully.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to delete user.');
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
      setIsTransactionModalOpen(false);
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
      setIsPaymentMethodModalOpen(false);
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

  const filteredTransactions = useMemo(
    () => transactions.filter((row) => row.type === transactionTypeFilter),
    [transactionTypeFilter, transactions]
  );

  const openCreatePaymentMethodModal = () => {
    resetFlash();
    setEditingPaymentMethodId(null);
    setPaymentMethodForm({ name: '', network: '', address: '', instructions: '', is_active: true });
    setIsPaymentMethodModalOpen(true);
  };

  const openCreateUserModal = () => {
    resetFlash();
    setEditingUserId(null);
    setUserForm({ name: '', email: '', password: '', password_confirmation: '', status: 'active', is_admin: false, initial_balance: 0 });
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (row: AdminUserRow) => {
    resetFlash();
    setEditingUserId(row.user.id);
    setUserForm({
      ...row.user,
      password: '',
      password_confirmation: '',
      initial_balance: row.account.cash_balance,
    });
    setIsUserModalOpen(true);
  };

  const openUserActionModal = (row: AdminUserRow, type: 'deposit' | 'withdrawal') => {
    resetFlash();
    setUserActionAmount('');
    setUserActionModal({
      userId: row.user.id,
      type,
      name: row.user.name,
    });
  };

  const openCreateTransactionModal = () => {
    resetFlash();
    setEditingTransactionId(null);
    setTransactionForm({ user_id: '', type: 'deposit', amount: '', description: '' });
    setIsTransactionModalOpen(true);
  };

  const openEditTransactionModal = (transaction: AdminTransaction) => {
    resetFlash();
    setEditingTransactionId(transaction.id);
    setTransactionForm({
      user_id: transaction.user_id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
    });
    setIsTransactionModalOpen(true);
  };

  const openEditPaymentMethodModal = (method: PaymentMethod) => {
    resetFlash();
    setEditingPaymentMethodId(method.id);
    setPaymentMethodForm({
      name: method.name,
      network: method.network || '',
      address: method.address,
      instructions: method.instructions || '',
      is_active: !!method.is_active,
    });
    setIsPaymentMethodModalOpen(true);
  };

  const handleDeletePaymentMethod = async (method: PaymentMethod) => {
    if (!window.confirm(`Delete payment method "${method.name}"?`)) {
      return;
    }

    setSaving(true);
    resetFlash();
    try {
      await adminService.deletePaymentMethod(method.id);
      setSuccess('Payment method deleted successfully.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to delete payment method.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaymentMethodStatus = async (method: PaymentMethod) => {
    setSaving(true);
    resetFlash();
    try {
      const nextActiveState = !method.is_active;
      await adminService.updatePaymentMethod(method.id, {
        name: method.name,
        network: method.network || '',
        address: method.address,
        instructions: method.instructions || '',
        is_active: nextActiveState,
      });
      setSuccess(nextActiveState ? 'Payment method activated successfully.' : 'Payment method deactivated successfully.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to update payment method status.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTradePnl = async (trade: AdminTrade) => {
    const draft = Number(tradePnlDrafts[trade.id] ?? trade.unrealized_pnl);
    if (!Number.isFinite(draft)) {
      setError('Enter a valid PnL value.');
      return;
    }

    setSaving(true);
    resetFlash();
    try {
      await adminService.updateTrade(trade.id, {
        unrealized_pnl: draft,
      });
      setSuccess('Trade PnL updated successfully.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to update trade PnL.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseTrade = async (trade: AdminTrade) => {
    if (!window.confirm(`Close ${trade.symbol} for ${trade.user_name}?`)) {
      return;
    }

    setSaving(true);
    resetFlash();
    try {
      await adminService.closeTrade(trade.id);
      setSuccess('Trade closed successfully.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to close trade.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTraderProfile = async (profile: TraderProfile) => {
    const form = traderProfileForms[profile.id];
    if (!form) return;

    setSaving(true);
    resetFlash();
    try {
      await adminService.updateTraderProfile(profile.id, {
        title: form.title,
        description: form.description,
        commission_percent: Number(form.commission_percent),
        level: Number(form.level),
      });
      setSuccess(`${profile.asset_type.toUpperCase()} trader updated successfully.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to update trader profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewUpgradeRequest = async (request: TraderUpgradeRequest, status: 'approved' | 'rejected') => {
    setSaving(true);
    resetFlash();
    try {
      await adminService.updateTraderUpgradeRequest(request.id, {
        status,
        admin_notes: upgradeReviewNotes[request.id] ?? request.admin_notes ?? '',
      });
      setSuccess(`Upgrade request ${status}.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to review upgrade request.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserBotSettings = async () => {
    if (!editingUserBotSettings) return;

    setSaving(true);
    resetFlash();
    try {
      await adminService.updateUserBotSetting(editingUserBotSettings.userId, {
        bot_level: Number(editingUserBotSettings.botLevel),
        minimum_trading_amount: Number(editingUserBotSettings.minimumAmount),
        commission_percent: Number(editingUserBotSettings.commissionPercent),
      });
      setSuccess('User bot settings updated successfully.');
      setEditingUserBotSettings(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to update user bot settings.');
    } finally {
      setSaving(false);
    }
  };

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
        <>
          <SectionCard title="User Management">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-400">Manage user accounts, balances, and admin access from one place.</p>
              <button
                className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-400"
                onClick={openCreateUserModal}
              >
                Create User
              </button>
            </div>
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
                        <button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200" onClick={() => openEditUserModal(row)}>Edit</button>
                        <button className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300" onClick={() => void handleDeleteUser(row.user)}>Delete</button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black" onClick={() => openUserActionModal(row, 'deposit')}>Fund User</button>
                    <button className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-200" onClick={() => openUserActionModal(row, 'withdrawal')}>Debit User</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <Modal
            title={editingUserId ? 'Edit User' : 'Create User'}
            open={isUserModalOpen}
            onClose={() => {
              if (saving) {
                return;
              }
              setIsUserModalOpen(false);
              setEditingUserId(null);
              setUserForm({ name: '', email: '', password: '', password_confirmation: '', status: 'active', is_admin: false, initial_balance: 0 });
            }}
          >
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Full name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Confirm password" type="password" value={userForm.password_confirmation} onChange={(e) => setUserForm({ ...userForm, password_confirmation: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Initial balance" type="number" value={userForm.initial_balance} onChange={(e) => setUserForm({ ...userForm, initial_balance: Number(e.target.value) })} />
              <select className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={userForm.is_admin} onChange={(e) => setUserForm({ ...userForm, is_admin: e.target.checked })} />
                Grant admin access
              </label>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300"
                  disabled={saving}
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setEditingUserId(null);
                    setUserForm({ name: '', email: '', password: '', password_confirmation: '', status: 'active', is_admin: false, initial_balance: 0 });
                  }}
                >
                  Cancel
                </button>
                <button className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-bold text-black" disabled={saving} onClick={handleCreateOrUpdateUser}>
                  {editingUserId ? 'Update User' : 'Create User'}
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            title={userActionModal ? `${userActionModal.type === 'deposit' ? 'Fund' : 'Debit'} ${userActionModal.name}` : 'Quick Action'}
            open={!!userActionModal}
            onClose={() => {
              if (saving) {
                return;
              }
              setUserActionModal(null);
              setUserActionAmount('');
            }}
          >
            {userActionModal && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  {userActionModal.type === 'deposit' ? 'Credit this user account with a manual admin deposit.' : 'Debit this user account with a manual admin withdrawal.'}
                </p>
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
                  placeholder="Amount"
                  type="number"
                  value={userActionAmount}
                  onChange={(e) => setUserActionAmount(e.target.value)}
                />
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300"
                    disabled={saving}
                    onClick={() => {
                      setUserActionModal(null);
                      setUserActionAmount('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`rounded-xl px-5 py-3 text-sm font-bold ${userActionModal.type === 'deposit' ? 'bg-yellow-500 text-black' : 'border border-zinc-700 text-zinc-200'}`}
                    disabled={saving}
                    onClick={() => handleQuickTransaction(userActionModal.userId, userActionModal.type)}
                  >
                    {userActionModal.type === 'deposit' ? 'Fund User' : 'Debit User'}
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </>
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

          <SectionCard title="Deposit and Withdrawal Transactions">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3">
                  <button
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                      transactionTypeFilter === 'deposit'
                        ? 'bg-yellow-500 text-black'
                        : 'border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                    }`}
                    onClick={() => setTransactionTypeFilter('deposit')}
                  >
                    Deposits
                  </button>
                  <button
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                      transactionTypeFilter === 'withdrawal'
                        ? 'bg-yellow-500 text-black'
                        : 'border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                    }`}
                    onClick={() => setTransactionTypeFilter('withdrawal')}
                  >
                    Withdrawals
                  </button>
                </div>
                <button
                  className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-400"
                  onClick={openCreateTransactionModal}
                >
                  New Transaction
                </button>
              </div>
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
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-zinc-500">
                          No {transactionTypeFilter} transactions found.
                        </td>
                      </tr>
                    )}
                    {filteredTransactions.map((row) => (
                      <tr key={row.id}>
                        <td className="py-3 text-sm">{row.user_name}<div className="text-xs text-zinc-500">{row.user_email}</div></td>
                        <td className="py-3 text-sm capitalize">{row.type}</td>
                        <td className="py-3 text-sm font-mono">${row.amount.toLocaleString()}</td>
                        <td className="py-3 text-sm">{row.description}</td>
                        <td className="py-3 text-sm">
                          <div className="flex gap-2">
                            {row.editable && (
                              <>
                                <button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200" onClick={() => openEditTransactionModal(row)}>Edit</button>
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

          <Modal
            title={editingTransactionId ? 'Edit Transaction' : 'Create Transaction'}
            open={isTransactionModalOpen}
            onClose={() => {
              if (saving) {
                return;
              }
              setIsTransactionModalOpen(false);
              setEditingTransactionId(null);
              setTransactionForm({ user_id: '', type: 'deposit', amount: '', description: '' });
            }}
          >
            <div className="space-y-3">
              <select className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" value={transactionForm.user_id} onChange={(e) => setTransactionForm({ ...transactionForm, user_id: Number(e.target.value) })}>
                <option value="">Select user</option>
                {userOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <select className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" value={transactionForm.type} onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}>
                <option value="deposit">deposit</option>
                <option value="withdrawal">withdrawal</option>
              </select>
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Amount" type="number" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: Number(e.target.value) })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Description" value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} />
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300"
                  disabled={saving}
                  onClick={() => {
                    setIsTransactionModalOpen(false);
                    setEditingTransactionId(null);
                    setTransactionForm({ user_id: '', type: 'deposit', amount: '', description: '' });
                  }}
                >
                  Cancel
                </button>
                <button className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-bold text-black" disabled={saving} onClick={handleCreateOrUpdateTransaction}>
                  {editingTransactionId ? 'Update Transaction' : 'Create Transaction'}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'payment-methods' && (
        <>
          <SectionCard title="Payment Methods">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Manage wallet names, networks, receiving addresses, and availability from one table.</p>
              </div>
              <button
                className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-400"
                onClick={openCreatePaymentMethodModal}
              >
                Add Wallet
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="min-w-[920px] w-full table-fixed text-left">
                <thead className="bg-zinc-900/60">
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
                    <th className="w-[18%] px-5 py-4">Wallet</th>
                    <th className="w-[14%] px-5 py-4">Network</th>
                    <th className="w-[32%] px-5 py-4">Address</th>
                    <th className="w-[18%] px-5 py-4">Instructions</th>
                    <th className="w-[8%] px-5 py-4">Status</th>
                    <th className="w-[10%] px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-900/20">
                  {paymentMethods.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">
                        No payment methods added yet.
                      </td>
                    </tr>
                  )}
                  {paymentMethods.map((method) => (
                    <tr key={method.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-white">{method.name}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-300">
                        {method.network || 'Default'}
                      </td>
                      <td className="px-5 py-4">
                        <p className="break-all font-mono text-xs text-zinc-300">{method.address}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-400">
                        <p className="line-clamp-2 pr-3">{method.instructions || 'No instructions'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${method.is_active ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          {method.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-1.5">
                            <button
                              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                              onClick={() => openEditPaymentMethodModal(method)}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg border border-yellow-500/30 px-3 py-2 text-xs font-bold text-yellow-300 transition hover:border-yellow-400 hover:text-yellow-200"
                              onClick={() => void handleTogglePaymentMethodStatus(method)}
                            >
                              {method.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 transition hover:border-rose-400 hover:text-rose-200"
                              onClick={() => void handleDeletePaymentMethod(method)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <Modal
            title={editingPaymentMethodId ? 'Edit Payment Method' : 'Add Payment Method'}
            open={isPaymentMethodModalOpen}
            onClose={() => {
              if (saving) {
                return;
              }
              setIsPaymentMethodModalOpen(false);
              setEditingPaymentMethodId(null);
              setPaymentMethodForm({ name: '', network: '', address: '', instructions: '', is_active: true });
            }}
          >
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Wallet name" value={paymentMethodForm.name} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, name: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Network" value={paymentMethodForm.network} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, network: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Wallet address" value={paymentMethodForm.address} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, address: e.target.value })} />
              <textarea className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm" placeholder="Instructions" value={paymentMethodForm.instructions} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, instructions: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={paymentMethodForm.is_active} onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, is_active: e.target.checked })} />
                Active
              </label>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300"
                  disabled={saving}
                  onClick={() => {
                    setIsPaymentMethodModalOpen(false);
                    setEditingPaymentMethodId(null);
                    setPaymentMethodForm({ name: '', network: '', address: '', instructions: '', is_active: true });
                  }}
                >
                  Cancel
                </button>
                <button className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-bold text-black" disabled={saving} onClick={handleCreateOrUpdatePaymentMethod}>
                  {editingPaymentMethodId ? 'Update Payment Method' : 'Create Payment Method'}
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            title="Edit User Bot Settings"
            open={!!editingUserBotSettings}
            onClose={() => {
              if (saving) {
                return;
              }
              setEditingUserBotSettings(null);
            }}
          >
            {editingUserBotSettings && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Bot Level</label>
                  <input
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
                    type="number"
                    min="1"
                    max="100"
                    value={editingUserBotSettings.botLevel}
                    onChange={(e) => setEditingUserBotSettings({ ...editingUserBotSettings, botLevel: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Minimum Trading Amount ($)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingUserBotSettings.minimumAmount}
                    onChange={(e) => setEditingUserBotSettings({ ...editingUserBotSettings, minimumAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Commission Percent (%)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editingUserBotSettings.commissionPercent}
                    onChange={(e) => setEditingUserBotSettings({ ...editingUserBotSettings, commissionPercent: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300"
                    disabled={saving}
                    onClick={() => setEditingUserBotSettings(null)}
                  >
                    Cancel
                  </button>
                  <button className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-bold text-black" disabled={saving} onClick={handleSaveUserBotSettings}>
                    Save User Bot Settings
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {tab === 'trades' && (
        <SectionCard title="AI Trades">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800/50">
                  <th className="py-3">User</th>
                  <th className="py-3">Symbol</th>
                  <th className="py-3">Quantity</th>
                  <th className="py-3">Entry</th>
                  <th className="py-3">Current</th>
                  <th className="py-3">PnL</th>
                  <th className="py-3">Bot</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="py-3 text-sm">{trade.user_name}<div className="text-xs text-zinc-500">{trade.user_email}</div></td>
                    <td className="py-3 text-sm">{trade.symbol}<div className="text-xs text-zinc-500">{trade.symbol_name} · {trade.asset_type}</div></td>
                    <td className="py-3 text-sm font-mono">{trade.quantity}</td>
                    <td className="py-3 text-sm font-mono">${trade.average_entry_price.toLocaleString()}</td>
                    <td className="py-3 text-sm font-mono">
                      ${trade.current_price.toLocaleString()}
                      <div className="text-xs text-zinc-500">{trade.price_source === 'admin_override' ? 'Admin override' : 'Live market'}</div>
                    </td>
                    <td className="py-3 text-sm">
                      <div className={`font-mono ${trade.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatMoney(trade.unrealized_pnl)}
                      </div>
                      <div className={`text-xs ${trade.pnl_percent >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${trade.bot_running ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800 text-zinc-300'}`}>
                        {trade.bot_running ? 'Running' : 'Stopped'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col items-end gap-2">
                        <input
                          className="w-32 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-right text-sm font-mono"
                          type="number"
                          step="0.01"
                          value={tradePnlDrafts[trade.id] ?? trade.unrealized_pnl.toFixed(2)}
                          onChange={(e) => setTradePnlDrafts((current) => ({ ...current, [trade.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border border-yellow-500/30 px-3 py-2 text-xs font-bold text-yellow-300 transition hover:border-yellow-400 hover:text-yellow-200"
                            disabled={saving}
                            onClick={() => void handleUpdateTradePnl(trade)}
                          >
                            Save PnL
                          </button>
                          <button
                            className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 transition hover:border-rose-400 hover:text-rose-200"
                            disabled={saving}
                            onClick={() => void handleCloseTrade(trade)}
                          >
                            Close Trade
                          </button>
                        </div>
                      </div>
                    </td>
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

      {tab === 'trader-settings' && (
        <div className="space-y-6">
          <SectionCard title="Trader Profiles">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {traderProfiles.map((profile) => {
                const form = traderProfileForms[profile.id];
                if (!form) return null;

                return (
                  <div key={profile.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 font-bold">{profile.asset_type}</p>
                        <h3 className="mt-1 text-lg font-bold text-white">{profile.title}</h3>
                      </div>
                      <span className="inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300">
                        Level {profile.level}
                      </span>
                    </div>
                    <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm" value={form.title} onChange={(e) => setTraderProfileForms((current) => ({ ...current, [profile.id]: { ...form, title: e.target.value } }))} />
                    <textarea className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm" value={form.description} onChange={(e) => setTraderProfileForms((current) => ({ ...current, [profile.id]: { ...form, description: e.target.value } }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm" type="number" step="0.01" value={form.commission_percent} onChange={(e) => setTraderProfileForms((current) => ({ ...current, [profile.id]: { ...form, commission_percent: e.target.value } }))} />
                      <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm" type="number" min="1" step="1" value={form.level} onChange={(e) => setTraderProfileForms((current) => ({ ...current, [profile.id]: { ...form, level: e.target.value } }))} />
                    </div>
                    <button className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black" disabled={saving} onClick={() => void handleSaveTraderProfile(profile)}>
                      Save Trader Profile
                    </button>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Upgrade Requests">
            <div className="space-y-4">
              {traderUpgradeRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-bold text-white">{request.user_name ?? 'Unknown User'}</p>
                      <p className="text-sm text-zinc-400">{request.user_email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500 font-bold">
                        {request.asset_type} · requested level {request.requested_level} · {request.status}
                      </p>
                      {request.note && <p className="mt-3 text-sm text-zinc-300">{request.note}</p>}
                    </div>
                    <div className="w-full max-w-md space-y-3">
                      <textarea className="w-full min-h-24 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm" placeholder="Admin notes" value={upgradeReviewNotes[request.id] ?? request.admin_notes ?? ''} onChange={(e) => setUpgradeReviewNotes((current) => ({ ...current, [request.id]: e.target.value }))} />
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black" disabled={saving || request.status === 'approved'} onClick={() => void handleReviewUpgradeRequest(request, 'approved')}>
                          Approve
                        </button>
                        <button className="rounded-xl border border-rose-500/30 px-4 py-3 text-sm font-bold text-rose-300" disabled={saving || request.status === 'rejected'} onClick={() => void handleReviewUpgradeRequest(request, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {traderUpgradeRequests.length === 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 px-4 py-10 text-center text-sm text-zinc-500">
                  No trader upgrade requests yet.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="User Bot Settings">
            <div className="space-y-4">
              {userBotSettings.map((setting) => (
                <div key={setting.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-bold text-white">{setting.user_name ?? 'Unknown User'}</p>
                      <p className="text-sm text-zinc-400">{setting.user_email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500 font-bold">
                        Bot Level: {setting.bot_level} · Min Amount: ${setting.minimum_trading_amount} · Commission: {setting.commission_percent}%
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black"
                        onClick={() => setEditingUserBotSettings({
                          userId: setting.user_id,
                          botLevel: String(setting.bot_level),
                          minimumAmount: String(setting.minimum_trading_amount),
                          commissionPercent: String(setting.commission_percent),
                        })}
                      >
                        Edit Settings
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {userBotSettings.length === 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 px-4 py-10 text-center text-sm text-zinc-500">
                  No user-specific bot settings configured yet.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
