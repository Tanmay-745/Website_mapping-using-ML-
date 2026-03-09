import React, { useRef, useId, useMemo } from "react";
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
import { ChevronDown } from "lucide-react";

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables: string[];
  onInsertVariable: (variable: string) => void;
}

export function TemplateEditor({
  content,
  onChange,
  variables,
  onInsertVariable
}: TemplateEditorProps) {

  const quillRef = useRef<ReactQuill | null>(null);

  // Uniquely identify the toolbar for this specific editor instance
  const idPrefix = useId().replace(/:/g, "");
  const toolbarId = `toolbar-${idPrefix}`;

  const modules = useMemo(() => ({
    toolbar: {
      container: `#${toolbarId}`
    }
  }), [toolbarId]);

  // Insert Variable
  const insertVariable = (variable: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    editor.focus();
    const range = editor.getSelection();
    if (range) {
      editor.insertText(range.index, `\${${variable}}`);
    } else {
      const length = editor.getLength();
      editor.insertText(length, `\${${variable}}`);
    }

    onInsertVariable(variable);
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white flex flex-col quill-custom-container">
      {/* Custom HTML Toolbar integrated directly with Quill */}
      <div id={toolbarId}>
        <span className="ql-formats">
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
          <button className="ql-clean"></button>
        </span>
        <span className="ql-formats">
          <button className="ql-image"></button>
          <button className="ql-link"></button>
          <button className="ql-video"></button>
        </span>

        {/* Variables Dropdown integrated seamlessly into the toolbar */}
        <span className="ql-formats float-none xl:float-right inline-flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="!w-auto !px-[10px] text-[13px] text-[#444] hover:text-[#06c] flex items-center gap-[4px] h-[24px] focus:outline-none focus:ring-0 leading-none align-middle"
                style={{ width: 'auto', paddingLeft: '8px', paddingRight: '8px' }}
                title="Insert Variable"
              >
                Variables <ChevronDown className="w-3 h-3 h-full pb-[2px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto w-48 mt-1">
              {variables.length > 0 ? (
                variables.map((variable) => (
                  <DropdownMenuItem
                    key={variable}
                    onClick={() => insertVariable(variable)}
                  >
                    {variable}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  No variables available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {/* Editor component */}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        placeholder="Start writing your legal notice here..."
        className="min-h-[500px]"
      />

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
}