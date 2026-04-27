import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Theme, ThemeTemplate } from '../App';
import { Advocate } from '../api';
import bwipjs from 'bwip-js';
import { BlobProvider } from '@react-pdf/renderer';
import { NoticePdfDocument } from './NoticePdfDocument';
import { numberToWords, formatCurrency } from '../utils/formatters';

interface PortalNoticePreviewProps {
  content: string;
  theme: Theme;
  template?: ThemeTemplate;
  advocate?: Advocate;
  language: string;
  onClose: () => void;
}

export function PortalNoticePreview({ content, theme, advocate, language, onClose }: PortalNoticePreviewProps) {
  const [barcodeImage, setBarcodeImage] = useState<string | null>(null);

  useEffect(() => {
    const generateBarcodeImage = async () => {
      const barcodeKeywords = ['barcode', 'tracking', 'consignment', 'awb', 'reference'];
      const barcodeHeader = theme.csvHeaders?.find(h => 
        barcodeKeywords.some(key => h.toLowerCase().includes(key))
      );

      if (barcodeHeader) {
        try {
          let barcodeText = 'JF309279841IN';
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

  let processedContent = content;
  if (advocate?.signature) {
    processedContent = processedContent.replace(/\$\{signature\}/g, `<img src="${advocate.signature}" style="max-width: 200px; max-height: 80px;" alt="Signature" />`);
  }

  if (theme.amountVariables && theme.amountVariables.length > 0) {
    theme.amountVariables.forEach(varName => {
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\$\\{${escapedVarName}\\}`, 'g');
      const sampleAmount = 5275.50;
      const amountStr = formatCurrency(sampleAmount);
      const wordsStr = numberToWords(sampleAmount);
      const replacement = `<b>${amountStr} (${wordsStr})</b>`;
      processedContent = processedContent.replace(regex, replacement);
    });
  }

  if (theme.csvHeaders && theme.csvHeaders.length > 0) {
    theme.csvHeaders.forEach(varName => {
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\$\\{${escapedVarName}\\}`, 'g');
      processedContent = processedContent.replace(regex, `[${varName.toUpperCase()}]`);
    });
  }

  processedContent = processedContent.replace(/\$\{barcode\}/g, '');
  processedContent = processedContent.replace(/\$\{signature\}/g, '');

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/90 backdrop-blur-md animate-in fade-in duration-300 p-4 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-6xl h-[95vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 pointer-events-auto">
        
        {/* Simplified Header */}
        <div className="relative z-[100] flex items-center justify-between px-8 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {theme.name}
              </h2>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">
                {language} PDF PREVIEW
              </p>
            </div>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Viewer Container */}
        <div className="flex-1 bg-gray-800 relative">
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
              <div className="w-full h-full">
                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold text-sm tracking-wide">GENERATING PDF FORM...</p>
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-8 text-center">
                    <p className="text-xl font-bold mb-2">Failed to generate PDF</p>
                    <code className="text-xs bg-black/30 p-4 rounded-lg max-w-lg mb-4">{error.toString()}</code>
                    <Button variant="outline" onClick={() => window.location.reload()}>Retry Preview</Button>
                  </div>
                ) : (
                  <iframe 
                    src={`${url}#toolbar=1&view=FitH`} 
                    className="w-full h-full border-none"
                    title="PDF Viewer"
                  />
                )}
              </div>
            )}
          </BlobProvider>
        </div>
      </div>
    </div>,
    document.body
  );
}
