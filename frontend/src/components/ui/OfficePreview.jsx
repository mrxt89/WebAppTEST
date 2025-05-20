import React, { useState, useEffect } from "react";
import {
  FileText,
  Table,
  Presentation,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { config } from "../../config";

// Lazy load the DocViewer component
const DocViewerLazy = React.lazy(() => import("@cyntler/react-doc-viewer"));

const OfficePreview = ({ file, onDownload }) => {
  const [viewerError, setViewerError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [convertedFile, setConvertedFile] = useState(null);

  const getFileTypeInfo = () => {
    switch (file.FileType) {
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        return {
          icon: <FileText className="w-16 h-16 text-blue-600" />,
          text: "Documento Word",
          color: "text-blue-600",
          fileExtension: "docx",
        };
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return {
          icon: <Table className="w-16 h-16 text-green-600" />,
          text: "Foglio Excel",
          color: "text-green-600",
          fileExtension: "xlsx",
        };
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      case "application/vnd.ms-powerpoint":
        return {
          icon: <Presentation className="w-16 h-16 text-red-600" />,
          text: "Presentazione PowerPoint",
          color: "text-red-600",
          fileExtension: "pptx",
        };
      default:
        return {
          icon: <FileText className="w-16 h-16 text-gray-600" />,
          text: "Documento Office",
          color: "text-gray-600",
          fileExtension: "doc",
        };
    }
  };

  const { icon, text, color, fileExtension } = getFileTypeInfo();
  const fileUrl = `${config.API_BASE_URL}/uploads/${file.FilePath}`;

  // Configure the document viewer
  const docs = [
    {
      uri: fileUrl,
      fileType: fileExtension,
      fileName: file.FileName,
    },
  ];

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 1000);

    // Reset error state when file changes
    setViewerError(false);

    return () => {
      clearTimeout(timer);
    };
  }, [file]);

  if (viewerError || isLoading) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="flex items-center justify-center mb-6">
          {icon}
          <div className="ml-4">
            <h3 className={`text-lg font-medium ${color}`}>{text}</h3>
            <p className="text-sm text-gray-500">{file.FileName}</p>
          </div>
        </div>

        {viewerError ? (
          <>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Non è stato possibile caricare l'anteprima del documento. Prova
                a scaricare il file per visualizzarlo.
              </AlertDescription>
            </Alert>

            <Button onClick={onDownload} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Scarica Documento
            </Button>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {icon}
          <div className="ml-4">
            <h3 className={`text-lg font-medium ${color}`}>{text}</h3>
            <p className="text-sm text-gray-500">{file.FileName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <DocViewerLazy
            documents={docs}
            style={{ height: "100%" }}
            pluginRenderers={[]}
            config={{
              header: {
                disableHeader: true,
                disableFileName: true,
                retainURLParams: false,
              },
              pdfZoom: {
                defaultZoom: 1.1,
                zoomJump: 0.2,
              },
              csvDelimiter: ",",
              language: "it",
            }}
            onError={(e) => {
              console.error("DocViewer error:", e);
              setViewerError(true);
            }}
          />
        </React.Suspense>
      </div>
    </div>
  );
};

export default OfficePreview;
