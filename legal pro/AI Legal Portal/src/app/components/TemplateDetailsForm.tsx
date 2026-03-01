import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { NoticeType, TemplateData } from "../App";
import { Sparkles, Store, Check, ChevronsUpDown } from "lucide-react";
import { generateNoticeContent, getAdvocates, Advocate } from "../api";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

interface TemplateDetailsFormProps {
  noticeType: NoticeType;
  onNext: (data: Partial<TemplateData>) => void;
}

const noticeTypeNames = {
  LRN: "Legal Recovery Notice",
  LDN: "Legal Demand Notice",
  OTS: "One Time Settlement",
  Overdue: "Overdue Notice",
};

export function TemplateDetailsForm({ noticeType, onNext }: TemplateDetailsFormProps) {
  const [formData, setFormData] = useState({
    templateName: "",
    description: "",
    lender: "",
    advocate: "",
  });
  const [open, setOpen] = useState(false);
  const [advocates, setAdvocates] = useState<Advocate[]>([]);

  useEffect(() => {
    const fetchAdvocates = async () => {
      try {
        const data = await getAdvocates();
        setAdvocates(data);
      } catch (error) {
        console.error("Failed to load advocates", error);
      }
    };
    fetchAdvocates();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedAdvocate = advocates.find(a => a.name === formData.advocate);
    onNext({
      ...formData,
      advocateDetails: selectedAdvocate
    });
  };

  const isFormValid = () => {
    return (
      formData.templateName.trim() !== "" &&
      formData.description.trim() !== "" &&
      formData.lender.trim() !== "" &&
      formData.advocate.trim() !== ""
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Template Details</h2>
        <p className="text-slate-600">
          Configure the details for your {noticeTypeNames[noticeType!]} template
        </p>
      </div>

      <Card className="p-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name *</Label>
            <Input
              id="templateName"
              placeholder="e.g., Standard Recovery Notice"
              value={formData.templateName}
              onChange={(e) =>
                setFormData({ ...formData, templateName: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <div className="relative">
              <Textarea
                id="description"
                placeholder="Describe the purpose and use case of this template"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 bottom-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={async () => {
                  if (!formData.templateName) {
                    toast.error("Please enter a template name first");
                    return;
                  }
                  try {
                    const desc = await generateNoticeContent(
                      `Write a short description for a legal notice template named "${formData.templateName}" of type "${noticeTypeNames[noticeType!]}"`,
                      { type: "description", ...formData }
                    );
                    setFormData(prev => ({ ...prev, description: desc }));
                    toast.success("Description generated!");
                  } catch (e) {
                    toast.error("Failed to generate description");
                  }
                }}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Auto-Generate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lender">Lender Name *</Label>
              <Input
                id="lender"
                placeholder="e.g., ABC Financial Services"
                value={formData.lender}
                onChange={(e) =>
                  setFormData({ ...formData, lender: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advocate">Advocate Name *</Label>
              <Input
                id="advocate"
                list="advocate-list"
                placeholder="e.g., John Doe, Esq. or Select..."
                value={formData.advocate}
                onChange={(e) =>
                  setFormData({ ...formData, advocate: e.target.value })
                }
                required
              />
              <datalist id="advocate-list">
                {advocates.map((adv) => (
                  <option key={adv.id} value={adv.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={!isFormValid()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continue to Variable Configuration
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
