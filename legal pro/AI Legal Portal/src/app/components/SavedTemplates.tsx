import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { SavedTemplate } from "../App";
import { FileText, Eye, Copy, Trash2, Calendar, FileType, Printer, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { getNoticeTypes } from "../api";
import { DocumentPreview } from "./DocumentPreview";
// @ts-ignore
import html2pdf from "html2pdf.js";

interface SavedTemplatesProps {
  onClone: (template: SavedTemplate) => void;
  onEdit: (template: SavedTemplate) => void;
}


export function SavedTemplates({ onClone, onEdit }: SavedTemplatesProps) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<SavedTemplate | null>(null);
  const [noticeTypeNames, setNoticeTypeNames] = useState<Record<string, string>>({
    LRN: "Legal Recovery Notice",
    LDN: "Legal Demand Notice",
    OTS: "One Time Settlement",
    Overdue: "Overdue Notice",
  });

  useEffect(() => {
    // Load templates from localStorage
    const saved = localStorage.getItem("savedTemplates");
    if (saved) {
      setTemplates(JSON.parse(saved));
    }

    // Fetch notice types for dynamic naming
    const fetchNoticeTypes = async () => {
      try {
        const types = await getNoticeTypes();
        const mapping: Record<string, string> = {};
        types.forEach((t: any) => {
          mapping[t.id] = t.title;
        });
        setNoticeTypeNames(mapping);
      } catch (e) {
        console.error("Failed to fetch notice types", e);
      }
    };
    fetchNoticeTypes();
  }, []);

  const handleDelete = (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this template?");
    if (confirmed) {
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      localStorage.setItem("savedTemplates", JSON.stringify(updated));
      toast.success("Template deleted successfully");
    }
  };

  const handleDownloadPdf = async (template: SavedTemplate) => {
    const toastId = toast.loading("Preparing PDF document...");
    try {
      const element = document.getElementById('document-preview-content');
      if (!element) {
        throw new Error("Preview content not found in DOM");
      }

      // Clone the element for export to avoid modification of the UI
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Remove shadow and other UI-only classes from the clone
      const documentDiv = clone.querySelector('div');
      if (documentDiv) {
        documentDiv.style.boxShadow = 'none';
        documentDiv.style.margin = '0';
      }

      // Attach to DOM temporarily for html2canvas to work correctly
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.appendChild(clone);
      document.body.appendChild(container);

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${template.templateName.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      toast.loading("Generating PDF...", { id: toastId });
      
      if (typeof html2pdf !== 'function') {
        throw new Error("PDF library not initialized. Please refresh and try again.");
      }

      await html2pdf().from(clone).set(opt).save();
      
      if (container.parentElement) {
        document.body.removeChild(container);
      }
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (e: any) {
      console.error("PDF Generation Error:", e);
      toast.error(`PDF Error: ${e.message || "Unknown error"}`, { id: toastId });
    }
  };

  return (
    <>
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Saved Templates</h2>
            <p className="text-slate-600 dark:text-slate-400">Manage your saved legal notice templates</p>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700/50 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No saved templates</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your saved templates will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="p-4 hover:shadow-lg transition-shadow bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{template.templateName}</h3>
                      <Badge variant="outline" className="mt-0.5 text-xs dark:border-slate-700 dark:text-slate-300">
                        {noticeTypeNames[template.noticeType as keyof typeof noticeTypeNames] || "Legal Notice"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                  {template.description}
                </p>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-3">
                  <div className="flex items-center gap-2">
                    <FileType className="w-3 h-3" />
                    <span>{template.selectedVariables.length} variables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs dark:bg-gray-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs dark:bg-gray-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    onClick={() => onClone(template)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Clone
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900">
          <DialogHeader className="p-6 bg-white dark:bg-slate-800 border-b dark:border-slate-700 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-xl font-bold">{previewTemplate?.templateName}</DialogTitle>
              <p className="text-sm text-slate-500 mt-1 uppercase tracking-wider">{noticeTypeNames[previewTemplate?.noticeType as keyof typeof noticeTypeNames]}</p>
            </div>
            <div className="flex gap-2 mr-8">
               <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                 <Printer className="w-4 h-4" />
                 Print
               </Button>
               <Button variant="default" size="sm" onClick={() => previewTemplate && handleDownloadPdf(previewTemplate)} className="bg-blue-600 hover:bg-blue-700 gap-2">
                 <Download className="w-4 h-4" />
                 Download PDF
               </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100 dark:bg-slate-900/50">
             {previewTemplate && (
                <div id="document-preview-content">
                  <DocumentPreview template={previewTemplate} />
                </div>
             )}
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            {previewTemplate && (
              <Button onClick={() => {
                onEdit(previewTemplate);
                setPreviewTemplate(null);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit Template
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
