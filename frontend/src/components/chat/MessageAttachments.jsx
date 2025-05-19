// Frontend/src/components/chat/MessageAttachments.jsx
import React from "react";
import { File, FileText, Image, Download } from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";

const MessageAttachments = ({ attachments, onClick }) => {
  const { downloadNotificationAttachment } = useNotifications();

  if (!attachments || attachments.length === 0) return null;

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

  return (
    <div className="space-y-2 mt-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.AttachmentID}
          className="flex items-center p-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
          onClick={() => onClick(attachment)}
        >
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
          <button
            className="ml-2 text-blue-500 hover:text-blue-700"
            onClick={(e) => {
              e.stopPropagation();
              downloadNotificationAttachment(
                attachment.AttachmentID,
                attachment.FileName,
              );
            }}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default MessageAttachments;
