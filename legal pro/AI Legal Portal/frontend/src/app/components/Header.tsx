import { FileText, LayoutTemplate, Briefcase, Mail, Printer, Settings } from 'lucide-react';
import { AppTab } from '../App';

interface HeaderProps {
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    userRole?: 'admin' | 'lender';
}

export function Header({ activeTab, onTabChange, userRole = 'admin' }: HeaderProps) {
    const isAdmin = userRole === 'admin';
    const tabs = [
        { id: 'themes', label: 'THEMES', icon: LayoutTemplate, show: true },
        { id: 'advocates', label: 'ADVOCATES', icon: Briefcase, show: isAdmin },
        { id: 'digital', label: 'DIGITAL', icon: Mail, show: isAdmin },
        { id: 'physical', label: 'PHYSICAL', icon: Printer, show: isAdmin },
    ].filter(t => t.show);

    return (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
            <div className="max-w-[1600px] mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                AI Legal Portal
                            </h1>
                        </div>

                        <nav className="flex items-center">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id as AppTab)}
                                    className={`relative px-6 h-20 flex items-center text-sm font-semibold tracking-wide transition-all duration-200 ${
                                        activeTab === tab.id
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {isAdmin && (
                            <button 
                                onClick={() => onTabChange('lenders' as AppTab)}
                                className={`p-2.5 rounded-xl transition-all duration-200 ${
                                    activeTab === 'lenders' 
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                                title="System Settings"
                            >
                                <Settings className={`w-5 h-5 ${activeTab === 'lenders' ? 'animate-spin-slow' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
