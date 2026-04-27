import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, AlertCircle, DollarSign, Clock, ArrowLeft, Plus } from "lucide-react";
import { NoticeType as AppNoticeType } from "../App";
import { getNoticeTypes, createNoticeType, NoticeType } from "../api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface NoticeTypeSelectionProps {
  onSelect: (type: AppNoticeType) => void;
  onBack: () => void;
}

const iconMap = {
  FileText,
  AlertCircle,
  DollarSign,
  Clock,
  Plus
};

const colorClasses = {
  blue: "bg-blue-100 text-blue-600 hover:bg-blue-200",
  red: "bg-red-100 text-red-600 hover:bg-red-200",
  green: "bg-green-100 text-green-600 hover:bg-green-200",
  orange: "bg-orange-100 text-orange-600 hover:bg-orange-200",
  purple: "bg-purple-100 text-purple-600 hover:bg-purple-200",
};

export function NoticeTypeSelection({ onSelect, onBack }: NoticeTypeSelectionProps) {
  const [types, setTypes] = useState<NoticeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newType, setNewType] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const data = await getNoticeTypes();
      setTypes(data);
    } catch (e) {
      toast.error("Failed to load notice types");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.title || !newType.description) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createNoticeType({
        ...newType,
        color: "purple", // Default for new ones
        icon: "FileText"
      });
      toast.success("Notice type created successfully");
      setIsDialogOpen(false);
      setNewType({ title: "", description: "" });
      fetchTypes();
    } catch (e) {
      toast.error("Failed to create notice type");
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading notice types...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="hover:bg-gray-100/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">Select Notice Type</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose the type of legal notice you want to generate
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md transition-all active:scale-95 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              Create Notice Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Notice Type</DialogTitle>
              <DialogDescription>
                Add a new category of legal notice to the portal.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="title"
                    value={newType.title}
                    onChange={(e) => setNewType({ ...newType, title: e.target.value })}
                    className="col-span-3"
                    placeholder="e.g., Termination Notice"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newType.description}
                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                    className="col-span-3"
                    placeholder="Briefly describe when to use this notice type"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Notice Type</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {types.map((notice) => {
          const Icon = iconMap[notice.icon as keyof typeof iconMap] || FileText;
          return (
            <Card
              key={notice.id}
              className="p-6 hover:shadow-xl hover:border-blue-200/50 transition-all duration-300 cursor-pointer group bg-white/60 dark:bg-gray-800/80 hover:bg-white/90 dark:hover:bg-gray-700/80 border-gray-200/50 dark:border-gray-700/50"
              onClick={() => onSelect(notice.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colorClasses[notice.color as keyof typeof colorClasses] || colorClasses.blue} transition-colors group-hover:scale-110 duration-300 shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {notice.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {notice.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
