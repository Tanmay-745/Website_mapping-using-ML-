import { Upload, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useCallback, useState } from 'react';

interface CSVUploaderProps {
  onFileUpload: (file: File) => void;
}

export function CSVUploader({ onFileUpload }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const dataFile = files.find(file =>
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
      );

      if (dataFile) {
        onFileUpload(dataFile);
      }
    },
    [onFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 overflow-hidden ${isDragging
        ? 'border-blue-400 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/40 dark:via-purple-900/40 dark:to-pink-900/40 scale-105 shadow-2xl'
        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>

      <div className="relative flex flex-col items-center gap-6">
        <div className={`relative p-6 rounded-full transition-all duration-300 ${isDragging
          ? 'bg-gradient-to-br from-blue-500 to-purple-600 scale-110 shadow-lg'
          : 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 hover:scale-105'
          }`}>
          {isDragging ? (
            <>
              <FileSpreadsheet className="w-16 h-16 text-white animate-pulse" />
              <Sparkles className="w-6 h-6 text-yellow-500 dark:text-yellow-300 absolute -top-2 -right-2 animate-bounce" />
            </>
          ) : (
            <Upload className="w-16 h-16 text-blue-600 dark:text-blue-400" />
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            {isDragging ? 'Drop your file here!' : 'Upload your CSV or Excel file'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drag & drop your file here, or click to browse
          </p>
          <div className="flex items-center gap-3 justify-center text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-mapping enabled</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <span>.csv, .xlsx, .xls</span>
          </div>
        </div>

        <label className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl cursor-pointer overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <span className="relative z-10 font-medium flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Browse Files
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}