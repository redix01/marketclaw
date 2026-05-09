import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { authService } from './services/authService';
import { useTradingData } from './hooks/useTradingData';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Trade from './components/Trade';
import Assets from './components/Assets';
import Configuration from './components/Configuration';
import Wallet from './components/Wallet';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';

const APP_TABS = ['overview', 'portfolio', 'ai-trader', 'trade', 'wallet', 'configuration', 'settings'] as const;
type AppTab = (typeof APP_TABS)[number];

function normalizeTab(tab?: string): AppTab {
  return APP_TABS.includes((tab ?? '') as AppTab) ? (tab as AppTab) : 'overview';
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
    </div>
  );
}

function DashboardShell({
  basePath,
  user,
  isGuest,
  onExitGuest,
}: {
  basePath: '/app' | '/demo';
  user: any;
  isGuest: boolean;
  onExitGuest: () => void;
}) {
  const { tab } = useParams();
  const activeTab = normalizeTab(tab);
  const { account, positions, orders, ledger, dashboard, agents, logs, symbols, closedTrades, closedTradesSummary } = useTradingData(user);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard account={account} positions={positions} orders={orders} ledger={ledger} agents={agents} dashboard={dashboard} closedTradesSummary={closedTradesSummary} />;
      case 'portfolio':
        return <Portfolio account={account} positions={positions} symbols={symbols} />;
      case 'ai-trader':
        return <Assets basePath={basePath} positions={positions} symbols={symbols} account={account} serverTrades={closedTrades} serverTradesSummary={closedTradesSummary} user={user} />;
      case 'configuration':
        return <Configuration account={account} closedTradesSummary={closedTradesSummary} />;
      case 'trade':
        return <Trade user={user} account={account} positions={positions} symbols={symbols} />;
      case 'wallet':
        return <Wallet user={user} account={account} ledger={ledger} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return <Dashboard account={account} positions={positions} orders={orders} ledger={ledger} agents={agents} dashboard={dashboard} closedTradesSummary={closedTradesSummary} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      basePath={basePath}
      user={user}
      account={account}
      isGuest={isGuest}
      onExitGuest={onExitGuest}
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

function AppRoutes({
  user,
  authReady,
  setUser,
  setIsGuest,
}: {
  user: any;
  authReady: boolean;
  setUser: (value: any) => void;
  setIsGuest: (value: boolean) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!authReady) {
    return <LoadingScreen />;
  }

  const guestUser = {
    uid: 'guest-user',
    displayName: 'Guest Trader',
    email: 'guest@marketclaw.io',
    photoURL: null,
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            user={user}
            onLaunchApp={() => navigate(user ? '/app/overview' : '/auth')}
            onViewDemo={() => {
              setIsGuest(true);
              navigate('/demo/overview');
            }}
          />
        }
      />
      <Route
        path="/auth"
        element={
          user ? (
            <Navigate to="/app/overview" replace />
          ) : (
            <Auth
              onAuthenticated={(session) => {
                setUser({
                  uid: String(session.user.id),
                  displayName: session.user.name,
                  email: session.user.email,
                  photoURL: session.user.avatar_url ?? null,
                });
                navigate('/app/overview', { replace: true });
              }}
            />
          )
        }
      />
      <Route
        path="/app"
        element={user ? <Navigate to="/app/overview" replace /> : <Navigate to="/auth" replace state={{ from: location }} />}
      />
      <Route
        path="/app/:tab"
        element={
          user ? (
            <DashboardShell
              basePath="/app"
              user={user}
              isGuest={false}
              onExitGuest={() => {
                setIsGuest(false);
                navigate('/');
              }}
            />
          ) : (
            <Navigate to="/auth" replace state={{ from: location }} />
          )
        }
      />
      <Route path="/demo" element={<Navigate to="/demo/overview" replace />} />
      <Route
        path="/demo/:tab"
        element={
          <DashboardShell
            basePath="/demo"
            user={guestUser}
            isGuest={true}
            onExitGuest={() => {
              setIsGuest(false);
              navigate('/');
            }}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let active = true;

    void authService.restore().then((session) => {
      if (!active) return;

      if (session) {
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

  return <AppRoutes user={user} authReady={authReady} setUser={setUser} setIsGuest={setIsGuest} />;
}
