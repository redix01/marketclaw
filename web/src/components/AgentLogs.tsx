import React from 'react';
import { ScrollText, Filter, Search, ChevronDown, AlertCircle, Bot, Zap, Shield } from 'lucide-react';
import { AgentLog } from '../types';

interface AgentLogsProps {
  logs: AgentLog[];
}

export default function AgentLogs({ logs }: AgentLogsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 text-yellow-400 rounded-xl">
              <ScrollText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Agent Activity Logs</h3>
              <p className="text-xs text-zinc-500">Real-time decision stream from your trading bots</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Filter logs..." 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-yellow-500/50 transition-all"
              />
            </div>
            <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    log.eventType === 'decision' ? 'bg-blue-500/10 text-blue-400' :
                    log.eventType === 'risk_block' ? 'bg-rose-500/10 text-rose-400' :
                    log.eventType === 'order_submitted' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {log.eventType === 'decision' ? <Zap size={14} /> :
                     log.eventType === 'risk_block' ? <Shield size={14} /> :
                     log.eventType === 'order_submitted' ? <Bot size={14} /> :
                     <ScrollText size={14} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{log.eventType.replace('_', ' ')}</span>
                      {log.symbol && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700 font-mono">
                          {log.symbol}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <button className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors">
                  <ChevronDown size={16} />
                </button>
              </div>
              
              <p className="text-sm text-zinc-300 leading-relaxed pl-10">
                {log.summary}
              </p>

              {log.details && (
                <div className="mt-3 ml-10 p-3 bg-black/30 rounded-lg border border-zinc-800/50 hidden group-hover:block transition-all">
                  <pre className="text-[10px] font-mono text-zinc-500 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {logs.length === 0 && (
            <div className="py-20 text-center">
              <ScrollText size={48} className="mx-auto text-zinc-800 mb-4 opacity-20" />
              <p className="text-sm text-zinc-500 italic">No activity logs found. Start an agent to see its decisions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
