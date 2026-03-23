import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Copy, 
  ChevronDown, Languages, FileText, Eye, AlertTriangle 
} from 'lucide-react';
import { Theme, ThemeTemplate } from '../App';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { PortalNoticePreview } from './PortalNoticePreview';
import { getAdvocates, Advocate } from '../api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface ThemesDashboardProps {
  themes: Theme[];
  onEditTheme: (theme: Theme) => void;
  onDeleteTheme: (id: string) => void;
  onCloneTheme: (theme: Theme) => void;
  onAddTemplate: (theme: Theme) => void;
  onEditTemplate: (theme: Theme, template: ThemeTemplate) => void;
  onDeleteTemplate: (theme: Theme, template: ThemeTemplate) => void;
}

export function ThemesDashboard({ themes, onEditTheme, onDeleteTheme, onCloneTheme, onAddTemplate, onEditTemplate, onDeleteTemplate }: ThemesDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLender, setSelectedLender] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [previewData, setPreviewData] = useState<{theme: Theme, template: ThemeTemplate} | null>(null);
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
  const [themeToClone, setThemeToClone] = useState<Theme | null>(null);

  useEffect(() => {
    getAdvocates().then(setAdvocates);
  }, []);

  const filteredThemes = themes.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLender = selectedLender ? t.lender === selectedLender : true;
    const matchesType = selectedType ? t.noticeTypes.includes(selectedType) : true;
    return matchesSearch && matchesLender && matchesType;
  });

  const uniqueLenders = Array.from(new Set(themes.map(t => t.lender)));
  const uniqueTypes = Array.from(new Set(themes.flatMap(t => t.noticeTypes)));

  return (
    <div className="space-y-6">
      {/* Search and Filters Matching Image 1 */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => onEditTheme({} as Theme)} 
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 px-4 h-11"
          >
            <Plus className="w-5 h-5" />
            Create Theme
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-4xl justify-end">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by name" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            />
          </div>
          
          <select 
            value={selectedLender}
            onChange={(e) => setSelectedLender(e.target.value)}
            className="h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          >
            <option value="">Lender</option>
            {uniqueLenders.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          >
            <option value="">Select Notice Type</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Themes List Matching Image 1 */}
      <div className="space-y-4">
        {filteredThemes.map((theme) => (
          <ThemeCard 
            key={theme.id} 
            theme={theme} 
            onEdit={() => onEditTheme(theme)}
            onDelete={() => setThemeToDelete(theme.id)}
            onClone={() => setThemeToClone(theme)}
            onPreview={(tpl) => setPreviewData({ theme, template: tpl })}
            onAddTemplate={() => onAddTemplate(theme)}
            onEditTemplate={(tpl) => onEditTemplate(theme, tpl)}
            onDeleteTemplate={(tpl) => onDeleteTemplate(theme, tpl)}
          />
        ))}
        {filteredThemes.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No themes found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!themeToDelete} onOpenChange={(open) => !open && setThemeToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-none shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Delete Theme?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400 font-medium">
              This action cannot be undone. All templates and data associated with this theme will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="h-11 px-6 rounded-xl font-semibold border-gray-200 dark:border-gray-800">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (themeToDelete) onDeleteTheme(themeToDelete);
                setThemeToDelete(null);
              }}
              className="h-11 px-8 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-all border-none"
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Confirmation */}
      <AlertDialog open={!!themeToClone} onOpenChange={(open) => !open && setThemeToClone(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-none shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Copy className="w-5 h-5 text-purple-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Clone Theme?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400 font-medium">
              Do you want to create a full copy of "{themeToClone?.name}"? You can edit the copy independently afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="h-11 px-6 rounded-xl font-semibold border-gray-200 dark:border-gray-800">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (themeToClone) onCloneTheme(themeToClone);
                setThemeToClone(null);
              }}
              className="h-11 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all border-none"
            >
              Clone Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      {previewData && (
        <PortalNoticePreview 
          theme={previewData.theme}
          template={previewData.template} 
          content={previewData.template.content}
          language={previewData.template.language}
          advocate={advocates.find(a => previewData.theme.advocates.includes(a.name))}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}

function ThemeCard({ theme, onEdit, onDelete, onClone, onPreview, onAddTemplate, onEditTemplate, onDeleteTemplate }: { 
  theme: Theme, 
  onEdit: () => void, 
  onDelete: () => void,
  onClone: () => void,
  onPreview: (tpl: ThemeTemplate) => void,
  onAddTemplate: () => void,
  onEditTemplate: (tpl: ThemeTemplate) => void,
  onDeleteTemplate: (tpl: ThemeTemplate) => void
}) {
  return (
    <Card className="p-0 border-none shadow-sm bg-white dark:bg-gray-800 overflow-hidden ring-1 ring-gray-100 dark:ring-gray-700">
      <div className="flex gap-6 p-6">
        {/* Left Side: Theme Info */}
        <div className="w-80 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 truncate pr-4">
              {theme.name}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={onEdit}
                className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                title="Edit Theme"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={onDelete}
                className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                title="Delete Theme"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={onClone}
                className="p-2 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                title="Clone Theme"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="inline-flex px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full mb-3 tracking-wider">
            {theme.lender}
          </div>
          
          <p className="text-sm text-gray-500 font-medium">{theme.date}</p>
        </div>

        {/* Right Side: Templates List Matching Image 1 */}
        <div className="flex-1 bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold text-blue-600">Templates</span>
          </div>

          <div className="space-y-2">
            {theme.templates.map((tpl, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{tpl.language}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400 font-medium">{tpl.createdAt}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onEditTemplate(tpl)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onPreview(tpl)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteTemplate(tpl)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={onAddTemplate}
              className="w-full py-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md mt-4"
            >
              <Plus className="w-4 h-4" />
              Add Template
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
