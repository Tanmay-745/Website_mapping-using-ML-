import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TemplateData, SavedTemplate } from "../App";
import { Download, FileText, Save, Mail, Printer, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { TemplateEditor } from "./TemplateEditor";
import { VariableSidePanel } from "./VariableSidePanel";
import { API_BASE, exportNoticesZip, generateNoticeContent, saveTemplateToFolder, analyzeTemplate, getNoticeTypes, translateText } from "../api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { DocumentPreview } from "./DocumentPreview";

interface NoticePreviewProps {
  templateData: TemplateData;
  onStartNew: () => void;
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
  Punjabi_pa: "pa", // Fallback
};

// Generate initial template content
function generateInitialContent(templateData: TemplateData): string {
  const { noticeType, lender, advocate, selectedVariables, advocateDetails, lenderDetails } = templateData;
  const date = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const getVar = (possibleNames: string[]) => {
    for (const name of possibleNames) {
      const found = selectedVariables.find(v =>
        v.toLowerCase().includes(name.toLowerCase())
      );
      if (found) return `\${${found}}`;
    }
    return "[VARIABLE_NOT_SELECTED]";
  };

  const lenderName = lenderDetails?.name || lender;
  const lenderAddress = lenderDetails?.address || "";
  const lenderContact = lenderDetails?.phone || "";

  let content = "";

  if (noticeType === "LRN") {
    content = `
<h1 style="text-align: center;">LEGAL RECOVERY NOTICE</h1>
<p style="text-align: center;"><em>(Under Securitization and Reconstruction of Financial Assets and Enforcement of Security Interest Act, 2002)</em></p>
<hr/>
<p><strong>Date:</strong> ${date}</p>
<p><strong>From:</strong><br/>
${advocate}<br/>
Advocate & Legal Counsel<br/>
For and on behalf of ${lenderName}<br/>
${lenderAddress}</p>
<p><strong>To:</strong><br/>
${getVar(['borrower_name', 'customer_name', 'name'])}<br/>
${getVar(['borrower_address', 'address', 'customer_address'])}</p>
<hr/>
<p><strong>Subject:</strong> Legal Recovery Notice for Outstanding Dues - Account No. ${getVar(['account_number', 'account_no', 'loan_account'])}</p>
<p>Dear Sir/Madam,</p>
<p>I, ${advocate}, Advocate, am writing this notice on behalf of my client, ${lenderName}, regarding your loan account.</p>
<h3>1. ACCOUNT PARTICULARS:</h3>
<p><strong>Loan Account Number:</strong> ${getVar(['account_number', 'account_no', 'loan_account'])}<br/>
<strong>Loan Agreement Date:</strong> ${getVar(['loan_date', 'agreement_date'])}</p>
<h3>2. STATEMENT OF OUTSTANDING DUES (as on ${date}):</h3>
<p><strong>Principal Amount:</strong> ${getVar(['principal_amount', 'principal'])}<br/>
<strong>Interest Accrued:</strong> ${getVar(['interest_amount', 'interest'])}<br/>
<strong>Penalty & Other Charges:</strong> ${getVar(['penalty_amount', 'penalty', 'charges'])}<br/>
<strong>TOTAL OUTSTANDING:</strong> ${getVar(['total_amount', 'total_due', 'total_outstanding'])}</p>
<h3>3. DEFAULT AND BREACH:</h3>
<p>Despite repeated requests, reminders, and notices, you have failed and neglected to repay the aforesaid outstanding amount. Your failure to make timely payments constitutes a material breach of the loan agreement.</p>
<h3>4. NOTICE TO PAY:</h3>
<p>You are hereby called upon and required to pay the entire outstanding amount of <strong>${getVar(['total_amount', 'total_due'])}</strong> within FIFTEEN (15) DAYS from the date of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you.</p>
<h3>5. LEGAL CONSEQUENCES:</h3>
<p>Please note that if you fail to comply with this notice within the stipulated period, my client reserves the right to:</p>
<ul>
<li>Initiate recovery proceedings under the SARFAESI Act, 2002</li>
<li>Take possession of the secured assets/property</li>
<li>File civil and/or criminal proceedings as deemed appropriate</li>
<li>Report the default to Credit Information Companies (CIBIL, Experian, etc.)</li>
<li>Recover all legal costs, expenses, and further interest at applicable rates</li>
</ul>
<p>You are advised to treat this matter with utmost urgency and seriousness.</p>
<p>Yours faithfully,</p>
<p><strong>${advocate}</strong><br/>
Advocate<br/>
For ${lenderName}</p>
<hr/>
<p><em><strong>IMPORTANT:</strong> This is a legal notice. Ignoring this notice may result in severe legal action.</em></p>
`;
  } else if (noticeType === "LDN") {
    content = `
<h1 style="text-align: center;">LEGAL DEMAND NOTICE</h1>
<p style="text-align: center;"><em>(Under Section 138 of Negotiable Instruments Act, 1881)</em></p>
<hr/>
<p><strong>Date:</strong> ${date}</p>
<p><strong>From:</strong><br/>
${advocate}<br/>
For and on behalf of ${lenderName}<br/>
${lenderAddress}</p>
<p><strong>To:</strong><br/>
${getVar(['borrower_name', 'customer_name', 'name'])}<br/>
${getVar(['borrower_address', 'address'])}</p>
<hr/>
<p><strong>Subject:</strong> LEGAL DEMAND NOTICE - IMMEDIATE PAYMENT REQUIRED<br/>
Re: Account No. ${getVar(['account_number', 'account_no'])}</p>
<p>Dear Sir/Madam,</p>
<p>Under the instructions and on behalf of my client, ${lenderName}, I hereby serve upon you this LEGAL DEMAND NOTICE regarding your default in payment obligations.</p>
<h3>AMOUNT DUE AND IMMEDIATELY PAYABLE:</h3>
<p><strong>Total Outstanding Amount:</strong> ${getVar(['total_amount', 'total_due'])}</p>
<h3>DEMAND:</h3>
<p>I hereby, on behalf of my client, call upon you to pay the aforementioned amount within <strong>SEVEN (7) DAYS</strong> from the receipt of this notice.</p>
<h3>LEGAL ACTION:</h3>
<p>TAKE FURTHER NOTICE that if you fail to make the payment within the stipulated period, my client shall be compelled to initiate the following actions:</p>
<ol>
<li>File civil suit for recovery of money with interest and costs</li>
<li>Initiate criminal proceedings under Section 138 of the Negotiable Instruments Act</li>
<li>Report your default to all Credit Information Bureaus</li>
<li>Initiate attachment and sale of your movable and immovable properties</li>
</ol>
<p><strong>This is the FINAL AND LAST OPPORTUNITY</strong> being given to you to settle the matter amicably.</p>
<p>Yours faithfully,</p>
<p><strong>${advocate}</strong><br/>
Advocate<br/>
For ${lenderName}</p>
`;
  } else if (noticeType === "OTS") {
    content = `
<h1 style="text-align: center;">ONE TIME SETTLEMENT PROPOSAL</h1>
<p style="text-align: center;"><em>(OTS Offer Letter)</em></p>
<hr/>
<p><strong>Date:</strong> ${date}<br/>
<strong>Reference No.:</strong> OTS/${getVar(['account_number'])}/2026</p>
<p><strong>From:</strong> ${lenderName}<br/>
${lenderAddress}<br/>
<strong>Through:</strong> ${advocate}</p>
<p><strong>To:</strong><br/>
${getVar(['borrower_name', 'customer_name', 'name'])}<br/>
${getVar(['borrower_address', 'address'])}</p>
<hr/>
<p><strong>Subject:</strong> One Time Settlement (OTS) Proposal - Account No. ${getVar(['account_number'])}</p>
<p>Dear ${getVar(['borrower_name', 'customer_name', 'name'])},</p>
<p>This communication is in reference to your loan account with ${lenderName}.</p>
<h3>1. CURRENT ACCOUNT STATUS:</h3>
<p><strong>Account Number:</strong> ${getVar(['account_number'])}<br/>
<strong>Classification:</strong> NPA (Non-Performing Asset)</p>
<h3>2. OUTSTANDING POSITION (as on ${date}):</h3>
<p><strong>Principal Outstanding:</strong> ${getVar(['principal_amount', 'principal'])}<br/>
<strong>Interest Accrued:</strong> ${getVar(['interest_amount'])}<br/>
<strong>Penalty & Other Charges:</strong> ${getVar(['penalty_amount'])}<br/>
<strong>Total Outstanding Amount:</strong> ${getVar(['total_amount', 'total_due'])}</p>
<h3>3. ONE TIME SETTLEMENT OFFER:</h3>
<p>In the spirit of amicable resolution and to avoid protracted legal proceedings, ${lenderName} is pleased to extend to you a ONE TIME SETTLEMENT opportunity.</p>
<p><strong>SETTLEMENT AMOUNT:</strong> ${getVar(['settlement_amount', 'ots_amount'])}</p>
<h3>4. TERMS AND CONDITIONS OF SETTLEMENT:</h3>
<ul>
<li><strong>Validity Period:</strong> This offer is valid for THIRTY (30) DAYS from the date of this letter</li>
<li><strong>Payment Mode:</strong> The settlement amount must be paid in FULL and in one installment only</li>
<li><strong>Account Closure:</strong> Upon receipt and realization of the settlement amount, the loan account shall be permanently closed</li>
<li><strong>Non-Negotiable:</strong> This is a ONE TIME offer and the settlement amount is NON-NEGOTIABLE</li>
</ul>
<p>We trust that you will consider this offer seriously and take appropriate action within the stipulated timeframe.</p>
<p>Yours sincerely,</p>
<p>For <strong>${lenderName}</strong></p>
`;
  } else {
    content = `
<h1 style="text-align: center;">OVERDUE PAYMENT NOTICE</h1>
<p style="text-align: center;"><em>(Payment Reminder)</em></p>
<hr/>
<p><strong>Date:</strong> ${date}</p>
<p><strong>From:</strong> ${lenderName}<br/>
${lenderAddress}<br/>
Collections & Recovery Department</p>
<p><strong>To:</strong><br/>
${getVar(['borrower_name', 'customer_name', 'name'])}<br/>
${getVar(['borrower_address', 'address'])}</p>
<hr/>
<p><strong>Subject:</strong> URGENT - Overdue Payment Notice<br/>
Account No. ${getVar(['account_number'])}</p>
<p>Dear ${getVar(['borrower_name', 'customer_name', 'name'])},</p>
<p>This is to bring to your kind attention that your loan account with ${lenderName} has become OVERDUE and immediate action is required from your end.</p>
<h3>1. ACCOUNT DETAILS:</h3>
<p><strong>Loan Account Number:</strong> ${getVar(['account_number'])}<br/>
<strong>Due Date:</strong> ${getVar(['due_date', 'payment_due_date'])}<br/>
<strong>Current Status:</strong> OVERDUE</p>
<h3>2. PAYMENT BREAKDOWN:</h3>
<p><strong>EMI/Installment Amount:</strong> ${getVar(['emi_amount', 'emi'])}<br/>
<strong>Late Payment Penalty:</strong> ${getVar(['penalty_amount', 'penalty'])}<br/>
<strong>TOTAL AMOUNT DUE:</strong> ${getVar(['total_amount', 'total_due'])}</p>
<h3>3. IMMEDIATE ACTION REQUIRED:</h3>
<p>You are requested to make the payment of <strong>${getVar(['total_amount', 'total_due'])}</strong> IMMEDIATELY to regularize your account and avoid further consequences.</p>
<p>Please treat this matter with urgency.</p>
<p>Yours sincerely,</p>
<p>For <strong>${lenderName}</strong><br/>
Collections & Recovery Department</p>
`;
  }

  return content;
}

export function NoticePreview({ templateData, onStartNew }: NoticePreviewProps) {
  const [isEditing, setIsEditing] = useState(!templateData.content);
  const [noticeTypeNames, setNoticeTypeNames] = useState<Record<string, string>>({
    LRN: "Legal Recovery Notice",
    LDN: "Legal Demand Notice",
    OTS: "One Time Settlement",
    Overdue: "Overdue Notice",
  });

  // State for content in different languages
  const [contentMap, setContentMap] = useState<Record<string, string>>(() => {
    // Initialize with existing languages if available
    if (templateData.languages && Object.keys(templateData.languages).length > 0) {
      // Ensure English matches the main content if not explicitly set
      const map = { ...templateData.languages };
      if (!map['English'] && templateData.content) {
        map['English'] = templateData.content;
      }
      return map;
    }

    // Fallback: Initialize English with default content
    return {
      'English': templateData.content || generateInitialContent(templateData)
    };
  });

  const [lastMatched, setLastMatched] = useState<string | null>(localStorage.getItem('lastMatchedTemplate'));

  useEffect(() => {
    // If a template was matched, try to load its exact content for the editor
    const loadMatchedContent = async () => {
      const matchedFile = localStorage.getItem('lastMatchedTemplate');
      if (matchedFile && !templateData.content) {
        try {
          const response = await fetch(`${API_BASE}/api/templates/file/${matchedFile}`);
          if (response.ok) {
            const text = await response.text();
            setContentMap(prev => ({
              ...prev,
              'English': text
            }));
            toast.success(`Loaded template format from ${matchedFile}`);
          }
        } catch (e) {
          console.error("Failed to load matched template content", e);
        }
      }
    };

    const fetchNoticeTypes = async () => {
      try {
        const types = await getNoticeTypes();
        const mapping: Record<string, string> = { ...noticeTypeNames };
        types.forEach((t: any) => {
          mapping[t.id] = t.title;
        });
        setNoticeTypeNames(mapping);
      } catch (e) {
        console.error("Failed to fetch notice types", e);
      }
    };

    loadMatchedContent();
    fetchNoticeTypes();
  }, []);

  const [currentLanguage, setCurrentLanguage] = useState("English");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const editorRef = useRef<any>(null);

  // Analyze variable usage
  const usedVariables = useMemo(() => {
    const regex = /\$\{([^}]+)\}/g;
    const matches = [...(contentMap[currentLanguage] || "").matchAll(regex)];
    return new Set(matches.map(m => m[1]));
  }, [contentMap, currentLanguage]);

  // Get current content based on selected language
  const currentContent = contentMap[currentLanguage] || "";

  // Advocate branding for preview and printing
  const advocateDetails = templateData.advocateDetails;
  let headerContent = advocateDetails?.headerHtml || advocateDetails?.bio || "";
  if (headerContent && !headerContent.includes('<img') && headerContent.match(/https?:\/\/[^\s<]+/i)) {
    headerContent = headerContent.replace(/(https?:\/\/[^\s<]+)/gi, '<img src="$1" alt="Header Image" style="max-width: 100%; max-height: 150px; object-fit: contain; margin: 0 auto;" />');
  }
  const headerHtml = headerContent ? `<div style="margin-bottom: 2rem; border-bottom: 1px solid #black; padding-bottom: 1rem;" class="preview-header">${headerContent}</div><style>.preview-header img { max-width: 100%; height: auto; }</style>\n` : '';
  const signatureHtml = advocateDetails?.signature ? `<div style="margin-top: 2rem;"><img src="${advocateDetails.signature}" alt="${templateData.advocate} Signature" style="max-height: 80px; object-fit: contain;" /></div>\n` : '';
  const fullPreviewContent = `${headerHtml}${currentContent}${signatureHtml}`;

  // Update content for the CURRENT language
  const handleContentChange = (newContent: string) => {
    setContentMap(prev => ({
      ...prev,
      [currentLanguage]: newContent
    }));
  };



  const handleSaveTemplate = () => {
    // 1. Prepare the template object
    const template: SavedTemplate = {
      ...templateData,
      content: contentMap['English'] || "",
      languages: contentMap,
      id: templateData.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    // 2. If it belongs to a Theme, save it there
    if (templateData.id) {
      const savedThemes = localStorage.getItem("legalPortalThemes");
      if (savedThemes) {
        const themes: any[] = JSON.parse(savedThemes);
        const themeIndex = themes.findIndex(t => t.id === templateData.id);
        
        if (themeIndex >= 0) {
          // Add this template to the theme's templates or update existing for this language?
          // To keep it simple based on the UI: add a new ThemeTemplate
          const newTemplate: any = {
            language: currentLanguage,
            createdAt: new Date().toLocaleString(),
            content: currentContent
          };
          
          if (!themes[themeIndex].templates) themes[themeIndex].templates = [];
          
          // Check if we should update or append
          const existingTplIdx = themes[themeIndex].templates.findIndex((t: any) => t.language === currentLanguage);
          if (existingTplIdx >= 0) {
            themes[themeIndex].templates[existingTplIdx] = newTemplate;
          } else {
            themes[themeIndex].templates.push(newTemplate);
          }
          
          localStorage.setItem("legalPortalThemes", JSON.stringify(themes));
          toast.success(`Template saved to theme "${themes[themeIndex].name}"`);
          
          // Use window.location.reload() or just state update? 
          // App.tsx handles state, so we just need to signal completion.
          setIsEditing(false);
          onStartNew(); // This triggers the exit in App.tsx
          return;
        }
      }
    }

    // 3. Fallback: Save to standalone templates
    const saved = localStorage.getItem("savedTemplates");
    const templates: SavedTemplate[] = saved ? JSON.parse(saved) : [];

    const existingIndex = templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
      toast.success("Template & all languages updated!");
    } else {
      templates.push(template);
      toast.success("Template saved successfully!");
    }

    localStorage.setItem("savedTemplates", JSON.stringify(templates));
    setIsEditing(false);
    onStartNew();
  };

  const handleSaveToFolder = async () => {
    const { lender, noticeType } = templateData;
    if (!lender || !noticeType) {
      toast.error("Lender and Notice Type are required to save to folder");
      return;
    }

    const toastId = toast.loading(`Saving to Notice folder as ${lender}_${noticeType}.docx...`);
    try {
      const success = await saveTemplateToFolder(lender, noticeType, currentContent);
      if (success) {
        toast.success("Saved to Notice folder successfully!", { id: toastId });
      } else {
        throw new Error("Save check failed");
      }
    } catch (e) {
      toast.error("Failed to save to Notice folder", { id: toastId });
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Preparing professional PDF document...");
    try {
      // Use the hidden export container to ensure it works even if the user is on the Edit tab
      let element = document.getElementById('pdf-export-content') || document.getElementById('document-preview-content');
      
      if (!element) {
        throw new Error("Preview content not found. please ensure you have content in the editor.");
      }

      // Clone the element for export to avoid modification of the UI
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Ensure the clone is visible for the capture (though it's in a hidden container, 
      // some captures might need it to be in the DOM tree)
      // Remove shadow from clone if present
      const innerDiv = clone.querySelector('div');
      if (innerDiv) {
        innerDiv.style.boxShadow = 'none';
        innerDiv.style.margin = '0';
      }

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${templateData.noticeType || 'notice'}_${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          logging: false,
          onclone: (doc: Document) => {
            const elements = doc.getElementsByTagName('*');
            for (let i = 0; i < elements.length; i++) {
              const el = elements[i] as HTMLElement;
              // Strip oklch from variables and force standard colors
              el.style.setProperty('--background', '#ffffff', 'important');
              el.style.setProperty('--foreground', '#111827', 'important');
              el.style.setProperty('--primary', '#111827', 'important');
              el.style.setProperty('--border', '#e5e7eb', 'important');
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4' as const, orientation: 'portrait' as const }
      };

      if (typeof html2pdf !== 'function') {
        throw new Error("PDF library not initialized. Please refresh and try again.");
      }

      await html2pdf().from(clone).set(opt).save();
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (e: any) {
      console.error("PDF Error:", e);
      toast.error(`Failed to generate PDF: ${e.message || "Unknown error"}`, { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportNoticesZip = async () => {
    if (!currentContent) {
      toast.error("Please add template content before exporting.");
      return;
    }

    setIsExportingZip(true);
    const toastId = toast.loading("Generating DOCX/PDF notices from CSV data...");

    try {
      const rows = templateData.sampleData && templateData.sampleData.length > 0
        ? templateData.sampleData
        : [{}];
      const barcodeField = templateData.csvHeaders?.find((header) => /barcode|loan|account|lan/i.test(header));
      const filenamePrefix = `${templateData.noticeType || "notice"}_${currentLanguage}`.replace(/\s+/g, "_");

      const blob = await exportNoticesZip({
        content: fullPreviewContent,
        rows,
        filenamePrefix,
        lender: templateData.lender,
        noticeType: templateData.noticeType,
        barcodeField,
        signature: advocateDetails?.signature,
        advocateDetails,
        exportPdf: true,
        mergePdf: true,
        includeDocx: true,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filenamePrefix}_notices.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${rows.length} notice${rows.length === 1 ? "" : "s"} successfully!`, { id: toastId });
    } catch (e: any) {
      console.error("Notice ZIP export failed:", e);
      toast.error(`Export failed: ${e.message || "Unknown error"}`, { id: toastId });
    } finally {
      setIsExportingZip(false);
    }
  };

  const handlePrint = () => {
    // Create an invisible iframe for printing
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'absolute';
    printIframe.style.width = '0px';
    printIframe.style.height = '0px';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);

    const printDocument = printIframe.contentWindow?.document;
    if (printDocument) {
      // Get the preview content or a fallback
      const element = document.getElementById('document-preview-content');
      const printContent = element ? element.innerHTML : `
        <div style="font-family: serif; padding: 20mm;">
          ${fullPreviewContent}
        </div>
      `;

      const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>${templateData.templateName || 'Legal Notice'}</title>
    <style>
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0; }
      /* Include any necessary CSS for DocumentPreview here for the iframe */
      ${Array.from(document.styleSheets)
        .filter(sheet => {
          try { return !sheet.href || sheet.href.startsWith(window.location.origin); }
          catch(e) { return false; }
        })
        .map(sheet => {
          try { return Array.from(sheet.cssRules).map(rule => rule.cssText).join(''); }
          catch(e) { return ''; }
        })
        .join('\n')}
      
      /* Force white background for print */
      .bg-white { background-color: white !important; }
      .text-black { color: black !important; }
      
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    </style>
  </head>
  <body onload="window.focus(); window.print();">
    ${printContent}
  </body>
</html>`;
      printDocument.open();
      // Writing the entire HTML at once to prevent parsing bugs
      printDocument.write(htmlContent);
      printDocument.close();

      // Give the browser time to render the DOM and images
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();

        // Clean up the iframe after print dialog is closed
        setTimeout(() => {
          document.body.removeChild(printIframe);
        }, 1000);
      }, 500);
    } else {
      toast.error('Unable to open print preview. Please try again.');
    }
  };


  const handleInsertVariable = (variable: string) => {
    toast.success(`Variable \${${variable}} inserted at cursor`);
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Edit Template</h2>
        <p className="text-slate-600 dark:text-gray-400">
          Customize your legal notice template with rich text editing
        </p>
      </div>

      {/* Template Info */}
      <Card className="p-6 mb-6 bg-white/50 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-1">Notice Type</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {noticeTypeNames[templateData.noticeType!]}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-1">Template Name</p>
            <p className="font-semibold text-slate-900 dark:text-white">{templateData.templateName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-1">Delivery Mode</p>
            <Badge variant={templateData.deliveryMode === "digital" ? "default" : "secondary"} className="dark:bg-gray-700 dark:text-gray-200">
              {templateData.deliveryMode === "digital" ? <Mail className="w-3 h-3 mr-1" /> : <Printer className="w-3 h-3 mr-1" />}
              {templateData.deliveryMode === "digital" ? "Digital" : "Physical"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-1">Variables</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {templateData.selectedVariables.length} selected
            </p>
          </div>
        </div>
      </Card>

      {/* Editor / Preview Tabs */}
      <Card className="mb-6 bg-white/50 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50">
        <Tabs value={isEditing ? "edit" : "preview"} onValueChange={(v) => setIsEditing(v === "edit")}>
          <div className="border-b border-slate-200 dark:border-gray-700/50 px-6 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Language Switcher - ALWAYS VISIBLE in both modes */}
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
              <Label className="text-sm font-medium text-slate-600 dark:text-gray-300">Language:</Label>
              <div className="w-[140px]">
                <Select value={currentLanguage} onValueChange={async (lang) => {
                  setCurrentLanguage(lang);
                  
                  // If switching to a language that has no content yet
                  if (!contentMap[lang] || contentMap[lang].trim() === "") {
                    // Try to translate from English
                    const sourceContent = contentMap["English"];
                    if (sourceContent && lang !== "English") {
                      const toastId = toast.loading(`Translating to ${lang}...`);
                      try {
                        const targetCode = languageMap[lang] || "en";
                        const translated = await translateText(sourceContent, targetCode);
                        
                        setContentMap(prev => ({
                          ...prev,
                          [lang]: translated
                        }));
                        toast.success(`Translated to ${lang} successfully!`, { id: toastId });
                      } catch (err: any) {
                        console.error("Auto-translation failed:", err);
                        toast.error(`Auto-translation to ${lang} failed. Using English as base.`, { id: toastId });
                        // Copy English as base if translation fails
                        setContentMap(prev => ({
                          ...prev,
                          [lang]: sourceContent
                        }));
                      }
                    }
                  }
                }}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Marathi">Marathi</SelectItem>
                    <SelectItem value="Gujarati">Gujarati</SelectItem>
                    <SelectItem value="Tamil">Tamil</SelectItem>
                    <SelectItem value="Telugu">Telugu</SelectItem>
                    <SelectItem value="Kannada">Kannada</SelectItem>
                    <SelectItem value="Bengali">Bengali</SelectItem>
                    <SelectItem value="Punjabi">Punjabi</SelectItem>
                    <SelectItem value="Malayalam">Malayalam</SelectItem>
                    <SelectItem value="Odia">Odia</SelectItem>
                    <SelectItem value="Assamese">Assamese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <TabsContent value="edit" className="p-6">
            <div className="mb-4">
            </div>

            <div className="flex gap-6 items-start mt-4">
              <div className="flex-1 bg-white dark:bg-gray-950 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm transition-all">
                <TemplateEditor
                  ref={editorRef}
                  content={currentContent}
                  onChange={handleContentChange}
                  variables={[...new Set([...templateData.selectedVariables, "advocate_sign", "barcode", "signature"])]}
                  amountVariables={templateData.amountVariables || []}
                  onInsertVariable={handleInsertVariable}
                  onToggleVariables={() => setShowVariables(!showVariables)}
                  showVariables={showVariables}
                />
              </div>

              {showVariables && (
                <div className="animate-in slide-in-from-right duration-300 min-h-[500px]">
                  <VariableSidePanel 
                    variables={[...new Set([...templateData.selectedVariables, "advocate_sign", "barcode", "signature"])]}
                    amountVariables={templateData.amountVariables || []}
                    usedVariables={usedVariables}
                    onInsert={(v: string) => {
                      editorRef.current?.insertVariable(v);
                    }}
                    onClose={() => setShowVariables(false)}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="p-6">
            <div className="bg-slate-100 dark:bg-gray-900/30 rounded-lg p-4 sm:p-8 flex justify-center overflow-x-auto min-h-[500px]">
              {currentContent ? (
                <div id="document-preview-content">
                  <DocumentPreview 
                    template={{ 
                      ...templateData, 
                      content: currentContent 
                    }} 
                  />
                </div>
              ) : (
                <div className="text-center text-slate-400 dark:text-gray-500 py-20 italic bg-white dark:bg-gray-800 w-full rounded-lg border border-slate-200 dark:border-gray-700">
                  No content for {currentLanguage}. Switch to Edit mode to add content.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleSaveTemplate}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Locally
        </Button>
        <Button
          onClick={handleSaveToFolder}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save to Notice Folder
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Preview ({currentLanguage})
        </Button>
        <Button
          onClick={handleDownloadPdf}
          variant="outline"
          disabled={isGeneratingPdf || !currentContent}
        >
          <FileText className="w-4 h-4 mr-2" />
          {isGeneratingPdf ? "Generating..." : "Download as PDF"}
        </Button>
        <Button
          onClick={handleExportNoticesZip}
          variant="outline"
          disabled={isExportingZip || !currentContent}
        >
          <Download className="w-4 h-4 mr-2" />
          {isExportingZip ? "Exporting..." : "Export DOCX/PDF ZIP"}
        </Button>
        <Button
          onClick={onStartNew}
          variant="outline"
        >
          <FileText className="w-4 h-4 mr-2" />
          Create New Template
        </Button>
      </div>

      {/* Hidden container for PDF export that's always in the DOM */}
      <div 
        style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div id="pdf-export-content">
          {currentContent ? (
            <DocumentPreview 
              template={{ 
                ...templateData, 
                content: currentContent 
              }} 
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
