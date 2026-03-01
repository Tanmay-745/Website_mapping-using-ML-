import { FileSpreadsheet } from 'lucide-react';

export function Header() {
    return (
        <header className="relative bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center gap-4">
                    <div className="relative p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg">
                        <FileSpreadsheet className="w-8 h-8 text-white" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Mapping Portal
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
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
