import { useState, useEffect } from 'react';
import { CSVUploader } from './components/CSVUploader';
import { MappingInterface } from './components/MappingInterface';
import { Download, RotateCcw, FileText, Users } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useCSVMapping } from './hooks/useCSVMapping';
import { CsvRow } from './utils/csvParser';
import { Header } from './components/Header';
import { PhysicalToggle } from './components/PhysicalToggle';
import { DataPreview } from './components/DataPreview';
import { HeaderMapping } from './utils/headerMatcher';

import { ConsolidationToggle } from './components/ConsolidationToggle';
// @ts-ignore
import * as XLSX from 'xlsx-js-style';
import { useMemo } from 'react';
import { batchAnalyzeAddresses, AddressSummary } from './utils/addressAnalyzer';

export default function App() {
  const {
    parsedData,
    mappings,
    isProcessing,
    isPhysical,
    allowDuplicateBarcodes,
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
    handleRotationToggle,
    handleReset,
    handleDeleteColumn,
    handleRestoreColumn,
    getExportData,
    isRotationEnabled,
    mlReady,
    mlProgress,
    pendingPhysicalToggle,
    setPendingPhysicalToggle,
    lenderTemplates,
    activeLender,
    hasUnsavedChanges,
    applyLenderTemplate,
    saveAsLenderTemplate,
    updateCurrentLenderTemplate
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

  const validateMappedData = (mappedData: CsvRow[]) => {
    let missingAddressCount = 0;
    let missingPhoneCount = 0;
    let missingEmailCount = 0;

    mappedData.forEach(row => {
      // Address check
      const addressKeys = Object.keys(row).filter(k => k.toLowerCase().includes('address'));
      const hasAddress = addressKeys.some(k => row[k] && String(row[k]).trim() !== '');
      if (!hasAddress) missingAddressCount++;

      // Phone check
      const phoneKeys = Object.keys(row).filter(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
      const hasPhone = phoneKeys.some(k => row[k] && String(row[k]).trim() !== '');
      if (!hasPhone) missingPhoneCount++;

      // Email check (only if there is an email column present/mapped)
      const emailKeys = Object.keys(row).filter(k => k.toLowerCase().includes('email'));
      if (emailKeys.length > 0) {
        const hasEmail = emailKeys.some(k => row[k] && String(row[k]).trim() !== '');
        if (!hasEmail) missingEmailCount++;
      }
    });

    if (isPhysical) {
      if (missingAddressCount > 0) {
        toast.warning(`Warning: ${missingAddressCount} rows are missing an address! Physical mode strongly requires complete addresses.`, { duration: 8000 });
      }
    } else {
      if (missingPhoneCount > 0) {
        toast.warning(`Warning: ${missingPhoneCount} rows are missing a phone number! Digital mode strongly requires a phone number.`, { duration: 8000 });
      }
      if (missingEmailCount > 0) {
        toast.info(`Note: ${missingEmailCount} rows are missing an email address (Optional).`, { duration: 5000 });
      }
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

    // Show warnings if necessary
    validateMappedData(mappedData);

    if (mappings.filter((m: HeaderMapping) => m.targetHeader !== null).length === 0) {
      toast.error("Please map at least one column.");
      return;
    }

    // Filter out columns that are completely empty
    headers = headers.filter(header => {
      return mappedData.some((row: CsvRow) => {
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
      // Try Local AI Server
      const response = await fetch(`${import.meta.env.VITE_AI_PORTAL_URL}/api/share-data`, {
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

  const [showExportOptions, setShowExportOptions] = useState(false);

  const handleExport = (format: 'xlsx' | 'csv' | 'json' = 'xlsx') => {
    if (!parsedData) return;

    // Create mapped data
    const exportResult = getExportData();
    if (!exportResult) return;
    const mappedData = exportResult.data;
    let headers = exportResult.headers;

    // Show warnings if necessary
    validateMappedData(mappedData);

    // Filter out columns that are completely empty
    headers = headers.filter(header => {
      // Check if ANY row has a non-empty value for this header
      return mappedData.some((row: CsvRow) => {
        const val = row[header];
        return val !== undefined && val !== null && String(val).trim() !== '';
      });
    });

    if (headers.length === 0) {
      toast.error('No data to export (all columns are empty).');
      return;
    }

    // Strip existing extensions
    const cleanFileName = parsedData.fileName.replace(/\.[^/.]+$/, "");
    const exportFileName = `mapped_${cleanFileName}.${format}`;

    if (format === 'json') {
      const jsonStr = JSON.stringify(mappedData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Convert to Excel/CSV using SheetJS
      const ws = XLSX.utils.json_to_sheet(mappedData, { header: headers });
      
      // Add rotation colors for XLSX
      if (format === 'xlsx') {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        
        // Define a palette of subtle background colors for rotation groups
        const colorPalette = [
            'FFFFFF', // Index 0 (Main Borrower) - White
            'F3F4F6', // Index 1 (Co-Borrower 1) - Light Gray
            'E0E7FF', // Index 2 (Co-Borrower 2) - Light Indigo
            'DCFCE7', // Index 3 (Co-Borrower 3) - Light Green
            'FEF3C7', // Index 4 (Co-Borrower 4) - Light Yellow
            'FFE4E6', // Index 5 (Co-Borrower 5) - Light Rose
        ];

        // Format Headers (Row 0)
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4F46E5" } } // Indigo 600
            };
        }

        // Format Data Rows
        for (let R = 1; R <= range.e.r; R++) {
            const rowData = mappedData[R - 1]; // R starts at 1, data array is 0-indexed
            // Retrieve rotation index (accounts for lowercase cast from mapping)
            const rotIdx = rowData['__rotationindex'] ?? rowData['__rotationIndex'] ?? 0;
            const color = colorPalette[rotIdx % colorPalette.length];
            
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) continue;
                
                ws[cellAddress].s = {
                    fill: { fgColor: { rgb: color } }
                };
            }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mapped Data");

      if (format === 'csv') {
        XLSX.writeFile(wb, exportFileName, { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, exportFileName);
      }
    }

    setShowExportOptions(false);
    toast.success(`Mapped file exported successfully as ${format.toUpperCase()}!`);
  };

  const addressSummary = useMemo(() => {
    if (!parsedData) return null;
    const exportResult = getExportData();
    if (!exportResult) return null;
    
    // Find ALL headers that contain "address"
    const addressHeaders = exportResult.headers.filter(h => h.toLowerCase().includes('address'));

    if (addressHeaders.length === 0) return null;

    // Collect all unique non-empty addresses from all these columns
    const allAddresses: string[] = [];
    exportResult.data.forEach((row: any) => {
      addressHeaders.forEach(header => {
        const val = row[header];
        if (val && String(val).trim() !== '') {
          allAddresses.push(String(val).trim());
        }
      });
    });

    if (allAddresses.length === 0) return null;

    return batchAnalyzeAddresses(allAddresses);
  }, [parsedData, mappings, getExportData]);

  const completenessSummary = useMemo(() => {
    if (!parsedData) return null;
    const exportResult = getExportData();
    if (!exportResult) return null;

    let missingAddress = 0;
    let missingPhone = 0;
    let missingEmail = 0;

    exportResult.data.forEach((row: any) => {
      // Address check
      const addressKeys = Object.keys(row).filter(k => k.toLowerCase().includes('address'));
      const hasAddress = addressKeys.some(k => row[k] && String(row[k]).trim() !== '');
      if (!hasAddress) missingAddress++;

      // Phone check
      const phoneKeys = Object.keys(row).filter(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
      const hasPhone = phoneKeys.some(k => row[k] && String(row[k]).trim() !== '');
      if (!hasPhone) missingPhone++;

      // Email check
      const emailKeys = Object.keys(row).filter(k => k.toLowerCase().includes('email'));
      if (emailKeys.length > 0) {
        const hasEmail = emailKeys.some(k => row[k] && String(row[k]).trim() !== '');
        if (!hasEmail) missingEmail++;
      }
    });

    return {
      missingAddress,
      missingPhone,
      missingEmail,
      total: exportResult.data.length
    };
  }, [parsedData, mappings, getExportData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      <Toaster position="top-right" />

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <Header summary={addressSummary} completeness={completenessSummary} />

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
              allowDuplicateBarcodes={allowDuplicateBarcodes}
              onToggle={handlePhysicalToggle}
              forceOpenModal={pendingPhysicalToggle}
              onModalClose={() => setPendingPhysicalToggle(false)}
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
              lenderTemplates={lenderTemplates}
              activeLender={activeLender}
              hasUnsavedChanges={hasUnsavedChanges}
              applyLenderTemplate={applyLenderTemplate}
              saveAsLenderTemplate={saveAsLenderTemplate}
              updateCurrentLenderTemplate={updateCurrentLenderTemplate}
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
                onClick={handleRotationToggle}
                className={`group relative px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium shadow-sm hover:shadow-md ${
                  isRotationEnabled 
                  ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-500/50 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                }`}
              >
                <Users className={`w-5 h-5 transition-transform duration-300 ${isRotationEnabled ? 'scale-110' : 'group-hover:scale-110'}`} />
                {isRotationEnabled ? 'Rotation Active' : 'Borrower Rotation'}
              </button>
              <div className="relative group/export">
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  disabled={mappings.filter((m: HeaderMapping) => m.targetHeader !== null).length === 0}
                  className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl overflow-hidden transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed hover:scale-105 hover:shadow-xl flex items-center gap-2 font-medium"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                    Export Mapping
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                {showExportOptions && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-200 dark:border-t-gray-700"></div>
                    <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white dark:border-t-gray-800"></div>
                    <button
                      onClick={() => handleExport('csv')}
                      className="px-4 py-2 font-semibold text-sm rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 hover:scale-105 hover:shadow-md transition-all whitespace-nowrap"
                    >
                      .CSV
                    </button>
                    <button
                      onClick={() => handleExport('xlsx')}
                      className="px-4 py-2 font-semibold text-sm rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 hover:scale-105 hover:shadow-md transition-all whitespace-nowrap"
                    >
                      .XLSX
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="px-4 py-2 font-semibold text-sm rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800 hover:scale-105 hover:shadow-md transition-all whitespace-nowrap"
                    >
                      .JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}