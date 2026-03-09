import { Check, AlertCircle, ArrowRight, Edit2, Plus, Trash2, Settings } from 'lucide-react';
import { HeaderMapping, TARGET_HEADERS } from '../utils/headerMatcher';
import { useState } from 'react';
import { ConsolidationToggle } from './ConsolidationToggle';

interface MappingInterfaceProps {
  mappings: HeaderMapping[];
  onMappingChange: (index: number, newTarget: string | null) => void;
  onTargetRename: (index: number, newName: string) => void;
  fileName: string;
  isPhysical: boolean;
  isConsolidated: boolean;
  onToggleConsolidation: () => void;
  availableTargetHeaders: string[];
  showAddColumn: boolean;
  setShowAddColumn: (show: boolean) => void;
  newColumnName: string;
  setNewColumnName: (name: string) => void;
  handleAddCustomColumn: () => void;
  onDeleteColumn?: (columnName: string) => void;
  onRestoreColumn?: (columnName: string) => void; // Added prop
  customTargetHeaders?: string[];
  deletedTargetHeaders?: string[];
}

export function MappingInterface({
  mappings,
  onMappingChange,
  onTargetRename,
  fileName,
  isPhysical,
  isConsolidated,
  onToggleConsolidation,
  availableTargetHeaders,
  showAddColumn,
  setShowAddColumn,
  newColumnName,
  setNewColumnName,
  handleAddCustomColumn,
  onDeleteColumn,
  onRestoreColumn, // Added destructuring
  customTargetHeaders = [],
  deletedTargetHeaders = [],
}: MappingInterfaceProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showManageColumns, setShowManageColumns] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    if (confidence > 0) return 'Low';
    return 'No Match';
  };

  const handleStartEdit = (index: number, currentValue: string) => {
    setEditingIndex(index);
    setEditValue(currentValue);
  };

  const handleSaveEdit = (index: number) => {
    if (editValue.trim()) {
      onTargetRename(index, editValue.trim());
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  // Filter out barcode if not physical
  const filteredHeaders = isPhysical
    ? availableTargetHeaders
    : availableTargetHeaders.filter((h) => h !== 'barcode');

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Column Mapping</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">File: <span className="font-medium text-blue-600 dark:text-blue-400">{fileName}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-blue-700">{mappings.length} columns</span>
          </div>
        </div>

        <div className="space-y-3">
          {mappings.map((mapping, index) => (
            <div
              key={index}
              className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 hover:from-blue-50 hover:to-purple-50/30 dark:from-gray-800/50 dark:to-blue-900/20 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 rounded-xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300/50 dark:hover:border-blue-600/50 hover:shadow-md"
            >
              {/* Source Header */}
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">
                  Source Column
                </label>
                <div className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-900 dark:text-gray-200 shadow-sm">
                  {mapping.sourceHeader}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 mt-6">
                <ArrowRight className="w-5 h-5 text-blue-500 dark:text-blue-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors group-hover:translate-x-1 duration-300" />
              </div>

              {/* Target Header Dropdown or Input */}
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">
                  Target Column
                </label>
                {editingIndex === index ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(index);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm dark:text-gray-100"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(index)}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={mapping.targetHeader || ''}
                      onChange={(e) =>
                        onMappingChange(
                          index,
                          e.target.value === '' ? null : e.target.value
                        )
                      }
                      className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm font-medium dark:text-gray-100"
                    >
                      <option value="">-- Skip Column --</option>
                      {filteredHeaders.map((header, headerIdx) => (
                        <option key={`${header}-${headerIdx}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                    {mapping.targetHeader && (
                      <button
                        onClick={() =>
                          handleStartEdit(index, mapping.targetHeader!)
                        }
                        className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 flex items-center gap-1 shadow-sm hover:shadow-md"
                        title="Rename target column"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Confidence Badge */}
              <div className="flex-shrink-0 mt-6">
                {mapping.confidence > 0 ? (
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 shadow-sm ${getConfidenceColor(
                      mapping.confidence
                    )}`}
                  >
                    {getConfidenceLabel(mapping.confidence)}
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-600">
                    Skipped
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConsolidationToggle
        isConsolidated={isConsolidated}
        onToggle={onToggleConsolidation} // Use the prop handler
      />

      {/* Add Custom Column */}
      {showAddColumn ? (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-200 dark:border-blue-900/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">Add Custom Column(s)</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
            💡 Tip: Enter one or more column names separated by commas (e.g., "column1, column2, column3")
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustomColumn();
                if (e.key === 'Escape') setShowAddColumn(false);
              }}
              className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              placeholder="Enter column name(s) separated by commas"
              autoFocus
            />
            <button
              onClick={handleAddCustomColumn}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-medium shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddColumn(false);
                setNewColumnName('');
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddColumn(true)}
          className="group w-full px-6 py-4 bg-white/80 backdrop-blur-sm border-2 border-dashed border-gray-300 text-gray-600 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow-lg"
        >
          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            <Plus className="w-5 h-5 text-blue-600" />
          </div>
          <span className="font-medium group-hover:text-blue-600 transition-colors">
            Add Custom Target Column(s)
          </span>
        </button>
      )}

      {/* Manage Target Columns */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <button
          onClick={() => setShowManageColumns(!showManageColumns)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-all duration-300 ${showManageColumns
              ? 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40'
              }`}>
              <Settings className={`w-5 h-5 transition-all duration-300 ${showManageColumns
                ? 'text-white rotate-90'
                : 'text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:rotate-45'
                }`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Target Columns</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${showManageColumns
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}>
              {availableTargetHeaders.length} available
            </span>
            <span className="text-sm text-blue-600 font-medium group-hover:underline">
              {showManageColumns ? 'Hide' : 'Show'}
            </span>
          </div>
        </button>

        {showManageColumns && (
          <div className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/30">
              ⚠️ Delete columns you don't need from the available target headers
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Built-in columns */}
              {TARGET_HEADERS.filter(
                (header) => !deletedTargetHeaders.includes(header)
              ).map((header, idx) => (
                <div
                  key={`builtin-${header}-${idx}`}
                  className="group/item flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 hover:from-blue-50 hover:to-purple-50/30 dark:from-gray-800/50 dark:to-blue-900/20 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{header}</span>
                  {onDeleteColumn && (
                    <button
                      onClick={() => onDeleteColumn(header)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-0 group-hover/item:opacity-100 hover:scale-110"
                      title="Delete column"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Custom columns */}
              {customTargetHeaders.map((header, idx) => (
                <div
                  key={`custom-${header}-${idx}`}
                  className="group/item flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{header}</span>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                      Custom
                    </span>
                  </div>
                  {onDeleteColumn && (
                    <button
                      onClick={() => onDeleteColumn(header)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100 hover:scale-110"
                      title="Delete column"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Extra / Mapped columns */}
              {availableTargetHeaders
                .filter(h => !TARGET_HEADERS.includes(h) && !customTargetHeaders.includes(h))
                .map((header, idx) => (
                  <div
                    key={`extra-${header}-${idx}`}
                    className="group/item flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{header}</span>
                      <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                        Extra
                      </span>
                    </div>
                    {onDeleteColumn && (
                      <button
                        onClick={() => onDeleteColumn(header)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100 hover:scale-110"
                        title="Delete column"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
            </div>

            {deletedTargetHeaders.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                    {deletedTargetHeaders.length}
                  </span>
                  Deleted columns (Click to restore)
                </p>
                <div className="flex flex-wrap gap-2">
                  {deletedTargetHeaders.map((header) => (
                    <button
                      key={header}
                      onClick={() => onRestoreColumn && onRestoreColumn(header)}
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full line-through border border-gray-200 hover:bg-green-100 hover:text-green-700 hover:no-underline hover:border-green-300 transition-all"
                      title="Click to restore this column"
                    >
                      {header}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}