import { useState, useEffect } from 'react';
import { UserCircle2, Building2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface Lender {
  id: string;
  name: string;
}

interface LoginProps {
  onLogin: (user: { role: 'admin' | 'lender'; lenderName?: string }) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [role, setRole] = useState<'admin' | 'lender'>('admin');
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [selectedLender, setSelectedLender] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingLenders, setFetchingLenders] = useState(false);

  useEffect(() => {
    const loadLenders = async () => {
      setFetchingLenders(true);
      try {
        const response = await fetch('http://localhost:8001/api/lenders');
        const data = await response.json();
        setLenders(data);
        if (data.length > 0) {
          setSelectedLender(data[0].name);
        }
      } catch (error) {
        console.error('Failed to fetch lenders:', error);
      } finally {
        setFetchingLenders(false);
      }
    };

    loadLenders();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate short delay for premium feel
    setTimeout(() => {
      onLogin({
        role,
        lenderName: role === 'lender' ? selectedLender : undefined
      });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="w-full max-w-md p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-gray-700/50 transform transition-all duration-500 scale-100 hover:scale-[1.01]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/30 flex items-center justify-center mb-4 transition-transform hover:rotate-3">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Select your portal type to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                role === 'admin'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 shadow-inner'
                  : 'border-transparent bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <UserCircle2 className="w-8 h-8 mb-2" />
              <span className="font-bold text-sm">Administrator</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('lender')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                role === 'lender'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 shadow-inner'
                  : 'border-transparent bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Building2 className="w-8 h-8 mb-2" />
              <span className="font-bold text-sm">Lender Portal</span>
            </button>
          </div>

          {role === 'lender' && (
            <div className="space-y-2 animate-in slide-in-from-top-4 fade-in duration-300">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">
                Select Institution
              </label>
              <select
                value={selectedLender}
                onChange={(e) => setSelectedLender(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium appearance-none cursor-pointer"
                required
              >
                {fetchingLenders ? (
                   <option disabled>Loading lenders...</option>
                ) : lenders.length > 0 ? (
                  lenders.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No lenders available</option>
                )}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (role === 'lender' && !selectedLender)}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-400 font-medium tracking-tight">
            © 2026 Legal Tech Systems. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
