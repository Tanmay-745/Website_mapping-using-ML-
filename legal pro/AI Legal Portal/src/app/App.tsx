import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Button } from "./components/ui/button";
import { X } from "lucide-react";
import { ThemesDashboard } from "./components/ThemesDashboard";
import { AdvocateRegistry } from "./components/AdvocateRegistry";
import { EditThemeModal } from "./components/EditThemeModal";
import { NoticePreview } from "./components/NoticePreviewWithEditor";
import { TemplateEditorModal } from "./components/TemplateEditorModal";
import { AIAssistant } from "./components/AIAssistant";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { generateNoticeContent, Advocate, Lender } from "./api";
import { LenderRegistry } from "./components/LenderRegistry";
import { getFallbackTemplate } from "./utils/templates_fallback";

export type NoticeType = string;

export interface TemplateData {
  id?: string;
  templateName: string;
  description: string;
  lender: string;
  advocate: string;
  noticeType: NoticeType;
  deliveryMode: "digital" | "physical";
  selectedVariables: string[];
  amountVariables: string[];
  csvHeaders: string[];
  sampleData?: Record<string, string>[];
  content?: string;
  languages?: Record<string, string>;
  advocateDetails?: Advocate;
  lenderDetails?: Lender;
  importedDeliveryMode?: string;
}

export interface SavedTemplate extends TemplateData {
  id: string;
  createdAt: string;
  content: string;
}

export type AppTab = "themes" | "advocates" | "digital" | "physical" | "lenders";

export interface ThemeTemplate {
  content: string;
  createdAt: string;
  language: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  lender: string;
  date: string;
  advocates: string[];
  noticeTypes: string[];
  templates: ThemeTemplate[];
  csvHeaders?: string[];
  selectedVariables?: string[];
  amountVariables?: string[];
  isPhysical?: boolean;
  sampleData?: Record<string, string>[];
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("themes");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isAddingTheme, setIsAddingTheme] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [editingTemplateData, setEditingTemplateData] = useState<TemplateData | null>(null);

  useEffect(() => {
    // Load themes from local storage or API
    const saved = localStorage.getItem("legalPortalThemes");
    if (saved) {
      setThemes(JSON.parse(saved));
    } else {
      const sampleThemes: Theme[] = [{
        id: "1",
        name: "Standard Recovery Notice (LRN)",
        description: "Standard legal recovery notice for delinquent accounts.",
        lender: "HDFC BANK",
        date: "19-03-2026",
        advocates: ["Adv. Rajesh Kumar"],
        noticeTypes: ["LRN"],
        templates: [
          { language: "English", createdAt: "2026-03-19 10:00", content: "<h1>LEGAL NOTICE</h1><p>Dear Customer, you owe us money.</p>" },
          { language: "Hindi", createdAt: "2026-03-19 10:05", content: "<h1>कानूनी नोटिस</h1><p>प्रिय ग्राहक, आपका भुगतान बकाया है।</p>" }
        ]
      }];
      setThemes(sampleThemes);
      localStorage.setItem("legalPortalThemes", JSON.stringify(sampleThemes));
    }
  }, []);

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

  const handleSaveTemplateToTheme = (tpl: { language: string, content: string }) => {
    if (!editingTemplateData?.id) return;
    
    const themeIndex = themes.findIndex(t => t.id === editingTemplateData.id);
    if (themeIndex >= 0) {
      const updatedThemes = [...themes];
      const newTemplate = {
        language: tpl.language,
        createdAt: new Date().toLocaleString(),
        content: tpl.content
      };
      
      const theme = { ...updatedThemes[themeIndex] };
      if (!theme.templates) theme.templates = [];
      
      const existingTplIdx = theme.templates.findIndex(t => t.language === tpl.language);
      if (existingTplIdx >= 0) {
        theme.templates[existingTplIdx] = newTemplate;
      } else {
        theme.templates.push(newTemplate);
      }
      
      updatedThemes[themeIndex] = theme;
      setThemes(updatedThemes);
      localStorage.setItem("legalPortalThemes", JSON.stringify(updatedThemes));
      toast.success(`Template saved to theme "${theme.name}"`);
      setEditingTemplateData(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <Toaster />
      
      {/* Header with Tabs matching Image 1 */}
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <main className="max-w-[1600px] mx-auto px-6 py-4">
        {activeTab === "themes" && (
          <ThemesDashboard 
            themes={themes} 
            onEditTheme={(theme) => {
              setEditingTheme(theme);
              setIsAddingTheme(true);
            }}
            onDeleteTheme={(id) => {
              const updated = themes.filter(t => t.id !== id);
              setThemes(updated);
              localStorage.setItem("legalPortalThemes", JSON.stringify(updated));
            }}
            onCloneTheme={(theme) => {
              const cloned = { ...theme, id: Date.now().toString(), name: theme.name + " (Copy)" };
              const updated = [cloned, ...themes];
              setThemes(updated);
              localStorage.setItem("legalPortalThemes", JSON.stringify(updated));
              toast.success("Theme cloned successfully!");
            }}
            onAddTemplate={(theme) => {
              setEditingTemplateData({
                templateName: theme.name,
                description: theme.description,
                lender: theme.lender,
                advocate: theme.advocates[0] || "",
                noticeType: theme.noticeTypes[0] || "LRN",
                deliveryMode: theme.isPhysical ? "physical" : "digital",
                selectedVariables: theme.selectedVariables || [],
                amountVariables: theme.amountVariables || [],
                csvHeaders: theme.csvHeaders || [],
                sampleData: theme.sampleData || [],
                id: theme.id,
                languages: theme.templates.reduce((acc, t) => ({ ...acc, [t.language]: t.content }), {})
              });
            }}
            onEditTemplate={(theme, tpl) => {
              setEditingTemplateData({
                templateName: theme.name,
                description: theme.description,
                lender: theme.lender,
                advocate: theme.advocates[0] || "",
                noticeType: theme.noticeTypes[0] || "LRN",
                deliveryMode: theme.isPhysical ? "physical" : "digital",
                selectedVariables: theme.selectedVariables || [],
                amountVariables: theme.amountVariables || [],
                csvHeaders: theme.csvHeaders || [],
                sampleData: theme.sampleData || [],
                id: theme.id,
                content: tpl.content,
                languages: theme.templates.reduce((acc, t) => ({ ...acc, [t.language]: t.content }), {})
              });
            }}
            onDeleteTemplate={(theme, tpl) => {
              const updatedThemes = themes.map(t => {
                if (t.id === theme.id) {
                  return {
                    ...t,
                    templates: t.templates.filter(item => item.language !== tpl.language)
                  };
                }
                return t;
              });
              setThemes(updatedThemes);
              localStorage.setItem("legalPortalThemes", JSON.stringify(updatedThemes));
              toast.success(`Template ${tpl.language} deleted from "${theme.name}"`);
            }}
          />
        )}

        {activeTab === "advocates" && (
          <AdvocateRegistry />
        )}

        {activeTab === "digital" && (
          <div className="p-8 text-center text-gray-500">Digital Flow Implementation Pending</div>
        )}

        {activeTab === "physical" && (
          <div className="p-8 text-center text-gray-500">Physical Flow Implementation Pending</div>
        )}
        
        {activeTab === "lenders" && (
          <LenderRegistry onBack={() => setActiveTab("themes")} />
        )}

        {/* Dynamic Editor View - Now as a Modal */}
        {editingTemplateData && (
          <TemplateEditorModal 
            templateData={editingTemplateData}
            onClose={() => setEditingTemplateData(null)}
            onSave={handleSaveTemplateToTheme}
          />
        )}
      </main>

      {/* Modals */}
      {isAddingTheme && (
        <EditThemeModal 
          theme={editingTheme} 
          onClose={() => {
            setIsAddingTheme(false);
            setEditingTheme(null);
          }}
          onSave={(updatedTheme) => {
            const isUpdate = editingTheme && editingTheme.id;
            let newThemes;

            if (isUpdate) {
              // For updates, ensure we preserve templates from updatedTheme 
              // which should already have them from the modal state
              newThemes = themes.map(t => t.id === updatedTheme.id ? updatedTheme : t);
              toast.success(`Theme "${updatedTheme.name}" updated`);
            } else {
              // Creating a NEW theme
              // Only add a default template if the theme doesn't already have one
              const hasTemplates = updatedTheme.templates && updatedTheme.templates.length > 0;
              let themeWithTemplate = updatedTheme;

              if (!hasTemplates) {
                const defaultTemplate = {
                  language: "English",
                  createdAt: new Date().toLocaleString(),
                  content: getFallbackTemplate(updatedTheme.noticeTypes[0] || "LRN")
                };
                themeWithTemplate = {
                  ...updatedTheme,
                  templates: [defaultTemplate]
                };
              }
              
              newThemes = [themeWithTemplate, ...themes];
              
              // Only open editor for brand new themes that we just added a template to
              if (!hasTemplates && themeWithTemplate.templates[0]) {
                setEditingTemplateData({
                  templateName: themeWithTemplate.name,
                  description: themeWithTemplate.description,
                  lender: themeWithTemplate.lender,
                  advocate: themeWithTemplate.advocates[0] || "",
                  noticeType: themeWithTemplate.noticeTypes[0] || "LRN",
                  deliveryMode: themeWithTemplate.isPhysical ? "physical" : "digital",
                  selectedVariables: themeWithTemplate.selectedVariables || [],
                  amountVariables: themeWithTemplate.amountVariables || [],
                  csvHeaders: themeWithTemplate.csvHeaders || [],
                  sampleData: themeWithTemplate.sampleData || [],
                  id: themeWithTemplate.id,
                  content: themeWithTemplate.templates[0].content,
                  languages: { [themeWithTemplate.templates[0].language]: themeWithTemplate.templates[0].content }
                });
                toast.success("Theme created! Now drafting your first template...");
              } else {
                toast.success("Theme created!");
              }
            }
            
            setThemes(newThemes);
            localStorage.setItem("legalPortalThemes", JSON.stringify(newThemes));
            setIsAddingTheme(false);
            setEditingTheme(null);
          }}
        />
      )}
      
      <div className="relative z-10">
        <AIAssistant />
      </div>
    </div>
  );
}

export default App;