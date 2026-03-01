import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, AlertCircle, DollarSign, Clock, ArrowLeft } from "lucide-react";
import { NoticeType } from "../App";

interface NoticeTypeSelectionProps {
  onSelect: (type: NoticeType) => void;
  onBack: () => void;
}

const noticeTypes = [
  {
    id: "LRN" as const,
    title: "Legal Recovery Notice (LRN)",
    description: "Formal notice for initiating legal recovery proceedings for outstanding dues",
    icon: FileText,
    color: "blue",
  },
  {
    id: "LDN" as const,
    title: "Legal Demand Notice (LDN)",
    description: "Demand notice requiring immediate payment or action from the recipient",
    icon: AlertCircle,
    color: "red",
  },
  {
    id: "OTS" as const,
    title: "One Time Settlement (OTS)",
    description: "Settlement offer for resolving outstanding dues with a one-time payment",
    icon: DollarSign,
    color: "green",
  },
  {
    id: "Overdue" as const,
    title: "Overdue Notice",
    description: "Reminder notice for overdue payments with penalty information",
    icon: Clock,
    color: "orange",
  },
];

const colorClasses = {
  blue: "bg-blue-100 text-blue-600 hover:bg-blue-200",
  red: "bg-red-100 text-red-600 hover:bg-red-200",
  green: "bg-green-100 text-green-600 hover:bg-green-200",
  orange: "bg-orange-100 text-orange-600 hover:bg-orange-200",
};

export function NoticeTypeSelection({ onSelect, onBack }: NoticeTypeSelectionProps) {
  return (
    <div>
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 hover:bg-gray-100/50"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">Select Notice Type</h2>
        <p className="text-gray-600">
          Choose the type of legal notice you want to generate
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {noticeTypes.map((notice) => {
          const Icon = notice.icon;
          return (
            <Card
              key={notice.id}
              className="p-6 hover:shadow-xl hover:border-blue-200/50 transition-all duration-300 cursor-pointer group bg-white/60 hover:bg-white/90"
              onClick={() => onSelect(notice.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colorClasses[notice.color as keyof typeof colorClasses]} transition-colors group-hover:scale-110 duration-300 shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {notice.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
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
