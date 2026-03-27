import { AllocationData } from '../types';
import { Send } from 'lucide-react';
import { notifications as notificationService } from '../services/api';
import { getDPDBucket } from '../utils/calculations';

interface DPDBucketsProps {
  allocations: AllocationData[];
  selectedBucket: string;
  onSelectBucket: (bucket: string) => void;
  onSendNotification: (bucket: string) => void;
}

export function DPDBuckets({ allocations, selectedBucket, onSelectBucket, onSendNotification }: DPDBucketsProps) {

  const buckets = [
    { range: '0-30', label: 'Early Delinquency', desc: 'Action: SMS Reminder', color: 'bg-green-500' },
    { range: '30-60', label: 'Mid-Stage', desc: 'Action: IVR Call', color: 'bg-yellow-500' },
    { range: '60-90', label: 'Critical', desc: 'Action: Agent Call', color: 'bg-orange-500' },
    { range: '90+', label: 'Write-off Risk', desc: 'Action: Legal Notice', color: 'bg-red-500' },
  ];

  const bucketData = buckets.map(bucket => {
    const bucketAllocations = allocations.filter(a => getDPDBucket(a.DPD) === bucket.range);
    return {
      ...bucket,
      count: bucketAllocations.length,
      amount: bucketAllocations.reduce((sum, a) => sum + a.amount, 0),
    };
  });

  const handleSend = (e: React.MouseEvent, range: string) => {
    e.stopPropagation();
    onSendNotification(range);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">DPD Buckets</h2>
        <button
          onClick={() => onSelectBucket('all')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${selectedBucket === 'all'
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {bucketData.map(bucket => (
          <div
            key={bucket.range}
            onClick={() => onSelectBucket(bucket.range)}
            className={`relative group cursor-pointer text-left p-4 rounded-lg border-2 transition-all ${selectedBucket === bucket.range
              ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/50'
              }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${bucket.color}`} />
              <span className="font-semibold text-gray-900 dark:text-gray-100">{bucket.range} Days</span>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{bucket.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">{bucket.desc}</div>

            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{bucket.count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider font-medium">Cases</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  ₹{(bucket.amount / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider font-medium">Amt</div>
              </div>
            </div>

            <button
              onClick={(e) => handleSend(e, bucket.range)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all duration-300 font-semibold text-xs border border-blue-100 dark:border-blue-900/30 group-hover:border-blue-600"
            >
              <Send size={14} />
              Shoot All
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
