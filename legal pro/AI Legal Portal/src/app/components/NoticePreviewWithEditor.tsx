import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TemplateData, SavedTemplate } from "../App";
import { FileText, Save, Mail, Printer, Edit3, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TemplateEditor } from "./TemplateEditor";
import { generateNoticeContent } from "../api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Languages } from "lucide-react";

interface NoticePreviewProps {
  templateData: TemplateData;
  onStartNew: () => void;
}

const noticeTypeNames = {
  LRN: "Legal Recovery Notice",
  LDN: "Legal Demand Notice",
  OTS: "One Time Settlement",
  Overdue: "Overdue Notice",
};

// Generate initial template content
function generateInitialContent(templateData: TemplateData): string {
  const { noticeType, lender, advocate, selectedVariables } = templateData;
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
For and on behalf of ${lender}</p>
<p><strong>To:</strong><br/>
${getVar(['borrower_name', 'customer_name', 'name'])}<br/>
${getVar(['borrower_address', 'address', 'customer_address'])}</p>
<hr/>
<p><strong>Subject:</strong> Legal Recovery Notice for Outstanding Dues - Account No. ${getVar(['account_number', 'account_no', 'loan_account'])}</p>
<p>Dear Sir/Madam,</p>
<p>I, ${advocate}, Advocate, am writing this notice on behalf of my client, ${lender}, regarding your loan account.</p>
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
For ${lender}</p>
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
For and on behalf of ${lender}</p>
<p><strong>To:</strong><br/>
${getVar(['borrower_name', 'customer_name', 'name'])}<br/>
${getVar(['borrower_address', 'address'])}</p>
<hr/>
<p><strong>Subject:</strong> LEGAL DEMAND NOTICE - IMMEDIATE PAYMENT REQUIRED<br/>
Re: Account No. ${getVar(['account_number', 'account_no'])}</p>
<p>Dear Sir/Madam,</p>
<p>Under the instructions and on behalf of my client, ${lender}, I hereby serve upon you this LEGAL DEMAND NOTICE regarding your default in payment obligations.</p>
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
For ${lender}</p>
`;
  } else if (noticeType === "OTS") {
    content = `
<h1 style="text-align: center;">ONE TIME SETTLEMENT PROPOSAL</h1>
<p style="text-align: center;"><em>(OTS Offer Letter)</em></p>
<hr/>
<p><strong>Date:</strong> ${date}<br/>
<strong>Reference No.:</strong> OTS/${getVar(['account_number'])}/2026</p>
<p><strong>From:</strong> ${lender}<br/>
<strong>Through:</strong> ${advocate}</p>
<p><strong>To:</strong><br/>
${getVar(['borrower_name', 'customer_name', 'name'])}<br/>
${getVar(['borrower_address', 'address'])}</p>
<hr/>
<p><strong>Subject:</strong> One Time Settlement (OTS) Proposal - Account No. ${getVar(['account_number'])}</p>
<p>Dear ${getVar(['borrower_name', 'customer_name', 'name'])},</p>
<p>This communication is in reference to your loan account with ${lender}.</p>
<h3>1. CURRENT ACCOUNT STATUS:</h3>
<p><strong>Account Number:</strong> ${getVar(['account_number'])}<br/>
<strong>Classification:</strong> NPA (Non-Performing Asset)</p>
<h3>2. OUTSTANDING POSITION (as on ${date}):</h3>
<p><strong>Principal Outstanding:</strong> ${getVar(['principal_amount', 'principal'])}<br/>
<strong>Interest Accrued:</strong> ${getVar(['interest_amount'])}<br/>
<strong>Penalty & Other Charges:</strong> ${getVar(['penalty_amount'])}<br/>
<strong>Total Outstanding Amount:</strong> ${getVar(['total_amount', 'total_due'])}</p>
<h3>3. ONE TIME SETTLEMENT OFFER:</h3>
<p>In the spirit of amicable resolution and to avoid protracted legal proceedings, ${lender} is pleased to extend to you a ONE TIME SETTLEMENT opportunity.</p>
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
<p>For <strong>${lender}</strong></p>
`;
  } else {
    content = `
<h1 style="text-align: center;">OVERDUE PAYMENT NOTICE</h1>
<p style="text-align: center;"><em>(Payment Reminder)</em></p>
<hr/>
<p><strong>Date:</strong> ${date}</p>
<p><strong>From:</strong> ${lender}<br/>
Collections & Recovery Department</p>
<p><strong>To:</strong><br/>
${getVar(['borrower_name', 'customer_name', 'name'])}<br/>
${getVar(['borrower_address', 'address'])}</p>
<hr/>
<p><strong>Subject:</strong> URGENT - Overdue Payment Notice<br/>
Account No. ${getVar(['account_number'])}</p>
<p>Dear ${getVar(['borrower_name', 'customer_name', 'name'])},</p>
<p>This is to bring to your kind attention that your loan account with ${lender} has become OVERDUE and immediate action is required from your end.</p>
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
<p>For <strong>${lender}</strong><br/>
Collections & Recovery Department</p>
`;
  }

  return content;
}

export function NoticePreview({ templateData, onStartNew }: NoticePreviewProps) {
  const [isEditing, setIsEditing] = useState(!templateData.content);

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

  const [currentLanguage, setCurrentLanguage] = useState("English");

  // Get current content based on selected language
  const currentContent = contentMap[currentLanguage] || "";

  // Update content for the CURRENT language
  const handleContentChange = (newContent: string) => {
    setContentMap(prev => ({
      ...prev,
      [currentLanguage]: newContent
    }));
  };

  const handleSaveTemplate = () => {
    // Create template object
    // Key change: Save the WHOLE map
    const template: SavedTemplate = {
      ...templateData,
      content: contentMap['English'] || "", // Main content is typically English fallback
      languages: contentMap,
      id: templateData.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    // Load existing templates
    const saved = localStorage.getItem("savedTemplates");
    const templates: SavedTemplate[] = saved ? JSON.parse(saved) : [];

    // Check if updating existing or creating new
    const existingIndex = templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
      toast.success("Template & all languages updated!");
    } else {
      templates.push(template);
      toast.success("Template saved successfully!");
    }

    // Save to localStorage
    localStorage.setItem("savedTemplates", JSON.stringify(templates));

    setIsEditing(false);
    onStartNew(); // Redirect to Saved Templates portal
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Legal Notice</title>');
      printWindow.document.write('<style>body{font-family: Arial, sans-serif; padding: 40px; line-height: 1.6;} h1{text-align: center;} hr{margin: 20px 0;}</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(currentContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleInsertVariable = (variable: string) => {
    toast.info(`Variable \${${variable}} inserted (cursor support pending in editor)`);
    // Note: TemplateEditor needs to support inserting at cursor. 
    // For now, user copies it. Or we need to pass this down.
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Edit Template</h2>
        <p className="text-slate-600">
          Customize your legal notice template with rich text editing
        </p>
      </div>

      {/* Template Info */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-1">Notice Type</p>
            <p className="font-semibold text-slate-900">
              {noticeTypeNames[templateData.noticeType!]}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Template Name</p>
            <p className="font-semibold text-slate-900">{templateData.templateName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Delivery Mode</p>
            <Badge variant={templateData.deliveryMode === "digital" ? "default" : "secondary"}>
              {templateData.deliveryMode === "digital" ? <Mail className="w-3 h-3 mr-1" /> : <Printer className="w-3 h-3 mr-1" />}
              {templateData.deliveryMode === "digital" ? "Digital" : "Physical"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Variables</p>
            <p className="font-semibold text-slate-900">
              {templateData.selectedVariables.length} selected
            </p>
          </div>
        </div>
      </Card>

      {/* Editor / Preview Tabs */}
      <Card className="mb-6">
        <Tabs value={isEditing ? "edit" : "preview"} onValueChange={(v) => setIsEditing(v === "edit")}>
          <div className="border-b border-slate-200 px-6 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
              <Label className="text-sm font-medium text-slate-600">Language:</Label>
              <div className="w-[140px]">
                <Select value={currentLanguage} onValueChange={(lang) => {
                  // Check if language exists, if not, maybe initialize it?
                  // For now, just switch. Content will be empty string if not exists.
                  if (!contentMap[lang] && lang !== 'English') {
                    toast.info(`No content for ${lang} yet. content will be empty.`);
                  }
                  setCurrentLanguage(lang);
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
              <div className="flex flex-col gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    AI Assistant
                  </h4>
                </div>

                <div className="flex flex-wrap gap-4 items-end">
                  {/* Generate Button - Only for English usually? Or generate directly in target? */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={async () => {
                      const toastId = toast.loading(`Generating ${currentLanguage} content...`);
                      try {
                        const generatedContent = await generateNoticeContent(
                          `Draft a comprehensive legal notice for a "${noticeTypeNames[templateData.noticeType!]}" sent by "${templateData.lender}" to a borrower.
                          Context: ${templateData.description}.
                          Variables to include: ${templateData.selectedVariables.join(", ")}.
                          Language: ${currentLanguage}.
                          Make it professional, legally sound, and formatted in HTML suitable for a rich text editor.`,
                          { type: "content", ...templateData }
                        );
                        handleContentChange(generatedContent);
                        toast.success("Content generated successfully!", { id: toastId });
                      } catch (e: any) {
                        const errorMessage = e.message || "Failed to generate content";
                        toast.error(errorMessage, { id: toastId });
                      }
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Auto-Generate ({currentLanguage})
                  </Button>

                  <div className="h-8 w-px bg-slate-300 mx-2 hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    {/* Translate Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={async () => {
                        const sourceLang = "English";
                        const sourceContent = contentMap[sourceLang];

                        if (!sourceContent) {
                          toast.error("No English content to translate from.");
                          return;
                        }
                        if (currentLanguage === "English") {
                          toast.info("Already in English. Switch language to translate.");
                          return;
                        }

                        const toastId = toast.loading(`Translating English to ${currentLanguage}...`);
                        try {
                          const translatedContent = await generateNoticeContent(
                            `Translate the following legal notice content into ${currentLanguage}.
                            IMPORTANT: 
                            1. Maintain the HTML structure, formatting, and all variables (like \${variable_name}) exactly as they are.
                            2. Only translate the text content.
                            3. Maintain the legal tone and formal language appropriate for ${currentLanguage}.
                            
                            Content to translate:
                            ${sourceContent}`,
                            { type: "translation", targetLanguage: currentLanguage, ...templateData }
                          );
                          handleContentChange(translatedContent);
                          toast.success(`Translated to ${currentLanguage} successfully!`, { id: toastId });
                        } catch (e: any) {
                          const errorMessage = e.message || "Failed to translate content";
                          toast.error(errorMessage, { id: toastId });
                        }
                      }}
                    >
                      <Languages className="w-4 h-4 mr-2" />
                      Translate English to {currentLanguage}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* EDITOR */}
            <TemplateEditor
              content={currentContent}
              onChange={handleContentChange}
              variables={templateData.selectedVariables}
              onInsertVariable={handleInsertVariable}
            />
          </TabsContent>

          <TabsContent value="preview" className="p-6">
            <div className="border border-slate-200 rounded-lg p-8 bg-white min-h-[500px]">
              {currentContent ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentContent }}
                />
              ) : (
                <div className="text-center text-slate-400 py-20 italic">
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
          Save All Languages
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Preview ({currentLanguage})
        </Button>
        <Button
          onClick={onStartNew}
          variant="outline"
        >
          <FileText className="w-4 h-4 mr-2" />
          Create New Template
        </Button>
      </div>
    </div>
  );
}
