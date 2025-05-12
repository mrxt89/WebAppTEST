import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Trash2, Upload, File } from 'lucide-react';
import { swal } from '../../../lib/common';
import useAttachmentsActions from '../../../hooks/useAttachmentsActions';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import FileViewer from '../../../components/ui/fileViewer';
import FileDropZone from '@/components/ui/FileDropZone';

const TaskAttachmentsTab = ({ task, canEdit, onAttachmentChange }) => {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, attachmentId: null });
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const { 
    loading, 
    getAttachments,
    uploadAttachment, 
    deleteAttachment, 
    downloadAttachment,
    downloadAllAttachments
  } = useAttachmentsActions();

  const loadAttachments = async () => {
    try {
      // Carica gli allegati specifici del task usando projectId e taskId
      const data = await getAttachments(task.ProjectID, task.TaskID);
      setAttachments(data);
    } catch (error) {
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento degli allegati',
        icon: 'error',
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
      console.log('No file selected');
      return;
    }
  
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await uploadAttachment(task.ProjectID, task.TaskID, file);
      
      if (result.success) {
        await loadAttachments();
        onAttachmentChange && onAttachmentChange();
        swal.fire({
          title: 'Successo',
          text: 'Allegato caricato con successo',
          icon: 'success',
          timer: 1500,
          showProgressBar: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento dell\'allegato',
        icon: 'error',
        timer: 1500,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  const handleConfirmDelete = async () => {
    try {
      await deleteAttachment(deleteModal.attachmentId);
      await loadAttachments();
      onAttachmentChange && onAttachmentChange();
      swal.fire({
        title: 'Successo',
        text: 'Allegato eliminato con successo',
        icon: 'success',
        timer: 1500,
        showProgressBar: true,
        showConfirmButton: false
      });
    } catch (error) {
      swal.fire({
        title: 'Errore',
        text: 'Errore nell\'eliminazione dell\'allegato',
        icon: 'error',
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
        title: 'Errore',
        text: 'Errore nel download dell\'allegato',
        icon: 'error',
        timer: 1500,
      });
    }
  };

  return (
    <FileDropZone 
      onFileSelect={handleFileSelect} 
      disabled={!canEdit || uploading}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          {canEdit && (
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
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
              onClick={() => downloadAllAttachments(task.ProjectID, task.TaskID)}
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
              {attachments.length === 0 ? (
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
                      {Math.round(attachment.FileSizeKB / 1024 * 100) / 100} MB
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
                            onClick={() => setDeleteModal({ 
                              open: true, 
                              attachmentId: attachment.AttachmentID 
                            })}
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
    </FileDropZone>
  );
};

export default TaskAttachmentsTab;