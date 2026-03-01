import { Package } from 'lucide-react';

interface PhysicalToggleProps {
    isPhysical: boolean;
    onToggle: () => void;
}

export function PhysicalToggle({ isPhysical, onToggle }: PhysicalToggleProps) {
    return (
        <div className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-all duration-300 ${isPhysical
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg'
                            : 'bg-gray-100'
                        }`}>
                        <Package className={`w-6 h-6 ${isPhysical ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">Physical Document Mode</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                            {isPhysical
                                ? '✓ Barcode column is available for mapping'
                                : 'Enable to include barcode column in mapping'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onToggle}
                    className={`relative px-8 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${isPhysical
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        {isPhysical ? (
                            <>
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                Physical: ON
                            </>
                        ) : (
                            'Physical: OFF'
                        )}
                    </span>
                </button>
            </div>
        </div>
    );
}
