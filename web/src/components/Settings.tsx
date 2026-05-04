import React from 'react';
import { User, Shield, Bell, Bot, Globe, Database } from 'lucide-react';

export default function Settings({ user }: any) {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800/50">
          <h3 className="text-lg font-bold">Account Settings</h3>
        </div>
        <div className="p-6 space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-zinc-500" />
              )}
            </div>
            <div>
              <h4 className="text-lg font-bold">{user?.displayName || 'Trader'}</h4>
              <p className="text-sm text-zinc-500">{user?.email}</p>
              <button className="mt-2 text-xs font-bold text-yellow-400 hover:underline">Change Avatar</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">Display Name</label>
              <input 
                type="text" 
                defaultValue={user?.displayName || ''}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">Email Address</label>
              <input 
                type="email" 
                disabled
                defaultValue={user?.email || ''}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-zinc-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Shield size={18} />
            </div>
            <h3 className="font-bold">Simulation Preferences</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-fill Orders</p>
                <p className="text-[10px] text-zinc-500">Instantly fill paper orders at market price</p>
              </div>
              <div className="w-10 h-5 bg-yellow-500 rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Slippage Simulation</p>
                <p className="text-[10px] text-zinc-500">Add random 0.1% slippage to orders</p>
              </div>
              <div className="w-10 h-5 bg-zinc-800 rounded-full relative cursor-pointer">
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-zinc-500 rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg">
              <Bot size={18} />
            </div>
            <h3 className="font-bold">Bot Defaults</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">Default Max Allocation</label>
              <select className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-yellow-500/50 transition-all appearance-none">
                <option>5% of equity</option>
                <option selected>10% of equity</option>
                <option>20% of equity</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">Approval Mode</label>
              <select className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-yellow-500/50 transition-all appearance-none">
                <option selected>Auto-execute</option>
                <option>Manual Approval Required</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6">
        <h3 className="text-rose-400 font-bold mb-2">Danger Zone</h3>
        <p className="text-xs text-zinc-500 mb-4">Once you reset your account, all virtual funds, positions, and agents will be permanently deleted.</p>
        <button className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-400 transition-colors">
          Reset Paper Account
        </button>
      </div>
    </div>
  );
}
