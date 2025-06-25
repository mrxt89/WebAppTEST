import React, { useEffect } from "react";
import { Paperclip, Download, Trash2, Image, File, FileText } from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "@/lib/common";

const formatFileSize = (sizeInKB) => {
  if (!sizeInKB || sizeInKB === 0) return "0 KB";
  if (sizeInKB < 1024) {
    return `${Math.round(sizeInKB)} KB`;
  }
  return `${(sizeInKB / 1024).toFixed(1)} MB`;
};

const AttachmentsTab = ({ 
  notificationId, 
  attachments, 
  setAttachments, 
  loading,
  onViewAttachment,
  refreshAttachments 
}) => {
  const {
    downloadNotificationAttachment,
    deleteNotificationAttachment,
  } = useNotifications();

  // Effect per ascoltare eventi globali che potrebbero aggiornare gli allegati
  useEffect(() => {
    const handleAttachmentViewedGlobal = (event) => {
      // Aggiorna solo se è per questa notifica
      if (event.detail?.notificationId === notificationId) {
        const { attachmentId } = event.detail;
        setAttachments(prev => prev.map(att => 
          att.AttachmentID === attachmentId 
            ? { ...att, HasBeenViewed: true, FirstViewedAt: att.FirstViewedAt || new Date().toISOString() }
            : att
        ));
      }
    };

    document.addEventListener("attachment-viewed", handleAttachmentViewedGlobal);
    
    return () => {
      document.removeEventListener("attachment-viewed", handleAttachmentViewedGlobal);
    };
  }, [notificationId, setAttachments]);

  // Funzione per determinare l'icona in base al tipo di file
  const getFileIcon = (fileType) => {
    if (fileType?.startsWith("image/")) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (fileType?.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (fileType?.includes("word") || fileType?.includes("document")) {
      return <FileText className="h-5 w-5 text-blue-700" />;
    }
    if (fileType?.includes("excel") || fileType?.includes("spreadsheet")) {
      return <FileText className="h-5 w-5 text-green-600" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const handleDownload = async (attachment) => {
    await downloadNotificationAttachment(
      attachment.AttachmentID,
      attachment.FileName,
    );
    
    // Se non era stato visualizzato, aggiorna immediatamente lo stato locale
    if (!attachment.HasBeenViewed) {
      setAttachments(prev => prev.map(att => 
        att.AttachmentID === attachment.AttachmentID 
          ? { ...att, HasBeenViewed: true, FirstViewedAt: new Date().toISOString() }
          : att
      ));

      // Emetti evento per sincronizzare altri componenti
      document.dispatchEvent(
        new CustomEvent("attachment-downloaded", {
          detail: { 
            attachmentId: attachment.AttachmentID,
            notificationId: notificationId
          }
        })
      );
    }
  };

  const handleViewAttachmentClick = async (attachment) => {
    // Chiamiamo la funzione del parent che gestirà sia l'apertura che l'aggiornamento
    onViewAttachment(attachment);
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      const { isConfirmed } = await swal.fire({
        title: "Conferma eliminazione",
        text: "Sei sicuro di voler eliminare questo allegato?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sì, elimina",
        cancelButtonText: "Annulla",
      });

      if (isConfirmed) {
        // Aggiorna immediatamente lo stato locale PRIMA della chiamata API
        setAttachments(prev => prev.filter(att => att.AttachmentID !== attachmentId));
        
        // Poi esegui l'eliminazione sul server
        await deleteNotificationAttachment(attachmentId, notificationId);
        
        // Emetti evento per sincronizzare altri componenti
        document.dispatchEvent(
          new CustomEvent("attachment-deleted", {
            detail: { 
              attachmentId: attachmentId,
              notificationId: notificationId
            }
          })
        );
        
        // Ricarica dal server per sicurezza
        if (refreshAttachments) {
          setTimeout(async () => {
            const updatedAttachments = await refreshAttachments(notificationId);
            if (updatedAttachments) {
              setAttachments(updatedAttachments);
            }
          }, 300);
        }
        
        swal.fire({
          title: "Eliminato!",
          text: "L'allegato è stato eliminato.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      // In caso di errore, ricarica la lista
      if (refreshAttachments) {
        const updatedAttachments = await refreshAttachments(notificationId);
        if (updatedAttachments) {
          setAttachments(updatedAttachments);
        }
      }
      swal.fire(
        "Errore",
        "Si è verificato un errore durante l'eliminazione.",
        "error",
      );
    }
  };

  return (
    <div className="px-2 py-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-sm font-medium">
          Allegati ({attachments.length})
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : !Array.isArray(attachments) || attachments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Paperclip className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">
            Nessun allegato presente
          </p>
          <p className="text-xs text-gray-400 mt-1">
            I file condivisi appariranno qui
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 flex-1 overflow-y-auto px-1">
          {attachments.map((attachment) => (
            <div
              key={attachment.AttachmentID}
              className={`border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                !attachment.HasBeenViewed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-100'
              }`}
              onClick={() => handleViewAttachmentClick(attachment)}
            >
              <div className="flex items-center p-2">
                <div className="mr-2 p-1.5 bg-gray-100 rounded-lg">
                  {getFileIcon(attachment.FileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    title={attachment.FileName}
                  >
                    {attachment.FileName}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.FileSizeKB)}
                    </p>
                    {/* Data di caricamento */}
                    <p className="text-[10px] text-gray-400">
                      {new Date(attachment.UploadedAt).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {/* Mostra quando è stato visualizzato */}
                  {attachment.HasBeenViewed && attachment.FirstViewedAt && (
                    <p className="text-[10px] text-green-600">
                      Visualizzato il {new Date(attachment.FirstViewedAt).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex text-xs border-t border-gray-200">
                <button
                  className="flex-1 py-1 text-blue-600 hover:bg-blue-100 transition-colors rounded-bl-lg flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(attachment);
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Scarica
                </button>
                <button
                  className="flex-1 py-1 text-red-600 hover:bg-red-100 transition-colors rounded-br-lg flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAttachment(attachment.AttachmentID);
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentsTab;