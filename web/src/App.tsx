import React, { useState, useEffect } from 'react';
import { useTradingData } from './hooks/useTradingData';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Trade from './components/Trade';
import OrdersHistory from './components/OrdersHistory';
import Agents from './components/Agents';
import AgentLogs from './components/AgentLogs';
import Wallet from './components/Wallet';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from './services/authService';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewingApp, setViewingApp] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  const { account, positions, orders, ledger, agents, logs } = useTradingData(isGuest ? { uid: 'guest-user' } : user);

  useEffect(() => {
    let active = true;

    void authService.restore().then((session) => {
      if (!active) return;

      if (session) {
        setIsGuest(false);
        setUser({
          uid: String(session.user.id),
          displayName: session.user.name,
          email: session.user.email,
          photoURL: session.user.avatar_url ?? null,
        });
      } else {
        setUser(null);
      }

      setAuthReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show landing page if not explicitly viewing app/demo
  if (!viewingApp && !isGuest) {
    return (
      <LandingPage 
        user={user}
        onLaunchApp={() => setViewingApp(true)} 
        onViewDemo={() => {
          setIsGuest(true);
          setViewingApp(true);
        }}
      />
    );
  }

  // Show Auth if trying to launch app but not logged in
  if (!user && viewingApp && !isGuest) {
    return (
      <Auth
        onAuthenticated={(session) => {
          setUser({
            uid: String(session.user.id),
            displayName: session.user.name,
            email: session.user.email,
            photoURL: session.user.avatar_url ?? null,
          });
        }}
      />
    );
  }

  const guestUser = {
    uid: 'guest-user',
    displayName: 'Guest Trader',
    email: 'guest@openclaw.io',
    photoURL: null
  };

  const currentUser = user || (isGuest ? guestUser : null);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard account={account} positions={positions} orders={orders} ledger={ledger} agents={agents} />;
      case 'portfolio':
        return <Portfolio account={account} positions={positions} />;
      case 'trade':
        return <Trade user={currentUser} account={account} positions={positions} />;
      case 'orders':
      case 'history':
        return <OrdersHistory orders={orders} ledger={ledger} />;
      case 'agents':
        return <Agents user={currentUser} agents={agents} positions={positions} />;
      case 'logs':
        return <AgentLogs logs={logs} />;
      case 'wallet':
        return <Wallet user={currentUser} account={account} ledger={ledger} />;
      case 'settings':
        return <Settings user={currentUser} />;
      default:
        return <Dashboard account={account} positions={positions} orders={orders} ledger={ledger} agents={agents} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={currentUser} 
      account={account}
      isGuest={isGuest}
      onExitGuest={() => {
        setIsGuest(false);
        setViewingApp(false);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
