import { Package, X } from 'lucide-react';

import { useState } from 'react';

interface PhysicalToggleProps {
    isPhysical: boolean;
    allowDuplicateBarcodes?: boolean;
    onToggle: (lenderName?: string, allowDuplicate?: boolean) => void;
    forceOpenModal?: boolean;
    onModalClose?: () => void;
}

export function PhysicalToggle({ isPhysical, allowDuplicateBarcodes, onToggle, forceOpenModal, onModalClose }: PhysicalToggleProps) {
    const [localShowModal, setLocalShowModal] = useState(false);
    const showModal = localShowModal || forceOpenModal;

    const lenderName = '';
    const [localLenderName, setLocalLenderName] = useState('');
    const [duplicateBarcodes, setDuplicateBarcodes] = useState(false);

    const closeHandler = () => {
        setLocalShowModal(false);
        if (onModalClose) onModalClose();
    };

    const handleToggleClick = () => {
        if (!isPhysical) {
            // Turning ON
            setLocalShowModal(true);
            setDuplicateBarcodes(false); // Default to Unique
        } else {
            // Turning OFF
            onToggle();
            setLocalLenderName('');
            setDuplicateBarcodes(false);
        }
    };

    const handleConfirm = () => {
        if (localLenderName.trim()) {
            onToggle(localLenderName.trim(), duplicateBarcodes);
            closeHandler();
        }
    };

    return (
        <div className="group relative z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
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
                                ? `✓ Barcode available (${allowDuplicateBarcodes ? 'Duplicates ON' : 'Unique only'})`
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-700">
                        <button
                            onClick={closeHandler}
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
                                    value={localLenderName}
                                    onChange={(e) => setLocalLenderName(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                                    placeholder="Enter lender name (e.g., Bank of Demo)"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirm();
                                        if (e.key === 'Escape') closeHandler();
                                    }}
                                />

                                <div className="mt-4 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Duplicate Barcodes</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                                Assign same barcode to same ID + Phone
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setDuplicateBarcodes(!duplicateBarcodes)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${duplicateBarcodes ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${duplicateBarcodes ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={closeHandler}
                                    className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!localLenderName.trim()}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm"
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
