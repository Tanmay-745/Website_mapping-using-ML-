import React from 'react';
import { Hash, Search, ChevronDown, CheckCircle2, Plus, X } from 'lucide-react';
import { Input } from './ui/input';

interface VariableSidePanelProps {
  variables: string[];
  amountVariables: string[];
  usedVariables: Set<string>;
  onInsert: (variable: string) => void;
  onClose: () => void;
}

export function VariableSidePanel({ 
  variables, 
  amountVariables, 
  usedVariables, 
  onInsert, 
  onClose 
}: VariableSidePanelProps) {
  const [search, setSearch] = React.useState("");

  const allAvailableVariables = [...new Set([...variables, ...amountVariables])];
  const usedCount = [...usedVariables].filter(v => allAvailableVariables.includes(v)).length;

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col rounded-2xl shadow-xl animate-in slide-in-from-right duration-300 h-full overflow-hidden">
      <div className="p-5 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Hash className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white leading-tight">
                Link Variables
              </h3>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                {usedCount}/{allAvailableVariables.length} USED
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search placeholders..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-xs bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {[
          { label: 'Standard', items: ['barcode', 'signature'], color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
          { label: 'Calculated Amounts', items: amountVariables, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Template Placeholders', items: variables, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' }
        ].map((group) => {
          const filteredItems = group.items.filter(i => i.toLowerCase().includes(search.toLowerCase()));
          if (filteredItems.length === 0) return null;
          
          return (
            <div key={group.label} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${group.color} ${group.bg} border rounded-lg mb-3 flex items-center justify-between`}>
                <span>{group.label}</span>
                <span className="opacity-50">{filteredItems.length}</span>
              </div>
              <div className="space-y-1.5">
                {filteredItems.map(variable => {
                  const isUsed = usedVariables.has(variable);
                  return (
                    <button
                      key={variable}
                      onClick={() => onInsert(variable)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-mono transition-all group ${isUsed ? 'bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 border border-transparent' : 'bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md border border-gray-100 dark:border-gray-800'}`}
                    >
                      <span className={isUsed ? 'line-through opacity-50' : 'font-bold'}>{variable}</span>
                      {isUsed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                          <Plus className="w-2.5 h-2.5 text-gray-300 group-hover:text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {allAvailableVariables.length === 0 && (
          <div className="text-center py-10">
            <p className="text-xs text-gray-400 italic">No variables found for this template.</p>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-500 leading-relaxed italic">
          💡 Click a variable to insert it at your cursor position. Green checkmarks indicate already used variables.
        </p>
      </div>
    </div>
  );
}
