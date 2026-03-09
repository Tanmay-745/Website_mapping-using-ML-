import { Package, X } from 'lucide-react';

import { useState } from 'react';

interface PhysicalToggleProps {
    isPhysical: boolean;
    onToggle: (lenderName?: string) => void;
}

export function PhysicalToggle({ isPhysical, onToggle }: PhysicalToggleProps) {
    const [showModal, setShowModal] = useState(false);
    const [lenderName, setLenderName] = useState('');

    const handleToggleClick = () => {
        if (!isPhysical) {
            // Turning ON
            setShowModal(true);
        } else {
            // Turning OFF
            onToggle();
            setLenderName('');
        }
    };

    const handleConfirm = () => {
        if (lenderName.trim()) {
            onToggle(lenderName.trim());
            setShowModal(false);
        }
    };

    return (
        <div className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-all duration-300 ${isPhysical
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                        <Package className={`w-6 h-6 ${isPhysical ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Physical Document Mode</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            {isPhysical
                                ? '✓ Barcode column is available for mapping'
                                : 'Enable to include barcode column in mapping'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleToggleClick}
                    className={`relative px-8 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${isPhysical
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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

            {/* Lender Name Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Enable Physical Mode</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Please enter the Lender Name for these barcodes. This will be sent to the Barcode Portal.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="lenderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Lender Name
                                </label>
                                <input
                                    type="text"
                                    id="lenderName"
                                    value={lenderName}
                                    onChange={(e) => setLenderName(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                                    placeholder="Enter lender name (e.g., Bank of Demo)"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirm();
                                        if (e.key === 'Escape') setShowModal(false);
                                    }}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!lenderName.trim()}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
