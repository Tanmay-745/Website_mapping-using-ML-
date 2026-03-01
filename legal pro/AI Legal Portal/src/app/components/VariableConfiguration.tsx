import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { TemplateData } from "../App";
import { Upload, X, FileSpreadsheet, DollarSign, Radio, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface VariableConfigurationProps {
  templateData: TemplateData;
  onNext: (data: Partial<TemplateData>) => void;
}

export function VariableConfiguration({
  templateData,
  onNext,
}: VariableConfigurationProps) {
  const [csvHeaders, setCsvHeaders] = useState<string[]>(templateData.csvHeaders);
  const [selectedVariables, setSelectedVariables] = useState<string[]>(
    templateData.selectedVariables
  );
  const [amountVariables, setAmountVariables] = useState<string[]>(
    templateData.amountVariables
  );
  const [deliveryMode, setDeliveryMode] = useState<"physical" | "digital">(
    templateData.deliveryMode
  );
  const [fileName, setFileName] = useState<string>(
    templateData.sampleData && templateData.sampleData.length > 0 ? "Imported Data" : ""
  );
  const [previewData, setPreviewData] = useState<Record<string, string>[]>(templateData.sampleData || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect amount variables helper
  const detectAmountVariables = (headers: string[]) => {
    return headers.filter(h => /.*(?:amt|amount)$/i.test(h));
  };

  // Auto-detect on mount if no amount variables are selected yet
  useEffect(() => {
    if (amountVariables.length === 0 && selectedVariables.length > 0) {
      const detected = detectAmountVariables(selectedVariables);
      if (detected.length > 0) {
        setAmountVariables(detected);
      }
    }
  }, []); // Run once on mount

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results: any) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          const headers = results.meta.fields;
          setCsvHeaders(headers);
          setPreviewData(results.data as Record<string, string>[]);

          // Auto-select all variables by default for new upload
          setSelectedVariables(headers);

          // Auto-detect amount variables
          const detectedAmounts = detectAmountVariables(headers);
          setAmountVariables(detectedAmounts);
        }
      },
      error: (error: any) => {
        console.error("Error parsing CSV:", error);
        alert("Error parsing CSV file. Please check the file format.");
      },
    });
  };

  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingDeliveryMode, setPendingDeliveryMode] = useState<"physical" | "digital" | null>(null);

  const handleDeliveryModeChange = (value: "physical" | "digital") => {
    // Check if we are switching TO physical AND the original imported mode was digital (meaning Physical was OFF in CSV Portal)
    if (value === "physical" && templateData.importedDeliveryMode === "digital") {
      setPendingDeliveryMode(value);
      setShowWarningDialog(true);
    } else {
      setDeliveryMode(value);
    }
  };

  const confirmDeliveryModeChange = () => {
    if (pendingDeliveryMode) {
      setDeliveryMode(pendingDeliveryMode);
      setPendingDeliveryMode(null);
    }
    setShowWarningDialog(false);
  };

  const handleVariableToggle = (variable: string) => {
    setSelectedVariables((prev) =>
      prev.includes(variable)
        ? prev.filter((v) => v !== variable)
        : [...prev, variable]
    );
  };

  const handleAmountVariableToggle = (variable: string) => {
    setAmountVariables((prev) =>
      prev.includes(variable)
        ? prev.filter((v) => v !== variable)
        : [...prev, variable]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({
      csvHeaders,
      selectedVariables,
      amountVariables,
      deliveryMode,
    });
  };

  const isFormValid = () => {
    return csvHeaders.length > 0 && selectedVariables.length > 0;
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Variable Configuration
        </h2>
        <p className="text-slate-600">
          Upload CSV file and configure variables for your template
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CSV Upload */}
        <Card className="p-6">
          <Label className="text-lg font-semibold mb-4 block">
            Upload CSV File for Headers
          </Label>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">
                {fileName || "Click to upload CSV file"}
              </p>
              <p className="text-sm text-slate-500">
                CSV file with header row containing variable names
              </p>
            </div>

            {(fileName || (previewData && previewData.length > 0)) && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-900 flex-1">{fileName || "Imported Data"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFileName("");
                    setCsvHeaders([]);
                    setSelectedVariables([]);
                    setAmountVariables([]);
                    setPreviewData([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Sample Data Display */}
            {previewData && previewData.length > 0 && (
              <div className="mt-6 border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-slate-700">Preview Data (First 5 Rows)</h3>
                  <span className="text-xs text-slate-500">
                    {fileName && fileName !== "Imported Data" ? "from Uploaded CSV" : "from CSV Mapping Portal"}
                  </span>
                </div>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 font-medium">
                      <tr>
                        {csvHeaders.map((header) => (
                          <th key={header} className="px-4 py-2 border-b border-r last:border-r-0 whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="border-b last:border-b-0 hover:bg-slate-50">
                          {csvHeaders.map((header) => (
                            <td key={`${idx}-${header}`} className="px-4 py-2 border-r last:border-r-0 whitespace-nowrap max-w-[200px] truncate">
                              {row[header] || <span className="text-slate-400 italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Variable Selection */}
        {csvHeaders.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold">
                Select Variables to Use in Template
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedVariables.length === csvHeaders.length) {
                    setSelectedVariables([]);
                  } else {
                    setSelectedVariables([...csvHeaders]);
                  }
                }}
              >
                {selectedVariables.length === csvHeaders.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {csvHeaders.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Checkbox
                    id={`var-${header}`}
                    checked={selectedVariables.includes(header)}
                    onCheckedChange={() => handleVariableToggle(header)}
                  />
                  <Label
                    htmlFor={`var-${header}`}
                    className="flex-1 cursor-pointer"
                  >
                    {header}
                  </Label>
                </div>
              ))}
            </div>

            {selectedVariables.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 mb-2">
                  Selected Variables ({selectedVariables.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedVariables.map((variable) => (
                    <Badge key={variable} variant="secondary">
                      {variable}
                      <button
                        type="button"
                        onClick={() => handleVariableToggle(variable)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Amount to Words Variables */}
        {selectedVariables.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600" />
              <Label className="text-lg font-semibold">
                Convert Amount to Words
              </Label>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Select numeric amount variables that should be converted to words in the notice
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedVariables.map((variable) => (
                <div
                  key={variable}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Checkbox
                    id={`amt-${variable}`}
                    checked={amountVariables.includes(variable)}
                    onCheckedChange={() => handleAmountVariableToggle(variable)}
                  />
                  <Label
                    htmlFor={`amt-${variable}`}
                    className="flex-1 cursor-pointer"
                  >
                    {variable}
                  </Label>
                </div>
              ))}
            </div>

            {amountVariables.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 mb-2">
                  Amount Variables ({amountVariables.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {amountVariables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="bg-green-100 text-green-700">
                      {variable}
                      <button
                        type="button"
                        onClick={() => handleAmountVariableToggle(variable)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Delivery Mode */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-5 h-5 text-blue-600" />
            <Label className="text-lg font-semibold">Notice Delivery Mode</Label>
          </div>
          <RadioGroup value={deliveryMode} onValueChange={(value) => handleDeliveryModeChange(value as "physical" | "digital")}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                <RadioGroupItem value="digital" id="digital" />
                <Label htmlFor="digital" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Digital Notice</p>
                    <p className="text-sm text-slate-600">
                      Email or electronic delivery of the notice
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                <RadioGroupItem value="physical" id="physical" />
                <Label htmlFor="physical" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Physical Notice</p>
                    <p className="text-sm text-slate-600">
                      Printed and postal delivery of the notice
                    </p>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!isFormValid()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Generate Notice Preview
          </Button>
        </div>
      </form>

      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Warning: Physical Mode Mismatch
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are selecting <strong>Physical Notice</strong>, but the imported data indicates that
              <strong> "Physical Document Mode" was OFF</strong> in the CSV Mapping Portal.
              <br /><br />
              Proceeding may result in missing physical address data required for physical delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeliveryMode(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeliveryModeChange} className="bg-amber-600 hover:bg-amber-700">
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}