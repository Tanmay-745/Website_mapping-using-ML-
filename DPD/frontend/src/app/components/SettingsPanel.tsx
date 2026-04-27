import { X, Percent } from 'lucide-react';
import { useState } from 'react';
import { ClientSettings } from '../types';
import { toast } from 'sonner';

interface SettingsPanelProps {
  settings: ClientSettings;
  onUpdate: (settings: ClientSettings) => void;
  onClose: () => void;
  onReset: () => void;
  onLoadSample: () => void;
}

export function SettingsPanel({ settings, onUpdate, onClose, onReset, onLoadSample }: SettingsPanelProps) {
  const [dailyRate, setDailyRate] = useState(settings.dailyInterestRate.toString());
  const [penaltyRate, setPenaltyRate] = useState(settings.penaltyRate.toString());
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleSave = () => {
    onUpdate({
      dailyInterestRate: parseFloat(dailyRate) || 0,
      penaltyRate: parseFloat(penaltyRate) || 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Client Settings</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure interest and penalty rates</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">
              Daily Interest Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                placeholder="0.10"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Interest applied to outstanding amount daily (e.g., 0.1% per day)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">
              Penalty Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={penaltyRate}
                onChange={(e) => setPenaltyRate(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                placeholder="2.0"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Additional penalty percentage for late payments
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Example Calculation</h4>
            <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <p>Original Amount: ₹50,000</p>
              <p>After 30 days @ {dailyRate}% daily:</p>
              <p className="font-semibold">
                ≈ ₹{(50000 * Math.pow(1 + parseFloat(dailyRate || '0') / 100, 30)).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Maintenance</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  onLoadSample();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Load Test Data</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Populate portal with sample records</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                  <Percent className="text-gray-400 group-hover:text-white" size={14} />
                </div>
              </button>

              <div className="space-y-3">
                {!showPasswordPrompt ? (
                  <button
                    onClick={() => setShowPasswordPrompt(true)}
                    className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold text-red-700 dark:text-red-400">Reset All Data</p>
                      <p className="text-xs text-red-500 dark:text-red-500/80">Wipe all records and settings</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 flex items-center justify-center group-hover:bg-red-600 group-hover:border-red-600 transition-all">
                      <X className="text-red-400 group-hover:text-white" size={14} />
                    </div>
                  </button>
                ) : (
                  <div className="p-4 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900/30 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Confirm Master Reset</p>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">Please enter the administrative password to authorize this action.</p>
                      <input
                        type="password"
                        autoFocus
                        value={resetPassword}
                        onChange={(e) => {
                          setResetPassword(e.target.value);
                          setPasswordError(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (resetPassword === 'credresolve@2026') {
                              onReset();
                              onClose();
                            } else {
                              setPasswordError(true);
                              toast.error('Invalid administrative password');
                            }
                          }
                        }}
                        placeholder="Master password"
                        className={`w-full px-4 py-2 text-sm bg-white dark:bg-gray-900 border ${passwordError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-900 dark:text-gray-100`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (resetPassword === 'credresolve@2026') {
                            onReset();
                            onClose();
                          } else {
                            setPasswordError(true);
                            toast.error('Invalid administrative password');
                          }
                        }}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 dark:shadow-none"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordPrompt(false);
                          setResetPassword('');
                          setPasswordError(false);
                        }}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors font-semibold"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
