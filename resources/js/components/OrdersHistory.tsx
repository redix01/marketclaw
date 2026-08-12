import React from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { Order } from '../types';

interface OrdersHistoryProps {
  orders: Order[];
  ledger: never[];
}

export default function OrdersHistory({ orders }: OrdersHistoryProps) {
  return (
    <div className="space-y-6">
      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-yellow-400" />
            <h3 className="text-lg font-bold">Grid Orders</h3>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Search orders..." 
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-yellow-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800/50">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Symbol</th>
                <th className="px-6 py-4">Side</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 text-xs text-zinc-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                    <span className="block opacity-50">{new Date(order.createdAt).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold">{order.symbol}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                      order.side === 'buy' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {order.side}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">{order.quantity}</td>
                  <td className="px-6 py-4 text-sm font-mono">${order.fillPrice?.toFixed(2) || '---'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      order.status === 'filled' ? 'bg-yellow-500/10 text-yellow-400' :
                      order.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">{order.source}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 italic">
                    No grid orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
