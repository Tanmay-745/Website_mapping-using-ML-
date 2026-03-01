import { Layers, Layers2 } from 'lucide-react';

interface ConsolidationToggleProps {
    isConsolidated: boolean;
    onToggle: () => void;
}

export function ConsolidationToggle({ isConsolidated, onToggle }: ConsolidationToggleProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-indigo-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors duration-300 ${isConsolidated ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {isConsolidated ? <Layers2 className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                </div>
                <div>
                    <h3 className="font-medium text-gray-900">Data Consolidation (Remove Duplicates)</h3>
                    <p className="text-sm text-gray-500">
                        {isConsolidated
                            ? 'Rows merged by phone number. Multi-values (LAN, Overdue) pivoted.'
                            : 'Showing all original rows.'}
                    </p>
                </div>
            </div>

            <button
                onClick={onToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isConsolidated ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isConsolidated ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}
