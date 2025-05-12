import React from 'react';
import { File, Download, Image, FileText, Paperclip } from 'lucide-react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';

const AttachmentMessage = ({ attachment }) => {
  const { downloadNotificationAttachment } = useNotifications();
  
  const isImage = attachment.FileType.startsWith('image/');
  const isDocument = attachment.FileType.includes('pdf') || 
                   attachment.FileType.includes('word') || 
                   attachment.FileType.includes('text') ||
                   attachment.FileType.includes('spreadsheet');
  
  // Formatta la dimensione del file
  const formatFileSize = (sizeKB) => {
    if (sizeKB < 1024) {
      return `${sizeKB} KB`;
    } else {
      return `${(sizeKB / 1024).toFixed(2)} MB`;
    }
  };

  // Determina l'icona in base al tipo di file
  const getFileIcon = () => {
    if (isImage) return <Image className="h-6 w-6 text-blue-500" />;
    if (isDocument) return <FileText className="h-6 w-6 text-green-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const handleDownload = () => {
    downloadNotificationAttachment(attachment.AttachmentID, attachment.FileName);
  };

  return (
    <div className="flex items-start gap-2 p-2 bg-gray-100 rounded-lg max-w-xs hover:bg-gray-200 transition-colors cursor-pointer" onClick={handleDownload}>
      <div className="flex-shrink-0">
        {getFileIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={attachment.FileName}>
          {attachment.FileName}
        </p>
        <p className="text-xs text-gray-500">{formatFileSize(attachment.FileSizeKB)}</p>
      </div>
      <button className="flex-shrink-0 text-blue-500 hover:text-blue-700">
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AttachmentMessage;