import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  X, Save, Upload, FileText, 
  CheckSquare, Square, Info, ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Theme, ThemeTemplate } from '../App';
import { Advocate, Lender, getAdvocates, getLenders, getNoticeTypes, NoticeType } from '../api';
import { toast } from 'sonner';

interface EditThemeModalProps {
  theme: Theme | null;
  onClose: () => void;
  onSave: (theme: Theme) => void;
}

export function EditThemeModal({ theme, onClose, onSave }: EditThemeModalProps) {
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [noticeTypeOptions, setNoticeTypeOptions] = useState<NoticeType[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [formData, setFormData] = useState<Theme>(
    theme && theme.id ? theme : {
      id: Date.now().toString(),
      name: '',
      description: '',
      lender: '',
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      advocates: [],
      noticeTypes: [],
      templates: [],
      selectedVariables: [],
      amountVariables: [],
      isPhysical: false
    }
  );

  useEffect(() => {
    const loadData = async () => {
      const [advs, lens, types] = await Promise.all([getAdvocates(), getLenders(), getNoticeTypes()]);
      setAdvocates(advs);
      setLenders(lens);
      setNoticeTypeOptions(types);
    };
    loadData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.lender) {
      toast.error("Name and Lender are required");
      return;
    }
    onSave(formData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            const fields = results.meta.fields;
            // Auto-tick variables that contain "amount" or "amt"
            const autoAmountVars = fields.filter(f => 
              f.toLowerCase().includes('amount') || f.toLowerCase().includes('amt')
            );

            setFormData({
              ...formData,
              csvHeaders: fields,
              sampleData: results.data as Record<string, string>[],
              amountVariables: Array.from(new Set([...(formData.amountVariables || []), ...autoAmountVars]))
            });
            
            if (autoAmountVars.length > 0) {
              toast.success(`Extracted ${fields.length} variables. Auto-selected: ${autoAmountVars.join(', ')}`);
            } else {
              toast.success(`Extracted ${fields.length} variables from CSV`);
            }
          }
        },
        error: (error) => {
          toast.error("Error parsing CSV: " + error.message);
        }
      });
    }
  };

  const variableOptions = formData.csvHeaders || [];

  const handleToggleVariable = (v: string) => {
    const current = formData.amountVariables || [];
    if (current.includes(v)) {
      setFormData({ ...formData, amountVariables: current.filter(x => x !== v) });
    } else {
      setFormData({ ...formData, amountVariables: [...current, v] });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header matching Image 2 */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {theme?.id ? 'Edit Theme' : 'Create New Theme'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Main Info Fields matching Image 2 */}
          <div className="space-y-6">
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-gray-400 absolute left-3 -top-2 bg-white dark:bg-gray-900 px-1 z-10 transition-all">Name *</label>
              <Input 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="h-14 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-blue-500/20"
                placeholder="Enter theme name"
              />
            </div>

            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-gray-400 absolute left-3 -top-2 bg-white dark:bg-gray-900 px-1 z-10 transition-all">Description</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full min-h-[100px] p-4 bg-transparent border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Theme description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lender Dropdown matching Image 2 */}
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-400 absolute left-3 -top-2 bg-white dark:bg-gray-900 px-1 z-10">lender</label>
                <div className="relative">
                  <select 
                    value={formData.lender}
                    onChange={e => setFormData({ ...formData, lender: e.target.value })}
                    className="w-full h-14 pl-4 pr-10 bg-transparent border border-gray-200 dark:border-gray-700 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500/20 text-gray-700 font-medium uppercase text-center"
                  >
                    <option value="">Select Lender</option>
                    {lenders.map(l => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-600" />
                </div>
              </div>

              {/* Advocate Multi-select matching Image 2 */}
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-400 absolute left-3 -top-2 bg-white dark:bg-gray-900 px-1 z-10">select Advocate</label>
                <div className="relative group">
                  <div className="min-h-[56px] p-2 pl-4 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-wrap gap-2 items-center">
                    {formData.advocates.map(adv => (
                      <span key={adv} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm font-medium">
                        {adv}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-purple-800" 
                          onClick={() => setFormData({ ...formData, advocates: formData.advocates.filter(a => a !== adv) })}
                        />
                      </span>
                    ))}
                    {formData.advocates.length === 0 && <span className="text-gray-400">Select Advocate</span>}
                  </div>
                  <select 
                    onChange={e => {
                      if (e.target.value && !formData.advocates.includes(e.target.value)) {
                        setFormData({ ...formData, advocates: [...formData.advocates, e.target.value] });
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  >
                    <option value="">Add Advocate...</option>
                    {advocates.map(a => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
               <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-400 absolute left-3 -top-2 bg-white dark:bg-gray-900 px-1 z-10">Select Notice Type</label>
                <div className="min-h-[56px] p-2 pl-4 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-wrap gap-2 items-center relative">
                   {formData.noticeTypes.map(nt => (
                      <span key={nt} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                        {nt}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-blue-800" 
                          onClick={() => setFormData({ ...formData, noticeTypes: formData.noticeTypes.filter(n => n !== nt) })}
                        />
                      </span>
                    ))}
                    <select 
                      onChange={e => {
                        if (e.target.value && !formData.noticeTypes.includes(e.target.value)) {
                          setFormData({ ...formData, noticeTypes: [...formData.noticeTypes, e.target.value] });
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    >
                      <option value="">Add Type...</option>
                      {noticeTypeOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.title} ({option.id})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-3 pl-2">
                <input 
                  type="checkbox" 
                  id="isPhysical"
                  checked={formData.isPhysical}
                  onChange={e => setFormData({ ...formData, isPhysical: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPhysical" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Is Physical?
                </label>
              </div>
            </div>
          </div>

          {/* Upload Section matching Image 2 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Upload CSV</h4>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 px-6 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-all font-medium text-sm">
                <Upload className="w-4 h-4 text-blue-600" />
                {fileName ? 'Change CSV' : 'Choose CSV file'}
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv" 
                  onChange={handleFileUpload}
                />
              </label>
              <span className="text-sm text-gray-400 font-medium truncate max-w-[200px]">
                {fileName || (formData.csvHeaders?.length ? 'CSV Headers Loaded' : 'No file chosen')}
              </span>
            </div>
          </div>

          {/* Amount to Words Config - Only visible when variables exist from CSV */}
          {variableOptions.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-4 fade-in duration-500">
               <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-blue-900 dark:text-blue-400">Select Variables To Convert amount to words</span>
                  <div className="p-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <Info className="w-4 h-4" />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {variableOptions.map(variable => (
                    <div 
                      key={variable}
                      onClick={() => handleToggleVariable(variable)}
                      className="flex items-center gap-4 cursor-pointer group"
                    >
                      <div className={`transition-all ${
                        formData.amountVariables?.includes(variable) 
                        ? 'text-blue-600' 
                        : 'text-gray-400 group-hover:text-gray-600'
                      }`}>
                        {formData.amountVariables?.includes(variable) ? (
                          <CheckSquare className="w-6 h-6" />
                        ) : (
                          <Square className="w-6 h-6" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{variable}</span>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="px-8 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="h-11 px-8 font-semibold">Cancel</Button>
          <Button 
            onClick={handleSubmit}
            className="h-11 px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Save Theme
          </Button>
        </div>
      </div>
    </div>
  );
}
