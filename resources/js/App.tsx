import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { authService } from './services/authService';
import { useTradingData } from './hooks/useTradingData';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AdminAuth from './components/AdminAuth';
import AdminConsole from './components/AdminConsole';
import AdminLayout from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Assets from './components/Assets';
import Wallet from './components/Wallet';
import WalletDepositPage from './components/WalletDepositPage';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';

const APP_TABS = ['overview', 'portfolio', 'ai-trader', 'wallet', 'settings'] as const;
type AppTab = (typeof APP_TABS)[number];
const ADMIN_TABS = ['dashboard', 'users', 'transactions', 'payment-methods', 'trades', 'trader-settings', 'settings'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

function normalizeTab(tab?: string): AppTab {
  return APP_TABS.includes((tab ?? '') as AppTab) ? (tab as AppTab) : 'overview';
}

function normalizeAdminTab(tab?: string): AdminTab {
  return ADMIN_TABS.includes((tab ?? '') as AdminTab) ? (tab as AdminTab) : 'dashboard';
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
    </div>
  );
}

function AdminShell({
  user,
}: {
  user: any;
}) {
  const { tab } = useParams();
  const activeTab = normalizeAdminTab(tab);

  return (
    <AdminLayout
      activeTab={activeTab}
      user={user}
      onLogout={() => {
        void authService.logout().then(() => {
          window.location.href = '/admin/login';
        });
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
          <AdminConsole tab={activeTab} />
        </motion.div>
      </AnimatePresence>
    </AdminLayout>
  );
}

function DashboardShell({
  basePath,
  user,
  isGuest,
  onExitGuest,
  onLogout,
}: {
  basePath: '/app' | '/demo';
  user: any;
  isGuest: boolean;
  onExitGuest: () => void;
  onLogout?: () => void;
}) {
  const { tab } = useParams();
  const activeTab = normalizeTab(tab);
  const { account, positions, orders, ledger, dashboard, preferences, agents, logs, symbols, closedTrades, closedTradesSummary } = useTradingData(user);
  const holdingsValue = positions.reduce((sum, position) => (
    sum + (position.marketValue ?? position.quantity * (position.currentPrice ?? position.averageEntryPrice))
  ), 0);
  const totalEquity = dashboard?.summary.totalEquity ?? ((account?.cashBalance ?? 0) + holdingsValue);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard account={account} positions={positions} orders={orders} ledger={ledger} agents={agents} dashboard={dashboard} preferences={preferences} closedTradesSummary={closedTradesSummary} />;
      case 'portfolio':
        return <Portfolio user={user} account={account} positions={positions} symbols={symbols} />;
      case 'ai-trader':
        return <Assets basePath={basePath} positions={positions} symbols={symbols} account={account} serverTrades={closedTrades} serverTradesSummary={closedTradesSummary} user={user} />;
      case 'wallet':
        return <Wallet user={user} account={account} ledger={ledger} basePath={basePath} totalEquity={totalEquity} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return <Dashboard account={account} positions={positions} orders={orders} ledger={ledger} agents={agents} dashboard={dashboard} preferences={preferences} closedTradesSummary={closedTradesSummary} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      basePath={basePath}
      user={user}
      account={account}
      totalEquity={totalEquity}
      isGuest={isGuest}
      onExitGuest={onExitGuest}
      onLogout={onLogout}
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

function WalletDepositShell({
  basePath,
  user,
  isGuest,
  onExitGuest,
  onLogout,
}: {
  basePath: '/app' | '/demo';
  user: any;
  isGuest: boolean;
  onExitGuest: () => void;
  onLogout?: () => void;
}) {
  const { account } = useTradingData(user);
  const totalEquity = account?.cashBalance ?? 0;

  return (
    <Layout
      activeTab="wallet"
      basePath={basePath}
      user={user}
      account={account}
      totalEquity={totalEquity}
      isGuest={isGuest}
      onExitGuest={onExitGuest}
      onLogout={onLogout}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="wallet-deposit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <WalletDepositPage user={user} basePath={basePath} />
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

  const handleLogout = () => {
    void authService.logout().then(() => {
      setIsGuest(false);
      setUser(null);
      navigate('/', { replace: true });
    });
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            user={user}
            onLaunchApp={() => navigate(user ? (user.is_admin ? '/admin/dashboard' : '/app/overview') : '/auth')}
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
            <Navigate to={user.is_admin ? '/admin/dashboard' : '/app/overview'} replace />
          ) : (
            <Auth
              onAuthenticated={(session) => {
                setUser({
                  uid: String(session.user.id),
                  displayName: session.user.name,
                  email: session.user.email,
                  photoURL: session.user.avatar_url ?? null,
                  is_admin: session.user.is_admin ?? false,
                });
                navigate(session.user.is_admin ? '/admin/dashboard' : '/app/overview', { replace: true });
              }}
            />
          )
        }
      />
      <Route
        path="/admin"
        element={user?.is_admin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/admin/login" replace />}
      />
      <Route
        path="/admin/login"
        element={
          user?.is_admin ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <AdminAuth
              onAuthenticated={(session) => {
                setUser({
                  uid: String(session.user.id),
                  displayName: session.user.name,
                  email: session.user.email,
                  photoURL: session.user.avatar_url ?? null,
                  is_admin: session.user.is_admin ?? false,
                });
                navigate('/admin/dashboard', { replace: true });
              }}
            />
          )
        }
      />
      <Route
        path="/admin/:tab"
        element={
          user?.is_admin ? (
            <AdminShell user={user} />
          ) : (
            <Navigate to="/admin/login" replace state={{ from: location }} />
          )
        }
      />
      <Route
        path="/app"
        element={user ? <Navigate to="/app/overview" replace /> : <Navigate to="/auth" replace state={{ from: location }} />}
      />
      <Route
        path="/dashboard"
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
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/auth" replace state={{ from: location }} />
          )
        }
      />
      <Route
        path="/dashboard/:tab"
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
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/auth" replace state={{ from: location }} />
          )
        }
      />
      <Route
        path="/app/wallet/deposit"
        element={
          user ? (
            <WalletDepositShell
              basePath="/app"
              user={user}
              isGuest={false}
              onExitGuest={() => {
                setIsGuest(false);
                navigate('/');
              }}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/auth" replace state={{ from: location }} />
          )
        }
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
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/auth" replace state={{ from: location }} />
          )
        }
      />
      <Route path="/demo" element={<Navigate to="/demo/overview" replace />} />
      <Route
        path="/demo/wallet/deposit"
        element={
          <WalletDepositShell
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
          is_admin: session.user.is_admin ?? false,
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
