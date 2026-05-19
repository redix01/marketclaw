import React from 'react';
import { 
  Bot, 
  TrendingUp, 
  Shield, 
  Zap, 
  ArrowRight,
  Target,
  Globe2,
  Coins,
  LineChart,
  Activity,
  ArrowUpRight,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  user: any;
  onLaunchApp: () => void;
  onViewDemo: () => void;
}

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="p-6 md:p-8 bg-zinc-900/40 border border-white/5 rounded-[24px] md:rounded-[32px] hover:border-yellow-500/20 transition-all group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl -z-10 group-hover:bg-yellow-500/10 transition-colors"></div>
    <div className="w-12 h-12 md:w-14 md:h-14 bg-white/5 text-yellow-400 rounded-xl md:rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform border border-white/5">
      <Icon size={24} md:size={28} />
    </div>
    <h3 className="text-xl md:text-2xl font-display font-semibold text-white mb-3 md:mb-4 uppercase tracking-tight">{title}</h3>
    <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-light">{description}</p>
  </motion.div>
);

const MarketTicker = () => {
  const markets = [
    { name: 'BTC/USD', price: '$68,421', change: '+2.4%', up: true },
    { name: 'NVDA', price: '$892.12', change: '+1.8%', up: true },
    { name: 'ETH/USD', price: '$3,842', change: '-0.5%', up: false },
    { name: 'Election 2024', price: '52¢', change: '+1.2%', up: true },
    { name: 'SPY', price: '$512.42', change: '+0.4%', up: true },
    { name: 'Solana', price: '$142.12', change: '+5.2%', up: true },
  ];

  return (
    <div className="w-full overflow-hidden bg-zinc-900/50 border-y border-white/5 py-3 md:py-4 backdrop-blur-sm">
      <div className="flex animate-marquee whitespace-nowrap gap-8 md:gap-12 px-6 md:px-12">
        {[...markets, ...markets].map((m, i) => (
          <div key={i} className="flex items-center gap-2 md:gap-3">
            <span className="text-zinc-500 font-mono text-[10px] md:text-xs uppercase tracking-widest">{m.name}</span>
            <span className="text-white font-mono font-medium text-xs md:text-sm">{m.price}</span>
            <span className={m.up ? 'text-yellow-400 font-mono text-[10px] md:text-xs' : 'text-rose-400 font-mono text-[10px] md:text-xs'}>
              {m.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function LandingPage({ user, onLaunchApp, onViewDemo }: LandingPageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-yellow-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-20 md:h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-500/40">
              <Bot className="text-black" size={24} />
            </div>
            <span className="text-xl md:text-2xl font-display font-bold tracking-tight text-white">
              MarketClaw
            </span>
          </div>
          
          <div className="hidden lg:flex items-center gap-12 text-sm font-medium text-zinc-400 uppercase tracking-widest">
            <a href="#process" className="hover:text-yellow-400 transition-colors">Workflow</a>
            <a href="#markets" className="hover:text-yellow-400 transition-colors">Markets</a>
            <a href="#demo" className="hover:text-yellow-400 transition-colors">Interface</a>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {!user && (
              <button 
                onClick={onViewDemo}
                className="hidden sm:block text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
              >
                Demo
              </button>
            )}
            <button 
              onClick={onLaunchApp}
              className="px-4 md:px-6 py-2.5 md:py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-all shadow-2xl shadow-white/10 flex items-center gap-2 uppercase text-[9px] md:text-[10px] tracking-widest"
            >
              {user ? 'Dashboard' : 'Launch'} <ArrowUpRight size={14} className="hidden xs:block" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#050505] border-b border-white/5 overflow-hidden"
            >
              <div className="px-8 py-8 flex flex-col gap-6 text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
                <a href="#process" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-yellow-400 transition-colors">Workflow</a>
                <a href="#markets" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-yellow-400 transition-colors">Markets</a>
                <a href="#demo" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-yellow-400 transition-colors">Interface</a>
                <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                  {!user && (
                    <button 
                      onClick={() => {
                        onViewDemo();
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-left text-zinc-500 hover:text-white transition-colors"
                    >
                      View Demo
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      onLaunchApp();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    {user ? 'Go to Dashboard' : 'Launch Terminal'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-48 pb-20 md:pb-32 px-4 md:px-8 overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] md:h-[800px] bg-yellow-500/5 blur-[120px] md:blur-[160px] rounded-full -z-10"></div>
        
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6 md:mb-8">
                <span className="w-8 md:w-12 h-[1px] bg-yellow-500"></span>
                <span className="text-yellow-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">
                  Autonomous Financial Intelligence
                </span>
              </div>
              
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[110px] font-display font-bold tracking-tighter text-white mb-8 md:mb-10 leading-[0.9] uppercase">
                Trade <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-400 to-zinc-500">
                  Beyond
                </span> <br />
                Limits
              </h1>
              
              <p className="max-w-xl mx-auto lg:mx-0 text-zinc-400 text-lg md:text-2xl mb-10 md:mb-14 leading-relaxed font-light">
                The world's first agentic terminal for <span className="text-white font-medium">Stocks</span>, <span className="text-white font-medium">Crypto</span>, and <span className="text-white font-medium">Prediction Markets</span>.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6">
                <button 
                  onClick={onLaunchApp}
                  className="w-full sm:w-auto px-8 py-4 bg-yellow-500 text-black rounded-full font-bold text-base hover:scale-105 transition-all shadow-2xl shadow-yellow-500/40 flex items-center justify-center gap-3 uppercase tracking-wider"
                >
                  {user ? 'Enter Dashboard' : 'Start Trading'} <ArrowRight size={18} />
                </button>
                {!user && (
                  <button 
                    onClick={onViewDemo}
                    className="w-full sm:w-auto px-8 py-4 bg-transparent text-white rounded-full font-bold text-base hover:bg-white/5 transition-all border border-white/10 flex items-center justify-center gap-3 uppercase tracking-wider"
                  >
                    View Live Demo
                  </button>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative hidden sm:block"
            >
              <div className="relative aspect-[4/5] rounded-[32px] md:rounded-[40px] border border-white/10 bg-zinc-900/50 p-3 md:p-4 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent opacity-50"></div>
                <div className="h-full w-full rounded-[24px] md:rounded-[32px] overflow-hidden border border-white/5 relative">
                  <img 
                    src="https://picsum.photos/seed/premium-trading/1000/1200" 
                    alt="Terminal Interface" 
                    className="w-full h-full object-cover opacity-40 grayscale group-hover:scale-110 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-12 text-center bg-black/40 backdrop-blur-sm">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-yellow-500 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 shadow-2xl shadow-yellow-500/50">
                      <Activity size={32} className="text-black md:hidden" />
                      <Activity size={48} className="text-black hidden md:block" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4 uppercase tracking-tight">Real-Time Execution</h3>
                    <p className="text-zinc-400 text-base md:text-lg font-light leading-relaxed">
                      Watch your agents navigate complex liquidity across Polymarket, Binance, and NASDAQ.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Floating Stat Cards - Hidden on small mobile */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 md:-top-10 md:-right-10 p-4 md:p-6 bg-zinc-900/90 border border-white/10 rounded-xl md:rounded-2xl backdrop-blur-xl shadow-2xl hidden md:block"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center text-yellow-400">
                    <TrendingUp size={16} md:size={20} />
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Win Rate</p>
                    <p className="text-lg md:text-xl font-mono font-bold text-white">92.4%</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-6 -left-6 md:-bottom-10 md:-left-10 p-4 md:p-6 bg-zinc-900/90 border border-white/10 rounded-xl md:rounded-2xl backdrop-blur-xl shadow-2xl hidden md:block"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                    <Target size={16} md:size={20} />
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Polymarket</p>
                    <p className="text-lg md:text-xl font-mono font-bold text-white">52¢ → 84¢</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <MarketTicker />

      {/* The Process Section */}
      <section id="process" className="py-32 px-8 border-b border-white/5">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-24">
            <span className="text-yellow-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6 block">
              Workflow
            </span>
            <h2 className="text-4xl md:text-6xl font-display font-bold text-white uppercase tracking-tighter">
              From Prompt to <span className="text-yellow-500">Profit</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { 
                step: '01', 
                title: 'Define Strategy', 
                desc: 'Describe your trading logic in natural language. Our LLM engine translates your intent into executable code.' 
              },
              { 
                step: '02', 
                title: 'Backtest & Refine', 
                desc: 'Run your agent through historical data and edge cases. Adjust risk parameters and allocation on the fly.' 
              },
              { 
                step: '03', 
                title: 'Live Simulation', 
                desc: 'Deploy to our high-fidelity environment. Watch your agent navigate real-time liquidity with zero capital risk.' 
              }
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="text-8xl font-display font-black text-white/5 absolute -top-12 -left-4 group-hover:text-yellow-500/10 transition-colors">
                  {item.step}
                </div>
                <div className="relative pt-8">
                  <h3 className="text-2xl font-display font-bold text-white mb-4 uppercase tracking-tight">{item.title}</h3>
                  <p className="text-zinc-500 leading-relaxed font-light">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets Section */}
      <section id="markets" className="py-32 px-8 bg-[#080808]">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-5xl md:text-7xl font-display font-bold text-white mb-8 uppercase tracking-tighter">
                Unified <br /> Liquidity
              </h2>
              <p className="text-zinc-500 text-xl font-light leading-relaxed">
                One terminal to rule them all. Deploy agents that understand the correlation between prediction markets, spot crypto, and traditional equities.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-400">
                <Globe2 size={32} />
              </div>
              <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-400">
                <Coins size={32} />
              </div>
              <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-400">
                <LineChart size={32} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Target}
              title="Polymarket Mastery"
              description="Agents that analyze sentiment and probability on prediction markets to hedge or speculate on real-world events."
              delay={0.1}
            />
            <FeatureCard 
              icon={Coins}
              title="Crypto Native"
              description="Deep integration with DEXs and CEXs. Execute complex strategies across DeFi and spot markets instantly."
              delay={0.2}
            />
            <FeatureCard 
              icon={LineChart}
              title="Equity Intelligence"
              description="Traditional stock market analysis powered by real-time data and institutional-grade execution models."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Interface Section */}
      <section id="demo" className="py-32 px-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[500px] bg-yellow-500/5 blur-[120px] rounded-full -z-10"></div>
        
        <div className="max-w-[1400px] mx-auto text-center">
          <div className="mb-20">
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-[0.3em] mb-6 block">
              The Command Center
            </span>
            <h2 className="text-5xl md:text-7xl font-display font-bold text-white mb-8 uppercase tracking-tighter">
              Agentic <br /> Control
            </h2>
          </div>

          <div className="relative mx-auto max-w-6xl rounded-[40px] border border-white/10 bg-zinc-900/30 p-4 shadow-2xl backdrop-blur-sm overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent"></div>
            <div className="aspect-video rounded-[32px] overflow-hidden border border-white/5 relative">
              <img 
                src="https://picsum.photos/seed/dashboard-premium/1600/900" 
                alt="Dashboard" 
                className="w-full h-full object-cover opacity-30 grayscale group-hover:scale-105 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={onViewDemo}
                  className="group/btn relative p-1"
                >
                  <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 group-hover/btn:opacity-40 transition-opacity"></div>
                  <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform">
                    <Zap size={32} fill="currentColor" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Fidelity Section */}
      <section className="py-32 px-8 border-y border-white/5">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-display font-bold text-white uppercase tracking-tighter mb-10">
                Institutional <br /> <span className="text-yellow-500">Fidelity</span>
              </h2>
              <div className="space-y-8">
                {[
                  { title: 'Real-Time Data Feeds', desc: 'Direct WebSocket connections to major exchanges ensuring millisecond accuracy in simulation.' },
                  { title: 'Slippage Modeling', desc: 'Advanced algorithms that simulate order book depth and market impact for realistic execution.' },
                  { title: 'Secure Sandboxing', desc: 'Every agent runs in an isolated, secure environment with strict resource allocation.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center text-yellow-400 shrink-0">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-display font-bold text-white mb-2 uppercase tracking-tight">{item.title}</h4>
                      <p className="text-zinc-500 font-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-[40px] border border-white/10 bg-zinc-900/50 p-8 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.1)_0%,transparent_70%)]"></div>
                <div className="relative grid grid-cols-2 gap-4 w-full">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="aspect-video bg-black/40 border border-white/5 rounded-2xl animate-pulse"></div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield size={120} className="text-yellow-500/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32 px-4 md:px-8 bg-[#080808]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white uppercase tracking-tighter">Common Inquiries</h2>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            {[
              { q: "Is this real money?", a: "No. MarketClaw is a high-fidelity paper trading simulator. It uses real-time market data but all capital is simulated." },
              { q: "Which AI models power the agents?", a: "We primarily use Google's Gemini 1.5 Pro and Flash models, optimized for financial reasoning and low-latency execution." },
              { q: "Can I export my strategies?", a: "Yes, all agent logic can be exported as standardized JSON or Python-compatible scripts for use in external environments." },
              { q: "What markets are supported?", a: "We support NASDAQ/NYSE equities, major crypto pairs via Binance/Coinbase feeds, and Polymarket prediction contracts." }
            ].map((item, i) => (
              <div key={i} className="p-6 md:p-8 bg-zinc-900/40 border border-white/5 rounded-2xl md:rounded-3xl">
                <h4 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 uppercase tracking-tight">{item.q}</h4>
                <p className="text-zinc-500 text-sm md:text-base font-light leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 md:py-48 px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto text-center">
          <h2 className="text-5xl sm:text-7xl md:text-9xl font-display font-bold text-white mb-10 md:mb-16 uppercase tracking-tighter leading-[0.9] md:leading-[0.8]">
            The Future <br /> is <span className="text-yellow-500">Autonomous</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8">
            <button 
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-full font-bold text-lg md:text-xl hover:scale-105 transition-all shadow-2xl shadow-white/10 uppercase tracking-widest"
            >
              Get Started
            </button>
            <p className="text-zinc-500 text-xs md:text-sm font-light uppercase tracking-[0.2em]">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 border-t border-white/5 px-8 bg-[#050505]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-24">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <Bot className="text-black" size={24} />
                </div>
                <span className="text-2xl font-display font-bold text-white">MarketClaw</span>
              </div>
              <p className="text-zinc-500 text-lg font-light max-w-md leading-relaxed">
                Empowering traders with autonomous financial intelligence across every asset class.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-8">Platform</h4>
              <ul className="space-y-4 text-zinc-500 text-sm">
                <li><a href="#process" className="hover:text-white transition-colors">Workflow</a></li>
                <li><a href="#markets" className="hover:text-white transition-colors">Markets</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Interface</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.4em] font-bold">
              © 2026 MarketClaw. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
