import React, { useRef, useId, useMemo, forwardRef, useImperativeHandle } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";

// Register Custom Sizes
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'];
Quill.register(Size, true);

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { 
  ChevronDown, Sparkles, FileText, CheckCircle2, 
  AlertCircle, Info, Hash, Check
} from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

import { toast } from "sonner";

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables: string[];
  amountVariables?: string[];
  onInsertVariable: (variable: string) => void;
  onToggleVariables?: () => void;
  showVariables?: boolean;
}

export interface TemplateEditorHandle {
  insertVariable: (variable: string) => void;
}

export const TemplateEditor = forwardRef<TemplateEditorHandle, TemplateEditorProps>(({
  content,
  onChange,
  variables = [],
  amountVariables = [],
  onInsertVariable,
  onToggleVariables,
  showVariables = false
}, ref) => {
  const quillRef = useRef<ReactQuill | null>(null);

  useImperativeHandle(ref, () => ({
    insertVariable: (variable: string) => {
      insertVariable(variable);
    }
  }));

  // Uniquely identify the toolbar for this specific editor instance
  const idPrefix = useId().replace(/:/g, "");
  const toolbarId = `toolbar-${idPrefix}`;

  // Analyze variable usage
  const usedVariables = useMemo(() => {
    const regex = /\$\{([^}]+)\}/g;
    const matches = [...content.matchAll(regex)];
    return new Set(matches.map(m => m[1]));
  }, [content]);

  const allAvailableVariables = useMemo(() => {
    return [...new Set([...variables, ...amountVariables])];
  }, [variables, amountVariables]);

  const missingVariables = allAvailableVariables.filter(v => !usedVariables.has(v));
  const usagePercentage = allAvailableVariables.length > 0 
    ? (usedVariables.size / allAvailableVariables.length) * 100 
    : 0;

  const modules = useMemo(() => ({
    toolbar: {
      container: `#${toolbarId}`
    }
  }), [toolbarId]);

  // Insert Variable
  const insertVariable = (variable: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const varText = `\${${variable}}`;
    
    // Focus first to ensure we have a place to insert
    quill.focus();
    
    const range = quill.getSelection();
    const index = range ? range.index : quill.getLength();
    
    // Insert the text
    quill.insertText(index, varText, 'user');
    
    // Move cursor to after the inserted text
    quill.setSelection(index + varText.length, 0, 'user');

    toast.success(`Inserted $\{${variable}}`, {
      description: "Variable added at cursor position",
      duration: 2000
    });

    onInsertVariable(variable);
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white flex flex-col quill-custom-container">
      {/* Custom HTML Toolbar integrated directly with Quill */}
      <div id={toolbarId} className="flex flex-wrap items-center">
        <span className="ql-formats py-1">
          <button className="ql-bold"></button>
          <button className="ql-italic"></button>
          <button className="ql-underline"></button>
          <button className="ql-strike"></button>
        </span>
        <span className="ql-formats">
          <button className="ql-blockquote"></button>
          <button className="ql-code-block"></button>
        </span>
        <span className="ql-formats">
          <button className="ql-header" value="1"></button>
          <button className="ql-header" value="2"></button>
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered"></button>
          <button className="ql-list" value="bullet"></button>
        </span>
        <span className="ql-formats">
          <button className="ql-script" value="sub"></button>
          <button className="ql-script" value="super"></button>
        </span>
        <span className="ql-formats">
          <button className="ql-indent" value="-1"></button>
          <button className="ql-indent" value="+1"></button>
        </span>
        <span className="ql-formats">
          <button className="ql-direction" value="rtl"></button>
        </span>
        <span className="ql-formats">
          <select className="ql-size" defaultValue="14px">
            <option value="10px">10px</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="30px">30px</option>
            <option value="36px">36px</option>
          </select>
        </span>
        <span className="ql-formats">
          <select className="ql-header">
            <option value="1"></option>
            <option value="2"></option>
            <option value="3"></option>
            <option value="4"></option>
            <option value="5"></option>
            <option value="6"></option>
            <option selected></option>
          </select>
        </span>
        <span className="ql-formats">
          <select className="ql-font">
            <option selected></option>
            <option value="serif"></option>
            <option value="monospace"></option>
          </select>
        </span>
        <span className="ql-formats">
          <select className="ql-color"></select>
          <select className="ql-background"></select>
        </span>
        <span className="ql-formats">
          <select className="ql-align"></select>
        </span>
        <span className="ql-formats">
          <button className="ql-image"></button>
        </span>

        {/* Variable Usage Status Bar - New Section */}
        <div className="flex-1 flex items-center justify-end px-4 gap-4 border-l border-gray-100 dark:border-gray-800 ml-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Variable Usage
                  </div>
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${usagePercentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-black ${usagePercentage === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {usedVariables.size}/{allAvailableVariables.length}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="p-3 w-64 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-2xl rounded-xl">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
                    <Badge variant={usagePercentage === 100 ? "default" : "secondary"} className={usagePercentage === 100 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-blue-50 text-blue-700"}>
                      {usagePercentage === 100 ? "Complete" : "In Progress"}
                    </Badge>
                  </div>
                  {missingVariables.length > 0 ? (
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Missing Variables</p>
                      <div className="flex flex-wrap gap-1">
                        {missingVariables.slice(0, 5).map(v => (
                          <span key={v} className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md font-mono">{v}</span>
                        ))}
                        {missingVariables.length > 5 && <span className="text-[9px] text-gray-400">+{missingVariables.length - 5} more</span>}
                      </div>
                    </div>
                  ) : allAvailableVariables.length > 0 ? (
                    <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> All detected variables are in use!
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">No variables detected yet.</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Variables Toggle Button */}
        <span className="ql-formats ml-auto flex items-center py-1">
          <button
            type="button"
            onClick={onToggleVariables}
            className={`!w-auto !px-[12px] text-[13px] font-medium flex items-center gap-[6px] h-[32px] border rounded focus:outline-none transition-all mr-2 ${showVariables ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'}`}
            title="Toggle Variable Panel"
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Variables</span>
            {missingVariables.length > 0 && !showVariables && (
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="!w-auto !px-[4px] text-gray-400 hover:text-gray-600 flex items-center h-[32px]"
                title="Variable Dropdown"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 overflow-y-auto w-64 mt-1 shadow-2xl border-gray-200 p-0 rounded-xl">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> Standard Variables
              </div>
              <div className="p-1">
                {['barcode', 'signature'].map((v) => {
                  const isUsed = usedVariables.has(v);
                  return (
                    <DropdownMenuItem 
                      key={v}
                      onSelect={() => insertVariable(v)} 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg group"
                    >
                      <span className={`font-mono text-xs ${isUsed ? 'text-gray-400 line-through' : 'text-blue-600'}`}>{v}</span>
                      {isUsed ? (
                        <Check className="w-3 h-3 ml-auto text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 ml-auto text-gray-200 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </div>

              {amountVariables.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/50 border-t border-b border-emerald-100 mt-1 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Amount (to Words)
                  </div>
                  <div className="p-1">
                    {amountVariables.map((v) => {
                      const isUsed = usedVariables.has(v);
                      return (
                        <DropdownMenuItem 
                          key={v} 
                          onSelect={() => insertVariable(v)} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg group"
                        >
                          <span className={`font-mono text-xs ${isUsed ? 'text-gray-400 line-through' : 'text-emerald-600'}`}>{v}</span>
                          {isUsed ? (
                            <Check className="w-3 h-3 ml-auto text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 ml-auto text-gray-200 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 border-t border-b mb-1 flex items-center gap-2">
                <ChevronDown className="w-3 h-3" /> Template Variables
              </div>
              <div className="p-1">
                {variables.length > 0 ? (
                  variables.map((variable) => {
                    const isUsed = usedVariables.has(variable);
                    return (
                      <DropdownMenuItem
                        key={variable}
                        onSelect={() => insertVariable(variable)}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg group"
                      >
                        <span className={`font-mono text-xs ${isUsed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{variable}</span>
                        {isUsed ? (
                          <Check className="w-3 h-3 ml-auto text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 ml-auto text-gray-200 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                        )}
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-center">
                    <p className="text-[10px] text-gray-400 italic">No variables detected yet.</p>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {/* Editor Main Area */}
      <div className="flex-1 overflow-hidden relative">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={onChange}
          modules={modules}
          placeholder="Start writing your legal notice here..."
          className="h-full min-h-[500px]"
        />
      </div>

      <style>{`
        .quill-custom-container .ql-toolbar {
          border-top: none;
          border-left: none;
          border-right: none;
          background-color: #f8fafc;
        }
        .quill-custom-container .ql-container {
          border-left: none;
          border-right: none;
          border-bottom: none;
          min-height: 500px;
        }
      `}</style>
    </div>
  );
});