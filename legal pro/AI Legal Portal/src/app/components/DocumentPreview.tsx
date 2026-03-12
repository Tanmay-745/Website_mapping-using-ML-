import { TemplateData } from "../App";
import { cn } from "./ui/utils";

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
    
    return processedText;
  };

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

  return (
    <div className={cn("bg-white text-black p-[20mm] shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] font-serif print:shadow-none print:p-0", className)}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight mb-0 font-serif leading-none">{advocate}</h1>
          <p className="text-sm font-medium mb-4 italic">(Advocate)</p>
          <div className="text-xs space-y-0.5 text-gray-800">
            {advocateDetails?.address && <p>{advocateDetails.address}</p>}
            {advocateDetails?.city && <p>{advocateDetails.city}, {advocateDetails.state} - {advocateDetails.pinCode}</p>}
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

      {/* Recipient area */}
      <div className="mb-8 text-sm">
        <p className="font-bold mb-1">To,</p>
        <p className="font-bold">{recipientName}</p>
        <p className="max-w-xs">{recipientAddress}</p>
      </div>

      {/* Barcode and From area */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex-1">
          {/* Placeholder Barcode */}
          <div className="inline-block text-center mb-2">
             <div className="h-10 w-48 bg-black mb-1 flex items-center justify-around px-1">
                {[...Array(40)].map((_, i) => (
                   <div key={i} className="h-full bg-white" style={{ width: Math.random() > 0.5 ? '1px' : '2px' }} />
                ))}
             </div>
             <p className="text-[10px] tracking-widest font-mono">JF307048598IN</p>
          </div>
          <div className="text-[10px] space-y-0.5">
            <p><span className="font-bold">From:</span> {advocate}</p>
            <p>{advocateDetails?.address}</p>
            <p>{advocateDetails?.city}, {advocateDetails?.state}</p>
          </div>
        </div>
        
        <div className="text-right text-xs">
          <p className="font-bold">921-482</p>
        </div>
      </div>

      {/* Reference and Date */}
      <div className="flex justify-between items-center mb-8 text-sm">
        <p><span className="font-bold">Ref:</span> {template.noticeType || "Notice"}/ {template.id?.slice(-4) || "TEMP"} /02-26</p>
        <p><span className="font-bold">Date:</span> {date}</p>
      </div>

      {/* Main Content Area */}
      <div className="text-center mb-6 text-sm">
        <p className="font-bold underline">Without Prejudice</p>
      </div>

      <div className="mb-8 text-sm">
        <p className="font-bold mb-2">To,</p>
        <p className="font-bold uppercase mb-4">Customer Name: {recipientName}</p>
        <p className="mb-4"><span className="font-bold">Address:</span> {recipientAddress}</p>
        <p className="mb-4"><span className="font-bold">Phone Number:</span> {advocateDetails?.phone || "[Phone]"}</p>
        <p className="font-bold mb-4">SUBJECT: {template.noticeType || "LEGAL"} NOTICE FOR LOAN ACCOUNT NO. {accountNo}</p>
      </div>

      <div className="text-sm leading-relaxed mb-8">
        <p className="mb-4 font-serif">Dear Sir / Madam,</p>
        <div 
          dangerouslySetInnerHTML={{ __html: replacePlaceholders(template.content || "") }}
          className="prose prose-sm max-w-none text-black font-serif text-justify"
          style={{ lineHeight: '1.6' }}
        />
      </div>

      {/* Signature */}
      {advocateDetails?.signature && (
        <div className="mt-12 text-center">
            <img 
              src={advocateDetails.signature} 
              alt="Signature" 
              className="max-h-20 mx-auto"
            />
            <p className="mt-2 font-bold">{advocate}</p>
            <p className="text-xs">Advocate</p>
        </div>
      )}
    </div>
  );
}
