import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';
import { Theme, ThemeTemplate } from '../App';
import { Advocate } from '../api';
import bwipjs from 'bwip-js';
import { BlobProvider } from '@react-pdf/renderer';
import { Document, Page, pdfjs } from 'react-pdf';
import { NoticePdfDocument } from './NoticePdfDocument';
import { numberToWords, formatCurrency } from '../utils/formatters';

// Set up pdfjs worker
// Use a version-matched unpkg URL for the best compatibility in dev/prod builds
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ToolbarProps {
  zoomIn: () => void;
  zoomOut: () => void;
  download: (url: string) => void;
  print: () => void;
  currentZoom: number;
}

function Toolbar({ zoomIn, zoomOut, download, print, currentZoom }: ToolbarProps) {
  return (
    <div className="flex items-center gap-4 p-2 bg-gray-800/90 text-white rounded-xl shadow-lg backdrop-blur-sm border border-gray-700">
      <div className="flex items-center gap-2 mr-2 border-r border-gray-600 pr-4">
        <button onClick={zoomOut} className="p-2 hover:bg-gray-700 rounded-lg transition-colors"><ZoomOut className="w-5 h-5" /></button>
        <span className="text-xs font-bold w-12 text-center">{Math.round(currentZoom * 100)}%</span>
        <button onClick={zoomIn} className="p-2 hover:bg-gray-700 rounded-lg transition-colors"><ZoomIn className="w-5 h-5" /></button>
      </div>
      <button onClick={() => download('')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
        <Download className="w-5 h-5" />
        <span className="text-xs font-bold">Download</span>
      </button>
      <button onClick={print} className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
        <Printer className="w-5 h-5" />
        <span className="text-xs font-bold">Print</span>
      </button>
    </div>
  );
}

interface PortalNoticePreviewProps {
  content: string;
  theme: Theme;
  template?: ThemeTemplate;
  advocate?: Advocate;
  language: string;
  onClose: () => void;
}

export function PortalNoticePreview({ content, theme, advocate, language, onClose }: PortalNoticePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [barcodeImage, setBarcodeImage] = useState<string | null>(null);

  useEffect(() => {
    const generateBarcodeImage = async () => {
      const barcodeKeywords = ['barcode', 'tracking', 'consignment', 'awb', 'reference'];
      const barcodeHeader = theme.csvHeaders?.find(h => 
        barcodeKeywords.some(key => h.toLowerCase().includes(key))
      );

      if (barcodeHeader) { // Always generate if header exists, as requested
        try {
          // Use sample data if available, otherwise use a realistic fallback
          let barcodeText = 'JF309279841IN'; // Default sample
          if (theme.sampleData && theme.sampleData.length > 0 && theme.sampleData[0][barcodeHeader]) {
            barcodeText = theme.sampleData[0][barcodeHeader];
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
          console.error("Barcode generation failed", e);
        }
      }
    };
    generateBarcodeImage();
  }, [content, theme.csvHeaders, theme.sampleData, theme.name]); 

  // Replace variable placeholders for preview if needed, or just show raw with markers
  // Special case: Replace ${signature} with advocate signature image if exists
  let processedContent = content;
  if (advocate?.signature) {
    processedContent = processedContent.replace(/\$\{signature\}/g, `<img src="${advocate.signature}" style="max-width: 200px; max-height: 80px;" alt="Signature" />`);
  }

  // Amount to Words Replacement
  if (theme.amountVariables && theme.amountVariables.length > 0) {
    theme.amountVariables.forEach(varName => {
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\$\\{${escapedVarName}\\}`, 'g');
      
      // Use a sample value for preview
      const sampleAmount = 5275.50;
      const amountStr = formatCurrency(sampleAmount);
      const wordsStr = numberToWords(sampleAmount);
      const replacement = `<b>${amountStr} (${wordsStr})</b>`;
      
      processedContent = processedContent.replace(regex, replacement);
    });
  }

  // Generic Replacement for other variables
  if (theme.csvHeaders && theme.csvHeaders.length > 0) {
    theme.csvHeaders.forEach(varName => {
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\$\\{${escapedVarName}\\}`, 'g');
      // Replace with simple bracketed text for PDF
      processedContent = processedContent.replace(regex, `[${varName.toUpperCase()}]`);
    });
  }

  // Barcode/Signature placeholders should be removed from text if handled by blocks
  processedContent = processedContent.replace(/\$\{barcode\}/g, '');
  processedContent = processedContent.replace(/\$\{signature\}/g, '');

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/90 backdrop-blur-md animate-in fade-in duration-300 p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl h-full flex flex-col bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 pointer-events-auto">
        
        {/* Toolbar matching Image 4 style */}
        <div className="relative z-[100] flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {theme.name}
              </h2>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
                {language} PREVIEW
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="relative z-[110] p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Component - Shows HTML immediately while PDF loads in background or as fallback */}
        <div className="flex-1 overflow-y-auto bg-gray-100/50 dark:bg-gray-950 p-6 sm:p-12 relative flex flex-col items-center">
          
          <div className="w-full max-w-[210mm] flex flex-col items-center gap-6">
            
            {/* react-pdf Document Viewer */}
            <BlobProvider
              document={
                <NoticePdfDocument 
                  content={processedContent} 
                  theme={theme}
                  advocate={advocate}
                  barcodeImage={barcodeImage}
                  signatureImage={advocate?.signature}
                />
              }
            >
              {({ url, loading, error }) => (
  <div className="w-full flex flex-col items-center gap-6">
                  {/* Toolbar is now inside the provider to access url */}
                  <div className="sticky top-0 z-[120] mb-4">
                    <Toolbar 
                      zoomIn={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                      zoomOut={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                      download={() => url && window.open(url)}
                      print={() => window.print()}
                      currentZoom={zoom}
                    />
                  </div>

                  <div className="w-full flex justify-center bg-gray-100/50 dark:bg-gray-900/50 p-4 rounded-xl overflow-auto min-h-[70vh]">
  <div className="flex flex-col items-center">
    {loading ? (
      <div className="flex flex-col items-center justify-center p-20 text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold">Generating PDF Document...</p>
      </div>
    ) : error ? (
      <div className="p-10 text-red-500 font-bold flex flex-col items-center gap-2">
        <p className="text-xl">Generation Error</p>
        <span className="text-sm font-normal text-center max-w-md">There was an issue generating the PDF. This might be due to invalid content or special characters.</span>
        <code className="text-[10px] p-2 bg-red-50 rounded mt-2 max-w-lg overflow-auto">{error.toString()}</code>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    ) : url ? (
      <div className="shadow-2xl">
                          <Document
                            file={url}
                            onLoadSuccess={({ numPages }) => {
                              console.log('PDF loaded successfully with', numPages, 'pages');
                              setNumPages(numPages);
                            }}
                            onLoadError={(error) => {
                              console.error('PDF Load Error Details:', error);
                              // error.message might contain more info
                              if (error instanceof Error) {
                                console.error('Error Message:', error.message);
                                console.error('Error Stack:', error.stack);
                              }
                            }}
                            loading={
                              <div className="p-10 text-gray-400 font-bold flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading PDF Viewer...</span>
                              </div>
                            }
                            error={
                              <div className="p-10 text-red-500 font-bold flex flex-col items-center gap-4">
                                <span>Failed to display PDF in viewer.</span>
                                {url && (
                                  <div className="flex flex-col items-center gap-2">
                                    <p className="text-xs font-normal text-gray-400 mb-2">The document was generated but the viewer failed.</p>
                                    <Button 
                                      onClick={() => window.open(url)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      Open/Download PDF Direct
                                    </Button>
                                  </div>
                                )}
                                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                  Retry Page
                                </Button>
                              </div>
                            }
                          >
                            {Array.from(new Array(numPages || 0), (el, index) => (
                              <Page 
                                key={`page_${index + 1}`} 
                                pageNumber={index + 1} 
                                scale={zoom}
                                renderAnnotationLayer={false}
                                renderTextLayer={false}
                                className="mb-4"
                              />
                            ))}
                          </Document>
                        </div>
                      ) : (
                        <div className="p-10 text-red-500 font-bold">Failed to generate preview.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </BlobProvider>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
