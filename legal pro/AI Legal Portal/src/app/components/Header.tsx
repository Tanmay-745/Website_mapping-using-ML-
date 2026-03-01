import { FileText, LayoutTemplate } from 'lucide-react';
import { useState } from 'react';
import { AdvocatesModal } from './AdvocatesModal';

interface HeaderProps {
    onShowSaved?: () => void;
}

export function Header({ onShowSaved }: HeaderProps) {
    const [isAdvocatesOpen, setIsAdvocatesOpen] = useState(false);

    return (
        <header className="relative bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center gap-4">
                    <div className="relative p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg">
                        <FileText className="w-8 h-8 text-white" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            AI Legal Portal
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Generate customized legal notices with AI ✨
                        </p>
                    </div>
                </div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    <button
                        onClick={onShowSaved}
                        className="group flex items-center gap-2 px-4 py-2 bg-white border border-indigo-100 text-indigo-700 rounded-xl shadow-sm hover:shadow-md hover:bg-indigo-50 transition-all duration-300 font-medium text-sm"
                    >
                        <LayoutTemplate className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                        Saved Templates
                    </button>
                    <button
                        onClick={() => setIsAdvocatesOpen(true)}
                        className="group flex items-center gap-2 px-4 py-2 bg-white border border-purple-100 text-purple-700 rounded-xl shadow-sm hover:shadow-md hover:bg-purple-50 transition-all duration-300 font-medium text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Advocates
                    </button>
                    <button
                        className="group flex items-center gap-2 px-4 py-2 bg-white border border-blue-100 text-blue-700 rounded-xl shadow-sm hover:shadow-md hover:bg-blue-50 transition-all duration-300 font-medium text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                        Digital
                    </button>
                    <button
                        className="group flex items-center gap-2 px-4 py-2 bg-white border border-amber-100 text-amber-700 rounded-xl shadow-sm hover:shadow-md hover:bg-amber-50 transition-all duration-300 font-medium text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22v-9" /></svg>
                        Physical
                    </button>
                    <div className="h-8 w-px bg-gray-200 mx-1"></div>
                    <button
                        onClick={() => {
                            window.parent.postMessage({ type: 'SWITCH_APP', appId: 'legal-mapping' }, '*');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium text-sm group border border-gray-700"
                    >
                        <span>Legal Mapping Portal</span>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </button>
                </div>
            </div>
            <AdvocatesModal isOpen={isAdvocatesOpen} onClose={() => setIsAdvocatesOpen(false)} />
        </header >
    );
}
