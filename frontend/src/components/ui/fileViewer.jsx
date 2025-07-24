import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, ExternalLink, Info } from "lucide-react";
import { config } from "../../config";
import EmailPreview from "./EmailPreview";
import OfficePreview from "./OfficePreview";
import axiosInstance from "@/lib/axios";
import localAgentService from "@/services/localAgentService";

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
  
  // Stato per development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // Stati per i modali
  const [showDevelopmentModal, setShowDevelopmentModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [developmentAction, setDevelopmentAction] = useState(null);

  // Stati per Local Agent
  const [agentAvailable, setAgentAvailable] = useState(false);
  const [agentChecked, setAgentChecked] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);

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

  // Check agent availability
  useEffect(() => {
    checkAgentAvailability();
  }, []);

  const checkAgentAvailability = async () => {
    const available = await localAgentService.checkAvailability();
    setAgentAvailable(available);
    setAgentChecked(true);
  };

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
          <div className="flex gap-3 mt-4">
            <Button onClick={() => handleDownload(file)}>
              <Download className="h-4 w-4 mr-2" />
              Scarica File
            </Button>
            {canOpenDirectly() && (
              <Button 
                onClick={handleDirectOpen}
                variant="default"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apri Direttamente
              </Button>
            )}
          </div>
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

    // File di testo
    if (isTextFile(file)) {
      return (
        <div className="w-full h-[75vh] p-4">
          <div className="h-full bg-gray-50 rounded border">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 rounded"
              title={file.FileName}
              sandbox="allow-same-origin"
              onError={(e) => {
                console.error("Text file iframe error:", e);
                setPreviewError(true);
                setErrorMessage("Errore nel caricamento del file di testo");
              }}
            />
          </div>
        </div>
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
        <p className="text-gray-600 mb-2 text-lg">
          {file.FileName}
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Anteprima non disponibile per questo tipo di file
        </p>
        <div className="flex gap-3">
          <Button 
            onClick={() => handleDownload(file)}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Scarica File
          </Button>
          {canOpenDirectly() && (
            <Button 
              onClick={handleDirectOpen}
              variant="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Apri Direttamente
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Helper functions con controlli null-safe
  const isImageFile = (file) => {
    if (!file || !file.FileType || !file.FileName) return false;
    
    const imageTypes = [
      "image/jpeg", "image/png", "image/gif", "image/bmp", 
      "image/svg+xml", "image/tiff", "image/webp"
    ];
    const imageExtensions = [
      ".jpg", ".jpeg", ".png", ".gif", ".bmp", 
      ".svg", ".tiff", ".tif", ".webp"
    ];
    
    return imageTypes.includes(file.FileType.toLowerCase()) ||
           imageExtensions.some(ext => file.FileName.toLowerCase().endsWith(ext));
  };

  const isOfficeFile = (file) => {
    if (!file || !file.FileType || !file.FileName) return false;
    
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
           officeExtensions.some(ext => file.FileName.toLowerCase().endsWith(ext));
  };

  const isEmailFile = (file) => {
    if (!file || !file.FileType || !file.FileName) return false;
    
    const emailTypes = [
      "message/rfc822", "application/vnd.ms-outlook", 
      "text/x-eml", "application/x-emlx"
    ];
    const emailExtensions = [".eml", ".msg", ".emlx"];
    
    return emailTypes.includes(file.FileType) ||
           emailExtensions.some(ext => file.FileName.toLowerCase().endsWith(ext));
  };

  const isTextFile = (file) => {
    if (!file || !file.FileName) return false;
    
    const textTypes = [
      "text/plain", "text/html", "text/css", "text/javascript",
      "text/xml", "text/csv", "text/tab-separated-values",
      "application/json", "application/xml", "application/javascript"
    ];
    const textExtensions = [
      ".txt", ".log", ".ini", ".cfg", ".conf", ".config",
      ".json", ".xml", ".html", ".htm", ".css", ".js", ".ts",
      ".md", ".markdown", ".csv", ".tsv", ".sql", ".bat", ".sh",
      ".ps1", ".py", ".java", ".c", ".cpp", ".cs", ".php",
      ".rb", ".go", ".rs", ".swift", ".kt", ".r", ".m"
    ];
    
    const fileName = file.FileName.toLowerCase();
    const fileType = file.FileType?.toLowerCase() || "";
    
    return textTypes.includes(fileType) ||
           textExtensions.some(ext => fileName.endsWith(ext));
  };

  const handleDownload = async (attachment) => {
    if (!attachment) return;
    
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

// Nuova funzione per aprire il file direttamente
const handleDirectOpen = async () => {
  if (!file) return;
  
  // Prima controlla se l'agent è disponibile
  if (!agentAvailable) {
    // Usa il metodo esistente SMB se agent non disponibile
    try {
      const response = await axiosInstance.post('/generate-smb-link', {
        attachmentId: file.AttachmentID,
        filePath: file.FilePath
      });

      if (response.data.success) {
        const { smbPath, fileLink, isDevelopment: isDevResponse, httpFallback, altLinks } = response.data;
        
        console.log('SMB Link Response:', response.data);
        
        // Salva i dati per uso successivo inclusi i link alternativi
        setDevelopmentAction({ fileLink, smbPath, httpFallback, altLinks });
        
        // In development, mostra modal di scelta
        if (isDevelopment && isDevResponse) {
          setShowDevelopmentModal(true);
        } else {
          // In produzione, mostra direttamente il modal
          // perché Chrome blocca i file:// di rete
          setShowDevelopmentModal(true);
        }
      }
    } catch (error) {
      console.error('Error opening file directly:', error);
      alert('Impossibile aprire il file direttamente');
    }
    return;
  }
  
  // Se l'agent è disponibile, usalo
  try {
    console.log('Opening file with Local Agent...');
    console.log('Agent available:', agentAvailable);
    console.log('file data:', file);
    // Prepara dati per agent
    // Costruisci sempre l'URL completo del server
    const serverUrl = config.API_BASE_URL.startsWith('http') 
    ? config.API_BASE_URL.replace('/api', '')  // Se è completo, rimuovi /api
    : window.location.origin;                   // Se è relativo, usa l'origin

console.log('Config API_BASE_URL:', config.API_BASE_URL);
console.log('Resulting serverUrl:', serverUrl);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const fileData = {
      attachmentId: file.AttachmentID,
      fileName: file.FileName,
      filePath: file.FilePath,
      serverUrl: serverUrl,
      token: `Bearer ${token}`,
      companyId: user.CompanyId,
      userId: user.userId,
      projectId: file.ProjectID,
      taskId: file.TaskID,
      notificationId: file.NotificationID,
      itemCode: file.ItemCode,
      projectItemId: file.ProjectItemId,
      lockFile: true,
    };

    console.log('File data for agent:', fileData);
    
    // Apri con agent
    const result = await localAgentService.openFile(fileData);
    
    if (result.success) {
      console.log('File opened successfully with agent');
      
      // Chiudi il modal del viewer
      onClose();
      
      // Mostra notifica di successo
      if (window.toastr) {
        window.toastr.success(`File aperto: ${file.FileName}`);
      } else {
        console.log(`File aperto: ${file.FileName}`);
      }
    }
    
  } catch (error) {
    console.error('Error opening with agent:', error);
    
    const errorInfo = localAgentService.handleError(error);
    
    if (error.code === 'AGENT_NOT_AVAILABLE') {
      setShowAgentModal(true);
    } else if (error.code === 'FILE_LOCKED') {
      // File già bloccato
      alert(`File bloccato da: ${error.lockedByName}`);
    } else {
      alert(errorInfo.message || 'Errore apertura file con agent');
    }
  }
};

  // Handler per le azioni del modal development
  const handleDevelopmentChoice = (choice) => {
    setShowDevelopmentModal(false);
    
    if (choice === 'open' && developmentAction) {
      // Prova ad aprire con file://
      openSMBLink(developmentAction.fileLink);
    } else if (choice === 'test-formats' && developmentAction) {
      // Test diversi formati di link
      if (developmentAction.altLinks) {
        console.log('Testing different link formats:');
        Object.entries(developmentAction.altLinks).forEach(([format, link]) => {
          console.log(`${format}: ${link}`);
          // Prova ad aprire ogni formato in una nuova tab
          setTimeout(() => {
            window.open(link, '_blank');
          }, 1000);
        });
      }
    } else if (choice === 'download') {
      handleDownload(file);
    } else if (choice === 'copy' && developmentAction) {
      // Copia il percorso negli appunti
      navigator.clipboard.writeText(developmentAction.smbPath)
        .then(() => {
          alert('Percorso copiato negli appunti!\n\nOra:\n1. Apri Esplora Risorse (Windows+E)\n2. Incolla il percorso nella barra degli indirizzi\n3. Premi Invio\n\nNON incollarlo nel browser!');
        })
        .catch(err => {
          console.error('Errore copia percorso:', err);
          alert(`Copia manualmente questo percorso: ${developmentAction.smbPath}`);
        });
    } else if (choice === 'explorer' && developmentAction) {
      // Prova ad aprire Esplora Risorse con il percorso
      // Crea un link con protocollo explorer
      const folderPath = developmentAction.smbPath.substring(0, developmentAction.smbPath.lastIndexOf('\\'));
      window.location.href = `file:///${folderPath.replace(/\\/g, '/')}`;
    } else if (choice === 'run-command' && developmentAction) {
      // Genera comando per aprire il file
      const command = `start "" "${developmentAction.smbPath}"`;
      navigator.clipboard.writeText(command)
        .then(() => {
          alert('Comando copiato!\n\n1. Premi Windows+R\n2. Digita "cmd" e premi Invio\n3. Incolla il comando e premi Invio');
        })
        .catch(err => {
          console.error('Errore copia comando:', err);
        });
    }
    
    setDevelopmentAction(null);
  };

  // Funzione helper per aprire il link SMB
  const openSMBLink = (fileLink) => {
    try {
      // Usa sempre il link file://
      const link = document.createElement('a');
      link.href = fileLink;
      link.target = '_blank';
      
      // Aggiungi il link al DOM, clicca e rimuovi
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // In produzione, Chrome potrebbe bloccare il link
      // Mostra sempre le istruzioni dopo un breve delay
      setTimeout(() => {
        // Se siamo ancora sulla stessa pagina, probabilmente il link è stato bloccato
        if (!isDevelopment) {
          setShowInstructionsModal(true);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error opening file link:', error);
      // Se c'è un errore, mostra il modal con le opzioni
      if (developmentAction) {
        setShowDevelopmentModal(true);
      }
    }
  };

  // Verifica se possiamo aprire direttamente questo tipo di file
  const canOpenDirectly = () => {
    // Se non c'è file, non mostrare il pulsante
    if (!file) return false;
    
    // Permetti apertura diretta per tutti i file tranne le email
    // che hanno bisogno di un trattamento speciale
    return !isEmailFile(file);
  };

  return (
    <>
      {/* Modal principale del FileViewer */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-7xl w-[95vw] max-h-[90vh] flex flex-col"
          style={{ zIndex: 50 }}
        >
          <DialogHeader>
            <DialogTitle>{file?.FileName || "File"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {getFileContent()}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Chiudi
            </Button>
            
            {/* Nuovo pulsante per apertura diretta */}
            {file && canOpenDirectly() && (
              <Button 
                onClick={handleDirectOpen}
                variant="default"
                title="Apri il file direttamente nell'applicazione"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apri
              </Button>
            )}
            
            {file && (
              <Button 
                onClick={() => handleDownload(file)}
                variant={canOpenDirectly() ? "outline" : "default"}
              >
                <Download className="h-4 w-4 mr-2" />
                Scarica
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal per Agent non disponibile */}
<Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
  <DialogContent style={{ zIndex: 60 }}>
    <DialogHeader>
      <DialogTitle>Local Agent richiesto</DialogTitle>
      <DialogDescription>
        Per modificare i file direttamente è necessario Local Agent.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 my-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Cos'è Local Agent?</h4>
        <p className="text-sm">
          Un'applicazione leggera che permette di aprire e modificare 
          i file con le tue applicazioni preferite, mantenendo la 
          sincronizzazione automatica con il server.
        </p>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-semibold">Vantaggi:</h4>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Apertura diretta con app native (AutoCAD, Office, ecc.)</li>
          <li>Sincronizzazione automatica delle modifiche</li>
          <li>Gestione versioni integrata</li>
          <li>Lock file per evitare conflitti</li>
        </ul>
      </div>
    </div>
    
    <DialogFooter className="gap-2">
      <Button variant="outline" onClick={() => setShowAgentModal(false)}>
        Annulla
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setShowAgentModal(false);
          // Usa il metodo SMB esistente
          handleDirectOpen();
          setAgentAvailable(false); // Forza uso metodo SMB
        }}
      >
        Usa metodo alternativo
      </Button>
      <Button
        onClick={() => {
          window.open('/api/download/agent/windows', '_blank');
        }}
      >
        <Download className="h-4 w-4 mr-2" />
        Scarica Local Agent
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Modal per scelta in development */}
      <Dialog open={showDevelopmentModal} onOpenChange={setShowDevelopmentModal}>
        <DialogContent style={{ zIndex: 60 }}>
          <DialogHeader>
            <DialogTitle>
              {isDevelopment ? 'Modalità Development' : 'Apertura File di Rete'}
            </DialogTitle>
            <DialogDescription>
              {isDevelopment 
                ? 'Scegli come aprire il file. Local Explorer deve essere installato e configurato per permettere i link file://.'
                : 'Per aprire file dalla rete, è necessario Local Explorer o copiare il percorso in Esplora Risorse.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-4">
            {developmentAction && (
              <>
                <p className="text-sm font-medium">Percorso del file:</p>
                <div className="text-sm bg-gray-100 p-2 rounded font-mono break-all">
                  {developmentAction.smbPath}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => handleDevelopmentChoice('cancel')}
            >
              Annulla
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDevelopmentChoice('copy')}
              className="bg-green-50 hover:bg-green-100 text-green-700"
              title="Metodo più affidabile - copia e incolla in Esplora Risorse"
            >
              📋 Copia percorso (consigliato)
            </Button>
            {!isDevelopment && (
              <Button
                variant="outline"
                onClick={() => handleDevelopmentChoice('run-command')}
                title="Copia comando da eseguire nel prompt dei comandi"
              >
                💻 Copia comando CMD
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleDevelopmentChoice('download')}
            >
              ⬇️ Scarica file
            </Button>
            {developmentAction?.altLinks && (
              <Button
                variant="outline"
                onClick={() => handleDevelopmentChoice('test-formats')}
                title="Test diversi formati di link file://"
              >
                🧪 Test formati
              </Button>
            )}
            <Button
              onClick={() => handleDevelopmentChoice('open')}
              disabled={!localStorage.getItem('local-explorer-confirmed')}
              title="Richiede Local Explorer installato e configurato"
            >
              🔗 Apri con Local Explorer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal per istruzioni prima volta */}
      <Dialog open={showInstructionsModal} onOpenChange={setShowInstructionsModal}>
        <DialogContent style={{ zIndex: 60 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Come aprire file di rete
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm font-medium text-red-800">
                Chrome blocca l'accesso diretto ai file di rete per motivi di sicurezza
              </p>
            </div>
            
            <p className="font-medium">Hai due opzioni:</p>
            
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold">Opzione 1: Installa Local Explorer (consigliato)</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                  <li>
                    <a 
                      href="https://chrome.google.com/webstore/search/local%20explorer" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Installa l'estensione dal Chrome Web Store →
                    </a>
                  </li>
                  <li>Nelle impostazioni dell'estensione, abilita "Allow access to file URLs"</li>
                  <li>In Chrome, vai su chrome://extensions/</li>
                  <li>Trova Local Explorer e abilita "Consenti l'accesso agli URL dei file"</li>
                  <li>Ricarica questa pagina e riprova</li>
                </ol>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold">Opzione 2: Usa Esplora Risorse</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                  <li>Copia il percorso del file dal modal precedente</li>
                  <li>Apri Esplora Risorse (Windows+E)</li>
                  <li>Incolla il percorso nella barra degli indirizzi</li>
                  <li>Premi Invio per aprire il file</li>
                </ol>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowInstructionsModal(false)}
            >
              Chiudi
            </Button>
            <Button 
              onClick={() => {
                localStorage.setItem('local-explorer-confirmed', 'true');
                setShowInstructionsModal(false);
                // Riapri il modal delle opzioni
                if (developmentAction) {
                  setShowDevelopmentModal(true);
                }
              }}
            >
              Ho installato Local Explorer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileViewer;