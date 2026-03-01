import { useState, useEffect } from 'react';
import { FileText, Database, ScanLine, Menu, X } from 'lucide-react';

// Configuration for the apps
const APPS = [
  { id: 'legal-pro', name: 'Legal Pro', url: 'http://localhost:3001', icon: FileText },
  { id: 'legal-mapping', name: 'Legal Mapping', url: 'http://localhost:5173', icon: Database },
  { id: 'barcode', name: 'Barcode', url: 'http://localhost:3000', icon: ScanLine },
];

function App() {
  const [activeApp, setActiveApp] = useState(APPS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SWITCH_APP' && event.data?.appId) {
        const targetApp = APPS.find(app => app.id === event.data.appId);
        if (targetApp) {
          setActiveApp(targetApp);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 overflow-hidden font-sans">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar */}
      <div className={`relative z-10 bg-white/60 backdrop-blur-md border-r border-white/20 shadow-xl transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-100/50">
          {isSidebarOpen && (
            <div className="flex items-center gap-4 px-2">
              <img src="/logo.png" alt="CredResolve" className="h-8 object-contain" />
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/50 rounded-lg text-gray-600 transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <ul className="space-y-2">
            {APPS.map((app) => {
              const Icon = app.icon;
              const isActive = activeApp.id === app.id;
              return (
                <li key={app.id}>
                  <button
                    onClick={() => setActiveApp(app)}
                    className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-600 hover:bg-white/80 hover:text-blue-600 hover:shadow-md'
                      }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-white'}`}>
                      <Icon size={20} />
                    </div>
                    {isSidebarOpen && <span className="ml-3 font-medium truncate">{app.name}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {isSidebarOpen && (
          <div className="p-6 border-t border-gray-100/50">
            <div className="text-xs text-gray-400 font-medium tracking-wide text-center">
              &copy; 2026 Legal Tech
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/40 backdrop-blur-md border-b border-white/20 px-8 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">{activeApp.name}</h1>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-gray-500 px-3 py-1.5 bg-white/60 rounded-full border border-gray-200 shadow-sm">
              {activeApp.url}
            </span>
            <a
              href={activeApp.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Open in New Tab
            </a>
          </div>
        </header>

        <main className="flex-1 relative bg-white/30 backdrop-blur-sm p-6 overflow-hidden m-4 rounded-3xl border border-white/20 shadow-inner">
          <div className="w-full h-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <iframe
              src={activeApp.url}
              title={activeApp.name}
              className="w-full h-full border-0"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write"
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
