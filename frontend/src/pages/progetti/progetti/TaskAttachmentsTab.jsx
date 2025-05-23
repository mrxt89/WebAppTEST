import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Trash2, Upload, File, X } from "lucide-react";
import { swal } from "../../../lib/common";
import useAttachmentsActions from "../../../hooks/useAttachmentsActions";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import FileViewer from "../../../components/ui/fileViewer";
import FileDropZone from "@/components/ui/FileDropZone";

const TaskAttachmentsTab = ({ task, canEdit, onAttachmentChange }) => {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    attachmentId: null,
  });
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    loading,
    getAttachments,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,
    downloadAllAttachments,
  } = useAttachmentsActions();

  const loadAttachments = async () => {
    try {
      // Carica gli allegati specifici del task usando projectId e taskId
      const data = await getAttachments(task.ProjectID, task.TaskID);
      setAttachments(data);
    } catch (error) {
      swal.fire({
        title: "Errore",
        text: "Errore nel caricamento degli allegati",
        icon: "error",
        timer: 1500,
      });
    }
  };

  useEffect(() => {
    if (task?.TaskID) {
      loadAttachments();
    }
  }, [task?.TaskID]);

  const handleFileSelect = async (input) => {
    let file;

    // Se viene da input file standard
    if (input?.target?.files) {
      file = input.target.files[0];
    } else {
      // Se viene da drag & drop
      file = input;
    }

    if (!file) {
      console.log("No file selected");
      return;
    }

    try {
      setUploading(true);

      // Usa la nuova versione con oggetto options
      const result = await uploadAttachment(file, {
        projectId: task.ProjectID,
        taskId: task.TaskID,
      });

      if (result.success) {
        await loadAttachments();
        // Chiamiamo onAttachmentChange con un parametro che indica di mantenere la tab attiva
        if (onAttachmentChange) onAttachmentChange(() => {
          // Questo callback serve a eseguire operazioni dopo il refresh
          // ma non cambia la tab attiva
        });
        
        // Nascondo il pannello dopo caricamento completato
        setShowUploadPanel(false);
        swal.fire({
          title: "Successo",
          text: "Allegato caricato con successo",
          icon: "success",
          timer: 1500
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      swal.fire({
        title: "Errore",
        text: "Errore nel caricamento dell'allegato",
        icon: "error",
        timer: 1500,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteAttachment(deleteModal.attachmentId);
      await loadAttachments();
      // Chiamiamo onAttachmentChange con un parametro che indica di mantenere la tab attiva
      if (onAttachmentChange) onAttachmentChange(() => {
        // Questo callback serve a eseguire operazioni dopo il refresh
        // ma non cambia la tab attiva
      });
      
      swal.fire({
        title: "Successo",
        text: "Allegato eliminato con successo",
        icon: "success",
        timer: 1500
      });
    } catch (error) {
      swal.fire({
        title: "Errore",
        text: "Errore nell'eliminazione dell'allegato",
        icon: "error",
        timer: 1500,
      });
    } finally {
      setDeleteModal({ open: false, attachmentId: null });
    }
  };

  const handleDownload = async (attachment) => {
    try {
      await downloadAttachment(attachment.AttachmentID, attachment.FileName);
    } catch (error) {
      swal.fire({
        title: "Errore",
        text: "Errore nel download dell'allegato",
        icon: "error",
        timer: 1500,
      });
    }
  };

  const toggleUploadPanel = () => {
    setShowUploadPanel(!showUploadPanel);
  };

  return (
    <div className="space-y-4">
      {/* Azioni e tabella */}
      <div>
        <div className="flex justify-between items-center mb-4">
          {canEdit && (
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={toggleUploadPanel}
                disabled={uploading || loading}
              >
                {uploading ? (
                  <span className="flex items-center">
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Caricamento...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Carica File
                  </span>
                )}
              </Button>
            </div>
          )}

          {attachments.length > 0 && (
            <Button
              variant="outline"
              onClick={() =>
                downloadAllAttachments({ projectId: task.ProjectID, taskId: task.TaskID })
              }
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <Download className="h-4 w-4 mr-2 animate-spin" />
                  Scaricamento...
                </span>
              ) : (
                <span className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Tutti
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Pannello di caricamento a scomparsa */}
        {showUploadPanel && canEdit && (
          <div className="relative mb-6 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background/90"
              onClick={() => setShowUploadPanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <FileDropZone
              onFileSelect={handleFileSelect}
              disabled={uploading}
              multiple={false}
              sx={{ minHeight: "200px", border: "2px dashed", borderColor: "primary.light" }}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center py-12">
                  <Upload className="h-14 w-14 mb-4 animate-spin text-primary" />
                  <p className="text-xl font-medium">Caricamento in corso...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-12">
                  <Upload className="h-14 w-14 mb-4 text-primary" />
                  <p className="text-xl font-medium">
                    Trascina qui i file o clicca per selezionare
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Clicca per selezionare manualmente o trascina direttamente i file qui
                  </p>
                </div>
              )}
            </FileDropZone>
          </div>
        )}

        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome File</TableHead>
                <TableHead>Dimensione</TableHead>
                <TableHead>Caricato da</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <span className="mr-2">Caricamento allegati...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : attachments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    Nessun allegato presente
                  </TableCell>
                </TableRow>
              ) : (
                attachments.map((attachment) => (
                  <TableRow key={attachment.AttachmentID}>
                    <TableCell className="font-medium">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:text-blue-500"
                        onClick={() => setSelectedFile(attachment)}
                      >
                        <File className="h-4 w-4" />
                        {attachment.FileName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {Math.round((attachment.FileSizeKB / 1024) * 100) / 100}{" "}
                      MB
                    </TableCell>
                    <TableCell>{attachment.UploadedByName}</TableCell>
                    <TableCell>
                      {new Date(attachment.UploadedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(attachment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteModal({
                                open: true,
                                attachmentId: attachment.AttachmentID,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, attachmentId: null })}
        onConfirm={handleConfirmDelete}
        title="Elimina allegato"
        message="Sei sicuro di voler eliminare questo allegato? L'operazione non può essere annullata."
      />
      <FileViewer
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    </div>
  );
};

export default TaskAttachmentsTab;
