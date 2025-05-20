import React, { useState, useEffect } from "react";
import {
  Download,
  Trash2,
  Upload,
  Camera,
  File,
  Image,
  FileText,
} from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "../../lib/common";
import FileViewer from "../ui/fileViewer";

const AttachmentsList = ({ notificationId, onAttachmentUploaded }) => {
  const {
    downloadNotificationAttachment,
    deleteNotificationAttachment,
    uploadNotificationAttachment,
    captureAndUploadPhoto,
    attachmentsLoading,
    getNotificationAttachments,
    refreshAttachments,
    notificationAttachments,
  } = useNotifications();

  const [attachments, setAttachments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef(null);

  // Carica allegati all'apertura o quando cambia l'ID della notifica
  useEffect(() => {
    if (!notificationId) return;

    const loadAttachments = async () => {
      try {
        setLoading(true);

        const data = await getNotificationAttachments(notificationId);
        if (Array.isArray(data)) {
          setAttachments(data);
        }
      } catch (error) {
        console.error("Error loading attachments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAttachments();
  }, [notificationId, getNotificationAttachments]);

  // Aggiorna gli allegati nello stato locale quando notificationAttachments cambia
  useEffect(() => {
    if (notificationId && notificationAttachments[notificationId]) {
      setAttachments(notificationAttachments[notificationId]);
    }
  }, [notificationId, notificationAttachments]);

  const handleAttachmentClick = (attachment) => {
    setSelectedFile(attachment);
  };

  const handleDownload = (attachment) => {
    downloadNotificationAttachment(
      attachment.AttachmentID,
      attachment.FileName,
    );
  };

  const handleDelete = async (attachmentId) => {
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
        await deleteNotificationAttachment(attachmentId);

        // Aggiorna la lista localmente
        setAttachments((prevAttachments) =>
          prevAttachments.filter((a) => a.AttachmentID !== attachmentId),
        );

        // Aggiorna anche il context
        await refreshAttachments(notificationId);

        onAttachmentUploaded?.(); // Ricarica la lista se necessario
        swal.fire("Eliminato!", "L'allegato è stato eliminato.", "success");
      }
    } catch (error) {
      swal.fire(
        "Errore",
        "Si è verificato un errore durante l'eliminazione.",
        "error",
      );
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        await uploadNotificationAttachment(notificationId, e.target.files[0]);
        // Refresh della lista degli allegati
        const updatedAttachments = await refreshAttachments(notificationId);
        setAttachments(updatedAttachments || []);

        onAttachmentUploaded?.(); // Ricarica la lista
        swal.fire("Caricato!", "Allegato caricato con successo.", "success");
      } catch (error) {
        swal.fire(
          "Errore",
          "Si è verificato un errore durante il caricamento.",
          "error",
        );
      } finally {
        // Resetta l'input file
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleCapturePhoto = async () => {
    try {
      await captureAndUploadPhoto(notificationId);
      // Refresh della lista degli allegati
      const updatedAttachments = await refreshAttachments(notificationId);
      setAttachments(updatedAttachments || []);

      onAttachmentUploaded?.(); // Ricarica la lista
      swal.fire("Caricato!", "Foto caricata con successo.", "success");
    } catch (error) {
      swal.fire(
        "Errore",
        "Si è verificato un errore durante la cattura della foto.",
        "error",
      );
    }
  };

  // Determina l'icona in base al tipo di file
  const getFileIcon = (fileType) => {
    if (fileType?.startsWith("image/"))
      return <Image className="h-4 w-4 text-blue-500" />;
    if (
      fileType?.includes("pdf") ||
      fileType?.includes("word") ||
      fileType?.includes("text")
    ) {
      return <FileText className="h-4 w-4 text-green-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Allegati ({attachments.length})</h3>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={attachmentsLoading || loading}
            className="p-2 rounded bg-blue-500 text-white flex items-center gap-1 text-sm"
          >
            <Upload className="h-4 w-4" />
            {attachmentsLoading || loading ? "Caricamento..." : "Carica"}
          </button>
          <button
            onClick={handleCapturePhoto}
            disabled={attachmentsLoading || loading}
            className="p-2 rounded bg-green-500 text-white flex items-center gap-1 text-sm"
          >
            <Camera className="h-4 w-4" />
            Foto
          </button>
        </div>
      </div>

      {attachmentsLoading || loading ? (
        <div className="text-center text-gray-500 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-2">Caricamento allegati...</p>
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>Nessun allegato presente</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.AttachmentID}
              className="flex items-center justify-between p-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              onClick={() => handleAttachmentClick(attachment)}
            >
              <div className="flex items-center flex-1">
                <div className="flex-shrink-0 mr-2">
                  {getFileIcon(attachment.FileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {attachment.FileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.round((attachment.FileSizeKB / 1024) * 100) / 100} MB
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(attachment);
                  }}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(attachment.AttachmentID);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Viewer per l'anteprima */}
      <FileViewer
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    </div>
  );
};

export default AttachmentsList;
