import { useState, useEffect } from 'react';
import { CSVUploader } from './components/CSVUploader';
import { MappingInterface } from './components/MappingInterface';
import { Download, RotateCcw, FileText } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useCSVMapping } from './hooks/useCSVMapping';
import { Header } from './components/Header';
import { PhysicalToggle } from './components/PhysicalToggle';
import { DataPreview } from './components/DataPreview';

import { ConsolidationToggle } from './components/ConsolidationToggle';

export default function App() {
  const {
    parsedData,
    mappings,
    isProcessing,
    isPhysical,
    isConsolidated,
    allTargetHeaders,
    customTargetHeaders,
    deletedTargetHeaders,
    handleFileUpload,
    handleMappingChange,
    handleTargetRename,
    handleAddCustomColumn,
    handlePhysicalToggle,
    handleConsolidationToggle,
    handleReset,
    handleDeleteColumn,
    handleRestoreColumn,
    getExportData,
    mlReady,
    mlProgress,
  } = useCSVMapping();

  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);

  useEffect(() => {
    const handleThemeChange = (event: MessageEvent) => {
      if (event.data?.type === 'THEME_CHANGE') {
        if (event.data.isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    window.addEventListener('message', handleThemeChange);
    return () => window.removeEventListener('message', handleThemeChange);
  }, []);

  const onAddCustomColumn = async () => {
    if (await handleAddCustomColumn(newColumnName)) {
      setNewColumnName('');
      setShowAddColumn(false);
    }
  };

  const handleCreateTemplate = async () => {
    // 1. Prepare Data
    if (!parsedData) {
      toast.error("Please upload and map a CSV first.");
      return;
    }

    // Generate full mapped data first
    const exportResult = getExportData();
    if (!exportResult) return;
    const mappedData = exportResult.data;
    let headers = exportResult.headers;

    if (mappings.filter((m) => m.targetHeader !== null).length === 0) {
      toast.error("Please map at least one column.");
      return;
    }

    // Filter out columns that are completely empty
    headers = headers.filter(header => {
      return mappedData.some((row: any) => {
        const val = row[header];
        return val !== undefined && val !== null && String(val).trim() !== '';
      });
    });

    if (headers.length === 0) {
      toast.error("All mapped columns are empty. Please check your data.");
      return;
    }

    const payload = {
      headers: headers,
      fileName: parsedData.fileName,
      // Send sample data (first 5 rows)
      sampleData: mappedData.slice(0, 5),
      deliveryMode: isPhysical ? 'physical' : 'digital',
      timestamp: Date.now()
    };

    // 2. Send to Local AI Server
    const toastId = toast.loading("Syncing data to AI Portal...");
    try {
      // Try port 54321 (Local AI Server)
      const response = await fetch('http://localhost:54321/api/share-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to sync data");

      toast.success("Data synced! Opening AI Portal...", { id: toastId });

      // 3. Open AI Portal
      window.parent.postMessage({ type: 'SWITCH_APP', appId: 'legal-pro', action: 'NEW_TEMPLATE' }, '*');

    } catch (error) {
      console.error("Sync Error", error);
      toast.error("Could not sync data to AI Portal. Is the local proxy running? Opening anyway...", { id: toastId });
      // Open anyway as fallback
      window.parent.postMessage({ type: 'SWITCH_APP', appId: 'legal-pro', action: 'NEW_TEMPLATE' }, '*');
    }
  };

  const handleExport = () => {
    if (!parsedData) return;

    // Create mapped data
    const exportResult = getExportData();
    if (!exportResult) return;
    const mappedData = exportResult.data;
    let headers = exportResult.headers;

    // Filter out columns that are completely empty
    headers = headers.filter(header => {
      // Check if ANY row has a non-empty value for this header
      return mappedData.some((row: any) => {
        const val = row[header];
        return val !== undefined && val !== null && String(val).trim() !== '';
      });
    });

    if (headers.length === 0) {
      toast.error('No data to export (all columns are empty).');
      return;
    }

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...mappedData.map((row: any) =>
        headers.map((header) => `"${row[header] || ''}"`).join(',')
      ),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapped_${parsedData.fileName}`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Mapped CSV exported successfully (empty columns removed)!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      <Toaster position="top-right" />

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <Header />

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {!parsedData ? (
          <div className="max-w-2xl mx-auto">
            <CSVUploader onFileUpload={handleFileUpload} />

            {!mlReady && (
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                  {mlProgress ? `Downloading AI Model: ${Math.round(mlProgress.progress || 0)}%` : 'Initializing AI Model...'}
                </span>
              </div>
            )}

            {isProcessing && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-10 h-10 border-4 border-transparent border-r-purple-600 rounded-full animate-spin animation-delay-150"></div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Processing your spreadsheet...</p>
                    <p className="text-sm text-gray-500">Analyzing and mapping columns</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">

            <PhysicalToggle
              isPhysical={isPhysical}
              onToggle={handlePhysicalToggle}
            />

            <MappingInterface
              mappings={mappings}
              onMappingChange={handleMappingChange}
              onTargetRename={handleTargetRename}
              fileName={parsedData.fileName}
              isPhysical={isPhysical}
              isConsolidated={isConsolidated}
              onToggleConsolidation={handleConsolidationToggle}
              availableTargetHeaders={allTargetHeaders}
              showAddColumn={showAddColumn}
              setShowAddColumn={setShowAddColumn}
              newColumnName={newColumnName}
              setNewColumnName={setNewColumnName}
              handleAddCustomColumn={onAddCustomColumn}
              onDeleteColumn={handleDeleteColumn}
              onRestoreColumn={handleRestoreColumn}
              customTargetHeaders={customTargetHeaders}
              deletedTargetHeaders={deletedTargetHeaders}
            />

            <DataPreview
              parsedData={parsedData}
              mappings={mappings}
              exportResult={getExportData()}
            />

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleReset}
                className="group px-6 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200"
              >
                <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Upload New File
              </button>
              <button
                onClick={handleCreateTemplate}
                className="group relative px-6 py-3 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-500/50 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-400 transition-all duration-300 flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
              >
                <FileText className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                Create Template
              </button>
              <button
                onClick={handleExport}
                disabled={mappings.filter((m) => m.targetHeader !== null).length === 0}
                className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl overflow-hidden transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed hover:scale-105 hover:shadow-xl flex items-center gap-2 font-medium"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  Export Mapped CSV
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}