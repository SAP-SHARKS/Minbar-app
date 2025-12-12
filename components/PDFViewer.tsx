import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

// Configure the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="bg-gray-100 rounded-2xl p-8 border border-gray-200 w-full min-h-[600px] flex items-center justify-center overflow-auto custom-scrollbar">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex flex-col items-center shadow-lg"
          loading={
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
               <Loader2 size={32} className="animate-spin text-emerald-600"/>
               <p className="font-medium">Loading PDF...</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center py-20 text-red-500 gap-4 bg-white p-8 rounded-xl shadow-sm">
               <AlertCircle size={32} />
               <p className="font-medium">Failed to load PDF.</p>
               <p className="text-sm text-gray-400">Please verify the file URL.</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            className="bg-white !bg-white"
            width={800}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {numPages && (
        <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-full border border-gray-200 shadow-sm">
          <button
            disabled={pageNumber <= 1}
            onClick={previousPage}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <p className="text-sm font-medium text-gray-600">
            Page <span className="text-gray-900 font-bold">{pageNumber}</span> of <span className="text-gray-900 font-bold">{numPages}</span>
          </p>
          
          <button
            disabled={pageNumber >= numPages}
            onClick={nextPage}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};