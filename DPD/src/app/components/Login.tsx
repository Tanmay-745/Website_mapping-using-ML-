import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { auth } from '../services/api';
import { LoginCredentials } from '../types';
import { motion } from 'framer-motion';
import { TrendingUp, Lock, User as UserIcon, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await auth.login(credentials.username, credentials.password);
      const user = await auth.getCurrentUser();
      onLogin(user);
    } catch (err: any) {
      if (!err.response) {
        setError('Server unreachable. Please ensure the backend is running.');
      } else {
        setError(err.response?.data?.detail || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-gray-950 relative overflow-hidden transition-colors duration-500">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-[120px] opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md px-4 relative z-10"
      >
        {/* Logo Branding */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-16 h-16 gradient-blue rounded-2xl flex items-center justify-center shadow-2xl mb-4 transform -rotate-3"
          >
            <TrendingUp className="text-white" size={36} />
          </motion.div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400 tracking-tight">
            DPD <span className="text-blue-600 dark:text-blue-400">Recovery Portal</span>
          </h1>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <ShieldCheck size={14} className="text-green-500" />
            Secure Enterprise Portal
          </p>
        </div>

        <div className="glass p-8 rounded-[2.5rem] shadow-2xl border-white/50 dark:border-white/10 relative overflow-hidden">
          <div className="relative z-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome Back</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Please enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Username</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors">
                    <UserIcon size={18} />
                  </div>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={handleChange}
                    className="pl-12 h-12 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Password</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={handleChange}
                    className="pl-12 pr-12 h-12 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                  {error}
                </motion.div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 gradient-blue hover:opacity-90 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </div>
                ) : 'Sign In to Portal'}
              </Button>
            </form>
          </div>
          
          {/* Subtle internal gradient glow */}
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-500/5 rounded-tl-[100px] pointer-events-none" />
        </div>
        
        <p className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400 font-medium">
          © 2026 DPD Recovery Systems. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}