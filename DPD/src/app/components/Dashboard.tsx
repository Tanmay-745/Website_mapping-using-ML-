import { useState, useEffect } from 'react';
import { FileText, TrendingUp, Users, IndianRupee, RefreshCw, Settings, Upload, Database, MessageSquare, Download, Share2, Rocket } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AllocationData, ClientSettings, CommunicationLog, User } from '../types';
import { calculateDPD, calculateCurrentAmount, getDPDBucket } from '../utils/calculations';
import { DPDBuckets } from './DPDBuckets';
import { AllocationList } from './AllocationList';
import { CaseDetails } from './CaseDetails';
import { SettingsPanel } from './SettingsPanel';
import { BulkNotificationModal } from './BulkNotificationModal';
import { notifications as notificationService } from '../services/api';
import { recoveryRate as recoveryRateService } from '../services/api';
import { parseCSVLine } from '../utils/dataUtils';
import { toast, Toaster } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  user: User | null;
  allocations: AllocationData[];
  onReset: () => void;
  clientSettings: ClientSettings;
  onUpdateSettings: (settings: ClientSettings) => void;
  onFileUpload: (file: File, lender: string) => void;
  onLoadSample: () => void;
  onLogout: () => void;
}

export function Dashboard({
  user,
  allocations: initialAllocations,
  onReset,
  clientSettings,
  onUpdateSettings,
  onFileUpload,
  onLoadSample,
  onLogout
}: DashboardProps) {
  const [allocations, setAllocations] = useState(initialAllocations);
  const [selectedCase, setSelectedCase] = useState<AllocationData | null>(null);
  const defaultLender = user?.is_host ? 'All' : user?.lender ?? 'All';
  const [selectedLender, setSelectedLender] = useState<string>(defaultLender);
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRecoveryGraph, setShowRecoveryGraph] = useState(false);
  const [recoveryTimePeriod, setRecoveryTimePeriod] = useState<'days' | 'months' | 'years'>('days');
  const [recoveryData, setRecoveryData] = useState<any[]>([]);
  const [loadingRecoveryData, setLoadingRecoveryData] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLender, setUploadLender] = useState<string>(defaultLender);
  const [customLender, setCustomLender] = useState<string>('');
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);

  // Update DPD and amounts in real-time
  useEffect(() => {
    const updateAllocations = () => {
      const updated = initialAllocations.map(allocation => {
        const currentDPD = calculateDPD(allocation.allocationDate);
        const currentAmount = calculateCurrentAmount(
          allocation.originalAmount,
          allocation.allocationDate,
          allocation.uploadedAt,
          clientSettings.dailyInterestRate
        );

        return {
          ...allocation,
          DPD: currentDPD,
          amount: allocation.isPaid ? allocation.amount : currentAmount,
        };
      });
      setAllocations(updated);
    };

    updateAllocations();

    // Update every minute to reflect real-time changes
    const interval = setInterval(updateAllocations, 60000);

    return () => clearInterval(interval);
  }, [initialAllocations, clientSettings]);

  const updateAllocation = (updatedAllocation: AllocationData) => {
    setAllocations((prev: AllocationData[]) =>
      prev.map((a: AllocationData) => (a.id === updatedAllocation.id ? updatedAllocation : a))
    );
    setSelectedCase(updatedAllocation);
  };

  const handleSendNotification = async (type: string) => {
    if (!selectedCase) return;

    try {
      // Record in backend first
      const result = await notificationService.send(selectedCase.id, type);

      // Trigger "Shoot" for WhatsApp and Email
      const lowerType = type.toLowerCase();
      const message = `Dear ${selectedCase.customerName}, this is a reminder regarding your outstanding payment of ₹${selectedCase.amount.toLocaleString('en-IN')} for Account ${selectedCase.accountNumber}. Please clear it immediately to avoid further DPD of ${selectedCase.DPD} days.`;

      if (lowerType.includes('whatsapp')) {
        const phone = selectedCase.contactPhone?.replace(/\D/g, '') || '';
        const encodedMsg = encodeURIComponent(message);
        window.open(`https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodedMsg}`, '_blank');
      } else if (lowerType.includes('email')) {
        const subject = encodeURIComponent(`Urgent: Payment Reminder - Account ${selectedCase.accountNumber}`);
        const body = encodeURIComponent(message);
        window.open(`mailto:${selectedCase.contactEmail}?subject=${subject}&body=${body}`, '_blank');
      }

      const newLog: CommunicationLog = {
        id: result.log_id,
        allocationId: selectedCase.id,
        type: result.type,
        status: result.status,
        timestamp: new Date().toISOString()
      };

      const updatedCase: AllocationData = {
        ...selectedCase,
        logs: [...(selectedCase.logs || []), newLog]
      };

      updateAllocation(updatedCase);
      toast.success(`${type} shoot initiated and logged successfully.`);
    } catch (error) {
      console.error("Failed to send notification", error);
      toast.error(`Failed to initiate ${type} shoot`);
    }
  };

  // Build list of lenders for dropdown
  const allLenders = Array.from(new Set(allocations.map((a: AllocationData) => a.lender).filter(Boolean) as string[]));
  const lenderOptions = user?.is_host
    ? ['All', ...allLenders]
    : [user?.lender || 'All'];

  // Ensure selected lender is valid (e.g. after allocations or user changes)
  useEffect(() => {
    if (!lenderOptions.includes(selectedLender)) {
      setSelectedLender(defaultLender);
    }
  }, [lenderOptions.join(','), selectedLender, defaultLender]);

  // First filter by lender
  const lenderFilteredAllocations = selectedLender === 'All'
    ? allocations
    : allocations.filter((a: AllocationData) => a.lender === selectedLender);

  // Then filter by bucket
  const filteredAllocations = selectedBucket === 'all'
    ? lenderFilteredAllocations
    : lenderFilteredAllocations.filter((a: AllocationData) => getDPDBucket(a.DPD) === selectedBucket);

  const handleBulkSend = async (type: string, content: string, attachmentUrl?: string, link?: string, campaignCode?: string) => {
    if (filteredAllocations.length === 0) return;

    try {
      const allocationIds = filteredAllocations.map((a: AllocationData) => a.id);
      const result = await notificationService.sendBulk(allocationIds, type, content, attachmentUrl, link, campaignCode);

      const timestamp = new Date().toISOString();
      const updatedAllocations = allocations.map((a: AllocationData) => {
        if (allocationIds.includes(a.id)) {
          const newLog: CommunicationLog = {
            id: Math.floor(Math.random() * 10000),
            allocationId: a.id,
            type: type,
            status: 'Sent',
            timestamp: timestamp
          };
          return { ...a, logs: [...(a.logs || []), newLog] };
        }
        return a;
      });

      setAllocations(updatedAllocations);
      toast.success(`Successfully sent ${type} to ${result.count} customers.`);
    } catch (error) {
      console.error("Failed to send bulk notifications", error);
      toast.error("Failed to send bulk notifications");
    }
  };

  const handleOpenBulkModal = (bucket: string) => {
    setSelectedBucket(bucket);
    setShowBulkModal(true);
  };

  const handleExportData = () => {
    if (filteredAllocations.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    // Create CSV content
    const headers = ['Customer Name', 'Account Number', 'DPD', 'Amount', 'Lender', 'Allocation Date', 'Upload Date'];
    const rows = filteredAllocations.map(a => [
      `"${a.customerName}"`,
      `"${a.accountNumber}"`,
      a.DPD,
      a.amount,
      `"${a.lender}"`,
      a.allocationDate,
      a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString() : 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Collection_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report downloaded successfully");
  };

  // Calculate stats based on LENDER filtered data (so stats reflect the selected lender)
  const totalAmount = lenderFilteredAllocations.reduce((sum: number, a: AllocationData) => sum + a.amount, 0);
  const activeCount = lenderFilteredAllocations.filter((a: AllocationData) => !a.isPaid).length;
  const paidCount = lenderFilteredAllocations.filter((a: AllocationData) => a.isPaid).length;
  const recoveryRate = lenderFilteredAllocations.length > 0
    ? ((paidCount / lenderFilteredAllocations.length) * 100).toFixed(1)
    : '0.0';

  // Fetch recovery rate history when modal opens or time period changes
  useEffect(() => {
    if (showRecoveryGraph) {
      const fetchRecoveryData = async () => {
        setLoadingRecoveryData(true);
        try {
          const days = recoveryTimePeriod === 'days' ? 30 : recoveryTimePeriod === 'months' ? 365 : 1825;
          const lender = selectedLender === 'All' ? undefined : selectedLender;
          
          const data = await recoveryRateService.getHistory(lender, days);
          
          // Transform data for the chart
          const transformedData = data.map((item: any) => {
            const date = new Date(item.date);
            return {
              period: recoveryTimePeriod === 'days' ? date.getDate().toString() : 
                      recoveryTimePeriod === 'months' ? date.toLocaleString('default', { month: 'short' }) : 
                      date.getFullYear().toString(),
              recoveryRate: item.recovery_rate.toFixed(1),
              fullDate: date.toLocaleDateString(),
              date: item.date
            };
          });
          
          setRecoveryData(transformedData);
        } catch (error) {
          console.error('Failed to fetch recovery rate history:', error);
          // Fallback to mock data if API fails
          const mockData = generateMockData();
          setRecoveryData(mockData);
        } finally {
          setLoadingRecoveryData(false);
        }
      };
      
      fetchRecoveryData();
    }
  }, [showRecoveryGraph, recoveryTimePeriod, selectedLender]);

  // CSV preview parser (simplified version for preview)
  const parseCSVPreview = (text: string): any[] => {
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);

    const data: any[] = [];
    for (let i = 1; i < Math.min(lines.length, 6); i++) { // Preview first 5 rows
      const values = parseCSVLine(lines[i]);
      if (values.length <= 1 && !values[0]) continue;

      const row: any = {};
      headers.forEach((header: string, index: number) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    return data;
  };

  // Fallback mock data generator (in case API fails)
  const generateMockData = () => {
    const data = [];
    const now = new Date();
    let periods = 30;
    
    if (recoveryTimePeriod === 'months') {
      periods = 12;
    } else if (recoveryTimePeriod === 'years') {
      periods = 5;
    }

    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date(now);
      if (recoveryTimePeriod === 'days') {
        date.setDate(date.getDate() - i);
      } else if (recoveryTimePeriod === 'months') {
        date.setMonth(date.getMonth() - i);
      } else {
        date.setFullYear(date.getFullYear() - i);
      }

      const baseRate = parseFloat(recoveryRate);
      const variation = (Math.random() - 0.5) * 20;
      const rate = Math.max(0, Math.min(100, baseRate + variation));

      data.push({
        period: recoveryTimePeriod === 'days' ? date.getDate().toString() : 
                recoveryTimePeriod === 'months' ? date.toLocaleString('default', { month: 'short' }) : 
                date.getFullYear().toString(),
        recoveryRate: rate.toFixed(1),
        fullDate: date.toLocaleDateString(),
        date: date.toISOString().split('T')[0]
      });
    }
    return data;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-blue rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 group cursor-pointer hover:rotate-0 transition-transform duration-300">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400 font-outfit">
                  DPD <span className="text-blue-600 dark:text-blue-400 font-plus-jakarta">Recovery Portal</span>
                </h1>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Enterprise Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {user?.username || 'User'}
                </span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {user?.lender || 'System Host'}
                </span>
              </div>

              {user?.lender && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-50/80 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-lg shadow-sm group hover:bg-purple-100/80 dark:hover:bg-purple-800/40 transition-colors"
                >
                  <div className="relative w-7 h-7 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-inner overflow-hidden">
                    <motion.div
                      animate={{ 
                        y: [1, -2, 1],
                        x: [0.5, -0.5, 0.5]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2,
                        ease: "easeInOut"
                      }}
                    >
                      <Rocket size={16} className="text-purple-600 dark:text-purple-400 fill-purple-100 dark:fill-purple-900/30" />
                    </motion.div>
                    <motion.div
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-2 bg-gradient-to-t from-orange-400 to-transparent rounded-full blur-[1px]"
                      animate={{ 
                        opacity: [0, 0.8, 0],
                        scale: [0.5, 1.2, 0.5]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.5,
                        delay: 0.2
                      }}
                    />
                  </div>
                  <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-tighter">
                    {user.lender}
                  </span>
                </motion.div>
              )}

              <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1" />

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>

              <button
                onClick={handleExportData}
                disabled={filteredAllocations.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-blue-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group text-sm font-semibold"
              >
                <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                Export Report
              </button>

              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-300 transition-all font-semibold text-sm group"
              >
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={clientSettings}
          onUpdate={onUpdateSettings}
          onClose={() => setShowSettings(false)}
          onReset={onReset}
          onLoadSample={onLoadSample}
        />
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <BulkNotificationModal
          customerCount={filteredAllocations.length}
          bucketName={selectedBucket === 'all' ? 'All' : selectedBucket}
          onClose={() => setShowBulkModal(false)}
          onSend={handleBulkSend}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" style={{zIndex: 9999}}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white">Upload CSV</h2>
              <button
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadPreview([]);
                }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lender</label>
                <select
                  value={uploadLender}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUploadLender(val);
                    if (val !== 'Null') {
                      setCustomLender('');
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {lenderOptions.map((lender) => (
                    <option key={lender} value={lender}>
                      {lender === 'All' ? 'All Lenders' : lender}
                    </option>
                  ))}
                  <option value="Null">Null (Enter Lender)</option>
                </select>
              </div>

              {uploadLender === 'Null' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Enter lender name</label>
                  <input
                    value={customLender}
                    onChange={(e) => setCustomLender(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g. ABC Bank"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadFile(file);
                      // Parse and preview the CSV
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const text = event.target?.result as string;
                          const parsed = parseCSVPreview(text);
                          setUploadPreview(parsed.slice(0, 5)); // Show first 5 rows
                        } catch (error) {
                          console.error('Error parsing CSV:', error);
                          setUploadPreview([]);
                        }
                      };
                      reader.readAsText(file);
                    } else {
                      setUploadFile(null);
                      setUploadPreview([]);
                    }
                  }}
                  className="mt-1 w-full"
                />
              </div>

              {/* CSV Preview */}
              {uploadPreview.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preview (First 5 rows)</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          {Object.keys(uploadPreview[0]).map((header) => (
                            <th key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {uploadPreview.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900 dark:text-gray-300">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Showing preview of {uploadPreview.length} rows. All data will be uploaded.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadPreview([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => {
                    if (!uploadFile) {
                      alert('Please select a CSV file to upload.');
                      return;
                    }

                    const lenderToUse = uploadLender === 'Null' ? customLender.trim() : uploadLender;
                    if (!lenderToUse) {
                      toast.error('Please provide a lender name before uploading.');
                      return;
                    }

                    onFileUpload(uploadFile, lenderToUse);
                    setShowUploadModal(false);
                    setUploadPreview([]);
                    toast.success('File uploaded successfully!');
                  }}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-right" expand={false} richColors />

      {/* Recovery Rate Graph Modal */}
      {showRecoveryGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white">Recovery Rate Trend</h2>
              <button
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => setShowRecoveryGraph(false)}
              >
                ✕
              </button>
            </div>

            <div className="mb-4 flex justify-end">
              <select
                value={recoveryTimePeriod}
                onChange={(e) => setRecoveryTimePeriod(e.target.value as 'days' | 'months' | 'years')}
                className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>

            <div className="h-80">
              {loadingRecoveryData ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading recovery rate data...</div>
                </div>
              ) : recoveryData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">No historical data available</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recoveryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      label={{ value: recoveryTimePeriod === 'days' ? 'Days' : recoveryTimePeriod === 'months' ? 'Months' : 'Years', position: 'insideBottom', offset: -5 }} 
                    />
                    <YAxis 
                      label={{ value: 'Recovery Rate (%)', angle: -90, position: 'insideLeft' }} 
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      labelFormatter={(label: any, payload: any) => {
                        const data = payload?.[0]?.payload;
                        return data ? `${data.fullDate}` : label;
                      }}
                      formatter={(value: any) => [`${value}%`, 'Recovery Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="recoveryRate" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Lender Filter */}
<div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lender:</span>
          <select
            value={selectedLender}
            onChange={(e) => setSelectedLender(e.target.value)}
            className="border-none bg-transparent text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-0 cursor-pointer"
          >
            {lenderOptions.map((lender) => (
              <option key={lender} value={lender}>
                {lender === 'All' ? 'All Lenders' : lender}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setUploadFile(null);
            setUploadLender(defaultLender);
            setCustomLender('');
            setUploadPreview([]);
            setShowUploadModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload size={16} />
          Upload CSV
        </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 rounded-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 gradient-blue opacity-10 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Cases</span>
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                <FileText size={18} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{lenderFilteredAllocations.length}</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-6 rounded-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 gradient-orange opacity-10 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Cases</span>
              <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                <Users size={18} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{activeCount}</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass p-6 rounded-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 gradient-green opacity-10 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Amount</span>
              <div className="p-2 bg-green-50 text-green-500 rounded-lg">
                <IndianRupee size={18} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              ₹{(totalAmount / 100000).toFixed(1)}L
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setShowRecoveryGraph(true)}
            className="glass p-6 rounded-2xl relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 gradient-purple opacity-10 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Recovery Rate</span>
              <div className="p-2 bg-purple-50 text-purple-500 rounded-lg">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{recoveryRate}%</div>
          </motion.div>
        </div>

        {/* DPD Buckets */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <DPDBuckets
            allocations={lenderFilteredAllocations}
            selectedBucket={selectedBucket}
            onSelectBucket={setSelectedBucket}
            onSendNotification={handleOpenBulkModal}
          />
        </motion.div>

        {/* Main Content */}
        <div className="mt-6 h-[calc(100vh-320px)] min-h-[600px]">
          {allocations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass p-12 rounded-3xl text-center flex flex-col items-center max-w-2xl mx-auto h-full justify-center"
            >
              <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                <Database size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Allocation Data</h3>
              <p className="text-gray-600 mb-8 max-w-sm">
                Get started by uploading your DPD allocation CSV file or load our professional sample data.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={onLoadSample}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  Load Sample
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Upload CSV
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              <div className="glass overflow-hidden rounded-2xl h-full flex flex-col">
                <AllocationList
                  allocations={filteredAllocations}
                  onSelectCase={setSelectedCase}
                  selectedCaseId={selectedCase?.id}
                  clientSettings={clientSettings}
                />
              </div>

              <div className="h-full">
                {selectedCase ? (
                  <div className="glass overflow-hidden rounded-2xl h-full relative">
                    <CaseDetails
                      allocation={selectedCase}
                      onClose={() => setSelectedCase(null)}
                      onUpdate={updateAllocation}
                      clientSettings={clientSettings}
                      onSendNotification={handleSendNotification}
                    />
                  </div>
                ) : (
                  <div className="glass rounded-2xl h-full flex flex-col items-center justify-center text-gray-500 p-12">
                    <div className="p-4 bg-gray-50 rounded-full mb-4">
                      <MessageSquare size={32} className="text-gray-300" />
                    </div>
                    <p className="font-medium">Select a case to view details</p>
                    <p className="text-sm">Comprehensive history and actions will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}