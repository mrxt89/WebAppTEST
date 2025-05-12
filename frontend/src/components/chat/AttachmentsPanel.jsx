// Frontend/src/components/chat/AttachmentsPanel.jsx
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Trash2, File, Image, FileText } from 'lucide-react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { swal } from '../../lib/common';
import DeleteConfirmationModal from '../project/DeleteConfirmationModal';

const AttachmentsPanel = ({ notificationId, canDelete }) => {
  const [attachments, setAttachments] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, attachmentId: null });
  
  const { 
    downloadNotificationAttachment, 
    deleteNotificationAttachment,
    getNotificationAttachments,
    refreshAttachments
  } = useNotifications();

  const [loading, setLoading] = useState(false);

  const loadAttachments = async () => {
    try {
      if (notificationId) {
        setLoading(true);
        const data = await getNotificationAttachments(notificationId);
        setAttachments(data || []);
        setLoading(false);
      }
    } catch (error) {
      console.error('Errore nel caricamento degli allegati:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento degli allegati',
        icon: 'error',
        timer: 1500,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [notificationId]);

  const handleDownload = async (attachment) => {
    try {
      await downloadNotificationAttachment(attachment.AttachmentID, attachment.FileName);
    } catch (error) {
      console.error('Errore durante il download:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nel download dell\'allegato',
        icon: 'error',
        timer: 1500,
      });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteNotificationAttachment(deleteModal.attachmentId);
      // Ricarica gli allegati dopo l'eliminazione
      await loadAttachments();
      // Oppure rimuovi direttamente dall'array locale
      // setAttachments(prev => prev.filter(a => a.AttachmentID !== deleteModal.attachmentId));
      
      swal.fire({
        title: 'Successo',
        text: 'Allegato eliminato con successo',
        icon: 'success',
        timer: 1500,
        showProgressBar: true,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
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

  // Determina l'icona in base al tipo di file
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('text')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Allegati</h3>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      ) : (
        <ScrollArea className="h-[300px] rounded-md border">
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
                      <div className="flex items-center gap-2">
                        {getFileIcon(attachment.FileType)}
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
                        {canDelete && (
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
      )}

      <DeleteConfirmationModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, attachmentId: null })}
        onConfirm={handleConfirmDelete}
        title="Elimina allegato"
        message="Sei sicuro di voler eliminare questo allegato? L'operazione non può essere annullata."
      />
    </div>
  );
};

export default AttachmentsPanel;