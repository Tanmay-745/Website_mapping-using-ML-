import { useState, useEffect } from "react";
import { TemplateData } from "../App";
import { cn } from "./ui/utils";
import bwipjs from 'bwip-js';

interface DocumentPreviewProps {
  template: TemplateData;
  className?: string;
}

export function DocumentPreview({ template, className }: DocumentPreviewProps) {
  const dateStr = template.id && (template as any).createdAt 
    ? (template as any).createdAt 
    : new Date().toISOString();

  const date = new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const advocate = template.advocate || "Advocate Name";
  const advocateDetails = template.advocateDetails;

  const [barcodeImage, setBarcodeImage] = useState<string | null>(null);

  const getVarValue = (possibleNames: string[], defaultValue: string = "[VARIABLE]") => {
    if (!template.sampleData || template.sampleData.length === 0) return defaultValue;
    const firstRow = template.sampleData[0];
    
    for (const name of possibleNames) {
      const foundKey = Object.keys(firstRow).find(k => k.toLowerCase().includes(name.toLowerCase()));
      if (foundKey) return firstRow[foundKey];
    }
    return defaultValue;
  };

  const recipientName = getVarValue(['borrower_name', 'customer_name', 'name'], "[Recipient Name]");
  const recipientAddress = getVarValue(['borrower_address', 'address', 'customer_address'], "[Recipient Address]");
  const accountNo = getVarValue(['account_number', 'account_no', 'loan_account'], "[ACCOUNT_NO]");

  // Function to replace placeholders with sample data from the first row
  const replacePlaceholders = (text: string) => {
    if (!text || !template.sampleData || template.sampleData.length === 0) return text;
    
    const firstRow = template.sampleData[0];
    let processedText = text;
    
    // Replace ${variable_name} with the value from the first row
    Object.keys(firstRow).forEach(key => {
      const value = firstRow[key] || `[${key}]`;
      const placeholder = `\${${key}}`;
      // Use a global regex to replace all instances
      processedText = processedText.split(placeholder).join(value);
    });

    // Special case for advocate_sign variable
    if (template.advocateDetails?.signature) {
      const sigImg = `<img src="${template.advocateDetails.signature}" alt="Signature" style="max-height: 60px; vertical-align: middle; display: inline-block; margin: 0 4px;" />`;
      processedText = processedText.split('${advocate_sign}').join(sigImg);
    } else {
      processedText = processedText.split('${advocate_sign}').join('<span style="color: red; font-weight: bold;">[SIGNATURE_MISSING]</span>');
    }

    // Special case for barcode variable
    if (barcodeImage) {
      const barcodeImg = `<div style="margin: 10px 0;"><img src="${barcodeImage}" style="max-height: 60px;" alt="Barcode" /></div>`;
      processedText = processedText.split('${barcode}').join(barcodeImg);
    }

    return processedText;
  };

  useEffect(() => {
    const generateBarcode = async () => {
      const barcodeKeywords = ['barcode', 'tracking', 'consignment', 'awb', 'reference'];
      const headers = template.csvHeaders || [];
      const barcodeHeader = headers.find(h => 
        barcodeKeywords.some(key => h.toLowerCase().includes(key))
      );

      if (barcodeHeader) {
        try {
          let barcodeText = 'JF309279841IN'; // Default sample
          if (template.sampleData && template.sampleData.length > 0 && template.sampleData[0][barcodeHeader]) {
            barcodeText = template.sampleData[0][barcodeHeader];
          }

          const canvas = document.createElement('canvas');
          bwipjs.toCanvas(canvas, {
            bcid: 'code128',
            text: barcodeText,
            scale: 2,
            height: 10,
            includetext: true,
            textxalign: 'center',
          });
          setBarcodeImage(canvas.toDataURL('image/png'));
        } catch (e) {
          console.error("Barcode generation failed in DocumentPreview", e);
        }
      }
    };
    generateBarcode();
  }, [template.sampleData, template.csvHeaders]);

  return (
    <div className={cn("bg-white text-black p-[20mm] shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] font-serif print:shadow-none print:p-0", className)}>
      {/* Header */}
      {advocateDetails?.headerHtml || advocateDetails?.bio ? (
        <div 
          className="preview-header mb-4 pb-4" 
          style={{ borderBottom: '2px solid black' }}
          dangerouslySetInnerHTML={{ 
            __html: replacePlaceholders(
              (() => {
                const content = advocateDetails.headerHtml || advocateDetails.bio || "";
                if (!content.includes('<img') && content.match(/https?:\/\/[^\s<]+/i)) {
                  return content.replace(/(https?:\/\/[^\s<]+)/gi, '<img src="$1" alt="Header Image" style="max-width: 100%; max-height: 150px; object-fit: contain; margin: 0 auto;" />');
                }
                return content;
              })()
            ) 
          }}
        />
      ) : (
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight mb-0 leading-none">{advocate}</h1>
            <p className="text-sm font-medium mb-4 italic">(Advocate)</p>
            <div className="text-xs space-y-0.5 text-gray-800">
              {advocateDetails?.address && <p>{advocateDetails.address}</p>}
              {advocateDetails?.city && <p>{advocateDetails.city}, {advocateDetails.state} - {advocateDetails.pincode}</p>}
              <p className="flex items-center gap-2">
                <span className="font-bold">✉</span> {advocateDetails?.email || "advocate@gmail.com"} | 
                <span className="font-bold"> 📞</span> +{advocateDetails?.phone || "91 9999999999"}
              </p>
            </div>
          </div>
          
          {/* Shield Logo */}
          <div className="w-20 h-24 bg-black rounded-b-[2rem] flex items-center justify-center p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-12 h-12">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" stroke="none"/>
              <path d="M12 8v8M8 12h8" stroke="black" strokeWidth="2"/>
              <path d="M9 16h6" stroke="black" strokeWidth="2"/>
            </svg>
          </div>
        </div>
      )}

      {/* Barcode tracking area - KEPT per user request */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          {/* Placeholder or Real Barcode */}
          <div className="inline-block text-center mb-1">
             {barcodeImage ? (
               <img src={barcodeImage} style={{ maxHeight: '40px' }} alt="Barcode" />
             ) : (
               <>
                 <div className="h-10 w-48 bg-black mb-1 flex items-center justify-around px-1">
                    {[...Array(40)].map((_, i) => (
                       <div key={i} className="h-full bg-white" style={{ width: Math.random() > 0.5 ? '1px' : '2px' }} />
                    ))}
                 </div>
                 <p className="text-[10px] tracking-widest font-mono">JF307048598IN</p>
               </>
             )}
          </div>
          <div className="text-[10px] space-y-0.5 text-gray-500">
             <p>Certified Registered Service #921-482</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-gray-400 font-mono">
          REF: {template.noticeType || "N"}/{template.id?.slice(-4) || "00"}/{new Date().getFullYear()}
        </div>
      </div>

      {/* Main Content Area - Rendered directly like the editor */}
      <div className="text-sm leading-relaxed mb-8">
        <div 
          dangerouslySetInnerHTML={{ __html: replacePlaceholders(template.content || "") }}
          className="ql-editor ql-editor-preview text-black"
          style={{ lineHeight: '1.6', padding: 0 }}
        />
      </div>

      {/* Signature Section at the end */}
      {advocateDetails?.signature && !template.content?.includes("advocate_sign") && (
        <div className="mt-12 text-center ml-auto w-fit">
            <img 
              src={advocateDetails.signature} 
              alt="Signature" 
              className="max-h-20 mx-auto"
            />
            <p className="mt-2 font-bold border-t border-black pt-1">{advocate}</p>
            <p className="text-xs italic uppercase tracking-widest">Advocate & Legal Counsel</p>
        </div>
      )}

      <style>{`
        /* Essential Quill Preview Styles */
        .ql-editor-preview { 
          min-height: fit-content; 
          font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #374151 !important; /* Force HEX color to avoid oklch errors in PDF */
          background-color: #ffffff !important;
        }
        .ql-editor-preview p { margin-bottom: 0.5rem; white-space: pre-wrap; color: #374151 !important; }
        .ql-editor-preview h1, .ql-editor-preview h2, .ql-editor-preview h3 { 
          margin-bottom: 0.5rem; 
          font-weight: bold; 
          color: #111827 !important;
        }
        .ql-editor-preview h1 { font-size: 2em; text-align: center; }
        .ql-editor-preview h2 { font-size: 1.5em; }
        .ql-editor-preview h3 { font-size: 1.17em; }
        .ql-editor-preview ul, .ql-editor-preview ol { padding-left: 1.5em; margin-bottom: 1rem; }
        .ql-editor-preview li { margin-bottom: 0.25rem; color: #374151 !important; }
        
        /* Force Centering for any element with the alignment class */
        .ql-align-center { text-align: center !important; }
        .ql-align-right { text-align: right !important; }
        .ql-align-justify { text-align: justify !important; }
        
        /* Font styles */
        .ql-font-serif { font-family: Georgia, Times New Roman, serif !important; }
        .ql-font-monospace { font-family: Monaco, Courier New, monospace !important; }
        
        /* Size styles */
        .ql-size-small { font-size: 0.75em !important; }
        .ql-size-large { font-size: 1.5em !important; }
        .ql-size-huge { font-size: 2.5em !important; }
        
        /* Indentation classes */
        .ql-indent-1 { padding-left: 3em !important; }
        .ql-indent-2 { padding-left: 6em !important; }
        .ql-indent-3 { padding-left: 9em !important; }
        .ql-indent-4 { padding-left: 12em !important; }
        
        /* Ensure any inline style text-align works */
        .ql-editor-preview [style*="text-align: center"] { text-align: center !important; }
        .ql-editor-preview [style*="text-align:center"] { text-align: center !important; }

        /* Dynamic header image handling */
        .preview-header img { max-width: 100%; height: auto; }

        /* Global PDF Compatibility: avoid any oklch colors on the preview container and children */
        [id="document-preview-content"], [id="pdf-export-content"] {
          color: #000000 !important;
          background-color: #ffffff !important;
          /* Override thematic CSS variables used by Tailwind v4 to avoid oklch parsing errors */
          --background: #ffffff !important;
          --foreground: #000000 !important;
          --card: #ffffff !important;
          --card-foreground: #000000 !important;
          --popover: #ffffff !important;
          --popover-foreground: #000000 !important;
          --primary: #000000 !important;
          --primary-foreground: #ffffff !important;
          --secondary: #f3f4f6 !important;
          --secondary-foreground: #000000 !important;
          --muted: #f3f4f6 !important;
          --muted-foreground: #6b7280 !important;
          --accent: #f3f4f6 !important;
          --accent-foreground: #000000 !important;
          --destructive: #ef4444 !important;
          --destructive-foreground: #ffffff !important;
          --border: #e5e7eb !important;
          --input: #e5e7eb !important;
          --ring: #3b82f6 !important;
          --chart-1: #3b82f6 !important;
          --chart-2: #10b981 !important;
          --chart-3: #f59e0b !important;
          --chart-4: #ef4444 !important;
          --chart-5: #8b5cf6 !important;
          --sidebar: #ffffff !important;
          --sidebar-foreground: #111827 !important;
          --sidebar-primary: #111827 !important;
          --sidebar-primary-foreground: #ffffff !important;
          --sidebar-accent: #f3f4f6 !important;
          --sidebar-accent-foreground: #111827 !important;
          --sidebar-border: #e5e7eb !important;
          --sidebar-ring: #3b82f6 !important;
        }
        [id="document-preview-content"] *, [id="pdf-export-content"] * {
          border-color: #e5e7eb !important;
          outline-color: #3b82f6 !important;
          text-decoration-color: #000000 !important;
        }
      `}</style>
    </div>
  );
}
