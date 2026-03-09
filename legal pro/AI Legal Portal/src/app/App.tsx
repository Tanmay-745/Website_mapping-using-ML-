import { useState, useEffect } from "react";
import { NoticeTypeSelection } from "./components/NoticeTypeSelection";
import { TemplateDetailsForm } from "./components/TemplateDetailsForm";
import { VariableConfiguration } from "./components/VariableConfiguration";
import { NoticePreview } from "./components/NoticePreviewWithEditor";
import { SavedTemplates } from "./components/SavedTemplates";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { FileText, ArrowLeft } from "lucide-react";
import { Header } from "./components/Header";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { AIAssistant } from "./components/AIAssistant";

import { generateNoticeContent, Advocate } from "./api";

export type NoticeType = "LRN" | "LDN" | "OTS" | "Overdue" | null;

export interface TemplateData {
  noticeType: NoticeType;
  templateName: string;
  description: string;
  lender: string;
  advocate: string;
  csvHeaders: string[];
  selectedVariables: string[];
  amountVariables: string[];
  deliveryMode: "physical" | "digital";
  content?: string; // HTML content from editor
  id?: string; // Template ID
  sampleData?: Record<string, string>[]; // Sample data from CSV
  importedDeliveryMode?: "physical" | "digital"; // Original mode from CSV import
  advocateDetails?: Advocate;
  languages?: Record<string, string>; // Map of language code/name to content HTML
}

export interface SavedTemplate extends TemplateData {
  id: string;
  createdAt: string;
}

function App() {
  const [step, setStep] = useState<"start" | "type" | "details" | "variables" | "preview">("type");
  const [templateData, setTemplateData] = useState<TemplateData>({
    noticeType: null,
    templateName: "",
    description: "",
    lender: "",
    advocate: "",
    csvHeaders: [],
    selectedVariables: [],
    amountVariables: [],
    deliveryMode: "digital",
  });

  useEffect(() => {
    const handleThemeChange = (event: MessageEvent) => {
      if (event.data?.type === 'THEME_CHANGE') {
        if (event.data.isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    window.addEventListener('message', handleThemeChange);
    return () => window.removeEventListener('message', handleThemeChange);
  }, []);

  const fetchSharedData = async () => {
    try {
      const response = await fetch('http://localhost:54321/api/share-data');
      if (response.ok) {
        const data = await response.json();
        if (data && data.headers && Array.isArray(data.headers)) {
          // Check for stale data (older than 15 minutes)
          const MAX_AGE = 15 * 60 * 1000; // 15 minutes
          const now = Date.now();
          if (data.timestamp && (now - data.timestamp > MAX_AGE)) {
            console.log("Ignoring stale shared data");
            return;
          }

          toast.success("Loaded mapped data from CSV Portal!");
          setTemplateData(prev => ({
            ...prev,
            csvHeaders: data.headers,
            sampleData: data.sampleData || [],
            deliveryMode: data.deliveryMode || "digital",
            importedDeliveryMode: data.deliveryMode,
            // Auto-select all if it's a new template or no variables selected yet
            selectedVariables: prev.selectedVariables.length === 0 ? data.headers : prev.selectedVariables
          }));
        }
      }
    } catch (e) {
      console.log("No shared data found or server offline");
    }
  };

  useEffect(() => {
    fetchSharedData();
  }, []);

  useEffect(() => {
    const handleAppMessage = (event: MessageEvent) => {
      if (event.data?.type === 'APP_ACTIVATED' && event.data?.appId === 'legal-pro') {
        if (event.data?.action === 'NEW_TEMPLATE') {
          // Reset state to start a new template 
          setTemplateData({
            noticeType: null,
            templateName: "",
            description: "",
            lender: "",
            advocate: "",
            csvHeaders: [],
            selectedVariables: [],
            amountVariables: [],
            deliveryMode: "digital",
            importedDeliveryMode: undefined,
          });
          setStep("type");
          // Fetch fresh mapped data
          fetchSharedData();
        }
      }
    };

    window.addEventListener('message', handleAppMessage);
    return () => window.removeEventListener('message', handleAppMessage);
  }, []);

  const handleNoticeTypeSelect = (type: NoticeType) => {
    setTemplateData({ ...templateData, noticeType: type });
    setStep("details");
  };

  const handleTemplateDetails = (data: Partial<TemplateData>) => {
    setTemplateData({ ...templateData, ...data });
    setStep("variables");
  };

  const handleVariableConfig = (data: Partial<TemplateData>) => {
    setTemplateData({ ...templateData, ...data });
    setStep("preview");
  };

  const handleStartNew = () => {
    setTemplateData({
      noticeType: null,
      templateName: "",
      description: "",
      lender: "",
      advocate: "",
      csvHeaders: [],
      selectedVariables: [],
      amountVariables: [],
      deliveryMode: "digital",
      importedDeliveryMode: undefined,
    });
    setStep("start");
  };

  const handleCloneTemplate = (template: SavedTemplate) => {
    setTemplateData({
      ...template,
      id: undefined, // Remove ID for cloning
      templateName: template.templateName + " (Copy)",
    });
    setStep("preview");
  };

  const handleEditTemplate = (template: SavedTemplate) => {
    setTemplateData(template);
    setStep("preview");
  };

  const handleBack = () => {
    if (step === "details") setStep("type");
    else if (step === "variables") setStep("details");
    else if (step === "preview") setStep("variables");
    else if (step === "type") setStep("start");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      <Toaster />

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10">
        <Header onShowSaved={() => setStep("start")} />
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step !== "start" && step !== "type" && (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        {step === "start" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)]">
            <div className="lg:col-span-7 h-full overflow-y-auto pr-2">
              <SavedTemplates
                onClone={handleCloneTemplate}
                onEdit={handleEditTemplate}
              />
            </div>

            <div className="lg:col-span-5 h-full">
              <Card className="h-full flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
                  Create New Template
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xs mx-auto">
                  Start fresh with our AI-powered template builder to create customized legal notices.
                </p>
                <Button
                  onClick={() => setStep("type")}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 w-full max-w-xs"
                >
                  Create Template
                </Button>
              </Card>
            </div>
          </div>
        )}

        {step === "type" && (
          <NoticeTypeSelection onSelect={handleNoticeTypeSelect} onBack={() => setStep("start")} />
        )}

        {step === "details" && (
          <TemplateDetailsForm
            noticeType={templateData.noticeType!}
            onNext={handleTemplateDetails}
          />
        )}

        {step === "variables" && (
          <VariableConfiguration
            templateData={templateData}
            onNext={handleVariableConfig}
          />
        )}

        {step === "preview" && (
          <NoticePreview
            templateData={templateData}
            onStartNew={handleStartNew}
          />
        )}
      </main>
      <div className="relative z-10">
        <AIAssistant />
      </div>
    </div>
  );
}

export default App;