import { useState, useEffect, useCallback } from 'react';
import { FileText, Database, ScanLine, X, Sun, Moon, Mail, Activity, LogOut, User as UserIcon } from 'lucide-react';
import { Login } from './components/Login';

// Configuration for the apps
const APPS = [
  { id: 'legal-pro', name: 'Legal Pro', url: 'http://localhost:3001/ai/', icon: FileText },
  { id: 'legal-mapping', name: 'Legal Mapping', url: 'http://localhost:5173/mapping/', icon: Database },
  { id: 'barcode', name: 'Barcode', url: 'http://localhost:3000', icon: ScanLine },
  { id: 'cover-letter', name: 'Cover Letter', url: 'http://localhost:5001', icon: Mail },
  { id: 'dpd-tracker', name: 'DPD Tracker', url: 'http://localhost:5174', icon: Activity }
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
 
  // Broadcast function to all iframes
  const broadcastToIframes = useCallback((message: any) => {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      iframe.contentWindow?.postMessage(message, '*');
    });
  }, []);
 
  const handleRefresh = (appId: string) => {
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
          setActiveApp(targetApp);

          // Broadcast to child iframes that this app was activated
          broadcastToIframes({
            type: 'APP_ACTIVATED',
            appId: event.data.appId,
            action: event.data.action
          });
        }
      } else if (event.data?.type === 'RELOAD_APP' && event.data?.appId) {
        // Broadcast to child iframes that this app needs to reload its data
        broadcastToIframes({
          type: 'APP_RELOAD',
          appId: event.data.appId,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [broadcastToIframes]);

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
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 overflow-hidden font-sans text-gray-900 dark:text-gray-100">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar */}
      <div className={`relative z-10 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border-r border-white/20 dark:border-gray-700/50 shadow-xl transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-100/50 dark:border-gray-700/50 relative">
          {isSidebarOpen ? (
            <>
              <div className="absolute inset-x-0 flex justify-center pointer-events-none">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-wide">Legal Portal</span>
              </div>
              <div className="flex-1"></div>
              <button onClick={() => setIsSidebarOpen(false)} className="relative z-10 p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent cursor-pointer tracking-wide" onClick={() => setIsSidebarOpen(true)}>Lp</span>
            </div>
          )}
        </div>

        {/* User Profile Info */}
        <div className={`p-4 border-b border-gray-100/50 dark:border-gray-700/50 ${!isSidebarOpen && 'flex justify-center'}`}>
          <div className={`flex items-center gap-3 ${isSidebarOpen ? 'bg-white/40 dark:bg-gray-900/20' : ''} p-2 rounded-xl border border-white/40 dark:border-gray-700/30`}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <UserIcon size={20} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{currentUser.role}</span>
                <span className="text-sm font-semibold truncate text-gray-700 dark:text-gray-200">{currentUser.role === 'admin' ? 'System Admin' : currentUser.lenderName}</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-2">
            {APPS.map((app) => {
              const Icon = app.icon;
              const isActive = activeApp.id === app.id;
              return (
                <li key={app.id}>
                  <button
                    onClick={() => setActiveApp(app)}
                    onDoubleClick={() => handleRefresh(app.id)}
                    title="Double-click to refresh portal"
                    className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md'
                      }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors'}`}>
                      <Icon size={20} />
                    </div>
                    {isSidebarOpen && <span className="ml-3 font-medium truncate">{app.name}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-100/50 dark:border-gray-700/50 flex flex-col items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white/50 dark:bg-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-200 transition-colors font-medium border border-gray-200/50 dark:border-gray-600/50 shadow-sm ${!isSidebarOpen && 'px-2'}`}
          >
            {isDarkMode ? (
              <>
                <Sun size={18} className="text-yellow-400" />
                {isSidebarOpen && <span>Light Mode</span>}
              </>
            ) : (
              <>
                <Moon size={18} className="text-indigo-600 dark:text-indigo-400" />
                {isSidebarOpen && <span>Dark Mode</span>}
              </>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors font-bold border border-red-100/50 dark:border-red-900/20 shadow-sm ${!isSidebarOpen && 'px-2'}`}
          >
            <LogOut size={18} />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>

          {isSidebarOpen && (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold tracking-widest text-center mt-2 uppercase">
              &copy; 2026 Legal Tech
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <main className="flex-1 relative bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm p-6 overflow-hidden m-4 rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-inner">
          <div className="w-full h-full bg-white dark:bg-black/20 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800/50 relative">
            {APPS.map((app) => (
              <iframe
                key={`${app.id}-${reloadKeys[app.id] || 0}`}
                src={app.url}
                title={app.name}
                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${activeApp.id === app.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write"
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
