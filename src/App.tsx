import { useEffect, useState, lazy, Suspense } from 'react';
import { WelcomeScreen } from './components/auth/WelcomeScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { TopBar } from './components/TopBar';
import { Wallet as WalletIcon, Settings as SettingsIcon, CandlestickChart, X } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { Wallet } from './components/Wallet';
import { Settings } from './components/Settings';
import { Toast } from './components/Toast';
import { Button } from './components/ui/button';
import { CurrencyPair, OrderFormData } from './types';
import { clearSession, getAccessToken, getRefreshToken, getExpiresAt, saveSession, getSessionId } from './lib/storage/session';
import { getMe, getNotifications } from './lib/api/user';
import { refreshTokens } from './lib/api/auth';
import { NotificationsProvider, useNotifications, mapSocketNotification } from './lib/notifications';
import { AccountProvider } from './lib/account';
import { mockUser, mockCurrencyPairs } from './lib/mockData';
import { Spinner } from './components/ui/spinner';
import ErrorBoundary from './components/ErrorBoundary';

type Screen = 
  | 'welcome' 
  | 'login' 
  | 'signup' 
  | 'dashboard' 
  | 'markets' 
  | 'trading' 
  | 'portfolio' 
  | 'wallet' 
  | 'wallet-deposit' 
  | 'wallet-withdraw' 
  | 'transactions'
  | 'settings';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

function AppInner() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [prevScreen, setPrevScreen] = useState<Screen | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authUser, setAuthUser] = useState<{ id: string; email: string; firstName?: string; lastName?: string } | null>(null);
  const [selectedPair, setSelectedPair] = useState<CurrencyPair | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const SCREEN_STORAGE_KEY = 'mfapp.currentScreen';
  const PAIR_STORAGE_KEY = 'mfapp.selectedPair';
  const { add: addNotification, notifications, markAllRead, clear } = useNotifications();
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const refreshTimerRef = (typeof window !== 'undefined') ? (window as any).mfappRefreshTimerRef || { id: null } : { id: null };
  if (typeof window !== 'undefined') (window as any).mfappRefreshTimerRef = refreshTimerRef;

  const clearTokenRefresh = () => {
    if (refreshTimerRef.id) {
      window.clearTimeout(refreshTimerRef.id as number);
      refreshTimerRef.id = null;
    }
  };

  const scheduleTokenRefresh = () => {
    clearTokenRefresh();
    const expiresAt = getExpiresAt();
    const buffer = 60_000;
    let delay = expiresAt ? Math.max(2_000, expiresAt - Date.now() - buffer) : 55 * 60_000;
    refreshTimerRef.id = window.setTimeout(async () => {
      const access = getAccessToken();
      const refresh = getRefreshToken();
      const sessionId = getSessionId() || '';
      if (!access || !refresh) {
        scheduleTokenRefresh();
        return;
      }
      try {
        const t = await refreshTokens({ accessToken: access, refreshToken: refresh });
        const localAccess = window.localStorage.getItem('fx.accessToken');
        const remember = !!localAccess && localAccess === access;
        saveSession({ tokens: { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn }, sessionId }, remember);
        scheduleTokenRefresh();
      } catch (e: any) {
        if (e?.status === 401) {
          clearSession();
          setIsAuthenticated(false);
          setAuthUser(null);
          setCurrentScreen('welcome');
          showToast('Session expired. Please sign in again.', 'info');
        } else {
          showToast('Network issue during token refresh. Will retry.', 'info');
          refreshTimerRef.id = window.setTimeout(scheduleTokenRefresh, 30_000);
        }
      }
    }, delay);
  };

  useEffect(() => {
    if (!showNotificationsPanel) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNotificationsPanel(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [showNotificationsPanel]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type });
  };

  const handleLogin = (user: { id: string; email: string; firstName?: string; lastName?: string }) => {
    setAuthUser(user);
    setIsAuthenticated(true);
    wsClient.connect();
    setCurrentScreen('dashboard');
    const name = user.firstName || user.email || 'Trader';
    showToast(`Welcome back, ${name}!`, 'success');
    scheduleTokenRefresh();
  };

  const handleLogout = () => {
    wsClient.disconnect();
    clearSession();
    clearTokenRefresh();
    setAuthUser(null);
    setIsAuthenticated(false);
    setCurrentScreen('welcome');
    showToast('Successfully signed out.', 'info');
  };

  const handleNavigate = (screen: string) => {
    setPrevScreen(currentScreen as Screen);
    if (screen === 'trading' && !selectedPair) {
      try {
        const stored = localStorage.getItem(PAIR_STORAGE_KEY);
        const fallback = stored ? JSON.parse(stored) as CurrencyPair : (mockCurrencyPairs && mockCurrencyPairs[0] ? mockCurrencyPairs[0] : null);
        if (fallback) setSelectedPair(fallback);
        else screen = 'markets';
      } catch {
        const fallback = (mockCurrencyPairs && mockCurrencyPairs[0]) ? mockCurrencyPairs[0] : null;
        if (fallback) setSelectedPair(fallback);
        else screen = 'markets';
      }
    }
    setCurrentScreen(screen as Screen);
  };

  const handleTabChange = (tab: string) => {
    setPrevScreen(currentScreen as Screen);
    setCurrentScreen(tab as Screen);
  };

  const handleSelectPair = (pair: CurrencyPair) => {
    setSelectedPair(pair);
    setCurrentScreen('trading');
    try { localStorage.setItem(PAIR_STORAGE_KEY, JSON.stringify(pair)); } catch {}
  };

  const handlePlaceOrder = (order: OrderFormData) => {
    showToast(`${order.direction.toUpperCase()} order for ${order.lotSize} lots of ${order.pair} placed successfully!`, 'success');
    setCurrentScreen('portfolio');
  };

  const handleClosePosition = (positionId: string) => {
    console.log('Closing position:', positionId);
    showToast('Position closed successfully!', 'success');
  };

  const handleCancelOrder = (orderId: string) => {
    console.log('Cancelling order:', orderId);
    showToast('Order cancelled successfully!', 'info');
  };

  useEffect(() => {
    const bootstrap = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsInitializing(false);
        return;
      }
      try {
        const me = await getMe();
        setAuthUser(me as any);
        setIsAuthenticated(true);
        wsClient.connect();
        scheduleTokenRefresh();
        try {
          const savedScreen = localStorage.getItem(SCREEN_STORAGE_KEY);
          const allowed: Screen[] = ['dashboard','markets','trading','portfolio','wallet','transactions','settings'];
          const next = savedScreen && allowed.includes(savedScreen as Screen) ? (savedScreen as Screen) : 'dashboard';
          setCurrentScreen(next);
          const storedPair = localStorage.getItem(PAIR_STORAGE_KEY);
          if (storedPair) {
            const parsed = JSON.parse(storedPair) as CurrencyPair;
            setSelectedPair(parsed);
          }
          if (next === 'trading' && !storedPair) setCurrentScreen('markets');
        } catch {
          setCurrentScreen('dashboard');
        }
        const name = me.firstName || me.email || 'Trader';
        showToast(`Welcome back, ${name}!`, 'success');
        try {
          const initial = await getNotifications({ unreadOnly: false, limit: 20 });
          initial.forEach((n: any) => {
            const payload = {
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              data: n.data,
              createdAt: n.createdAt || n.timestamp,
              read: !!n.read,
            };
            addNotification(mapSocketNotification(payload));
          });
        } catch {}
      } catch (e: any) {
        if (e?.status === 401) {
          clearSession();
        } else {
          setIsAuthenticated(true);
          wsClient.connect();
          scheduleTokenRefresh();
          try {
            const savedScreen = localStorage.getItem(SCREEN_STORAGE_KEY);
            const allowed: Screen[] = ['dashboard','markets','trading','portfolio','wallet','transactions','settings'];
            const next = savedScreen && allowed.includes(savedScreen as Screen) ? (savedScreen as Screen) : 'dashboard';
            setCurrentScreen(next);
            const storedPair = localStorage.getItem(PAIR_STORAGE_KEY);
            if (storedPair) {
              const parsed = JSON.parse(storedPair) as CurrencyPair;
              setSelectedPair(parsed);
            }
            if (next === 'trading' && !storedPair) setCurrentScreen('markets');
          } catch {
            setCurrentScreen('dashboard');
          }
          showToast(e?.message || 'Network issue. You are still signed in.', 'info');
        }
      } finally {
        setIsInitializing(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      try { localStorage.setItem(SCREEN_STORAGE_KEY, currentScreen); } catch {}
    }
  }, [currentScreen, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      wsClient.subscribe({ channels: ['notifications'] });
      const handler = (payload: any) => {
        addNotification(mapSocketNotification(payload));
      };
      wsClient.on('notification', handler);
      return () => wsClient.off('notification', handler);
    }
  }, [isAuthenticated]);

  // Authentication screens
  if (!isAuthenticated) {
    if (isInitializing) {
      return null;
    }
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center">
        <div className="w-full max-w-md bg-white md:shadow-2xl relative">
          {currentScreen === 'welcome' && (
            <WelcomeScreen
              onSignIn={() => setCurrentScreen('login')}
              onSignUp={() => setCurrentScreen('signup')}
            />
          )}

          {currentScreen === 'login' && (
            <LoginScreen
              onBack={() => setCurrentScreen('welcome')}
              onLogin={handleLogin}
              onSignUp={() => setCurrentScreen('signup')}
              onForgotPassword={() => showToast('Password reset link sent to your email', 'info')}
              onError={(message) => showToast(message, 'error')}
            />
          )}

          {currentScreen === 'signup' && (
            <OnboardingFlow
              onDeposit={() => {
                setIsAuthenticated(true)
                setCurrentScreen('wallet-deposit')
                showToast('Account created. Deposit to start trading.', 'success')
              }}
              onSkip={() => {
                setIsAuthenticated(true)
                setCurrentScreen('dashboard')
                showToast('Account created. You can deposit anytime.', 'success')
              }}
              onCancel={() => {
                setCurrentScreen('login')
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
          )}

          {toast.show && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast({ ...toast, show: false })}
            />
          )}
        </div>
      </div>
    );
  }

  // Main app screens
  const mainScreens: Screen[] = ['dashboard', 'markets', 'trading', 'portfolio', 'wallet', 'transactions', 'settings'];
  const showTopBar = ['dashboard', 'markets', 'portfolio', 'wallet', 'transactions', 'settings'].some(screen => currentScreen.startsWith(screen));
  const showBottomNav = ['dashboard', 'markets', 'portfolio', 'wallet', 'settings'].includes(currentScreen);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-md bg-gray-50 md:shadow-2xl relative">
      {showTopBar && (
        <TopBar
          title={
            currentScreen === 'markets' ? 'Markets' :
            currentScreen === 'trading' ? undefined :
            currentScreen === 'portfolio' ? 'Portfolio' :
            currentScreen === 'wallet' || currentScreen.startsWith('wallet-') ? 'Wallet' :
            currentScreen === 'transactions' ? 'Transactions' :
            currentScreen === 'settings' ? 'Settings' :
            undefined
          }
          titleIcon={
            currentScreen === 'markets' ? <CandlestickChart className="w-5 h-5 text-white" /> :
            (currentScreen === 'wallet' || currentScreen.startsWith('wallet-')) ? <WalletIcon className="w-5 h-5 text-white" /> :
            currentScreen === 'settings' ? <SettingsIcon className="w-5 h-5 text-white" /> :
            undefined
          }
          showNotifications={currentScreen === 'dashboard'}
          onNotificationClick={() => setShowNotificationsPanel(true)}
          unreadCount={notifications.filter(n => !n.read).length}
          showBack={currentScreen === 'wallet'}
          onBackClick={() => {
            const fallback: Screen = prevScreen && prevScreen !== 'wallet' ? prevScreen : 'dashboard';
            setCurrentScreen(fallback);
          }}
        />
      )}

      

      <main className="" style={{ paddingTop: showTopBar ? 'calc(var(--safe-top) + 56px)' : undefined, paddingBottom: showBottomNav ? 'calc(var(--safe-bottom) + 64px)' : undefined }}>
        {currentScreen === 'dashboard' && (
          <ErrorBoundary label="Dashboard" onError={({ error, label, stack }) => console.error('AppError', { label, error, stack, screen: currentScreen })}>
            <Dashboard
              userName={authUser?.firstName || authUser?.email || mockUser.firstName}
              onNavigate={handleNavigate}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'markets' && (
          <ErrorBoundary label="Markets" onError={({ error, label, stack }) => console.error('AppError', { label, error, stack, screen: currentScreen })}>
            <Suspense fallback={<div className="p-6 flex justify-center"><Spinner /></div>}>
              <Markets onSelectPair={handleSelectPair} />
            </Suspense>
          </ErrorBoundary>
        )}

        {currentScreen === 'trading' && selectedPair && (
          <ErrorBoundary label="Trading" onError={({ error, label, stack }) => console.error('AppError', { label, error, stack, screen: currentScreen })}>
            <Suspense fallback={<div className="p-6 flex justify-center"><Spinner /></div>}>
              <Trading
                pair={selectedPair}
                onBack={() => setCurrentScreen('markets')}
                onPlaceOrder={handlePlaceOrder}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {currentScreen === 'trading' && !selectedPair && (
          <div className="px-4 py-8">
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600 mb-4">Select a market to start trading</p>
              <Button onClick={() => setCurrentScreen('markets')} className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg">Go to Markets</Button>
            </div>
          </div>
        )}

        {currentScreen === 'portfolio' && (
          <ErrorBoundary label="Portfolio" onError={({ error, label, stack }) => console.error('AppError', { label, error, stack, screen: currentScreen })}>
            <Suspense fallback={<div className="p-6 flex justify-center"><Spinner /></div>}>
              <Portfolio
                onClosePosition={handleClosePosition}
                onCancelOrder={handleCancelOrder}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {(currentScreen === 'wallet' || currentScreen.startsWith('wallet-')) && (
          <ErrorBoundary>
            <Wallet onNavigate={handleNavigate} />
          </ErrorBoundary>
        )}

        {currentScreen === 'transactions' && (
          <ErrorBoundary label="Transactions" onError={({ error, label, stack }) => console.error('AppError', { label, error, stack, screen: currentScreen })}>
            <Suspense fallback={<div className="p-6 flex justify-center"><Spinner /></div>}>
              <Transactions onBack={() => setCurrentScreen('wallet')} />
            </Suspense>
          </ErrorBoundary>
        )}

        {currentScreen === 'settings' && (
          <ErrorBoundary label="Settings" onError={({ error, label, stack }) => console.error('AppError', { label, error, stack, screen: currentScreen })}>
            <Settings onLogout={handleLogout} />
          </ErrorBoundary>
        )}
      </main>

      {showBottomNav && (
        <BottomNav
          activeTab={currentScreen}
          onTabChange={handleTabChange}
        />
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Screen reader live region for status updates */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast.show ? toast.message : ''}
      </div>

      {showNotificationsPanel && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowNotificationsPanel(false)}>
          <div className="fixed inset-0 bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-gray-900 font-semibold text-lg">Notifications</h2>
              <div className="flex items-center gap-3">
                <button className="text-sm text-gray-700" onClick={markAllRead}>Mark all read</button>
                <button className="text-sm text-gray-600" onClick={clear}>Clear</button>
                <button className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close" onClick={() => setShowNotificationsPanel(false)}>
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-scroll px-6 py-4 pb-24"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
              role="region"
              aria-label="Notifications list"
              tabIndex={0}
            >
              {notifications.length === 0 ? (
                <div className="p-6 text-gray-500">No notifications yet</div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-4 rounded-lg border bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">{n.title}</div>
                        <div className={`text-xs ${n.read ? 'text-gray-400' : 'text-red-600'}`}>{n.read ? 'Read' : 'New'}</div>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                      <div className="text-xs text-gray-600 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      </div>
    </div>
  );
}
export default function App() {
  return (
    <NotificationsProvider>
      <AccountProvider>
        <AppInner />
      </AccountProvider>
    </NotificationsProvider>
  );
}
import wsClient from './lib/ws/client';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
const Markets = lazy(() => import('./components/Markets').then(m => ({ default: m.Markets })));
const Trading = lazy(() => import('./components/Trading').then(m => ({ default: m.Trading })));
const Portfolio = lazy(() => import('./components/Portfolio').then(m => ({ default: m.Portfolio })));
const Transactions = lazy(() => import('./components/Transactions').then(m => ({ default: m.Transactions })));
