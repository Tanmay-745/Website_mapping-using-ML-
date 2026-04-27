import { Search, CheckCircle2, AlertCircle, TrendingUp, Folder, FolderOpen, ChevronRight, ChevronDown, User, Hash } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AllocationData, ClientSettings } from '../types';
import { calculateInterestAccrued } from '../utils/calculations';

interface AllocationListProps {
  allocations: AllocationData[];
  onSelectCase: (allocation: AllocationData) => void;
  selectedCaseId?: string;
  clientSettings: ClientSettings;
}

export function AllocationList({ allocations, onSelectCase, selectedCaseId, clientSettings }: AllocationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const getDPDStatus = (dpd: number) => {
    if (dpd >= 0 && dpd <= 30) return { label: '0-30', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' };
    if (dpd >= 31 && dpd <= 60) return { label: '30-60', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' };
    if (dpd >= 61 && dpd <= 90) return { label: '60-90', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' };
    return { label: '90+', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' };
  };

  // Group allocations by name and phone
  const groupedData = useMemo(() => {
    const rawFiltered = allocations.filter(
      a =>
        a.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.contactPhone && a.contactPhone.includes(searchTerm))
    );

    const groups: Record<string, AllocationData[]> = {};
    rawFiltered.forEach(a => {
      const key = `${a.customerName.trim()}-${(a.contactPhone || '').trim()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    return Object.entries(groups).map(([key, items]) => ({
      key,
      items,
      customerName: items[0].customerName,
      contactPhone: items[0].contactPhone,
      isPaid: items.every(a => a.isPaid),
      totalAmount: items.reduce((sum, a) => sum + a.amount, 0),
      totalOriginalAmount: items.reduce((sum, a) => sum + a.originalAmount, 0),
      maxDPD: Math.max(...items.map(a => a.DPD)),
      anyPaid: items.some(a => a.isPaid)
    }));
  }, [allocations, searchTerm]);

  // Auto-expand group if it contains the selected case
  useEffect(() => {
    if (selectedCaseId) {
      const groupWithSelected = groupedData.find(g => g.items.some(a => a.id === selectedCaseId));
      if (groupWithSelected) {
        setExpandedGroups(prev => {
          if (prev.has(groupWithSelected.key)) return prev;
          const next = new Set(prev);
          next.add(groupWithSelected.key);
          return next;
        });
      }
    }
  }, [selectedCaseId, groupedData]);

  const toggleGroup = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-transparent h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Allocations ({allocations.length})
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {groupedData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <AlertCircle size={48} className="mx-auto mb-2 text-gray-400" />
              <p className="font-medium">No results found</p>
              <p className="text-sm">Try searching for a name, LAN, or phone number</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {groupedData.map(group => {
              const isExpanded = expandedGroups.has(group.key);
              const status = getDPDStatus(group.maxDPD);
              const interestAccrued = calculateInterestAccrued(group.totalOriginalAmount, group.totalAmount);
              const hasMultiple = group.items.length > 1;

              return (
                <div key={group.key} className="bg-white">
                  {/* Group Header / Single Item */}
                  <div
                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer border-l-4 ${isExpanded && hasMultiple ? 'border-blue-400 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-900/10' : 'border-transparent'}`}
                    onClick={(e) => hasMultiple ? toggleGroup(group.key, e) : onSelectCase(group.items[0])}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {hasMultiple ? (
                            isExpanded ? (
                              <FolderOpen className="text-blue-500 flex-shrink-0" size={18} />
                            ) : (
                              <Folder className="text-blue-400 flex-shrink-0" size={18} />
                            )
                          ) : (
                            <User className="text-gray-400 flex-shrink-0" size={18} />
                          )}
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                            {group.customerName}
                          </h3>
                          {group.isPaid && (
                            <CheckCircle2 className="text-green-500 flex-shrink-0" size={16} />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {hasMultiple ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/50">
                              {group.items.length} ACCOUNTS
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                              {group.items[0].accountNumber}
                            </span>
                          )}
                          {group.contactPhone && (
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                              {group.contactPhone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${status.color} shadow-sm border border-black/5 dark:border-white/5`}>
                          {status.label} DPD
                        </span>
                        {hasMultiple && (
                          <div className="p-1 rounded-lg hover:bg-black/5 transition-colors">
                            {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Outstanding Total</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-base">
                          ₹{group.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      {interestAccrued > 0 && !group.isPaid && (
                        <div className="flex flex-col items-end">
                          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Interest</span>
                          <div className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                            <TrendingUp size={12} />
                            +₹{interestAccrued.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grouped Loans (Sub-items) */}
                  <AnimatePresence>
                    {isExpanded && hasMultiple && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden bg-gray-50/50 dark:bg-gray-900/30"
                      >
                        <div className="pl-8 pr-4 py-2 space-y-2 border-l-4 border-blue-200 dark:border-blue-900/50">
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 pt-1 border-t border-gray-100 dark:border-gray-800">INDIVIDUAL ACCOUNTS</p>
                          {group.items.map(allocation => {
                            const isSelected = selectedCaseId === allocation.id;
                            const statusSub = getDPDStatus(allocation.DPD);
                            const accruedSub = calculateInterestAccrued(allocation.originalAmount, allocation.amount);

                            return (
                              <button
                                key={allocation.id}
                                onClick={() => onSelectCase(allocation)}
                                className={`w-full text-left p-2.5 rounded-xl transition-all border ${isSelected ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-800 shadow-md shadow-blue-200 dark:shadow-none scale-[1.02]' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm'}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Hash size={12} className={isSelected ? 'text-blue-100' : 'text-blue-400'} />
                                    <span className="text-xs font-bold leading-none">{allocation.accountNumber}</span>
                                  </div>
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${isSelected ? 'bg-white/20 text-white' : statusSub.color}`}>
                                    {statusSub.label}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>DPD: {allocation.DPD}</span>
                                  <div className="text-right">
                                    <p className="text-xs font-bold">₹{allocation.amount.toLocaleString('en-IN')}</p>
                                    {accruedSub > 0 && !allocation.isPaid && (
                                      <p className={`text-[9px] font-bold ${isSelected ? 'text-blue-100' : 'text-orange-600'}`}>+₹{accruedSub.toFixed(1)}</p>
                                    )}
                                  </div>
                                </div>
                                {allocation.isPaid && (
                                  <div className={`mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${isSelected ? 'bg-white/20 text-white' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'}`}>
                                    <CheckCircle2 size={10} /> PAID
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}