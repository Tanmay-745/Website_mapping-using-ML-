import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { SavedTemplate } from "../App";
import { FileText, Eye, Copy, Trash2, Calendar, FileType } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";

interface SavedTemplatesProps {
  onClone: (template: SavedTemplate) => void;
  onEdit: (template: SavedTemplate) => void;
}

const noticeTypeNames = {
  LRN: "Legal Recovery Notice",
  LDN: "Legal Demand Notice",
  OTS: "One Time Settlement",
  Overdue: "Overdue Notice",
};

export function SavedTemplates({ onClone, onEdit }: SavedTemplatesProps) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<SavedTemplate | null>(null);

  useEffect(() => {
    // Load templates from localStorage
    const saved = localStorage.getItem("savedTemplates");
    if (saved) {
      setTemplates(JSON.parse(saved));
    }
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

  return (
    <>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Saved Templates</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage your saved legal notice templates</p>
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
              <Card key={template.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{template.templateName}</h3>
                      <Badge variant="outline" className="mt-0.5 text-xs dark:border-slate-700 dark:text-slate-300">
                        {noticeTypeNames[template.noticeType!]}
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
                  {template.languages && Object.keys(template.languages).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {Object.keys(template.languages).map(lang => (
                        <Badge key={lang} variant="secondary" className="text-[10px] h-4 px-1.5 font-normal dark:bg-slate-800 dark:text-slate-300">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                    onClick={() => onClone(template)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Clone
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.templateName}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {previewTemplate?.content ? (
              <div
                dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-200"
              />
            ) : (
              <p className="text-slate-600 dark:text-slate-400">No content available</p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            {previewTemplate && (
              <Button onClick={() => {
                onEdit(previewTemplate);
                setPreviewTemplate(null);
              }}>
                Edit Template
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
