import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { config } from "../../config";
import EmailPreview from "./EmailPreview";
import OfficePreview from "./OfficePreview";

// Importazione lazy del visualizzatore CAD
const CADViewer = lazy(() => import("./CADViewer"));

const FileViewer = ({ file, isOpen, onClose }) => {
  const [previewError, setPreviewError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Ref per evitare chiamate multiple
  const loadingRef = useRef(false);
  const currentFileIdRef = useRef(null);

  useEffect(() => {
    // Cleanup quando il componente si chiude o cambia file
    return () => {
      if (previewUrl) {
        console.log("Revoking URL:", previewUrl);
        window.URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    console.log("=== FileViewer useEffect triggered ===");
    console.log("Current file:", file);
    console.log("isOpen:", isOpen);
    
    // Se non c'è file o non è aperto, resetta tutto
    if (!file || !isOpen) {
      console.log("No file or not open, resetting state");
      setPreviewError(false);
      setPreviewUrl("");
      setIsLoading(false);
      setErrorMessage("");
      loadingRef.current = false;
      currentFileIdRef.current = null;
      return;
    }

    // Se è un file email, non serve caricare preview URL
    if (isEmailFile(file)) {
      console.log("Email file detected, skipping preview URL");
      return;
    }

    // Verifica se è un nuovo file
    if (file.AttachmentID && currentFileIdRef.current !== file.AttachmentID) {
      console.log("New file detected, loading preview");
      currentFileIdRef.current = file.AttachmentID;
      
      // Resetta lo stato
      setPreviewError(false);
      setPreviewUrl("");
      setIsLoading(false);
      setErrorMessage("");
      loadingRef.current = false;
      
      // Carica la preview
      getPreviewUrl();
    }
  }, [file, isOpen]); // Dipendenze semplificate

  // Ottieni un URL tramite l'endpoint di download
  const getPreviewUrl = async () => {
    console.log("=== getPreviewUrl CALLED ===");
    console.log("Getting preview URL for file:", file);
    
    if (!file || loadingRef.current) {
      console.log("No file or already loading");
      return;
    }
    
    // Previeni chiamate multiple
    loadingRef.current = true;

    try {
      setIsLoading(true);
      setPreviewError(false);
      setErrorMessage("");
      
      let url;
      console.log("File structure:", {
        AttachmentID: file.AttachmentID,
        ProjectID: file.ProjectID,
        TaskID: file.TaskID,
        NotificationID: file.NotificationID,
        ItemCode: file.ItemCode,
        ProjectItemId: file.ProjectItemId
      });
      
      // Determina l'URL di download in base al tipo di allegato
      if (file.NotificationID) {
        console.log("=> Using NOTIFICATION route");
        url = `${config.API_BASE_URL}/notifications/attachments/${file.AttachmentID}/download`;
      } else if (file.TaskID && file.TaskID !== null && file.TaskID !== 0) {
        console.log("=> Using TASK route");
        url = `${config.API_BASE_URL}/tasks/${file.TaskID}/attachments/${file.AttachmentID}/download`;
      } else if (file.ProjectItemId || file.ItemCode) {
        console.log("=> Using ITEM route");
        url = `${config.API_BASE_URL}/item-attachments/${file.AttachmentID}/download`;
      } else if (file.ProjectID) {
        console.log("=> Using PROJECT route");
        url = `${config.API_BASE_URL}/projects/${file.ProjectID}/attachments/${file.AttachmentID}/download`;
      } else {
        console.log("=> Using GENERIC route");
        url = `${config.API_BASE_URL}/attachments/${file.AttachmentID}/download`;
      }

      console.log("Final URL:", url);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error("Response not OK:", response.status, response.statusText);
        const errorText = await response.text().catch(() => "");
        console.error("Error response body:", errorText);
        throw new Error(`Download failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`);
      }

      const blob = await response.blob();
      console.log("Blob received:", {
        type: blob.type,
        size: blob.size
      });
      
      // Verifica che il blob non sia vuoto
      if (blob.size === 0) {
        throw new Error("File vuoto ricevuto dal server");
      }
      
      const objectUrl = window.URL.createObjectURL(blob);
      console.log("Object URL created:", objectUrl);
      
      setPreviewUrl(objectUrl);
      setIsLoading(false);
    } catch (error) {
      console.error("Error creating preview URL:", error);
      setErrorMessage(error.message || "Errore durante il caricamento dell'anteprima");
      setPreviewError(true);
      setIsLoading(false);
    } finally {
      loadingRef.current = false;
    }
  };

  // Verifica se il file è un file CAD o 3D
  const isCADFile = (file) => {
    if (!file || !file.FileName) return false;

    const fileName = file.FileName.toLowerCase();
    const cadExtensions = [
      ".stl", ".obj", ".dxf", ".dwg", ".step", ".stp", ".iges", ".igs",
      ".3dm", ".3ds", ".fbx", ".gltf", ".glb", ".ply", ".dae", ".ipt",
      ".iam", ".idw", ".sldprt", ".sldasm", ".slddrw", ".x_t", ".x_b",
      ".par", ".asm", ".psm", ".pwd", ".dft", ".CATPart", ".CATProduct",
      ".wrl", ".jt", ".skp", ".blend", ".f3d", ".f3z",
    ];

    for (const ext of cadExtensions) {
      if (fileName.endsWith(ext)) return true;
    }

    // Controllo per estensioni con numeri come .prt.1, .prt.2, ecc.
    if (fileName.includes(".prt.") && /\.prt\.\d+$/.test(fileName)) return true;

    return false;
  };

  const getFileContent = () => {
    if (!file) return null;

    // Mostra il loader mentre carica
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600">Caricamento anteprima...</p>
        </div>
      );
    }

    // Se c'è un errore nel caricamento
    if (previewError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50">
          <FileText className="w-16 h-16 text-gray-500 mb-4" />
          <p className="text-gray-600 mb-4">
            Impossibile visualizzare l'anteprima del file
          </p>
          {errorMessage && (
            <p className="text-sm text-red-600 mb-4 text-center max-w-md">
              {errorMessage}
            </p>
          )}
          <Button onClick={() => handleDownload(file)}>
            <Download className="h-4 w-4 mr-2" />
            Scarica File
          </Button>
        </div>
      );
    }

    // Se non abbiamo ancora l'URL per file che necessitano preview
    if (!previewUrl && !isEmailFile(file)) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600">Preparazione anteprima...</p>
        </div>
      );
    }

    // Verifica prima se è un file CAD/3D
    if (isCADFile(file)) {
      return (
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">Caricamento visualizzatore 3D...</p>
            </div>
          }
        >
          <CADViewer
            file={{ ...file, previewUrl }}
            onDownload={() => handleDownload(file)}
          />
        </Suspense>
      );
    }

    // Gestione degli altri tipi di file
    const fileType = file.FileType?.toLowerCase() || "";
    const fileName = file.FileName?.toLowerCase() || "";

    // PDF
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      return (
        <div className="w-full h-[75vh]">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={file.FileName}
            onError={(e) => {
              console.error("PDF iframe error:", e);
              setPreviewError(true);
              setErrorMessage("Errore nel caricamento del PDF");
            }}
          />
        </div>
      );
    }

    // Immagini
    if (isImageFile(file)) {
      return (
        <div className="flex flex-col items-center p-4">
          <img
            src={previewUrl}
            alt={file.FileName}
            className="max-w-full h-auto max-h-[70vh] object-contain"
            onError={(e) => {
              console.error("Image load error:", e);
              setPreviewError(true);
              setErrorMessage("Errore nel caricamento dell'immagine");
            }}
            onLoad={() => console.log("Image loaded successfully")}
          />
        </div>
      );
    }

    // File Office
    if (isOfficeFile(file)) {
      return (
        <OfficePreview
          file={{ ...file, previewUrl }}
          onDownload={() => handleDownload(file)}
          onError={(error) => {
            setPreviewError(true);
            setErrorMessage(error.message || "Errore nel caricamento del file Office");
          }}
        />
      );
    }

    // Email
    if (isEmailFile(file)) {
      return (
        <EmailPreview 
          file={file} 
          onDownload={() => handleDownload(file)}
          onError={(error) => {
            setPreviewError(true);
            setErrorMessage(error.message || "Errore nel caricamento dell'email");
          }}
        />
      );
    }

    // Default: file non supportato
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50">
        <FileText className="w-16 h-16 text-gray-500 mb-4" />
        <p className="text-gray-600">
          Anteprima non disponibile per questo tipo di file
        </p>
        <Button onClick={() => handleDownload(file)} className="mt-4">
          <Download className="h-4 w-4 mr-2" />
          Scarica File
        </Button>
      </div>
    );
  };

  // Helper functions
  const isImageFile = (file) => {
    const imageTypes = [
      "image/jpeg", "image/png", "image/gif", "image/bmp", 
      "image/svg+xml", "image/tiff", "image/webp"
    ];
    const imageExtensions = [
      ".jpg", ".jpeg", ".png", ".gif", ".bmp", 
      ".svg", ".tiff", ".tif", ".webp"
    ];
    
    return imageTypes.includes(file.FileType?.toLowerCase()) ||
           imageExtensions.some(ext => file.FileName?.toLowerCase().endsWith(ext));
  };

  const isOfficeFile = (file) => {
    const officeTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint"
    ];
    const officeExtensions = [
      ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt"
    ];
    
    return officeTypes.includes(file.FileType) ||
           officeExtensions.some(ext => file.FileName?.toLowerCase().endsWith(ext));
  };

  const isEmailFile = (file) => {
    const emailTypes = [
      "message/rfc822", "application/vnd.ms-outlook", 
      "text/x-eml", "application/x-emlx"
    ];
    const emailExtensions = [".eml", ".msg", ".emlx"];
    
    return emailTypes.includes(file.FileType) ||
           emailExtensions.some(ext => file.FileName?.toLowerCase().endsWith(ext));
  };

  const handleDownload = async (attachment) => {
    try {
      let url;

      // Determina l'URL di download in base al tipo di allegato
      if (attachment.NotificationID) {
        url = `${config.API_BASE_URL}/notifications/attachments/${attachment.AttachmentID}/download`;
      } else if (attachment.TaskID && attachment.TaskID !== null && attachment.TaskID !== 0) {
        url = `${config.API_BASE_URL}/tasks/${attachment.TaskID}/attachments/${attachment.AttachmentID}/download`;
      } else if (attachment.ProjectItemId || attachment.ItemCode) {
        url = `${config.API_BASE_URL}/item-attachments/${attachment.AttachmentID}/download`;
      } else if (attachment.ProjectID) {
        url = `${config.API_BASE_URL}/projects/${attachment.ProjectID}/attachments/${attachment.AttachmentID}/download`;
      } else {
        url = `${config.API_BASE_URL}/attachments/${attachment.AttachmentID}/download`;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Token di autenticazione non trovato");
        alert("Errore: Token di autenticazione non trovato");
        return;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = attachment.FileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert(`Errore durante il download: ${error.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-7xl w-[95vw] max-h-[90vh] flex flex-col"
        style={{ zIndex: 99999 }}
      >
        <DialogHeader>
          <DialogTitle>{file?.FileName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {getFileContent()}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
          <Button onClick={() => handleDownload(file)}>
            <Download className="h-4 w-4 mr-2" />
            Scarica
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileViewer;