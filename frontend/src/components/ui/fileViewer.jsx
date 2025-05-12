import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from 'lucide-react';
import { config } from '../../config';
import EmailPreview from './EmailPreview';
import OfficePreview from './OfficePreview';

// Importazione lazy del visualizzatore CAD
const CADViewer = lazy(() => import('./CADViewer'));

const FileViewer = ({ file, isOpen, onClose }) => {
  const [previewError, setPreviewError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  
  useEffect(() => {
    // Resetta lo stato dell'errore quando cambia il file
    setPreviewError(false);
    
    // Ottieni un URL temporaneo per la preview quando il file cambia
    if (file && isOpen) {
      getPreviewUrl();
    }
  }, [file, isOpen]);

  // Ottieni un URL tramite l'endpoint di download
  const getPreviewUrl = async () => {
    if (!file) return;
    
    try {
      let url;
      console.log('Fetching preview URL for file:', file);
      // Determina l'URL di download in base al tipo di allegato
      if (file.NotificationID) {
        url = `${config.API_BASE_URL}/notifications/attachments/${file.AttachmentID}/download`;
      } else if (file.TaskID) {
        url = `${config.API_BASE_URL}/tasks/${file.TaskID}/attachments/${file.AttachmentID}/download`;
      } else if (file.ProjectItemId || file.ItemCode) {
        // Aggiungi gestione per allegati articoli/progetti
        console.log('File is an article or project item attachment:', file);
        url = `${config.API_BASE_URL}/item-attachments/${file.AttachmentID}/download`;
      } else {
        url = `${config.API_BASE_URL}/attachments/${file.AttachmentID}/download`;
      }
      
      const response = await fetch(
        url,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
  
      if (!response.ok) throw new Error('Download failed');
  
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch (error) {
      console.error('Error creating preview URL:', error);
      setPreviewError(true);
    }
  };

  // Cleanup quando il componente si chiude
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Verifica se il file è un file CAD o 3D
  const isCADFile = (file) => {
    if (!file || !file.FileName) return false;
    
    const fileName = file.FileName.toLowerCase();
    const cadExtensions = [
      '.stl', '.obj', '.dxf', '.dwg', '.step', '.stp', '.iges', '.igs', 
      '.3dm', '.3ds', '.fbx', '.gltf', '.glb', '.ply', '.dae', '.ipt', 
      '.iam', '.idw', '.sldprt', '.sldasm', '.slddrw', '.x_t', '.x_b',
      '.par', '.asm', '.psm', '.pwd', '.dft', '.CATPart', '.CATProduct',
      '.wrl', '.jt', '.skp', '.blend', '.f3d', '.f3z', 
      // ... aggiungere altre estensioni se necessario
    ];
    
    for (const ext of cadExtensions) {
      if (fileName.endsWith(ext)) return true;
    }
    
    // Controllo per estensioni con numeri come .prt.1, .prt.2, ecc.
    if (fileName.includes('.prt.') && /\.prt\.\d+$/.test(fileName)) return true;
    
    return false;
  };

  const getFileContent = () => {
    if (!file) return null;

    // Se c'è un errore o stiamo ancora caricando l'URL
    if (previewError || (!previewUrl && file.FileType !== 'message/rfc822' && 
                        file.FileType !== 'application/vnd.ms-outlook' && 
                        file.FileType !== 'text/x-eml' && 
                        file.FileType !== 'application/x-emlx')) {
                          console.log('Preview error or loading URL:', previewError, previewUrl);
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50">
          <FileText className="w-16 h-16 text-gray-500 mb-4" />
          <p className="text-gray-600 mb-4">Impossibile visualizzare l'anteprima del file</p>
          <Button onClick={() => handleDownload(file)}>
            <Download className="h-4 w-4 mr-2" />
            Scarica File
          </Button>
        </div>
      );
    }
    
    // Verifica prima se è un file CAD/3D
    if (isCADFile(file)) {
      return (
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Caricamento visualizzatore 3D...</p>
          </div>
        }>
          <CADViewer 
            file={{...file, previewUrl}} 
            onDownload={() => handleDownload(file)} 
          />
        </Suspense>
      );
    }
    
    // Gestione degli altri tipi di file
    switch (file.FileType) {
      case 'application/pdf':
        return (
          <div className="w-full h-[75vh]">
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title={file.FileName}
              style={{ zIndex: 9999 }}
              onError={() => setPreviewError(true)}
            />
          </div>
        );
      
      // Supporto per file Office
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/vnd.ms-powerpoint':
        return (
          <OfficePreview 
            file={{...file, previewUrl}}
            onDownload={() => handleDownload(file)} 
          />
        );
  
      // Supporto per email
      case 'message/rfc822':
      case 'application/vnd.ms-outlook':
      case 'text/x-eml':
      case 'application/x-emlx':
        return (
          <EmailPreview 
            file={file} 
            onDownload={() => handleDownload(file)} 
          />
        );
  
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/bmp':
      case 'image/svg+xml':
      case 'image/tiff':
      case 'image/webp':
        return (
          <div className="flex flex-col items-center">
            <img
              src={previewUrl}
              alt={file.FileName}
              className="max-w-full h-auto"
              onError={() => setPreviewError(true)}
            />
          </div>
        );
  
      default:
        // Controllo basato sull'estensione del file se il MIME type non è riconosciuto
        if (isCADFile(file)) {
          return (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">Caricamento visualizzatore 3D...</p>
              </div>
            }>
              <CADViewer 
                file={{...file, previewUrl}} 
                onDownload={() => handleDownload(file)} 
              />
            </Suspense>
          );
        }
        
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50">
            <FileText className="w-16 h-16 text-gray-500 mb-4" />
            <p className="text-gray-600">Anteprima non disponibile per questo tipo di file</p>
            <Button onClick={() => handleDownload(file)} className="mt-4">
              <Download className="h-4 w-4 mr-2" />
              Scarica File
            </Button>
          </div>
        );
    }
  };

  const handleDownload = async (attachment) => {
    try {
      let url;
      
      // Determina l'URL di download in base al tipo di allegato
      if (attachment.NotificationID) {
        url = `${config.API_BASE_URL}/notifications/attachments/${attachment.AttachmentID}/download`;
      } else if (attachment.TaskID) {
        url = `${config.API_BASE_URL}/tasks/${attachment.TaskID}/attachments/${attachment.AttachmentID}/download`;
      } else if (attachment.ProjectItemId || attachment.ItemCode) {
        url = `${config.API_BASE_URL}/item-attachments/${attachment.AttachmentID}/download`;
      } else {
        url = `${config.API_BASE_URL}/attachments/${attachment.AttachmentID}/download`;
      }
      
      const response = await fetch(
        url,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
  
      if (!response.ok) throw new Error('Download failed');
  
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = attachment.FileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
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