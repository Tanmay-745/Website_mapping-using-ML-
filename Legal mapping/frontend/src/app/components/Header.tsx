import { FileSpreadsheet, PhoneOff, MapPinOff, MailWarning } from 'lucide-react';
import { AddressSummary } from '../utils/addressAnalyzer';

export interface DataCompleteness {
    missingAddress: number;
    missingPhone: number;
    missingEmail: number;
    total: number;
}

export function Header({ summary, completeness }: { summary?: AddressSummary | null, completeness?: DataCompleteness | null }) {
    return (
        <header className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800 shadow-sm transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg">
                        <FileSpreadsheet className="w-8 h-8 text-white" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                                Mapping Portal
                            </h1>
                            {completeness && (
                                <div className="flex items-center gap-2 text-xs font-semibold ml-2 mr-2">
                                    {completeness.missingPhone > 0 && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-800 shadow-sm" title={`${completeness.missingPhone} rows missing phone numbers`}>
                                            <PhoneOff className="w-3.5 h-3.5" /> Missing Phone: {completeness.missingPhone}
                                        </div>
                                    )}
                                    {completeness.missingAddress > 0 && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full border border-orange-200 dark:border-orange-800 shadow-sm" title={`${completeness.missingAddress} rows missing addresses`}>
                                            <MapPinOff className="w-3.5 h-3.5" /> Missing Address: {completeness.missingAddress}
                                        </div>
                                    )}
                                    {completeness.missingEmail > 0 && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full border border-yellow-200 dark:border-yellow-800 shadow-sm" title={`${completeness.missingEmail} rows missing emails`}>
                                            <MailWarning className="w-3.5 h-3.5" /> Missing Email: {completeness.missingEmail}
                                        </div>
                                    )}
                                </div>
                            )}
                            {summary && (
                                <div className="flex items-center gap-2 text-xs font-semibold ml-2">
                                    <div className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                        Deliverable: {summary.deliverable}
                                    </div>
                                    <div className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm">
                                        Review: {summary.needsReview}
                                    </div>
                                    <div className="px-2.5 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800 shadow-sm">
                                        Junk: {summary.junk}
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Intelligent column mapping powered by smart algorithms ✨
                        </p>
                    </div>
                </div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <button
                        onClick={() => {
                            window.parent.postMessage({ type: 'SWITCH_APP', appId: 'barcode' }, '*');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium text-sm group"
                    >
                        <span>Open Barcode Portal</span>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </button>
                </div>
            </div>
        </header >
    );
}
