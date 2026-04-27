import React, { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { TemplateEditor } from './TemplateEditor';
import { VariableSidePanel } from './VariableSidePanel';
import { generateNoticeContent, translateText, translateWithAccuracy } from '../api';
import { toast } from 'sonner';
import { TemplateData, Theme } from '../App';
import { getFallbackTemplate } from '../utils/templates_fallback';

interface TemplateEditorModalProps {
  templateData: TemplateData;
  onClose: () => void;
  onSave: (template: { language: string, content: string }) => void;
}

const languageMap: Record<string, string> = {
  English: "en",
  Hindi: "hi",
  Marathi: "mr",
  Gujarati: "gu",
  Tamil: "ta",
  Telugu: "te",
  Kannada: "kn",
  Bengali: "bn",
  Punjabi: "pa",
  Malayalam: "ml",
  Odia: "or",
  Assamese: "as",
};

export function TemplateEditorModal({ templateData, onClose, onSave }: TemplateEditorModalProps) {
  const [content, setContent] = useState(templateData.content || "");
  const [currentLanguage, setCurrentLanguage] = useState(templateData.language || "English");
  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(templateData.languages || {});
  const [showVariables, setShowVariables] = useState(false);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [accuracyReason, setAccuracyReason] = useState<string | null>(null);
  const editorRef = React.useRef<any>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelTranslation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Analyze variable usage
  const usedVariables = React.useMemo(() => {
    const regex = /\$\{([^}]+)\}/g;
    const matches = [...content.matchAll(regex)];
    return new Set(matches.map(m => m[1]));
  }, [content]);

  // When language changes, load from drafts or fallback to templateData.content
  useEffect(() => {
    const swapLanguage = async () => {
      if (drafts[currentLanguage]) {
        setContent(drafts[currentLanguage]);
      } else if (currentLanguage === "English" && templateData.content) {
        setContent(templateData.content);
      } else {
        // It's a new language and content is empty. Try to translate from English?
        const sourceContent = drafts["English"] || templateData.content;
        if (sourceContent && currentLanguage !== "English") {
          const toastId = toast.loading(`Translating template to ${currentLanguage}...`, {
            action: {
              label: 'Stop',
              onClick: () => handleCancelTranslation(),
            },
          });
          setIsGenerating(true);
          const controller = new AbortController();
          abortControllerRef.current = controller;
          try {
            const targetCode = languageMap[currentLanguage] || "en";
            const { translatedText, accuracy, reason } = await translateWithAccuracy(sourceContent, targetCode, controller.signal);
            setContent(translatedText);
            setDrafts(prev => ({ ...prev, [currentLanguage]: translatedText }));
            setAccuracyScore(accuracy);
            setAccuracyReason(reason || null);
            toast.success(`Translated to ${currentLanguage} successfully!`, { id: toastId });
          } catch (err: any) {
            if (err.name === 'AbortError') {
              toast.dismiss(toastId);
              toast.info("Translation cancelled.");
              setCurrentLanguage("English");
              setContent(sourceContent || "");
            } else {
              console.error("Auto-translation failed:", err);
              toast.error(`Auto-translation failed. Using English as fallback.`, { id: toastId });
              setContent(sourceContent || "");
            }
          } finally {
            setIsGenerating(false);
            if (abortControllerRef.current === controller) {
              abortControllerRef.current = null;
            }
          }
        } else {
          setContent("");
          setAccuracyScore(null);
          setAccuracyReason(null);
        }
      }
    };
    swapLanguage();
  }, [currentLanguage]);

  // Keep drafts in sync with current content
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setDrafts(prev => ({ ...prev, [currentLanguage]: newContent }));
  };

  useEffect(() => {
    if (templateData.content && !content) {
      setContent(templateData.content);
    }
    if (templateData.languages) {
      setDrafts(prev => ({ ...templateData.languages, ...prev }));
    }

    // Auto-generate or load fallback if this is a brand new template and content is empty
    const isNewTemplate = !templateData.content && (!templateData.languages || Object.keys(templateData.languages).length === 0);
    if (isNewTemplate && !content && !isGenerating) {
      const initDraft = async () => {
        setIsGenerating(true);
        try {
          // Try AI first
          const generated = await generateNoticeContent(
            `Draft a professional legal notice for a "${templateData.templateName}" for lender "${templateData.lender}". Notice Type: ${templateData.noticeType}. Language: ${currentLanguage}.`,
            { type: "content", ...templateData }
          );
          setContent(generated);
          setDrafts(prev => ({ ...prev, [currentLanguage]: generated }));
        } catch (e) {
          // Fallback to hardcoded professional template
          console.warn("AI Generation failed, using standard fallback", e);
          const fallback = getFallbackTemplate(templateData.noticeType);
          setContent(fallback);
          setDrafts(prev => ({ ...prev, [currentLanguage]: fallback }));
          toast.info("Using standard professional draft (AI temporarily unavailable)");
        } finally {
          setIsGenerating(false);
        }
      };
      initDraft();
    }
  }, [templateData]);

  const handleSave = () => {
    onSave({ language: currentLanguage, content });
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`bg-white dark:bg-gray-900 w-full transition-all duration-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-100 dark:border-gray-800 ${showVariables ? 'max-w-[1200px]' : 'max-w-5xl'}`}>
        
        {/* Header matching Image 2 style but for Template */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Draft Notice Template
              </h2>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
                {templateData.lender} • {templateData.noticeType}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Toolbar Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center gap-3">
              <select 
                value={currentLanguage}
                onChange={(e) => setCurrentLanguage(e.target.value)}
                className="h-10 px-4 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-bold text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Kannada">Kannada</option>
                <option value="Bengali">Bengali</option>
                <option value="Punjabi">Punjabi</option>
                <option value="Malayalam">Malayalam</option>
                <option value="Odia">Odia</option>
                <option value="Assamese">Assamese</option>
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              {accuracyScore !== null && currentLanguage !== "English" && !isGenerating ? (
                <>
                  <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm ${
                    accuracyReason?.includes("Google") 
                      ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/30' 
                      : 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30'
                  }`}>
                    Accuracy: {accuracyScore}%
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm ${
                    accuracyReason?.includes("Google") 
                      ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/30' 
                      : 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30'
                  }`}>
                    {accuracyReason?.includes("Google") ? "Google Translate" : "Gemini AI"}
                  </div>
                </>
              ) : (
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 dark:text-blue-600 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm">
                  AI Powered Draft
                </div>
              )}
            </div>
          </div>

          {accuracyReason && (
            <div className="animate-in fade-in zoom-in-95 duration-300 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800/50 text-sm shadow-sm flex items-start gap-3">
              <span className="font-extrabold uppercase text-[10px] tracking-widest mt-0.5 shrink-0 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-2 py-1 rounded-md">Analysis</span>
              <p className="leading-snug flex-1 italic">{accuracyReason}</p>
            </div>
          )}

          {/* Editor Container with Sidebar */}
          <div className="flex gap-6 items-start">
            <div className="flex-1 bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all">
              <div className="max-w-[210mm] mx-auto shadow-2xl rounded-sm overflow-hidden">
                <TemplateEditor
                  ref={editorRef}
                  content={content}
                  onChange={handleContentChange}
                  variables={[...new Set([...(templateData.csvHeaders || []), ...(templateData.selectedVariables || [])])]}
                  amountVariables={templateData.amountVariables || []}
                  onInsertVariable={(v) => toast.info(`Inserted variable: ${v}`)}
                  onToggleVariables={() => setShowVariables(!showVariables)}
                  showVariables={showVariables}
                />
              </div>
            </div>
            
            {showVariables && (
              <div className="animate-in slide-in-from-right duration-300 h-[600px]">
                <VariableSidePanel 
                  variables={[...new Set([...(templateData.csvHeaders || []), ...(templateData.selectedVariables || [])])]}
                  amountVariables={templateData.amountVariables || []}
                  usedVariables={usedVariables}
                  onInsert={(v) => {
                    editorRef.current?.insertVariable(v);
                  }}
                  onClose={() => setShowVariables(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="h-11 px-8 font-bold text-gray-500 hover:text-gray-900 transition-all">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="h-11 px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all gap-2"
          >
            <Save className="w-4 h-4" />
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}
