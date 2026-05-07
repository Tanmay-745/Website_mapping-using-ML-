import { useState, useEffect, useCallback } from 'react';
import { FileText, Database, ScanLine, X, Sun, Moon, Mail, Activity, LogOut, User as UserIcon } from 'lucide-react';
import { Login } from './components/Login';

const LAN_HOST = window.location.hostname || 'localhost';
const appUrl = (port: number, path = '') => `http://${LAN_HOST}:${port}${path}`;

// Configuration for the apps
const APPS = [
  { id: 'legal-mapping', name: 'Legal Mapping', url: appUrl(5175, '/mapping/'), icon: Database },
  { id: 'legal-pro', name: 'Legal Pro', url: appUrl(3001, '/ai/'), icon: FileText },
  { id: 'barcode', name: 'Barcode', url: appUrl(3000), icon: ScanLine },
  { id: 'dpd-tracker', name: 'DPD Tracker', url: appUrl(5174), icon: Activity },
  { id: 'cover-letter', name: 'Cover Letter', url: appUrl(5001), icon: Mail }
];

interface CurrentUser {
  role: 'admin' | 'lender';
  lenderName?: string;
}

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('portal_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeApp, setActiveApp] = useState(APPS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [reloadKeys, setReloadKeys] = useState<Record<string, number>>({});
  
  // Track which apps have been visited to lazy-load iframes
  const [visitedApps, setVisitedApps] = useState<Set<string>>(new Set([APPS[0].id]));
  // Track loading status of each app's iframe
  const [loadingApps, setLoadingApps] = useState<Record<string, boolean>>({ [APPS[0].id]: true });

  // Broadcast function to all iframes
  const broadcastToIframes = useCallback((message: any) => {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      iframe.contentWindow?.postMessage(message, '*');
    });
  }, []);

  const handleAppChange = (app: typeof APPS[0]) => {
    if (app.id === activeApp.id) return;
    
    setActiveApp(app);
    if (!visitedApps.has(app.id)) {
      setVisitedApps(prev => new Set(prev).add(app.id));
      setLoadingApps(prev => ({ ...prev, [app.id]: true }));
    }
  };

  const handleIframeLoad = (appId: string) => {
    setLoadingApps(prev => ({ ...prev, [appId]: false }));
  };

  const handleRefresh = (appId: string) => {
    setLoadingApps(prev => ({ ...prev, [appId]: true }));
    setReloadKeys(prev => ({
      ...prev,
      [appId]: (prev[appId] || 0) + 1
    }));
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Broadcast theme change to child iframes
    broadcastToIframes({ type: 'THEME_CHANGE', isDark: isDarkMode });
  }, [isDarkMode, broadcastToIframes]);

  // Broadcast user context whenever it changes or a new app is selected
  useEffect(() => {
    if (currentUser) {
      broadcastToIframes({ 
        type: 'USER_CONTEXT', 
        role: currentUser.role, 
        lenderName: currentUser.lenderName 
      });
    }
  }, [currentUser, activeApp, broadcastToIframes]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SWITCH_APP' && event.data?.appId) {
        const targetApp = APPS.find(app => app.id === event.data.appId);
        if (targetApp) {
          handleAppChange(targetApp);

          // Broadcast to child iframes that this app was activated
          broadcastToIframes({
            type: 'APP_ACTIVATED',
            appId: event.data.appId,
            action: event.data.action
          });
        }
      } else if (event.data?.type === 'RELOAD_APP' && event.data?.appId) {
        broadcastToIframes({
          type: 'APP_RELOAD',
          appId: event.data.appId,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [broadcastToIframes, activeApp]);

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    localStorage.setItem('portal_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('portal_user');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 overflow-hidden font-sans text-gray-900 dark:text-gray-100 selection:bg-blue-200 dark:selection:bg-blue-800">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar - Enhanced with Backdrop Blur and Shadow */}
      <div className={`relative z-20 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-r border-white/40 dark:border-gray-700/50 shadow-2xl transition-all duration-500 ease-in-out flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-100/50 dark:border-gray-700/50 relative">
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <Database size={18} />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">Legal <span className="font-black text-blue-700 dark:text-blue-300">X</span></span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg text-gray-500 transition-all duration-200 hover:scale-110 active:scale-95">
                <X size={20} />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full py-2">
              <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg transform transition-transform hover:rotate-12">
                <Database size={20} />
              </button>
            </div>
          )}
        </div>

        {/* User Profile Info - Polished */}
        <div className={`p-4 ${!isSidebarOpen && 'flex justify-center'}`}>
          <div className={`flex items-center gap-3 ${isSidebarOpen ? 'bg-white/40 dark:bg-gray-900/40' : ''} p-2.5 rounded-2xl border border-white/60 dark:border-gray-700/50 shadow-sm transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/50`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <UserIcon size={20} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] mb-0.5">Access: {currentUser.role}</span>
                <span className="text-sm font-bold truncate text-gray-800 dark:text-gray-100">{currentUser.role === 'admin' ? 'Super Admin' : currentUser.lenderName}</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pt-2 px-3 custom-scrollbar">
          <ul className="space-y-1.5">
            {APPS.map((app) => {
              const Icon = app.icon;
              const isActive = activeApp.id === app.id;
              return (
                <li key={app.id}>
                  <button
                    onClick={() => handleAppChange(app)}
                    onDoubleClick={() => handleRefresh(app.id)}
                    title="Double-click to refresh sub-portal"
                    className={`w-full flex items-center p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${isActive
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/40 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/20 rotate-6' : 'bg-gray-100 dark:bg-gray-800 group-hover:scale-110'}`}>
                      <Icon size={18} />
                    </div>
                    {isSidebarOpen && <span className="ml-3 font-semibold text-sm tracking-wide">{app.name}</span>}
                    {isActive && (
                      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-glow animate-pulse"></div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 flex flex-col items-center gap-3 border-t border-gray-100/50 dark:border-gray-800/50">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-2xl bg-white/40 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-300 transition-all duration-300 font-bold text-xs border border-white/60 dark:border-gray-700/40 shadow-sm"
          >
            {isDarkMode ? (
              <>
                <Sun size={18} className="text-yellow-400 animate-spin-slow" />
                {isSidebarOpen && <span>LIGHT MODE</span>}
              </>
            ) : (
              <>
                <Moon size={18} className="text-indigo-600" />
                {isSidebarOpen && <span>DARK MODE</span>}
              </>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-2xl bg-red-50/40 dark:bg-red-900/10 hover:bg-red-100/60 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all duration-300 font-black text-xs border border-red-200/50 dark:border-red-900/30 shadow-sm"
          >
            <LogOut size={18} />
            {isSidebarOpen && <span>LOGOUT</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area - Removed padding and extreme rounding to eliminate gaps (basel) */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 p-0">
        <main className="flex-1 relative bg-white dark:bg-gray-900 overflow-hidden group">
          <div className="w-full h-full relative">
            {APPS.map((app) => (
              visitedApps.has(app.id) && (
                <div 
                  key={`${app.id}-${reloadKeys[app.id] || 0}`}
                  className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out bg-white dark:bg-gray-900 overflow-hidden ${
                    activeApp.id === app.id 
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto z-10' 
                    : 'opacity-0 translate-y-4 scale-[1] pointer-events-none z-0'
                  }`}
                >
                  {/* Iframe Loading Overlay / Skeleton */}
                  {loadingApps[app.id] && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-md transition-opacity duration-300">
                      <div className="relative">
                        <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 animate-pulse">
                            <Database size={24} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-8 text-center">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Launching Portal</h3>
                        <p className="text-sm text-gray-500 mt-2 font-medium tracking-wide font-mono">INITIALIZING {app.name}...</p>
                      </div>
                    </div>
                  )}

                  <iframe
                    src={app.url}
                    title={`${app.name} Portal Interface`}
                    onLoad={() => handleIframeLoad(app.id)}
                    className="w-full h-full border-0 rounded-none bg-white dark:bg-gray-950"
                    allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write; web-share"
                    style={{ overflow: 'hidden' }}
                  />
                </div>
              )
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
