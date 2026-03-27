import { X, User, Phone, Mail, MapPin, Calendar, IndianRupee, CheckCircle, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { AllocationData, ClientSettings } from '../types';
import { calculateInterestAccrued } from '../utils/calculations';
import { ActionTimeline } from './ActionTimeline';

interface CaseDetailsProps {
  allocation: AllocationData;
  onClose: () => void;
  onUpdate: (allocation: AllocationData) => void;
  clientSettings: ClientSettings;
  onSendNotification: (type: string) => Promise<void>;
}

export function CaseDetails({ allocation, onClose, onUpdate, clientSettings, onSendNotification }: CaseDetailsProps) {
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);

  const handleMarkAsPaid = () => {
    onUpdate({ ...allocation, isPaid: true });
    setShowConfirmPayment(false);
  };

  const getDPDStage = (dpd: number) => {
    if (dpd >= 0 && dpd <= 30) return '0-30 Days (Early Stage)';
    if (dpd >= 31 && dpd <= 60) return '30-60 Days (Mid Stage)';
    if (dpd >= 61 && dpd <= 90) return '60-90 Days (Late Stage)';
    return '90+ Days (Critical Stage)';
  };

  const interestAccrued = calculateInterestAccrued(allocation.originalAmount, allocation.amount);
  const dailyIncrease = (allocation.originalAmount * clientSettings.dailyInterestRate / 100);

  return (
    <div className="bg-transparent h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Case Details</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{allocation.id}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Customer Info */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Customer Information</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="text-gray-400 dark:text-gray-500 mt-0.5" size={18} />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-500">Name</div>
                <div className="font-medium text-gray-900 dark:text-gray-200">{allocation.customerName}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="text-gray-400 dark:text-gray-500 mt-0.5" size={18} />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-500">Phone</div>
                <div className="font-medium text-gray-900 dark:text-gray-200">{allocation.contactPhone}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="text-gray-400 dark:text-gray-500 mt-0.5" size={18} />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-500">Email</div>
                <div className="font-medium text-gray-900 dark:text-gray-200">{allocation.contactEmail}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="text-gray-400 dark:text-gray-500 mt-0.5" size={18} />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-500">Address</div>
                <div className="font-medium text-gray-900 dark:text-gray-200">{allocation.address}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Breakdown */}
        {!allocation.isPaid && interestAccrued > 0 && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-orange-600 dark:text-orange-400" size={18} />
              <h3 className="font-semibold text-orange-900 dark:text-orange-300">Outstanding Amount Breakdown</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-orange-800 dark:text-orange-400/80">Original Amount:</span>
                <span className="font-semibold text-orange-900 dark:text-orange-300">
                  ₹{allocation.originalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-800 dark:text-orange-400/80">Interest Accrued ({allocation.DPD} days):</span>
                <span className="font-semibold text-orange-900 dark:text-orange-300">
                  +₹{interestAccrued.toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-orange-300 dark:border-orange-800/50 flex justify-between">
                <span className="text-orange-900 dark:text-orange-200 font-semibold">Current Outstanding:</span>
                <span className="font-bold text-orange-900 dark:text-orange-200 text-lg">
                  ₹{allocation.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="pt-2 text-xs text-orange-700 dark:text-orange-400/70">
                💡 Daily increase: ≈₹{dailyIncrease.toFixed(2)} ({clientSettings.dailyInterestRate}% per day)
              </div>
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Account Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-500 mb-1">Account Number</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{allocation.accountNumber}</div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-500 mb-1 flex items-center gap-1">
                <IndianRupee size={14} />
                Outstanding Amount
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                ₹{allocation.amount.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-500 mb-1 flex items-center gap-1">
                <Calendar size={14} />
                Allocation Date
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{allocation.allocationDate}</div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-500 mb-1 flex items-center gap-1">
                <Calendar size={14} className="text-blue-500 dark:text-blue-400" />
                Upload Date
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {(() => {
                  const date = allocation.uploadedAt ? new Date(allocation.uploadedAt) : new Date();
                  const today = new Date();
                  const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
                  
                  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
                  const dateString = date.toLocaleDateString('en-IN', options);
                  
                  return isToday ? `${dateString} (Today)` : dateString;
                })()}
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-500 mb-1">Days Past Due</div>
              <div className="font-semibold text-red-600 dark:text-red-400">{allocation.DPD} Days</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
            <div className="text-sm text-blue-900 dark:text-blue-300 font-medium">
              Current Stage: {getDPDStage(allocation.DPD)}
            </div>
          </div>
        </div>

        {/* Action Timeline */}
        <ActionTimeline allocation={allocation} onSendNotification={onSendNotification} />
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {!allocation.isPaid ? (
          <>
            {!showConfirmPayment ? (
              <button
                onClick={() => setShowConfirmPayment(true)}
                className="w-full py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Mark as Paid
              </button>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg text-sm text-yellow-900 dark:text-yellow-300">
                  Are you sure the payment has been received? This will stop the collection cycle.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkAsPaid}
                    className="flex-1 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors font-semibold"
                  >
                    Confirm Payment
                  </button>
                  <button
                    onClick={() => setShowConfirmPayment(false)}
                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg text-center">
            <CheckCircle className="mx-auto mb-2 text-green-600 dark:text-green-500" size={32} />
            <div className="font-semibold text-green-900 dark:text-green-300">Payment Received</div>
            <div className="text-sm text-green-700 dark:text-green-500/80">Collection cycle has been stopped</div>
          </div>
        )}
      </div>
    </div>
  );
}