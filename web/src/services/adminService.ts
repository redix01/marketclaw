import { apiFetch } from './api';
import { AdminStats, AdminTrade, AdminTransaction, AdminUserRow, DepositRequestRow, PaymentMethod, TraderProfile, TraderUpgradeRequest } from '../types';

export const adminService = {
  async getDashboard(): Promise<{ stats: AdminStats; recent_deposit_requests: DepositRequestRow[] }> {
    const response = await apiFetch<{ data: { stats: AdminStats; recent_deposit_requests: DepositRequestRow[] } }>('/admin/dashboard');
    return response.data;
  },

  async getUsers(): Promise<AdminUserRow[]> {
    const response = await apiFetch<{ data: AdminUserRow[] }>('/admin/users');
    return response.data;
  },

  async createUser(payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: AdminUserRow }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateUser(userId: number, payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: AdminUserRow }>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async deleteUser(userId: number) {
    await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
  },

  async getTransactions(): Promise<AdminTransaction[]> {
    const response = await apiFetch<{ data: AdminTransaction[] }>('/admin/transactions');
    return response.data;
  },

  async createTransaction(payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: AdminTransaction }>('/admin/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateTransaction(transactionId: number, payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: AdminTransaction }>(`/admin/transactions/${transactionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async deleteTransaction(transactionId: number) {
    await apiFetch(`/admin/transactions/${transactionId}`, { method: 'DELETE' });
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await apiFetch<{ data: PaymentMethod[] }>('/admin/payment-methods');
    return response.data;
  },

  async createPaymentMethod(payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: PaymentMethod }>('/admin/payment-methods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updatePaymentMethod(methodId: number, payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: PaymentMethod }>(`/admin/payment-methods/${methodId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async deletePaymentMethod(methodId: number) {
    await apiFetch(`/admin/payment-methods/${methodId}`, { method: 'DELETE' });
  },

  async getDepositRequests(): Promise<DepositRequestRow[]> {
    const response = await apiFetch<{ data: DepositRequestRow[] }>('/admin/deposit-requests');
    return response.data;
  },

  async reviewDepositRequest(requestId: number, payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: DepositRequestRow }>(`/admin/deposit-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async deleteDepositRequest(requestId: number) {
    await apiFetch(`/admin/deposit-requests/${requestId}`, { method: 'DELETE' });
  },

  async getTrades(): Promise<AdminTrade[]> {
    const response = await apiFetch<{ data: AdminTrade[] }>('/admin/trades');
    return response.data;
  },

  async updateTrade(tradeId: number, payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: AdminTrade }>(`/admin/trades/${tradeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async closeTrade(tradeId: number) {
    await apiFetch(`/admin/trades/${tradeId}/close`, {
      method: 'POST',
    });
  },

  async getTraderProfiles(): Promise<TraderProfile[]> {
    const response = await apiFetch<{ data: TraderProfile[] }>('/admin/trader-profiles');
    return response.data;
  },

  async updateTraderProfile(profileId: number, payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: TraderProfile }>(`/admin/trader-profiles/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async getTraderUpgradeRequests(): Promise<TraderUpgradeRequest[]> {
    const response = await apiFetch<{ data: TraderUpgradeRequest[] }>('/admin/trader-upgrade-requests');
    return response.data;
  },

  async updateTraderUpgradeRequest(requestId: number, payload: Record<string, unknown>) {
    const response = await apiFetch<{ data: TraderUpgradeRequest }>(`/admin/trader-upgrade-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updatePassword(payload: Record<string, unknown>) {
    await apiFetch('/admin/settings/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
