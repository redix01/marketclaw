import React, { useState } from 'react';
import { 
  Plus, 
  Play, 
  Square, 
  Settings2, 
  Activity, 
  AlertCircle, 
  Bot, 
  ChevronRight,
  Zap,
  Shield,
  Target
} from 'lucide-react';
import { Agent, AgentStatus, Position } from '../types';
import { AGENT_TEMPLATES, MOCK_SYMBOLS } from '../constants';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { tradingService } from '../services/tradingService';

interface AgentsProps {
  user: any;
  agents: Agent[];
  positions: Position[];
}

export default function Agents({ user, agents, positions }: AgentsProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0] || null);
  const [ticking, setTicking] = useState(false);

  const handleManualTick = async () => {
    if (!selectedAgent || ticking) return;
    setTicking(true);
    try {
      await tradingService.tickAgent(selectedAgent, positions);
    } catch (err) {
      console.error("Tick failed", err);
    } finally {
      setTicking(false);
    }
  };

  const toggleAgentStatus = async (agent: Agent) => {
    const newStatus: AgentStatus = agent.status === 'running' ? 'stopped' : 'running';
    await updateDoc(doc(db, 'agents', agent.id), { status: newStatus });
  };

  const deleteAgent = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await deleteDoc(doc(db, 'agents', id));
      if (selectedAgent?.id === id) setSelectedAgent(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Agent List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Your Agents</h3>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="p-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className={`w-full p-4 rounded-2xl border text-left transition-all ${
              selectedAgent?.id === agent.id 
                ? 'bg-yellow-500/5 border-yellow-500/30 ring-1 ring-yellow-500/30' 
                : 'bg-[#0F0F11] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${agent.status === 'running' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  <Bot size={20} />
                </div>
                <div>
                  <p className="font-bold text-white">{agent.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{agent.template.replace('_', ' ')}</p>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${agent.status === 'running' ? 'bg-yellow-500 animate-pulse' : 'bg-zinc-600'}`}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-800/50">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Symbols</p>
                <p className="text-xs font-mono text-zinc-300">{agent.symbols.length} active</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Allocation</p>
                <p className="text-xs font-mono text-zinc-300">{agent.maxAllocation}%</p>
              </div>
            </div>
          </button>
        ))}

        {agents.length === 0 && (
          <div className="p-12 text-center bg-[#0F0F11] border border-dashed border-zinc-800 rounded-2xl">
            <Bot size={40} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-sm text-zinc-500">No agents created yet.</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 text-yellow-400 text-xs font-bold hover:underline"
            >
              Create your first agent
            </button>
          </div>
        )}
      </div>

      {/* Agent Workspace */}
      <div className="lg:col-span-2">
        {selectedAgent ? (
          <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <Bot size={24} className="text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedAgent.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                      selectedAgent.status === 'running' 
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' 
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}>
                      {selectedAgent.status}
                    </span>
                    <span className="text-[10px] text-zinc-500">•</span>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Last tick: {selectedAgent.lastTickAt ? new Date(selectedAgent.lastTickAt).toLocaleTimeString() : 'Never'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleAgentStatus(selectedAgent)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    selectedAgent.status === 'running'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-yellow-500 text-black hover:bg-yellow-400'
                  }`}
                >
                  {selectedAgent.status === 'running' ? <><Square size={16} /> Stop</> : <><Play size={16} /> Start</>}
                </button>
                <button className="p-2 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-colors">
                  <Settings2 size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-6 md:col-span-2">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <Zap size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Strategy</span>
                    </div>
                    <p className="text-sm font-bold capitalize">{selectedAgent.template.replace('_', ' ')}</p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <Target size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Allocation</span>
                    </div>
                    <p className="text-sm font-bold">{selectedAgent.maxAllocation}%</p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <Shield size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Risk Gate</span>
                    </div>
                    <p className="text-sm font-bold text-yellow-400">Active</p>
                  </div>
                </div>

                <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-yellow-400" />
                    Performance Overview
                  </h3>
                  <div className="h-48 flex items-center justify-center text-zinc-600 italic text-xs">
                    Performance chart will appear after 24h of activity.
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50">
                  <h3 className="text-sm font-bold mb-4">Watching Symbols</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.symbols.map(s => (
                      <span key={s} className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-mono border border-zinc-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50">
                  <h3 className="text-sm font-bold mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={handleManualTick}
                      disabled={ticking || selectedAgent.status !== 'running'}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                        ticking || selectedAgent.status !== 'running'
                          ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {ticking ? (
                        <div className="w-3 h-3 border-2 border-zinc-500 border-t-zinc-300 rounded-full animate-spin"></div>
                      ) : (
                        <Zap size={14} />
                      )}
                      Manual Tick
                    </button>
                    <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors">
                      Clone Agent
                    </button>
                    <button 
                      onClick={() => deleteAgent(selectedAgent.id)}
                      className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-colors"
                    >
                      Delete Agent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 bg-[#0F0F11] border border-zinc-800/50 rounded-2xl p-12">
            <Bot size={64} className="mb-6 opacity-20" />
            <h3 className="text-xl font-bold text-zinc-300 mb-2">No Agent Selected</h3>
            <p className="text-sm max-w-xs text-center">Select an agent from the list or create a new one to start automated trading.</p>
          </div>
        )}
      </div>

      {/* Create Agent Modal */}
      {isCreateModalOpen && (
        <CreateAgentModal 
          user={user} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
    </div>
  );
}

function CreateAgentModal({ user, onClose }: any) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    template: AGENT_TEMPLATES[0].id,
    symbols: ['AAPL', 'BTC'],
    maxAllocation: 10,
    maxPositionSize: 1000,
    tickFrequency: '1h'
  });

  const handleCreate = async () => {
    const agentRef = doc(collection(db, 'agents'));
    const newAgent: Agent = {
      id: agentRef.id,
      uid: user.uid,
      name: formData.name || 'New Agent',
      template: formData.template,
      symbols: formData.symbols,
      status: 'stopped',
      maxAllocation: formData.maxAllocation,
      maxPositionSize: formData.maxPositionSize,
      tickFrequency: formData.tickFrequency,
      createdAt: new Date().toISOString()
    };
    await setDoc(agentRef, newAgent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0F0F11] border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Create New Agent</h3>
            <p className="text-xs text-zinc-500">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Agent Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Trend Rider Alpha"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-3 block">Choose Strategy Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AGENT_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setFormData({...formData, template: t.id})}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.template === t.id 
                          ? 'bg-yellow-500/5 border-yellow-500/30 ring-1 ring-yellow-500/30' 
                          : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <p className="font-bold text-sm text-white">{t.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-3 block">Symbols to Watch</label>
                <div className="flex flex-wrap gap-2">
                  {MOCK_SYMBOLS.map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => {
                        const newSymbols = formData.symbols.includes(s.symbol)
                          ? formData.symbols.filter(sym => sym !== s.symbol)
                          : [...formData.symbols, s.symbol];
                        setFormData({...formData, symbols: newSymbols});
                      }}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                        formData.symbols.includes(s.symbol)
                          ? 'bg-yellow-500 text-black border-yellow-500'
                          : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {s.symbol}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Tick Frequency</label>
                <select 
                  value={formData.tickFrequency}
                  onChange={(e) => setFormData({...formData, tickFrequency: e.target.value})}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all appearance-none"
                >
                  <option value="5m">Every 5 minutes</option>
                  <option value="15m">Every 15 minutes</option>
                  <option value="1h">Every hour</option>
                  <option value="4h">Every 4 hours</option>
                  <option value="1d">Once a day</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Max Allocation (%)</label>
                  <input 
                    type="number" 
                    value={formData.maxAllocation}
                    onChange={(e) => setFormData({...formData, maxAllocation: parseInt(e.target.value)})}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Max Pos Size ($)</label>
                  <input 
                    type="number" 
                    value={formData.maxPositionSize}
                    onChange={(e) => setFormData({...formData, maxPositionSize: parseInt(e.target.value)})}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <Shield size={16} />
                  <span className="text-xs font-bold">Risk Management Active</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  OpenClaw risk gates will automatically block any agent orders that exceed your account buying power or violate your max allocation rules.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-between">
          <button 
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="px-6 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-300 disabled:opacity-0 transition-all"
          >
            Back
          </button>
          <button 
            onClick={() => step === 3 ? handleCreate() : setStep(step + 1)}
            className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
          >
            {step === 3 ? 'Create Agent' : 'Next Step'}
          </button>
        </div>
      </div>
    </div>
  );
}
